# Room 213 viewer fidelity: validated fix + remaining-loss audit (2026-09-25)

**Branch:** `feature/room213-viewer-fidelity` (worktree `C:\s360-viewer-fidelity`). It starts from
`origin/feature/aob205-spatial-experience-v3` at `b962a837`, the branch that carries the client `TwinExperience`.

**Diagnostic inputs:** commit `420f1352` on `feature/spirula-worker-hardening`
(`docs/ops/ROOM213_DETAIL_LOSS_DIAGNOSTIC_2026-09-25.md`). The harness updates for this follow-up are on that same
branch.

**Scope limits:**
- No training, SfM, cloud jobs, model changes or deploys. The only new storage objects are a copy of the golden
  PLY and its config/provenance, written under the existing experimental diagnostic prefix.
- The `slate360-backyard-exp` job was not touched; it was still running throughout.
- Nothing was merged or deployed.

**Artifacts:**

| folder | contents |
|---|---|
| `docs/ops/room213-viewer-fidelity-2026-09-25/crops/` | lossless crop sheets |
| `docs/ops/room213-viewer-fidelity-2026-09-25/app/` | real-app captures |
| `docs/ops/room213-viewer-fidelity-2026-09-25/data/` | all numbers and runtime logs |
| `docs/ops/room213-viewer-fidelity-2026-09-25/*.mp4` | motion clips |

## 1. Four-condition comparison in the real browser

**Setup:**
- Spark 2.1.0 from the app's own `node_modules`; same models as the diagnostic.

  | model | PLY sha256 | Gaussians |
  |---|---|---|
  | golden | `7e7b5d18…` | 996,092 |
  | edge-aware | `a74847f5…` | 993,740 |

- Same 12 matched views and 25-frame motion sequence. The references were re-verified:
  - 202 Spirula renders hash-match their records.
  - The rectified sources are bit-identical to the Spirula eval ground truth.
- Each condition ran in a fresh document (a new WebGL context, SparkRenderer and accumulators).
  `preBlurAmount` was set to 0 explicitly. The SH correction was off. Everything else was unchanged: LoD on at
  2.5M, `extSplats` input, radial sort, black background, 1280×720 buffer at DPR 1.
- The baseline reproduces the diagnostic's product render bit-exactly.
- Effective values were read back from the live shader uniforms (`data/v2_*__info.json`).

**Conditions:**

| condition | accumExtSplats | preBlurAmount | blurAmount | uniform `enableExtSplats` / `blurAmount` read back |
|---|---|---|---|---|
| baseline | false | 0 | 0.3 | false / 0.3 |
| ext only | true | 0 | 0.3 | true / 0.3 |
| blur0 only | false | 0 | 0 | false / 0 |
| **combined** | true | 0 | 0 | true / 0 |

### f=640 (ordinary scale)

Each cell is per view (a0_indep / a3_indep / a0_fixed), then the **mean** in parentheses. Full f=640 and f=1280
tables are in `data/fidelity_4cond.md`.

**Golden**

| stage | fine coherent gain | fine NCC | fine incoherent | luma − Spirula | baseboard 10–90 % px |
|---|---|---|---|---|---|
| Spirula (trainer) | 0.67 / 0.53 / 0.48 (**0.56**) | (**0.726**) | (**0.53**) | 0 | 2.25 / 2.36 / 2.60 (**2.40**) |
| baseline | 0.40 / 0.33 / 0.32 (**0.35**) | (**0.624**) | (**0.44**) | −6.1 / −5.6 / −5.5 (**−5.7**) | 2.81 / 3.47 / 3.77 (**3.35**) |
| ext | 0.50 / 0.41 / 0.39 (**0.43**) | (**0.661**) | (**0.49**) | (**−1.9**) | (**3.32**) |
| blur0 | 0.48 / 0.41 / 0.39 (**0.42**) | (**0.643**) | (**0.51**) | (**−5.6**) | (**2.90**) |
| **combined** | 0.60 / 0.50 / 0.47 (**0.52**) | 0.685 / 0.679 / 0.678 (**0.681**) | (**0.56**) | −1.8 / −1.8 / −1.8 (**−1.8**) | 2.40 / 2.96 / 3.40 (**2.92**) |

**Edge-aware**

