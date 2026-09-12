"""Regression test for the 16-view training-set rotation math in stages/views.py
(build plan Sec 4.3 acceptance criterion: "the stage fails if the [reprojection]
test fails").

The rotation from a panorama's own camera frame to each of the 16 canonical
view frames is derived by numerically sampling py360convert's own ray field
rather than hand-deriving Euler angles (see views.py's module docstring for
why). This test locks that derivation down two ways:

1. The forward-ray direction py360convert.utils.xyzpers actually renders for
   every (yaw, pitch) in the 16-view layout must match COLMAP's own
   EQUIRECTANGULAR CamRayFromImg formula (after flipping py360's Y-up
   convention to COLMAP's Y-down) to floating-point precision.
2. The full 3x3 frame views.py constructs (forward + numerically-sampled
   right/down axes) must be an exact right-handed rotation: the "down" axis
   it samples from the actual rendered image must equal cross(forward,
   right) to floating-point precision (zero roll), and det(R) == 1.

Both were verified against the real py360convert build in this venv on
2026-09-12 with worst-case error ~1e-6; this test pins that down permanently
instead of leaving it as one-off scratch verification.
"""
from __future__ import annotations

import math

import numpy as np
import pytest

from config import VIEW_LAYOUT
from stages.views import _view_rotation_in_pano_frame


def _colmap_forward_ray(yaw_deg: float, pitch_deg: float) -> np.ndarray:
    """COLMAP's own EquirectangularCameraModel::CamRayFromImg formula."""
    yaw = math.radians(yaw_deg)
    pitch = math.radians(pitch_deg)
    return np.array([
        math.cos(pitch) * math.sin(yaw),
        -math.sin(pitch),
        math.cos(pitch) * math.cos(yaw),
    ])


@pytest.mark.parametrize("yaw,pitch", VIEW_LAYOUT)
def test_forward_ray_matches_colmap_equirectangular_model(yaw: float, pitch: float) -> None:
    r = _view_rotation_in_pano_frame(yaw, pitch)
    forward = np.array([r[0][2], r[1][2], r[2][2]])  # Z column
    expected = _colmap_forward_ray(yaw, pitch)
    assert np.linalg.norm(forward - expected) < 1e-6


@pytest.mark.parametrize("yaw,pitch", VIEW_LAYOUT)
def test_view_frame_is_a_proper_rotation(yaw: float, pitch: float) -> None:
    r = _view_rotation_in_pano_frame(yaw, pitch)
    m = np.array(r)
    # Orthonormal columns.
    assert np.allclose(m.T @ m, np.eye(3), atol=1e-6)
    # Right-handed (no reflection): det == +1, not -1.
    assert abs(np.linalg.det(m) - 1.0) < 1e-6


def test_view_layout_has_sixteen_canonical_views() -> None:
    assert len(VIEW_LAYOUT) == 16
    assert len(set(VIEW_LAYOUT)) == 16  # no duplicate (yaw, pitch) pairs
