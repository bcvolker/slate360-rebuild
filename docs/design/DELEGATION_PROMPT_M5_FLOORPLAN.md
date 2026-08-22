# Delegation Prompt — M5 floor plan + area take-off from the mesh

Give this to another AI platform. It needs no repo access. Paste the returned code back
verbatim; it is a single self-contained module plus its test file.

**Why this one:** it is the same-day, CPU-only deliverable. The TSDF mesh returns in minutes
while the photoreal layer takes hours, so a measurable floor plan is what gets sold on the
day of the scan.

---

Write a Python module `mesh_floorplan.py` and its pytest file `test_mesh_floorplan.py`.
No other files. It drops into an existing project unchanged, so follow the constraints exactly.

## Hard constraints

- **Python 3.10.** Imports allowed: `numpy`, `open3d` (0.18), standard library. **Nothing else.**
  No scipy, no shapely, no matplotlib, no opencv.
- **Licence-critical:** Open3D (MIT) + numpy (BSD) only. Nothing GPL/AGPL — no CGAL, no
  shapely-via-GEOS, no pyclipper.
- Import `open3d` and `numpy` **inside functions**, never at module top level.
- Every public function: full type-annotated signature and a docstring saying what it does
  **and what it does when the input is degenerate**.
- No `print`. Return stats in dicts. Never raise on "nothing found" — skip and report.
- Whole module under 300 lines.

## Domain context

Input is the **dollhouse mesh**: a single-storey interior, TSDF-fused from iPhone LiDAR,
metric (metres), **+Y up**, with the ceiling already removed. Walls are near-vertical and have
been snapped toward a Manhattan grid, but are not perfectly planar. The mesh has **honest
holes** where the sensor measured nothing — windows, glass, mirrors, and anything past ~5 m.

The caller already knows `floor_y` and `ceiling_y` from RANSAC and passes them in. Do not
re-detect them.

**The trap that matters:** a hole in the mesh is not a doorway. A window the LiDAR saw straight
through leaves exactly the same absence as an open door. Any opening detection must distinguish
"the sensor returned nothing here" from "there is a real aperture here", and when it cannot,
it must report the opening as **unverified** rather than silently subtracting it from a wall
area a contractor will price off.

## Required public functions

### 1. `slice_at_height(mesh, height_y, *, thickness=0.10) -> np.ndarray`

Return the (N,2) array of XZ points from mesh vertices within `thickness/2` of `height_y`.
This is the horizontal cross-section the plan is built from. Slicing at ~1.2 m above the floor
is the convention — above furniture, below wall cabinets — but the caller chooses the height.
Empty input or no points in range returns a `(0,2)` array, never raises.

### 2. `fit_wall_segments(points_2d, *, distance_threshold=0.04, min_points=40, max_segments=40) -> list[dict]`

Iterative 2-D RANSAC line fitting on the cross-section. Each returned segment is
`{"start": [x, z], "end": [x, z], "length": float, "inliers": int, "angle_deg": float}`.

Rules:
- A segment's endpoints are the **extreme projections of its inliers onto the fitted line**,
  not the raw RANSAC sample points.
- Split a fitted line wherever its inliers have a gap **larger than 0.35 m** along the line —
  two collinear walls either side of a doorway are two segments, not one. This is the single
  most important behaviour in the function.
- Discard segments shorter than 0.30 m.

### 3. `close_floor_polygon(segments, *, snap_distance=0.25) -> dict`

Join wall segments into the largest closed loop you can, snapping endpoints within
`snap_distance`. Return `{"polygon": list[[x, z]], "closed": bool, "gap_count": int,
"skipped": str | None}`. If no loop closes, return the longest open chain with
`"closed": False` — a partial plan is useful, a crash is not.

### 4. `polygon_area(polygon) -> float`

Shoelace formula, absolute value, pure numpy. Fewer than 3 points returns `0.0`.

### 5. `detect_wall_openings(mesh, segment, floor_y, ceiling_y, *, min_width=0.5) -> list[dict]`

For one wall segment, find apertures. Build a 2-D occupancy grid on that wall's plane
(along-wall × height, ~5 cm cells), mark cells with nearby vertices as solid, and find
rectangular void regions.

Each opening: `{"kind": "door"|"window"|"unknown", "width": float, "height": float,
"sill_height": float, "area": float, "verified": bool}`.

Classification rules:
- `sill_height < 0.15` m and `height > 1.6` m → `"door"`.
- `sill_height >= 0.30` m → `"window"`.
- Anything else → `"unknown"`.
- **`verified` is `True` only when the void is bounded by solid cells on all four sides.**
  A void running off the top or the side of the wall is an unscanned region, not an opening,
  and must come back `verified: False`. Never guess a boundary to make a rectangle close.

### 6. `wall_area_takeoff(mesh, segments, floor_y, ceiling_y) -> dict`

Per segment and in total: `{"walls": [ {"length", "gross_area", "opening_area",
"net_area", "unverified_opening_area", "openings": [...]} ], "totals": {...}}`.

`gross_area = length * (ceiling_y - floor_y)`.
**`net_area` subtracts only `verified` openings.** Unverified void area is reported separately
in `unverified_opening_area` so a human can adjudicate it. Do not blend the two — a contractor
prices off `net_area`, and quietly subtracting a hole that was really a mirror under-bills them.

### 7. `build_floorplan(mesh, floor_y, ceiling_y, *, slice_height=1.2) -> dict`

Orchestrator: slice → fit segments → close polygon → openings → take-off. Returns a merged
dict with each stage nested under its own key, plus top-level `"floor_area"` (float, m²) and
`"perimeter"` (float, m).

## Tests required (`test_mesh_floorplan.py`)

pytest. Pure-maths tests must pass **without Open3D installed**; guard Open3D tests with
`pytest.importorskip("open3d")`. At least 18 assertions.

Cover at minimum:
1. `polygon_area` on a 4×3 rectangle → 12.0; on a triangle; on 2 points → 0.0; and identical
   for clockwise and counter-clockwise winding.
2. `fit_wall_segments` on a synthetic 4-wall rectangle returns 4 segments with the right lengths.
3. `fit_wall_segments` on **one straight line of points with a 0.9 m gap in the middle** returns
   **two** segments, not one. Assert this explicitly.
4. `close_floor_polygon` closes a clean 4-segment rectangle (`closed: True`, area 12.0 via
   `polygon_area`), and returns `closed: False` with a chain when one wall is missing.
5. `detect_wall_openings` on a synthetic wall with a floor-to-1.8 m gap → `"door"`; with a
   0.9 m-sill gap → `"window"`; with a void that reaches the top edge of the wall →
   `verified: False`.
6. `wall_area_takeoff`: a 4 m × 2.5 m wall with one verified 0.9×2.0 door → `gross_area` 10.0,
   `net_area` 8.2. Then the same wall with the door **unverified** → `net_area` stays 10.0 and
   `unverified_opening_area` is 1.8. Assert both.
7. Degenerate cases returning `skipped`/empty rather than raising: empty mesh, a slice with no
   points, segments that form no loop.

## Deliverable

Return the two complete files in full, nothing else. No prose, no partial snippets, no "rest
unchanged" markers. Where a requirement is ambiguous, choose the option that **reports
uncertainty rather than absorbing it into a number** — these figures go on a take-off a
contractor bids from.
