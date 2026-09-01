#!/usr/bin/env python3
"""Pack native Brush B PLY → Spark-compatible SPZ v3.

Keeps X4 coordinates. Does not bake EXACT_FRAME_SIM3.
sh1Bits=8, shRestBits=8. NaN filter only. No opacity/scale prune.
"""
from __future__ import annotations

import gzip
import json
import math
import struct
from pathlib import Path

import numpy as np

SH_C0 = 0.28209479177387814
SPZ_MAGIC = 1347635022
SPZ_VERSION = 3
FLAG_ANTIALIASED = 1
SH1_BITS = 8
SH_REST_BITS = 8
FRACTIONAL_BITS = 12
EXPECTED_N = 672_348


def resolve(path: str | Path) -> Path:
    text = str(path).replace("\\", "/")
    win = Path(text)
    wsl = Path("/mnt/" + text[0].lower() + text[2:]) if len(text) >= 2 and text[1] == ":" else None
    for candidate in (win, wsl):
        if candidate is None:
            continue
        if candidate.exists() or candidate.parent.exists():
            return candidate
    if wsl is not None:
        wsl.parent.mkdir(parents=True, exist_ok=True)
        return wsl
    win.parent.mkdir(parents=True, exist_ok=True)
    return win


SRC = resolve(
    r"C:\Users\Brian PC\Desktop\Slate360Research\Projects\KitchenAprilTags"
    r"\Runs\2026-08-31T22-x4-brush-challenger\brush_b_train\brush_b.ply"
)
BAKED = resolve(
    r"C:\Users\Brian PC\Desktop\Slate360Research\Projects\KitchenAprilTags"
    r"\Runs\2026-08-31T22-x4-brush-challenger\brush_x4_arkit.ply"
)
SIM3 = resolve(
    r"C:\Users\Brian PC\Desktop\Slate360Research\Projects\KitchenAprilTags"
    r"\Runs\2026-08-31T17-32-exact-frame-anchor-rescue\EXACT_FRAME_SIM3.json"
)
OUT = resolve(r"C:\s360\tmp\kitchen-proof\appearance-web.spz")
RESEARCH_OUT = resolve(
    r"C:\Users\Brian PC\Desktop\Slate360Research\Projects\KitchenAprilTags"
    r"\Runs\2026-08-31T22-x4-brush-challenger\appearance-web.spz"
)


def load_exact_frame_sim3(path: Path) -> dict:
    data = json.loads(path.read_text(encoding="utf-8"))
    if "scale" not in data or "rotation_3x3" not in data or "translation_m" not in data:
        raise ValueError("EXACT_FRAME_SIM3.json is missing scale/R/t")
    return data


def apply_sim3(xyz: np.ndarray, scale: float, rotation: np.ndarray, translation: np.ndarray) -> np.ndarray:
    return scale * (np.asarray(rotation) @ np.asarray(xyz).T).T + np.asarray(translation)


def read_ply(path: Path):
    raw = path.read_bytes()
    end = raw.find(b"end_header\n")
    header = raw[:end].decode("ascii", "replace")
    n = 0
    props = []
    for line in header.splitlines():
        if line.startswith("element vertex"):
            n = int(line.split()[-1])
        if line.startswith("property "):
            bits = line.split()
            props.append((bits[1], bits[2]))
    type_map = {"float": "<f4", "double": "<f8", "uchar": "u1", "uint": "<u4", "int": "<i4"}
    dt = np.dtype([(name, type_map.get(typ, "<f4")) for typ, name in props])
    arr = np.frombuffer(raw[end + len(b"end_header\n") :], dtype=dt, count=n)
    return arr.copy(), n


def quantize_sh_arr(sh: np.ndarray, bits: int) -> np.ndarray:
    value = np.rint(sh * 128.0).astype(np.int32) + 128
    bucket = 1 << (8 - bits)
    quantized = np.floor((value + bucket / 2) / bucket).astype(np.int32) * bucket
    return np.clip(quantized, 0, 255).astype(np.uint8)


def pack_quats_xyzw(quat: np.ndarray) -> np.ndarray:
    nrm = np.linalg.norm(quat, axis=1, keepdims=True)
    nrm = np.clip(nrm, 1e-12, None)
    q = quat / nrm
    i_largest = np.argmax(np.abs(q), axis=1)
    negate = (q[np.arange(len(q)), i_largest] < 0).astype(np.int64)
    out = np.zeros(len(q), dtype=np.uint32)
    max_val = math.sqrt(0.5)
    for i in range(len(q)):
        largest = int(i_largest[i])
        comp = largest
        neg = int(negate[i])
        for axis in range(4):
            if axis == largest:
                continue
            v = float(q[i, axis])
            negbit = (1 if v < 0 else 0) ^ neg
            mag = int(math.floor(((1 << 9) - 1) * (abs(v) / max_val) + 0.5))
            mag = max(0, min((1 << 9) - 1, mag))
            comp = (comp << 10) | (negbit << 9) | mag
        out[i] = comp & 0xFFFFFFFF
    return out


