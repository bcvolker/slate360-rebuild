"""Tests for REG-1 registration. The pure-maths half runs without Open3D."""

from __future__ import annotations

import numpy as np
import pytest

from mesh_registration import (
    MIN_REGISTRATION_POINTS,
    estimate_yaw_translation,
    project_to_yaw,
    refine_icp,
    register_meshes,
    registration_confidence,
    transform_point,
)


def _ry(deg: float) -> np.ndarray:
    r = np.deg2rad(deg)
    c, s = np.cos(r), np.sin(r)
    t = np.eye(4)
    t[0, 0], t[0, 2] = c, s
    t[2, 0], t[2, 2] = -s, c
    return t


# --- yaw projection --------------------------------------------------------


def test_project_to_yaw_keeps_a_pure_rotation_unchanged():
    # The drafted version read column 0 and returned -30 here.
    assert project_to_yaw(_ry(30.0)) == pytest.approx(_ry(30.0), abs=1e-9)


def test_project_to_yaw_sign_is_not_flipped():
    for deg in (15.0, 75.0, 200.0, 330.0):
        got = project_to_yaw(_ry(deg))
        assert got == pytest.approx(_ry(deg), abs=1e-9), f"yaw {deg} was negated"


def test_project_to_yaw_strips_roll_and_pitch_and_stays_orthonormal():
    rx, rz = np.eye(4), np.eye(4)
    a, b = np.deg2rad(12.0), np.deg2rad(-8.0)
    rx[1, 1], rx[1, 2] = np.cos(a), -np.sin(a)
    rx[2, 1], rx[2, 2] = np.sin(a), np.cos(a)
    rz[0, 0], rz[0, 1] = np.cos(b), -np.sin(b)
    rz[1, 0], rz[1, 1] = np.sin(b), np.cos(b)
    mixed = rx @ _ry(40.0) @ rz
    mixed[:3, 3] = [1.0, 2.0, 3.0]

    r = project_to_yaw(mixed)[:3, :3]
    assert r @ r.T == pytest.approx(np.eye(3), abs=1e-12)
    assert float(np.linalg.det(r)) == pytest.approx(1.0, abs=1e-12)
    assert abs(r[0, 1]) < 1e-12 and abs(r[1, 0]) < 1e-12


def test_project_to_yaw_preserves_translation():
    m = _ry(20.0)
    m[:3, 3] = [1.5, -2.0, 0.25]
    assert project_to_yaw(m)[:3, 3] == pytest.approx([1.5, -2.0, 0.25])


def test_project_to_yaw_of_nonfinite_is_identity():
    bad = np.full((4, 4), np.nan)
    assert project_to_yaw(bad) == pytest.approx(np.eye(4))


# --- coarse search ---------------------------------------------------------


def test_estimate_recovers_a_known_yaw_and_translation():
    rng = np.random.default_rng(1)
    src = np.column_stack(
        (rng.uniform(0, 3, 200), rng.uniform(0, 0.4, 200), rng.uniform(0, 1.2, 200))
    )
    src[0:50, 0] += 2.5  # break the symmetry so there is one right answer
    yaw = np.deg2rad(25.0)
    c, s = np.cos(yaw), np.sin(yaw)
    x, z = src[:, 0], src[:, 2]
    tgt = np.column_stack((c * x + s * z, src[:, 1], -s * x + c * z)) + [1.0, 0.0, -0.5]

    est = estimate_yaw_translation(src, tgt, yaw_step_deg=2.0)
    assert est["skipped"] is None
    err = abs(est["yaw_deg"] - 25.0)
    assert min(err, 360.0 - err) <= 2.0
    assert est["translation"][0] == pytest.approx(1.0, abs=0.25)
    assert est["translation"][2] == pytest.approx(-0.5, abs=0.25)


def test_estimate_detects_fourfold_rotational_ambiguity():
    xs, zs = np.meshgrid([-1.0, -0.5, 0.5, 1.0], [-1.0, -0.5, 0.5, 1.0])
    pts = np.column_stack((xs.ravel(), np.zeros(xs.size), zs.ravel()))
    est = estimate_yaw_translation(pts, pts, yaw_step_deg=5.0)
    assert est["runner_up_score"] >= 0.9 * est["score"]


def test_estimate_degenerate_input_skips_rather_than_raising():
    assert estimate_yaw_translation(np.zeros((0, 3)), np.zeros((0, 3)))["skipped"]
    assert estimate_yaw_translation([[0, 0, 0]], [[1, 0, 0]])["skipped"]


def test_a_handful_of_points_is_refused_not_registered():
    """Two 2-point clouds 50 m apart score a PERFECT 1.0: the coarse stage
    aligns shape, and centroid translation absorbs the 50 m. The runner-up
    check does not catch it (0.33) and neither would ICP fitness. The only
    honest defence is refusing to register a building from a handful of
    points, so the point-count floor is load-bearing, not a nicety."""
    a = np.array([[0.0, 0.0, 0.0], [0.2, 0.0, 0.0]])
    b = np.array([[50.0, 0.0, 50.0], [50.2, 0.0, 50.0]])
    assert estimate_yaw_translation(a, b)["skipped"] == "too_few_points"


def test_the_point_floor_admits_a_real_room_sized_cloud():
    rng = np.random.default_rng(3)
    pts = rng.uniform(-3, 3, size=(MIN_REGISTRATION_POINTS + 50, 3))
    assert estimate_yaw_translation(pts, pts)["skipped"] is None


# --- confidence ------------------------------------------------------------


def test_low_fitness_is_failed():
    got = registration_confidence(0.2, 0.02, 0.8, 0.1)
    assert got["verdict"] == "failed"
    assert got["confidence"] == 0.0


def test_high_rmse_is_at_best_ambiguous():
    assert registration_confidence(0.7, 0.09, 0.8, 0.1)["verdict"] == "ambiguous"


def test_close_runner_up_is_ambiguous_even_when_everything_else_is_perfect():
    got = registration_confidence(0.95, 0.01, 1.0, 0.95)
    assert got["verdict"] == "ambiguous"
    assert "rotational_ambiguity" in got["reasons"]


def test_aligned_requires_all_three():
    got = registration_confidence(0.6, 0.04, 0.8, 0.2)
    assert got["verdict"] == "aligned"
    assert got["reasons"] == []
    assert got["confidence"] > 0.5


# --- pin movement ----------------------------------------------------------


def test_transform_point_identity_translation_and_yaw():
    assert transform_point((1.0, 2.0, 3.0), np.eye(4)) == pytest.approx((1.0, 2.0, 3.0))
    t = np.eye(4)
    t[:3, 3] = [4.0, 5.0, 6.0]
    assert transform_point((1.0, 2.0, 3.0), t) == pytest.approx((5.0, 7.0, 9.0))
    assert transform_point((1.0, 0.0, 0.0), _ry(90.0)) == pytest.approx((0.0, 0.0, -1.0), abs=1e-9)


def test_transform_point_with_a_broken_transform_leaves_the_pin_put():
    bad = np.full((4, 4), np.nan)
    assert transform_point((1.0, 2.0, 3.0), bad) == pytest.approx((1.0, 2.0, 3.0))


# --- Open3D-dependent ------------------------------------------------------


def test_refine_and_register_on_an_empty_mesh_fail_cleanly():
    o3d = pytest.importorskip("open3d")
    mesh = o3d.geometry.TriangleMesh()
    assert refine_icp(mesh, mesh, np.eye(4))["skipped"]
    xf, stats = register_meshes(mesh, mesh)
    assert stats["verdict"] == "failed"
    assert xf == pytest.approx(np.eye(4))
