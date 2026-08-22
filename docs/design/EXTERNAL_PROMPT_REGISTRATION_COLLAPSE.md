# External Prompt — indoor SfM collapses to a fragment (measured evidence)

Self-contained. Copy everything below the line. Written 2026-08-22.

---

ROLE: Principal Structure-from-Motion / 3D reconstruction engineer. Diagnose a specific,
measured failure and prescribe fixes. Be blunt. No code access needed — the numbers below are
measured from the actual output files, not inferred.

# The setup

A one-person construction-documentation business scans interiors and exteriors and delivers
interactive web twins to contractors. Self-hosted pipeline: COLMAP (via nerfstudio
`ns-process-data`) → nerfstudio **splatfacto 1.1.5** Gaussian splatting → SPZ → web viewer.
Runs on Modal GPU workers. License-clean OSS only (AGPL is disqualifying).

Capture hardware: **iPhone Pro with LiDAR** (custom native ARKit app that records video +
per-frame depth + camera poses + a voxel point cloud), and an **Insta360 X4** for 360 video.

# THE FAILURE — measured, not guessed

Capture: a ~90-second handheld iPhone walk through a **kitchen + dining area** (realistically
~6 m × 8 m of floor, ceiling ~2.5 m). The native app recorded, and all of this uploaded:
- video clip, 40 MB
- LiDAR point cloud, **500,000 points**
- ARKit camera poses (per-keyframe)
- per-frame depth stream, 78 MB

Pipeline result:
- **137 views** extracted (sharpness-selected frames), **94 registered (69%)**
- train PSNR **32.65** — the highest this pipeline has ever produced
- 444,595 gaussians exported
- metric scale **successfully recovered**: scaleFactor 0.6147 from **88 ARKit↔COLMAP frame
  pairs**, scale residual **0.040 (4%)** — i.e. the scale fit was *consistent*

**And the output is visually useless** — a small blob; zooming in reveals a few vaguely
recognisable fragments.

## Measured properties of the exported model (read directly from the PLY)

| property | value |
|---|---|
| gaussians | 417,653 |
| **bounding box (metres, after scale)** | **1.67 × 1.95 × 1.96** |
| **bbox diagonal** | **3.23 m** |
| distance from cloud median | p50 0.41 m · p90 0.74 m · p99 0.92 m · **max 1.01 m** |
| gaussian size, longest axis | median 2.2 mm · p99 14.3 mm · max 135 mm |
| anisotropy (max/min axis) | median 4.48 · p99 5.08 |
| opacity | p10 0.18 · p50 0.90 · p90 1.00 · frac<0.1 = 4.4% |
| spherical harmonics | dc in [-2.13, 3.33], rest in [-0.88, 0.88], **0 NaN** |
| crop stage | removed only 6% (472,344 → 444,613) — not the culprit |
| statistical outlier removal | removed 7,542 |

**Read that bounding box again: the entire reconstruction of a kitchen and dining room is a
~2 metre cube, and every gaussian sits within ~1 m of the centre.**

So the gaussians themselves are *healthy* — well-shaped (anisotropy ~4.5), correctly sized for
their scale, opaque, SH clean, no NaNs. There is simply **almost no scene**. The model is a
small fragment, not a room.

## The same pattern on a different capture

