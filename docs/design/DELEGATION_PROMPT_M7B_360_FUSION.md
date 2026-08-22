# Delegation Prompt — M7-B: fusing 360 camera footage into the LiDAR mesh

Give this to another AI platform. It needs no repo access. It has **two parts**: a
research/analysis question, then code. Answer the research part first — the code depends
on the recommendation.

---

## Context you need

A construction reality-capture pipeline. For one interior space we hold:

**A. iPhone Pro LiDAR capture** — a single continuous ARSession walk. Produces:
- A binary depth stream: per frame, a 256×192 uint16 millimetre depth map, a uint8
  confidence map, and a **full-resolution JPEG (1920×1440)** from the phone's rear camera.
- A poses JSON: per frame, `transform_4x4` (camera-to-world, **column-major**, ARKit
  convention: **+Y up, camera looks down its own −Z**), pinhole `intrinsics {fx, fy, cx, cy}`
  at RGB resolution, plus `w`/`h` and a timestamp in ARSession time.
- A LiDAR point cloud PLY.

This is already working. TSDF fusion of the depth stream produces a metric, gravity-aligned
triangle mesh — validated at 14.12 m diagonal against a 13.71 m LiDAR ground truth, with a
storey height measuring 9.12 ft against a 9 ft standard. Projective texturing from the
1920×1440 JPEGs (`bake_vertex_colors`, occlusion-tested, quality-weighted) currently colours
**94,807 of 129,398 vertices from a mean of 13.3 views each**; the remaining 34,591 stay
neutral grey because no camera saw them.

**B. Insta360 X4 360 video** — the same room, same visit, walked separately. Two passes, one
above head height and one lower. Equirectangular video. **No poses, no intrinsics, no
timestamp shared with the ARSession.** The operator is visible in frame.

## The problem

The 360 camera saw far more of the room, at higher resolution, than the phone did — including
walls and ceiling the LiDAR only grazed. Right now none of it reaches the mesh. We need those
frames to become additional inputs to the same projective texturing step, which requires
their cameras to sit **in the same coordinate frame as the ARKit poses**.

## PART 1 — Research and recommend (answer before writing code)

Compare the realistic options for placing 360 frames into an existing metric, gravity-aligned
mesh's coordinate frame. For each: how it works, what it needs, how it fails, and how much
manual input it requires.

Consider at least:
1. **COLMAP registration of 360 frames against the phone frames** — cube-face unwrapping,
   then feature matching phone↔360, then solving 360 poses in the ARKit frame.
2. **Direct mesh-to-image alignment** — render the mesh from a hypothesised 360 pose and
   optimise pose against photometric or edge agreement with the equirect frame.
3. **Trajectory alignment** — solve the 360 walk independently (SfM, arbitrary scale/frame),
   then fit a similarity transform between that trajectory and the ARKit trajectory.
4. Anything better we have not listed.

**Constraints that decide this:**
- **Licence-critical.** Runtime dependencies must be MIT/BSD/Apache. **AGPL is banned
  outright** (network-copyleft reaches a SaaS). GPL is tolerated ONLY as a standalone
  server-side binary invoked as a subprocess, never linked. COLMAP (GPL binary) is
  therefore acceptable as a subprocess; anything AGPL is not, at any distance.
- Runs unattended on a cloud CPU/GPU worker, **hard ceiling 2 hours per job**.
- Must FAIL LOUDLY rather than produce a confident wrong alignment. A misaligned 360 frame
  smears a wall's texture across the room, which is worse than leaving the wall grey.
- The operator is visible in the 360 footage and must not be baked into surfaces.
- Assume no GPS, no markers, no manual tie points **unless you argue a small fixed number
  (e.g. 3 clicks) is the honest price** — if so, say exactly what the operator clicks.

Then state a clear recommendation: **which approach we should build first, and why**, plus
what accuracy to expect and how we would know it failed. Cite real projects/papers where
relevant, and flag anything you are unsure about rather than guessing.

## PART 2 — Write the code for your recommended approach

Two files: `equirect_frames.py` and `test_equirect_frames.py`. No others.

### Hard constraints
- **Python 3.10.** Imports: `numpy`, `open3d` 0.18, `PIL`, and the standard library.
  **Nothing else** — no OpenCV, no scipy, no torch. If your recommendation genuinely needs
  an external binary (e.g. COLMAP), invoke it via `subprocess` and treat absence as a
  `skipped` reason, never a crash.
