"""Tests for M5 floor plan + take-off. Pure-maths tests run without Open3D."""

from __future__ import annotations

import numpy as np
import pytest

from mesh_floorplan import (
    extend_to_corners,
    build_floorplan,
    close_floor_polygon,
    detect_wall_openings,
    fit_wall_segments,
    polygon_area,
    slice_at_height,
)


def test_polygon_area_rect_triangle_and_degenerate():
    rect = [[0.0, 0.0], [4.0, 0.0], [4.0, 3.0], [0.0, 3.0]]
    assert polygon_area(rect) == pytest.approx(12.0)
    assert polygon_area(list(reversed(rect))) == pytest.approx(12.0)
    assert polygon_area([[0.0, 0.0], [4.0, 0.0], [0.0, 3.0]]) == pytest.approx(6.0)
    assert polygon_area([[0.0, 0.0], [1.0, 0.0]]) == 0.0
    assert polygon_area([]) == 0.0


def _rect_points() -> np.ndarray:
    pts = []
    for x in np.linspace(0, 4, 50):
        pts.append([x, 0.0])
        pts.append([x, 3.0])
    for z in np.linspace(0, 3, 40):
        pts.append([0.0, z])
        pts.append([4.0, z])
    return np.array(pts)


def test_fit_wall_segments_finds_four_walls_of_a_rectangle():
    segs = fit_wall_segments(_rect_points(), min_points=20)
    assert len(segs) == 4
    # Raw RANSAC gives each corner to whichever wall was fitted first, so the
    # later walls measure short by one point spacing at each end.
    assert sorted(round(s["length"], 2) for s in segs) == [2.85, 2.85, 4.0, 4.0]


def test_corner_extension_recovers_the_true_wall_lengths():
    segs = extend_to_corners(fit_wall_segments(_rect_points(), min_points=20))
    lengths = sorted(round(s["length"], 2) for s in segs)
    assert lengths == [3.0, 3.0, 4.0, 4.0]


def test_corner_extension_refuses_to_drag_a_wall_across_the_room():
    far = [
        {"start": [0.0, 0.0], "end": [2.0, 0.0], "length": 2.0},
        {"start": [9.0, 5.0], "end": [9.0, 8.0], "length": 3.0},
    ]
    out = extend_to_corners(far)
    assert out[0]["length"] == pytest.approx(2.0)
    assert out[1]["length"] == pytest.approx(3.0)


def test_corner_extension_on_a_single_segment_is_a_noop():
    one = [{"start": [0.0, 0.0], "end": [2.0, 0.0], "length": 2.0}]
    assert extend_to_corners(one)[0]["length"] == pytest.approx(2.0)


def test_fit_wall_segments_splits_a_doorway_gap():
    # One straight line of points with a 0.9 m gap is TWO walls, not one.
    left = np.column_stack((np.linspace(0.0, 2.0, 50), np.zeros(50)))
    right = np.column_stack((np.linspace(2.9, 5.0, 50), np.zeros(50)))
    segs = fit_wall_segments(np.vstack((left, right)), min_points=20)
    assert len(segs) == 2


def test_fit_wall_segments_inlier_count_excludes_synthetic_endpoints():
    segs = fit_wall_segments(_rect_points(), min_points=20)
    for seg in segs:
        assert seg["inliers"] >= 20
        assert seg["inliers"] <= _rect_points().shape[0]


def test_close_floor_polygon_closed_and_open():
    segs = [
        {"start": [0.0, 0.0], "end": [4.0, 0.0], "length": 4.0},
        {"start": [4.0, 0.0], "end": [4.0, 3.0], "length": 3.0},
        {"start": [4.0, 3.0], "end": [0.0, 3.0], "length": 4.0},
        {"start": [0.0, 3.0], "end": [0.0, 0.0], "length": 3.0},
    ]
    closed = close_floor_polygon(segs)
    assert closed["closed"] is True
    assert polygon_area(closed["polygon"]) == pytest.approx(12.0)

    partial = close_floor_polygon(segs[:3])
    assert partial["closed"] is False
    assert len(partial["polygon"]) >= 2


def test_close_floor_polygon_no_segments():
    assert close_floor_polygon([])["skipped"] == "no_segments"


# --- take-off: the numbers a contractor bids from -------------------------


def test_takeoff_subtracts_a_verified_door_but_not_an_unverified_one(monkeypatch):
    import mesh_floorplan as mf

    door = {"kind": "door", "width": 0.9, "height": 2.0, "sill_height": 0.0,
            "area": 1.8, "verified": True}
    seg = [{"start": [0.0, 0.0], "end": [4.0, 0.0], "length": 4.0}]

    monkeypatch.setattr(mf, "detect_wall_openings", lambda *a, **k: [door])
    take = mf.wall_area_takeoff(object(), seg, 0.0, 2.5)
    assert take["walls"][0]["gross_area"] == pytest.approx(10.0)
    assert take["walls"][0]["net_area"] == pytest.approx(8.2)
    assert take["walls"][0]["unverified_opening_area"] == pytest.approx(0.0)

    monkeypatch.setattr(mf, "detect_wall_openings", lambda *a, **k: [{**door, "verified": False}])
    take2 = mf.wall_area_takeoff(object(), seg, 0.0, 2.5)
    assert take2["walls"][0]["net_area"] == pytest.approx(10.0)
    assert take2["walls"][0]["unverified_opening_area"] == pytest.approx(1.8)
    assert take2["totals"]["net_area"] == pytest.approx(10.0)


# --- Open3D-dependent -----------------------------------------------------


def _wall_mesh(o3d, gap_x: tuple[float, float], gap_y: tuple[float, float]):
    verts = []
    for x in np.linspace(0.0, 4.0, 81):
        for y in np.linspace(0.0, 2.5, 51):
            if gap_x[0] <= x <= gap_x[1] and gap_y[0] <= y <= gap_y[1]:
                continue
            verts.append([x, y, 0.0])
    mesh = o3d.geometry.TriangleMesh()
    mesh.vertices = o3d.utility.Vector3dVector(np.array(verts))
    return mesh


def test_detect_openings_classifies_door_window_and_refuses_unbounded():
    o3d = pytest.importorskip("open3d")
    seg = {"start": [0.0, 0.0], "end": [4.0, 0.0], "length": 4.0}

    doors = detect_wall_openings(_wall_mesh(o3d, (1.5, 2.4), (0.0, 1.85)), seg, 0.0, 2.5)
    assert any(o["kind"] == "door" and o["verified"] for o in doors)

    wins = detect_wall_openings(_wall_mesh(o3d, (1.5, 2.4), (0.9, 2.1)), seg, 0.0, 2.5)
    assert any(o["kind"] == "window" and o["verified"] for o in wins)

    # A void running off the top of the wall is unscanned area, not an opening.
    tops = detect_wall_openings(_wall_mesh(o3d, (1.5, 2.4), (0.4, 2.5)), seg, 0.0, 2.5)
    assert any(o["verified"] is False for o in tops)


def test_degenerate_inputs_do_not_raise():
    o3d = pytest.importorskip("open3d")
    empty = o3d.geometry.TriangleMesh()
    pts = slice_at_height(empty, 1.2)
    assert pts.shape == (0, 2)
    assert fit_wall_segments(pts) == []
    plan = build_floorplan(empty, 0.0, 2.5)
    assert plan["floor_area"] == 0.0
    assert plan["perimeter"] == 0.0