A ~1,225 sq ft university classroom (41'-3" × 29'-8", so a true diagonal of about **15.4 m**)
captured as 20 stationary 360 stills → 320 unwrapped views, 268 registered, PSNR **29.68**,
also visually useless. Its exported model had a bbox diagonal of **5.23 units** (that run had
no metric scale). Measured anisotropy p99 was 10.10 and **zero** gaussians exceeded 5% of the
scene diagonal.

For the stills capture we understand the mechanism: 16 perspective views unwrapped from one
equirectangular still share a single optical centre, so intra-station pairs have **zero
baseline** and are degenerate for triangulation. Fine.

**But the iPhone capture is a continuously moving camera with genuine parallax, plus LiDAR
depth, plus ARKit poses — and it still collapsed.** That is what we do not understand.


## DECISIVE EVIDENCE — the LiDAR cloud proves the capture was fine

We measured the raw ARKit LiDAR point cloud (which is natively in metres) against the two
splat models built from the same room.

| source | extent (m) | diagonal | shape |
|---|---|---|---|
| **LiDAR cloud (ground truth)** | **9.56 x 2.83 x 9.40** | **13.71 m** | flat slab — a real room |
| iPhone splat model (metric, scale applied) | 1.67 x 1.95 x 1.96 | 3.23 m | near-cube |
| 360-video splat model (unscaled units) | 3.04 x 2.99 x 2.98 | 5.20 | near-cube |

**The LiDAR mapped the entire kitchen + dining area correctly — ~10 m x 9 m footprint with a
2.8 m ceiling.** ARKit tracking did not fail. The capture is good.

**Both splat reconstructions collapsed to a near-CUBE**, from two completely different sensors
(iPhone rolling-shutter video, and Insta360 dual-fisheye 360 video), processed independently.
A kitchen/dining space has an aspect ratio of roughly 3.4 : 1 : 3.3 — wide, low, deep. Both
models came out ~1 : 1 : 1.

This gives us a **scale-free** gate: the reconstruction's aspect ratio should resemble the
space's aspect ratio. A cube-shaped model of a slab-shaped room is collapsed, and you can
detect it without ever recovering metric scale.

It also means the failure is in the **reconstruction stage, not the capture**, and it is
reproducible across sensors. That is the single most important fact in this document.

# What we need from you

## 1. Root cause of the collapse
Why would COLMAP, given 137 sharpness-selected frames from a continuous 90-second indoor walk,
register 94 of them into a reconstruction spanning only ~2 m? Candidate hypotheses we want
you to confirm, refute, or replace:
- The 94 registered views are a **contiguous sub-cluster** (one corner of the room) and the
  remaining 43 failed to register, breaking the trajectory — so the model is one small region
  correctly reconstructed, and the rest of the walk was silently dropped.
- COLMAP produced **multiple disconnected sub-models** and downstream code silently took the
  largest/first one. (Does `ns-process-data` do this? How would we detect it?)
- **Scale drift / degenerate translation**: the solver collapsed camera translations toward
  zero (a known failure with low-parallax forward motion, rolling shutter, or motion blur),
  and the ARKit scale recovery then faithfully scaled a collapsed solution — which would
  explain a *good* 4% scale residual on a *bad* reconstruction.
- Insufficient overlap between consecutive frames at the selected sample rate.
- Indoor texture-poor surfaces (painted drywall, cabinets) failing feature matching.

Specifically address: **can a 4% scale residual across 88 pairs coexist with a collapsed
reconstruction?** If yes, explain how — that is the crux, because we treated the good residual
as evidence the solve was sound.

## 2. Why PSNR went UP
Train PSNR 32.65 is our best ever, on a model containing almost no scene. Explain the
mechanism precisely, and confirm our belief that PSNR on training views is worthless as a
quality gate here.

## 3. The gate we should have had
We need automatable checks that would have caught this **before publishing**. Our candidates,
please rank by (detection power / implementation cost) and give concrete thresholds:
- **Scene extent sanity**: compare model bbox diagonal against an expected room size (from
  LiDAR cloud extent, ARKit trajectory extent, or an operator-entered room dimension). For
  this capture the LiDAR cloud extent alone would have flagged it instantly — is that the
  single best gate?
- **Camera trajectory span** vs LiDAR cloud extent vs model extent — three independent
  measures of the same physical space that should agree.
- **Registered-view fraction** (69% here) and whether registered views form one connected
  component covering the full time range of the walk.
- Held-out-view PSNR/LPIPS.
- Gaussians outside the sparse hull; anisotropy distribution (both were *clean* here, so
  these would NOT have caught it — confirm).

## 4. The fix
Given the capture is genuinely good (continuous motion, 500k-point LiDAR cloud, ARKit poses,
per-frame depth), what should the pipeline actually do?
- Is `ns-process-data` the wrong tool for this (no mask support, no rig support, hides the
  COLMAP database)? Should we drop to the COLMAP CLI directly?
- Should we use **sequential matcher with loop detection** rather than whatever
  `ns-process-data` defaults to, and what overlap value for a 90 s walk?
- Should the **LiDAR point cloud initialise** the reconstruction (it currently does not —
  `lidarPlyInit: false`) or even replace SfM geometry entirely via **TSDF fusion of the ARKit
  depth**, with the images used only for texture/appearance?
- We already A/B tested and **closed** two approaches — do not simply re-recommend them
  unless you can say what would be done differently:
  - ARKit poses as covariance-weighted **pose priors** in COLMAP: 18.26 vs 25.53 PSNR (lost)
  - **ARKit-bypass** (skip COLMAP, use ARKit poses directly): 14.7 vs 25.5 PSNR (lost)
  Note both were judged on train PSNR, which we now distrust — is that reason to re-open them?
- Capture SOP changes: walking speed, frame rate, exposure lock, loop closure, height.

## 5. Given LiDAR is present, is splatting even the right primitive?
We have per-frame metric depth and a 500k-point cloud. Three independent prior audits told us
to move interiors to **Open3D TSDF + marching cubes** for the mesh (dollhouse, floor plan,
measurement) and keep splats only as a photoreal overlay. Does this failure strengthen that
conclusion? Would a TSDF built purely from ARKit depth + poses have produced a correct room
while the SfM path collapsed?

## 6. Deliverable
- Root cause, stated plainly.
- The one or two gates to implement first, with thresholds.
- The concrete pipeline change with the highest expected value.
- What to STOP doing.

Do not flatter. If the architecture is wrong for this, say so.
