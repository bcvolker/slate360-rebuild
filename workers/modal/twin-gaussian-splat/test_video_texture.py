"""Tests for M7-C video texturing. numpy only — no ffmpeg or Open3D needed."""

from __future__ import annotations

import numpy as np
import pytest

from video_texture import (
    MAX_BRACKET_GAP_S,
    MAX_BRACKET_ROTATION_DEG,
    MAX_BRACKET_TRANSLATION_M,
    build_video_frames,
    clip_start_times,
    interpolate_pose,
    slerp_rotation,
)


def _rot_y(deg: float) -> np.ndarray:
    r = np.deg2rad(deg)
    c, s = np.cos(r), np.sin(r)
    return np.array([[c, 0, s], [0, 1, 0], [-s, 0, c]])


def _frame(t: float, x: float, yaw_deg: float, clip: int = 1) -> dict:
    m = np.eye(4)
    m[:3, :3] = _rot_y(yaw_deg)
    m[:3, 3] = [x, 1.5, 0.0]
    return {
        "timestamp": t,
        "clip_index": clip,
        "transform_4x4": [float(v) for v in m.reshape(16, order="F")],
        "intrinsics": {"fx": 1400.0, "fy": 1400.0, "cx": 960.0, "cy": 720.0},
    }


# --- slerp -----------------------------------------------------------------


def test_slerp_returns_the_endpoints():
    a, b = _rot_y(0.0), _rot_y(80.0)
    assert slerp_rotation(a, b, 0.0) == pytest.approx(a, abs=1e-9)
    assert slerp_rotation(a, b, 1.0) == pytest.approx(b, abs=1e-9)


def test_slerp_halfway_is_the_halfway_rotation():
    got = slerp_rotation(_rot_y(0.0), _rot_y(80.0), 0.5)
    assert got == pytest.approx(_rot_y(40.0), abs=1e-9)


def test_slerp_output_is_always_a_real_rotation():
    """The reason slerp is used at all. A component-wise blend of two rotation
    matrices is not orthonormal — it scales and shears, and a camera built from
    it samples the wrong pixels while every downstream number looks fine."""
    a, b = _rot_y(0.0), _rot_y(120.0)
    for t in (0.1, 0.25, 0.5, 0.75, 0.9):
        r = slerp_rotation(a, b, t)
        assert r @ r.T == pytest.approx(np.eye(3), abs=1e-9)
        assert float(np.linalg.det(r)) == pytest.approx(1.0, abs=1e-9)

    # A naive linear blend fails exactly this.
    naive = a * 0.5 + b * 0.5
    assert not np.allclose(naive @ naive.T, np.eye(3), atol=1e-6)


def test_slerp_takes_the_short_way_round():
    got = slerp_rotation(_rot_y(170.0), _rot_y(-170.0), 0.5)
    assert abs(abs(float(np.arctan2(got[0, 2], got[0, 0]))) - np.pi) < 0.1


# --- pose interpolation ----------------------------------------------------


# Small, realistic steps: 5 cm and 5 degrees per keyframe, inside the gate.
FRAMES = [_frame(100.0, 0.00, 0.0), _frame(100.2, 0.05, 5.0), _frame(100.4, 0.10, 10.0)]


def test_interpolates_position_linearly():
    out = interpolate_pose(FRAMES, 100.1)
    assert out is not None
    m = np.array(out[0]).reshape((4, 4), order="F")
    assert m[0, 3] == pytest.approx(0.025, abs=1e-6)
    assert m[1, 3] == pytest.approx(1.5, abs=1e-6)


def test_interpolates_rotation_by_slerp():
    out = interpolate_pose(FRAMES, 100.1)
    m = np.array(out[0]).reshape((4, 4), order="F")
    assert m[:3, :3] == pytest.approx(_rot_y(2.5), abs=1e-6)


def test_returns_a_valid_transform_at_an_exact_keyframe():
    out = interpolate_pose(FRAMES, 100.2)
    m = np.array(out[0]).reshape((4, 4), order="F")
    assert m[0, 3] == pytest.approx(0.05, abs=1e-6)


def test_outside_the_range_is_none():
    assert interpolate_pose(FRAMES, 99.0) is None
    assert interpolate_pose(FRAMES, 101.0) is None


def test_a_bracket_the_camera_travelled_far_across_is_refused():
    """The straight line between two distant keyframes is not the path the
    camera took, and a frame posed on that line paints the wrong surface."""
    far = [_frame(100.0, 0.0, 0.0), _frame(100.1, MAX_BRACKET_TRANSLATION_M + 0.1, 0.0)]
    assert interpolate_pose(far, 100.05) is None


