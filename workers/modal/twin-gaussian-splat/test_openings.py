"""Tests for openings.py — run: python test_openings.py

Builds synthetic walls with known openings and checks the reported NET area against the exact
answer. Also checks the cases the module is meant to refuse: occlusion shadows and scan gaps.
"""

from __future__ import annotations

import random

import numpy as np

from openings import CELL_M, detect_openings, project_to_wall

FAILURES: list[str] = []
random.seed(7)


def check(name: str, cond: bool, detail: str = "") -> None:
    if cond:
        print(f"  ok   {name}")
    else:
        print(f"  FAIL {name} {detail}")
        FAILURES.append(name)


def wall_points(length, height, holes=(), *, density=4000.0, jitter=0.0, drop=()):
    """Dense samples on a wall, minus rectangular `holes` and minus any `drop` regions.

    holes/drop are (along0, along1, h0, h1). `holes` are real openings; `drop` simulates
    missing data that is NOT an opening.

    Default density is 4000 pts/m2 -> ~10 points per 5 cm cell. That is the regime fused
    iPhone LiDAR actually produces at 1-2 m standoff; sampling below ~2 points per cell makes
    a solid wall LOOK like holes and tests the raster rather than the detector.
    """
    n = int(length * height * density)
    pts = []
    for _ in range(n):
        a = random.uniform(0, length)
        h = random.uniform(0, height)
        if any(a0 <= a <= a1 and h0 <= h <= h1 for a0, a1, h0, h1 in holes):
            continue
        if any(a0 <= a <= a1 and h0 <= h <= h1 for a0, a1, h0, h1 in drop):
            continue
        if jitter:
            a += random.gauss(0, jitter)
            h += random.gauss(0, jitter)
        pts.append((a, h))
    return pts


def test_solid_wall_has_no_openings():
    r = detect_openings(wall_points(6.0, 2.7), 6.0, 2.7)
    check("solid wall: no openings found", r.openings == [], f"got {len(r.openings)}")
    check("solid wall: net == gross", abs(r.net_m2 - r.gross_m2) < 1e-9)
    check("solid wall: coverage high", r.coverage > 0.95, f"{r.coverage:.2f}")
    check("solid wall: nothing unaccounted", r.unaccounted_m2 == 0.0,
          f"got {r.unaccounted_m2:.2f} m2")


def test_single_window_area_and_classification():
    # 1.5 x 1.2 window with a 0.9 m sill.
    hole = (2.0, 3.5, 0.9, 2.1)
    r = detect_openings(wall_points(6.0, 2.7, [hole]), 6.0, 2.7)
    check("window: exactly one opening", len(r.openings) == 1, f"got {len(r.openings)}")
    if r.openings:
        o = r.openings[0]
        check("window: classified as window", o.kind == "window", f"got {o.kind}")
        check("window: width within one cell", abs(o.width_m - 1.5) <= 2 * CELL_M,
              f"got {o.width_m}")
        check("window: height within one cell", abs(o.height_m - 1.2) <= 2 * CELL_M,
              f"got {o.height_m}")
        check("window: sill within one cell", abs(o.sill_m - 0.9) <= 2 * CELL_M,
              f"got {o.sill_m}")
    expected_net = 6.0 * 2.7 - 1.5 * 1.2
    check("window: net area within 3% of exact",
          abs(r.net_m2 - expected_net) / expected_net < 0.03,
          f"got {r.net_m2:.2f} want {expected_net:.2f}")


def test_door_reaching_the_floor_is_found_and_classified():
    hole = (1.0, 1.9, 0.0, 2.05)  # 0.9 x 2.05 door, sill 0
    r = detect_openings(wall_points(6.0, 2.7, [hole]), 6.0, 2.7)
    check("door: found", len(r.openings) == 1, f"got {len(r.openings)}")
    if r.openings:
        check("door: classified as door", r.openings[0].kind == "door",
              f"got {r.openings[0].kind}")
        check("door: sill at floor", r.openings[0].sill_m <= 2 * CELL_M)
    expected_net = 6.0 * 2.7 - 0.9 * 2.05
    check("door: net area within 4% of exact",
          abs(r.net_m2 - expected_net) / expected_net < 0.04,
          f"got {r.net_m2:.2f} want {expected_net:.2f}")


def test_commercial_window_band():
    # Storefront: four bays of glazing at the same sill.
    holes = [(0.5 + i * 2.0, 1.9 + i * 2.0, 0.8, 2.3) for i in range(4)]
    r = detect_openings(wall_points(9.0, 3.2, holes), 9.0, 3.2)
    check("storefront: four openings", len(r.openings) == 4, f"got {len(r.openings)}")
    check("storefront: all windows", all(o.kind == "window" for o in r.openings),
          f"got {[o.kind for o in r.openings]}")
    expected = 9.0 * 3.2 - 4 * 1.4 * 1.5
    check("storefront: net area within 4%", abs(r.net_m2 - expected) / expected < 0.04,
          f"got {r.net_m2:.2f} want {expected:.2f}")


