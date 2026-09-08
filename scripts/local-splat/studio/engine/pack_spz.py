#!/usr/bin/env python3
"""Pack a Gaussian PLY (Brush / Inria layout) into Spark-compatible SPZ v3.

Why this exists instead of `splat-transform`: its SPZ writer quantizes SH band 1
to 5 bits and bands 2-3 to 4 bits, which zeroes most view-dependent colour
(measured 68% / 85% zero coefficients on the kitchen model). This packer keeps
8 bits per coefficient and writes version 3, which the Spark 2.1 reader accepts
(it rejects version 4).

    pack_spz.py --in gaussian.ply --out gaussian.spz [--max-sh 3] [--report out.json]
"""
from __future__ import annotations

import argparse
import gzip
import json
import math
import struct
import sys
from pathlib import Path

import numpy as np

SH_C0 = 0.28209479177387814
SPZ_MAGIC = 1347635022
SPZ_VERSION = 3
FLAG_ANTIALIASED = 1
FRACTIONAL_BITS = 12
SH_COEFFS_FOR_DEGREE = {0: 0, 1: 9, 2: 24, 3: 45}


def read_ply(path: Path):
    raw = path.read_bytes()
    end = raw.find(b"end_header\n")
    if end < 0:
        raise SystemExit("not a binary PLY (no end_header)")
    header = raw[:end].decode("ascii", "replace")
    if "binary_little_endian" not in header:
        raise SystemExit("only binary_little_endian PLY is supported")
    n = 0
    props: list[tuple[str, str]] = []
    for line in header.splitlines():
        if line.startswith("element vertex"):
            n = int(line.split()[-1])
        elif line.startswith("property "):
            bits = line.split()
            props.append((bits[1], bits[2]))
    type_map = {"float": "<f4", "double": "<f8", "uchar": "u1", "uint": "<u4", "int": "<i4"}
    dt = np.dtype([(name, type_map.get(typ, "<f4")) for typ, name in props])
    arr = np.frombuffer(raw[end + len(b"end_header\n") :], dtype=dt, count=n)
    return arr, n, [name for _, name in props]


def quantize_sh(sh: np.ndarray, bits: int) -> np.ndarray:
    value = np.rint(sh * 128.0).astype(np.int32) + 128
    bucket = 1 << (8 - bits)
    quantized = np.floor((value + bucket / 2) / bucket).astype(np.int32) * bucket
    return np.clip(quantized, 0, 255).astype(np.uint8)


def pack_quats_xyzw(q: np.ndarray) -> np.ndarray:
    """Smallest-three, 10 bits per component, vectorized. Input xyzw."""
    q = q / np.clip(np.linalg.norm(q, axis=1, keepdims=True), 1e-12, None)
    n = len(q)
    largest = np.argmax(np.abs(q), axis=1)
    sign = np.where(q[np.arange(n), largest] < 0, -1.0, 1.0)[:, None]
    q = q * sign  # make the largest component positive
    max_val = math.sqrt(0.5)
    out = largest.astype(np.uint64)
    for axis in range(4):
        mask = largest != axis
        v = q[:, axis]
        negbit = (v < 0).astype(np.uint64)
        mag = np.floor(((1 << 9) - 1) * (np.abs(v) / max_val) + 0.5).astype(np.int64)
        mag = np.clip(mag, 0, (1 << 9) - 1).astype(np.uint64)
        packed = (negbit << np.uint64(9)) | mag
        out = np.where(mask, (out << np.uint64(10)) | packed, out)
    return (out & np.uint64(0xFFFFFFFF)).astype("<u4")


