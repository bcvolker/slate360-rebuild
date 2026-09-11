#!/usr/bin/env python3
"""iPhone per-frame LiDAR depth (S360DEPTH1) + ARKit poses → TSDF mesh (GLB) for the Geometry layer.

    tsdf_mesh.py --depth lidar_depth.s360depth --poses lidar_poses.json --out geometry.glb
                 [--voxel 0.012] [--trunc 0.04] [--max-faces 400000] [--report mesh_report.json]
    tsdf_mesh.py --selftest

Why TSDF instead of Poisson on the voxel cloud (lidar_mesh.py): Poisson invents a smooth skin
over a 2 cm point soup — lumpy walls, bubbles across doorways, and a partial cloud gives a partial
"balloon". A TSDF fuses every posed depth map along its own camera ray, so walls come out flat
where the LiDAR saw them and honestly missing where it did not. This is a port of the cloud
worker's interior_mesh.py (workers/modal/twin-gaussian-splat), which is unit-tested there.

Inputs come straight from the phone (pull-capture.mjs keeps their names):
  * lidar_depth.s360depth — magic "S360DEPTH1", then records: header <dHHIII> = (unix timestamp,
    width, height, depth bytes, confidence bytes, rgb bytes), uint16 depth in mm, uint8 ARKit
    confidence (0 low / 1 medium / 2 high), optional JPEG (at depth size since build 71).
  * lidar_poses.json v6 — frames[] with transform_4x4 (ARKit camera-to-world, column-major),
    intrinsics {fx,fy,cx,cy} at RGB size, w/h, timestamp.
The mesh lands in ARKit world (metric, +Y up), exactly where lidar_mesh.py's output does.
Open3D (MIT) + trimesh.
"""
from __future__ import annotations

import argparse
import io
import json
import struct
import sys
import time
from pathlib import Path
from typing import Any, Iterator

import numpy as np

MAGIC = b"S360DEPTH1"
RECORD_HEADER = "<dHHIII"
RECORD_HEADER_BYTES = 24

DEPTH_TRUNC_M = 5.0     # iPhone ToF is honest to ~5 m; beyond is smear
MIN_DEPTH_M = 0.25
MIN_CONFIDENCE = 1
VOXEL_M = 0.012
SDF_TRUNC_M = 0.04
MIN_COMPONENT_FRACTION = 0.02


def iter_depth_records(path: Path) -> Iterator[dict[str, Any]]:
    with path.open("rb") as fh:
        if fh.read(len(MAGIC)) != MAGIC:
            raise ValueError("not an S360DEPTH1 stream")
        index = 0
        while True:
            header = fh.read(RECORD_HEADER_BYTES)
            if not header:
                return
            if len(header) != RECORD_HEADER_BYTES:
                raise ValueError("truncated depth record header")
            ts, w, h, nd, nc, nr = struct.unpack(RECORD_HEADER, header)
            if w <= 0 or h <= 0 or nd != w * h * 2:
                raise ValueError("depth record dimensions do not match payload")
            d = fh.read(nd); c = fh.read(nc); r = fh.read(nr) if nr else b""
            if len(d) != nd or len(c) != nc:
                raise ValueError("truncated depth record payload")
            yield {
                "index": index, "timestamp": float(ts), "width": int(w), "height": int(h),
                "depth_mm": np.frombuffer(d, dtype="<u2").reshape(h, w),
                "confidence": np.frombuffer(c, dtype=np.uint8).reshape(h, w),
                "rgb_jpeg": r or None,
            }
            index += 1


