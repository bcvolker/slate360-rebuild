#!/usr/bin/env python3
"""Numeric diagnostics for the KitchenAprilTags metric GLB. Does not modify geometry."""
from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np
import open3d as o3d


def triangle_areas(verts: np.ndarray, tris: np.ndarray) -> np.ndarray:
    a = verts[tris[:, 0]]
    b = verts[tris[:, 1]]
    c = verts[tris[:, 2]]
    return 0.5 * np.linalg.norm(np.cross(b - a, c - a), axis=1)


def diagnose(path: Path) -> dict:
    mesh = o3d.io.read_triangle_mesh(str(path))
    verts = np.asarray(mesh.vertices)
    tris = np.asarray(mesh.triangles)
    n_tris = int(tris.shape[0])
    n_verts = int(verts.shape[0])
    has_vcol = mesh.has_vertex_colors() and np.asarray(mesh.vertex_colors).shape[0] == n_verts
    has_n = mesh.has_vertex_normals() and np.asarray(mesh.vertex_normals).shape[0] == n_verts
    if not has_n:
        mesh.compute_vertex_normals()
        has_n = True
    normals = np.asarray(mesh.vertex_normals)

    aabb = mesh.get_axis_aligned_bounding_box()
    amin = np.asarray(aabb.get_min_bound(), dtype=float)
    amax = np.asarray(aabb.get_max_bound(), dtype=float)
    extent = amax - amin
    center = (amin + amax) * 0.5

    areas = triangle_areas(verts, tris) if n_tris else np.zeros(0)
    degenerate = int(np.sum(areas < 1e-12)) if n_tris else 0

    a = verts[tris[:, 0]] if n_tris else np.zeros((0, 3))
    b = verts[tris[:, 1]] if n_tris else np.zeros((0, 3))
    c = verts[tris[:, 2]] if n_tris else np.zeros((0, 3))
    geom = np.cross(b - a, c - a)
    geom_n = np.linalg.norm(geom, axis=1, keepdims=True)
    geom_unit = np.divide(geom, np.clip(geom_n, 1e-12, None))
    vn = (normals[tris[:, 0]] + normals[tris[:, 1]] + normals[tris[:, 2]]) / 3.0
    vn_n = np.linalg.norm(vn, axis=1, keepdims=True)
    vn_unit = np.divide(vn, np.clip(vn_n, 1e-12, None))
    agree = np.sum(vn_unit * geom_unit, axis=1)
    inconsistent = float(np.mean(agree < 0.0) * 100.0) if n_tris else 0.0

    tri_cent = (a + b + c) / 3.0
    to_center = center - tri_cent
    inward = np.sum(geom_unit * to_center, axis=1) > 0
    inward_pct = float(np.mean(inward) * 100.0) if n_tris else 0.0

    labels, counts, _ = mesh.cluster_connected_triangles()
    counts_arr = np.asarray(counts)
    largest_frac = float(counts_arr.max() / counts_arr.sum()) if counts_arr.size else 0.0

    dummy_inside = [0.0, 1.6, 0.0]
    dummy_dollhouse = [0.0, 4.6, 4.0]
    floor_y = float(np.percentile(verts[:, 1], 2)) if n_verts else None
    ceil_y = float(np.percentile(verts[:, 1], 98)) if n_verts else None
    eye_y = (floor_y + 1.55) if floor_y is not None else None

    def inside_aabb(p: list[float]) -> bool:
        return bool(np.all(np.array(p) >= amin) and np.all(np.array(p) <= amax))

    winding = mesh.is_orientable() if hasattr(mesh, "is_orientable") else None

    return {
        "path": str(path),
        "bytes": path.stat().st_size,
        "vertices": n_verts,
        "triangles": n_tris,
        "hasVertexColors": bool(has_vcol),
        "hasVertexNormals": bool(has_n),
        "aabbMin": amin.tolist(),
        "aabbMax": amax.tolist(),
        "aabbExtent": extent.tolist(),
        "width_x_m": float(extent[0]),
        "height_y_m": float(extent[1]),
        "depth_z_m": float(extent[2]),
        "upAxis": "Y (Open3D / ARKit)",
        "unitsAssumed": "metres",
        "degenerateTriangles": degenerate,
        "degeneratePct": float(degenerate / n_tris * 100.0) if n_tris else 0.0,
        "inconsistentVertexVsFaceNormalPct": inconsistent,
        "inwardFacingTowardAabbCenterPct": inward_pct,
        "orientable": winding,
        "componentCount": int(counts_arr.size),
        "largestComponentFraction": largest_frac,
        "floorY_p02": floor_y,
        "ceilingY_p98": ceil_y,
        "humanEyeY_floorPlus1_55": eye_y,
        "currentDummyStationInsideAabb": inside_aabb(dummy_inside),
        "currentDummyStationYVsCeiling": {
            "stationEyeY": 1.6,
            "ceilingY_p98": ceil_y,
            "eyeIsAboveCeiling": bool(ceil_y is not None and 1.6 > ceil_y),
        },
        "currentDollhouseCameraInsideAabb": inside_aabb(dummy_dollhouse),
        "vertexColorMean": (
            np.asarray(mesh.vertex_colors).mean(axis=0).tolist() if has_vcol else None
        ),
    }


def main() -> int:
    paths = [Path(p) for p in sys.argv[1:]]
    if not paths:
        raise SystemExit("usage: diagnose-kitchen-glb.py <mesh.glb|ply> [...]")
    out = [diagnose(p) for p in paths]
    print(json.dumps(out if len(out) > 1 else out[0], indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
