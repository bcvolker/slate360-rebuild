# Room 213 — final pre-correction diagnostic (2026-09-23)

Read-only. No training. Model: 30k native-fisheye 3DGRT (`room213-2309_004634/ours_30000`, 78,000 Gaussians).
Code: `workers/modal/recon-experiment/fc_patch_diag_v2.py` (authoritative); outputs `room213/2026-09-21/fullcircle/patch_diag_v2/`.
A first pass (`fc_patch_diag.py`, `patch_diag/`) is superseded: it compared an "edge" in the source against a "line" in
the render, its noise estimate collapsed to zero on 8-bit images, its unconstrained cross-view search jumped to
neighbouring repeated slats/grid cells, and its geometry-only family rules picked carpet, a wall corner and the flag.

## Renderer sanity (isolated high-opacity particle at 2.5 m, traced through the real 3DGRT renderer)
| size | expected Gaussian FWHM | rendered FWHM |
|---|---|---|
| 1 mm | 1.07 px | **1.38 / 1.42 px** |
| 3 mm | 3.21 px | 5.09 / 5.17 px |
| 10 mm | 10.71 px | 17.08 / 17.36 px |
| 30 mm | 32.12 px | 33.09 px (window-clipped, not usable) |

The renderer resolves detail down to ~1.4 px, so **it is not the source of native blur**. Each particle renders ~**1.59×**
wider than a standard Gaussian of the same scale (3 mm and 10 mm agree), a property of `particle_kernel_degree: 4`.

**Delivery risk (separate from this diagnosis):** `export_last.ply` stores standard Gaussian scales; a standard degree-2 splat
viewer (the Slate360 Spark/SPZ path) will draw every particle ~1.6× narrower than it was trained, so the viewer image
will not match the native render. Not tested directly here; must be corrected at export before delivery. It cannot explain
the detail loss below, because that loss is already present in the native render.

## Checks that could explain the loss before blaming capacity
- **Loader:** training tensor vs decoded source, max abs difference **0.0** (0–255) on all 12 patches — pixel-identical.
- **Masks:** capturer/border mask coverage **0 %** on all 12 patches.
- **Sampling:** renders use the training rays of the exact training camera; dataset poses match COLMAP to 3e-7; ray/pixel
  convention offset measured (+0.5 px) and applied.

## Patch selection (fixed before any Gaussian statistic or render was read)
COLMAP points matched in >= 4 distinct physical exposures (which also makes them repeatable structure, not noise), prefiltered
by height above floor / distance to wall / colour (floor carpet and saturated red cloth excluded), then accepted only if the
**decoded source** shows a thin structural line or edge 2–8 px wide with SNR >= 5 and the family's shape test (dark grid
line on ceiling; >= 2 parallel lines on a dark chair; line/edge on bright window background; coherent table/door edge).
Lenses alternate; picks are spread across the room. Room: 9.0 × 12.0 m, 2.91 m floor-to-ceiling.

## Results — all 12 patches
Widths/contrast measured on the same 41-px profile across the source's own feature type. Cross-view = independent
localisation in distinct physical exposures (±16 px search around the solved-camera projection), leave-one-out through the
solved cameras. GS fw = median rendered FWHM of visibly contributing Gaussians (×1.59 kernel factor), contributors confirmed
by ablation re-render. g15 = median densification-gradient accumulator of contributors ÷ split threshold (15k checkpoint,
1:1 with 30k because no Gaussian was added or removed after step 15,000).

