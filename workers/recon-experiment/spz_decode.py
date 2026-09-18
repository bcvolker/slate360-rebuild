"""SPZ v3 decoder (Niantic packed Gaussians) into the PLY/RDF frame.

Version 3 is gzip + 16-byte header. Positions are 24-bit fixed point.
Quaternions use smallest-three. Packed storage is RUB; PLY is RDF = (x,-y,-z).
"""
from __future__ import annotations

import gzip
import struct
from dataclasses import dataclass
from pathlib import Path

import numpy as np

NGSP_MAGIC = 0x5053474E
COLOR_SCALE = 0.15
MIN_SMALLEST_THREE = 3
SH_DIM = {0: 0, 1: 3, 2: 8, 3: 15, 4: 24}
# Within-family RUB -> RDF (y and z flip) SH coefficient signs, degree <= 3.
FLIP_SH = np.array(
    [-1, -1, 1, -1, 1, 1, -1, 1, -1, 1, -1, -1, 1, -1, 1],
    dtype=np.float32,
)


@dataclass
class GaussianCloud:
    positions: np.ndarray  # (N, 3) RDF / PLY
    scales_log: np.ndarray  # (N, 3) log stddev
    quats_xyzw: np.ndarray  # (N, 4)
    opacity_logit: np.ndarray  # (N,)
    sh0: np.ndarray  # (N, 3) DC
    sh_rest: np.ndarray  # (N, dim, 3)
    sh_degree: int
    count: int
    version: int
    fractional_bits: int
    flags: int
    antialiased: bool


def dim_for_degree(degree: int) -> int:
    return int(SH_DIM.get(int(degree), 0))


def decode_spz(path: Path, to_rdf: bool = True) -> GaussianCloud:
    raw = Path(path).read_bytes()
    if raw[:2] != b"\x1f\x8b":
        raise ValueError(f"{path} is not gzip-compressed SPZ")
    data = gzip.decompress(raw)
    if len(data) < 16:
        raise ValueError("SPZ header truncated")
    magic, version, num_points, sh_degree, frac_bits, flags, _reserved = struct.unpack_from(
        "<III BBBB", data, 0
    )
    if magic != NGSP_MAGIC:
        raise ValueError(f"bad SPZ magic {magic:#x}")
    if version < 1 or version > 4:
        raise ValueError(f"unsupported SPZ version {version}")
    if version >= 4:
        raise ValueError("SPZ v4 (zstd streams) is not implemented in this harness")
    sh_dim = dim_for_degree(sh_degree)
    uses_f16 = version == 1
    uses_st = version >= MIN_SMALLEST_THREE
    pos_b = 6 if uses_f16 else 9
    rot_b = 4 if uses_st else 3
    off = 16
    pos_n = num_points * pos_b
    alpha_n = num_points
    color_n = num_points * 3
    scale_n = num_points * 3
    rot_n = num_points * rot_b
    sh_n = num_points * sh_dim * 3
    need = off + pos_n + alpha_n + color_n + scale_n + rot_n + sh_n
    if len(data) < need:
        raise ValueError(f"SPZ payload truncated: have {len(data)} need {need}")
    pos_u8 = np.frombuffer(data, dtype=np.uint8, count=pos_n, offset=off)
    off += pos_n
    alphas = np.frombuffer(data, dtype=np.uint8, count=alpha_n, offset=off)
    off += alpha_n
    colors = np.frombuffer(data, dtype=np.uint8, count=color_n, offset=off).reshape(num_points, 3)
    off += color_n
    scales_u8 = np.frombuffer(data, dtype=np.uint8, count=scale_n, offset=off).reshape(num_points, 3)
    off += scale_n
    rots_u8 = np.frombuffer(data, dtype=np.uint8, count=rot_n, offset=off)
    off += rot_n
    sh_u8 = np.frombuffer(data, dtype=np.uint8, count=sh_n, offset=off)

    if uses_f16:
        raise ValueError("SPZ v1 float16 positions are not used by Slate360 exports")
    pos_bytes = pos_u8.reshape(num_points, 3, 3)
    fixed = (
        pos_bytes[:, :, 0].astype(np.int32)
        | (pos_bytes[:, :, 1].astype(np.int32) << 8)
        | (pos_bytes[:, :, 2].astype(np.int32) << 16)
    )
    sign = (fixed & 0x800000) != 0
    fixed = np.where(sign, fixed | np.int32(0xFF000000), fixed)
    positions = fixed.astype(np.float32) / float(1 << frac_bits)

    scales_log = scales_u8.astype(np.float32) / 16.0 - 10.0
    opacity = alphas.astype(np.float32) / 255.0
    opacity = np.clip(opacity, 1e-6, 1.0 - 1e-6)
    opacity_logit = np.log(opacity / (1.0 - opacity)).astype(np.float32)
    sh0 = ((colors.astype(np.float32) / 255.0) - 0.5) / COLOR_SCALE
    if sh_dim:
        rest = (sh_u8.astype(np.float32) - 128.0) / 128.0
        sh_rest = rest.reshape(num_points, sh_dim, 3)
    else:
        sh_rest = np.zeros((num_points, 0, 3), dtype=np.float32)

    if uses_st:
        quats = _unpack_smallest_three(rots_u8.reshape(num_points, 4))
    else:
        quats = _unpack_first_three(rots_u8.reshape(num_points, 3))

    if to_rdf:
        positions = positions * np.array([1.0, -1.0, -1.0], dtype=np.float32)
        quats = quats * np.array([1.0, -1.0, -1.0, 1.0], dtype=np.float32)
        if sh_dim:
            flips = FLIP_SH[:sh_dim][None, :, None]
            sh_rest = sh_rest * flips

    return GaussianCloud(
        positions=positions,
        scales_log=scales_log,
        quats_xyzw=quats,
        opacity_logit=opacity_logit,
        sh0=sh0,
        sh_rest=sh_rest,
        sh_degree=int(sh_degree),
        count=int(num_points),
        version=int(version),
        fractional_bits=int(frac_bits),
        flags=int(flags),
        antialiased=bool(flags & 1),
    )


def _unpack_first_three(r: np.ndarray) -> np.ndarray:
    xyz = r.astype(np.float32) / 127.5 - 1.0
    w = np.sqrt(np.clip(1.0 - np.sum(xyz * xyz, axis=1), 0.0, None))
    return np.concatenate([xyz, w[:, None]], axis=1)


def _unpack_smallest_three(r: np.ndarray) -> np.ndarray:
    comp = (
        r[:, 0].astype(np.uint32)
        + (r[:, 1].astype(np.uint32) << 8)
        + (r[:, 2].astype(np.uint32) << 16)
        + (r[:, 3].astype(np.uint32) << 24)
    )
    largest = (comp >> 30).astype(np.int32)
    mask = np.uint32((1 << 9) - 1)
    out = np.zeros((r.shape[0], 4), dtype=np.float32)
    sqrt_half = np.float32(0.7071067811865475)
    remaining = comp.copy()
    for i in (3, 2, 1, 0):
        slot = np.where(largest != i)
        mag = remaining[slot] & mask
        neg = (remaining[slot] >> 9) & 1
        val = sqrt_half * mag.astype(np.float32) / float(mask)
        val = np.where(neg == 1, -val, val)
        out[slot[0], i] = val
        remaining[slot] = remaining[slot] >> 10
    sum_sq = np.sum(out * out, axis=1)
    recon = np.sqrt(np.clip(1.0 - sum_sq, 0.0, None))
    rows = np.arange(out.shape[0])
    out[rows, largest] = recon
    return out
