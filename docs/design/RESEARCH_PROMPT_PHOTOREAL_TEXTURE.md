# Research Request — why our LiDAR twin looks blurry, and how to make it photoreal

*Give this to several AI platforms. We want independent opinions, current research, and
specific open-source projects. Please challenge our diagnosis if you think it is wrong.*

---

You are advising a production reality-capture pipeline for construction documentation. We
have a working metric pipeline whose output does not *look* good enough to sell, and we
believe we have just found the reason. We want that diagnosis checked, and the best
licence-clean path to fixing it.

## The goal

One deliverable that is BOTH:

1. **Measurable** — estimating-grade dimensions a contractor can take off a wall or a room.
2. **Photoreal** — looks like the polished interior twins people post publicly. Good enough
   to document construction progress and to show completed work to a client.

## What we have, precisely

### Capture (iPhone Pro, working)

A single continuous ARKit session, multi-clip. Per keyframe:

- **Depth**: 256x192 `uint16` millimetre depth + 256x192 `uint8` confidence
- **Colour**: full-resolution **1920x1440 JPEG**
- **Pose**: `transform_4x4`, camera-to-world, column-major, ARKit (+Y up, gravity-aligned,
  camera looks down its own -Z)
- **Intrinsics**: pinhole `{fx: 1334.17, fy: 1334.17, cx: 967.59, cy: 720.45}` at RGB resolution
- Keyframes are distance-based: every 8 cm of travel or 8 degrees of rotation
- Separately: accumulated ARKit LiDAR point cloud (PLY), and **full-rate 1920x1440 video**

Also captured, currently unusable: **Insta360 X4 equirectangular video**, no poses, no shared
clock, and **no fixed rig** (a retracting selfie stick, so the phone-to-360 geometry differs on
every job and cannot be pre-calibrated).

### Processing (Python 3.10 on a cloud worker; numpy, Open3D, Pillow, ffmpeg)

1. **TSDF volumetric fusion** (Open3D), 12 mm voxels, 40 mm SDF truncation → interior mesh
2. Cull stray components, cut ceiling (as a render-time layer, not a deletion), snap walls to
   Manhattan, **decimate to 250,000 triangles**
3. **Texturing: projective PER-VERTEX colour.** For each posed RGB frame, project mesh
   vertices into the image, raycast-test occlusion, weight by view quality (angle + distance),
   accumulate a weighted average per vertex. Unseen vertices stay neutral grey.
4. Floor plan, area take-off, walk stations, accuracy report

### Measured results — most recent capture (387 keyframes, 231 s, one kitchen)

**Geometry is good enough:**

| check | result |
|---|---|
| Mesh diagonal vs LiDAR ground truth | ratio 1.09 |
| Storey height vs 9 ft building standard | 2.806 m = 9.2 ft, **2.4% error** |
| Fusion residual to raw LiDAR | median **26.8 mm**, p95 171 mm |
| Floor area from floor triangles | 29.4 m2 = 317 sq ft |

**Appearance is not:**

| check | result |
|---|---|
| Mesh surface area | 223.8 m2 |
| Vertices (after decimation) | 109,210 |
| **Colour samples per m2** | **488** |
| **=> one colour sample every** | **4.5 cm** |
| Median triangle edge | 3.7 cm |
| Source photo detail at 2 m | **1.5 mm per pixel** |
| Untextured (never observed by any camera) | 17.5% |

## Our diagnosis — please confirm or refute

**We store colour per VERTEX, so our texture resolution is our mesh resolution: 4.5 cm.
The source photographs resolve 1.5 mm at 2 m. We are discarding roughly 30x linear detail,
about 900x in pixel count, before it ever reaches the model.**

The consequence we think follows: *no amount of additional coverage can fix the look.* Even
at 0% untextured, every surface would still be a 4.5 cm-per-sample smear. This would explain
why our model reads as blurry watercolour while published twins look sharp.

We believe the fix is to stop painting vertices and instead **bake the photographs into a UV
texture atlas** — unwrap the mesh, rasterise each triangle into an atlas image, and for each
texel project into the best-scoring camera and sample it. At 4096px over 224 m2 that is
0.37 cm per texel; at 8192px, 0.18 cm — matching the source imagery.

### Questions on the diagnosis

1. **Is this the right diagnosis?** Is per-vertex colour genuinely the dominant limit on how
   our model looks, or are we about to spend effort on the wrong thing again? We have already
   twice pursued a confident recommendation that measurement then rejected.
2. Given a mesh with **26.8 mm median** geometric error, how sharp can a projected texture
   actually be before mesh error, not texel density, becomes the limit? Is 8192px wasted
   effort over 4096px at that error level?
