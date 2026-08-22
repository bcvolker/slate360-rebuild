"""Tests for the M3 interior track orchestrator.

The value here is the failure paths: this module's whole contract is that it
never raises and always explains itself, because a missing mesh must not fail a
job that would otherwise produce a good splat.
"""

from __future__ import annotations

import pytest

from interior_track import (
    COVERAGE_MIN_EXTENT_RATIO,
    evaluate_mesh_coverage,
    run_interior_track,
    summarize_for_callback,
)


# --- coverage gate ---------------------------------------------------------


def test_coverage_passes_when_the_mesh_spans_the_room():
    got = evaluate_mesh_coverage(11.0, 13.71)
    assert got["gate"] == "pass"
    assert got["ratio"] == pytest.approx(0.8023, abs=1e-3)


def test_coverage_fails_the_measured_kitchen_collapse():
    # The real numbers that triggered the architecture change: a 3.23 m model
    # of a room the LiDAR measured at 13.71 m.
    got = evaluate_mesh_coverage(3.23, 13.71)
    assert got["gate"] == "fail"
    assert got["ratio"] == pytest.approx(0.2356, abs=1e-3)


def test_coverage_boundary_is_inclusive():
    diag = 13.71 * COVERAGE_MIN_EXTENT_RATIO
    assert evaluate_mesh_coverage(diag, 13.71)["gate"] == "pass"
    assert evaluate_mesh_coverage(diag * 0.999, 13.71)["gate"] == "fail"


def test_coverage_without_a_reference_is_unavailable_not_a_pass():
    for mesh_d, ref_d in ((10.0, None), (None, 13.71), (10.0, 0.0), (None, None)):
        got = evaluate_mesh_coverage(mesh_d, ref_d)
        assert got["gate"] == "coverage_unavailable"
        assert got["ratio"] is None


# --- orchestrator failure paths -------------------------------------------


def test_missing_inputs_skip_rather_than_raise(tmp_path):
    stats = run_interior_track(
        tmp_path / "nope.s360depth", tmp_path / "nope.json", tmp_path / "out"
    )
    assert stats["skipped"] == "missing_depth_or_poses"
    assert stats.get("gate") is None


def test_unparseable_depth_reports_the_failure_and_returns(tmp_path):
    pytest.importorskip("open3d")
    depth = tmp_path / "bad.s360depth"
    depth.write_bytes(b"NOTAHEADER" * 4)
    poses = tmp_path / "poses.json"
    poses.write_text('{"frames": []}', encoding="utf-8")

    stats = run_interior_track(depth, poses, tmp_path / "out")
    assert stats["skipped"] is not None
    assert "tsdf_failed" in stats["skipped"] or "produced_no_mesh" in stats["skipped"]


# --- callback summary ------------------------------------------------------


def test_summary_of_a_skipped_run_says_unavailable():
    got = summarize_for_callback({"skipped": "missing_depth_or_poses"})
    assert got == {"available": False, "reason": "missing_depth_or_poses"}


def test_summary_of_empty_stats_does_not_raise():
    assert summarize_for_callback({})["available"] is False
    assert summarize_for_callback(None)["available"] is False


def test_summary_carries_the_numbers_a_triage_screen_reads():
    got = summarize_for_callback(
        {
            "gate": "pass",
            "coverage": {"ratio": 0.81},
            "extent": [9.5, 2.8, 9.4],
            "extentDiagonal": 13.5,
            "tsdf": {"pairsIntegrated": 123},
            "dollhouse": {
                "detect_horizontal_planes": {"floor_y": 0.02, "ceiling_y": 2.61},
                "decimate": {"after": 250_000},
            },
        }
    )
    assert got["available"] is True
    assert got["gate"] == "pass"
    assert got["coverageRatio"] == 0.81
    assert got["pairsIntegrated"] == 123
    assert got["ceilingCut"] is True
    assert got["ceilingY"] == 2.61
    assert got["triangles"] == 250_000


def test_summary_reports_no_ceiling_cut_when_none_was_found():
    got = summarize_for_callback(
        {
            "gate": "pass",
            "dollhouse": {"detect_horizontal_planes": {"floor_y": 0.0, "ceiling_y": None}},
        }
    )
    assert got["ceilingCut"] is False
    assert got["ceilingY"] is None
