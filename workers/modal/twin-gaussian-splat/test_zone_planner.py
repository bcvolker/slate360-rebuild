"""Tests for M8 zone planning. numpy only — runs in a bare environment."""

from __future__ import annotations

import json

import pytest

from zone_planner import (
    MAX_DURATION_SECONDS,
    find_revisits,
    path_length,
    plan_zones,
    spatial_overlap,
    split_into_runs,
    zone_bounds,
)


def test_path_length_line_and_degenerate():
    assert path_length([[float(x), 0.0, 0.0] for x in range(11)]) == pytest.approx(10.0)
    assert path_length([[0.0, 0.0, 0.0]]) == 0.0
    assert path_length([]) == 0.0


def test_a_list_that_already_fits_is_one_run():
    runs = split_into_runs([{"position": [0, 0, 0]} for _ in range(100)], 100)
    assert len(runs) == 1
    assert runs[0]["overlap_prev"] == 0
    assert runs[0]["frame_count"] == 100


def test_every_frame_lands_in_at_least_one_run():
    poses = [{"position": [i * 0.1, 0, 0]} for i in range(5000)]
    runs = split_into_runs(poses, 1500, overlap_frames=60)
    covered: set[int] = set()
    for run in runs:
        assert run["frame_count"] <= 1500
        covered.update(range(run["start"], run["end"]))
        if run["index"] > 0:
            prev = runs[run["index"] - 1]
            shared = min(prev["end"], run["end"]) - max(prev["start"], run["start"])
            assert shared == 60
    assert covered == set(range(5000))


def test_runs_are_ordered_and_contiguous():
    poses = [{"position": [i * 0.1, 0, 0]} for i in range(5000)]
    runs = split_into_runs(poses, 1500, overlap_frames=60)
    for a, b in zip(runs, runs[1:]):
        assert b["start"] > a["start"]
        assert b["start"] < a["end"]  # they must actually overlap


def test_overlap_is_clamped_to_one_third():
    poses = [{"position": [0, 0, 0]} for _ in range(4000)]
    runs = split_into_runs(poses, 1500, overlap_frames=1000)
    assert runs[1]["overlap_prev"] == 500


def test_nonsense_max_frames_returns_one_covering_run():
    poses = [{"position": [0, 0, 0]} for _ in range(50)]
    runs = split_into_runs(poses, 0)
    assert len(runs) == 1
    assert runs[0]["frame_count"] == 50


def test_spatial_overlap_identical_disjoint_and_half():
    box = {"min": [0.0, 0.0, 0.0], "max": [2.0, 2.0, 2.0]}
    assert spatial_overlap(box, box) == pytest.approx(1.0)
    assert spatial_overlap(box, {"min": [5.0, 5.0, 5.0], "max": [6.0, 6.0, 6.0]}) == 0.0
    half = {"min": [1.0, 0.0, 0.0], "max": [3.0, 2.0, 2.0]}
    # inter = 1*2*2 = 4; va = vb = 8; iou = 4 / (8 + 8 - 4)
    assert spatial_overlap(box, half) == pytest.approx(4.0 / 12.0)


def test_two_degenerate_boxes_do_not_report_a_perfect_stitch():
    pt = {"min": [1.0, 1.0, 1.0], "max": [1.0, 1.0, 1.0]}
    assert spatial_overlap(pt, pt) == 0.0


def test_find_revisits_reports_the_crossing_and_skips_adjacent():
    z0 = {"index": 0, "bounds": {"min": [0.0, 0.0, 0.0], "max": [2.0, 1.0, 2.0]}}
    z1 = {"index": 1, "bounds": {"min": [1.5, 0.0, 1.5], "max": [3.5, 1.0, 3.5]}}
    z2 = {"index": 2, "bounds": {"min": [0.1, 0.0, 0.1], "max": [2.1, 1.0, 2.1]}}
    pairs = {(h["a"], h["b"]) for h in find_revisits([z0, z1, z2], min_overlap=0.15)}
    assert (0, 2) in pairs
    assert (0, 1) not in pairs
    assert (1, 2) not in pairs


def test_plan_zones_on_a_long_walk_is_ordered_capped_and_serialisable():
    poses = [{"position": [i * 0.05, 0.0, 0.0], "timestamp": float(i)} for i in range(6000)]
    result = plan_zones(poses, max_frames=1500, overlap_frames=60)
    assert result["zone_count"] > 1
    assert result["total_frames"] == 6000
    assert [z["start"] for z in result["zones"]] == sorted(z["start"] for z in result["zones"])
    for zone in result["zones"]:
        assert zone["estimated_seconds"] <= MAX_DURATION_SECONDS
    # Catches numpy scalars leaking into a payload that crosses the wire.
    json.dumps(result)


def test_plan_zones_warns_on_a_stationary_capture():
    result = plan_zones([{"position": [1.0, 0.0, 1.0]} for _ in range(80)], max_frames=1500)
    assert any("tiny_diagonal" in w for w in result["warnings"])
    assert result["zones"][0]["bounds"]["diagonal"] < 2.0


def test_plan_zones_empty_returns_one_zone_and_a_warning():
    result = plan_zones([])
    assert result["zone_count"] == 1
    assert result["warnings"]
    assert result["zones"][0]["frame_count"] == 0
    json.dumps(result)


def test_plan_zones_accepts_bare_triples_as_well_as_dicts():
    result = plan_zones([[i * 0.5, 0.0, 0.0] for i in range(40)])
    assert result["zones"][0]["bounds"]["diagonal"] > 2.0
    assert result["zones"][0]["path_length"] == pytest.approx(19.5)


def test_zone_bounds_empty():
    b = zone_bounds([])
    assert b["diagonal"] == 0.0
    assert b["min"] == [0.0, 0.0, 0.0]
