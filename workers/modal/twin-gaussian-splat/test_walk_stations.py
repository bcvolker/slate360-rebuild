"""Tests for M6b walk-station derivation. numpy only."""

from __future__ import annotations

import json

import numpy as np
import pytest

from walk_stations import (
    ASSUMED_CAMERA_HEIGHT_M,
    assign_floor,
    build_walk_stations,
    cluster_floors,
    floor_label,
    pose_position_and_heading,
)


def _transform(x: float, y: float, z: float, yaw: float = 0.0) -> list[float]:
    """ARKit camera-to-world, column-major, camera looking down its own -Z."""
    c, s = np.cos(yaw), np.sin(yaw)
    m = np.eye(4)
    m[:3, 0] = [c, 0, -s]
    m[:3, 1] = [0, 1, 0]
    m[:3, 2] = [s, 0, c]
    m[:3, 3] = [x, y, z]
    return [float(v) for v in m.flatten(order="F")]


def _write(tmp_path, frames):
    p = tmp_path / "poses.json"
    p.write_text(json.dumps({"frames": frames}), encoding="utf-8")
    return p


# --- pose maths ------------------------------------------------------------


def test_position_is_the_translation_column():
    pos, _ = pose_position_and_heading(_transform(1.5, 2.0, -3.0))
    assert pos == pytest.approx([1.5, 2.0, -3.0])


def test_heading_is_zero_looking_down_negative_z():
    _, yaw = pose_position_and_heading(_transform(0, 0, 0, yaw=0.0))
    assert yaw == pytest.approx(0.0, abs=1e-6)


def test_heading_follows_the_yaw_of_the_transform():
    for want in (0.5, -1.2, 2.0):
        _, got = pose_position_and_heading(_transform(0, 0, 0, yaw=want))
        assert got == pytest.approx(want, abs=1e-5)


def test_a_camera_pointed_straight_down_has_no_heading():
    m = np.eye(4)
    m[:3, 2] = [0, 1, 0]  # forward = -Y, straight down
    m[:3, 1] = [0, 0, 1]
    _, yaw = pose_position_and_heading([float(v) for v in m.flatten(order="F")])
    assert yaw == 0.0


# --- floor clustering ------------------------------------------------------


def test_a_single_storey_clusters_to_one_floor():
    assert cluster_floors([0.0, 0.05, -0.03, 0.02]) == pytest.approx([0.02], abs=0.05)


def test_two_storeys_three_metres_apart_cluster_separately():
    got = cluster_floors([0.0, 0.1, 3.0, 3.1])
    assert len(got) == 2
    assert got[0] == pytest.approx(0.05, abs=0.06)
    assert got[1] == pytest.approx(3.05, abs=0.06)


def test_a_countertop_one_metre_up_is_not_a_second_storey():
    assert len(cluster_floors([0.0, 0.05, 1.0, 1.05])) == 1


def test_cluster_uses_the_median_so_a_stairwell_smear_does_not_drag_it():
    # Many frames at 0.0, a few intermediate ones climbing away.
    vals = [0.0] * 20 + [0.3, 0.6, 0.9]
    assert cluster_floors(vals)[0] == pytest.approx(0.0, abs=0.02)


def test_empty_elevations_yield_no_floors():
    assert cluster_floors([]) == []


def test_assign_floor_picks_the_nearest_and_defaults_to_zero():
    assert assign_floor(0.1, [0.0, 3.2]) == 0
    assert assign_floor(3.0, [0.0, 3.2]) == 1
    assert assign_floor(5.0, []) == 0


def test_floor_labels():
    assert floor_label(0, 1) == "Ground"
    assert floor_label(0, 3) == "Ground"
    assert floor_label(1, 3) == "Level 2"


# --- station derivation ----------------------------------------------------


def test_stations_are_spaced_along_the_walk(tmp_path):
    # A 10 m straight walk sampled every 0.1 m -> ~7 stations at 1.5 m spacing.
    frames = [{"transform_4x4": _transform(i * 0.1, 1.5, 0.0)} for i in range(101)]
    got = build_walk_stations(_write(tmp_path, frames))
    assert got["skipped"] is None
    assert got["sourceFrames"] == 101
    xs = [s["position"][0] for s in got["stations"]]
    assert len(xs) == 7
    for a, b in zip(xs, xs[1:]):
        assert b - a >= 1.5 - 1e-6


