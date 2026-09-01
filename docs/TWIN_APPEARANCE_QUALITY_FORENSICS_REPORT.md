# Twin appearance quality forensics

Diagnostic only. No retrain, no SfM, no TSDF, no SIM3 edit, no dashboard, no merge to main.

**Base:** `feature/twin-viewer-unblock-v2` `@ cde502ce`  
**Branch:** `feature/twin-appearance-quality-forensics`  
**Locked camera:** fridge-forensics — see `docs/ops/twin-appearance-forensics/CAMERA.json`

## 1. Canonical camera (never changed)

| | |
|---|---|
| Station | Kitchen `fridge` human-eye |
| Position (ARKit, m) | `(0.72, 0.004836, -1.70)` |
| Euler YXZ (rad) | pitch `0`, yaw `-0.85`, roll `0` |
| Quaternion xyzw | `(0, -0.412321, 0, 0.911039)` |
| Target | `(1.471, 0.004836, -2.360)` |
| Vertical FOV | **72°** (three.js `PerspectiveCamera.fov`) |
| Horizontal FOV | **98.593°** at aspect 1.6 |
| Viewport | **1440×900** |
| Near / far | 0.06 / 60 |
| Intrinsics K | `fx=fy=619.372`, `cx=719.5`, `cy=449.5` |

Fridge tag, cabinet run, archway, and dining opening are in frame.

## 2. Four-way same-camera render

| | Renderer | Source | Camera space |
|---|---|---|---|
| **A** | gsplat 1.5.3 CUDA | `brush_b.ply` (log-scale, logit opacity) | inverse-SIM3 X4 |
| **B** | gsplat 1.5.3 CUDA | `brush_x4_arkit.ply` | ARKit |
| **C** | Spark (isolated preview) | `brush_x4_arkit.spz` | ARKit |
| **D** | Spark live `/preview/twin-metric` Reality | same SPZ | ARKit fridge pose |

Contact sheet: `docs/ops/twin-appearance-forensics/CONTACT_2x2.png`  
Full-res: `docs/ops/twin-appearance-forensics/renders/`

## 3. Stage loss (1440×900, aligned)

| Stage | PSNR | SSIM | What it isolates |
|---|---:|---:|---|
| A → B | **33.32 dB** | 0.966 | SIM3 bake + unrotated SH |
| B → C | **23.51 dB** | 0.872 | gsplat kernel vs Spark (+ SPZ) |
| C → D | **33.18 dB** | 0.983 | isolated Spark vs live Reality (HUD) |

Laplacian variance (edge energy): A 15.5 · B 16.8 · C 41.7 · D 62.1. Spark is grainier, not a 720p upsample. gsplat A/B are smoother (and still not holdout-sharp).

Mean RGB: A `(64, 49, 35)` · B `(62, 44, 30)` · C `(64, 48, 37)` · D `(64, 49, 38)`. B is the darkest of the gsplat pair; browser Spark matches A’s brightness more than B’s.

## 4. Canvas vs drawing buffer (proven)

| | CSS | Drawing buffer | DPR | Zoom |
|---|---|---|---:|---:|
| Live Reality D | 1440×900 | **1440×900** | 1 | 1 |
| Isolated Spark C | 1440×900 | **1440×900** | 1 | 1 |
| DPR-2 variant | 1440×900 CSS | screenshot file **2880×1800** | 2 | 1 |

The browser is **not** rendering below 1440×900 at this viewport. `KitchenProofScene` locks `dpr={[1,1]}`. Angular resolution ≈ 12.5 px/deg vertical vs holdout 13.3 px/deg (1200px / 90°). Resolution is not the holdout gap.

## 5. Gaussian attributes

672,348 primitives throughout. SH degree **3** (16 bands) in native PLY, ARKit PLY, and SPZ round-trip (`splat-transform` → 672K · 3 SH bands).

1,000 random primitives, locked EXACT_FRAME_SIM3:

| Check | Result |
|---|---|
| Centers `s R p + t` | median error **9.4e-8 m** |
| Log-scale `+= log(s)` | error **0** |
| Opacity | **unchanged** |
| SH DC + rest in file | **byte-copied, not rotated** |
| Quaternion norms | ~1.0 |

SPZ quantization vs ARKit PLY: scale-log median −5.175 → −5.1875; tiny scales clipped (`min` −15.5 → **−10**); SH rest quantized. Count retained 100%. Spark PLY load vs Spark SPZ: **23.53 vs 23.51 dB** against gsplat B — SPZ is not the Spark gap.

## 6. SH handling (quantified, not changed)

SIM3 rotates covariance, copies SH. View-direction rel-MSE of SH eval after applying R: **median 3.8%, p95 60%**. At *this* fridge camera, gsplat SH3 vs SH0 is **40.4 dB / 0.990 SSIM**; Spark SH3 vs SH0 is **38.8 dB / 0.974**. SH3 **is enabled** in the browser (`packedSplats.getNumSh() === 3`, `mesh.maxSh === 3`, 672,348 splats). Unrotated SH is real but not the fridge-view blur.

## 7. Spark / render inventory (live Reality)

