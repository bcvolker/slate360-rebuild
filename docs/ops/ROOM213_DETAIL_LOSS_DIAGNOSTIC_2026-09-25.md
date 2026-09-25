# Room 213: where the carpet detail is lost (training, export or Spark) — 2026-09-25

This was a render-only diagnostic. No training, fine-tuning, pose optimization, new SfM, deployment or third-party upload
was done. The running backyard job (`slate360-backyard-exp`) was not touched. Everything here ran in a new, separate
Modal app (`slate360-room213-detail-diag`) and in a local browser harness. The benchmark volume was mounted read-only,
and outputs went to new prefixes only: R2 `experimental/spirula-hardened/detail-diag-2026-09-25/` plus this folder.
Scripts are in `workers/modal/room213-detail-diag/`. Data, crops and clips are in `docs/ops/room213-detail-diag-2026-09-25/`.

## Answer

- **Does the trained model contain useful detail that the product loses? Yes.** At the ordinary viewing scale (f=640),
  Spirula's own render of the saved model keeps a carpet fine-band coherent gain of 0.56–0.60 against the source
  (NCC 0.73–0.76). The same PLY in the product's Spark viewer drops to 0.35–0.36 (NCC 0.62–0.64). It is also about
  6 grey levels darker, its baseboard edges are about 1 px wider, and it shimmers 4–5× more under motion.
- **Where it disappears: in Spark, not in training or export.** Export is lossless: all parameters are bit-exact and
  SH differs by at most 2e-7. The Spirula renders from the saved state and from the reloaded PLY are the same image
  (≤1 grey level on 0.02 % of pixels). The loss happens inside Spark 2.1.0's default render path. The largest measured
  cause is its **packed splat accumulator**, which clamps each splat's colour to [0, 1]. About 62 % of this model's
  carpet splats have a colour channel above 1. Two smaller causes follow:
  1. Spark's `blurAmount` 0.3 with opacity compensation. The `3dgut` primitive was trained with no 2D blur at all.
  2. An SH exponent clamp in Spark's ext encoder (measurable, minor).
- **Is the edge-aware gain real?** Partly, and only in Spirula's render. At matched cameras it raises carpet NCC by
  about +0.03 and coherent gain by +0.04 at f=640. Through Spark it is erased (gain 0.35 → 0.36) and edges get slightly
  worse. The earlier "Spark gate FAIL" was the viewer hiding a small real gain. It was not proof that the gain didn't exist.
- **Visible at ordinary scale and stable under movement?** The Spirula-vs-Spark difference is plainly visible at 1:1,
  f=640 (`crops/stages_*_f640_1to1.png`, `crops/fullframe_*`). Spirula's render is also far steadier under a 1.5 mm/frame
  translation (shimmer 0.14–0.15 vs 0.65–0.70 in Spark). The edge-aware-vs-golden difference is small at 1:1 and is not
  a reason to retrain.