| # | family | reference | type | src w | render w | contrast | lines src/ren | x-view n | x-view med | ÷ width | GS fw | g15 | verdict |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | ceiling grid | cam1/f021 | dark line | 4.7 | – | 0.70 | 2/0 | 2 | – | – | 36.7 | 0.27 | INCONCLUSIVE (x-view) |
| 2 | ceiling grid | cam2/f069 | dark line | 3.6 | 4.1 | 0.86 | 1/1 | 4 | 1.07 | 0.30 | 12.8 | 0.17 | FAIL (b,c) |
| 3 | ceiling grid | cam1/f017 | dark line | 6.3 | 7.0 | 1.06 | 3/1 | 3 | 4.25 | 0.67 | 21.1 | 0.16 | FAIL (b) |
| 4 | chair | cam2/f116 | dark line | 6.9 | 7.5 | 0.80 | 2/1 | 6 | 1.96 | 0.29 | 8.9 | 0.40 | FAIL (b) |
| 5 | chair | cam1/f118 | dark line | 5.4 | 26.3 | 0.80 | 3/0 | 6 | 4.09 | 0.76 | 16.7 | 0.23 | **SOURCE/CAMERA-LIMITED** |
| 6 | chair | cam2/f119 | dark line | 6.3 | 6.4 | 0.89 | 2/3 | 6 | 0.31 | 0.05 | 5.3 | 0.23 | FAIL (c,d) |
| 7 | window frame | cam1/f002 | dark line | 5.9 | 8.2 | 1.17 | 1/1 | 6 | 1.28 | 0.22 | 31.7 | 0.09 | FAIL (b) |
| 8 | window frame | cam2/f089 | edge | 2.7 | 3.2 | 0.83 | 1/1 | 6 | 0.67 | 0.25 | 18.1 | 0.23 | FAIL (c) |
| 9 | window frame* | cam1/f073 | dark line | 7.6 | 6.5 | 0.73 | 1/1 | 6 | 2.01 | 0.27 | 17.9 | 0.09 | FAIL (b,c) |
| 10 | table/door | cam2/f000 | edge | 2.5 | 3.2 | 0.98 | 0/0 | 1 | – | – | 11.2 | 0.41 | INCONCLUSIVE (x-view) |
| 11 | table/door | cam1/f091 | edge | 6.1 | 5.5 | 0.90 | 1/0 | 1 | – | – | 12.2 | 0.12 | INCONCLUSIVE (x-view) |
| 12 | table/door | cam2/f056 | edge | 2.8 | 2.1 | 1.01 | 1/1 | 5 | 1.74 | 0.61 | 27.9 | 0.11 | FAIL (b,c) |

\* #9 landed on the flag; the measured line is the **flagpole**, which is static structure.
Failure letters: a resolved in training target · b cross-view <= 1 px · c repeatable model deficit · d contributors coarser
than the feature · e no loader/mask defect. **PASS: 0 / 12. Families with a pass: 0 / 4. Gate (>= 8/12 across >= 3
families): NOT MET.**

## What the evidence says
1. **Most thin structural detail is already reproduced.** 7 of 12 patches (#2, #6, #8, #9, #10, #11, #12) show no repeatable
   deficit: render width 0.75–1.28× source, contrast 0.73–1.01, down to 2.5–2.8 px features. Visually confirmed.
2. **Where a deficit exists it tracks cross-view disagreement, not primitive count.** Deficit patches (#3, #4, #5, #7) have
   mean leave-one-out residual **2.90 px**; no-deficit patches (#2, #6, #8, #9, #12) **1.16 px**. The two worst deficits
   (#3 lines merged, #5 slats merged) have the largest residuals, 4.25 and 4.09 px = 0.67 and 0.76 of the feature width.
3. **Cross-view agreement is ~1–2 px, not <= 1 px.** Only #6 (0.31) and #8 (0.67) meet the 1-px bar, and neither has a
   deficit. The median across patches matches the whole-scene leave-one-out (1.70 px) and the SIFT-vs-independent
   localisation agreement measured earlier (1.67 px): on these compressed video frames, a thin feature cannot be placed more
   precisely than ~1.5–2 px, which is 25–75 % of a 2.5–7 px feature.
4. **Contributor footprints are coarse (5–37 px) and never qualified to split (g15 9–41 % of threshold) — but this is not
   evidence of a capacity failure here**, because features far narrower than those footprints (#8, #10, #12 at 2.5–2.8 px)
   are rendered correctly: the degree-4 kernel has a steep falloff, so the boundary between opaque particles draws an edge
   much finer than a particle's width. Criterion d is uninformative on its own.
5. **What is visibly missing is surface texture** — ceiling-tile speckle, carpet, wood grain — much of which is compression
   and sensor speckle in the source frames themselves (visible in the sheet), which the brief excludes as a target.

## Recommendation
**CAPTURE CHANGE.** The software pipeline is not the bottleneck: loader pixel-exact, masks clear, renderer resolves ~1.4 px,
and the model already reproduces the thin structure the training target supports. The remaining losses are set by the X4
video source: fine texture at its compression/noise floor, and thin structures that its frames only allow to be registered to
~1.5–4 px. More capacity (MCMC or structure-residual GS) would fit the same inconsistent views, not add real detail.
The capture lever is higher-SNR, better-localisable data — static stills at tripod stops (X4 72 MP ≈ 33 px/deg vs ≈ 19 for
video, no HEVC, no motion), and/or high-resolution stills of detail-critical surfaces — fed through the same proven
native-fisheye COLMAP + 3DGRT pipeline. Not started.
