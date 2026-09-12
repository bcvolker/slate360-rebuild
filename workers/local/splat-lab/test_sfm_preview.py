"""Unit tests for SfM preview math."""
from __future__ import annotations

from sfm_preview import _quat_to_r


def test_identity_quat() -> None:
    r = _quat_to_r(1, 0, 0, 0)
    assert abs(r[0][0] - 1) < 1e-9
    assert abs(r[1][1] - 1) < 1e-9
    assert abs(r[2][2] - 1) < 1e-9


if __name__ == "__main__":
    test_identity_quat()
    print("ok")
