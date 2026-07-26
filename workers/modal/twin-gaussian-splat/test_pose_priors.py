"""Tests for pose_priors.py — covariance model + real COLMAP database round-trip.

Run: python3 workers/modal/twin-gaussian-splat/test_pose_priors.py
"""

from __future__ import annotations

import math
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from pose_priors import (  # noqa: E402
    ArkitKeyframe, build_priors, sigma_for_keyframe, write_priors_to_database,
    IOS_2640_DRIFT_MULTIPLIER, SIGMA_NORMAL,
)

results: list[bool] = []


def check(name: str, cond: bool, detail: str = "") -> None:
    results.append(bool(cond))
    print(f"  [{'PASS' if cond else 'FAIL'}] {name}" + (f"  ({detail})" if detail else ""))


def kf(name, t, state="normal", pos=(0.0, 0.0, 0.0), **kw):
    return ArkitKeyframe(image_name=name, position=pos, timestamp=t, tracking_state=state, **kw)


def test_covariance_model() -> None:
    print("\nCovariance model")

    s_normal = sigma_for_keyframe(kf("a", 0.0), 0.0)
    check("normal tracking uses the tight base sigma", abs(s_normal - SIGMA_NORMAL) < 1e-6,
          f"{s_normal:.3f} m")

    s_feat = sigma_for_keyframe(kf("b", 0.0, "limited_insufficientFeatures"), 0.0)
    s_motion = sigma_for_keyframe(kf("c", 0.0, "limited_excessiveMotion"), 0.0)
    check("degraded tracking inflates sigma", s_feat > s_normal and s_motion > s_feat,
          f"feat={s_feat:.2f} motion={s_motion:.2f}")

    check("relocalizing omits the prior entirely",
          sigma_for_keyframe(kf("d", 0.0, "limited_relocalizing"), 0.0) is None)
    check("initializing omits the prior entirely",
          sigma_for_keyframe(kf("e", 0.0, "initializing"), 0.0) is None)

    # Random-walk growth: sigma must increase with elapsed time, and do so sub-linearly.
    s0 = sigma_for_keyframe(kf("f", 0.0), 0.0)
    s100 = sigma_for_keyframe(kf("g", 100.0), 100.0)
    s400 = sigma_for_keyframe(kf("h", 400.0), 400.0)
    check("sigma grows with walk duration", s400 > s100 > s0,
          f"0s={s0:.3f} 100s={s100:.3f} 400s={s400:.3f}")
    # sqrt growth: quadrupling time should roughly double the drift term, not quadruple it.
    d100, d400 = math.sqrt(max(s100**2 - s0**2, 0)), math.sqrt(max(s400**2 - s0**2, 0))
    check("growth is sqrt(t), not linear", 1.7 < (d400 / max(d100, 1e-9)) < 2.3,
          f"ratio={d400/max(d100,1e-9):.2f} (expect ~2)")

    s_plain = sigma_for_keyframe(kf("i", 10.0), 10.0, ios_lidar_drift=False)
    s_ios = sigma_for_keyframe(kf("j", 10.0), 10.0, ios_lidar_drift=True)
    check("iOS 26.4 LiDAR regression inflates sigma",
          abs(s_ios / s_plain - IOS_2640_DRIFT_MULTIPLIER) < 1e-6,
          f"{s_plain:.3f} -> {s_ios:.3f}")

    post = sigma_for_keyframe(kf("k", 5.0, seconds_since_interruption=0.4), 5.0)
    check("post-interruption window loosens sigma", post > s_normal, f"{post:.3f} m")


def test_build_priors() -> None:
    print("\nPrior assembly")
    frames = [
        kf("f0.jpg", 0.0, pos=(0, 0, 0), gravity=(0, -1, 0)),
        kf("f1.jpg", 1.0, "limited_relocalizing", pos=(1, 0, 0)),   # omitted
        kf("f2.jpg", 2.0, pos=(2, 0, 0), gravity=(0, -1, 0)),
    ]
    priors = build_priors(frames)
    check("relocalizing frame omitted", len(priors) == 2, f"{len(priors)}/3 kept")
    names = [p[0] for p in priors]
    check("correct frames kept", names == ["f0.jpg", "f2.jpg"], str(names))
    cov = priors[0][2]
    check("covariance is diagonal 3x3", len(cov) == 3 and len(cov[0]) == 3
          and cov[0][1] == 0 and cov[1][2] == 0)
    check("covariance is variance (sigma squared)",
          abs(math.sqrt(cov[0][0]) - SIGMA_NORMAL) < 1e-6, f"sigma={math.sqrt(cov[0][0]):.3f}")
    check("gravity carried through", priors[0][3] == (0, -1, 0))
    check("empty input is safe", build_priors([]) == [])


