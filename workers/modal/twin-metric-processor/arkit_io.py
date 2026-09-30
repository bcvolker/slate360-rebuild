"""ARKit depth/pose IO used by Route C and the production interior TSDF path.

Kept local so the metric worker is deployable without importing the Gaussian
splat worker. Formulas match workers/modal/twin-gaussian-splat/interior_mesh.py.
"""

from __future__ import annotations

import json
import struct
from pathlib import Path
from typing import Any, Iterator

MAGIC = b"S360DEPTH1"
RECORD_HEADER = "<dHHIII"
RECORD_HEADER_BYTES = 24


def iter_depth_records(path: str | Path) -> Iterator[dict[str, Any]]:
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


def load_poses_document(path: str | Path) -> dict[str, Any]:
    return json.loads(Path(path).read_text(encoding="utf-8"))


def load_pose_frames(path: str | Path) -> list[dict[str, Any]]:
    data = load_poses_document(path)
    frames = []
    for frame in data.get("frames", []):
        transform = frame.get("transform_4x4")
        if isinstance(transform, list) and len(transform) == 16:
            frames.append(frame)
    return frames


def scale_intrinsics(
    intrinsics: dict[str, float], rgb_w: int, rgb_h: int, depth_w: int, depth_h: int
) -> tuple[float, float, float, float]:
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


def colmajor_c2w(transform_4x4: list[float]):
    import numpy as np

    return np.array(transform_4x4, dtype=np.float64).reshape(4, 4, order="F")


def arkit_extrinsic(transform_4x4: list[float]):
    """ARKit c2w (column-major, Y-up, looks -Z) -> OpenCV w2c for Open3D."""
    import numpy as np

    cam_to_world = colmajor_c2w(transform_4x4)
    flip = np.eye(4)
    flip[1, 1] = -1.0
    flip[2, 2] = -1.0
    return np.linalg.inv(cam_to_world @ flip)


def pair_depth_to_poses(
    records: list[dict[str, Any]], frames: list[dict[str, Any]], tolerance_s: float = 0.12
) -> list[tuple[dict[str, Any], dict[str, Any]]]:
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
