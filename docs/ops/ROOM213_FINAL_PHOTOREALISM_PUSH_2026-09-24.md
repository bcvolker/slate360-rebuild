# Room 213 — final bounded photorealism push (2026-09-24)

Hardened worker, build `fd1afca1+resume-nsh-2f6a873bb639`, native fisheye, 218 training views, 1M cap, 30k steps,
SH3. Every experiment changed exactly one resolved-config field (verified by diffing Spirula's own `config.json`
against the golden run). Commercial gate = the ordinary exported PLY rendered in Spark (the app's viewer), on frozen
targets defined from source data before any training. R2: `experimental/spirula-hardened/photoreal/`.

## 1. Actual baseline settings (resolved `config.json` of the successful run, not defaults)

| field | value |
|---|---|
| `use_ppisp` | **false** (stock default true; the job passes `--use-ppisp 0`) |
| `ppisp_param_type` | `no_crf_no_vig` |
| `use_bilateral_grid` | **false** (stock default true; `--use-bilateral-grid 0`) |
| `bilagrid_type` / shape | `ppisp` / 16×16×8 (TV 10, Adagrad lr 0.04) |
| `train_resolution_divisor` | 1 |
| `loss_scale_min_pixels` | **1920** → engine resolves ⌊log2(3840/1920)⌋+2 = **3 loss scales** at 3840² |
| `num_loss_scales` | 0 (TrainerCore adds 1; used only when `loss_scale_min_pixels` = 0) |

Astra was right. Eval renders (`engine_eval_forward`) never apply PPISP or the grid, so eval = raw splats = export.

## 2. Source-evidence prerequisites (no training)

- **Decode chain.** X4 `.insv`: HEVC Main 8-bit, `yuvj420p`, full range (pc), BT.709 matrix, transfer and
  primaries (all 3 clips, both lenses). The training PNG is **bit-identical** to a default ffmpeg/PyAV decode of the
  frame (VID_075 stream 1 frame 1120 = camera2/frame_00103). Only BT.709 full range reproduces it (max 2 levels);
  BT.601 is up to 14 off, limited range 20+. No linearization.
- **Loss tensor.** Spirula's eval-gt write-back equals the source PNG bit-exactly (maxdiff 0; 24 holdouts + fixed).
  `image_color_*` unset.
- **Walkthrough ordering.** By camera identity: Spark renders at the 800 manifest walk poses (frame k = pose k).
- **Frozen targets.** Anchors in the predefined crops, 3D-projected into every training camera (no image matching):
  - table edges, window frames, carpet, chair slats — repeatable (≥ 3 independent exposures, mid-band NCC ≥ 0.5);
  - ceiling — not demonstrated, so excluded.

  44 Spark target views: real source-camera centres, f=640 (walkthrough) and f=1280 (2×), plus the rectified source.

## 3. Experiments (Spark = exported PLY)

| | Exp 1 PPISP | Exp 2 bilateral grid | Exp 3 full-res-only loss |
|---|---|---|---|
| change | `use_ppisp` → true | `use_bilateral_grid` → true | `loss_scale_min_pixels` 1920 → 0 (1 scale) |
| Gaussians | 996,403 | 996,600 | 995,915 |
| Spark target edge width, walkthrough scale / 2× | ±1 % / ±3 % | ±1 % / −2…−5 % | ≈0 % / table −13 %, window −5 % |
| Spark walk clip (255 f): grad / flicker / wall speckle | 24.43 / 8.32 / 1.52 (base 24.22 / 8.24 / 1.51) | 24.17 / 8.17 / 1.53 | 23.84 / 8.19 / 1.54 |
| held-out PSNR / SSIM / LPIPS (base 19.21 / 0.715 / 0.272) | 19.19 / 0.715 / 0.270 | 19.22 / 0.716 / 0.264 | 19.16 / 0.716 / 0.278 |
| carpet fine texture at training camera (base 0.40× source) | 0.48× | 0.39× | 0.33× |
| gate | **FAIL** | **FAIL** | **FAIL** |
| complete GPU cost | $2.01 | $2.91 | $1.89 |

- **Exp 1.** PPISP engaged: the module initialized, the Adagrad accumulator is non-zero, and parameters moved from
  zero (max 1.69, still changing after step 5k). But the learned corrections are tiny: exposure ±0.026 stops std
  (max 0.07), colour 1.5 / 4.8 levels median / max. At the fixed training camera the correction moves the render
  3.9 levels and gains +0.03 dB against the source. The X4 frames have almost no global per-image exposure or white
  balance error to fix. **PPISP ACTIVE — EXPORTED QUALITY FAIL.**
- **Exp 2.** Pinned grid defaults (above). No visible or measured change in the exported PLY.
- **Exp 3.** Crop PSNR rises 0.6–1.2 dB (a better fit to the mean) while edge and fine-band energy fall. Only the
  table at 2× moves more than 10 %. It is not plainly visible, and fine texture gets worse.

## 4. Feature lineage (manually validated correspondences; no silhouettes or homographies as pose evidence)

| target | source → PNG → tensor | usable independent obs | cross-edge (fixed-view px) median / p90 / max | render at training camera (1M) | class |
|---|---|---|---|---|---|
| baseboard top edge | identical, 2.9 px | 39 | 0.97 / 2.15 / 2.75 | 2.6 px (sharp) | sharp + aligned |
| chair-back slat stripe | identical, 1.9 px | 5 validated (3 motion-blurred and 3 mismatched excluded) | 0.9 / 2.4 / 2.8 | 2.0 px (sharp) | sharp + aligned |
| carpet texture (2D shift) | identical | 13 of 14 repeatable (7 at fine band) | 0.4 / 1.4 / 2.2 | fine energy 0.40× | repeatable, **texture lost** |
| table top edge | identical, 1.5 px | 3 valid (others see the far side = occlusion edge) | ≈ ±3 | 3.3 px (2.2×) | multi-view / visibility |
| recessed window frame | identical, 2.65 px | 31 (view-dependent reveal) | 0.7 / 3.3 / 3.8 | 4.4 px (1.7×) | multi-view / visibility |
| ceiling tile corner | identical, 2.65 px | 6 (3 unusable: blur or wrong feature) | inconclusive | 4.55 px | insufficient evidence |

- **Chair.** The validated residuals are −0.24, −1.37, +1.44, +2.10 and +2.34 px, with the fixed view at +2.45 px:
  a majority cluster plus two close-range views. The render places a sharp edge with the majority (+3.45 px) instead
  of averaging, and its stripe contrast (66) exceeds this frame's own (18). It is rebuilt from the sharper views.
- **Along-edge.** Unobservable on straight edges (aperture). The tile corner gives 2D residuals but too few valid
  views.
- **Lens offset.** Baseboard residuals split by lens: camera1 +2.8 mm, camera2 −1.6 mm, uncorrelated with image
  radius (ρ = 0.07). That points to a small rig or per-lens calibration offset, not distortion.
- **3M allocation.** Around the chair edge 3M adds 1.4× more Gaussians within 10 mm (global ratio 3.0×). Around the
  table it adds few. The extra capacity went broadly elsewhere, including wall grain.

## 5. Why nothing moved: error map at the targets (1M model, fixed training camera)

Densification uses `densify_loss_map_mode = ssim_cs`. Per-target 1−SSIM_cs, ranked against every pixel of the view:

| target | percentile |
|---|---|
| window | 16th |
| carpet | 23rd |
| chair | 27th |
| baseboard | 28th |
| table | 62nd |
| tile corner | 78th |

The image median is 0.24. It is dominated by flat, grainy walls and ceiling whose per-frame sensor or codec grain
cannot be fitted. The soft structural targets and the recoverable carpet texture are therefore **low error, i.e.
ignored**. That is consistent with 3M spending capacity on wall speckle.

## 6. Remaining gap vs source

- Surface edges whose views agree are already reproduced at source sharpness.
- 3D edges (table far edge, recessed frames) are limited by view-dependent visibility.
- Fine surface texture that is sharp in the close, near-normal views is lost at 0.3–0.5× fine energy, because the
  densification signal is swamped by un-fittable grain.
- The recoverable detail that remains is repeatable carpet texture and the lost fine structure. It is present in the
  source but is not targeted by the densification signal.

## 7. Cost

| item | cost |
|---|---|
| Exp 1 ($1.85 + $0.16 probe) | $2.01 |
| Exp 2 ($2.72 + $0.19 probe) | $2.91 |
| Exp 3 ($1.72 + $0.17 probe) | $1.89 |
| **GPU total** | **$6.81** |

All read-only diagnostics ran on CPU (< $1). One trainer at a time; each experiment stayed under its $4.50 cap.

## 8. Recommendation (not launched)

One targeted error-map test at 1M: `densify_loss_map_mode` `ssim_cs` → `robust_edge_aware` (pinned quantile 0.9),
everything else frozen. It is Spirula's own noise-robust edge-weighted densification signal, and it addresses exactly
the ignored-target finding. No capacity, iterations, appearance or loss-pyramid changes.

**Verdict (photorealism-push list): D. TESTED PIPELINE HAS PLATEAUED BUT SOURCE STILL CONTAINS RECOVERABLE DETAIL.**

## Addendum — densification-map selection + one edge_aware run (2026-09-24/25)

**Correction.** The full reconstruction of the trainer's densification map (3-scale pyramid, power 4, 14 training
views) shows the flattest grainy wall and ceiling tiles at the **bottom** of the baseline `ssim_cs` map (2.4 / 0.4
percentile). Per pixel, structured areas already get 4.8× the weight of flat ones. The earlier "capacity chases
grain" statement came from a single-scale, unpowered proxy and is withdrawn. The real finding stands: the soft
targets rank only 14–41 (ceiling grid 68).

