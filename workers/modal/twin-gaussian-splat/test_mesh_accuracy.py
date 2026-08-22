"""Tests for ACC-1. The standards check runs without Open3D."""

from __future__ import annotations

import pytest

from mesh_accuracy import (
    STANDARD_CEILING_HEIGHTS_M,
    evaluate_accuracy,
    fusion_residual,
    standard_dimension_check,
)


def _plan_with_door(width: float, *, verified: bool = True, kind: str = "door"):
    return {
        "wall_area_takeoff": {
            "walls": [{
                "openings": [{
                    "kind": kind, "width": width, "height": 2.0,
                    "sill_height": 0.0, "area": width * 2.0, "verified": verified,
                }]
            }]
        }
    }


def test_a_32_inch_door_agrees_with_the_standard():
    got = standard_dimension_check(_plan_with_door(0.815), None, None)
    assert got["doors"][0]["agrees"] is True
    assert got["doors"][0]["nearestStandardM"] == pytest.approx(0.813)
    assert got["doors"][0]["measuredIn"] == pytest.approx(32.1, abs=0.1)
    assert got["verdict"] == "consistent"


def test_a_door_measuring_half_a_metre_off_does_not_agree():
    got = standard_dimension_check(_plan_with_door(1.35), None, None)
    assert got["doors"][0]["agrees"] is False
    assert got["verdict"] == "inconsistent"


def test_unverified_openings_are_not_used_as_evidence():
    """An unverified void is a sensor hole. Measuring a hole says nothing about
    the building, so it must never count toward a scale claim."""
    got = standard_dimension_check(_plan_with_door(0.813, verified=False), None, None)
    assert got["doors"] == []
    assert got["verdict"] == "no_evidence"


def test_windows_are_not_treated_as_doors():
    got = standard_dimension_check(_plan_with_door(0.813, kind="window"), None, None)
    assert got["doors"] == []


def test_an_eight_foot_ceiling_agrees():
    got = standard_dimension_check({}, 0.0, 2.44)
    assert got["ceiling"]["agrees"] is True
    assert got["ceiling"]["measuredFt"] == pytest.approx(8.0, abs=0.05)
    assert got["ceiling"]["nearestStandardM"] == pytest.approx(STANDARD_CEILING_HEIGHTS_M[0])


def test_a_nine_foot_ceiling_picks_the_nine_foot_standard():
    got = standard_dimension_check({}, 0.0, 2.75)
    assert got["ceiling"]["nearestStandardM"] == pytest.approx(2.743)
    assert got["ceiling"]["agrees"] is True


def test_an_absurd_storey_height_is_flagged():
    got = standard_dimension_check({}, 0.0, 5.0)
    assert got["ceiling"]["agrees"] is False
    assert got["verdict"] == "inconsistent"


def test_no_dimensions_at_all_reports_no_evidence_not_a_pass():
    got = standard_dimension_check({}, None, None)
    assert got["verdict"] == "no_evidence"
    assert got["ceiling"] is None


def test_fusion_residual_degenerate_inputs_skip():
    assert fusion_residual(object(), [[0, 0, 0]])["skipped"] == "no_mesh"


def test_evaluate_accuracy_summary_is_honest_when_fusion_is_unavailable():
    got = evaluate_accuracy(object(), [], {}, 0.0, 2.44)
    assert "unavailable" in got["summary"]
    assert got["standards"]["ceiling"]["agrees"] is True


def test_summary_never_claims_certification():
    got = evaluate_accuracy(object(), [], {}, 0.0, 2.44)
    lowered = got["summary"].lower()
    for banned in ("certified", "compliant", "guaranteed", "exact"):
        assert banned not in lowered


def test_fusion_residual_on_a_real_mesh():
    o3d = pytest.importorskip("open3d")
    import numpy as np

    box = o3d.geometry.TriangleMesh.create_box(width=2.0, height=2.0, depth=2.0)
    # Points sampled on the box surface should sit essentially on the mesh.
    sampled = np.asarray(box.sample_points_uniformly(number_of_points=2000).points)
    got = fusion_residual(box, sampled)
    assert got["skipped"] is None
    assert got["medianMm"] < 1.0
    assert got["within10mmPct"] > 99.0


def test_fusion_residual_excludes_points_outside_the_mesh_extent():
    """Reference returns beyond the fusion's range limit are not the mesh's
    fault; scoring against them measures sensor noise, not fidelity."""
    o3d = pytest.importorskip("open3d")
    import numpy as np

    box = o3d.geometry.TriangleMesh.create_box(width=2.0, height=2.0, depth=2.0)
    on_surface = np.asarray(box.sample_points_uniformly(number_of_points=2000).points)
    strays = np.full((500, 3), 40.0)
    got = fusion_residual(box, np.vstack((on_surface, strays)))
    assert got["pointsOutsideMeshExtent"] == 500
    assert got["medianMm"] < 1.0
    assert got["p95Mm"] < 50.0
