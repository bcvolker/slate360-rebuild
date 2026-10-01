from pathlib import Path

import numpy as np

from dense_cloud import build_dense_cloud, unproject_frame
from test_helpers import pose_frame, write_matched_capture


def test_unproject_identity_camera_center_pixel():
    depth = np.full((6, 8), 1000, dtype="<u2")
    conf = np.full((6, 8), 1, dtype=np.uint8)
    record = {
        "width": 8,
        "height": 6,
        "depth_mm": depth,
        "confidence": conf,
        "rgb_jpeg": None,
    }
    frame = pose_frame(0.0)
    xyz, rgb = unproject_frame(record, frame)
    assert xyz.shape[0] == 8 * 6
    assert xyz.shape[0] != 500_000
    # Center-ish pixel (cx=4, cy=3 at depth res: RGB 80x60 -> scale 0.1, cx=4, cy=3)
    # Point at col=4,row=3, d=1: xc=0, yc=0, zc=-1
    assert xyz[:, 2].max() <= 0.05
    assert np.allclose(xyz.mean(axis=0)[2], -1.0, atol=0.15)


def test_dense_cloud_has_no_500k_cap(tmp_path: Path):
    depth, poses = write_matched_capture(tmp_path, n=3)
    result = build_dense_cloud(depth, poses, tmp_path / "master.ply")
    assert result["noPointCap"] is True
    assert result["points"] == 3 * 8 * 6
    assert Path(result["outPly"]).is_file()
    assert result["aabb"]["extent"][1] >= 0


def test_range_and_confidence_filters(tmp_path: Path):
    depth, poses = write_matched_capture(tmp_path, n=1, depth_mm=7000)
    far = build_dense_cloud(depth, poses, min_d=0.25, max_d=5.0)
    assert far["points"] == 0
    eng = build_dense_cloud(depth, poses, min_d=0.25, max_d=8.0)
    assert eng["points"] == 8 * 6