def pack_spz(arr: np.ndarray) -> bytes:
    n = int(len(arr))
    sh_degree = 3
    splat_size = 9 + 1 + 3 + 3 + 4 + 9 + 15 + 21
    buf = bytearray(16 + n * splat_size)
    struct.pack_into("<I", buf, 0, SPZ_MAGIC)
    struct.pack_into("<I", buf, 4, SPZ_VERSION)
    struct.pack_into("<I", buf, 8, n)
    buf[12] = sh_degree
    buf[13] = FRACTIONAL_BITS
    buf[14] = FLAG_ANTIALIASED
    buf[15] = 0

    frac = 1 << FRACTIONAL_BITS
    xyz = np.column_stack([arr["x"], arr["y"], arr["z"]]).astype(np.float64)
    rgb = 0.5 + SH_C0 * np.column_stack([arr["f_dc_0"], arr["f_dc_1"], arr["f_dc_2"]]).astype(np.float64)
    opac = 1.0 / (1.0 + np.exp(-arr["opacity"].astype(np.float64)))
    log_s = np.column_stack([arr["scale_0"], arr["scale_1"], arr["scale_2"]]).astype(np.float64)
    quat = np.column_stack([arr["rot_1"], arr["rot_2"], arr["rot_3"], arr["rot_0"]]).astype(np.float64)
    rest = np.column_stack([arr[f"f_rest_{i}"] for i in range(45)]).astype(np.float64)

    rounded = np.rint(xyz * frac).astype(np.int32)
    clipped = np.clip(rounded, -8388607, 8388607)
    pos = np.empty((n, 9), dtype=np.uint8)
    for c in range(3):
        v = clipped[:, c]
        pos[:, c * 3] = v & 255
        pos[:, c * 3 + 1] = (v >> 8) & 255
        pos[:, c * 3 + 2] = (v >> 16) & 255

    rgb_u8 = np.empty((n, 3), dtype=np.uint8)
    for c in range(3):
        rgb_u8[:, c] = np.clip(np.rint(((rgb[:, c] - 0.5) / (SH_C0 / 0.15) + 0.5) * 255.0), 0, 255).astype(np.uint8)
    scale_u8 = np.clip(np.rint((log_s + 10.0) * 16.0), 0, 255).astype(np.uint8)
    alpha_u8 = np.clip(np.rint(opac * 255.0), 0, 255).astype(np.uint8)
    sh_u8 = np.empty((n, 45), dtype=np.uint8)
    sh_u8[:, :9] = quantize_sh_arr(rest[:, :9], SH1_BITS)
    sh_u8[:, 9:] = quantize_sh_arr(rest[:, 9:], SH_REST_BITS)
    quat_u32 = pack_quats_xyzw(quat)

    pos_off = 16
    alpha_off = 16 + n * 9
    rgb_off = 16 + n * 10
    scale_off = 16 + n * 13
    quat_off = 16 + n * 16
    sh_off = 16 + n * 20
    buf[pos_off:alpha_off] = pos.reshape(-1).tobytes()
    buf[alpha_off:rgb_off] = alpha_u8.tobytes()
    buf[rgb_off:scale_off] = rgb_u8.reshape(-1).tobytes()
    buf[scale_off:quat_off] = scale_u8.reshape(-1).tobytes()
    buf[quat_off:sh_off] = quat_u32.astype("<u4").tobytes()
    buf[sh_off:] = sh_u8.reshape(-1).tobytes()
    return gzip.compress(bytes(buf), compresslevel=6, mtime=0)


def main() -> int:
    arr, n_in = read_ply(SRC)
    if n_in != EXPECTED_N:
        raise SystemExit(f"expected {EXPECTED_N} primitives, got {n_in}")
    xyz = np.column_stack([arr["x"], arr["y"], arr["z"]])
    nan_mask = np.isnan(xyz).any(axis=1)
    if int(nan_mask.sum()):
        arr = arr[~nan_mask]
    n = int(len(arr))
    if n != EXPECTED_N:
        raise SystemExit(f"NaN filter dropped primitives: {n} != {EXPECTED_N}")

    sim = load_exact_frame_sim3(SIM3)
    s = float(sim["scale"])
    r = np.array(sim["rotation_3x3"], dtype=np.float64)
    t = np.array(sim["translation_m"], dtype=np.float64)
    native_mean = xyz.mean(axis=0)
    scene_mean = apply_sim3(native_mean.reshape(1, 3), s, r, t)[0]
    baked, n_baked = read_ply(BAKED)
    baked_mean = np.array(
        [float(baked["x"].mean()), float(baked["y"].mean()), float(baked["z"].mean())]
    )
    mean_delta = np.abs(scene_mean - baked_mean)
    tag0 = np.array([[2.1801455987865324, 0.25205560627800566, 0.1845032104679485]])
    tag0_arkit = apply_sim3(tag0, s, r, t)[0]

    packed = pack_spz(arr)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_bytes(packed)
    RESEARCH_OUT.write_bytes(packed)

    report = {
        "src": str(SRC),
        "out": str(OUT),
        "research_out": str(RESEARCH_OUT),
        "n_in": n_in,
        "n_out": n,
        "n_baked": n_baked,
        "sh_degree": 3,
        "sh1Bits": SH1_BITS,
        "shRestBits": SH_REST_BITS,
        "spz_version": SPZ_VERSION,
        "bytes": len(packed),
        "native_mean": native_mean.tolist(),
        "scene_mean": scene_mean.tolist(),
        "baked_mean": baked_mean.tolist(),
        "mean_delta": mean_delta.tolist(),
        "sim3_is_scene_transform": True,
        "tag0_arkit": tag0_arkit.tolist(),
        "mean_match": bool(np.all(mean_delta < 1e-3)),
        "retained_all": n == EXPECTED_N,
        "baked_kept_as_research": True,
    }
    OUT.with_suffix(".spz.json").write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps(report, indent=2))
    if not report["mean_match"] or not report["retained_all"]:
        raise SystemExit("native→scene mean did not match baked research PLY")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