- **Recommended next change:** a viewer change, not a training change. Configure the product's Spark renderer to keep
  full-precision splats: `SparkRenderer({ accumExtSplats: true })`, and match the trainer's filter with `blurAmount: 0`
  (the product's `MeshSplatLayer` already uses 0). The CPU model predicts this restores Spirula-level carpet detail. One
  measurement is still needed before shipping it: a real Spark render with those two settings at these 12 matched views,
  plus the 25-frame motion clip (≈ $0, local). It was not run because this brief's limit of two targeted checks was
  already used (see §8).

## 1. Identities, versions, settings

| item | value |
|---|---|
| Golden 1M final | volume `room213/2026-09-21/spirula_bench_v1/runs/room213_spirula_full/step-000030000.ckpt`; `splat.ply` sha256 `7e7b5d18…3a62` (= manifest), `state.tar` `3d078464…9e89`, `config.json` `91ca1988…e685`. **996,092** Gaussians (state 1,000,000 → export filter drops 3,505 opacity < 1/255 + 403 dead-scale) |
| Edge-aware final | R2 `…/runs/room213-edgeaware-densify-v1/final/…-a01/run/step-000030000.ckpt`; `splat.ply` `a74847f5…e5ee`, `state.tar` `7fea0dca…4c94`, config `42953a6f…42f0` (all = accepted inventory). **993,740** Gaussians (5,817 + 443 filtered) |
| PLYs used in the earlier Spark gate | byte-identical to the two above (same sha256) |
| Resolved config diff (golden vs edge) | only `densify_loss_map_mode` (`ssim_cs` → `edge_aware`) plus paths. Both: `primitive=3dgut`, `warp_to_pinhole=false`, divisor 1, cap 1M, 30k, SH 3, PPISP/bilateral grid off, `use_camera_optimizer=false`, `quantization_level=1` (SH values stored 16-bit), `background_color=[0,0,0]`, `scene_center=none` (train_from_world = identity, re-verified in every diagnostic run's `scene_transform.json`) |
| Trainer | golden trained by `fd1afca1c47f…` (unpatched binary `24cf3ca8…`); edge by `fd1afca1+resume-nsh-2f6a873bb639` (binary `dce42548…`). All diagnostic renders used the patched binary, hash-checked in the container |
| Resume patch exercised? | **Yes, by stage A only.** `--resume` → `restore_checkpoint` targets `num_sh=(3+1)²−1=15`, which matches the checkpoint, so no host adapt happened ("Checkpoint layout differs" absent in all 4 logs). Resumed at step 30000, 0 steps trained. The unpatched binary would have taken the adapt path (15→16 SH resample). Stage B (`--init-ply`) never calls `restore_checkpoint` |
| Spark | `@sparkjsdev/spark` **2.1.0**, three **0.184.0** (the app's `node_modules`) |
| Product viewer reproduced | `splat-viewer-core.tsx` + `splat-viewer-scene.tsx` (used by the client `TwinExperience`): `WebGLRenderer({antialias:false, alpha:true})`; `SparkRenderer({enableLod:true, lodSplatCount: 2,500,000 desktop / 400,000 mobile})`; `SplatMesh({lod:true, enableLod:true, extSplats:true})` |

Effective Spark settings, read from the live renderer (`data/*__info.json`):

| setting | value |
|---|---|
| Covariance blur | `blurAmount` 0.3 **with** opacity compensation `α·sqrt(detOrig/det)`; `preBlurAmount` 0 |
| Projected splat extent | `maxStdDev` √8 = 2.83 σ (discard beyond); `maxPixelRadius` 512; `minPixelRadius` 0; `clipXY` 1.4 |
| Min alpha | 0.5/255 |
| Sort | `sortRadial` true (distance to camera); float32 keys (`sortSplats32`) |
| LoD | on; `lodSplats` = 1,439,668 nodes (golden) / 1,409,621 (edge); active splats per view 472k–967k |
| Packing | Source `extSplats`: centre fp32, α / rgb / log-scale fp16, quaternion 10/10/12 bits, SH = shared exponent + 8-bit per triplet. **Render accumulator: `accumExtSplats` false → packed 16-byte splats**: centre fp16, rgb 8-bit **clamped [0,1]**, α/2 8-bit, ln-scale 8-bit over [−12, 9], quaternion 8/8/8 |
| Colour | `encodeLinear` false, no tone-mapping chunk in Spark's shaders, output sRGB, premultiplied alpha blending into an RGBA8 drawing buffer |
| Output | exact 1280×720 drawing buffer, pixel ratio 1, PNG from the canvas (no browser resize). Background black, to match Spirula's eval (the product uses `#0B0F15`; this only affects non-opaque pixels) |

## 2. SH / export contradiction: resolved

- The PLY has 62 properties: x y z, nx ny nz (all 0), f_dc_0..2, **f_rest_0..44**, opacity, scale_0..2, rot_0..3.
  45 = 3 × 15, so the model is **SH degree 3**. f_rest is channel-major (r0..r14, g…, b…); `rot_0` = w; scales are
  natural-log; opacity is a logit. This was read from the writer (`EngineCheckpoint.cpp`) and verified on the data.
- The phrase "degree-2 PLY" in earlier reports refers to the **Gaussian kernel degree** (exp(−½d²)), which contrasts
  with FullCircle 3DGRT's degree-4 particles. It does not refer to SH degree. Spirula `3dgut` evaluates exactly that
  degree-2 kernel along each ray (`evaluate_alpha_3dgs`). Both statements hold; nothing is truncated.
- Saved state vs exported PLY, measured (`state_vs_ply.py`):
  - means, quaternions, log-scales, opacity logits and f_dc are **bit-exact** for both models.
  - f_rest vs the decoded 16-bit state store: max diff 2.1e-7 (golden) and 1.8e-7 (edge).
  - The only difference is the documented filter (opacity < 1/255 and dead scale), which Spirula's renderer skips anyway.
- Spark's decoded values, first 4096 splats, LoD off (`spark_decode_check.py`):
  - centres exact; log-scale ≤ 0.016; quaternion ≤ 0.42°; opacity and DC colour ≤ 2.4e-4.
  - **SH degree 1–3 all present, but up to 0.25 / 0.36 / 0.45 off.** Spark's `encodeExtRgb` uses the exponent
    `floor(log2(max|c|))` with an 8-bit mantissa, so the largest channel of every SH triplet is clamped to that power
    of two (to 50–100 % of its value). This is an SH truncation in Spark 2.1.0, done in the wasm loader (patching the
    JS copy of the encoder had no effect).

## 3. Stages and cameras

- **A:** saved `state.tar`, Spirula `--resume` eval.
- **B:** exported PLY via Spirula `--init-ply`, `--num-iterations 0`, eval with the same primitive and settings.
  A and B are independent loaders over independent files (state.tar vs splat.ply).
- **C:** the same PLY in Spark with the product settings.

The eval split was 12 pinhole views from 3 real source-camera centres (frozen photorealism targets):
- `camera1/frame_00036` (carpet_a0 / a5 indep)
- `camera2/frame_00104` (carpet_a3 indep, table a4)
- `camera2/frame_00103` fixed (carpet_a0 fixed, chair a2)

Each view was rendered at f=640 and f=1280, 1280×720, cx=640, cy=360, pixel centre +0.5, OpenCV axes, w2c in
`images.txt`. Spirula's eval order is shuffled by its DataManager, so every render was matched to its view by its
eval-GT image, which is bit-exact to the reference PNG.

Reference: the source fisheye was rectified through the same rays. That was valid because every view's centre equals
the source camera centre (difference ≤ 4e-16). Resampling was the solve's own Kannala-Brandt model, 4×4 supersampled
bilinear. Invalid pixels were excluded: outside the lens, or the dataset keep-mask (operator, pole). Note that the
earlier `targets_src` references sampled the fisheye 0.5 px off (no −0.5 on the remap). Measured against the
corrected references, that is a 0.2–0.7 px shift at the render, which lowered earlier fine-band NCCs. They were rebuilt
here.

## 4. Matched crops

In `docs/ops/room213-detail-diag-2026-09-25/crops/`, all lossless PNG straight from the render targets:

| file | contents |
|---|---|
| `stages_<view>_1to1.png` | ordinary scale: source, golden A, golden B, golden C, edge A, edge B, edge C |
| `stages_<view>_x3nearest.png` | 3× nearest-neighbour zoom of the same |
| `checks_<view>_x3nearest.png` | the two targeted checks |
| `control_*` | baseboard and chair controls |
| `fullframe_carpet_a0_indep_f640_*.png` | full frame: source \| golden A / golden C \| edge C |

No stage is unavailable. B is shown although it is identical to A.

## 5. Measurements (carpet ROI, same mask and bands for everything)

Definitions:
- Luma is BT.709. Fine band = g − G(1.5 px); mid band = G(1.5) − G(4).
- Scored mask = carpet ROI ∧ valid, eroded by 12 px.
- Coherent gain = cov(render, source)/var(source): how much of the source's weave the render reproduces, in amplitude.
- Incoherent ratio = std(render − gain·source)/std(source): band energy the source doesn't explain (noise, ringing,
  aliasing).
- No shifting or re-alignment was applied. A ±2 px scan found the NCC peak at (0,0) in 50 of 66 crop/stage pairs and at 1 px
  in the other 16 (almost all at f=1280). That shift changes the NCC by 0.01 or less.
- Edge width = 10–90 % rise of the mean cross-edge profile.

The source's fine band includes sensor grain, so NCC 1.0 is not reachable. Compare stages against each other, not
against 1.

**f=640 (ordinary scale; mean of the 3 camera centres)**

| stage | fine energy ×src | fine NCC | fine coherent gain | fine incoherent | mid NCC | mid coherent gain | mean RGB − src | baseboard 10–90 % px (src 1.98) |
|---|---|---|---|---|---|---|---|---|
| golden A | 0.77 | 0.726 | 0.56 | 0.53 | 0.935 | 0.90 | −2.4 | 2.41 |
| golden B | 0.77 | 0.726 | 0.56 | 0.53 | 0.935 | 0.90 | −2.4 | 2.41 |
| golden C (Spark, product) | 0.56 | 0.624 | 0.35 | 0.44 | 0.886 | 0.65 | −8.2 | 3.35 |
| edge A | 0.80 | 0.758 | 0.60 | 0.52 | 0.945 | 0.90 | −0.8 | 2.48 |
| edge B | 0.80 | 0.758 | 0.60 | 0.52 | 0.945 | 0.90 | −0.8 | 2.48 |
| edge C (Spark, product) | 0.56 | 0.643 | 0.36 | 0.43 | 0.898 | 0.63 | −6.7 | 3.54 |
| golden C, check 1 (SH fix) | 0.57 | 0.628 | 0.36 | 0.44 | 0.887 | 0.66 | −8.6 | 3.11 |
| golden C, check 2 (2D filter) | 0.65 | 0.640 | 0.42 | 0.50 | 0.884 | 0.72 | −7.1 | 2.87 |
| edge C, check 2 (2D filter) | 0.67 | 0.661 | 0.44 | 0.50 | 0.897 | 0.71 | −5.2 | 2.58 |

Chair-back edge (px): source 2.09, golden A/B 1.62, golden C 2.42, edge A/B 1.56, edge C 2.58. Check 2 widens it (2.94 / 2.73).

**f=1280 (2× focal at the same frame size = a narrower field of view, not recovered detail)**

| stage | fine energy | fine NCC | fine coherent gain | mid coherent gain | mean RGB − src | baseboard px (src 2.58) |
|---|---|---|---|---|---|---|
| golden A = B | 0.62 | 0.535 | 0.33 | 0.73 | −2.1 | 3.78 |
| golden C | 0.61 | 0.389 | 0.24 | 0.54 | −7.8 | 4.40 |
| edge A = B | 0.66 | 0.571 | 0.37 | 0.75 | −0.4 | 3.26 |
| edge C | 0.63 | 0.410 | 0.26 | 0.54 | −6.9 | 4.63 |

Chair-back edge (px) at f=1280: source 4.25, golden A 4.48, golden C 4.71, edge A 4.62, edge C 4.69.

What the tables show:
- **Export has no effect** (A ≡ B).
- **Spark is the loss** at both focal lengths. At f=640, coherent gain falls about 0.21, mid gain falls about 0.25, and
  the image darkens about 6 levels. Spark's incoherent ratio is lower: the lost energy is correct weave, not noise.
- **Edge-aware vs golden, same renderer:** in Spirula, carpet NCC +0.03, coherent gain +0.04, and baseboard at f=1280
  is 0.5 px sharper. In Spark, carpet is unchanged and baseboard slightly worse.
- **At f=1280 every render sits well below source.** Rotation-only f=1280 references upsample the fisheye (native
  ≈1070 px/rad), so this condition is partly source-limited. Treat it as a zoom condition, not the product scale.
- Full per-view numbers are in `data/measurements.json`.

**Motion** (25 frames, 1.5 mm/frame lateral, carpet_a0_indep f=640; `motion.py`, `motion_*_A_C_Cfilt.mp4`). Shimmer =
mean |2nd temporal difference| of the fine band / its std:

| | golden | edge |
|---|---|---|
| Spirula (A) | 0.139 | 0.154 |
| Spark product (C) | 0.653 | 0.701 |
| Spark check 2 | 0.564 | 0.593 |

There is no ground truth for translated cameras. These are temporal-stability measures only.

## 6. Why Spark loses it: CPU instrumentation, validated against the real renders

`cpu_raster.py` re-implements both per-pixel models from the installed sources, for 4 carpet crops × 2 models:

| model | how it renders |
|---|---|
| Spirula `3dgut` | ray / Mahalanobis max-response, **no 2D dilation**, 1/255 skip, z order, T > 1e-4 |
| Spark | EWA + blur 0.3 with compensation, 2.83 σ cut, minAlpha, radial back-to-front, RGBA8 rounding per splat, packed-accumulator quantization |

Validation:
- The CPU Spirula model reproduces the real stage-A crops at 33–45 dB (one f=1280 crop at 27.6 dB).
- The CPU Spark model reproduces the real stage-C crops at 34–40 dB, but **only with the packed-accumulator
  quantization included**. Without it, agreement is 26–32 dB and the model keeps far more detail than real Spark.
- With it, the CPU model reproduces real Spark's coherent gain (0.39–0.42 vs 0.35–0.39) and its 4–10-level darkening.

Attribution, one factor at a time (`cpu_packed_attrib.py`, `cpu_colour_split.py`; f=640 fine coherent gain):

| factor | golden a0_indep | golden a0_fixed | edge a0_indep | edge a0_fixed |
|---|---|---|---|---|
| Spark with ext (full-precision) accumulator | 0.577 | 0.396 | 0.582 | 0.439 |
| + fp16 centres only | 0.574 | 0.385 | 0.567 | 0.427 |
| + 8-bit ln-scale only | 0.575 | 0.396 | 0.587 | 0.441 |
| + 8-bit quaternion only | 0.578 | 0.396 | 0.583 | 0.438 |
| + per-splat colour clamp to [0,1] only | **0.427** | **0.335** | **0.402** | **0.358** |
| + 8-bit colour without clamp | 0.576 | 0.395 | 0.584 | 0.439 |
| + 8-bit α/2 only | 0.576 | 0.396 | 0.581 | 0.440 |
| full packed accumulator (= product) | 0.424 | 0.323 | 0.389 | 0.350 |
| ext accumulator + `blurAmount` 0 | 0.686 | 0.479 | 0.693 | 0.535 |
| Spirula (real) | 0.665 | 0.444 | 0.674 | 0.512 |

What the attribution shows:
- 60–65 % of the splats near the carpet have a view-evaluated colour above 1. They are mostly semi-transparent splats
  the optimizer brightened. Spirula blends them unclamped; Spark's packed accumulator clamps them. That single step
  accounts for the darkening and most of the contrast loss.
- 2D blur compensation is the second cause. It reduces opacity for footprints near 1 px.
- The fp16 centre error is small here (p50 0.5 mm, p99 4 mm).
- Float vs 8-bit blending and the 2.83 σ cut barely matter.
- LoD: the real LoD-off render matches LoD-on at 57 dB (desktop budget 2.5M). LoD is not a factor on desktop. The
  400k mobile budget was not measured.

## 7. Footprints

These are contributor footprints from the same instrumentation (`cpu_footprints.json`). Weights are each splat's
accumulated α·T over the crop. They are not spacings.

| | f=640 | f=1280 |
|---|---|---|
| Contributing splats per 128×96 crop | 1.7k–3.4k | same splats, 2× the pixels |
| Weighted σ_minor p10 / p50 / p90 | 1.1–1.4 / 10–18 / 39–52 px | about 2× these |
| Weight carried by σ_minor < 0.5 px | < 1 % | — |
| Weighted opacity p50 | 0.20–0.30 | — |

Carpet texture scale in the source at these views: autocorrelation half-width 2–3 px, band-energy peak wavelength
≈ 11–13 px.

So at the ordinary scale, most coverage comes from splats several times larger than the weave, and the weave is carried
by the small-footprint tail (σ ≈ 1–4 px). Spirula's own render of that allocation still reaches 0.56–0.60 coherent gain,
and 0.67 in the cleanest view. **Footprint-limited splitting (a Mini-Splatting2-style change) is not justified by this
evidence:** the missing detail at product scale is removed by the viewer, not absent from the model. At f=1280, all
renders plateau near 0.33–0.37 gain. That is where allocation or source sampling could matter, but it is a zoom
condition. It should be revisited only after the viewer contract is fixed.

## 8. Targeted checks (two, render-only, original settings preserved)

1. **SH decode correction.** The same PLY coefficients were re-encoded into Spark's own ext slots with exponent +1 (no
   clamp). Decoded SH then matched to ≤ 0.002. Image change was 41–42 dB, with f=640 coherent gain +0.01 at most.
   **The truncation is real but minor** for this model.
2. **2D filter matched to classic 3DGS** (`preBlurAmount` 0.3, `blurAmount` 0, i.e. no compensation). Coherent gain
   0.35 → 0.42–0.44, baseboard 3.35 → 2.58–2.87 px, shimmer −13 %; the chair edge got wider. I chose this on a first
   reading of Spirula's projection code (eps2d 0.3 without compensation for non-antialiased primitives). The raster
   kernel later showed that `3dgut` evaluates the kernel along the ray with **no** 2D dilation, so the trainer-matched
   setting is `blurAmount` 0. That setting was not rendered for real. Its effect above comes from the validated CPU
   model only.

In addition, one Spark render with LoD off was needed for §2's file-order decode. It doubles as the LoD isolation
(no effect on desktop).

## 9. Cost and runtime

| item | details | cost |
|---|---|---|
| Stage A/B GPU call | L40S, 4 Spirula runs, 72.5 s in function + container start | — |
| Motion call | 2 runs, 59 s | — |
| **Modal total** | image layers were cached, so no rebuild | **≈ $0.30 upper bound** at L40S + 8 CPU + 64 GB rates |
| Everything else | Spark renders (local GPU, about 15 passes), CPU instrumentation, R2 transfers | ≈ $0 |

The total is well under the $5 cap. Wall time was about 1 h 45 min.

## 10. Recommendation

**One change: in the product's Spark viewer, set `accumExtSplats: true` and `blurAmount: 0`.** Apply both in
`splat-viewer-scene.tsx` and the desktop / cinematic viewports, and align `MeshSplatLayer`.

Before shipping it, take the one remaining measurement. Render those settings in the real Spark at the 12 matched views
plus the 25-frame motion clip, using the existing harness (`spark/index.html?blur=0` plus an `accumExtSplats` flag).
Acceptance:
- f=640 carpet coherent gain ≥ 0.50,
- darkening within 3 levels of Spirula,
- baseboard within 0.3 px of Spirula,
- shimmer not above the product's current 0.65.

Also check load time and memory on a phone: the ext accumulator doubles per-splat memory.

Do not launch another training or densification experiment until then. At product scale the model already holds more
detail than Spark shows, and edge-aware's small gain should be re-judged only through the fixed viewer.
