# Room 213 — upstream quality bottleneck decision (2026-09-28)

Isolated diagnostics only. The golden model, state, PLY, cameras, source files, worker guards and deployed viewer are
untouched. **No training was launched.** Evidence: `docs/ops/room213-upstream-decision-2026-09-28/`. Scripts are in
`scripts/`; outputs are on volume `slate360-recon-experiments:room213/2026-09-28/camera_guidance/`.

## 1. Decision: **GUIDANCE_FIRST** (normals only; not depth)

- **The bounded camera correction fails held-out validation.** Golden cameras: 1.03 px median. Rigid-rig correction:
  1.21 px, 17 % worse. The fitted landmarks got worse too (1.11 → 1.25 px), so the constraint conflicts with the data.
  No residual pattern points to lens, radius or calibration error.
- **Normal maps are geometrically credible on the room's architecture.** Median error against the solved floor,
  ceiling and wall planes is 2–5° in 5 of 6 frames. Neighbouring exposures agree to 5.5°. Window recesses and chair
  slats are resolved.
- **Depth maps are not credible enough.**
  - The ceiling sits 7–11 % too far relative to the floor in 3 of 6 frames.
  - Walls ripple by 0.04–0.16 units RMS.
  - The periphery is compressed by 23–26 % in one frame.
  - Chairs are biased 3–18 % too far.
  - Distant views disagree by 8–10 %.
- **Expectation.** The benefit should be limited to planar architecture: flatter walls and ceiling, sharper recess
  facets, fewer grain-like wall splats. It is **not** expected to restore carpet micro-texture. The candidate must prove
  itself visually at 1:1.

## 2. Camera-consistency evidence (golden FullCircle COLMAP 3.12.6 solve, native 3840² fisheye, f ≈ 1075 px/rad)

**Rig consistency in the golden solve.** The solve has no rig constraint: each lens's pose is free per exposure. Across
all 121 exposures:
- relative lens rotation deviates from its mean by a median of **0.104°** (p90 0.198°, max 1.75°), ≈ 1.95 px at the lens;
- baseline 0.029 units (coefficient of variation 0.20).

**Independent landmarks.**
- Found by rotation/scale NCC search seeded only by the point's own SIFT neighbourhood (±80 px), then ECC affine
  refinement and a 48/64/80 template bootstrap.
- No camera prediction is used to find a match.
- Observations come from distinct exposures ≥ 0.25 units apart.
- 452 landmarks were attempted; 761 measurements were accepted (uncertainty median **0.49 px**).
- 130 landmarks have ≥ 4 observations.
- Split by class **before** fitting: 66 FIT / 64 HELD-OUT landmarks, giving 302 held-out leave-one-out tests.

| held-out subgroup | n | golden median / p95 (px) | rig-corrected median / p95 |
|---|---|---|---|
| **overall** | 302 | **1.03 / 3.62** | **1.21 / 3.90** |
| carpet | 72 | 0.85 / 1.93 | 0.85 / 2.33 |
| chair (positive control) | 76 | 0.81 / 2.66 | 1.12 / 3.09 |
| table | 82 | 1.11 / 3.66 | 1.35 / 3.94 |
| "ceiling-height" ⚠ | 43 | 1.36 / 19.9 | 1.64 / 19.4 |
| "wall band" ⚠ | 29 | 1.98 / 4.21 | 2.11 / 4.16 |
| lens 1 / lens 2 | 125 / 177 | 1.03 / 1.03 | 1.11 / 1.28 |
| radius 0–800 / 800–1300 / 1300–1700 | 57 / 168 / 73 | 1.07 / 1.05 / 0.94 | 1.24 / 1.26 / 1.08 |
| image row 1280–2560 / 2560–3840 | 160 / 142 | 1.20 / 0.89 | 1.42 / 1.01 |
| speed ≤ median / > median | 153 / 149 | 0.91 / 1.23 (Spearman 0.14) | 1.10 / 1.32 |
| angular velocity | — | Spearman 0.02 | — |
| room u < 0 / u ≥ 0 | 135 / 167 | 0.94 / 1.19 | 1.08 / 1.34 |