def test_database_roundtrip() -> None:
    """Write priors into a real COLMAP database and read them back."""
    print("\nCOLMAP database round-trip (pycolmap)")
    try:
        import pycolmap
    except ImportError:
        print("  [SKIP] pycolmap not installed")
        return

    with tempfile.TemporaryDirectory() as tmp:
        db_path = str(Path(tmp) / "database.db")
        db = pycolmap.Database.open(db_path)
        cam = pycolmap.Camera.create_from_model_id(1, 1, 1000.0, 1600, 1200)
        cam.camera_id = db.write_camera(cam)
        ids = {}
        for name in ["f0.jpg", "f1.jpg", "f2.jpg"]:
            img = pycolmap.Image(name=name, camera_id=cam.camera_id)
            ids[name] = db.write_image(img)
        db.close()

        frames = [
            kf("f0.jpg", 0.0, pos=(1.0, 2.0, 3.0), gravity=(0.0, -1.0, 0.0)),
            kf("f1.jpg", 1.0, "limited_relocalizing", pos=(9, 9, 9)),  # must be omitted
            kf("f2.jpg", 2.0, pos=(4.0, 5.0, 6.0), gravity=(0.0, -1.0, 0.0)),
            kf("ghost.jpg", 3.0, pos=(0, 0, 0)),                      # not in the database
        ]
        stats = write_priors_to_database(db_path, frames)

        check("wrote exactly the registered, usable frames", stats["posePriorsWritten"] == 2,
              f"written={stats['posePriorsWritten']}")
        check("omitted the relocalizing frame", stats["posePriorsOmitted"] == 1)
        check("skipped the unregistered frame", stats["posePriorsSkippedMissing"] == 1)

        db = pycolmap.Database.open(db_path)
        try:
            check("database reports 2 pose priors", db.num_pose_priors() == 2,
                  f"num={db.num_pose_priors()}")
            all_priors = {tuple(round(v, 6) for v in p.position): p
                          for p in db.read_all_pose_priors()}
            got = all_priors.get((1.0, 2.0, 3.0))
            check("prior for f0 found by position", got is not None)
            pos = list(got.position) if got else []
            check("position round-trips exactly",
                  bool(got) and all(abs(a - b) < 1e-9 for a, b in zip(pos, [1.0, 2.0, 3.0])),
                  str(pos))
            check("covariance survives the round-trip", got.has_position_cov)
            check("covariance is valid per COLMAP", got.is_covariance_valid)
            sigma = math.sqrt(got.position_covariance[0][0])
            check("stored sigma matches the model", abs(sigma - SIGMA_NORMAL) < 1e-6,
                  f"{sigma:.3f} m")
            check("gravity round-trips", got.has_gravity)
            check("relocalizing frame's position absent",
                  (9.0, 9.0, 9.0) not in all_priors)
        finally:
            db.close()


def test_mapper_options() -> None:
    print("\nMapper options")
    try:
        from pose_priors import mapper_options
        opts = mapper_options()
    except ImportError:
        print("  [SKIP] pycolmap not installed")
        return
    check("use_prior_position enabled", opts.use_prior_position is True)
    check("robust loss enabled", opts.use_robust_loss_on_prior_position is True)
    check("loss scale is COLMAP's 3-DOF chi-squared default",
          abs(opts.prior_position_loss_scale - 7.815) < 1e-6,
          f"{opts.prior_position_loss_scale}")


def main() -> int:
    test_covariance_model()
    test_build_priors()
    test_database_roundtrip()
    test_mapper_options()
    passed, total = sum(results), len(results)
    print(f"\n{passed}/{total} passed\n")
    return 0 if passed == total else 1


if __name__ == "__main__":
    raise SystemExit(main())
