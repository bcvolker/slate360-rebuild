"""Emit cameras.json sidecar for Twin Photo Explorer.

Per-camera poses in MODEL / viewer coordinates so the share viewer can place
frustum markers without re-solving COLMAP.
"""

from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

import numpy as np

SOURCE_INDEX_RE = re.compile(r"^source_(\d{4})\.", re.IGNORECASE)
FRAME_RE = re.compile(r"^frame_(\d+)\.", re.IGNORECASE)


def quat_from_matrix(rot: np.ndarray) -> list[float]:
    """Rotation matrix → quaternion [x, y, z, w]."""
    m = rot
    trace = float(m[0, 0] + m[1, 1] + m[2, 2])
    if trace > 0:
        s = 0.5 / np.sqrt(trace + 1.0)
        w = 0.25 / s
        x = (m[2, 1] - m[1, 2]) * s
        y = (m[0, 2] - m[2, 0]) * s
        z = (m[1, 0] - m[0, 1]) * s
    elif m[0, 0] > m[1, 1] and m[0, 0] > m[2, 2]:
        s = 2.0 * np.sqrt(1.0 + m[0, 0] - m[1, 1] - m[2, 2])
        w = (m[2, 1] - m[1, 2]) / s
        x = 0.25 * s
        y = (m[0, 1] + m[1, 0]) / s
        z = (m[0, 2] + m[2, 0]) / s
    elif m[1, 1] > m[2, 2]:
        s = 2.0 * np.sqrt(1.0 + m[1, 1] - m[0, 0] - m[2, 2])
        w = (m[0, 2] - m[2, 0]) / s
        x = (m[0, 1] + m[1, 0]) / s
        y = 0.25 * s
        z = (m[1, 2] + m[2, 1]) / s
    else:
        s = 2.0 * np.sqrt(1.0 + m[2, 2] - m[0, 0] - m[1, 1])
        w = (m[1, 0] - m[0, 1]) / s
        x = (m[0, 2] + m[2, 0]) / s
        y = (m[1, 2] + m[2, 1]) / s
        z = 0.25 * s
    q = np.array([x, y, z, w], dtype=np.float64)
    norm = float(np.linalg.norm(q))
    if norm <= 1e-12:
        return [0.0, 0.0, 0.0, 1.0]
    return (q / norm).tolist()


def asset_id_by_source_index(
    source_keys: list[str],
    new_asset_ids: list[str],
) -> dict[int, str]:
    out: dict[int, str] = {}
    for index, asset_id in enumerate(new_asset_ids):
        if index < len(source_keys) and asset_id:
            out[index] = str(asset_id)
    return out


def filename_for_source(source_keys: list[str], index: int) -> str:
    if 0 <= index < len(source_keys):
        return Path(source_keys[index]).name
    return f"source_{index:04d}"


def transform_pose_to_model(
    position: np.ndarray,
    rotation: np.ndarray,
    *,
    crop_center: np.ndarray | None,
    scale_factor: float,
    flip: np.ndarray | None,
) -> tuple[list[float], list[float]]:
    """Apply the same crop → scale → flip pipeline as initial_camera."""
    center = crop_center if crop_center is not None else np.zeros(3, dtype=np.float64)
    flip_vec = flip if flip is not None else np.ones(3, dtype=np.float64)
    pos = ((position - center) * float(scale_factor)) * flip_vec
    flip_mat = np.diag(flip_vec)
    rot = flip_mat @ rotation @ flip_mat
    return pos.tolist(), quat_from_matrix(rot)