def test_a_bracket_the_camera_turned_far_across_is_refused():
    spun = [_frame(100.0, 0.0, 0.0), _frame(100.1, 0.0, MAX_BRACKET_ROTATION_DEG + 10.0)]
    assert interpolate_pose(spun, 100.05) is None


def test_a_long_pause_the_camera_sat_still_through_is_ACCEPTED():
    """The gate is motion, not time. Measured on the 2026-08-25 kitchen, a time
    gate threw away frames from the stillest, safest stretches of the walk."""
    still = [_frame(100.0, 0.0, 0.0), _frame(102.0, 0.02, 1.0)]
    assert interpolate_pose(still, 101.0) is not None


def test_a_bracket_just_inside_both_motion_limits_is_accepted():
    ok = [_frame(100.0, 0.0, 0.0),
          _frame(100.4, MAX_BRACKET_TRANSLATION_M - 0.01, MAX_BRACKET_ROTATION_DEG - 1.0)]
    assert interpolate_pose(ok, 100.2) is not None


def test_an_absurd_time_span_is_still_refused():
    """Motion is the real gate, but a bracket spanning a pause this long means
    the clip timing itself is suspect."""
    stale = [_frame(100.0, 0.0, 0.0), _frame(100.0 + MAX_BRACKET_GAP_S + 1.0, 0.01, 0.5)]
    assert interpolate_pose(stale, 100.5) is None


def test_too_few_frames_is_none():
    assert interpolate_pose([], 100.0) is None
    assert interpolate_pose([_frame(100.0, 0.0, 0.0)], 100.0) is None


def test_intrinsics_come_from_the_nearer_keyframe():
    out = interpolate_pose(FRAMES, 100.11)
    assert out[1]["fx"] == pytest.approx(1400.0)


# --- clip metadata ---------------------------------------------------------


def test_clip_start_times_read_from_metadata():
    poses = {
        "session_start_time": 1000.0,
        "clips": [
            {"index": 1, "video": "a.mp4", "start_time": 1000.0},
            {"index": 2, "video": "b.mp4", "start_time": 1140.5},
        ],
    }
    assert clip_start_times(poses) == {1: 1000.0, 2: 1140.5}


def test_a_clip_without_its_own_start_falls_back_to_the_session():
    poses = {"session_start_time": 1000.0, "clips": [{"index": 3, "video": "c.mp4"}]}
    assert clip_start_times(poses)[3] == pytest.approx(1000.0)


def test_malformed_clip_entries_are_skipped_not_fatal():
    poses = {"session_start_time": 1000.0,
             "clips": [{"index": 1, "start_time": 1000.0}, "nonsense", {"no_index": True}]}
    assert clip_start_times(poses) == {1: 1000.0}


# --- orchestration ---------------------------------------------------------


def test_unknown_clip_skips_rather_than_raising(tmp_path):
    frames, stats = build_video_frames(tmp_path / "nope.mp4", 9, {"clips": []}, tmp_path)
    assert frames == []
    assert stats["skipped"] == "no_clip_start_time"


def test_a_clip_with_too_few_keyframes_skips(tmp_path):
    poses = {"session_start_time": 100.0,
             "clips": [{"index": 1, "start_time": 100.0}],
             "frames": [_frame(100.0, 0.0, 0.0)]}
    frames, stats = build_video_frames(tmp_path / "a.mp4", 1, poses, tmp_path)
    assert frames == []
    assert stats["skipped"] == "too_few_keyframes_for_clip"


def test_a_missing_video_reports_decode_failure(tmp_path):
    poses = {"session_start_time": 100.0,
             "clips": [{"index": 1, "start_time": 100.0}],
             "frames": FRAMES}
    frames, stats = build_video_frames(tmp_path / "absent.mp4", 1, poses, tmp_path)
    assert frames == []
    assert stats["skipped"] == "decode_failed"


def test_only_the_requested_clips_keyframes_are_used():
    """Interpolating across a clip boundary spans a gap where the operator was
    not recording, and the camera did not travel the straight line between."""
    mixed = FRAMES + [_frame(200.0, 50.0, 0.0, clip=2), _frame(200.2, 50.05, 0.0, clip=2)]
    clip1 = sorted((f for f in mixed if f["clip_index"] == 1), key=lambda f: f["timestamp"])
    assert len(clip1) == 3
    assert interpolate_pose(clip1, 150.0) is None
