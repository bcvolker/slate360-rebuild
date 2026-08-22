# Delegation Prompt — REG-1 scan-to-scan mesh registration

Give this to another AI platform. It needs no repo access. Paste the returned code back
verbatim; it is a single self-contained module plus its test file.

**Why this one first:** it is the single highest-leverage unbuilt piece. Pin persistence,
progression compare, discipline overlays, and drawing comparison are all the same problem
wearing different hats — put two captures of one building into one coordinate frame.

---

Write a Python module `mesh_registration.py` and its pytest file `test_mesh_registration.py`.
No other files. It drops into an existing project unchanged, so follow the constraints exactly.

## Hard constraints

- **Python 3.10.** Imports allowed: `numpy`, `open3d` (0.18), standard library. **Nothing else.**
  No scipy, no trimesh, no sklearn.
- **Licence-critical:** Open3D (MIT) + numpy (BSD) only. Do **not** use, import, or suggest
  anything GPL/AGPL — no CGAL, no PCL, no Ultralytics, no teaserpp.
- Import `open3d` and `numpy` **inside functions**, never at module top level, so the pure-maths
  helpers stay importable and testable where Open3D is absent.
- Every public function: full type-annotated signature, and a docstring stating what it does
  **and what it does when the input is degenerate**.
- No `print`. Return stats in dicts. Never raise on "could not align" — return a result whose
  `confidence` is low and whose `skipped` says why. This runs unattended on a server.
- Whole module under 300 lines.

## Domain context

Two triangle meshes of the **same interior space**, produced by TSDF fusion of iPhone LiDAR
depth, captured **weeks or months apart** during active construction. Both are metric (metres)
and gravity-aligned with **+Y up** (ARKit convention). Each is 200k–2M triangles.

Between captures, real things changed: framing became drywall, a wall got built, equipment
moved, and each scan covers a slightly different extent because the operator walked a
different route. Assume **40–80% of surface area genuinely corresponds**, and that the rest
is legitimately different — not noise to be averaged away.

### The constraint that makes this tractable

Both meshes are **already gravity-aligned**. So this is **not** a 6-DOF problem. The only
unknowns are **yaw (rotation about Y) and 3-D translation — 4 DOF**. Exploit this everywhere:
search yaw only, never full SO(3). A solution that tilts one scan relative to the other is
wrong by construction, because gravity does not change between visits.

### The failure that matters most

A confidently-wrong transform is far worse than an admitted failure. It silently relocates
every pin the client placed. **Refusing to align must be a first-class, well-tested outcome.**
Corridors and repetitive rooms are genuinely ambiguous — a hallway can align to itself
offset by one doorway and score well. Detect and refuse that.

## Required public functions

### 1. `estimate_yaw_translation(source_pts, target_pts, *, yaw_step_deg=2.0) -> dict`

Coarse 4-DOF alignment on downsampled points, **pure numpy, no Open3D** so it is testable
anywhere. Brute-force yaw over `[0, 360)` at `yaw_step_deg`; for each candidate yaw, rotate the
source about Y, take the translation that aligns the two centroids, and score with a cheap
symmetric nearest-neighbour proxy (a coarse voxel-hash occupancy overlap is fine and is
preferred over an O(N²) distance matrix — say which you chose and why in the docstring).

Return `{"yaw_deg": float, "translation": [float,float,float], "score": float,
"runner_up_score": float, "skipped": str | None}`.

`runner_up_score` is the best score at a yaw **at least 20° away** from the winner. It exists
so the caller can detect rotational ambiguity, so compute it honestly.

### 2. `refine_icp(source_mesh, target_mesh, initial_transform, *, max_distance=0.10) -> dict`

Point-to-plane ICP via Open3D (`registration_icp`), seeded with `initial_transform`. Run
multi-scale: voxel sizes 0.10 → 0.05 → 0.02, each stage seeding the next.

Return `{"transform": 4x4 list[list[float]], "fitness": float, "inlier_rmse": float,
"correspondences": int, "skipped": str | None}`.

**Constrain the result to 4 DOF.** ICP will happily introduce roll and pitch from noise;
after each stage, project the rotation back onto a pure-Y rotation. Write a helper
`project_to_yaw(transform: np.ndarray) -> np.ndarray` that does this and is testable without
Open3D — it must return an exactly orthonormal matrix, not an approximately orthonormal one.

### 3. `registration_confidence(fitness, inlier_rmse, score, runner_up_score) -> dict`

Turn raw numbers into a decision. Return
`{"confidence": float in [0,1], "verdict": "aligned"|"ambiguous"|"failed", "reasons": list[str]}`.

Rules that must hold:
- `fitness < 0.30` → `"failed"`. Too little overlap to trust anything.
- `inlier_rmse > 0.08` m → at best `"ambiguous"`. Centimetre work needs centimetre residuals.
- `runner_up_score > 0.9 * score` → `"ambiguous"` with reason `"rotational_ambiguity"`, even
  when fitness is excellent. **This is the corridor case and it is the point of the function.**
- `"aligned"` requires fitness ≥ 0.5, rmse ≤ 0.05, and no ambiguity.

### 4. `register_meshes(source_mesh, target_mesh, *, voxel_size=0.05) -> tuple[np.ndarray, dict]`

Orchestrator: sample both meshes to point clouds → `estimate_yaw_translation` → `refine_icp` →
`registration_confidence`. Return the 4×4 transform mapping **source into target's frame**, and
a merged stats dict with each stage nested under its own key plus top-level `"verdict"` and
`"confidence"`. On `"failed"`, still return a transform — the identity — so callers never get
`None` and never crash; the verdict is what they must check.

### 5. `transform_point(point, transform) -> tuple[float, float, float]`

Apply a 4×4 to a single 3-D point. Trivial, but it is the function that actually moves a
client's pin between scans, so it gets its own test.

## Tests required (`test_mesh_registration.py`)

pytest. Pure-maths tests must pass **without Open3D installed**; guard Open3D tests with
`pytest.importorskip("open3d")`. At least 20 assertions.

Cover at minimum:
1. `project_to_yaw` on a pure 30° Y-rotation returns it unchanged (to 1e-9).
2. `project_to_yaw` on a rotation with roll and pitch mixed in strips them, and the result is
   exactly orthonormal (`R @ R.T ≈ I`, `det(R) ≈ +1`).
3. `estimate_yaw_translation` recovers a known 25° yaw + `[1.0, 0, -0.5]` translation applied to
   a synthetic asymmetric point set, within one `yaw_step_deg`.
4. `estimate_yaw_translation` on a **4-fold rotationally symmetric** point set reports
   `runner_up_score` close to `score` — the ambiguity is detected, not hidden.
5. `registration_confidence` returns `"failed"` on low fitness; `"ambiguous"` on high rmse;
   `"ambiguous"` on a close runner-up **even with perfect fitness and rmse**; `"aligned"` only
   when everything is good.
6. `transform_point` under identity, under pure translation, and under a 90° yaw.
7. A degenerate case per public function returning a `skipped`/`failed` result rather than raising:
   empty input, single point, and two clouds with no overlap at all.

## Deliverable

Return the two complete files in full, nothing else. No prose, no partial snippets, no "rest
unchanged" markers. Where a requirement is ambiguous, choose the option that **refuses rather
than guesses**, and say so in the docstring — a wrong transform moves a client's pins to the
wrong wall, and nobody finds out for months.