| stage | fine coherent gain | fine NCC | fine incoherent | luma − Spirula | baseboard 10–90 % px |
|---|---|---|---|---|---|
| Spirula (trainer) | 0.69 / 0.57 / 0.56 (**0.60**) | (**0.758**) | (**0.52**) | 0 | 2.46 / 2.72 / 2.26 (**2.48**) |
| baseline | 0.39 / 0.35 / 0.34 (**0.36**) | (**0.643**) | (**0.43**) | (**−6.0**) | (**3.54**) |
| ext | (**0.45**) | (**0.684**) | (**0.48**) | (**−2.6**) | (**3.32**) |
| blur0 | (**0.44**) | (**0.663**) | (**0.49**) | (**−5.8**) | (**3.11**) |
| **combined** | 0.60 / 0.53 / 0.51 (**0.55**) | 0.692 / 0.699 / 0.725 (**0.705**) | (**0.55**) | −1.1 / −3.4 / −2.7 (**−2.4**) | 2.79 / 3.12 / 2.66 (**2.85**) |

### Chair-back edge, 10–90 % width (f=640)

| stage | golden | edge-aware |
|---|---|---|
| source | 2.09 | 2.09 |
| Spirula | 1.62 | 1.56 |
| baseline | 2.42 | 2.58 |
| ext | 2.39 | 2.61 |
| blur0 | 1.61 | 1.73 |
| **combined** | **1.54** | **1.58** |

### f=1280 (2× zoom) mean coherent gain

| stage | golden | edge-aware |
|---|---|---|
| Spirula | 0.33 | 0.38 |
| baseline | 0.24 | 0.26 |
| **combined** | **0.31** | **0.35** |

Baseboard at f=1280: golden 4.40 → 4.20 (Spirula 3.78); edge-aware 4.63 → 3.72 (Spirula 3.26).

### Motion

25 frames, 1.5 mm per frame. Shimmer is the mean of |2nd temporal difference| of the fine band divided by its std.

| stage | golden | edge-aware |
|---|---|---|
| Spirula | 0.139 | 0.154 |
| baseline | 0.653 | 0.701 |
| ext | 0.591 | 0.629 |
| blur0 | 0.567 | 0.609 |
| **combined** | **0.500** | **0.528** |

The combined setting closes **30 % (golden) and 32 % (edge-aware)** of the gap between Spark and Spirula. It is a
non-regression, **not motion parity**. Clips: `motion_*_spirula_baseline_combined.mp4`.

### What each setting does (isolated results)

- **ext accumulator** (unclamped colour) removes almost all of the darkening: −5.7 → −1.9. It also gives most of
  the mid-band gain (0.65 → 0.81).
- **blur 0** gives the edge gain:

  | edge (golden) | baseline | blur0 |
  |---|---|---|
  | chair | 2.42 | 1.61 |
  | baseboard | 3.35 | 2.90 |

- The two are **additive** for fine detail: gain 0.35 → 0.52.
- **LoD is not a factor.** A combined render with LoD off matched LoD on (gain 0.522 in both). Its shimmer was
  identical (0.500).

### Acceptance against the initial targets

| target | golden | edge-aware | verdict |
|---|---|---|---|
| mean f=640 coherent gain ≥ 0.50 | 0.52 | 0.55 | **PASS**. Per view, golden a0_fixed is 0.47, but Spirula itself only reaches 0.48 there |
| mean brightness within 3 levels of Spirula | −1.8 | −2.4 | **PASS on the mean**. Per view, edge-aware a3_indep is −3.4 |
| baseboard within ≈0.3 px of Spirula | +0.52 (+0.15 / +0.60 / +0.80) | +0.37 (+0.33 / +0.40 / +0.40) | **FAIL** |
| source-correlated detail, not just energy | NCC +0.06; coherent gain +49 % | NCC +0.06; coherent gain +52 % | **PASS** |
| no new halos, holes or clipping; no chair degradation | chair 1.54 (better) | chair 1.58 | **PASS** by inspection (`crops/*_x3.png`) and edges |

Two cautions:
- At f=1280, the incoherent ratio (0.66–0.68 vs Spirula 0.52–0.54) shows the combined setting also adds some
  non-source fine energy when zoomed in.
- Motion non-regression passes (0.50 < 0.65), but only 30 % of the gap to Spirula closes.

**Chosen configuration: combined** (`accumExtSplats: true`, `preBlurAmount: 0`, `blurAmount: 0`), applied only to
verified Spirula `3dgut` models.

It recovers **82 % (golden) and 76 % (edge-aware)** of the f=640 coherent-detail gap between the old product render
and Spirula. Per view the range is 74–94 % and 70–82 %; at f=1280 it is 78 % and 75 %.

It does **not** close:
- a ~0.4–0.5 px baseboard widening;
- ~70 % of the motion-shimmer gap.

## 2. What changed in Slate360