- Licence rules exactly as in Part 1. State the licence of anything you invoke.
- Import `numpy`/`open3d`/`PIL` **inside functions** so pure-maths helpers stay testable
  where they are absent.
- Every public function: full type-annotated signature; docstring says what it does **and
  what it does on degenerate input**. No `print` — return stats dicts. Never raise on
  "could not do it": return a `skipped` reason.
- Under 400 lines (this one may exceed 300; say so if it must).

### Required functions, regardless of approach

1. `equirect_to_cube_faces(equirect_image, face_size=1024) -> dict[str, np.ndarray]`
   Convert one equirectangular frame to six perspective cube faces keyed
   `"front" | "right" | "back" | "left" | "up" | "down"`. Each face is a normal pinhole image
   with a **90° FOV**, so it can be fed to an existing projective texturer that expects
   `{fx, fy, cx, cy}`. State the equirect convention you assume (where θ=0 points, which way
   v increases) in the docstring — a wrong convention rotates the whole room and is the
   single easiest way to get this silently wrong.

2. `cube_face_intrinsics(face_size) -> dict[str, float]`
   The pinhole intrinsics of a 90° face. Trivial, but every downstream projection depends
   on it, so it gets its own function and its own test.

3. `cube_face_rotation(face_name) -> np.ndarray`
   3×3 rotation taking the cube face's camera frame into the 360 rig's frame. Must be
   exactly orthonormal (`R @ R.T ≈ I`, `det = +1`), built from exact 0/±1 entries rather
   than from `cos(pi/2)` floating-point noise.

4. `frames_from_equirect(equirect_image, rig_transform_4x4, *, face_size=1024, faces=None) -> list[dict]`
   Produce texturer-ready frame dicts: `{"image": np.ndarray, "transform": list[float] (16,
   column-major), "intrinsics": dict, "width": int, "height": int, "face": str}`. Composes
   the rig pose with each face rotation. `faces=None` means all six; callers usually skip
   `"down"` (it is mostly the operator and the tripod) and should be able to.

5. Whatever your recommended alignment approach needs, as named functions with the same
   contract — e.g. `estimate_rig_poses(...) -> dict` returning poses plus a per-pose
   confidence and an overall `verdict` in `{"aligned", "ambiguous", "failed"}`. **Refusing
   must be a first-class, tested outcome.**

6. `operator_mask_for_face(face_image, face_name) -> np.ndarray | None`
   A boolean mask of pixels to EXCLUDE from texturing. At minimum, mask the nadir region of
   the `"down"` face where the operator and pole always are. Return None when nothing should
   be masked. Do **not** use Ultralytics/YOLO — it is AGPL and banned here.

### Tests (`test_equirect_frames.py`)
pytest. Pure-maths tests must pass **without Open3D**; guard the rest with
`pytest.importorskip`. At least 20 assertions. Cover:
1. `cube_face_intrinsics` — for a 90° face, `fx == fy == face_size / 2` and the principal
   point is the centre. Assert the arithmetic explicitly.
2. `cube_face_rotation` — all six faces orthonormal with `det = +1`; `"front"` is identity
   (or state and test your chosen convention); opposite faces are 180° apart.
3. `equirect_to_cube_faces` — build a synthetic equirect where each of the six directions is
   a distinct solid colour, then assert **each face comes back the correct colour**. This is
   the test that catches a flipped or rotated convention, so make it decisive.
4. `equirect_to_cube_faces` on a 1×1 image, an empty array, and a non-equirect aspect ratio
   → skips or degrades, never raises.
5. `frames_from_equirect` — returns 6 frames by default, 5 when `"down"` is excluded, each
   with a 16-element column-major transform, and composing rig ⊗ face gives an orthonormal
   rotation.
6. `operator_mask_for_face` — masks a nadir region on `"down"`, returns None for `"up"`.
7. Your alignment function: a synthetic case that succeeds, and a synthetic case with
   insufficient overlap that returns `verdict="failed"` rather than a plausible transform.

## Deliverable

First the Part 1 analysis in prose — options, trade-offs, a clear recommendation, expected
accuracy, and failure signals. Then the two complete files in full. No partial snippets, no
"unchanged" markers.

Where a requirement is ambiguous, choose the option that **refuses rather than guesses**. A
360 frame placed 30 cm wrong paints a kitchen cabinet onto the wall behind it, and nobody
looking at the result can tell it is wrong.
