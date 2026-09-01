"""Dense metric cloud from every useful depth pixel. No 500k cap."""

from __future__ import annotations

from pathlib import Path
from typing import Any

import numpy as np

from arkit_io import (
    colmajor_c2w,
    decode_rgb_to_depth_grid,
    iter_depth_records,
    load_pose_frames,
    pair_depth_to_poses,
    scale_intrinsics,
)
from constants import MAX_DEPTH_M, MIN_CONFIDENCE, MIN_DEPTH_M


def unproject_frame(
    record: dict[str, Any],
    frame: dict[str, Any],
    min_conf: int = MIN_CONFIDENCE,
    min_d: float = MIN_DEPTH_M,
    max_d: float = MAX_DEPTH_M,
) -> tuple[np.ndarray, np.ndarray]:
    """ARKit: xc=(col-cx)*d/fx, yc=(cy-row)*d/fy, zc=-d. Column-major c2w."""
    dw, dh = record["width"], record["height"]
    depth_m = record["depth_mm"].astype(np.float32) / 1000.0
    conf = record["confidence"]
    valid = (conf >= min_conf) & (depth_m > 0) & (depth_m >= min_d) & (depth_m <= max_d)
    if not np.any(valid):
        return np.zeros((0, 3), np.float32), np.zeros((0, 3), np.uint8)
    rows, cols = np.nonzero(valid)
    d = depth_m[rows, cols]
    fx, fy, cx, cy = scale_intrinsics(
        frame["intrinsics"], int(frame["w"]), int(frame["h"]), dw, dh
    )
    xc = (cols.astype(np.float32) - cx) * d / fx
    yc = (cy - rows.astype(np.float32)) * d / fy
    zc = -d
    ones = np.ones_like(xc)
    cam = np.stack([xc, yc, zc, ones], axis=1)
    world = (colmajor_c2w(frame["transform_4x4"]) @ cam.T).T[:, :3].astype(np.float32)
    rgb = decode_rgb_to_depth_grid(record.get("rgb_jpeg"), dw, dh)
    colors = rgb[rows, cols] if rgb is not None else np.full((len(world), 3), 180, np.uint8)
    return world, colors


def write_ply_xyzrgb(path: Path, xyz: np.ndarray, rgb: np.ndarray) -> None:
    n = int(xyz.shape[0])
    header = (
        "ply\nformat binary_little_endian 1.0\n"
        f"element vertex {n}\n"
        "property float x\nproperty float y\nproperty float z\n"
        "property uchar red\nproperty uchar green\nproperty uchar blue\n"
        "end_header\n"
    )
    dt = np.dtype([("x", "<f4"), ("y", "<f4"), ("z", "<f4"), ("r", "u1"), ("g", "u1"), ("b", "u1")])
    rec = np.empty(n, dtype=dt)
    rec["x"], rec["y"], rec["z"] = xyz[:, 0], xyz[:, 1], xyz[:, 2]
    rec["r"], rec["g"], rec["b"] = rgb[:, 0], rgb[:, 1], rgb[:, 2]
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("wb") as handle:
        handle.write(header.encode("ascii"))
        rec.tofile(handle)


def aabb(xyz: np.ndarray) -> dict[str, list[float]]:
    if xyz.shape[0] == 0:
        return {"min": [0, 0, 0], "max": [0, 0, 0], "extent": [0, 0, 0]}
    lo, hi = xyz.min(0), xyz.max(0)
    return {
        "min": [float(v) for v in lo],
        "max": [float(v) for v in hi],
        "extent": [float(v) for v in (hi - lo)],
    }


def occupancy_iou(a: np.ndarray, b: np.ndarray, voxel: float = 0.05) -> dict[str, Any]:
    if a.shape[0] == 0 or b.shape[0] == 0:
        return {"iou": 0.0, "overlap_voxels": 0, "union_voxels": 0, "voxel_m": voxel}
    lo = np.maximum(a.min(0), b.min(0))
    hi = np.minimum(a.max(0), b.max(0))
    if np.any(hi <= lo):
        return {"iou": 0.0, "overlap_voxels": 0, "union_voxels": 0, "voxel_m": voxel}

    def keys(pts):
        sel = np.all((pts >= lo) & (pts <= hi), axis=1)
        return set(map(tuple, np.floor((pts[sel] - lo) / voxel).astype(np.int32)))

    ka, kb = keys(a), keys(b)
    overlap = len(ka & kb)
    union = len(ka | kb)
    return {
        "iou": (overlap / union) if union else 0.0,
        "overlap_voxels": overlap,
        "union_voxels": union,
        "voxel_m": voxel,
    }


def build_dense_cloud(
    depth_path: str | Path,
    poses_path: str | Path,
    out_ply: str | Path | None = None,
    min_conf: int = MIN_CONFIDENCE,
    min_d: float = MIN_DEPTH_M,
    max_d: float = MAX_DEPTH_M,
    head_tail_n: int = 20,
) -> dict[str, Any]:
    records = list(iter_depth_records(depth_path))
    frames = load_pose_frames(poses_path)
    pairs = pair_depth_to_poses(records, frames)
    chunks_xyz: list[np.ndarray] = []
    chunks_rgb: list[np.ndarray] = []
    head: list[np.ndarray] = []
    tail: list[np.ndarray] = []
    n = len(pairs)
    for i, (rec, frame) in enumerate(pairs):
        xyz, rgb = unproject_frame(rec, frame, min_conf, min_d, max_d)
        chunks_xyz.append(xyz)
        chunks_rgb.append(rgb)
        if i < head_tail_n:
            head.append(xyz)
        if i >= n - head_tail_n:
            tail.append(xyz)
    xyz = np.concatenate(chunks_xyz, axis=0) if chunks_xyz else np.zeros((0, 3), np.float32)
    rgb = np.concatenate(chunks_rgb, axis=0) if chunks_rgb else np.zeros((0, 3), np.uint8)
    if out_ply is not None:
        write_ply_xyzrgb(Path(out_ply), xyz, rgb)
    head_xyz = np.concatenate(head, axis=0) if head else np.zeros((0, 3), np.float32)
    tail_xyz = np.concatenate(tail, axis=0) if tail else np.zeros((0, 3), np.float32)
    return {
        "points": int(xyz.shape[0]),
        "frames": n,
        "minConfidence": min_conf,
        "rangeM": [min_d, max_d],
        "noPointCap": True,
        "aabb": aabb(xyz),
        "headTailOverlap": occupancy_iou(head_xyz, tail_xyz),
        "xyz": xyz,
        "rgb": rgb,
        "headXyz": head_xyz,
        "tailXyz": tail_xyz,
        "outPly": str(out_ply) if out_ply else None,
    }
