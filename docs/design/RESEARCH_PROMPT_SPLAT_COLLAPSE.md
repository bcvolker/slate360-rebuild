# Research Request — 360 video reconstruction in OUR pipeline, and why our splat collapsed

*Give this to several AI platforms. We need named GitHub projects we can self-host, not SaaS
products and not hardware. Budget for purchases is effectively zero.*

---

## What we need most: process 360 video INSIDE our own pipeline

This is the priority. We own an **Insta360 X4** and shoot equirectangular video of interiors. We
need to turn that footage into a usable 3D deliverable **inside our own cloud pipeline** — not by
uploading to someone else's service, not by buying a scanner.

Concretely we need **open-source GitHub projects, with permissive licences, that we can run on our
own workers**, covering any of:

1. **Structure-from-motion / camera poses from equirectangular (360) video.** COLMAP has no native
   spherical camera model. What does? We are aware **OpenSfM** (Mapillary, BSD) supports spherical
   cameras natively — is that still true and current? What else?
2. **Gaussian splatting trained directly from 360/panoramic input.** There is a body of recent work
   here and we do not know which of it is usable. Please assess at least: **ODGS**, **OmniGS**,
   **Splatter-360**, **360-GS**, **OmniSplat**, **EgoNeRF**, **360Roam**, and anything newer. For
   each: repository, **licence of the CODE and separately of any pretrained WEIGHTS**, whether it
   accepts our own captures, maturity, and hardware needs.
3. **Equirectangular -> perspective (cube-face) unwrapping** as a preprocessing step so standard
   tools can be used. We already do this with ffmpeg's `v360` filter. Is that the right approach,
   and what is the correct face count / overlap / FOV for reconstruction rather than viewing?
4. **Parsing Insta360 `.insv` files** — the proprietary metadata trailer, and especially the
   **IMU/gyro track**. We know of `telemetry-parser` (Gyroflow, MIT/Apache). Is that the best
   option? Does the IMU give us anything usable for pose initialisation?
5. **360 panoramic tours** as a fallback deliverable when metric reconstruction is not possible —
   self-hostable viewers and any open pipeline for stitching a walkthrough from 360 video.

We also need to know: **which of these can accept our iPhone LiDAR/ARKit data as a metric
reference**, so a 360-derived model inherits real-world scale.

## The rest of our data

Interiors are captured with an iPhone Pro (ARKit + LiDAR) **in addition to** the 360 camera:

- **Depth**: 256x192 `uint16` millimetre depth + 256x192 `uint8` confidence
- **Colour**: 1920x1440 JPEG per keyframe
- **Pose**: `transform_4x4` camera-to-world, column-major, ARKit (+Y up, gravity-aligned, camera
  looks down its own **-Z**)
- **Intrinsics**: pinhole `{fx: 1334.17, fy: 1334.17, cx: 967.59, cy: 720.45}` at RGB resolution
- Keyframes every 8 cm of travel or 8 degrees of rotation; absolute timestamps
- An accumulated ARKit LiDAR point cloud (PLY) and full-rate 1920x1440 video

Latest capture: **387 keyframes, 231 s**, two clips (a high pass and a low pass) in one continuous
ARKit world frame — verified, clip 2 starts 4 cm from where clip 1 ended.

**The 360 problem in one line:** the X4 gives us no poses, no shared clock with the phone, and
**no fixed rig** — the mount is a retracting selfie stick, so phone-to-360 geometry differs on
every job and cannot be pre-calibrated. A method needing factory rig calibration is unusable; a
method solving one unknown offset per capture is fine.

## What already works, and what has failed twice

**Works — geometry from LiDAR.** A TSDF mesh from the depth stream sits within **26.8 mm median**
of the LiDAR cloud, 2.4% storey-height error, correct floor area. This is our measurement layer and
it is genuinely good.

**Failed once — unconstrained photogrammetry.** COLMAP SfM on interior imagery produced a **3.23 m
model of a 13.71 m room** (ratio 0.24) while reporting excellent internal scores. Low-texture
painted drywall. We concluded: never solve poses from these images.

**Failed twice — pose-prior Gaussian splat.** Everything meant to prevent failure 1 was in place:

- `colmap_pose_prior` alignment — ARKit poses supplied as priors, not solved
- Gaussians **initialised from the LiDAR point cloud**, not random
- Stock **gsplat 1.4.0** via **nerfstudio 1.1.5 splatfacto** (Apache-2.0), no fork
- Both clips, A10G GPU, quality profile "high"

