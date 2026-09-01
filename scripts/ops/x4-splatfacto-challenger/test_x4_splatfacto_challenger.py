"""Locks for the Splatfacto appearance challenger. No GPU required."""
from __future__ import annotations

from pathlib import Path
import sys

import numpy as np
import pytest

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))

from cameras import equatorial_cameras  # noqa: E402
from opengl import opencv_c2w_to_opengl  # noqa: E402
from paths import CONFIG, TRAJ  # noqa: E402
from train_args import (  # noqa: E402
    bilateral_grid_enabled,
    build_train_args,
    camera_optimizer_is_off,
)


def test_camera_optimizer_always_off():
    for bilateral in (False, True):
        args = build_train_args(
            Path("/data"), Path("/out"), bilateral_grid=bilateral, iterations=30000, scene_scale=32.0, experiment="A"
        )
        assert camera_optimizer_is_off(args)
        assert args[args.index("--pipeline.model.camera-optimizer.mode") + 1] == "off"
        assert args[args.index("--pipeline.model.rasterize-mode") + 1] == "classic"


def _strip_ab(args: list[str]) -> list[str]:
    out = list(args)
    if "--pipeline.model.use-bilateral-grid" in out:
        i = out.index("--pipeline.model.use-bilateral-grid")
        del out[i : i + 2]
    i = out.index("--experiment-name")
    del out[i : i + 2]
    return out


def test_bilateral_grid_is_the_only_ab():
    a = build_train_args(Path("/d"), Path("/o"), bilateral_grid=False, iterations=30000, scene_scale=16.0, experiment="A")
    b = build_train_args(Path("/d"), Path("/o"), bilateral_grid=True, iterations=30000, scene_scale=16.0, experiment="B")
    assert not bilateral_grid_enabled(a)
    assert bilateral_grid_enabled(b)
    assert _strip_ab(a) == _strip_ab(b)


def test_dataparser_does_not_move_poses():
    args = build_train_args(Path("/d"), Path("/o"), bilateral_grid=False, iterations=1, scene_scale=32.0, experiment="A")
    assert args[args.index("--orientation-method") + 1] == "none"
    assert args[args.index("--center-method") + 1] == "none"
    assert args[args.index("--auto-scale-poses") + 1] == "False"


def test_opengl_conversion_keeps_center():
    c2w = np.eye(4)
    c2w[:3, 3] = [5.17, 0.58, 4.05]
    gl = opencv_c2w_to_opengl(c2w)
    assert np.allclose(gl[:3, 3], c2w[:3, 3])
    assert np.allclose(gl[:3, 1], -c2w[:3, 1])
    assert np.allclose(gl[:3, 2], -c2w[:3, 2])


def test_config_matches_brief():
    assert CONFIG["camera_optimizer"] == "off"
    assert CONFIG["sfm_rerun"] is False
    assert CONFIG["nadir"] is False
    assert CONFIG["rasterize_mode"] == "classic"
    assert CONFIG["antialiased_ply_as_winner"] is False
    assert CONFIG["experiments"]["B"]["use_bilateral_grid"] is True
    assert CONFIG["experiments"]["A"]["use_bilateral_grid"] is False
    assert CONFIG["faces"] == ["front", "right", "back", "left"]


def test_holdout_is_whole_panoramas_equatorial_only():
    if not TRAJ.is_file():
        pytest.skip("Route B trajectory not on this machine")
    trained, split, lock = equatorial_cameras(TRAJ, 1200)
    assert split["n_panos"] == 166
    assert split["n_holdout_panos"] == 21
    assert split["every"] == 8
    hold_t = {c["t"] for c in trained if c["role"] == "holdout"}
    train_t = {c["t"] for c in trained if c["role"] == "train"}
    assert not (hold_t & train_t)
    assert {c["face"] for c in trained} == {"front", "right", "back", "left"}
    assert not any(c["face"] in {"up", "down"} for c in trained)
    assert all(c["w"] == 1200 for c in trained)
    assert lock["max_center_delta"] < 1e-6
    assert sum(1 for c in trained if c["role"] == "train") == 145 * 4
    assert sum(1 for c in trained if c["role"] == "holdout") == 21 * 4
