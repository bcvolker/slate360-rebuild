"""Unit tests for Photo Explorer cameras.json builders."""

from __future__ import annotations

import json
import math
from pathlib import Path

import numpy as np

from cameras_export import (
    build_cameras_from_transforms,
    quat_from_matrix,
    transform_pose_to_model,
)


def test_quat_identity():
    q = quat_from_matrix(np.eye(3))
    assert abs(q[3] - 1.0) < 1e-9
    assert all(abs(v) < 1e-9 for v in q[:3])


def test_transform_pose_matches_initial_camera_pipeline():
    pos = np.array([2.0, 4.0, 6.0])
    rot = np.eye(3)
    crop = np.array([1.0, 1.0, 1.0])
    out_pos, out_quat = transform_pose_to_model(
        pos, rot, crop_center=crop, scale_factor=2.0, flip=np.array([1.0, -1.0, -1.0])
    )
    assert out_pos == [2.0, -6.0, -10.0]
    assert abs(out_quat[3] - 1.0) < 1e-9


def test_build_cameras_from_transforms(tmp_path: Path):
    transforms = {
        "frames": [
            {
                "file_path": "images/frame_00001.jpg",
                "transform_matrix": [
                    [1, 0, 0, 1.0],
                    [0, 1, 0, 2.0],
                    [0, 0, 1, 3.0],
                    [0, 0, 0, 1.0],
                ],
            }
        ]
    }
    path = tmp_path / "transforms.json"
    path.write_text(json.dumps(transforms), encoding="utf-8")

    payload = build_cameras_from_transforms(
        path,
        frame_index_to_original={"frame_00001.jpg": "source_0000.jpg"},
        source_keys=["orgs/o/digital-twin/s/c/123_DSC0001.JPG"],
        new_asset_ids=["asset-aaa"],
        crop_center=[0, 0, 0],
        scale_factor=1.0,
        apply_viewer_flip=True,
    )
    assert payload["cameraCount"] == 1
    cam = payload["cameras"][0]
    assert cam["assetId"] == "asset-aaa"
    assert cam["filename"] == "123_DSC0001.JPG"
    assert cam["registered"] is True
    assert cam["position"] == [1.0, -2.0, -3.0]
    assert len(cam["rotation"]) == 4
    assert math.isclose(sum(v * v for v in cam["rotation"]), 1.0, rel_tol=1e-6)


def test_build_cameras_joins_materialized_still_to_asset(tmp_path: Path):
    transforms = {
        "frames": [
            {
                "file_path": "images/123_IMG_0001_0000.jpg",
                "transform_matrix": [
                    [1, 0, 0, 0.0],
                    [0, 1, 0, 0.0],
                    [0, 0, 1, 0.0],
                    [0, 0, 0, 1.0],
                ],
            }
        ]
    }
    path = tmp_path / "transforms.json"
    path.write_text(json.dumps(transforms), encoding="utf-8")

    payload = build_cameras_from_transforms(
        path,
        frame_index_to_original=None,
        source_keys=["orgs/o/digital-twin/s/c/123_IMG_0001.HEIC"],
        new_asset_ids=["asset-still"],
    )

    assert payload["cameras"][0]["assetId"] == "asset-still"
    assert payload["cameras"][0]["filename"] == "123_IMG_0001.HEIC"
