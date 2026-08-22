# Delegation Prompt — M4 dollhouse post-processing module

Give this to another AI platform. It needs no repo access. Paste the returned code back
verbatim; it is a single self-contained file plus its test file.

---

Write a single Python module named `mesh_dollhouse.py` and its pytest file
`test_mesh_dollhouse.py`. No other files. It will be dropped into an existing project
unchanged, so follow the constraints exactly.

## Hard constraints

- **Python 3.10.** Imports allowed: `numpy`, `open3d` (0.18), and the standard library.
  **Nothing else.** No scipy, no trimesh, no pymeshlab, no matplotlib.
- **Licence-critical:** every algorithm must be implementable with Open3D (MIT) + numpy (BSD).
  Do **not** use, suggest, or import anything GPL/AGPL (no CGAL, no OpenMVS, no PoissonRecon
  wrappers, no Ultralytics).
- Import `open3d` and `numpy` **inside functions**, not at module top level (the module is
  imported in environments where Open3D is unavailable, and the pure-math helpers must still
  be importable and testable there).
- Every public function gets a full type-annotated signature and a docstring saying what it
  does **and what it does when the input is degenerate**.
- No `print`. Return stats in dicts.
- Never raise on "nothing found" — return the input unchanged plus a stat saying it was
  skipped. This runs unattended on a server; a missing ceiling must not fail a job.
- Keep the whole module under 300 lines.

## Domain context

Input is a triangle mesh of a **single interior room**, produced by TSDF fusion of iPhone
LiDAR depth. It is metric (metres), gravity-aligned with **+Y up** (ARKit convention), and it
has honest holes where the sensor measured nothing (windows, glass, surfaces beyond ~5 m).
A typical room is 3–12 m across with a 2.4–3.0 m ceiling. Meshes arrive with 200k–2M triangles.

The goal is a "dollhouse" view: the room seen from above with the **ceiling removed** and the
walls intact, plus clean enough geometry for measurement.

## Required public functions

### 1. `detect_horizontal_planes(mesh, *, up_axis=1, min_inlier_fraction=0.02, distance_threshold=0.03) -> dict`

Find the floor and ceiling. Use Open3D RANSAC plane segmentation (`segment_plane`) on the
mesh vertices, iteratively, keeping only planes whose normal is within ~15° of the up axis.

Return:
```python
{
  "floor_y": float | None,       # world Y of the floor plane
  "ceiling_y": float | None,     # world Y of the ceiling plane
  "floor_inliers": int,
  "ceiling_inliers": int,
  "skipped": str | None,         # e.g. "no_horizontal_planes"
}
```
Rules that matter:
- The **floor is the lowest** qualifying horizontal plane with a substantial inlier count, and
  the **ceiling is the highest**. Do not simply take the two largest planes — a desk or
  countertop can out-vote a partially-occluded floor.
- Require `ceiling_y - floor_y >= 1.8` metres to accept them as a pair; otherwise return the
  floor and `ceiling_y = None`. A 1.2 m gap means a countertop was mistaken for a ceiling.
- If fewer than `min_inlier_fraction` of vertices support a plane, treat it as absent.

### 2. `cut_ceiling(mesh, ceiling_y, *, margin=0.05) -> tuple[mesh, dict]`

Remove every triangle whose **centroid** is above `ceiling_y - margin`. Use centroids, not
vertices, so wall triangles touching the ceiling are kept rather than punched out. Return the
modified mesh and `{"triangles_removed": int, "cut_y": float}`. If `ceiling_y is None`,
return the mesh unchanged with `{"skipped": "no_ceiling"}`.

### 3. `snap_walls_to_manhattan(mesh, *, up_axis=1, angle_tolerance_deg=12.0, distance_threshold=0.04) -> tuple[mesh, dict]`

Vertical surfaces from TSDF are slightly wavy. Straighten them:
1. Segment vertical planes (normal within `angle_tolerance_deg` of horizontal).
2. Cluster their normals' **horizontal heading** into up to 4 dominant directions ~90° apart
   (Manhattan-world assumption). Compute headings modulo 90° to find the dominant grid angle,
   then assign each plane to the nearest of the 4 axes.
3. For each plane, project its inlier vertices onto the snapped plane, but **only move a
   vertex if the displacement is under `distance_threshold`** — never drag geometry across
   the room to satisfy the assumption.

Return the mesh and `{"planes_snapped": int, "vertices_moved": int, "grid_angle_deg": float}`.
If no dominant grid emerges, return unchanged with `{"skipped": "no_manhattan_grid"}`.

### 4. `decimate(mesh, target_triangles=250_000) -> tuple[mesh, dict]`

Quadric decimation via Open3D. No-op if already at or below target. Return
`{"before": int, "after": int}`.

### 5. `build_dollhouse(mesh, *, target_triangles=250_000) -> tuple[mesh, dict]`

Orchestrator: detect planes → cut ceiling → snap walls → decimate. Return the mesh and a
merged stats dict with a top-level `"extent"` (list of 3 floats) and `"extent_diagonal"`
(float) measured **after** all operations, plus each stage's stats nested under its own key.

### 6. Pure helpers that must be testable WITHOUT Open3D

Put the maths in free functions that take and return numpy arrays, so they can be unit-tested
where Open3D is not installed:

- `dominant_grid_angle(normals: np.ndarray, *, up_axis: int = 1) -> float | None`
  Given an (N,3) array of plane normals, return the dominant Manhattan grid angle in degrees
  in `[0, 90)`, or `None` if the normals are not clustered. Use a circular mean of headings
  taken modulo 90°.
- `snap_heading(heading_deg: float, grid_angle_deg: float) -> float`
  Snap one heading to the nearest of the 4 grid axes.
- `plane_is_horizontal(normal: np.ndarray, up_axis: int, tolerance_deg: float) -> bool`
- `plane_is_vertical(normal: np.ndarray, up_axis: int, tolerance_deg: float) -> bool`

## Tests required (`test_mesh_dollhouse.py`)

Use **pytest**, no fixtures beyond `tmp_path`. Tests must run and pass **without Open3D
installed** — so test only the pure helpers, and mark any Open3D-dependent test with
`pytest.importorskip("open3d")`.

Cover at minimum:
1. `plane_is_horizontal` / `plane_is_vertical` for exactly up, exactly sideways, and 10°/20° off.
2. `dominant_grid_angle` on a synthetic set of normals at 0°/90°/180°/270° → returns ~0.
3. `dominant_grid_angle` on the same set rotated by 30° → returns ~30.
4. `dominant_grid_angle` on random uniform normals → returns `None`.
5. `snap_heading`: 47° with grid 0 → 45? **No** — with a 4-axis grid at 0 the axes are
   0/90/180/270, so 47 → 90. Assert that behaviour explicitly, and cover the wrap case
   (e.g. 359° with grid 0 → 0).
6. A degenerate case for each public Open3D function returning a `skipped` stat rather than
   raising (guard these with `importorskip`).

## Deliverable

Return the two complete files in full, nothing else. No prose explanation, no partial
snippets, no "rest of the file unchanged" markers. If a requirement is ambiguous, choose the
option that fails safe on a server (skip and report, never raise) and note the choice in the
function's docstring.
