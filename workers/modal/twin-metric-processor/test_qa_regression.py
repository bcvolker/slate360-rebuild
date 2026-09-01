import numpy as np

from gaussian_fixed import should_promote_depth_loss, split_roles, train_config
from metric_qa import coverage_holes, floor_plane, report_qa
from metric_tsdf import resolve_voxel_mm
from regression import flag_housewalk


def test_floor_plane_residual_on_known_plane():
    rng = np.random.default_rng(0)
    xz = rng.uniform(-2, 2, size=(4000, 2))
    y = np.full((4000,), -1.2) + rng.normal(0, 0.003, 4000)
    xyz = np.column_stack([xz[:, 0], y, xz[:, 1]]).astype(np.float32)
    floor = floor_plane(xyz)
    assert floor["ok"] is True
    assert floor["residual_rms_m"] < 0.01
    assert floor["up_alignment"] > 0.98


def test_coverage_holes_and_qa_do_not_gate_on_walls():
    rng = np.random.default_rng(1)
    xyz = rng.normal(0, 1, size=(2000, 3)).astype(np.float32)
    xyz[:, 1] -= 1.0
    qa = report_qa(xyz, [{"gravity": [0, 1, 0]}])
    assert qa["wallClustering"]["usedAsPassFail"] is False
    assert "emptyFraction" in qa["coverageHoles"]
    holes = coverage_holes(xyz)
    assert 0 <= holes["emptyFraction"] <= 1


def test_tsdf_voxel_not_auto_picked():
    assert resolve_voxel_mm(None) == 15
    assert resolve_voxel_mm(10) == 10
    assert resolve_voxel_mm(20) == 20
    try:
        resolve_voxel_mm(5)
        raise AssertionError("5 mm must be rejected")
    except ValueError as exc:
        assert "15" in str(exc)


def test_gaussian_config_freezes_cameras():
    cfg = train_config(depth_loss=False)
    assert cfg["pose_opt"] is False
    assert cfg["camera_optimization"] == "off"
    assert cfg["center"] is False
    assert cfg["scale"] is False
    assert cfg["depthLossIsBaseline"] is False
    roles = split_roles(16, every=8)
    assert roles.count("holdout") == 2
    assert roles[0] == "holdout"


def test_depth_loss_does_not_replace_baseline_without_both_gains():
    rgb = {"holdout": {"psnr_mean": 23.46, "ssim_mean": 0.80}, "floor": {"residual_rms_m": 0.008}}
    worse = {"holdout": {"psnr_mean": 24.0, "ssim_mean": 0.81}, "floor": {"residual_rms_m": 0.02}}
    assert should_promote_depth_loss(rgb, worse) is False
    better = {"holdout": {"psnr_mean": 24.0, "ssim_mean": 0.82}, "floor": {"residual_rms_m": 0.007}}
    assert should_promote_depth_loss(rgb, better) is True


def test_housewalk_regression_flags_major_deltas_only():
    ok = flag_housewalk({
        "filtered_points": 9_381_038,
        "voxel_mm": 15,
        "floor_rms_m": 0.008,
        "holdout_psnr": 23.46,
        "holdout_ssim": 0.800,
    })
    assert ok["majorRegression"] is False
    noisy = flag_housewalk({"filtered_points": 9_200_000, "voxel_mm": 15, "floor_rms_m": 0.010})
    assert noisy["majorRegression"] is False
    bad = flag_housewalk({"filtered_points": 500_000, "voxel_mm": 12, "floor_rms_m": 0.05, "holdout_psnr": 12.0})
    assert bad["majorRegression"] is True
    assert any("500k" in f or "filtered_points" in f for f in bad["flags"])