| file | why |
|---|---|
| `lib/digital-twin/spark-render-profile.ts` (new) | One place for how Spark draws a model. `SPARK_DEFAULT_PROFILE` is unchanged Spark behaviour. `SPIRULA_3DGUT_PROFILE` is the combined setting. `resolveSparkRenderProfile(manifest)` selects Spirula only from explicit provenance (trainer `spirula` + primitive `3dgut` + verified trainer revision `fd1afca1…` + screen blur 0); it never uses file name, SH degree or extension. `sparkRendererArgsFor` passes `accumExtSplats`, `blurAmount` and `preBlurAmount` explicitly. `profileForScene` handles several models under one renderer. The file documents why above-one colour must be preserved and keeps input storage (`extSplats`) separate from accumulator storage (`accumExtSplats`) |
| `lib/digital-twin/twin-manifest.ts` | `SplatManifest.training_rasterizer` (provenance type). The sibling-manifest fallback now also handles `kind=ply` URLs |
| `components/digital-twin/splat-viewer-scene.tsx` | Shared viewer, used by `SplatViewerCore` → `SplatViewer`, `TwinShareSplatViewer`, `TwinExperience`, `/preview/twin-splat`. Resolves the profile from the manifest it already fetches, then mounts `<sparkRenderer key={url#profile}>` only once the profile is known, because `accumExtSplats` is fixed at construction. Restarts the load watchdog when the renderer mounts. Mounts a dev-only probe |
| `components/digital-twin/desktop/DesktopSplatViewport.tsx` | Same profile wiring (desktop editor) |
| `components/digital-twin/desktop/CinematicSplatViewport.tsx` | Presentation / cinematic path. Now fetches the manifest for the profile, so presentation draws the same as the shared viewer |
| `components/digital-twin/MeshSplatLayer.tsx` | Keeps its own Brush-B appearance args by default. Switches only when the manifest proves a verified Spirula model |
| `components/digital-twin/splat-render-debug.tsx` (new) | Development-only probe (`window.__slateSplatDebug`; absent when `NODE_ENV=production`). Exposes the effective uniforms, framebuffer size, camera and a lossless frame capture. This is what the verification reads |
| `app/preview/room213-splat/{page.tsx,asset/route.ts}` (new) | Real-app harness for the two verified models. It streams the exact PLYs and builds the manifest's `training_rasterizer` from the models' own stored provenance (Spirula resolved `config.json` → `primitive`; run `COMPLETED.json` or benchmark manifest → revision). `provenance=off` gives the before image. Not served when `VERCEL_ENV=production` |
| `app/preview/spark-fidelity-fixture/{page.tsx,asset/route.ts}` (new) | Regression fixture: two stacked α 0.35 Gaussians with colour 1.8, through the real viewer |
| `e2e/spark-render-fidelity.spec.ts` (new) | Asserts the selected profile reaches the live renderer, and the pixel result: 255 with provenance vs < 190 without; measured 255 vs 153. When the Spirula profile is forced back to the packed accumulator, the spec fails |
| `lib/digital-twin/spark-render-profile.test.ts` (new) | Provenance rules (including the negative cases that must not get zero blur), scene-mixing rule, args, and that every Spark viewer builds from the resolved profile |

**Zero behaviour change for existing models.** No production model's manifest carries `training_rasterizer`, so
every model today still draws with `SPARK_DEFAULT_PROFILE`. This was verified live on the AOB205 splatfacto twin
through `/preview/aob205/twin` (`TwinExperience`): profile `spark-default`, blur 0.3, packed accumulator.

**To generalize:** the Spirula worker (or any trainer) must write this into the model manifest:
- `training_rasterizer: { trainer, trainer_revision, primitive, screen_blur_px2 }`
- Nothing else is needed.

A new trainer or revision is added to `VERIFIED_SPIRULA_REVISIONS` only after a matched-view comparison like §1.

**Mixed models:** SparkRenderer settings are scene-wide. Every Slate360 viewer mounts one SplatMesh per
SparkRenderer. `profileForScene` is the rule if that ever changes: agree, or fall back to the default.

**Revert:** revert the commit. Alternatively, drop `training_rasterizer` from a manifest to put that model back on
the default profile.

## 3. Verified through the actual application

Route: `/preview/room213-splat`, which runs `SplatViewerCore` → `SplatViewerScene` → Spark, served by the app. Local
dev server only; nothing deployed.