def pack(arr: np.ndarray, names: list[str], max_sh: int) -> tuple[bytes, dict]:
    n = int(len(arr))
    rest_count = sum(1 for name in names if name.startswith("f_rest_"))
    degree = next((d for d, c in sorted(SH_COEFFS_FOR_DEGREE.items(), reverse=True) if rest_count >= c), 0)
    degree = min(degree, max_sh)
    coeffs = SH_COEFFS_FOR_DEGREE[degree]
    per_channel = coeffs // 3

    xyz = np.column_stack([arr["x"], arr["y"], arr["z"]]).astype(np.float64)
    rgb = 0.5 + SH_C0 * np.column_stack([arr["f_dc_0"], arr["f_dc_1"], arr["f_dc_2"]]).astype(np.float64)
    opacity = arr["opacity"].astype(np.float64)
    if opacity.min() < 0.0 or opacity.max() > 1.0:
        opacity = 1.0 / (1.0 + np.exp(-opacity))  # logit -> probability
    log_s = np.column_stack([arr["scale_0"], arr["scale_1"], arr["scale_2"]]).astype(np.float64)
    if np.median(log_s) > 0:
        log_s = np.log(np.clip(log_s, 1e-8, None))  # linear scales -> log
    quat = np.column_stack([arr["rot_1"], arr["rot_2"], arr["rot_3"], arr["rot_0"]]).astype(np.float64)

    # PLY is channel-major (f_rest_[ch*15+k]); SPZ is coefficient-major (k, then rgb).
    sh = np.zeros((n, coeffs), dtype=np.float64)
    if coeffs:
        rest = np.column_stack([arr[f"f_rest_{i}"] for i in range(rest_count)]).astype(np.float64)
        stride = rest_count // 3
        for k in range(per_channel):
            for ch in range(3):
                sh[:, k * 3 + ch] = rest[:, ch * stride + k]

    splat_size = 9 + 1 + 3 + 3 + 4 + coeffs
    buf = bytearray(16 + n * splat_size)
    struct.pack_into("<I", buf, 0, SPZ_MAGIC)
    struct.pack_into("<I", buf, 4, SPZ_VERSION)
    struct.pack_into("<I", buf, 8, n)
    buf[12] = degree
    buf[13] = FRACTIONAL_BITS
    buf[14] = FLAG_ANTIALIASED
    buf[15] = 0

    frac = 1 << FRACTIONAL_BITS
    fixed = np.clip(np.rint(xyz * frac).astype(np.int64), -8388607, 8388607)
    pos = np.empty((n, 9), dtype=np.uint8)
    for c in range(3):
        v = fixed[:, c]
        pos[:, c * 3] = v & 255
        pos[:, c * 3 + 1] = (v >> 8) & 255
        pos[:, c * 3 + 2] = (v >> 16) & 255
    rgb_u8 = np.clip(np.rint(((rgb - 0.5) / (SH_C0 / 0.15) + 0.5) * 255.0), 0, 255).astype(np.uint8)
    scale_u8 = np.clip(np.rint((log_s + 10.0) * 16.0), 0, 255).astype(np.uint8)
    alpha_u8 = np.clip(np.rint(opacity * 255.0), 0, 255).astype(np.uint8)
    quat_u32 = pack_quats_xyzw(quat)

    off = 16
    buf[off : off + n * 9] = pos.tobytes(); off += n * 9
    buf[off : off + n] = alpha_u8.tobytes(); off += n
    buf[off : off + n * 3] = rgb_u8.tobytes(); off += n * 3
    buf[off : off + n * 3] = scale_u8.tobytes(); off += n * 3
    buf[off : off + n * 4] = quat_u32.tobytes(); off += n * 4
    if coeffs:
        sh_u8 = np.empty((n, coeffs), dtype=np.uint8)
        sh_u8[:, :9] = quantize_sh(sh[:, :9], 8)
        if coeffs > 9:
            sh_u8[:, 9:] = quantize_sh(sh[:, 9:], 8)
        buf[off:] = sh_u8.tobytes()

    packed = gzip.compress(bytes(buf), compresslevel=6, mtime=0)
    report = {
        "splats": n,
        "sh_degree": degree,
        "sh_bits": 8,
        "spz_version": SPZ_VERSION,
        "bytes": len(packed),
        "bbox_min": xyz.min(axis=0).tolist(),
        "bbox_max": xyz.max(axis=0).tolist(),
    }
    return packed, report


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--in", dest="src", required=True)
    p.add_argument("--out", dest="dst", required=True)
    p.add_argument("--max-sh", type=int, default=3)
    p.add_argument("--report", default="")
    a = p.parse_args()
    arr, n_in, names = read_ply(Path(a.src))
    xyz = np.column_stack([arr["x"], arr["y"], arr["z"]])
    bad = ~np.isfinite(xyz).all(axis=1)
    if bad.any():
        arr = arr[~bad]
    packed, report = pack(arr, names, a.max_sh)
    report["splats_in"] = n_in
    report["dropped_nan"] = int(bad.sum())
    out = Path(a.dst)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_bytes(packed)
    report["out"] = str(out)
    text = json.dumps(report, indent=2)
    if a.report:
        Path(a.report).write_text(text + "\n")
    print(text)
    return 0


if __name__ == "__main__":
    sys.exit(main())
