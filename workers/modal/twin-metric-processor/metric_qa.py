"""Metric QA. Reports geometry health; does not pass/fail on wall clustering."""

from __future__ import annotations

from typing import Any

import numpy as np

from dense_cloud import aabb, occupancy_iou


def floor_plane(xyz: np.ndarray, up_axis: int = 1, sample: int = 80_000) -> dict[str, Any]:
    """RANSAC-ish floor on the lower Y band. Residual is the metric to watch (~8 mm)."""
    if xyz.shape[0] < 50:
        return {"ok": False, "reason": "too_few_points"}
    y = xyz[:, up_axis]
    y_cut = float(np.percentile(y, 12))
    band = xyz[y <= y_cut + 0.08]
    if band.shape[0] < 30:
        band = xyz[y <= float(np.percentile(y, 25))]
    rng = np.random.default_rng(0)
    if band.shape[0] > sample:
        band = band[rng.choice(band.shape[0], sample, replace=False)]
    pts = band.astype(np.float64)
    best = None
    for _ in range(400):
        idx = rng.choice(pts.shape[0], 3, replace=False)
        p0, p1, p2 = pts[idx]
        n = np.cross(p1 - p0, p2 - p0)
        mag = float(np.linalg.norm(n))
        if mag < 1e-9:
            continue
        n = n / mag
        if abs(n[up_axis]) < 0.85:
            continue
        if n[up_axis] < 0:
            n = -n
        d = -float(np.dot(n, p0))
        dist = np.abs(pts @ n + d)
        inliers = dist < 0.02
        n_in = int(inliers.sum())
        if best is None or n_in > best[0]:
            best = (n_in, n, d, dist, inliers)
    if best is None:
        return {"ok": False, "reason": "no_horizontal_plane"}
    n_in, n, d, dist, inliers = best
    inlier_dist = dist[inliers]
    residual_rms = float(np.sqrt(np.mean(inlier_dist ** 2))) if inlier_dist.size else None
    return {
        "ok": True,
        "n": int(pts.shape[0]),
        "y_cut": y_cut,
        "plane": [float(v) for v in (*n, d)],
        "normal": [float(v) for v in n],
        "up_alignment": float(abs(n[up_axis])),
        "inliers": n_in,
        "residual_rms_m": residual_rms,
        "residual_p95_m": float(np.percentile(inlier_dist, 95)) if inlier_dist.size else None,
    }


def gravity_alignment(frames: list[dict[str, Any]], floor: dict[str, Any]) -> dict[str, Any]:
    gravities = [f.get("gravity") for f in frames if isinstance(f.get("gravity"), list) and len(f["gravity"]) == 3]
    mean = None
    if gravities:
        g = np.mean(np.asarray(gravities, dtype=np.float64), axis=0)
        mag = float(np.linalg.norm(g))
        mean = (g / mag).tolist() if mag > 1e-9 else None
    floor_up = floor.get("up_alignment")
    return {
        "meanGravity": mean,
        "floorUpAlignment": floor_up,
        "gravityVsPlusY": float(abs(mean[1])) if mean else None,
        "aligned": bool(floor_up is not None and floor_up >= 0.98),
    }


def floor_ceiling_span(xyz: np.ndarray, up_axis: int = 1) -> dict[str, Any]:
    if xyz.shape[0] == 0:
        return {"y_p02": None, "y_p98": None, "storey_m": None}
    y = xyz[:, up_axis]
    lo, hi = float(np.percentile(y, 2)), float(np.percentile(y, 98))
    return {"y_p02": lo, "y_p98": hi, "storey_m": hi - lo}


def coverage_holes(xyz: np.ndarray, voxel: float = 0.08, up_axis: int = 1) -> dict[str, Any]:
    """Empty floor-slice voxels inside the occupied AABB — holes, not a wall score."""
    if xyz.shape[0] == 0:
        return {"emptyFraction": 1.0, "occupied": 0, "cells": 0}
    y = xyz[:, up_axis]
    y0, y1 = float(np.percentile(y, 5)), float(np.percentile(y, 20))
    slice_pts = xyz[(y >= y0) & (y <= y1 + 0.15)]
    if slice_pts.shape[0] < 20:
        slice_pts = xyz
    axes = [i for i in range(3) if i != up_axis]
    pts2 = slice_pts[:, axes]
    lo, hi = pts2.min(0), pts2.max(0)
    span = np.maximum(hi - lo, voxel)
    nx, nz = np.maximum(1, np.ceil(span / voxel).astype(int))
    grid = np.zeros((int(nx), int(nz)), dtype=np.uint8)
    ix = np.clip(np.floor((pts2[:, 0] - lo[0]) / voxel).astype(int), 0, nx - 1)
    iz = np.clip(np.floor((pts2[:, 1] - lo[1]) / voxel).astype(int), 0, nz - 1)
    grid[ix, iz] = 1
    occupied = int(grid.sum())
    cells = int(grid.size)
    return {
        "emptyFraction": 1.0 - (occupied / cells if cells else 0.0),
        "occupied": occupied,
        "cells": cells,
        "voxel_m": voxel,
    }


def mesh_components(mesh) -> dict[str, Any]:
    if mesh is None:
        return {"componentCount": None, "largestFraction": None, "triangles": 0}
    labels, counts, _ = mesh.cluster_connected_triangles()
    counts = np.asarray(counts)
    if counts.size == 0:
        return {"componentCount": 0, "largestFraction": 0.0, "triangles": 0}
    total = int(counts.sum())
    largest = int(counts.max())
    return {
        "componentCount": int(counts.size),
        "largestFraction": (largest / total) if total else 0.0,
        "largestTriangles": largest,
        "triangles": total,
    }


def report_qa(
    xyz: np.ndarray,
    frames: list[dict[str, Any]],
    *,
    mesh=None,
    head_xyz: np.ndarray | None = None,
    tail_xyz: np.ndarray | None = None,
) -> dict[str, Any]:
    floor = floor_plane(xyz)
    box = aabb(xyz)
    components = mesh_components(mesh)
    closure = occupancy_iou(head_xyz, tail_xyz) if head_xyz is not None and tail_xyz is not None else None
    return {
        "aabb": box,
        "floor": floor,
        "gravity": gravity_alignment(frames, floor),
        "floorCeiling": floor_ceiling_span(xyz),
        "components": components,
        "coverageHoles": coverage_holes(xyz),
        "trajectoryOverlap": closure,
        "wallClustering": {
            "usedAsPassFail": False,
            "note": "Wall clustering is reported elsewhere if at all; it is not a gate.",
        },
        "passNotes": {
            "floorResidualUseful": True,
            "singleWallScoreIsNotAGate": True,
        },
    }