def test_occlusion_shadow_is_not_subtracted():
    # A person-sized irregular gap: something stood in front of the wall while it was scanned.
    # Large enough to clear the noise floor, but ragged, so it must not become an "opening".
    ragged = []
    for i in range(24):
        h0 = 0.05 * i
        half = 0.30 + 0.22 * random.random()
        centre = 2.6 + 0.18 * random.random()
        ragged.append((centre - half, centre + half, h0, h0 + 0.06))
    r = detect_openings(wall_points(6.0, 2.7, drop=ragged), 6.0, 2.7)
    check("occlusion: not counted as an opening",
          all(o.rectangularity >= 0.80 for o in r.openings))
    check("occlusion: net stays close to gross",
          (r.gross_m2 - r.net_m2) < 0.5, f"subtracted {r.gross_m2 - r.net_m2:.2f} m2")
    check("occlusion: shadow reported as unaccounted, not silently ignored",
          r.unaccounted_m2 > 0.3, f"got {r.unaccounted_m2:.2f} m2")


def test_speckle_does_not_inflate_unaccounted():
    # Sub-threshold empty specks are noise, not missing wall — they must NOT be reported as
    # unaccounted area or every real scan would carry a spurious warning.
    r = detect_openings(wall_points(6.0, 2.7, jitter=0.02), 6.0, 2.7)
    check("speckle: unaccounted stays at zero", r.unaccounted_m2 == 0.0,
          f"got {r.unaccounted_m2:.2f} m2")


def test_edge_gap_is_not_an_opening():
    # The scan stopped 1 m short of the far end of the wall. That is missing data, not a hole.
    r = detect_openings(wall_points(6.0, 2.7, drop=[(5.0, 6.0, 0.0, 2.7)]), 6.0, 2.7)
    check("edge gap: not subtracted", r.opening_area_m2 == 0.0,
          f"subtracted {r.opening_area_m2:.2f} m2")
    # Overall coverage stays ~83% here, so the coverage warning alone would not fire — a
    # whole unscanned bay must be surfaced on its own or we silently price a wall we never saw.
    check("edge gap: unscanned area accounted separately", r.unaccounted_m2 > 2.0,
          f"got {r.unaccounted_m2:.2f} m2")
    check("edge gap: warns that solid wall was assumed",
          any("counted as solid" in w for w in r.warnings), f"{r.warnings}")


def test_sparse_wall_refuses_to_guess():
    sparse = wall_points(6.0, 2.7, density=400.0)
    r = detect_openings(sparse, 6.0, 2.7)
    check("sparse wall: reports gross, subtracts nothing", r.net_m2 == r.gross_m2)
    check("sparse wall: says why", any("too low" in w for w in r.warnings), f"{r.warnings}")


def test_noise_speckle_does_not_create_openings():
    r = detect_openings(wall_points(6.0, 2.7, jitter=0.02), 6.0, 2.7)
    big = [o for o in r.openings if o.area_m2 > 0.3]
    check("speckle: no large spurious openings", big == [], f"got {big}")


def test_confidence_downgrades_with_coverage():
    hole = (2.0, 3.5, 0.9, 2.1)
    good = detect_openings(wall_points(6.0, 2.7, [hole]), 6.0, 2.7)
    thin = detect_openings(wall_points(6.0, 2.7, [hole], density=900.0), 6.0, 2.7)
    check("confidence: dense scan measured",
          good.openings and good.openings[0].confidence == "measured")
    check("confidence: thin scan not claimed as measured",
          all(o.confidence != "measured" for o in thin.openings))


def test_projection_selects_the_right_points():
    # Wall along +X at y=0; a distractor plane 1 m away must be excluded.
    pts = [(x, 0.0, z) for x in np.arange(0, 4, 0.05) for z in np.arange(0, 2.5, 0.05)]
    pts += [(x, 1.0, z) for x in np.arange(0, 4, 0.1) for z in np.arange(0, 2.5, 0.1)]
    proj = project_to_wall(pts, (0.0, 0.0), (4.0, 0.0), floor_z=0.0)
    check("projection: distractor plane excluded", len(proj) == 80 * 50,
          f"got {len(proj)}")
    check("projection: along within wall extent", all(0 <= a <= 4.0 for a, _ in proj))
    check("projection: heights non-negative", all(h >= 0 for _, h in proj))


def test_projection_handles_degenerate_wall():
    check("projection: zero-length wall returns empty",
          project_to_wall([(0, 0, 0)], (1.0, 1.0), (1.0, 1.0), 0.0) == [])
    check("projection: no points returns empty",
          project_to_wall([], (0.0, 0.0), (4.0, 0.0), 0.0) == [])


def test_as_dict_is_serialisable():
    import json
    r = detect_openings(wall_points(6.0, 2.7, [(2.0, 3.5, 0.9, 2.1)]), 6.0, 2.7)
    json.dumps(r.as_dict())
    check("as_dict: JSON serialisable and carries net area", "netM2" in r.as_dict())


if __name__ == "__main__":
    for fn in [v for k, v in sorted(globals().items()) if k.startswith("test_")]:
        print(fn.__name__)
        fn()
    print()
    if FAILURES:
        raise SystemExit(f"{len(FAILURES)} failed: {FAILURES}")
    print("all openings tests passed")