3. Does decimating to 250k triangles *before* texturing hurt us beyond colour resolution —
   e.g. does it destroy the surface detail that makes a twin read as real, such that we should
   texture the full-resolution TSDF mesh and decimate afterwards?

## What we need — the build

### A. UV atlas texturing

4. **What is the current best open-source path** from "posed RGB frames + triangle mesh" to
   "textured mesh with a UV atlas"? Name specific projects and repositories. We know of
   **xatlas (MIT)** for unwrapping. What should do the *baking*?
5. Is there an existing end-to-end texture-mapping tool we should adopt rather than write?
   We are aware of **MVS-Texturing / mvs-texturing (Waechter et al.)** and **OpenMVS
   TextureMesh** — please verify their **actual current licences** (we believe OpenMVS is
   AGPL, which is banned for us) and whether they accept externally-supplied poses rather
   than requiring their own SfM.
6. How should we handle the **seams and exposure differences** between photos? Published
   twins do not show patchwork. What is the standard approach — global colour adjustment,
   Poisson blending, graph-cut view selection (as in MVS-Texturing), multi-band blending? Name
   what is actually used in production.
7. What is a realistic **compute cost** for baking a 4096px or 8192px atlas from ~400 frames
   onto a 250k-triangle mesh, on a cloud CPU or GPU worker? Our hard ceiling is 2 hours
   per job.
8. Should the atlas be baked from the **still keyframes only** (387 of them at 1920x1440), or
   should we also decode the **video** (also 1920x1440, ~7,000 frames) for texel coverage?
   Note: we measured that adding interpolated video frames to our *per-vertex* baker improved
   coverage by only 0.3 percentage points, because interpolated frames sit between keyframes
   and see the same surfaces. Does that conclusion still hold for atlas baking, where the
   limit is texel density rather than view count?

### B. The 17.5% that no camera ever saw

9. Surfaces nobody pointed a camera at are spread evenly across all height bands, not pooled
   at the ceiling. What do production pipelines do with these — leave them, inpaint them,
   fill them with a learned model? What is honest for a **construction documentation**
   deliverable, where inventing surface could mislead someone?
10. Is there a licence-clean **image inpainting or texture-synthesis** approach appropriate
    here, and should it be visually marked as inferred?

### C. Are we even using the right representation?

11. Many impressive public interior twins may be **3D Gaussian splats** rather than textured
    meshes. Given we need *measurement* as well as *looks*, what does current practice
    actually do — ship a mesh for measurement and a splat for viewing, or is there a
    representation that does both well now? We already run gsplat (Apache).
12. Our own photogrammetry attempt on interior imagery collapsed catastrophically (a 3.23 m
    model of a 13.71 m room, while reporting excellent internal quality scores), which is why
    depth is our geometry authority. Does that change your answer to 11?

## Hard constraints — these decide the answer

1. **Licensing.** Commercial SaaS.
   - **AGPL is banned outright** (the network clause reaches a hosted service).
   - **Non-commercial licences are banned, including model weights.** Several strong methods
     ship permissive *code* with **non-commercial weights** — please check both, separately,
     from the actual repository, and state what you found.
   - GPL tolerated only as a standalone subprocess binary, never linked.
   - MIT / BSD / Apache-2.0 are fine.
2. **Runs unattended** on a cloud CPU/GPU worker. **Hard ceiling 2 hours per job.**
3. **Must fail loudly rather than look confidently wrong.** A texture misprojected by 30 cm
   paints a cabinet onto the wall behind it and nobody viewing it can tell. Every
   recommendation needs a concrete rejection criterion — a number we can gate on.
4. The output must stay **measurable**: whatever we do to appearance must not move geometry.
5. Python 3.10. We can add dependencies with clean licences.

## Deliverable

1. **A verdict on our diagnosis** — is per-vertex colour the real limit, yes or no, and what
   is the evidence?
2. A concrete recommended **build path** for atlas texturing: which libraries, what order,
   what the failure modes are, and the numeric gate for each stage.
3. Verified **licences** for everything named — code and weights separately.
4. Expected **compute cost** against the 2-hour ceiling.
5. An honest statement of **what our output will still not do** after this change, so we do
   not repeat the mistake of expecting one fix to solve everything.
6. **An explicit list of what you are unsure about.** We would much rather have a flagged
   uncertainty than a confident wrong answer — we have already shipped two confident wrong
   answers in this pipeline and caught them only by measuring.

Prose is fine; code is welcome but not required. Cite repositories and papers with dates, and
say plainly when something you remember may be out of date.
