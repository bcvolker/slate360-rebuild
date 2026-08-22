"""M1-M3 — interior mesh from ARKit depth + poses (TSDF), not photogrammetry.

Why this exists: the SfM path collapsed a 13.71 m kitchen into a 3.23 m fragment
because COLMAP's frame-to-frame feature matching broke on motion blur and blank
drywall, and the mapper kept only the largest connected component. Three
independent audits reached the same conclusion — when metric depth exists, it
should BE the geometry, not something photogrammetry is asked to re-derive.

TSDF cannot fail that way. Every depth frame contributes its slice of the room
independently; there is no matching step to break. It also leaves honest holes
where nothing was measured (glass, beyond LiDAR range) instead of inventing
surface, which is the correct behaviour for a documentation deliverable.

Inputs, both already captured and uploaded by the iOS app:
  * `<sid>_depth.s360depth` — S360DEPTH1 stream, one record per keyframe:
    header `<dHHIII>` = (timestamp, width, height, depth_bytes, conf_bytes,
    rgb_bytes), then uint16 depth in millimetres, uint8 ARKit confidence,
    optional RGB.
  * `<sid>_poses.json` — v6 keyframes with `transform_4x4` (ARKit camera-to-world,
    column-major), `intrinsics` at RGB resolution, `w`/`h`, and timestamps.

Licence: Open3D (MIT) + numpy. No CGAL/GPL, no AGPL.
"""

from __future__ import annotations

import json
import struct
from pathlib import Path
from typing import Any, Iterator

MAGIC = b"S360DEPTH1"
RECORD_HEADER = "<dHHIII"
RECORD_HEADER_BYTES = 24

# iPhone LiDAR is specified to ~5 m; returns past that are noise, and integrating
# them smears the walls. Confidence 2 = ARKit "high", 1 = medium, 0 = low.
DEPTH_TRUNC_M = 5.0
MIN_DEPTH_M = 0.25
MIN_CONFIDENCE = 1
VOXEL_LENGTH_M = 0.012
SDF_TRUNC_M = 0.04
# Drop mesh islands smaller than this fraction of the largest component — stray
# blobs from a doorway glimpse or a mirror, never the room itself.
MIN_COMPONENT_FRACTION = 0.02


def iter_depth_records(path: str | Path) -> Iterator[dict[str, Any]]:
    """Yield each depth record. Depth stays as raw uint16 millimetres here so the
    caller decides on scaling; confidence is returned alongside for filtering."""
    import numpy as np

    file_path = Path(path)
    with file_path.open("rb") as handle:
        if handle.read(len(MAGIC)) != MAGIC:
            raise ValueError("Invalid S360 depth evidence magic")
        index = 0
        while True:
            header = handle.read(RECORD_HEADER_BYTES)
            if not header:
                return
            if len(header) != RECORD_HEADER_BYTES:
                raise ValueError("Truncated S360 depth record header")
            timestamp, width, height, depth_bytes, conf_bytes, rgb_bytes = struct.unpack(
                RECORD_HEADER, header
            )
            if width <= 0 or height <= 0 or depth_bytes != width * height * 2:
                raise ValueError("S360 depth record dimensions do not match payload")
            depth_raw = handle.read(depth_bytes)
            conf_raw = handle.read(conf_bytes)
            rgb_raw = handle.read(rgb_bytes) if rgb_bytes else b""
            if len(depth_raw) != depth_bytes or len(conf_raw) != conf_bytes:
                raise ValueError("Truncated S360 depth record payload")
            # The capture writes camera RGB alongside each depth frame, as
            # JPEG at CAMERA resolution (~1920x1440) — not raw bytes at depth
            # resolution. Kept encoded here; decoding every frame is the
            # caller's cost to pay only when it actually wants colour.
            yield {
                "index": index,
                "timestamp": float(timestamp),
                "width": int(width),
                "height": int(height),
                "depth_mm": np.frombuffer(depth_raw, dtype="<u2").reshape(height, width),
                "confidence": np.frombuffer(conf_raw, dtype=np.uint8).reshape(height, width),
                "rgb_jpeg": rgb_raw or None,
                "rgb_bytes": int(rgb_bytes),
            }
            index += 1