| Setting | Value | Source |
|---|---|---|
| Drawing buffer | 1440×900 | `WebGL drawingBufferWidth/Height` |
| CSS canvas | 1440×900 | |
| `devicePixelRatio` | 1 | Playwright dsf 1 |
| R3F `dpr` | `[1, 1]` | `KitchenProofScene` |
| WebGL antialias | **true** | Scene `gl.antialias` (Spark docs: disable) |
| Alpha | default | |
| Tone mapping | `NoToneMapping` (0) | `onCreated` |
| ACES variant | **no-op on splats** | identical pixels vs current |
| `outputColorSpace` | `srgb` | |
| `encodeLinear` | false | Spark default |
| `blurAmount` | **0.3** | Spark default (AA kernel ~0.5 px) |
| `preBlurAmount` | 0 | |
| `minPixelRadius` | 0 | |
| `maxPixelRadius` | 512 | |
| `maxStdDev` | √8 | |
| `minAlpha` | 0.5/255 | |
| `enableLod` | **false** | `sparkArgs` |
| Splat `lod` | false | |
| SH actually used | **3** | `getNumSh()` |
| `maxSplats` cap | 800,000 | `KITCHEN_SPLAT_MAX` (no downsample) |
| Primitive count | **672,348** | |
| Splat scale multiplier | 1 | |
| Rx(π) | off | `sparkPiFlip={false}` |
| World matrix | identity | SIM3 baked into SPZ |
| FPS during capture | **9.5–14.5** | 672k SH3 |

`blurAmount: 0` raises Laplacian 41.7 → **62.7** (sharper grain/edges) at 44.8 dB vs current. DPR 2 file is 2880×1800; after resize to 1440, 43.4 dB vs current — not the softness.

## 8. High-value A/B (same camera, inspect tag / seams / arch / fixture)

| Variant | vs current Spark | Visual |
|---|---|---|
| Current SPZ | — | Recognizable, soft tag, fuzzy arch, streaky ceiling |
| DPR 2 | 43.4 dB | Not a commercial leap after display |
| Scale 0.7 | 17.8 dB | Different density, not a sharpness win |
| SH3 explicit | already 3 | SH0 is close at this view |
| No tone map | already none | ACES did not change splat pixels |
| ARKit PLY in Spark | ≈ SPZ | Compression not the look |
| Native PLY + runtime SIM3 | Spark | Extra path; still Spark-soft |
| `blurAmount=0` | 44.8 dB | Highest Laplacian of the Spark set |

## 9. Bottleneck (evidence-backed split)

| Class | Est. | Evidence |
|---|---:|---|
| **MODEL_LIMIT** | **45%** | gsplat A at this camera is already haze-soft (tag, seams, chandelier). Holdout 27.57 dB was 90° 1200px faces, not this 99° walk camera. |
| **COLOR_PIPELINE** | **25%** | B→C **23.5 dB** — Spark vs gsplat (kernel, sRGB, Spark “N” watermark). Not SPZ (PLY≈SPZ). |
| **FOV/CAMERA** | **15%** | 72° vertical / 99° horizontal vs holdout 90° square. More room, less pixels on the tag. |
| **SPLAT_SCALE** | **5%** | Default `blurAmount=0.3`; blur0 lifts edge energy. |
| **SH_HANDLING** | **4%** | SH copied, not rotated. This view: ~39–40 dB SH0 vs SH3. |
| **SIM3_TRANSFORM** | **3%** | A→B 33.3 dB; center error 1e-7 m; scales exact. |
| **SPZ_COMPRESSION** | **2%** | 672k kept; log-scale quantized; tiny scales clipped to −10. |
| **RENDER_RESOLUTION** | **1%** | Buffer **equals** CSS 1440×900. |
| **WEBGL_PERFORMANCE_LOD** | **0%** | LOD off; 672k drawn; FPS 9–14 does **not** drop the buffer. |
| **OTHER (HUD)** | **0%** of splat | C→D 33 dB; chrome only. |

**Primary root cause:** the Brush model is already soft at this walk FOV (**MODEL_LIMIT**), and Spark’s rasterizer/color path diverges from the gsplat offline look (**COLOR_PIPELINE**). Slate360 is **not** secretly rendering SH0, **not** dropping to a sub-1440 buffer, and **not** destroying the PLY in SIM3/SPZ.

## 10. Corrective action (do not retrain first)

1. Set Spark `blurAmount: 0` on the kitchen appearance renderer (default 0.3 is the AA kernel).
2. Set `gl={{ antialias: false }}` (Spark’s own guidance).
3. Keep SH3; optionally rotate SH with SIM3 later — not the fridge-view bottleneck.
4. Do **not** raise DPR as the sharpness fix (proven).
5. Do **not** retrain until Spark at this locked camera is compared again to gsplat A.

**Retraining justified?** **No** as the next step. Holdout metrics described a different camera. Fix the Spark kernel defaults, then re-run this forensics camera. If gsplat A is still too soft for a client walk, that is a new appearance job — not this one.

## Reproduce

```
wsl .../python scripts/ops/twin-appearance-forensics/attribute_integrity.py
wsl .../python scripts/ops/twin-appearance-forensics/render_offline.py
node scripts/ops/twin-appearance-forensics/capture.mjs http://127.0.0.1:3005
node scripts/ops/twin-appearance-forensics/recapture-cd.mjs http://127.0.0.1:3005
wsl .../python scripts/ops/twin-appearance-forensics/compare.py
```