⚠ **Class audit** (`correspondence_sheet.png`): the automatic "ceiling" landmarks landed on window-head recesses at
ceiling height. The repetitive ceiling grid fails the uniqueness gate. The "wall band" rows are a pole crossing a door,
an occlusion edge that was excluded by rule. Both classes are **invalid** for their named feature and reported only
for completeness. Carpet, chair and table are valid. The before/after comparison is paired on identical observations,
so the conclusion does not depend on the class labels.

**Residual classification (golden).**

| Hypothesis | Verdict | Evidence |
|---|---|---|
| Fisheye calibration | not supported | Radius curve is flat (1.07 → 0.94) |
| Rig / extrinsic | not supported | Lenses are identical (1.03 / 1.03), and enforcing the rig hurts |
| Pose error | small signature | Per-image mean displacement 0.71 px vs within-image spread 0.83 px (39 images with ≥ 3 tests); noise alone would give ≈ 0.45 |
| Timing / rolling shutter-like | weak | Fastest speed quartile 1.35 px vs ~0.95 at Q1–Q2; no angular-velocity effect |

The golden median (1.03 px) is ~1.8× the leave-one-out noise floor from annotation alone (≈ 0.56 px). That leaves
≈ 0.86 px of real disagreement, and no rigid model tested here removes it.

## 3. Before/after held-out result — `heldout_before_after.png`

- **Correction model (one):**
  - the golden solve re-expressed as one rigid two-lens rig;
  - one shared `sensor_from_rig`, 121 frames;
  - shared per-lens OPENCV_FISHEYE focal length and k1–k4 refined, principal point fixed as in golden;
  - no per-frame intrinsics, crop warps or homographies.
- **Fitted on:** golden SIFT tracks (271,669 observations) plus FIT-landmark measurements only.
- **Bounded:** pose change median 0.052°, p95 0.168° (max 1.83°, one exposure); centre shift median 0.0037 units;
  focal length −0.3 / −0.6 px.
- **In-sample SIFT residual:** median 1.13 → 1.18 px, mean 1.28 → 1.75 px.
- **HELD-OUT:** 1.03 → 1.21 px median. **FIT:** 1.11 → 1.25 px. It fails the > 25 % improvement bar and gets worse
  in every subgroup except carpet (unchanged). Verdict: **FAIL** (worse, not merely overfit).

## 4. Visual correspondence sheet — `correspondence_sheet.png`

- 10 held-out landmarks, 2 per class, each with up to 6 observations.
- Native 96×96 crops, nearest-neighbour ×3.
- Green + = independent measurement. Red circle = golden leave-one-out prediction. Orange circle = rig-corrected
  prediction. Per-tile error in px.

## 5. Depth / normal feasibility — `guidance/depth_normal_feasibility_sheet.jpg`, `guidance/guide_eval.json`

**Route.** This follows Spirula's own `spirula geometry` / `GeometryWarp` design:
- MoGe-2 `moge-2-vitb-normal`, the Spirula default (`moge2-vitb`);
- 9 overlapping pinhole faces (front plus 8 faces tilted 60°; 80° field of view; 1024²), sampled through the golden
  OPENCV_FISHEYE intrinsics;
- per-face scale aligned in the overlaps;
- cross-faded back into a 960² native fisheye grid, as ray distance plus camera-frame OpenCV normals facing the camera.

Frames: cam1/36, cam1/37, cam2/103, cam2/104, cam1/103, cam1/60.

| check | result |
|---|---|
| White wall plane | Wall-plane RMS 0.04–0.16 units, visibly wavy in depth. Normals: wall-plane error 2.2–8.3° median, uniform in the normal map |
| Window / recess | Normals resolve reveal and head facets (distinct colours, sheet cam1/36 and cam1/60). Depth flattens the recess into the wall at this scale. Glass is predicted as a surface, not a reflection |
| Ceiling / grid | Normals 1.8–6.1° from the solved ceiling. Depth 7–11 % too far relative to the floor in 3 of 6 frames (ceiling-to-floor shape error). Grid lines appear only as faint normal seams |
| Carpet / floor | Floor normals 2.9–6.6° median. No hallucinated relief from the carpet pattern. Floor depth within 5 % on 43–77 % of pixels; periphery compressed −23 to −26 % in cam1/60 |
| Chairs / tables | Thin slats kept in normals. Depth at SfM chair points biased +3 to +18 %. Merged-into-floor rate 0 % (chairs), ≤ 8 % (tables) |
| Cross-view | Adjacent exposures agree to 2–3 % depth and 5.4–5.8° normals. Wide baselines (to cam1/60): 8.5–10 % depth, 27–42° normal disagreement on the reprojected overlap. Per-image metric scale 0.92–1.28 (harmless: Pearson loss) |
| Flags | Face-scale jumps 0.55–1.55× before alignment (seams 11–25 % → 1.3–4 % after). The lens rim (outside ~1800 px) gets garbage values: must be masked. The operator gets geometry: masked by the dataset masks. Ceiling light panels show as small near-blobs |

