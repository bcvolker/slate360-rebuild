# R213-INSP Phase 0: preflight result and capture plan (2026-09-30)

**Scope.** No training, no model changes. Only SfM registration and measurement. Compute was about $2, estimated from runtimes.

**Code and outputs.**
- Worker: `workers/modal/room213-insp/insp_preflight.py`. Conditions `AXd` (6 stills) and `AXd2` (all 11 stills) under `conditions/`.
- Measurement: the forensic harness, runs `i1` and `i2`.

## Result: the file path is understood and the photos register, but the local-agreement gate FAILS against the video

| Item | Finding | Evidence |
|---|---|---|
| **Any `.insp` in the existing data?** | **None.** The capture folder and the cloud raw set hold only .jpg, .dng, .insv and .lrv. | manifest + disk search |
| **What the DNGs really are** | **Unstitched dual-fisheye raw frames.** Two full 5952×5952 lens circles side by side in 11904×5952 Bayer data (decoded with rawpy). This corrects the 9/29 ledger, which called them "raw of the stitched equirect". | `dng089_small.jpg` |
| **1. Does v2026.9.24 read `.insp` through our CLI?** | **No.** `sam extract` (the CLI we use on Modal) handles video and `.lrv` only. `.insp` is read by the desktop GUI's dataset prep. | `gui/DatasetPrep.cpp:82, 2198-2241`; `FrameExtract.cpp:850-893` |
| **2. Lens extraction (official)** | Exact half crop, left half → `cam0`, right → `cam1`. No resampling. EXIF turn applied, then JPEG re-encode at q95 (`kPhotoJpegQuality`). On Modal we replicate this verbatim. | `Pano360.cpp:438-460`, `DatasetPrep.cpp:2152-2178` |
| **3. Dimensions** | Each lens 5952×5952, 1.55× the video lens (3840). | measured |
| **4. Metadata and calibration** | The GUI's rig for a packed 2-lens photo is `dual-fisheye` (`SfmRunner.cpp:529`). The only other metadata used is a **starting focal** ("focal × width", filled automatically for `.insv`, **not** for `.insp`). The help text warns that a bad fisheye guess "can stop the reconstruction from starting at all". | `SfmRunner.cpp:462-484`; i18n `focal_x_width_help` |
| **5. Camera model, rig, photo vs video calibration** | With no prior, SfM guessed f = 2679 px and **0/12 lenses registered**. With the official prior (0.281 × 5952 = 1672) they register, and SfM solves **photo lens 0: f = 1571 (0.264 × width)**, distortion close to the video lens. **Photo calibration ≠ video calibration** (0.264 vs 0.281 × width). Lens 1 is under-constrained with only 11 stills (distortion sign flipped). The still rig baseline is 2.0 cm against the video's 2.85 cm. | `rigs.txt`, `cameras.bin` (AXd2) |
| **6. Projection to training views** | Each lens becomes 5 cube faces of **2662², f = 1331** (video faces: 1718², f = 859), 2 loss scales, one bilinear tap. | `CameraMath.cpp:400-404` (code-derived) |
| **7. Unexpected resolution loss?** | None beyond the documented face-centre minification (1571 → 1331, 0.85×). The finest-band energy transfer at the targets measured 0.84–0.96. | harness `proj_transfer` |
| **Registration** (11 DNG stills + video 079, official flags + focal prior) | **22/22 lenses registered.** Still reprojection 0.62–1.56 px on the 5952 lens. Model 1.14 px. | AXd2 sfm log |
| **Local agreement at T2 carpet** (planar, 1.03 m, position 089) | **3.59 mm ≈ 5.6 training px off the video consensus.** The *stitched* panorama from the same exposure was 3.65 mm. Content correlation after registration is the same (0.33 / 0.60 / 0.83 vs 0.31 / 0.62 / 0.85). | runs i2 vs f4 |

## What this means

- **The audit's leading hypothesis is refuted.** Stitching did not cause the ~5 px panorama offset, because unstitched lens data from the identical exposure shows the same 3.6 mm offset.
- Two independent calibrations (the camera's factory stitch, and per-lens SfM self-calibration) agree with each other and disagree with the video.
- **Proven:** static X4 stills and the X4 walking video disagree locally by about 0.2° at 1 m.
- **Unresolved cause.** Candidates:
  1. a systematic bias in the moving video, such as rolling shutter or motion; the video agrees with itself (0.08 px) but may share the bias;
  2. still pose error driven by distant features;
  3. residual photo-lens calibration error.
- Nothing here supports a hardware ceiling.
- **Gate status:**
  - Photo path and registration: PASS.
  - Photo-vs-video local agreement: **FAIL (5.6 px vs ≤0.5 px)**.
  - Photo-vs-photo agreement: **not measurable** from 11 stills spread over the whole room (only 1–2 see any target well).

## Consequence for the experiment design (proposed change, needs approval)

A video + photo hybrid would recreate the AX6c conflict unless the new capture shows photo-video agreement ≤0.5 px. So:

- **TEST-S (primary positive control): stills only**, about 26 training stills + 4 held-out stills of one section. This answers the stated question on its own terms: sharp, mutually consistent, overlapping X4 photo observations, official workflow.
- **CONTROL-V: video only**, the same section, the established method.
- **TEST-H: video + stills.** Trained **only if** the gate shows photo-video local agreement ≤0.5 px.
- **Built-in discriminator:** the control video includes still-holds (3 s, no motion). If the held video frames agree with the stills but the walking frames don't, the cause is the moving video (rolling shutter or motion).

## Holdouts (Phase 2)

**Four pre-designated positions** (below). Their `.insp` files, both lens images and all faces derived from them are never placed in the SfM or training workspace.

**How the evaluation pose is obtained, without leaking holdout pixels into training:**
1. Run SfM on the training stills only.
2. Localise each holdout lens image against that frozen sparse model: absolute pose from 2D-3D matches (COLMAP/pycolmap), intrinsics fixed to the training solution for that lens, no triangulation, and no bundle adjustment of any training camera or point.
3. Cross-check (diagnostic only, never used for training): a separate SfM that includes the holdouts must reproduce those poses within ≤0.5 px at the targets.
4. Render the trained model at the localised holdout cameras (native Spirula) and compare with the real holdout images at identical framing and resolution.

## Expected training exposure (Phase 4, from the sampler code)

**Common to all runs:** one input image per step, 30,000 steps.

| Run | Inputs | Views | Exposure per input | Photo share |
|---|---|---|---|---|
| CONTROL-V (≈90 s video) | 360 | 1800 | ≈83 steps | — |
| TEST-S | 52 lens images | 260 | ≈577 steps | 100% |
| TEST-H | 412 | 2060 | stills ≈73 steps | 12.6% of steps (AX6c: 0.6%) |

Photo pixels carry 0.42× a video pixel's per-step weight (per-step mean over 35 M vs 14.8 M pixels). This is re-checked against the real dataset before any launch.

**Estimated cost:**

| Item | Cost |
|---|---|
| 3 small SfMs | about $1 |
| CONTROL-V training | about $2 |
| TEST-S training | about $2.5 |
| TEST-H training | about $2.5 |
| Renders + harness | about $1 |
| **Total** | **≤ $9** (≈$6.5 without TEST-H) |
