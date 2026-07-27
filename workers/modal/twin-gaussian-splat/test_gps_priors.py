"""Tests for gps_priors — run: python test_gps_priors.py"""

from __future__ import annotations

import math

from gps_priors import (
    MAX_FIX_AGE_S,
    MIN_CREDIBLE_HACC_M,
    MIN_SIGMA_V_M,
    WALK_SPEED_MPS,
    build_gps_priors,
    gps_prior_stats,
)

FAILURES: list[str] = []


def check(name: str, cond: bool, detail: str = "") -> None:
    if cond:
        print(f"  ok   {name}")
    else:
        print(f"  FAIL {name} {detail}")
        FAILURES.append(name)


def kf(name, t, *, lat=33.4, lon=-111.9, alt=350.0, hacc=5.0, vacc=8.0,
       fix_time=None, age=None):
    gps = {"lat": lat, "lon": lon, "alt": alt, "hAcc": hacc, "vAcc": vacc}
    if fix_time is not None:
        gps["fixTime"] = fix_time
        gps["age"] = t - fix_time if age is None else age
    return {"image_name": name, "timestamp": t, "gps": gps}


def test_v5_collapses_repeats():
    # One fix at t=100, copied into 30 keyframes over the following second.
    frames = [kf(f"f{i:03d}", 100.0 + i * 0.033, fix_time=100.0) for i in range(30)]
    priors = build_gps_priors(frames)
    check("v5: 30 copies of one fix collapse to 1 prior", len(priors) == 1,
          f"got {len(priors)}")
    check("v5: representative is the freshest keyframe",
          priors and priors[0].image_name == "f000", f"got {priors[0].image_name}")


def test_v5_distinct_fixes_kept():
    frames = [kf("a", 100.0, fix_time=100.0),
              kf("b", 101.0, lat=33.401, fix_time=101.0),
              kf("c", 102.0, lat=33.402, fix_time=102.0)]
    priors = build_gps_priors(frames)
    check("v5: three distinct fixes stay three priors", len(priors) == 3,
          f"got {len(priors)}")
    check("v5: priors ordered by fix time",
          [p.image_name for p in priors] == ["a", "b", "c"])


def test_v4_fallback_collapses_by_coordinate():
    # No fixTime/age at all — v4 capture. Identical coordinates are the same fix.
    frames = []
    for i in range(10):
        f = kf(f"f{i}", 100.0 + i)
        f["gps"].pop("fixTime", None)
        f["gps"].pop("age", None)
        frames.append(f)
    priors = build_gps_priors(frames)
    check("v4: identical coordinates collapse to 1 prior", len(priors) == 1,
          f"got {len(priors)}")
    check("v4: unknown age treated as 0, not discarded",
          priors and priors[0].age == 0.0)


def test_age_inflates_sigma():
    fresh = build_gps_priors([kf("a", 100.0, hacc=5.0, fix_time=100.0)])[0]
    stale = build_gps_priors([kf("b", 103.0, hacc=5.0, fix_time=100.0)])[0]
    check("fresh fix sigma == reported hAcc", math.isclose(fresh.sigma_h, 5.0, abs_tol=1e-6),
          f"got {fresh.sigma_h}")
    expected = math.hypot(5.0, WALK_SPEED_MPS * 3.0)
    check("3 s stale fix sigma inflated by motion",
          math.isclose(stale.sigma_h, expected, abs_tol=1e-6),
          f"got {stale.sigma_h} want {expected}")
    check("staleness strictly increases sigma", stale.sigma_h > fresh.sigma_h)


def test_too_stale_dropped():
    late = MAX_FIX_AGE_S + 1.0
    priors = build_gps_priors([kf("a", 100.0 + late, fix_time=100.0)])
    check("fix older than the age ceiling is dropped", priors == [], f"got {priors}")


def test_invalid_accuracy_rejected():
    # CoreLocation signals invalid with a NEGATIVE accuracy, not null.
    priors = build_gps_priors([kf("a", 100.0, hacc=-1.0, fix_time=100.0)])
    check("negative hAcc rejects the fix entirely", priors == [], f"got {priors}")

    p = build_gps_priors([kf("b", 100.0, vacc=-1.0, fix_time=100.0)])
    check("negative vAcc keeps horizontal, drops altitude",
          len(p) == 1 and p[0].sigma_v is None and p[0].alt is None)


def test_implausible_accuracy_floored():
    p = build_gps_priors([kf("a", 100.0, hacc=0.05, fix_time=100.0)])[0]
    check("sub-metre phone claim floored to the credible minimum",
          math.isclose(p.sigma_h, MIN_CREDIBLE_HACC_M, abs_tol=1e-6), f"got {p.sigma_h}")


def test_vertical_floor():
    p = build_gps_priors([kf("a", 100.0, vacc=1.0, fix_time=100.0)])[0]
    check("optimistic vAcc floored — GNSS vertical is worse than reported",
          p.sigma_v == MIN_SIGMA_V_M, f"got {p.sigma_v}")


def test_indoor_capture_is_not_an_error():
    frames = [{"image_name": "a", "timestamp": 1.0}, {"image_name": "b", "timestamp": 2.0}]
    check("no GPS at all returns empty, does not raise", build_gps_priors(frames) == [])
    stats = gps_prior_stats([], 2)
    check("stats degrade cleanly with no priors", stats["gpsPriors"] == 0)


def test_stats_report_collapse_ratio():
    frames = [kf(f"f{i}", 100.0 + i * 0.1, fix_time=100.0 + (i // 10)) for i in range(30)]
    priors = build_gps_priors(frames)
    stats = gps_prior_stats(priors, len(frames))
    check("collapse ratio reported", stats["gpsCollapseRatio"] == round(30 / len(priors), 2),
          f"{stats}")
    check("altitude presence reported", stats["gpsHasAltitude"] is True)


def test_missing_name_skipped():
    f = kf("x", 100.0, fix_time=100.0)
    f.pop("image_name")
    check("keyframe with no name is skipped, not crashed", build_gps_priors([f]) == [])


if __name__ == "__main__":
    for fn in [v for k, v in sorted(globals().items()) if k.startswith("test_")]:
        print(fn.__name__)
        fn()
    print()
    if FAILURES:
        raise SystemExit(f"{len(FAILURES)} failed: {FAILURES}")
    print("all gps_priors tests passed")