- **Artifact:** the app requested `asset?…&kind=ply` (the exact PLY) and the manifest. The manifest's provenance
  came from storage, for example `"trainer_revision":"fd1afca1…+resume-nsh-2f6a873bb639"` for the edge-aware model.
  There is no conversion: the PLY goes straight to Spark's loader. The loader's decode was checked in the diagnostic
  (centres exact, opacity/DC ≤ 2.4e-4, SH clamp noted in §5).
- **Effective settings (after):** profile `spirula-3dgut`, `accumExtSplats` true, display accumulator ext true,
  uniform `enableExtSplats` true, `blurAmount` 0, `preBlurAmount` 0.
- **Framebuffer:** 1597×897 = CSS 1278×718 × DPR 1.25. There is no CSS scaling or dynamic resolution.
- **Retention across lifecycle:**
  - Retained after an in-page model switch (golden ↔ edge-aware via client navigation, same canvas).
  - Retained after a forced WebGL context loss: the canvas remounts, the manifest is re-read, and the profile comes
    back as `spirula-3dgut`.
  - Retained after container resize (900×500 and back; the buffer follows CSS × DPR). Fullscreen in
    `TwinViewerCanvasShell` is the same resize of the same canvas.
  - `provenance=off` gives `spark-default`. The cinematic/presentation viewport now uses the same resolver.
- **Matched check in the app:** the app camera sits exactly at a source-camera centre (difference 2e-10), so the
  source can be rectified through the app's own logged camera (f ≈ 861 px). Scored the same way as §1:

  | model | fine coherent gain | fine NCC | mid gain | RGB − source |
  |---|---|---|---|---|
  | golden before → after | 0.33 → **0.43** | 0.519 → 0.548 | 0.68 → 0.82 | (−4.2, −3.9, −5.2) → (−2.0, −1.2, −1.5) |
  | edge-aware before → after | 0.34 → **0.45** | 0.519 → 0.550 | 0.68 → 0.82 | → (−0.9, +0.4, −0.3) |

  Lossless frames are in `app/app_*_before*.png` and `app/app_*_after*.png`, with `app/sheet_*.png` alongside.
- **Regression test:** `npx playwright test e2e/spark-render-fidelity.spec.ts` → 2 passed (headless Chromium /
  SwiftShader). `npx vitest run lib/digital-twin` → 118 passed.
- **Gates:**

  | gate | result |
  |---|---|
  | scoped `tsc` on all changed files | 0 errors |
  | `guard:architecture` | PASS |
  | `guard:design` | PASS |
  | `guard:file-size-regression` | fails only on a pre-existing file untouched here (`WalkthroughStudio.tsx`, 309). Changed files are ≤ 300 |

  The repo's eslint config has no rules. A full `next build` was not run: the dev server shares the worktree's
  `.next`.

## 4. Performance, memory and mobile

**Accumulator GPU storage, measured from the allocated render targets:**
- packed: 20 B per splat slot (RGBA32UI + RGBA8)
- ext: 36 B per splat slot (2×RGBA32UI + RGBA8)

| case | packed | ext | increase |
|---|---|---|---|
| after 12 views (two accumulators at 968,704 slots) | 38.7 MB | 69.7 MB | **+31 MB** |
| single view | 18 MB | 32 MB | +14 MB |
| mobile 400k budget | 15 MB | 27 MB | +12 MB |

This is GPU texture storage for the per-frame accumulators only. The model's own storage is unchanged, because the
app already loads `extSplats: true` input, and so is total application memory. The change does not double memory.

**Frame time:** measured on this laptop's GPU in the in-app browser.
- Method: moving camera, render + 1-pixel readback per frame.
- The distribution is bimodal. Most frames are < 1 ms when the accumulator is reused; p90 is 65–100 ms when Spark
  regenerates and sorts.
- Mean 19.5–21.0 ms (baseline) vs 20.4–22.7 ms (combined). There was no consistent difference between conditions.
- One p99 outlier: 213 ms (edge-aware, combined).
- This is not a controlled GPU benchmark.

**Load time:** 5.8–8.5 s in all conditions. No systematic difference; it is dominated by the PLY decode and LoD
build.

**Memory growth:** in-page model switching grows the JS heap.

| code | first load | after 5 loads |
|---|---|---|
| this branch | 438 MB | 756 MB |
| the original code | 492 MB | 1157 MB |

