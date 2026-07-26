"""Ground-truth tests for floorplan.py.

Synthesises point clouds for rooms of KNOWN dimensions (with realistic LiDAR noise, a floor,
a ceiling, and furniture clutter), runs the extraction, and asserts the recovered area matches
the true area. Because the ground truth is exact, these tests measure real accuracy rather than
just exercising code paths.

Run: python3 workers/modal/twin-gaussian-splat/test_floorplan.py
"""

from __future__ import annotations

import math
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).parent))
from floorplan import compute_plan, to_square_feet  # noqa: E402

RNG = np.random.default_rng(42)
NOISE_M = 0.015  # ~1.5 cm, consistent with published iPhone-LiDAR room-scale error


def wall_points(p0, p1, height, floor_z, density=900):
    """Points on a vertical wall from p0 to p1, full height, with gaussian noise."""
    (x0, y0), (x1, y1) = p0, p1
    length = math.hypot(x1 - x0, y1 - y0)
    n = max(50, int(length * density))
    t = RNG.random(n)
    x = x0 + (x1 - x0) * t
    y = y0 + (y1 - y0) * t
    z = floor_z + RNG.random(n) * height
    pts = np.column_stack([x, y, z])
    return pts + RNG.normal(0, NOISE_M, pts.shape)


def slab(x0, x1, y0, y1, z, n=4000):
    x = RNG.uniform(x0, x1, n)
    y = RNG.uniform(y0, y1, n)
    zz = np.full(n, z) + RNG.normal(0, NOISE_M, n)
    return np.column_stack([x, y, zz])


def make_room(width, depth, height=2.6, clutter=True, origin=(0.0, 0.0)):
    """Rectangular room of exact interior dimensions width x depth."""
    ox, oy = origin
    fz = 0.0
    corners = [
        (ox, oy), (ox + width, oy), (ox + width, oy + depth), (ox, oy + depth),
    ]
    parts = [slab(ox, ox + width, oy, oy + depth, fz),
             slab(ox, ox + width, oy, oy + depth, fz + height)]
    for i in range(4):
        parts.append(wall_points(corners[i], corners[(i + 1) % 4], height, fz))
    if clutter:
        # Furniture: a waist-high box that must NOT be mistaken for a wall.
        parts.append(slab(ox + 1.0, ox + 2.2, oy + 1.0, oy + 2.0, fz + 0.75, n=1500))
    return np.vstack(parts)


def check(name, cloud, true_area, tol_pct):
    plan = compute_plan(cloud)
    ok = plan.floor_area_m2 is not None
    err = None
    if ok:
        err = abs(plan.floor_area_m2 - true_area) / true_area * 100.0
        ok = err <= tol_pct
    status = "PASS" if ok else "FAIL"
    area = "—" if plan.floor_area_m2 is None else f"{plan.floor_area_m2:7.2f}"
    sqft = "—" if plan.floor_area_m2 is None else f"{to_square_feet(plan.floor_area_m2):8.1f}"
    errs = "—" if err is None else f"{err:5.2f}%"
    print(f"  [{status}] {name:<26} true={true_area:7.2f} m²  got={area} m² ({sqft} ft²)  err={errs}"
          f"  walls={len(plan.walls):2d}  h={plan.ceiling_height_m}")
    if plan.notes:
        print(f"          notes: {plan.notes}")
    return ok


def main() -> int:
    print("\nFloor-plan extraction vs known ground truth (noise σ=1.5 cm)\n")
    results = []

    # Tolerance reflects the honest claim: estimating-grade, ±2-5 cm on dimensions, which on a
    # small room is a few percent of area.
    results.append(check("4.0 x 3.0 m bedroom", make_room(4.0, 3.0), 12.0, 4.0))
    results.append(check("6.0 x 4.5 m living room", make_room(6.0, 4.5), 27.0, 4.0))
    results.append(check("10.0 x 7.0 m open plan", make_room(10.0, 7.0), 70.0, 4.0))
    results.append(check("2.5 x 2.0 m bathroom", make_room(2.5, 2.0), 5.0, 6.0))
    results.append(check("8.0 x 3.0 m corridor", make_room(8.0, 3.0), 24.0, 4.0))
    results.append(
        check("5 x 4 m, no clutter", make_room(5.0, 4.0, clutter=False), 20.0, 4.0)
    )
    results.append(
        check("offset origin (-12,+7)", make_room(4.0, 5.0, origin=(-12.0, 7.0)), 20.0, 4.0)
    )

    print("\nDegenerate inputs (must not crash):")
    empty = compute_plan(np.zeros((5, 3)))
    print(f"  [{'PASS' if empty.floor_area_m2 is None else 'FAIL'}] tiny cloud -> notes={empty.notes}")
    results.append(empty.floor_area_m2 is None)

    floor_only = compute_plan(slab(0, 5, 0, 4, 0.0, n=6000))
    ok_fo = floor_only.floor_area_m2 is None
    print(f"  [{'PASS' if ok_fo else 'FAIL'}] floor with no walls -> notes={floor_only.notes}")
    results.append(ok_fo)

    passed, total = sum(results), len(results)
    print(f"\n{passed}/{total} passed\n")
    return 0 if passed == total else 1


if __name__ == "__main__":
    raise SystemExit(main())
