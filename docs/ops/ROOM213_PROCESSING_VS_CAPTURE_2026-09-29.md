# Room 213 — processing vs capture benchmark (2026-09-29)

## Classification: **PROCESSING_LIMIT_CONFIRMED** (Phase 2 stop rule)

The official Spirula Studio workflow was run from the original X4 `.insv` files, with no golden cameras, images,
initialization or manifest. At ordinary viewing scale it is **clearly better** than the golden custom pipeline on the
four locked walkthrough views:
- **walls:** solid and uniform; golden walls are blotchy;
- **window reveals:** straight, with clean edges; golden reveals wobble;
- **no smears:** the smeared or corrupted carpet and wall patches in golden are gone;
- **no staircase artifacts:** the blocky edges in golden are gone;
- **motion:** 10 % less frame-to-frame high-pass change over the 800-frame walkthrough.

At 1:1 on the six locked training-view targets it is **on par**. It is better on the ceiling grid, about equal on
chair slats, carpet, baseboard, window and white wall, and slightly softer on the table edge. **The fine-texture
ceiling itself did not move.** What processing bought is structural coherence and artifact removal, which is what a
viewer sees.

Per the brief, **the capture test (Phases 3–5) was NOT run**. It waits for review. The field plan is ready:
`ROOM213_CAPTURE_TEST_PLAN_2026-09-29.md`.

The golden model is untouched. Everything is under volume `slate360-recon-experiments:room213/2026-09-29/ref/`.
Evidence is in `docs/ops/room213-reference-2026-09-29/`. Code is in `workers/modal/room213-ref/`.

## 1. Reference Spirula workflow configuration

**Release and hardware:**
- **Official release v2026.9.24 (commit 183b2c6)**, Ubuntu Vulkan binary, sha `7e584142…cf97`.
- Modal L40S via the NVIDIA Vulkan driver 580.95.05. The release has the in-process Vulkan video decoder.

**How it was driven.** The desktop app has no headless mode; its batch/automation paths need a real window. So its
dataset-creation defaults (audited in the v2026.9.24 source) were reproduced step by step through the same binary's
CLI.

**Frames:**
- `sam extract <clip>.insv -s 15 -k 3 --sync -q 95` for each of the three clips (tripod 020, walking 021 and 075).
- That is 2 fps, sharpest of 3, both lens tracks decoded in lockstep, so each exposure is a rig pair.
- Native **3840² dual fisheye**, JPEG quality 95.
- **847 exposures × 2 lenses = 1,694 frames** (105 / 547 / 195 per lens). The golden uses 242 images from 121
  exposures.

**Masks:**
- The automatic fisheye border mask (`sam mask`).
- The **360-camera dataset preset's AI masking**: SAM 3 `sam3-q4_0.ggml`, prompt "person; hand; backpack; shadow of
  person", max size 1600, dilate 0.05.
- **One deviation:** the CLI can only do tracked masking (`sam track`); the app masks each frame independently.
  Masks were verified visually (operator and border removed).