**Phase 1 (zero-GPU) candidates:**

| candidate | targets percentile | flat-pixel weight |
|---|---|---|
| `ssim_cs` p2 / p1 | about the same | more (worse) |
| `robust_edge_aware` q0.9 | targets up to 63–80 | more (16.3 → 21.8 %) |
| `edge_aware` | targets 59–100 | 16.3 → 0.01 % |

`edge_aware` was the only clear improvement, and was selected.

**Phase 2 run** (`densify_loss_map_mode` → `edge_aware`, everything else = baseline; 993,740 Gaussians, strict
gate passed, 81 min, ≈ $2.64 + $0.13 probe).

Capacity moved as intended:

| region | baseline | edge_aware |
|---|---|---|
| carpet | 6 Gaussians (22 mm) | 18 (9 mm) |
| baseboard | 2 | 9 |
| ceiling | 158 | 181 |
| chair slat | 27 | 4 |

Carpet texture at the training camera improved:

| carpet measure | baseline | edge_aware |
|---|---|---|
| fine-band energy (× source) | 0.40 | 0.55 |
| mid-band NCC | 0.70 | 0.79 |
| mid-band energy (× source) | 0.52 | 0.64 |

**Gate: FAIL.**
- Spark target edge widths −4 % … +4 % (noise); no plainly visible change at walkthrough scale.
- Walkthrough clip: gradient 24.38 vs 24.22, flicker 8.29 vs 8.24, flat speckle 1.54 vs 1.51.
- Held-out PSNR 19.20 vs 19.21, LPIPS 0.275 vs 0.272.
- Ceiling-grid edge at the training camera got softer (4.55 → 8.2 px).

Per the stop rule, **the current custom Spirula recipe is closed.** The stock v2026.9.24 trainer control (Phase 3) was
prepared but **not run**: the build needs a compiler flag (`-include stddef.h`, no source change) and a retried
checkout. It awaits approval.