| measurement | value |
|---|---|
| Gaussians | 548,857 |
| **Bounding box** | **4.07 x 3.85 x 4.12 m** |
| Expected room extent | ~10 x 2.8 x 7 m |
| LiDAR reference diagonal | 12.33 m |
| Model diagonal | 6.92 m (**ratio 0.56**) |
| Manifest | `metric_scale_applied: true`, `tilt_deg: 179.86` |
| Readiness gates | **ALL PASSED** (psnr, splat count, file size, coverage, explosion check) |

A top-down orthographic render of the gaussian centres is **a sphere**. The bounding box is
near-isotropic; rooms never are. It collapsed the same way failure 1 did, and the coverage gate
whose entire purpose is catching this has a 0.45 minimum, so 0.5613 passed.

## Questions on the collapse

6. **Does `colmap_pose_prior` hold poses FIXED, or only use them as initialisation?** We suspect
   COLMAP refined them and drifted into the same degenerate minimum. What is the correct
   invocation to make poses truly rigid — `point_triangulator` against a pre-built model rather
   than `mapper`? Please give exact commands and flags.
7. **Should COLMAP be in this pipeline at all?** We have metric poses AND metric depth. Is the
   right architecture to skip SfM entirely and feed ARKit poses straight to gsplat, as the
   Record3D / Polycam importers do? Name the exact importer or converter.
8. **What makes a splat collapse to an isotropic ball when seeded from a correct metric point
   cloud?** Scale-recovery bug, coordinate-convention bug, densification/pruning bug, or wrong
   dataparser?
9. **Give us a concrete rejection criterion, with a number**, that would have caught BOTH failures.
10. `tilt_deg: 179.86` means the model comes out essentially upside down. Symptom of an upstream
    convention error that might relate to the collapse, or normal between ARKit and this stack?

## Why we are asking about tools rather than fixes

Every coordinate-convention boundary we cross — **ARKit -> COLMAP -> nerfstudio -> gsplat -> .spz
-> three.js** — is a place a sign error silently produces a plausible-looking, wrong file. We wrote
all of that glue, and that is where every failure has occurred. We would rather adopt a project
that owns more of the chain than keep writing conversions.

11. **What open-source projects take iPhone LiDAR + poses + images and produce a splat end-to-end**
    with the fewest hand-written stages? Assess at least, with verified licences for code and
    weights separately: **Nerfstudio** and its `ns-process-data` importers, **gsplat**, **Brush**
    (Rust/wgpu), **OpenSplat**, **PlayCanvas SuperSplat** (what can it do besides view — cleanup,
    cropping, compression, self-hosted delivery?), **Postshot/Jawset** (Windows desktop, licence
    and cost?), and anything else current.
12. **Which run on a Windows desktop with a consumer GPU**, and which need cloud?
13. We must be able to **self-host the viewer** so the deliverable is our own branded link. Which
    export formats (`.ply`, `.spz`, `.ksplat`, `.splat`) and which open viewers support them?

## Hard constraints

1. **Licensing** — commercial services business. **AGPL banned** (network clause reaches a hosted
   service). **Non-commercial licences banned, including model weights** — several methods ship
   permissive code with NC weights, so check both separately from the actual repository and state
   what you found. GPL acceptable only as a standalone subprocess binary, never linked.
   MIT / BSD / Apache-2.0 fine.
2. **No hardware purchase.** Scanner recommendations are not actionable.
3. **Self-hostable.** We run Python 3.10 on cloud GPU workers (Modal), store on Cloudflare R2, and
   serve from a Next.js app. A SaaS that will not export our data is not a solution.
4. **Must fail loudly rather than look plausible.** Everything above passed its own quality gates.

## Deliverable

1. **A ranked list of GitHub projects for 360/equirectangular reconstruction** we can self-host,
   with licence, maturity, hardware needs, and whether they accept external metric references.
2. **Why the pose-prior splat collapsed** — specifically enough to fix or definitively abandon.
3. **The shortest path from the data we already have to something that looks like the room**,
   naming exact tools and commands, preferring fewest hand-written conversion stages.
4. **An explicit list of what you are unsure about.** A flagged uncertainty is worth far more than
   a confident wrong answer — we have shipped several of those and caught them only by rendering
   the result and looking at it.

Prose is fine. Cite repositories and papers with dates, and say plainly when something you
remember may be out of date.
