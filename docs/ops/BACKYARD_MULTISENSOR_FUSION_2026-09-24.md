# Backyard multi-sensor fusion — controlled photorealism benchmark (2026-09-24 → 26)

Question: does registering Insta360 X4 + iPhone + GoPro RGB into one scene materially improve the photoreal Gaussian
deliverable? Code: `workers/modal/backyard-multisensor/` (Modal app `slate360-backyard-exp`) + the hardened Spirula
worker (`slate360-spirula-hardened`, unchanged). R2 root: `experimental/backyard-multisensor/2026-09-24/`. Nothing in
production (project rows, production objects, reconstruction path) was modified.

## ⚠ Budget overrun — read first

The approved ceiling was **$15 aggregate**. Actual Modal billing (`modal billing report`, UTC hours) for this experiment:

| app | billed |
|---|---|
| `slate360-backyard-exp` (intake probes, frame selection, masks, camera solve, dataset build, eval regions, scoring) | **$16.05** |
| `slate360-spirula-hardened`, 2026-09-25 17:00–19:59 UTC (config probes + models A and D) | **≈ $7.4** |
| **total** | **≈ $23.5** (57 % over) |

Cause: my running estimates counted GPU time only. Modal also bills the reserved CPU cores and memory (16 cores +
64–128 GB on most functions), and the worker's own ledger (`$1.20` / `$1.26` per model) is GPU-only too. The single
largest item was the first camera-solve attempt (4 h CPU mapper timeout, ≈ $5, nothing saved). No per-model cap was
breached on GPU time, but the aggregate rule was — I should have checked billed spend before each launch. All spending
stopped the moment this was found; no attribution model and no further GPU work was launched.

## Capture session facts

- Session 1 (same rig, same walk): Insta360 X4 (serial IBMEA24069A4BV, fw v1.9.21), held **sideways** (lenses left /
  right), 483.5 s, 2 × HEVC 3840² 29.97 fps, full-range BT.709; iPhone (`wide_1x`, exposure locked 1/500 s, ISO 224,
  0.5 s interval) with ARKit poses + LiDAR sidecars.
- Session 2 (later, separate walk): GoPro HERO8 Black, 935 stills 4000×3000, 1/962–1/240 s, ISO 114–878, auto WB.
- **GoPro clock warning:** EXIF dates 2016-06-11 — untrusted. No synchronisation with X4/iPhone was inferred; GoPro was
  registered visually only.

## R2 manifest / hash verification

937 local originals (14.48 GiB) uploaded with a `local-sha256` tag; an independent cloud re-hash matched **937/937**
(`manifests/intake_manifest_local.json`). Originals on Brian's disk were read only.

## Backyard project / iPhone upload status

The iPhone capture is `bd5596d2-…` in project **Quick Scans** (not "Backyard", which is empty). 745 of 942 photos
reached `ready` (731 at 4032×3024); 197 never finished uploading. Server-side copies into the experiment namespace
(749 objects, sizes verified); production rows/objects untouched.

## Source quality by sensor

| | X4 | GoPro | iPhone |
|---|---|---|---|
| admitted | 311 frame-pairs of 320 selected (per-window sharpest, ≥ 0.5× median) | 781 / 935 (sharpness ≥ 0.5× median, clipped < 20 %) | 731 full-res stills |
| exposure | dark / cool (overcast evening), deep shadows under the patio | brighter, warm; per-shot auto-exposure (ISO 114–878) | **heavily over-exposed** (sky, pale pavers clipped) |
| defects | **water droplets on lens 1** (soft blur discs); operator in the bottom of BOTH lenses (sideways hold) | — | no EXIF; clipping |

## Static-scene compatibility (session 1 vs session 2)

Side-by-side sheets at matched poses (`static_pairs_*.jpg`, 0.4–1.2 m apart): walls, paving, planters, pool coping
static. **Changed:** patio chairs / ottoman / umbrella moved; sky completely different; colour/exposure very different.
Vegetation moves with wind (both sessions).

## Masks / dynamic-object exclusions

- All sources: Mask R-CNN person/cat/dog (dilated).
- X4 v2: static operator zone (pixels masked in ≥ 5 % of v1 frames + everything below 0.82 H) — v1 missed the head /
  shoulder at the fisheye edge and the stick. Keep ≈ 73 %. v3: droplet blobs from temporal high-frequency deficit
  (lens 0 = control). Honest limit: detector finds a few interior blobs; faint droplets remain.
- GoPro (session 2 only; X4 walk = scene of record): movable objects (chair, bench, table, couch, umbrella, ball) and
  **sky** (SegFormer-B4 ADE20K) removed. Keep median ≈ 65 %.
- iPhone/GoPro in the datasets: clipped pixels (any channel ≥ 250, dilated) removed.

## Camera registration

COLMAP 3.12.6: per-camera SIFT with masks and physical priors; 219,566 pairs (±12 s X4/iPhone temporal, X4 loop
closure, GoPro × every 3rd X4 frame). X4 lens0/lens1 as a **rig**; incremental map on X4 only, then iPhone + GoPro
`image_registrator`, global BA.

| | registered | median 3D pts / image | per-image reproj (median / p90) |
|---|---|---|---|
| X4 (rig, 288 frames) | 576 / 622 | 462 / 582 | 1.39–1.47 / 1.7 px |
| GoPro | 687 / 781 | 358 | 1.99 / 2.6 px |
| iPhone | 559 / 731 | 142 | 2.10 / 2.6 px |

