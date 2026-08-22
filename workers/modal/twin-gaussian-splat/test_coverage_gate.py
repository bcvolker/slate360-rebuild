"""COVERAGE-1 tests — the gate that would have caught the kitchen collapse.

Real numbers from the 2026-08-22 failure: a kitchen+dining walk produced a model
with a 3.23 m diagonal while its own LiDAR cloud measured 13.71 m. Every other
gate passed it (train PSNR 32.65 — the highest ever recorded — because a small
overfit scene is the easiest thing to fit).
"""

import pytest

from worker import COVERAGE_MIN_EXTENT_RATIO, evaluate_coverage_gate, _bounds_diagonal


def test_kitchen_collapse_is_caught():
    """The exact failure: 3.23 m model of a 13.71 m room."""
    g = evaluate_coverage_gate(3.23, 13.71, "lidar_cloud")
    assert g["gate"] == "fail"
    assert g["ratio"] == pytest.approx(0.2356, abs=1e-3)
    assert g["reference"] == "lidar_cloud"


def test_healthy_model_passes():
    """A model spanning most of its reference is fine — it need not match exactly,
    since the splat is cropped and the LiDAR sees a little past the walls."""
    assert evaluate_coverage_gate(12.4, 13.71, "lidar_cloud")["gate"] == "pass"
    assert evaluate_coverage_gate(9.0, 13.71, "lidar_cloud")["gate"] == "pass"


def test_threshold_boundary():
    ref = 10.0
    assert evaluate_coverage_gate(ref * COVERAGE_MIN_EXTENT_RATIO, ref, "x")["gate"] == "pass"
    assert evaluate_coverage_gate(ref * (COVERAGE_MIN_EXTENT_RATIO - 0.01), ref, "x")["gate"] == "fail"


def test_missing_reference_skips_honestly():
    """No LiDAR means no reference — never invent a pass, and never fail a job
    just because the reference is absent (360-only captures are legitimate)."""
    for model, ref in [(3.2, None), (None, 13.7), (3.2, 0)]:
        g = evaluate_coverage_gate(model, ref, "lidar_cloud")
        assert g["gate"] == "coverage_unavailable"
        assert g["ratio"] is None


def test_bounds_diagonal_matches_measured_kitchen():
    """1.67 x 1.95 x 1.96 m -> 3.23 m, the measured bbox of the collapsed model."""
    bounds = {"min": {"x": 0.0, "y": 0.0, "z": 0.0}, "max": {"x": 1.67, "y": 1.95, "z": 1.96}}
    assert _bounds_diagonal(bounds) == pytest.approx(3.23, abs=0.01)


if __name__ == "__main__":
    raise SystemExit(pytest.main([__file__, "-v"]))
