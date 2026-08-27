# Research Request — our Gaussian splat collapsed to a sphere. Why, and what free tools do this properly?

*Give this to several AI platforms. We need two things: a diagnosis, and a survey of everything
free or open-source that already solves this. Hardware purchase is NOT an option — budget is
effectively zero. Please do not recommend buying a scanner.*

---

## The situation in one paragraph

We capture interiors with an iPhone Pro (ARKit + LiDAR). The **geometry works**: a TSDF mesh from
the depth stream measures within 26.8 mm median of the LiDAR cloud, 2.4% storey-height error,
correct floor area. The **appearance does not**. We have now failed twice to produce anything a
contractor would look at, and the second failure is the interesting one because it failed the same
way as the first despite a fix that should have prevented it.

## Capture data we actually have

Per keyframe, from one continuous ARKit session:

- **Depth**: 256x192 `uint16` millimetre depth + 256x192 `uint8` confidence
- **Colour**: full-resolution **1920x1440 JPEG**
- **Pose**: `transform_4x4`, camera-to-world, column-major, ARKit convention (+Y up,
  gravity-aligned, camera looks down its own **-Z**)
- **Intrinsics**: pinhole `{fx: 1334.17, fy: 1334.17, cx: 967.59, cy: 720.45}` at RGB resolution
- Absolute timestamp; keyframes recorded every 8 cm of travel or 8 degrees of rotation

Plus: an accumulated ARKit LiDAR point cloud (PLY), and full-rate 1920x1440 video.

Most recent capture: **387 keyframes, 231 s, one kitchen, two clips** (a high pass and a low pass),
both in one continuous ARKit world frame — verified, clip 2 begins 4 cm from where clip 1 ended.

Also captured, still unusable: **Insta360 X4 equirectangular video**. No poses, no shared clock
with the phone, and **no fixed rig** (a retracting selfie stick, so the phone-to-360 geometry
differs every capture and cannot be pre-calibrated).

## Failure 1 — unconstrained photogrammetry

COLMAP structure-from-motion on the interior imagery produced a **3.23 m model of a 13.71 m room**
(ratio 0.24) while reporting excellent internal quality scores. Diagnosed as SfM failing on
low-texture painted drywall. We concluded: never solve poses from these images.

## Failure 2 — pose-prior Gaussian splat (this is what we need explained)

Everything we believed would prevent failure 1 was in place:

- Alignment backend `colmap_pose_prior` — ARKit poses supplied as priors rather than solved
- Gaussians **initialised from the LiDAR point cloud**, not random
- Trained with **gsplat 1.4.0** via **nerfstudio 1.1.5 splatfacto** (Apache-2.0), stock, no fork
- Both clips used, already co-registered
- Quality profile "high", speed "quality", A10G GPU

Result:

| measurement | value |
|---|---|
| Gaussians | 548,857 |
| **Bounding box** | **4.07 x 3.85 x 4.12 m** |
| Expected room extent | ~10 x 2.8 x 7 m |
| LiDAR reference diagonal | 12.33 m |
| Model diagonal | 6.92 m (**ratio 0.56**) |
| Manifest | `metric_scale_applied: true`, `tilt_deg: 179.86` |
| Readiness gates | ALL PASSED (psnr, splat count, file size, coverage, explosion check) |

A top-down orthographic render of the gaussian centres shows **a sphere**, not a floor plan. The
bounding box is near-isotropic — rooms never are. It collapsed the same way failure 1 did.

**Every automated gate passed.** The coverage gate's minimum ratio is 0.45 and the model scored
0.5613, so a collapsed reconstruction cleared its own safety check.

## Questions on the diagnosis

1. **Does `colmap_pose_prior` actually hold poses FIXED, or only use them as initialisation?**
   We suspect COLMAP refined the poses and drifted into the same degenerate minimum. If so, what
   is the correct COLMAP invocation to make poses truly rigid — `point_triangulator` against a
   pre-built model rather than `mapper`? Please be specific about commands and flags.
2. **Should COLMAP be in this pipeline at all?** We have metric poses AND metric depth. Is the
   right architecture to skip SfM entirely and feed ARKit poses straight into gsplat, the way the
   Record3D / Polycam / iPhone importers do? Name the exact importer or converter to use.
3. **What causes a splat to collapse to an isotropic ball** when it was seeded from a correct
   metric point cloud? If the LiDAR seed was metric and correct, how does training move that far?
   Is this a scale-recovery bug, a coordinate-convention bug, a densification/pruning bug, or
   simply the wrong dataparser?
