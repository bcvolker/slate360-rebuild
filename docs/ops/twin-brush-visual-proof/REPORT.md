# Brush in the real viewer — commercial twin visual proof

Branch: `feature/twin-viewer-unblock-v2` (not merged to main).

## A. Brush winner

Equatorial+zenith **Brush B**. Zenith is clean enough (lights + vent readable; no V2 chromatic blob field). Nadir excluded.

| | |
|---|---|
| Source PLY | `…/2026-08-31T22-x4-brush-challenger/brush_b_train/brush_b.ply` |
| Primitives | **672,348** |
| Bytes | 158,675,679 |
| Format | `binary_little_endian`, comment `Exported from Brush`, SH degree 3 |
| Properties | `x y z`, `opacity` (logit), `scale_0..2` (log), `rot_0..3` (wxyz), `f_dc_0..2`, `f_rest_0..44` |
| xyzRGB-only? | **No** — real Gaussian attributes |
| Engine | Brush `brush-cli` 0.3.0, 30k steps, ~1096 s, peak VRAM 7120 MiB |
| Nadir | **Excluded** |

Equatorial holdout (full-image vs V2 GT 1200px faces): Brush B **27.57 dB** (front 31.75, right 30.02, left 27.11, back 21.40). Zenith **35.80 dB**.

## B. EXACT_FRAME_SIM3 bake

Locked scale `0.6300199669353641`. Not recomputed.

- Centers: `P_arkit = s R P_x4 + t`
- Orientations: quaternion Hamilton product with R
- Scales: Brush log-space → `scale_i += log(s)` (not `scale *= s`)
- Opacity unchanged

Outputs (research disk + R2, **not git**):

- `brush_x4_arkit.ply` — 672,348 primitives, 0 NaN, log-scale median −4.713 → −5.175
- `brush_x4_arkit.spz` — **16,105,975 bytes**, 672K gaussians, 3 SH bands, `--filter-nan` only

Baked mean `(2.62, −0.21, −2.32)` sits in the metric kitchen. Tag0 round-trip unchanged: `(0.608, 0.053, −1.685)`. Viewer loads identity world matrix, `sparkPiFlip={false}`.

## C. Viewer

`/preview/twin-metric?job=79a4f0ac-32e9-4358-bda0-e1a7461510e1`

- Reality: Brush SPZ only (geometry placeholder until splat ready)
- Geometry: `geometry-display.glb`
- Nav collision: `geometry-nav.glb` only
- Measurement: `geometry-measurement.glb` (not collision)
- Hybrid: Brush + display at opacity 0.16
- Camera: island start, floor + 1.60 m, FOV 72°, same pose across modes

## D. Load / FPS (headed Chrome 1440×900)

| Metric | Value | Target |
|---|---|---|
| First useful pixel | ~1.1 s (thumbnail) | — |
| Geometry ready | ~1.9–2.5 s | — |
| Brush ready | ~5.3–7.2 s | — |
| Geometry FPS | **59.4** | ≥ 30 |
| Reality FPS | **17.6** | ≥ 24 |
| Hybrid FPS | **11.7** | ≥ 24 |
| JS heap | ~324 MB | — |

SPZ retains 100%. No opacity/scale prune. 672k SH3 is over the 24 FPS bar on this desktop.

## E. Locomotion

Nav mesh only. Walk island → fridge → opening → back. Eye Y stayed at floor+1.60 m. Mode switch pose jump **0**. Reset returns to island.

## F. Verdict

**PARTIAL**

PASS: refrigerator, cabinetry, island edge, and living opening are identifiable in Reality; no brown fog; no rainbow V2 floaters dominating equatorial kitchen views; operator absent in forward kitchen views; no mode-coordinate jump; nav did not fall through or hard-stick on the scripted walk; public preview is the feature-branch URL (not localhost).

FAIL / remaining:

- Reality 17.6 FPS and Hybrid 11.7 FPS vs 24 FPS target at full 672,348 SH3 primitives
- Dining-side opening view has a yellowish smear on the right (back-face / operator-adjacent Brush region)
- Chandelier / ceiling lights streak
- TSDF display mesh remains fragmentary in dollhouse (unchanged metric product)
- Island default look is into the kitchen (fridge/arch), not a hero shot of the island top

Screenshots: `docs/ops/twin-brush-visual-proof/screenshots/`
Recording: `kitchen-brush-walk.webm`
