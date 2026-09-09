#!/usr/bin/env python3
"""iPhone LiDAR point cloud → watertight-ish metric mesh (GLB) for the Geometry layer.

    lidar_mesh.py --in lidar_capture.ply --out geometry.glb [--voxel 0.02] [--depth 9]
                  [--max-faces 400000] [--report mesh_report.json]

Open3D (MIT) Poisson reconstruction on the phone's 2 cm voxel-hashed cloud, trimmed to
the cloud's footprint, density-filtered to drop the Poisson "bubble", simplified, and
exported with vertex colours via trimesh. The cloud is already in ARKit world
(metric, +Y up), so the mesh lands exactly under the ARKit-aligned splat.
"""
from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path

import numpy as np


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--in", dest="src", required=True)
    ap.add_argument("--out", dest="dst", required=True)
    ap.add_argument("--voxel", type=float, default=0.02)
    ap.add_argument("--depth", type=int, default=9)
    ap.add_argument("--max-faces", type=int, default=400_000)
    ap.add_argument("--density-quantile", type=float, default=0.03)
    ap.add_argument("--report", default="")
    a = ap.parse_args()

    import open3d as o3d
    import trimesh

    t0 = time.time()
    pcd = o3d.io.read_point_cloud(a.src)
    n_in = len(pcd.points)
    if n_in < 1000:
        print(json.dumps({"error": "too few LiDAR points", "points": n_in}))
        return 4
    pcd = pcd.voxel_down_sample(a.voxel)
    pcd, _ = pcd.remove_statistical_outlier(nb_neighbors=20, std_ratio=2.0)
    pcd.estimate_normals(o3d.geometry.KDTreeSearchParamHybrid(radius=a.voxel * 4, max_nn=30))
    pcd.orient_normals_consistent_tangent_plane(30)

    mesh, densities = o3d.geometry.TriangleMesh.create_from_point_cloud_poisson(pcd, depth=a.depth, linear_fit=True)
    densities = np.asarray(densities)
    cut = np.quantile(densities, a.density_quantile)
    mesh.remove_vertices_by_mask(densities < cut)
    # Poisson closes the volume with a bubble; keep only what lies inside the cloud's box.
    bbox = pcd.get_axis_aligned_bounding_box()
    bbox = o3d.geometry.AxisAlignedBoundingBox(bbox.min_bound - 0.1, bbox.max_bound + 0.1)
    mesh = mesh.crop(bbox)
    mesh.remove_degenerate_triangles()
    mesh.remove_unreferenced_vertices()
    if len(mesh.triangles) > a.max_faces:
        mesh = mesh.simplify_quadric_decimation(a.max_faces)
    mesh.compute_vertex_normals()

    v = np.asarray(mesh.vertices)
    f = np.asarray(mesh.triangles)
    colors = None
    if mesh.has_vertex_colors():
        colors = (np.clip(np.asarray(mesh.vertex_colors), 0, 1) * 255).astype(np.uint8)
        colors = np.column_stack([colors, np.full(len(colors), 255, dtype=np.uint8)])
    tm = trimesh.Trimesh(vertices=v, faces=f, vertex_colors=colors, process=False)
    tm.export(a.dst)

    lo, hi = v.min(axis=0), v.max(axis=0)
    report = {
        "points_in": n_in, "points_used": len(pcd.points), "vertices": int(len(v)), "faces": int(len(f)),
        "bounds_min": lo.round(3).tolist(), "bounds_max": hi.round(3).tolist(),
        "floor_y_estimate": round(float(np.percentile(v[:, 1], 1.0)), 3),
        "bytes": Path(a.dst).stat().st_size, "seconds": round(time.time() - t0, 1),
    }
    if a.report:
        Path(a.report).write_text(json.dumps(report, indent=2))
    print("RESULT mesh " + json.dumps(report))
    return 0


if __name__ == "__main__":
    sys.exit(main())