4. **What is the correct gate?** Our 0.45 coverage ratio let a 0.56 collapse through. Give us a
   concrete, computable rejection criterion with a number — ideally one that would have caught
   BOTH failures.
5. `tilt_deg: 179.86` — the model comes out essentially upside down and needs a correction
   quaternion. Is that a symptom of a convention error upstream that might also relate to the
   collapse, or is a 180-degree flip normal and expected between ARKit and this stack?

## Questions on tooling — please be exhaustive

We would much rather adopt something proven than keep writing glue. **Every coordinate-convention
boundary we cross (ARKit -> COLMAP -> nerfstudio -> gsplat -> .spz -> three.js) is a place a sign
error can silently produce a plausible-looking, wrong file. We have written all of that glue and it
is where every failure has occurred.**

6. **What free and open-source tools take iPhone LiDAR + poses + images and produce a Gaussian
   splat end-to-end**, with the fewest hand-written conversion steps? Please cover at least, and
   verify licences for code AND any pretrained weights separately:
   - **Nerfstudio** (Apache-2.0) and its Record3D / Polycam / ns-process-data importers
   - **gsplat** (Apache-2.0)
   - **Brush** (Rust/wgpu splat trainer) — licence? maturity?
   - **OpenSplat** — licence? does it accept external poses?
   - **PlayCanvas SuperSplat** — editor/viewer. What can it do besides view? Cleanup, cropping,
     compression, hosting?
   - **Teleport by Varjo** — what is it, what does it cost, does it accept our own captures, and
     can output be self-hosted or only viewed in their platform?
   - **Postshot (Jawset)** — licence and cost? Windows desktop, we have a Windows machine.
   - **Luma AI**, **Polycam**, **Scaniverse (Niantic)**, **KIRI Engine** — free tiers, on-device
     splat generation, and crucially **what can be EXPORTED and under what terms**
   - Anything else current we have not named
7. **Which of those can run on a Windows desktop with a consumer GPU**, and which are cloud-only?
8. **Is there a free/consumer app that already does this well enough to deliver client work
   today**, while a custom pipeline matures? We are a one-person services business trying to sell
   construction documentation to contractors. Being blocked on our own pipeline is costing real
   revenue. If the honest answer is "use Scaniverse or Polycam for the visual, keep your LiDAR
   mesh for the measurements," say so plainly.
9. For any tool that exports splats: **what formats** (.ply, .spz, .ksplat, .splat) and can we
   **self-host the viewer** so the deliverable is our own branded link rather than theirs?

## Questions on the 360 camera

10. Given no fixed rig and no shared clock, is there a **free** path to using Insta360 X4 footage —
    either fused onto the LiDAR mesh, or as a standalone splat/tour? What about printed
    **AprilTags** as a shared reference both cameras can see? What tag family, printed size, how
    many, and what accuracy would result?
11. Does any free tool ingest **equirectangular video** for splat training directly?

## Hard constraints

1. **Licensing** — commercial services business. **AGPL banned** (network clause). **Non-commercial
   licences banned, including model weights** — several methods ship permissive code with NC
   weights, so please check both separately from the actual repository and state what you found.
   GPL acceptable only as a standalone subprocess binary. MIT / BSD / Apache-2.0 fine.
2. **No hardware purchase.** Recommendations to buy a scanner are not actionable.
3. Existing stack: Python 3.10, numpy, Open3D, COLMAP, gsplat, nerfstudio, Modal (cloud GPU),
   Cloudflare R2, Next.js viewer. Windows desktop available for local tools.
4. **Must fail loudly rather than look plausible.** Everything above passed its own quality gates.

## Deliverable

1. **Why the pose-prior splat collapsed**, specifically enough to fix or definitively abandon.
2. **The shortest path from the data we already have to a splat that looks like the room** —
   naming exact tools, commands, and conversion steps, preferring fewest hand-written stages.
3. **A verified table of free/open tools** with licence, platform, whether they accept external
   poses, what they export, and maturity.
4. **A plain answer on whether to keep building or use an existing free app** for client work now.
5. **An explicit list of what you are unsure about.** A flagged uncertainty is worth far more to us
   than a confident wrong answer — we have shipped several of those and caught them only by
   rendering the result and looking at it.

Prose is fine. Cite repositories, papers and pricing pages with dates, and say plainly when
something you remember may be out of date.
