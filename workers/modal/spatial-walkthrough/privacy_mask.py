"""Time-varying operator mask + skip cuts for the CLIENT/PUBLIC bake."""

from __future__ import annotations

import math
import subprocess
from pathlib import Path
from typing import Any


def wrap_yaw(deg: float) -> float:
    return ((deg + 180) % 360) - 180


def lerp(a: float, b: float, u: float) -> float:
    return a + (b - a) * u


def lerp_yaw(a: float, b: float, u: float) -> float:
    return wrap_yaw(a + wrap_yaw(b - a) * u)


def parse_keyframes(patch: dict[str, Any]) -> list[dict[str, float]]:
    raw = patch.get("keyframes") if isinstance(patch.get("keyframes"), list) else []
    frames: list[dict[str, float]] = []
    for item in raw:
        if not isinstance(item, dict):
            continue
        t = item.get("t", item.get("tSeconds"))
        if t is None:
            continue
        frames.append({
            "t": float(t),
            "yawCenter": wrap_yaw(float(item.get("yawCenter", item.get("rearYawCenter", 180)))),
            "yawWidth": float(item.get("yawWidth", item.get("rearYawWidth", 64))),
            "pitchTop": float(item.get("pitchTop", item.get("pitchMax", -18))),
            "pitchBottom": float(item.get("pitchBottom", item.get("pitchMin", -88))),
            "nadirRadius": float(item.get("nadirRadius", 0.4)),
            "feather": float(item.get("feather", 0.08)),
        })
    frames.sort(key=lambda f: f["t"])
    if frames:
        return frames
    return [{
        "t": 0.0,
        "yawCenter": wrap_yaw(float(patch.get("rearYawCenter", 180))),
        "yawWidth": float(patch.get("rearYawWidth") or 64),
        "pitchTop": float(patch.get("pitchMax") if patch.get("pitchMax") is not None else -18),
        "pitchBottom": float(patch.get("pitchMin") if patch.get("pitchMin") is not None else -88),
        "nadirRadius": float(patch.get("nadirRadius") or 0.4),
        "feather": 0.08,
    }]


def interpolate(frames: list[dict[str, float]], t: float) -> dict[str, float]:
    if t <= frames[0]["t"]:
        return {**frames[0], "t": t}
    if t >= frames[-1]["t"]:
        return {**frames[-1], "t": t}
    i = 0
    while i < len(frames) - 1 and frames[i + 1]["t"] < t:
        i += 1
    a, b = frames[i], frames[i + 1]
    span = b["t"] - a["t"]
    u = 0.0 if span <= 0 else (t - a["t"]) / span
    return {
        "t": t,
        "yawCenter": lerp_yaw(a["yawCenter"], b["yawCenter"], u),
        "yawWidth": lerp(a["yawWidth"], b["yawWidth"], u),
        "pitchTop": lerp(a["pitchTop"], b["pitchTop"], u),
        "pitchBottom": lerp(a["pitchBottom"], b["pitchBottom"], u),
        "nadirRadius": lerp(a["nadirRadius"], b["nadirRadius"], u),
        "feather": lerp(a["feather"], b["feather"], u),
    }


def oversized(frame: dict[str, float]) -> bool:
    return frame["yawWidth"] > 150


def skip_expr(skips: list[tuple[float, float]]) -> str:
    if not skips:
        return ""
    parts = [f"between(t,{a:.3f},{b:.3f})" for a, b in skips]
    return "not(" + "+".join(parts) + ")"


def write_mask_png(path: Path, width: int, height: int, frame: dict[str, float]) -> None:
    yaw_c = frame["yawCenter"]
    yaw_w = frame["yawWidth"]
    pmin = frame["pitchBottom"]
    pmax = frame["pitchTop"]
    nadir = max(frame["nadirRadius"], 0.22)
    y0 = int(height * (1 - nadir))
    yaw_min = wrap_yaw(yaw_c - yaw_w / 2)
    yaw_max = wrap_yaw(yaw_c + yaw_w / 2)

    def in_yaw(yaw: float) -> bool:
        if yaw_min <= yaw_max:
            return yaw_min <= yaw <= yaw_max
        return yaw >= yaw_min or yaw <= yaw_max

    ppm = path.with_suffix(".ppm")
    with ppm.open("wb") as handle:
        handle.write(f"P6\n{width} {height}\n255\n".encode())
        for y in range(height):
            pitch = 90 - (y / max(height - 1, 1)) * 180
            buf = bytearray(width * 3)
            for x in range(width):
                cover = y >= y0
                if not cover and pmin <= pitch <= pmax:
                    cover = in_yaw((x / max(width, 1)) * 360 - 180)
                buf[x * 3 : x * 3 + 3] = b"\x00\x00\x00" if cover else b"\xff\x00\xff"
            handle.write(buf)
    subprocess.run(
        ["ffmpeg", "-y", "-i", str(ppm), "-vf", "colorkey=0xFF00FF:0.1:0.0,format=rgba", str(path)],
        capture_output=True,
        check=True,
    )
    ppm.unlink(missing_ok=True)


def write_mask_video(
    dest: Path,
    width: int,
    height: int,
    duration: float,
    keyframes: list[dict[str, float]],
    mask_fps: float = 2.0,
) -> Path:
    frames_dir = dest.parent / "masks"
    frames_dir.mkdir(exist_ok=True)
    count = max(1, int(math.ceil(duration * mask_fps)))
    for i in range(count):
        t = i / mask_fps
        frame = interpolate(keyframes, t)
        write_mask_png(frames_dir / f"m{i:05d}.png", width, height, frame)
    subprocess.run(
        [
            "ffmpeg", "-y", "-framerate", str(mask_fps),
            "-i", str(frames_dir / "m%05d.png"),
            "-pix_fmt", "rgba", "-c:v", "png", str(dest),
        ],
        capture_output=True,
        check=True,
    )
    return dest