def decode_rgb(jpeg: bytes | None, width: int, height: int):
    """JPEG → RGB uint8 at the depth grid (nearest: colour is projected onto voxels)."""
    if not jpeg:
        return None
    try:
        from PIL import Image
        with Image.open(io.BytesIO(jpeg)) as img:
            arr = np.asarray(img.convert("RGB"), dtype=np.uint8)
    except Exception:  # noqa: BLE001 — colour is a bonus, never the geometry
        return None
    if arr.ndim != 3 or arr.size == 0:
        return None
    sh, sw = arr.shape[:2]
    if (sh, sw) == (height, width):
        return np.ascontiguousarray(arr)
    rows = np.clip(np.arange(height) * sh // height, 0, sh - 1)
    cols = np.clip(np.arange(width) * sw // width, 0, sw - 1)
    return np.ascontiguousarray(arr[rows][:, cols])


def load_pose_frames(path: Path) -> list[dict[str, Any]]:
    data = json.loads(path.read_text(encoding="utf-8"))
    return [f for f in data.get("frames", []) if isinstance(f.get("transform_4x4"), list) and len(f["transform_4x4"]) == 16]


def pair_depth_to_poses(records: list[dict], frames: list[dict], tolerance_s: float = 0.12) -> list[tuple[dict, dict]]:
    """One depth record per keyframe from the same queue → index pairing when counts match;
    otherwise nearest timestamp within tolerance, dropping the rest (a wrong pose is worse than a hole)."""
    if not records or not frames:
        return []
    if len(records) == len(frames):
        return list(zip(records, frames))
    times = np.array([float(f.get("timestamp") or 0.0) for f in frames])
    pairs = []
    for rec in records:
        i = int(np.argmin(np.abs(times - rec["timestamp"])))
        if abs(times[i] - rec["timestamp"]) <= tolerance_s:
            pairs.append((rec, frames[i]))
    return pairs


def scale_intrinsics(k: dict[str, float], rgb_w: int, rgb_h: int, dw: int, dh: int) -> tuple[float, float, float, float]:
    sx, sy = dw / float(rgb_w), dh / float(rgb_h)
    return float(k["fx"]) * sx, float(k["fy"]) * sy, float(k["cx"]) * sx, float(k["cy"]) * sy


def arkit_extrinsic(transform_4x4: list[float]) -> np.ndarray:
    """ARKit camera-to-world (column-major, Y-up, looks down −Z) → OpenCV world-to-camera (Y-down, +Z fwd)."""
    c2w = np.array(transform_4x4, dtype=np.float64).reshape(4, 4, order="F")
    flip = np.diag([1.0, -1.0, -1.0, 1.0])
    return np.linalg.inv(c2w @ flip)


def keep_large_components(mesh, min_fraction: float):
    labels, counts, _ = mesh.cluster_connected_triangles()
    counts = np.asarray(counts)
    if counts.size == 0:
        return mesh
    keep = counts >= max(1, int(counts.max() * min_fraction))
    remove = np.isin(np.asarray(labels), np.flatnonzero(~keep))
    if remove.any():
        mesh.remove_triangles_by_mask(remove)
        mesh.remove_unreferenced_vertices()
    return mesh


def build(depth_path: Path, poses_path: Path, out: Path, voxel: float, trunc: float, max_faces: int,
          min_conf: int, log=print) -> dict[str, Any]:
    import open3d as o3d
    import trimesh

    t0 = time.time()
    records = list(iter_depth_records(depth_path))
    frames = load_pose_frames(poses_path)
    pairs = pair_depth_to_poses(records, frames)
    if not pairs:
        raise RuntimeError(f"no depth/pose pairs ({len(records)} depth records, {len(frames)} pose frames)")
    has_rgb = any(r["rgb_jpeg"] for r, _ in pairs)
    volume = o3d.pipelines.integration.ScalableTSDFVolume(
        voxel_length=voxel, sdf_trunc=trunc,
        color_type=o3d.pipelines.integration.TSDFVolumeColorType.RGB8 if has_rgb
        else o3d.pipelines.integration.TSDFVolumeColorType.NoColor)
    integrated = 0
    for i, (rec, fr) in enumerate(pairs):
        depth_m = rec["depth_mm"].astype(np.float32) / 1000.0
        depth_m[rec["confidence"] < min_conf] = 0.0
        depth_m[(depth_m < MIN_DEPTH_M) | (depth_m > DEPTH_TRUNC_M)] = 0.0
        if not np.any(depth_m):
            continue
        fx, fy, cx, cy = scale_intrinsics(fr["intrinsics"], int(fr["w"]), int(fr["h"]), rec["width"], rec["height"])
        intr = o3d.camera.PinholeCameraIntrinsic(rec["width"], rec["height"], fx, fy, cx, cy)
        rgb = decode_rgb(rec["rgb_jpeg"], rec["width"], rec["height"]) if has_rgb else None
        if rgb is None:
            rgb = np.zeros((rec["height"], rec["width"], 3), dtype=np.uint8)
        rgbd = o3d.geometry.RGBDImage.create_from_color_and_depth(
            o3d.geometry.Image(rgb), o3d.geometry.Image(np.ascontiguousarray(depth_m)),
            depth_scale=1.0, depth_trunc=DEPTH_TRUNC_M, convert_rgb_to_intensity=False)
        volume.integrate(rgbd, intr, arkit_extrinsic(fr["transform_4x4"]))
        integrated += 1
        if i % 100 == 0:
            log(f"PROGRESS tsdf {i} {len(pairs)}")

    mesh = volume.extract_triangle_mesh()
    faces_raw = len(mesh.triangles)
    mesh = keep_large_components(mesh, MIN_COMPONENT_FRACTION)
    if len(mesh.triangles) == 0:
        raise RuntimeError("TSDF produced no surface — check depth/pose pairing")
    if len(mesh.triangles) > max_faces:
        mesh = mesh.simplify_quadric_decimation(max_faces)
    mesh.remove_degenerate_triangles()
    mesh.remove_unreferenced_vertices()
    mesh.compute_vertex_normals()

    v = np.asarray(mesh.vertices); f = np.asarray(mesh.triangles)
    colors = None
    if mesh.has_vertex_colors():
        c = (np.clip(np.asarray(mesh.vertex_colors), 0, 1) * 255).astype(np.uint8)
        colors = np.column_stack([c, np.full(len(c), 255, dtype=np.uint8)])
    trimesh.Trimesh(vertices=v, faces=f, vertex_colors=colors, process=False).export(str(out))
    lo, hi = v.min(axis=0), v.max(axis=0)
    return {
        "method": "tsdf", "depth_frames": len(records), "pose_frames": len(frames), "frames_integrated": integrated,
        "voxel_m": voxel, "faces_raw": int(faces_raw), "vertices": int(len(v)), "faces": int(len(f)),
        "colour": bool(has_rgb), "bounds_min": lo.round(3).tolist(), "bounds_max": hi.round(3).tolist(),
        "floor_y_estimate": round(float(np.percentile(v[:, 1], 1.0)), 3),
        "bytes": out.stat().st_size, "seconds": round(time.time() - t0, 1),
    }


def selftest(tmp: Path) -> int:
    """Synthetic room: a wall 2 m in front of the camera, seen from 6 poses along a 1 m slide.
    Proves the stream parser, pose convention, integration and GLB export without a phone."""
    W, H = 256, 192
    fx = fy = 200.0 * W / 256.0; cx, cy = W / 2.0, H / 2.0
    depth = np.full((H, W), 2000, np.uint16)   # 2 m flat wall
    conf = np.full((H, W), 2, np.uint8)
    stream = tmp / "lidar_depth.s360depth"; poses = tmp / "lidar_poses.json"
    frames = []
    with stream.open("wb") as fh:
        fh.write(MAGIC)
        for i in range(6):
            ts = 1000.0 + i * 0.5
            fh.write(struct.pack(RECORD_HEADER, ts, W, H, depth.nbytes, conf.nbytes, 0))
            fh.write(depth.tobytes()); fh.write(conf.tobytes())
            c2w = np.eye(4); c2w[0, 3] = i * 0.2   # slide along +X, looking down −Z (ARKit)
            frames.append({"timestamp": ts, "transform_4x4": c2w.flatten(order="F").tolist(),
                           "intrinsics": {"fx": fx * 7.5, "fy": fy * 7.5, "cx": cx * 7.5, "cy": cy * 7.5},
                           "w": W * 7.5, "h": H * 7.5})
    poses.write_text(json.dumps({"version": 6, "frames": frames}))
    rep = build(stream, poses, tmp / "selftest.glb", 0.02, 0.06, 200000, 1, log=lambda *_: None)
    ok = rep["faces"] > 100 and abs(rep["bounds_min"][2] + 2.0) < 0.1 and abs(rep["bounds_max"][2] + 2.0) < 0.1
    print("RESULT selftest " + json.dumps({"ok": ok, **rep}))
    return 0 if ok else 1


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--depth"); ap.add_argument("--poses"); ap.add_argument("--out")
    ap.add_argument("--voxel", type=float, default=VOXEL_M)
    ap.add_argument("--trunc", type=float, default=SDF_TRUNC_M)
    ap.add_argument("--max-faces", type=int, default=400_000)
    ap.add_argument("--min-confidence", type=int, default=MIN_CONFIDENCE)
    ap.add_argument("--report", default="")
    ap.add_argument("--selftest", action="store_true")
    a = ap.parse_args()
    if a.selftest:
        import tempfile
        with tempfile.TemporaryDirectory() as d:
            return selftest(Path(d))
    if not (a.depth and a.poses and a.out):
        ap.error("--depth, --poses and --out are required")
    try:
        rep = build(Path(a.depth), Path(a.poses), Path(a.out), a.voxel, a.trunc, a.max_faces, a.min_confidence)
    except Exception as e:  # noqa: BLE001
        print(json.dumps({"error": str(e)}))
        return 4
    if a.report:
        Path(a.report).write_text(json.dumps(rep, indent=2))
    print("RESULT mesh " + json.dumps(rep))
    return 0


if __name__ == "__main__":
    sys.exit(main())
