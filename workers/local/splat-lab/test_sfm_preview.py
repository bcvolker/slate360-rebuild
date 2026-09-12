"""Unit tests for SfM preview math."""
from __future__ import annotations

from colmap_io import _quat_to_rotmat


def test_identity_quat() -> None:
    r = _quat_to_rotmat(1, 0, 0, 0)
    assert abs(r[0][0] - 1) < 1e-9
    assert abs(r[1][1] - 1) < 1e-9
    assert abs(r[2][2] - 1) < 1e-9


if __name__ == "__main__":
    test_identity_quat()
    print("ok")