Depth fails the credibility bar (shape/scale errors and wide-baseline inconsistency, and Spirula's depth loss is a
per-image Pearson correlation that shape distortion corrupts). Normals pass it for planar architecture and thin
furniture, with rim, operator and highlight masking.

## 6. Guidance implementation audit (Spirula fd1afca1; HEAD 737161d is not materially different)

- **Folders and matching.** `depth_dir=depths`, `normal_dir=normals`. Files are matched by path relative to `images/`
  (`DatasetCommon.cpp:232-250`); only .png and .jpg are tried.
- **Depth format.** 1-channel uint16 PNG, used raw (`DataManager.cpp:547-549`). The loss is a **Pearson correlation**
  over linear values, so it is scale- and shift-free; inverse depth is not supported (`per_pixel_losses.slang:386-405`).
  0 means invalid. `depth_unit_scale_factor` is unused.
- **Ray distance vs z-depth.** Set by `input_depth_is_ray_depth` (default: vote by lens; wide fisheye resolves to ray
  distance). Rendered depth is treated as ray distance (`EngineLoss.cpp:554`).
- **Normals.** 8-bit RGB, byte/127.5−1, camera frame OpenCV (x right, y down, z forward), facing the camera; black means
  invalid (`ImageConvert.cu:135`, `pixel_wise.slang:350,411`). They are compared with **rendered-depth-gradient
  normals**. There are no per-Gaussian normals (`render_normal` is null).
- **Projection.** Maps are expected in each camera's **native** image space, OPENCV_FISHEYE included. They are
  resampled bilinearly to the render resolution. The depth-to-normal step unprojects through the real fisheye model.
- **Masks.** Validity only (0 or black), ANDed with the image mask. No confidence input.
- **Weights.**
  - `depth_supervision_weight` 0;
  - **`normal_supervision_weight` default 0.01** — trap: a `normals/` folder with `load_normals` on silently enables it;
  - `median_*` 0;
  - `supervision_warmup` 0; no stop.
- **Loading gate.** A map is loaded only if `load_*` is on and its weight is above 0.
- **Map generation.** `spirula geometry` (MoGe-2 or Metric3D) is built only with `SS_BUILD_SAM`, which is off for the
  golden CUDA build. Maps must come from an external generator, as in this pass.
- **Golden config.** 3DGUT, `warp_to_pinhole` 0, loading off, weights 0. Nothing in the code disables guidance for 3DGUT
  or native fisheye; the only hard block is equirectangular input.
- **Worker contract.** `jobspec.py:32` locks `--load-depths 0 --load-normals 0`. `--normal-dir`, `--supervision-warmup`
  and `--input-depth-is-ray-depth` are not in the allowed list. `gate.final_acceptance` pins the dataset and
  resolved-config hashes. A guided run therefore needs a **separate experimental path**: its own dataset ID, allowed
  and locked flag sets, and expected config hash. The golden guards stay unchanged.

## 7. Remaining Spark discrepancy (existing renders only; not fixed)

**What the earlier "~5 grey levels" meant.** It was the *mean over pixels of the largest per-channel absolute
difference* (5.5 over the full carpet_a0_indep_f1280 frame).

| region | signed mean bias (B, G, R) | mean absolute difference | RMSE |
|---|---|---|---|
| Full frame | −3.6 / −2.9 / −2.7 (Spark darker) | 3.94 | 5.42 |
| White wall | −5.2 / −6.2 / −7.2 (darker, slightly cooler) | 6.22 | 6.93 |

**Wall grain.**
- Fine-band standard deviation: Spark 1.21, Spirula 0.53, source 1.54.
- The difference has 2–4 px spatial correlation (autocorrelation 0.46–0.52 at 1 px, ~0 by 5 px), so it is **not
  per-pixel noise** (dithering or quantization: 80 grey levels, correlated structure).
