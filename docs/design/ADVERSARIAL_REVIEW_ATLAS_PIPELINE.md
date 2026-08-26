# Adversarial Review Request — attack this texturing pipeline

*Give this to several AI platforms. We are NOT looking for encouragement. We want
the flaws found before a paying client finds them.*

---

You are reviewing a construction reality-capture pipeline. It just went from "blurry
watercolour" to "textured", and the person who built it believes it is close to sellable.
**Your job is to find why that belief is wrong.** Be specific and quantitative. If you think
the design is sound, say which single measurement would prove it, because we would rather
run one experiment than accept a compliment.

Context you should know: this pipeline has already produced two confident, wrong
recommendations that survived review and were only caught by measuring. Assume there is a
third one in here now.

## What the pipeline does today

### Capture (iPhone Pro, ARKit, working)

Per keyframe, recorded every 8 cm of travel or 8 degrees of rotation:

- 256x192 uint16 millimetre depth + 256x192 uint8 confidence
- 1920x1440 JPEG
- `transform_4x4` camera-to-world, column-major, ARKit (+Y up, camera looks down its -Z)
- Pinhole intrinsics `{fx: 1334.17, fy: 1334.17, cx: 967.59, cy: 720.45}` at RGB resolution

Most recent capture: 387 keyframes over 231 s, one kitchen, two clips, continuous ARKit
world frame (verified: clip 2 starts 4 cm from where clip 1 ended).

### Geometry (validated, not in question here)

Open3D TSDF fusion, 12 mm voxels, 40 mm truncation → cull stray components → cut ceiling as
a render layer → snap walls to Manhattan → decimate to 250k triangles → cull decimation
debris.

| check | result |
|---|---|
| Mesh diagonal vs LiDAR reference | ratio 1.09 |
| Storey height vs 9 ft standard | 2.806 m = 9.2 ft, 2.4% error |
| Fusion residual to raw LiDAR | median 26.8 mm, p95 171 mm |
| Floor area from floor triangles | 28.93 m2 |

### Appearance — this is what you are attacking

Until recently: per-vertex colour, a weighted average of every frame seeing each vertex.
223.8 m2 over 109,210 vertices = one colour sample every 4.5 cm, against source imagery
resolving 1.5 mm at 2 m. Three independent reviews confirmed this was the dominant limit.

Replaced by UV atlas baking:

1. **Decimate a COPY to ~113k faces** for texturing. Measured geometry is untouched.
2. **UV layout.** xatlas (MIT) was intended, but it is a GIL-holding C extension and at 113k
   faces exceeded 420 s — long enough that the cloud worker missed its heartbeat and the
   platform killed and retried the container in a loop. Measured: ~5 s at 30k faces, >420 s
   at 113k. It does not degrade, it falls off a cliff. So above 30k faces we use a
   **deterministic grid layout: every triangle gets its own square cell**, with 2 px padding.
3. **Per-face best view, not averaging.** Each face scores all 387 cameras by
   `cos(angle to normal) / distance`, rejects any beyond 78 degrees or 9 m or outside the
   image frustum, then takes the best of the top 80 candidates that survives an occlusion
   raycast (ray starts 30 mm off the surface, tolerance 150 mm).
4. **Bake** each texel by unprojecting to its face, projecting into the winning camera,
   nearest-neighbour sample.
5. **Fallback**: faces with no usable camera take the mesh's own vertex colours, which the
   TSDF integrated from the same photographs at voxel resolution. Faces with no colour at
   all stay neutral grey.
6. **Dilate** 4 iterations into the padding, export GLB with a JPEG atlas via trimesh.

### Measured output

| metric | value |
|---|---|
| Atlas | 8192 x 8192, JPEG quality 92 |
| Texels inside a chart | 23.7M of 67.1M — **35% sheet utilisation** |
| Texel coverage (in-chart) | 100% |
| — from real photographs | 15.8M (67%) |
| — from voxel-colour fallback | 7.8M (33%) |
| Faces assigned a real camera | 69% of 112,461 |
| Effective texel size | ~3 mm across the in-chart region |
| Near-neutral-grey texels | 19.3% of the full sheet |
| Atlas Laplacian variance | 1467 (populated texels) |
| GLB size | 19.7 MB (11.6 MB JPEG inside) |
| Runtime | unwrap ~0 s, view selection 12 s, bake 55 s |