**SfM (Spirula's own):**
- The app's exact flags: `--quality high --data-type video --camera-model thin-prism-fisheye --camera-mode folder
  --mapper flat --features sift --matcher bruteforce --no-prefilter-sequential --metric-gps horizontal`.
- A manifest with a thin-prism-fisheye camera per clip and lens, a **dual-fisheye rig per clip**, sequences, and
  `.insv` IMU telemetry.
- Result: **1,694/1,694 images registered**, 925,005 points, 6 cameras, reprojection mean 1.28 px / median 1.13 px.
- Metric scale and up direction come from the IMU (up votes agree to 2.25°; scale uncertainty 0.27 %).
- 30.4 min.

**Training — `train 360-camera`** (the release recommends this preset for wide fisheye with a visible circle; the
app's stock default is `3dgs`):

| setting | value |
|---|---|
| primitive | **3dgs** |
| warp to pinhole | **true** (pinhole projection, fisheye split into faces) |
| PPISP | **on** |
| bilateral grid | **on** |
| depth/normal maps | load flags 1, but none generated |
| Gaussian cap | **1,000,000** |
| iterations | **30,000** |
| other | SH 3, erank_reg 0.01, densification ssim_cs |

- Training time 56:54 (process 58.9 min).
- Final **1,000,000** splats (997,559 in the exported PLY).
- No held-out split, as in the app default.

**Output and render path.** `outputs/ref/step-000030000.ckpt/splat.ply`, rendered natively by the same release
(`--init-ply`, 0 iterations).

## 2. Original-video reference result

A complete, consistent reconstruction of the whole room from all three clips. The last-1000-step training PSNR is
26–29; golden's last-1000-step training PSNR is 18–22. Training PSNR is inflated by PPISP and the bilateral grid and
is **not** used as evidence.

## 3. Matched golden vs reference comparison (`sheets/`)

**Alignment:**
1. Ten same-instant frame pairs, from the golden demux (clip, timestamp) against the reference's source-frame index,
   seed a similarity fit.
2. ICP refinement: 14,148 golden SfM points against the reference's 925k points, **5 mm median**. Scale is 1.029
   reference units per golden unit.
3. Cameras then agree to a 1.5 cm median centre offset and 0.19° median rotation.

Then the locked cameras were rendered at 1280×720 (62° and 32.3° horizontal field of view): the six targets (12
views), all 800 walkthrough poses, and the sheet overviews. Registration against the source crops is 1–3 px for
**both** models (shift scan in each label), so zero-shift coherent gain is not trustworthy; use the peak NCC.

| target | golden: peak mid-band NCC / edge 10–90 % | official | visual (1:1) |
|---|---|---|---|
| white wall | 0.54 | 0.54 | equal (both flat; official slightly cleaner) |
| ceiling grid | 0.83 / 4.78 px, contrast 32 | **0.91 / 5.95 px, contrast 76** (source 6.38 / 53) | official better: grid lines continuous, source-like contrast |
| window reveal | 0.80 | 0.83 | equal at 1:1; official cleaner at ordinary scale |
| chair slats | 0.93 / 4.48 px, contrast 139 | 0.92 / 4.23 px, contrast 162 (source 4.25 / 161) | equal; official less noisy, slats slightly softer |
| table edge | 0.92 | 0.90 | golden slightly crisper |
| carpet | 0.86 | 0.87 | equal |
| baseboard | 0.93 / 3.84 px | 0.94 / 4.29 px | equal |

**Ordinary-scale overviews (`overview_walk_*.png`, 1280×720 at 1:1)** — official clearly better:
- **w_00000:** the golden carpet patch is smeared and corrupted, the left wall smeared; official is clean, with
  crisp railings and a crisp door window.
- **w_00200:** golden has stair-step artifacts at the window and table edges and a smear by the right wall; official
  is clean.
- **w_00400:** golden has a blotchy wall and wobbly window reveals; official walls are uniform and the reveals
  straight.
- **w_00600:** similar, official slightly cleaner.

**Motion.** `walk_golden_left_ref_right.mp4`, on the volume only (too large to send). The official has **10 % lower**
high-pass frame-to-frame change: 3.17 vs 3.52; p95 4.50 vs 5.05.

**Not measured:** floaters. The G1 floater count needs a PLY in the golden frame; no transform was applied.

## 4. Capture-test plan and positions

`ROOM213_CAPTURE_TEST_PLAN_2026-09-29.md`:
- one window-wall bay at the back of the room;
- 12 stations measured from the back corner (X = 0.8 / 1.6 / 2.6 m out, Y = 0.5–3.5 m along), at two heights
  (1.0 / 1.6 m);
- **Set A:** X4 video on the same lines;
- **Set B:** X4 72 MP RAW/INSP stopped stills (not in-camera-stitched JPEG), with tilted extras;
- **Set C:** iPhone 48 MP, 5 views per station plus close detail passes;
- the identical `360-camera` recipe for all three sets.

**Not executed**, per the stop rule. The existing 2026-09-21 X4 stills are 5888×2944 in-camera-stitched JPEGs and
do not qualify as Set B.

## 5–7. X4-video vs X4-still vs iPhone-still, source-to-render lineage, bay comparison

**Not run.** Phase 2 triggered the stop. Planned processing and metrics are specified in the capture plan.

## 8. Cost and time (Modal billing, UTC 2026-09-29)

| item | cost |
|---|---|
| Reference app: frames/masks 36 min + SfM 31 min + training 59 min, L40S with 16–32 CPU and 64–128 GB RAM | $8.18 |
| Alignment and render (2 runs) plus smoke/probe | ≈ $0.5 (latest hour not yet final) |
| **Total** | **≈ $8.7** |

Wall-clock ≈ 2 h 45 min.

## 9. Final classification

**PROCESSING_LIMIT_CONFIRMED.** From the same original video, the official workflow is materially better at ordinary
viewing scale (coherence, solidity, artifacts, stability), while 1:1 fine texture is unchanged.

**What we cannot say from one run.** The official path differs in several ways at once:
- 7× more frames (2 fps rig-synced);
- Spirula SfM with a dual-fisheye rig and IMU gauge;
- a thin-prism-fisheye model;
- SAM masks;
- the pinhole-warp 3DGS primitive;
- PPISP and the bilateral grid.

Which of these carries the gain is **not isolated** here.

Whether stills raise the fine-texture ceiling further is still open. It is exactly what the capture test answers, if
it is approved after review.

## 10. One production recommendation

**Adopt the official Spirula Studio v2026.9.24 workflow as the reconstruction baseline, replacing the custom golden
pipeline:**
- 2 fps rig-synced frame extraction;
- Spirula SfM with the dual-fisheye rig and IMU gauge;
- SAM operator masks;
- `360-camera` preset.

Before any production use, validate it in the delivery viewer: its 3DGS primitive should match Spark's projection
better than 3DGUT did; this is untested. Nothing was merged or deployed.

**Do not start the capture test until this result has been reviewed.**