- It is **world-attached**: the f640 and f1280 renders of the same wall correlate at 0.60 (7 px-shifted control
  0.007).
- Most consistent with **projected-Gaussian evaluation and compositing differences** (Spark's 2D EWA splat vs
  Spirula 3DGUT's per-ray particle response) on the model's large, flat wall splats.
- The accumulator path (accumExt already on), SH evaluation and alpha compositing were **not isolated**: remaining
  attribution is UNKNOWN beyond "splat-attached, not screen-space".

## 8. The one proposed future candidate — **R213-G1: normals-only monocular guidance** (NOT executed)

**Cameras and training.** Golden sparse/0, masks and split are byte-identical. Every Spirula setting equals
`spirula_resolved_config.json` (3DGUT, native fisheye, 30k iterations, 1M budget, same seed and build), except:

| flag | golden | G1 |
|---|---|---|
| `--load-normals` | 0 | **1** |
| `--normal-dir` | — | `normals` |
| `--normal-supervision-weight` | 0 | **0.01** (the code default; no tuning) |
| `--load-depths` / `--depth-supervision-weight` | 0 / 0 | 0 / 0 (unchanged) |
| `--median-normal-supervision-weight`, `--supervision-warmup`, `--use-bilateral-grid-for-geometry` | 0 / 0 / 0 | 0 / 0 / 0 (unchanged) |

**Map generation.** Validated pipeline = `scripts/guide_maps.py`, extended to every train and eval frame:
- MoGe-2 vitb-normal on 9 faces (80° field of view, 1024², 60° ring tilt);
- normals rotated to the camera frame, cross-faded with a 12 % edge ramp, renormalized and flipped to face the camera;
- written at **1920²** as 8-bit PNG to `normals/cameraN/<same filename>`;
- no depth maps written.

**Masking (write black):**
- dataset mask = 0 (operator, rim);
- sensor radius > 1800 px;
- overlapping faces disagree by > 10°;
- luminance ≥ 250 (light panels, window-glass highlights), dilated 5 px;
- MoGe mask = 0.

**Pre-training gate** on ≥ 12 frames:
- floor, ceiling and wall normal error ≤ 5° median against the SfM planes;
- adjacent-exposure world-normal agreement ≤ 6° median;
- rim, operator and highlight masks reviewed on a sheet.

A frame that fails ships an all-black normal map (no guidance) rather than bad guidance.

**Execution path.**
- Separate experimental job: dataset ID `room213-golden-v1+normals-moge2b-v1`, its own allowed and locked flags, and
  its own expected config hash.
- Golden guards unchanged.

**Comparison cameras, fixed now:**
- the six matched views and ROIs of the 1:1 sheets: carpet_a0_indep f640/f1280, carpet_a5_indep, carpet_a3_indep,
  carpet_a0_fixed, chair_slats_a2_fixed, table_edges_a4_indep. Targets: chair slats, table edge, window reveal,
  ceiling grid, carpet, white wall;
- the 24 true held-out frames: `camera1|2/frame_00005…00115_eval`, every 10th. `_fixedeval` files are byte-identical
  to training frames and are not held out;
- ordinary full-room views: walkthrough poses `walk/w_00000, w_00200, w_00400, w_00600`.

**Evaluation order.**
1. SOURCE → GOLDEN native → G1 native (Spirula eval at identical cameras).
2. Spark only after the native comparison passes.

**PASS requires all of:**
- visually obvious improvement at 1:1 and at ordinary scale on walls, ceiling and window recess;
- no regression on chair slats, table, carpet;
- no new floaters or opacity artefacts;
- no temporal instability on the walkthrough path.

No aggregate metric alone passes it.

## 9. Estimated time and cost (before authorization)

| step | estimate |
|---|---|
| Normal maps, 256 frames on L4 | ~1–1.5 h, ~$1.2 |
| Map validation sheets | CPU, ~$0.2 |
| Training on L40S (golden-equivalent worker run: 55 min / ~$1.8–2.0) | ~1 h, ~$2.0 |
| Native eval renders + 1:1 sheets | ~$0.5 |
| **Total** | **≈ $4, ~3 h wall-clock** |

This diagnostic pass spent ≈ $1 (Modal CPU for landmarks, L4 for 6 guidance frames).

## 10. STOP

No training was launched. No golden artefact, camera, guard, worker config or viewer setting was changed. R213-G1
awaits explicit authorization.
