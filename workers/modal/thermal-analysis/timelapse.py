"""Time-lapse / video render for thermal sessions — ffmpeg on the Modal CPU worker.

Takes an ordered list of frames (the processed thermal previews already in R2),
encodes an MP4 honoring the operator's export spec: aspect ratio, frame rate
(length/speed), deflicker, and motion smoothing. Smoothing uses ffmpeg's built-in
`minterpolate` (motion-compensated interpolation) — a free, in-tree engine — so we
don't ship a custom interpolator. ("RIFE" maps to the same minterpolate path here;
true RIFE needs a GPU model and can be added later without changing this contract.)
"""

from __future__ import annotations

import subprocess
from pathlib import Path
from typing import Any

from r2_utils import download_object, upload_file

_ASPECTS = {"16:9": (16, 9), "9:16": (9, 16), "1:1": (1, 1), "4:3": (4, 3), "21:9": (21, 9)}


def aspect_filter(aspect: str) -> str:
    if aspect not in _ASPECTS:
        return ""  # "original" — no pad/crop
    w, h = _ASPECTS[aspect]
    if w >= h:
        out_w = 1280
        out_h = int(round(out_w * h / w / 2)) * 2
    else:
        out_h = 1280
        out_w = int(round(out_h * w / h / 2)) * 2
    return (
        f"scale={out_w}:{out_h}:force_original_aspect_ratio=decrease,"
        f"pad={out_w}:{out_h}:(ow-iw)/2:(oh-ih)/2:black"
    )


def render_motion(
    s3,
    bucket: str,
    org_id: str,
    session_id: str,
    job_id: str,
    frames: list[dict[str, Any]],
    settings: dict[str, Any],
    work_dir: Path,
) -> dict[str, Any]:
    frames_dir = work_dir / "frames"
    frames_dir.mkdir(parents=True, exist_ok=True)

    count = 0
    for i, f in enumerate(frames):
        key = f.get("previewPath") or f.get("storagePath")
        if not key:
            continue
        dest = frames_dir / f"{i:04d}.jpg"
        try:
            download_object(s3, bucket, str(key), str(dest))
            count += 1
        except Exception:  # noqa: BLE001 — skip any frame that fails to fetch
            continue
    if count == 0:
        raise RuntimeError("No frames could be downloaded for the render")

    fps = int(settings.get("fps") or 12)
    fps = max(1, min(60, fps))
    vf: list[str] = []
    af = aspect_filter(str(settings.get("aspect") or "original"))
    if af:
        vf.append(af)
    if settings.get("deflicker"):
        vf.append("deflicker=mode=pm:size=10")

    out_fps = fps
    if str(settings.get("smoothing") or "none") in ("interpolate", "rife"):
        out_fps = max(fps * 2, 24)
        vf.append(f"minterpolate=fps={out_fps}:mi_mode=mci:mc_mode=aobmc:vsbmc=1")
    vf.append("format=yuv420p")

    out_path = work_dir / "out.mp4"
    cmd = [
        "ffmpeg", "-y",
        "-framerate", str(fps),
        "-i", str(frames_dir / "%04d.jpg"),
        "-vf", ",".join(vf),
        "-r", str(out_fps),
        "-c:v", "libx264", "-crf", "20", "-preset", "medium", "-movflags", "+faststart",
        str(out_path),
    ]
    subprocess.run(cmd, check=True, capture_output=True)

    key = f"orgs/{org_id}/thermal/{session_id}/motion/{job_id}.mp4"
    upload_file(s3, bucket, str(out_path), key, "video/mp4")
    return {"key": key, "frames": count, "fps": out_fps}