def decode_rgb_to_depth_grid(jpeg_bytes: bytes | None, width: int, height: int):
    """Decode a frame's JPEG and resample it to the depth grid.

    The capture stores colour at camera resolution while depth is 256x192, and
    Open3D's RGBD constructor requires both planes to be the same size. Nearest
    neighbour is deliberate: this colour is projected onto voxels, so a sharp
    but slightly aliased sample beats an interpolated one that bleeds a wall's
    colour onto the window beside it.

    Returns None when the payload is absent or undecodable — colour is a bonus,
    and a bad JPEG must never cost us the geometry.
    """
    if not jpeg_bytes:
        return None
    import io

    import numpy as np

    try:
        from PIL import Image

        with Image.open(io.BytesIO(jpeg_bytes)) as img:
            arr = np.asarray(img.convert("RGB"), dtype=np.uint8)
    except Exception:  # noqa: BLE001
        return None
    if arr.ndim != 3 or arr.shape[2] != 3 or arr.size == 0:
        return None
    src_h, src_w = arr.shape[:2]
    if (src_h, src_w) == (height, width):
        return np.ascontiguousarray(arr)
    rows = np.clip((np.arange(height) * src_h // height), 0, src_h - 1)
    cols = np.clip((np.arange(width) * src_w // width), 0, src_w - 1)
    return np.ascontiguousarray(arr[rows][:, cols])


def load_pose_frames(path: str | Path) -> list[dict[str, Any]]:
    """Keyframes that carry a usable 16-element transform, in file order."""
    data = json.loads(Path(path).read_text(encoding="utf-8"))
    frames = []
    for frame in data.get("frames", []):
        transform = frame.get("transform_4x4")
        if isinstance(transform, list) and len(transform) == 16:
            frames.append(frame)
    return frames


def scale_intrinsics(
    intrinsics: dict[str, float], rgb_w: int, rgb_h: int, depth_w: int, depth_h: int
) -> tuple[float, float, float, float]:
    """ARKit reports intrinsics at RGB resolution (~1920x1440) while the depth map
    is ~256x192. Unprojecting with unscaled intrinsics puts cx/cy far outside the
    depth image and skews the whole cloud."""
    if rgb_w <= 0 or rgb_h <= 0:
        raise ValueError("RGB resolution required to scale intrinsics")
    sx = depth_w / float(rgb_w)
    sy = depth_h / float(rgb_h)
    return (
        float(intrinsics["fx"]) * sx,
        float(intrinsics["fy"]) * sy,
        float(intrinsics["cx"]) * sx,
        float(intrinsics["cy"]) * sy,
    )


def arkit_extrinsic(transform_4x4: list[float]):
    """ARKit camera-to-world (column-major, Y-up, camera looks down -Z) into the
    world-to-camera OpenCV extrinsic Open3D integrates with (Y-down, +Z forward).

    Getting this wrong does not error — it silently produces a mirrored or
    inside-out room, so it is isolated here and unit-tested.
    """
    import numpy as np

    cam_to_world = np.array(transform_4x4, dtype=np.float64).reshape(4, 4, order="F")
    flip = np.eye(4)
    flip[1, 1] = -1.0
    flip[2, 2] = -1.0
    return np.linalg.inv(cam_to_world @ flip)


def pair_depth_to_poses(
    records: list[dict[str, Any]], frames: list[dict[str, Any]], tolerance_s: float = 0.12
) -> list[tuple[dict[str, Any], dict[str, Any]]]:
    """Pair each depth record with its pose.

    The app writes one depth record per keyframe from the same queue, so equal
    counts mean index pairing is exact. Otherwise fall back to nearest-timestamp
    within tolerance and DROP unmatched records rather than guessing — a wrong
    pose places real geometry in the wrong place, which is worse than a hole.
    """
    if not records or not frames:
        return []
    if len(records) == len(frames):
        return list(zip(records, frames))

    times = [float(f.get("timestamp") or 0.0) for f in frames]
    pairs = []
    for record in records:
        best_i, best_dt = None, None
        for i, t in enumerate(times):
            dt = abs(t - record["timestamp"])
            if best_dt is None or dt < best_dt:
                best_i, best_dt = i, dt
        if best_i is not None and best_dt is not None and best_dt <= tolerance_s:
            pairs.append((record, frames[best_i]))
    return pairs


def build_tsdf_mesh(
    depth_path: str | Path,
    poses_path: str | Path,
    out_path: str | Path,
    voxel_length: float = VOXEL_LENGTH_M,
    sdf_trunc: float = SDF_TRUNC_M,
    depth_trunc: float = DEPTH_TRUNC_M,
    min_confidence: int = MIN_CONFIDENCE,
) -> dict[str, Any]:
    """Integrate every posed depth frame into one volume and write a mesh.

    Returns stats including the mesh extent, which the caller compares against the
    LiDAR cloud — the same COVERAGE-1 check that catches a collapsed SfM applies
    here, and a TSDF that only saw part of the room must fail it too.
    """
    import numpy as np
    import open3d as o3d

    records = list(iter_depth_records(depth_path))
    frames = load_pose_frames(poses_path)
    pairs = pair_depth_to_poses(records, frames)
    stats: dict[str, Any] = {
        "depthRecords": len(records),
        "poseFrames": len(frames),
        "pairsIntegrated": 0,
        "pairsAvailable": len(pairs),
        "voxelLength": voxel_length,
        "sdfTrunc": sdf_trunc,
        "depthTrunc": depth_trunc,
        "minConfidence": min_confidence,
    }
    if not pairs:
        raise RuntimeError(
            f"No depth/pose pairs to integrate ({len(records)} depth records, "
            f"{len(frames)} pose frames)"
        )

    # Colour is integrated when the capture carried per-frame RGB. Without it
    # the mesh renders as bare grey geometry, which is exactly how every model
    # looked until the parser stopped discarding the RGB payload.
    has_rgb = any(r.get("rgb_jpeg") for r, _ in pairs)
    stats["colorIntegrated"] = bool(has_rgb)
    stats["rgbFramesAvailable"] = int(sum(1 for r, _ in pairs if r.get("rgb_jpeg")))
    stats["rgbFramesDecoded"] = 0
    volume = o3d.pipelines.integration.ScalableTSDFVolume(
        voxel_length=voxel_length,
        sdf_trunc=sdf_trunc,
        color_type=(
            o3d.pipelines.integration.TSDFVolumeColorType.RGB8
            if has_rgb
            else o3d.pipelines.integration.TSDFVolumeColorType.NoColor
        ),
    )

    for record, frame in pairs:
        depth_m = record["depth_mm"].astype(np.float32) / 1000.0
        # Confidence and range filtering BEFORE integration: zeros are ignored by
        # Open3D, so masking is how low-confidence returns are excluded.
        depth_m[record["confidence"] < min_confidence] = 0.0
        depth_m[(depth_m < MIN_DEPTH_M) | (depth_m > depth_trunc)] = 0.0
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
            stats["rgbFramesDecoded"] += 1
        color_image = (
            frame_rgb
            if frame_rgb is not None
            else np.zeros((record["height"], record["width"], 3), dtype=np.uint8)
        )
        rgbd = o3d.geometry.RGBDImage.create_from_color_and_depth(
            o3d.geometry.Image(color_image),
            o3d.geometry.Image(np.ascontiguousarray(depth_m)),
            depth_scale=1.0,
            depth_trunc=depth_trunc,
            convert_rgb_to_intensity=False,
        )
        volume.integrate(rgbd, intrinsic, arkit_extrinsic(frame["transform_4x4"]))
        stats["pairsIntegrated"] += 1

    mesh = volume.extract_triangle_mesh()
    mesh.compute_vertex_normals()
    stats["trianglesRaw"] = len(mesh.triangles)

    mesh = keep_largest_components(mesh, MIN_COMPONENT_FRACTION)
    stats["trianglesKept"] = len(mesh.triangles)
    if stats["trianglesKept"] == 0:
        raise RuntimeError("TSDF produced no surface — check depth/pose pairing")

    extent = mesh.get_axis_aligned_bounding_box().get_extent()
    stats["extent"] = [round(float(v), 3) for v in extent]
    stats["extentDiagonal"] = round(float(np.linalg.norm(extent)), 3)

    out = Path(out_path)
    o3d.io.write_triangle_mesh(str(out), mesh)
    stats["outPath"] = str(out)
    stats["fileSizeBytes"] = out.stat().st_size if out.exists() else 0
    return stats


def keep_largest_components(mesh, min_fraction: float = MIN_COMPONENT_FRACTION):
    """Drop stray islands — a glimpse through a doorway, a mirror reflection —
    while keeping every component that is a meaningful share of the room. Not
    'largest only': a real room can legitimately be two components when a wall
    occludes the connection."""
    import numpy as np

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
