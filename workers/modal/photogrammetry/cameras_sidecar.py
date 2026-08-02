"""Emit cameras.json sidecar for the Photo Explorer viewer.

Reads a COLMAP sparse reconstruction (via pycolmap 4.x) and writes a JSON array
of per-photo camera poses in MODEL coordinates — the same frame the GLB lives
in. Unregistered sources are listed with registered=false.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any


def _rotation_to_quat(R: list[list[float]]) -> list[float]:
    """3x3 → quaternion [x, y, z, w] (three.js order)."""
    r00, r01, r02 = R[0]
    r10, r11, r12 = R[1]
    r20, r21, r22 = R[2]
    trace = r00 + r11 + r22
    if trace > 0:
        s = 0.5 / (trace + 1.0) ** 0.5
        qw = 0.25 / s
        qx = (r21 - r12) * s
        qy = (r02 - r20) * s
        qz = (r10 - r01) * s
    elif r00 > r11 and r00 > r22:
        s = 2.0 * (1.0 + r00 - r11 - r22) ** 0.5
        qw = (r21 - r12) / s
        qx = 0.25 * s
        qy = (r01 + r10) / s
        qz = (r02 + r20) / s
    elif r11 > r22:
        s = 2.0 * (1.0 + r11 - r00 - r22) ** 0.5
        qw = (r02 - r20) / s
        qx = (r01 + r10) / s
        qy = 0.25 * s
        qz = (r12 + r21) / s
    else:
        s = 2.0 * (1.0 + r22 - r00 - r11) ** 0.5
        qw = (r10 - r01) / s
        qx = (r02 + r20) / s
        qy = (r12 + r21) / s
        qz = 0.25 * s
    return _normalize_quat([qx, qy, qz, qw])


def _normalize_quat(q: list[float]) -> list[float]:
    n = sum(c * c for c in q) ** 0.5
    if n == 0:
        return [0.0, 0.0, 0.0, 1.0]
    return [c / n for c in q]


def _source_name(index: int, source_keys: list[str]) -> str:
    suffix = Path(source_keys[index]).suffix.lower() or ".jpg"
    return f"source_{index:04d}{suffix}"


def emit_cameras_sidecar(
    sparse_model_dir: Path,
    source_keys: list[str],
    new_asset_ids: list[str],
    out_path: Path,
) -> dict[str, Any]:
    """Write cameras.json. Returns a small metrics dict for QC."""
    import pycolmap

    reconstruction = pycolmap.Reconstruction(str(sparse_model_dir))
    name_to_index = {_source_name(i, source_keys): i for i in range(len(source_keys))}
    # jpeg/jpg alias
    for name, idx in list(name_to_index.items()):
        stem = Path(name).stem
        for alt in (f"{stem}.jpg", f"{stem}.jpeg", f"{stem}.JPG", f"{stem}.JPEG"):
            name_to_index.setdefault(alt, idx)

    by_index: dict[int, dict[str, Any]] = {}
    registered_count = 0
    for image in reconstruction.images.values():
        idx = name_to_index.get(image.name)
        if idx is None:
            idx = name_to_index.get(Path(image.name).name)
        if idx is None:
            continue
        asset_id = new_asset_ids[idx] if idx < len(new_asset_ids) else None
        filename = Path(source_keys[idx]).name
        world_from_cam = image.cam_from_world().inverse()
        R = world_from_cam.rotation.matrix()
        t = list(world_from_cam.translation)
        R_list = [
            [float(R[i, j] if hasattr(R, "shape") else R[i][j]) for j in range(3)]
            for i in range(3)
        ]
        pos = [float(t[0]), float(t[1]), float(t[2])]
        cam = reconstruction.cameras.get(image.camera_id)
        by_index[idx] = {
            "assetId": asset_id,
            "filename": filename,
            "registered": True,
            "position": pos,
            "rotation": _rotation_to_quat(R_list),
            "focal": float(cam.focal_length) if cam else None,
            "width": int(cam.width) if cam else None,
            "height": int(cam.height) if cam else None,
        }
        registered_count += 1

    cameras: list[dict[str, Any]] = []
    for idx in range(len(source_keys)):
        if idx in by_index:
            cameras.append(by_index[idx])
        else:
            cameras.append({
                "assetId": new_asset_ids[idx] if idx < len(new_asset_ids) else None,
                "filename": Path(source_keys[idx]).name,
                "registered": False,
            })

    out_path.write_text(json.dumps(cameras, separators=(",", ":")) + "\n", encoding="utf-8")
    return {
        "cameraCount": len(cameras),
        "registeredCameras": registered_count,
    }
