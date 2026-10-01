from pathlib import Path

import numpy as np
import pytest

from arkit_io import arkit_extrinsic, scale_intrinsics
from ingest import IngestError, inspect_preview_ply, validate_ingest
from test_helpers import pose_frame, write_depth_stream, write_matched_capture, write_poses


def test_bad_magic_fails(tmp_path: Path):
    depth = tmp_path / "d.s360depth"
    depth.write_bytes(b"NOTMAGIC00" + b"\x00" * 40)
    poses = tmp_path / "p.json"
    write_poses(poses, [pose_frame(1.0)])
    with pytest.raises(IngestError, match="magic"):
        validate_ingest(depth, poses)


def test_count_mismatch_fails(tmp_path: Path):
    depth, poses = write_matched_capture(tmp_path, n=3)
    write_poses(poses, [pose_frame(10.0), pose_frame(10.2)])
    with pytest.raises(IngestError, match="count mismatch"):
        validate_ingest(depth, poses)


def test_timestamp_mismatch_fails(tmp_path: Path):
    depth, poses = write_matched_capture(tmp_path, n=2)
    write_poses(poses, [pose_frame(10.0), pose_frame(99.0)])
    with pytest.raises(IngestError, match="timestamp mismatch"):
        validate_ingest(depth, poses)


def test_missing_intrinsics_fails(tmp_path: Path):
    depth, poses = write_matched_capture(tmp_path, n=1)
    frame = pose_frame(10.0)
    del frame["intrinsics"]
    write_poses(poses, [frame])
    with pytest.raises(IngestError, match="intrinsics"):
        validate_ingest(depth, poses)


def test_clip_id_mismatch_fails(tmp_path: Path):
    depth, poses = write_matched_capture(tmp_path, n=1)
    write_poses(poses, [pose_frame(10.0, clip_index=9)], clips=[{"index": 1}])
    with pytest.raises(IngestError, match="clip_index"):
        validate_ingest(depth, poses)


def test_valid_matched_ingest(tmp_path: Path):
    depth, poses = write_matched_capture(tmp_path, n=3)
    preview = tmp_path / "preview_point_cloud.ply"
    preview.write_text("ply\nformat ascii 1.0\nelement vertex 0\nend_header\n")
    result = validate_ingest(depth, poses, preview_ply=preview)
    assert result["ok"] is True
    assert result["depthFrames"] == 3
    assert result["poseFrames"] == 3
    assert result["preview"]["usedAsMaster"] is False
    assert result["processingMaster"] == [".s360depth", "lidar_poses.json"]
    assert result["mediumOrBetterPixels"] > 0


def test_preview_ply_is_never_master(tmp_path: Path):
    ply = tmp_path / "preview_point_cloud.ply"
    ply.write_bytes(b"not a reconstruction")
    info = inspect_preview_ply(ply)
    assert info["usedAsMaster"] is False
    assert info["role"] == "point_cloud_preview"


def test_scale_intrinsics_and_extrinsic_match_interior_mesh():
    fx, fy, cx, cy = scale_intrinsics(
        {"fx": 1500.0, "fy": 1500.0, "cx": 960.0, "cy": 720.0}, 1920, 1440, 256, 192
    )
    assert fx == pytest.approx(200.0)
    assert cx == pytest.approx(128.0)
    identity = np.eye(4).flatten(order="F").tolist()
    ext = arkit_extrinsic(identity)
    assert np.allclose(ext, np.diag([1.0, -1.0, -1.0, 1.0]))


def test_no_medium_confidence_fails(tmp_path: Path):
    from test_helpers import jpeg_bytes

    depth = tmp_path / "d.s360depth"
    depth_mm = np.full((6, 8), 1000, dtype="<u2")
    conf = np.zeros((6, 8), dtype=np.uint8)
    write_depth_stream(depth, [(10.0, depth_mm, conf, jpeg_bytes())])
    poses = tmp_path / "p.json"
    write_poses(poses, [pose_frame(10.0)])
    with pytest.raises(IngestError, match="confidence"):
        validate_ingest(depth, poses)