## Attack these specifically

### On the grid layout

1. Per-triangle cells waste **65% of the sheet** and put a seam on **every triangle edge**.
   We compensated with an 8192 sheet. Is this a reasonable engineering trade or a fundamental
   mistake we will have to undo? What does it actually look like — will a viewer see a
   lattice of seams under bilinear filtering, and does 2 px padding plus 4 dilation
   iterations genuinely prevent bleed at 8192 with ~24 px cells?
2. We gave up on xatlas above 30k faces. **Is there a better way to get real charts?**
   Unwrap per connected component and pack manually? Exploit the Manhattan structure with
   planar projection charts per wall? A different licence-clean unwrapper? Or should we
   simply texture a 30k-face mesh where xatlas finishes in 5 s, and accept coarser
   silhouettes?
3. Is xatlas being pathologically slow a signal that our mesh is bad — non-manifold edges,
   degenerate triangles, duplicated vertices — rather than that xatlas is slow? **How would
   we test that?** If the mesh is the problem this changes everything downstream.

### On correctness — where is the silent wrongness?

4. **We do no exposure or gain compensation between views.** Every reviewer said global
   colour adjustment plus seam levelling is what separates published twins from patchwork,
   and we skipped it. How bad is this in practice on a single-room ARKit walk with auto
   exposure, and what is the cheapest licence-clean fix?
5. Nearest-neighbour sampling was chosen deliberately ("the texel grid is finer than the
   mesh error, so interpolation only adds blur"). **Is that reasoning wrong?** Should it be
   bilinear, and does the answer change when a texel's footprint in the source image is
   smaller or larger than one pixel?
6. The occlusion ray starts **30 mm** off the surface with a **150 mm** tolerance, on a mesh
   with 26.8 mm median and 171 mm p95 error. Are these numbers defensible, or are we now
   painting through walls? What is the failure signature we should look for, and what
   measurement would detect it?
7. **The voxel-colour fallback covers 33% of texels.** Is presenting photo-sharp and
   voxel-soft regions in one continuous surface honest and acceptable for construction
   documentation, or does it mislead — a viewer cannot tell which parts are well-observed.
   Should unobserved regions be visually marked instead? Argue both sides.
8. What is the **rejection criterion** we are missing? We have no gate that would catch a
   texture misprojected by 30 cm — a cabinet painted onto the wall behind it — which nobody
   viewing the result could detect. Give us a concrete, computable check with a threshold.

### On whether this is the right target at all

9. 69% of faces got a real camera; 31% did not. **Is chasing that last 31% worth it**, or is
   the honest answer that it needs a different capture (more passes, deliberate pointing) or
   the 360 camera we have not yet solved?
10. Given 26.8 mm median geometry error, **what is the actual visual ceiling here?** Be
    concrete about what will still look wrong after every fix above, so we stop expecting
    each change to be the last one.
11. Is a textured mesh the right deliverable for "documenting construction progress and
    showing completed work to clients", or should the client-facing artefact be a Gaussian
    splat with the mesh reserved for measurement? We run gsplat (Apache) already.

## Hard constraints

1. **Licensing** — commercial SaaS. AGPL banned outright (network clause). Non-commercial
   licences banned **including model weights** — check code and weights separately, from the
   actual repository, and state what you found. GPL only as a standalone subprocess binary,
   never linked. MIT / BSD / Apache-2.0 fine.
2. Runs unattended on a cloud CPU/GPU worker. **Hard ceiling 2 hours per job**, and any
   single library call that can block for 15 minutes will get the container killed — that
   already happened.
3. **Must fail loudly rather than look confidently wrong.**
4. Appearance work must never move geometry.
5. Python 3.10, numpy / Open3D / Pillow / trimesh / xatlas available.

## Deliverable

1. **The three most likely ways this pipeline is silently wrong right now**, ranked, each
   with the measurement that would expose it.
2. A verdict on the grid-vs-charts decision, with a recommended path and its cost.
3. The single highest-value change to make next, and why it beats the alternatives.
4. What will still be visibly wrong afterwards.
5. **An explicit list of what you are unsure about.** A flagged uncertainty is worth more to
   us than a confident wrong answer — we have shipped two of those already.

Prose is fine. Cite repositories and papers with dates and verified licences, and say plainly
when something you remember may be out of date.