This is pre-existing (old models' CPU data is retained); this change does not cause it. It is recorded as a
lifecycle issue.

No context loss or crash occurred except the one I forced deliberately, which recovered.

**Mobile 400k LoD budget:** active splats drop to 400,000, but carpet coherent gain, NCC, baseboard and shimmer are
identical to 2.5M at these views (golden combined gain 0.522 in both). LoD keeps what is on screen.

The app picks the 400k budget from the viewport (`max-width: 768px` or `pointer: coarse`), not the device. A narrow
desktop window got 400k in testing.

**iPhone: NOT VALIDATED.** There was no physical phone. Browser emulation is not evidence of iOS GPU or memory
viability. Manual check:
1. On the current TestFlight or Safari, open this branch's `/preview/room213-splat?model=golden&provenance=on` on a
   LAN dev server (`npm run dev:https`).
2. Wait for the model, orbit for 60 s, and switch to `provenance=off` and back twice.
3. Pass if there is no reload, no black canvas and no Safari "a problem repeatedly occurred", and the carpet
   visibly matches `app/sheet_golden_a0_after.png`.
4. Repeat with the edge-aware model.

## 5. Remaining losses in this path, ranked by measured impact

**1. Confirmed and materially harmful**
- *(fixed)* Packed accumulator clamps per-splat colour to [0, 1].
- *(fixed)* Blur 0.3 with compensation applied to `3dgut` models, which were trained without a screen filter.
- *(not fixed)* **Unexplained residual vs Spirula:**
  - baseboard ≈ +0.5 px;
  - fine NCC −0.05;
  - shimmer 0.50 vs 0.14.

  It is not LoD (measured), not the SH clamp (≤ 0.01 gain, diagnostic check), and not negative colours (CPU
  estimate ≤ 0.05 px). The remaining candidate is the rasterizer model itself: Spark projects a 2D Gaussian with the
  Jacobian at the centre and cuts it at 2.83 σ, while Spirula `3dgut` evaluates the 3D Gaussian's maximum along each
  pixel ray. This is plausible but unmeasured in isolation, and needs renderer instrumentation. It is the main thing
  standing between this fix and Spirula parity, especially for motion.

**2. Confirmed but small**
- **Spark SH exponent clamp.** Each SH triplet's largest channel is clamped to 2^floor(log2 max). This is in the Rust
  `encode_ext_rgb` that the installed WASM loader uses (a JS-only patch had no effect, shown in the diagnostic). It
  is unchanged in upstream v2.2.0 and `main`. Effect ≤ +0.01 coherent gain. **Not fixed:** it needs an upstream fix
  or a WASM rebuild, and upgrading would not help.
- **Negative per-splat colours reach blending unclamped on the ext path.** Spirula clamps them at 0. 6–11 % of splats
  near the baseboard are affected; the CPU estimate is ≤ 0.05 px of edge width. Upstream v2.2.0 clamps these (PR
  #387). **Not upgraded:** the diagnostic evidence is too small to justify a dependency change without a separate
  regression run against this baseline. It is a reasonable follow-up.
- **Mobile budget chosen by viewport width.** No quality loss measured at these views.

**3. Plausible but unmeasured**
- Stale sort during live motion. The harness waits for each sort, so it measures the settled image.
- iPhone GPU and memory behaviour of the ext accumulator.

**4. Pre-existing, outside the visual path (confirmed)**
- JS-heap growth on in-page model switches (§4).

**Already cleared**
- Export and ext-input decode of centre, scale, quaternion and opacity (diagnostic).
- Colour space: no tone-mapping chunk; sRGB output; `encodeLinear` false.
- Premultiplied blending into RGBA8.
- Canvas DPR and CSS sizing.
- Desktop LoD, including motion.
- fp16 centres (packed only; gone on ext).
- Duplicate accumulators: one renderer per canvas; a profile change replaces the renderer rather than duplicating it.
- Context-loss remount.

## 6. Plain answer

- **How much existing detail did the fix recover?** In the real browser at the ordinary viewing scale, it recovers
  about **80 %** of the carpet detail that Spark was losing relative to the trainer's own render: 82 % golden, 76 %
  edge-aware; per view 70–94 %. It also removes most of the darkening: 5.7–6.0 levels → 1.8–2.4. Chair edges now
  match the trainer. The same improvement appears in the real Slate360 viewer: carpet coherent gain 0.33 → 0.43 and
  0.34 → 0.45 at the app's own camera.
- **Is it visible and stable?** It is visible at 1:1 (`crops/*_carpet_1to1.png`, `app/sheet_*.png`). Under motion it
  is steadier than before (shimmer −23 %) but still about 3.5× less stable than the trainer's render.
- **What remains before this is a commercially acceptable walkthrough:**
  - **Motion stability.** Spark still shimmers far more than the model does in Spirula.
  - A ~0.5 px edge softening.

  Both point at the difference between Spark's 2D splat rasterization and Spirula's 3D ray evaluation, not at the
  model. iPhone validation is also still outstanding.
