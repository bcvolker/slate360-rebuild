"""TSDF at 10 / 15 / 20 mm. Default 15 mm from Route C. Preserve the raw mesh."""

from __future__ import annotations

from pathlib import Path
from typing import Any

from arkit_io import (
    arkit_extrinsic,
    decode_rgb_to_depth_grid,
    iter_depth_records,
    load_pose_frames,
    pair_depth_to_poses,
    scale_intrinsics,
)
from constants import ALLOWED_VOXEL_MM, DEFAULT_VOXEL_MM, MAX_DEPTH_M, MIN_CONFIDENCE, MIN_DEPTH_M


def resolve_voxel_mm(voxel_mm: int | None) -> int:
    requested = DEFAULT_VOXEL_MM if voxel_mm is None else int(voxel_mm)
    if requested not in ALLOWED_VOXEL_MM:
        raise ValueError(
            f"TSDF voxel must be one of {ALLOWED_VOXEL_MM} mm (Route C selected 15 mm). "
            f"Got {requested}."
        )
    return requested


def integrate_tsdf(
    depth_path: str | Path,
    poses_path: str | Path,
    out_dir: str | Path,
    voxel_mm: int = DEFAULT_VOXEL_MM,
    min_confidence: int = MIN_CONFIDENCE,
    min_depth_m: float = MIN_DEPTH_M,
    depth_trunc_m: float = MAX_DEPTH_M,
) -> dict[str, Any]:
    import numpy as np
    import open3d as o3d

    voxel_mm = resolve_voxel_mm(voxel_mm)
    voxel_length = voxel_mm / 1000.0
    sdf_trunc = max(0.02, 4.0 * voxel_length)
    out = Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)

    records = list(iter_depth_records(depth_path))
    frames = load_pose_frames(poses_path)
    pairs = pair_depth_to_poses(records, frames)
    if not pairs:
        raise RuntimeError("No depth/pose pairs to integrate")

    has_rgb = any(r.get("rgb_jpeg") for r, _ in pairs)
    volume = o3d.pipelines.integration.ScalableTSDFVolume(
        voxel_length=voxel_length,
        sdf_trunc=sdf_trunc,
        color_type=(
            o3d.pipelines.integration.TSDFVolumeColorType.RGB8
            if has_rgb
            else o3d.pipelines.integration.TSDFVolumeColorType.NoColor
        ),
    )
    integrated = 0
    rgb_ok = 0
    for record, frame in pairs:
        depth_m = record["depth_mm"].astype(np.float32) / 1000.0
        depth_m[record["confidence"] < min_confidence] = 0.0
        depth_m[(depth_m < min_depth_m) | (depth_m > depth_trunc_m)] = 0.0
        if not np.any(depth_m):
            continue
        fx, fy, cx, cy = scale_intrinsics(
            frame["intrinsics"], int(frame["w"]), int(frame["h"]),
            record["width"], record["height"],
        )
        intrinsic = o3d.camera.PinholeCameraIntrinsic(
            record["width"], record["height"], fx, fy, cx, cy
        )
        frame_rgb = (
            decode_rgb_to_depth_grid(record.get("rgb_jpeg"), record["width"], record["height"])
            if has_rgb
            else None
        )
        if frame_rgb is not None:
            rgb_ok += 1
        color_image = (
            frame_rgb
            if frame_rgb is not None
            else np.zeros((record["height"], record["width"], 3), dtype=np.uint8)
        )
        rgbd = o3d.geometry.RGBDImage.create_from_color_and_depth(
            o3d.geometry.Image(color_image),
            o3d.geometry.Image(np.ascontiguousarray(depth_m)),
            depth_scale=1.0,
            depth_trunc=depth_trunc_m,
            convert_rgb_to_intensity=False,
        )
        volume.integrate(rgbd, intrinsic, arkit_extrinsic(frame["transform_4x4"]))
        integrated += 1

    mesh = volume.extract_triangle_mesh()
    mesh.compute_vertex_normals()
    raw_ply = out / f"reconstruction_master_{voxel_mm:02d}mm.ply"
    o3d.io.write_triangle_mesh(str(raw_ply), mesh)
    engineering = out / f"engineering_mesh_{voxel_mm:02d}mm.ply"
    o3d.io.write_triangle_mesh(str(engineering), mesh)
    from glb_binary import inspect_glb, write_open3d_mesh_glb
    from mesh_products import build_mesh_products

    web_glb = out / "geometry.glb"
    glb_info = write_open3d_mesh_glb(web_glb, mesh)
    glb_ok = bool(glb_info.get("ok"))
    if not glb_ok:
        raise RuntimeError(f"geometry.glb is not a binary GLB: {glb_info}")
    products = build_mesh_products(mesh, out)
    labels, counts, _ = mesh.cluster_connected_triangles()
    counts_arr = np.asarray(counts)
    largest_frac = float(counts_arr.max() / counts_arr.sum()) if counts_arr.size else 0.0
    extent = mesh.get_axis_aligned_bounding_box().get_extent()
    return {
        "voxelMm": voxel_mm,
        "voxelLength": voxel_length,
        "sdfTrunc": sdf_trunc,
        "pairsIntegrated": integrated,
        "rgbDecoded": rgb_ok,
        "triangles": int(len(mesh.triangles)),
        "vertices": int(len(mesh.vertices)),
        "componentCount": int(counts_arr.size),
        "largestFraction": largest_frac,
        "aabbExtent": [float(v) for v in extent],
        "rawMasterPly": str(raw_ply),
        "engineeringPly": str(engineering),
        "geometryGlb": str(web_glb) if glb_ok else None,
        "geometryGlbInspect": inspect_glb(web_glb) if glb_ok else None,
        "meshProducts": products,
        "selectionReason": (
            "Operator/default 15 mm from Route C. Not auto-picked by fewest components "
            "(that wrongly preferred 20 mm on KitchenAprilTags)."
        ),
        "mesh": mesh,
    }
