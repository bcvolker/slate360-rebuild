"""Pure math checks for the Track L flatness contract."""

from __future__ import annotations

import math

import numpy as np

from scan_analysis import analyze_point_cloud, fit_plane, section_profile


def test_fit_plane_recovers_tilted_plane() -> None:
    x, y = np.meshgrid(np.linspace(0, 2, 12), np.linspace(0, 2, 12))
    z = 1.0 + 0.1 * x + 0.2 * y
    origin, normal, deviations = fit_plane(np.column_stack([x.ravel(), y.ravel(), z.ravel()]))

    expected = np.array([-0.1, -0.2, 1.0])
    expected /= np.linalg.norm(expected)
    assert np.allclose(normal, expected, atol=1e-5)
    assert np.allclose(deviations, 0.0, atol=1e-5)
    assert origin.shape == (3,)


def test_analysis_reports_known_slope_and_contour_interval() -> None:
    x, y = np.meshgrid(np.linspace(0, 1, 10), np.linspace(0, 1, 10))
    points = np.column_stack([x.ravel(), y.ravel(), 2.0 + 0.1 * x.ravel()])
    _, _, flatness, derivatives = analyze_point_cloud(points)

    assert math.isclose(flatness["slopeDegrees"], math.degrees(math.atan(0.1)), rel_tol=1e-4)
    assert flatness["contourIntervalM"] == 0.005
    assert derivatives["contours"]["type"] == "FeatureCollection"


def test_section_profile_selects_points_near_axis() -> None:
    points = np.array([[x, 0.0, x * 2.0] for x in np.linspace(0, 5, 20)])
    profile = section_profile(points, np.array([0.0, 0.0, 0.0]), np.array([5.0, 0.0, 0.0]), 0.1)

    assert len(profile) > 2
    assert profile[0][0] == 0.0
    assert math.isclose(profile[-1][1], 10.0, rel_tol=1e-6)
