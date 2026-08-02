"""Emit cameras.json sidecar for the Photo Explorer viewer.

Reads a COLMAP sparse reconstruction (via pycolmap) and writes a JSON array of
per-photo camera poses in MODEL coordinates — the same frame the GLB lives in,
since both derive from the same sparse reconstruction. The viewer projects these
into instanced frustum markers; clicking one opens the original source photo
from R2.

Coordinate convention:
  - position: camera center in world (model) coordinates = -R_w2c^T * t.
  - rotation: camera-to-world quaternion [w,x,y,z], so a frustum mesh oriented
    along its local -Z axis points where the camera looked.
  - registered: false when the source image was not in the reconstruction
    (no pose); position/rotation are omitted in that case.

Source images are renamed to ``source_{NNNN}.<ext>`` by ``_download_sources``,
so the COLMAP image name maps deterministically back to the sourceKeys index
and thence to the newAssetIds entry the viewer needs to fetch the photo.
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any


def _quat_to_rotation(qvec: tuple[float, float, float, float]) -> list[list[float]]:
    qw, qx, qy, qz = qvec
    return [
        [1 - 2 * (qy * qy + qz * qz), 2 * (qx * qy - qw * qz), 2 * (qx * qz + qw * qy)],
        [2 * (qx * qy + qw * qz), 1 - 2 * (qx * qx + qz * qz), 2 * (qy * qz - qw * qx)],
        [2 * (qx * qz - qw * qy), 2 * (qy * qz + qw * qx), 1 - 2 * (qx * qx + qy * qy)],
    ]


def _rotation_to_quat(R: list[list[float]]) -> list[float]:
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
    return [qw, qx, qy, qz]


def _normalize_quat(q: list[float]) -> list[float]:
    n = sum(c * c for c in q) ** 0.5
    if n == 0:
        return [1.0, 0.0, 0.0, 0.0]
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

    by_index: dict[int, dict[str, Any]] = {}
    registered_count = 0
    for image in reconstruction.images.values():
        idx = name_to_index.get(image.name)
        if idx is None:
            continue
        asset_id = new_asset_ids[idx] if idx < len(new_asset_ids) else None
        filename = Path(source_keys[idx]).name
        qvec = _normalize_quat([float(x) for x in image.qvec])
        tvec = [float(x) for x in image.tvec]
        R_w2c = _quat_to_rotation((qvec[0], qvec[1], qvec[2], qvec[3]))
        # Camera center in world: -R_w2c^T * t
        pos = [
            -(R_w2c[0][0] * tvec[0] + R_w2c[1][0] * tvec[1] + R_w2c[2][0] * tvec[2]),
            -(R_w2c[0][1] * tvec[0] + R_w2c[1][1] * tvec[1] + R_w2c[2][1] * tvec[2]),
            -(R_w2c[0][2] * tvec[0] + R_w2c[1][2] * tvec[1] + R_w2c[2][2] * tvec[2]),
        ]
        # Camera-to-world rotation = R_w2c^T
        R_c2w = [[R_w2c[j][i] for j in range(3)] for i in range(3)]
        q_c2w = _normalize_quat(_rotation_to_quat(R_c2w))
        cam = reconstruction.cameras.get(image.camera_id)
        by_index[idx] = {
            "assetId": asset_id,
            "filename": filename,
            "registered": True,
            "position": pos,
            "rotation": q_c2w,
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