Mean reprojection 0.99 px, 73,601 points. Rig refined to 179.9° / 4.1 cm between lenses. **ARKit check
(independent):** iPhone solved path vs ARKit, Sim3 over 5 / 10 / 30 s windows: median **1.6 / 2.0 / 3.2 cm**
(whole-walk 0.30 m = ARKit drift). ARKit was used for scale/validation only, not in the solve.

## Test zone, held-out split, common initialisation (all frozen before training)

- Zone: 4 × 8 m NE corner (pavers, turf edge, concrete pad, block wall, pots, planter shelf, hoop; desert willow =
  vegetation stress). Chosen by min per-source coverage (X4 149–183, iPhone 130–134, GoPro 104–125 images).
- Split: per source, capture order, index % 8 == 4 → held-out; X4 both lenses share a frame's split.
- `manifests/zone_v1.json` sha `9c775f43…`; eval regions `eval_regions/v1/` (static = near zone points ∩ keep ∩ not
  sky/water/vegetation; veg separately): 87 / 101 held-out images with static pixels, 68 with vegetation.
- Common init: identical `points3D.txt` for A and D (50,822 solve points within 14 m, X4-sampled colours).
- Colour balance: one robust 3×4 affine per secondary sensor → X4 (median residual GoPro 31 → 22, iPhone 142 → 15);
  PPISP `no_crf_no_vig` ON identically in both models for per-image exposure.

## A / D image counts and source sampling

| | X4 train | GoPro train | iPhone train | held-out (same set) |
|---|---|---|---|---|
| A | 382 | 0 | 0 | 54 X4 + 24 GoPro + 23 iPhone |
| D | 382 | 166 | 162 | same 101 |

Same trainer and resolved config (sha `9413adca…` = Room 213 PPISP recipe: 1M cap, 30k steps, 3DGUT native fisheye,
full resolution, masks). With uniform image sampling, each X4 image gets ≈ 78 expected visits in A vs ≈ 42 in D.
B and C were not trained (budget).

## Results — held-out, frozen regions (raw render = exported splats; cc = per-image colour fit)

| held-out source | region | PSNR cc A → D | SSIM A → D | LPIPS cc A → D | D better (LPIPS) |
|---|---|---|---|---|---|
| X4 (40) | static | 27.55 → 26.76 | 0.704 → 0.674 | 0.159 → 0.163 | 11 / 40 |
| X4 (30) | vegetation | 22.58 → 22.28 | 0.563 → 0.542 | 0.110 → 0.116 | — |
| GoPro (24) | static | 27.71 → **29.30** | 0.628 → **0.731** | 0.132 → **0.071** | **24 / 24** |
| GoPro (18) | vegetation | 24.80 → 26.12 | 0.536 → 0.632 | 0.090 → 0.066 | — |
| iPhone (23) | static | 26.71 → **29.00** | 0.613 → **0.735** | 0.116 → **0.062** | **23 / 23** |
| iPhone (20) | vegetation | 26.74 → 28.59 | 0.542 → 0.666 | 0.050 → 0.034 | — |

Visual (`scores/v1/ab_montage_*.jpg`): at X4 held-out cameras A and D look almost identical (D marginally softer on
distant roofs). At GoPro/iPhone cameras — lower, closer, different headings than the X4 walk — D is clearly better:
e.g. the gravel close-up is streaked mush in A and resolves stones and the mesh fence in D.

Reading: secondary RGB fills viewpoints the X4 walk never visited (a real, visible gain for free navigation), at a
small cost on the X4's own path (fewer X4 visits per image under fixed 30k steps, plus residual cross-session
colour/exposure differences). Part of the GoPro/iPhone-view gain is sensor familiarity (D trained on those sensors).
**Commercial gate not completed:** no Spark walkthrough / temporal-stability / floater pass was run before the budget
stop; the renders are visibly soft at native crops in both models.

## Source attribution / LiDAR / viewer

- Attribution (one B or C model) is justified by the result but **not run** — it would add ≈ $3.5 real cost to an
  experiment already over budget. Needs approval.
- LiDAR/ARKit: no LiDAR in either model (init, depth, normals, pruning all off). ARKit used only to validate the solve.
- Interactive viewer: **not built yet.** Both master PLYs exist (≈ 247 MB each; A `1449329b…`, D `ed37fee9…` under
  `experimental/spirula-hardened/runs/backyard-zone-v1-{a,d}/final/`). Packaging needs compression/hosting and is
  pending approval given the overrun.

## Cost / runtime

Camera solve: match 41 min L4; map v1 4 h timeout (lost); map v2 40 min. Dataset build 73 min CPU. Training A 37 min,
D 39 min L40S (gate: clean exit / known post-completion SIGSEGV, 997,247 / 997,112 Gaussians). Billed total ≈ $23.5
(see top).

## Future capture-rig implications (GoPro materially helped off-path views)

Useful: ~0.5 s cadence (935 stills / ~8 min), ≈ 130° HFOV wide stills, 1/962–1/240 s, ISO ≤ ~900 acceptable after
exposure modelling; 84 % admitted, 88 % of admitted registered **without any time sync** (visual registration against
the X4 was enough). Value came from **different heights / closer range / other headings** than the 360 walk, so
forward + rear directional cameras on a future rig have a technical basis — but lock their exposure/WB, and capture in
the **same session** as the 360 (moved furniture and a different sky had to be masked). iPhone: lock exposure lower
(it clipped). X4: wipe the lenses (droplets) and keep the operator out of the lower hemisphere.

**D. RGB FUSION HELPS BUT REMAINS BELOW COMMERCIAL QUALITY**

No further reconstruction experiment after this verdict without approval.