def test_standing_still_produces_exactly_one_station(tmp_path):
    frames = [{"transform_4x4": _transform(0.0, 1.5, 0.0)} for _ in range(200)]
    got = build_walk_stations(_write(tmp_path, frames))
    assert len(got["stations"]) == 1


def test_raising_the_camera_in_place_is_not_a_new_station(tmp_path):
    """Spacing is horizontal. Lifting the camera is not a new place to stand."""
    frames = [{"transform_4x4": _transform(0.0, 1.0 + i * 0.05, 0.0)} for i in range(40)]
    got = build_walk_stations(_write(tmp_path, frames))
    assert len(got["stations"]) == 1


def test_photo_tagged_frames_always_become_stations(tmp_path):
    """The operator chose to shoot there, so imagery exists and the viewer must
    be able to stand there regardless of spacing."""
    frames = [{"transform_4x4": _transform(i * 0.1, 1.5, 0.0)} for i in range(10)]
    frames[3]["photo"] = True
    frames[5]["photo"] = True
    got = build_walk_stations(_write(tmp_path, frames))
    assert sum(1 for s in got["stations"] if s["isPhoto"]) == 2


def test_headings_are_carried_onto_the_stations(tmp_path):
    frames = [{"transform_4x4": _transform(i * 2.0, 1.5, 0.0, yaw=0.75)} for i in range(4)]
    got = build_walk_stations(_write(tmp_path, frames))
    assert all(s["headingY"] == pytest.approx(0.75, abs=1e-4) for s in got["stations"])


def test_two_storeys_are_split_and_labelled(tmp_path):
    ground = [{"transform_4x4": _transform(i * 2.0, 1.5, 0.0)} for i in range(4)]
    upper = [{"transform_4x4": _transform(i * 2.0, 4.7, 0.0)} for i in range(4)]
    got = build_walk_stations(_write(tmp_path, ground + upper))
    assert len(got["floors"]) == 2
    assert [f["label"] for f in got["floors"]] == ["Ground", "Level 2"]
    assert {s["floorIndex"] for s in got["stations"]} == {0, 1}


def test_supplied_ransac_floor_planes_are_used_verbatim(tmp_path):
    frames = [{"transform_4x4": _transform(i * 2.0, 1.5, 0.0)} for i in range(4)]
    got = build_walk_stations(_write(tmp_path, frames), floor_elevations=[-0.545])
    assert got["floors"][0]["elevationY"] == pytest.approx(-0.545)
    assert all(s["floorIndex"] == 0 for s in got["stations"])


def test_station_ids_are_stable_and_ordered(tmp_path):
    frames = [{"transform_4x4": _transform(i * 2.0, 1.5, 0.0)} for i in range(5)]
    ids = [s["id"] for s in build_walk_stations(_write(tmp_path, frames))["stations"]]
    assert ids == sorted(ids)
    assert ids[0] == "st0000"


def test_malformed_frames_are_skipped_not_fatal(tmp_path):
    frames = [
        {"transform_4x4": [1, 2, 3]},
        {"transform_4x4": _transform(0.0, 1.5, 0.0)},
        {"nope": True},
        {"transform_4x4": _transform(3.0, 1.5, 0.0)},
    ]
    got = build_walk_stations(_write(tmp_path, frames))
    assert got["skipped"] is None
    assert len(got["stations"]) == 2


def test_no_frames_reports_a_reason(tmp_path):
    got = build_walk_stations(_write(tmp_path, []))
    assert got["skipped"] == "no_pose_frames"
    assert got["stations"] == []


def test_a_missing_file_does_not_raise(tmp_path):
    got = build_walk_stations(tmp_path / "absent.json")
    assert got["skipped"] is not None
    assert got["stations"] == []


def test_output_is_json_serialisable(tmp_path):
    frames = [{"transform_4x4": _transform(i * 2.0, 1.5, 0.0)} for i in range(4)]
    json.dumps(build_walk_stations(_write(tmp_path, frames)))


def test_assumed_camera_height_is_used_for_floor_inference(tmp_path):
    frames = [{"transform_4x4": _transform(i * 2.0, ASSUMED_CAMERA_HEIGHT_M, 0.0)} for i in range(4)]
    got = build_walk_stations(_write(tmp_path, frames))
    assert got["floors"][0]["elevationY"] == pytest.approx(0.0, abs=0.01)
