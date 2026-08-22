"""M1-M3 tests — the pure parts of the TSDF path (no Open3D / GPU needed).

The coordinate conversion is the highest-risk piece: getting it wrong does not
raise, it silently produces a mirrored or inside-out room. It is tested against
hand-computed expectations rather than a golden file.
"""

import json
import struct

import numpy as np
import pytest

from interior_mesh import (
    MAGIC,
    arkit_extrinsic,
    iter_depth_records,
    load_pose_frames,
    pair_depth_to_poses,
    scale_intrinsics,
)


def _write_stream(path, records):
    with open(path, "wb") as fh:
        fh.write(MAGIC)
        for ts, w, h, depth, conf in records:
            fh.write(struct.pack("<dHHIII", ts, w, h, depth.nbytes, conf.nbytes, 0))
            fh.write(depth.tobytes())
            fh.write(conf.tobytes())


def test_depth_stream_roundtrip(tmp_path):
    p = tmp_path / "d.s360depth"
    d1 = np.arange(6, dtype="<u2").reshape(2, 3) * 100
    c1 = np.full((2, 3), 2, dtype=np.uint8)
    d2 = np.full((2, 3), 1500, dtype="<u2")
    c2 = np.zeros((2, 3), dtype=np.uint8)
    _write_stream(p, [(10.5, 3, 2, d1, c1), (10.6, 3, 2, d2, c2)])

    recs = list(iter_depth_records(p))
    assert len(recs) == 2
    assert recs[0]["timestamp"] == pytest.approx(10.5)
    assert recs[0]["width"] == 3 and recs[0]["height"] == 2
    assert np.array_equal(recs[0]["depth_mm"], d1)
    assert np.array_equal(recs[1]["confidence"], c2)
    assert recs[1]["index"] == 1


def test_bad_magic_rejected(tmp_path):
    p = tmp_path / "bad.s360depth"
    p.write_bytes(b"NOTMAGIC00" + b"\x00" * 40)
    with pytest.raises(ValueError, match="magic"):
        list(iter_depth_records(p))


def test_truncated_payload_rejected(tmp_path):
    p = tmp_path / "trunc.s360depth"
    with open(p, "wb") as fh:
        fh.write(MAGIC)
        fh.write(struct.pack("<dHHIII", 1.0, 4, 4, 32, 16, 0))
        fh.write(b"\x00" * 20)  # short
    with pytest.raises(ValueError):
        list(iter_depth_records(p))


def test_scale_intrinsics_to_depth_resolution():
    # ARKit reports at 1920x1440; depth is 256x192 — exactly 1/7.5.
    fx, fy, cx, cy = scale_intrinsics(
        {"fx": 1500.0, "fy": 1500.0, "cx": 960.0, "cy": 720.0}, 1920, 1440, 256, 192
    )
    assert fx == pytest.approx(200.0)
    assert fy == pytest.approx(200.0)
    assert cx == pytest.approx(128.0)   # must land at the depth image centre
    assert cy == pytest.approx(96.0)


def test_arkit_extrinsic_identity_camera():
    """A camera at the origin looking down -Z (ARKit rest pose) must produce an
    extrinsic that flips Y and Z into OpenCV convention and nothing else."""
    identity = np.eye(4).flatten(order="F").tolist()
    ext = arkit_extrinsic(identity)
    expected = np.diag([1.0, -1.0, -1.0, 1.0])
    assert np.allclose(ext, expected)


def test_arkit_extrinsic_translation_maps_world_point_in_front():
    """Camera 2 m up the +X axis, still looking down -Z. A world point 3 m in
    front of it (at x=2, z=-3) must land on the camera's +Z axis at depth 3."""
    cam = np.eye(4)
    cam[:3, 3] = [2.0, 0.0, 0.0]
    ext = arkit_extrinsic(cam.flatten(order="F").tolist())
    world = np.array([2.0, 0.0, -3.0, 1.0])
    cam_pt = ext @ world
    assert cam_pt[0] == pytest.approx(0.0, abs=1e-9)
    assert cam_pt[1] == pytest.approx(0.0, abs=1e-9)
    assert cam_pt[2] == pytest.approx(3.0, abs=1e-9)   # positive depth, not -3


def test_pair_by_index_when_counts_match():
    recs = [{"index": i, "timestamp": 100.0 + i} for i in range(4)]
    frames = [{"timestamp": 999.0} for _ in range(4)]   # timestamps deliberately wrong
    pairs = pair_depth_to_poses(recs, frames)
    assert len(pairs) == 4
    assert [r["index"] for r, _ in pairs] == [0, 1, 2, 3]


def test_pair_by_timestamp_drops_unmatched():
    recs = [{"index": 0, "timestamp": 10.0}, {"index": 1, "timestamp": 99.0}]
    frames = [{"timestamp": 10.02}, {"timestamp": 10.5}, {"timestamp": 11.0}]
    pairs = pair_depth_to_poses(recs, frames, tolerance_s=0.1)
    assert len(pairs) == 1           # the 99.0 record has no pose within tolerance
    assert pairs[0][0]["index"] == 0


def test_load_pose_frames_skips_malformed(tmp_path):
    p = tmp_path / "poses.json"
    p.write_text(json.dumps({"version": 6, "frames": [
        {"transform_4x4": list(range(16)), "timestamp": 1.0},
        {"timestamp": 2.0},                       # no transform
        {"transform_4x4": [1, 2, 3], "timestamp": 3.0},   # wrong length
    ]}))
    frames = load_pose_frames(p)
    assert len(frames) == 1
    assert frames[0]["timestamp"] == 1.0


if __name__ == "__main__":
    raise SystemExit(pytest.main([__file__, "-v"]))