def build_cameras_from_transforms(
    transforms_path: Path,
    *,
    frame_index_to_original: dict[str, str] | None,
    source_keys: list[str],
    new_asset_ids: list[str],
    crop_center: list[float] | None = None,
    scale_factor: float = 1.0,
    apply_viewer_flip: bool = True,
) -> dict[str, Any]:
    """Build cameras.json from Nerfstudio transforms.json (interior path)."""
    tdata = json.loads(transforms_path.read_text(encoding="utf-8"))
    frames = tdata.get("frames") or []
    index_map = asset_id_by_source_index(source_keys, new_asset_ids)
    rename = frame_index_to_original or {}
    center = np.array(crop_center or [0.0, 0.0, 0.0], dtype=np.float64)
    flip = np.array([1.0, -1.0, -1.0], dtype=np.float64) if apply_viewer_flip else np.ones(3)

    cameras: list[dict[str, Any]] = []
    for frame in frames:
        file_path = frame.get("file_path")
        matrix = frame.get("transform_matrix")
        if not file_path or not matrix:
            continue
        basename = Path(str(file_path)).name
        original = rename.get(basename, basename)
        source_index = _infer_source_index(original, basename, source_keys)
        asset_id = index_map.get(source_index) if source_index is not None else None
        if asset_id is None and len(new_asset_ids) == 1:
            asset_id = str(new_asset_ids[0])
        m = np.array(matrix, dtype=np.float64)
        pos, quat = transform_pose_to_model(
            m[:3, 3].copy(),
            m[:3, :3].copy(),
            crop_center=center,
            scale_factor=scale_factor,
            flip=flip,
        )
        cameras.append(
            {
                "assetId": asset_id,
                "filename": filename_for_source(source_keys, source_index)
                if source_index is not None
                else original,
                "position": [float(v) for v in pos],
                "rotation": [float(v) for v in quat],
                "registered": True,
            }
        )

    return {
        "version": 1,
        "coordinateSystem": "model",
        "cameraCount": len(cameras),
        "cameras": cameras,
    }


def build_cameras_from_colmap(
    reconstruction: Any,
    *,
    source_keys: list[str],
    new_asset_ids: list[str],
) -> dict[str, Any]:
    """Build cameras.json from a pycolmap Reconstruction (exterior path)."""
    index_map = asset_id_by_source_index(source_keys, new_asset_ids)
    cameras: list[dict[str, Any]] = []
    registered_names = {img.name for img in reconstruction.images.values()}

    for index, key in enumerate(source_keys):
        local_name = f"source_{index:04d}{Path(key).suffix.lower() or '.jpg'}"
        asset_id = index_map.get(index)
        filename = Path(key).name
        image = _find_image(reconstruction, local_name, registered_names)
        if image is None:
            cameras.append(
                {
                    "assetId": asset_id,
                    "filename": filename,
                    "position": [0.0, 0.0, 0.0],
                    "rotation": [0.0, 0.0, 0.0, 1.0],
                    "registered": False,
                }
            )
            continue
        world_from_cam = image.cam_from_world().inverse()
        R = np.array(world_from_cam.rotation.matrix(), dtype=np.float64)
        t = np.array(world_from_cam.translation, dtype=np.float64)
        cameras.append(
            {
                "assetId": asset_id,
                "filename": filename,
                "position": [float(v) for v in t],
                "rotation": quat_from_matrix(R),
                "registered": True,
            }
        )

    return {
        "version": 1,
        "coordinateSystem": "model",
        "cameraCount": len(cameras),
        "registeredCount": sum(1 for c in cameras if c["registered"]),
        "cameras": cameras,
    }


def write_cameras_json(path: Path, payload: dict[str, Any]) -> None:
    path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")


def _infer_source_index(
    original: str,
    basename: str,
    source_keys: list[str],
) -> int | None:
    for name in (original, basename):
        match = SOURCE_INDEX_RE.match(name)
        if match:
            return int(match.group(1))
        stem = Path(name).stem
        if stem.startswith("source_"):
            parts = stem.split("_")
            if len(parts) >= 2 and parts[1].isdigit():
                return int(parts[1])
        # materialize_images prefixes every prepared frame with the original
        # source stem and appends the source index, e.g. `IMG_0001_0000.jpg`.
        # This preserves the asset join for stills, video frames, and panorama
        # projections without putting database IDs into worker-local filenames.
        for index, key in enumerate(source_keys):
            source_stem = re.sub(r"[^a-zA-Z0-9._-]+", "_", Path(key).stem)[:80]
            prefix = f"{source_stem}_{index:04d}"
            if stem == prefix or stem.startswith(f"{prefix}_"):
                return index
    match = FRAME_RE.match(basename)
    if match:
        # frame_NNNNN is 1-indexed image order, not source index — leave unmapped
        return None
    return None


def _find_image(reconstruction: Any, local_name: str, registered_names: set[str]) -> Any | None:
    if local_name in registered_names:
        for image in reconstruction.images.values():
            if image.name == local_name:
                return image
    # Suffix-insensitive fallback (jpg/jpeg).
    stem = Path(local_name).stem
    for image in reconstruction.images.values():
        if Path(image.name).stem == stem:
            return image
    return None
