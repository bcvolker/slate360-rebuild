# Room 213 raw dual-lens rig — rigid-rig BA result (2026-09-22)

Authorised single correction after two BLOCKED preflights: the free solve (`build/sfm/best`, 1033/1210 faces, 1.14 px)
re-parameterised as a pycolmap 4.2 native rig and jointly re-optimised. No re-matching; same faces, masks, factory
Mei intrinsics, keepers, splits, frozen gates, Stage-1 recipe. Code: `workers/recon-experiment/room213_rig_ba.py`,
diagnostics `workers/modal/recon-experiment/diag_rig_residuals.py`. Outputs: volume `room213/2026-09-21/build/rig_ba_v2/`.

## Rig structure enforced (verified against the pycolmap 4.2 API)
10 PINHOLE sensors (5 faces × 2 lenses, fixed intrinsics FL 1525.44 / 2560²); reference sensor lens-0 face f (identity);
`sensor_from_rig(lens0, k)` = face rotation, zero translation; `sensor_from_rig(lens1, k)` = face rotation ∘ [R₁₀ | t₁₀],
t₁₀ = factory vector (|t| 32.26 mm) fixed; one `Frame` per physical exposure (121); every inner BA refines only
`rig_from_world` + points (all `sensor_from_rig` constant, intrinsics constant, 6-DoF gauge on one frame; scale set by the
baseline). pycolmap cannot express a single shared inter-lens rotation as a parameter block (only per-sensor 6-DoF), so R₁₀
is optimised by an outer Nelder–Mead (clipped-Huber objective over the converged rigid inner BA, |δ| ≤ 3° about the
scene-based seed 172.5°). Both stream↔lens hypotheses run identically on identical observations and loss.

## Results (corrected pass, all 355,038 free-solve observations scored, none rejected)
| | H1 stream0=A | H2 stream0=B |
|---|---|---|
| median / RMS(clip 1000) / p95 / p99 / max | **2.25 / 52.0 / 18.5 / 70.9 px** / behind-camera | 2.46 / 59.2 / 23.4 / 88.7 / 79,854 |
| lens 0 median / p95 | 2.00 / 13.5 | 2.12 / 15.4 |
| lens 1 median / p95 | 2.75 / 29.8 | 3.18 / 38.2 |
| tripod 020 (3 exp) / moving 021 / moving 075 | 6.70 / 2.23 / 2.24 | 12.0 / 2.46 / 2.37 |
| final R₁₀ | 174.50° (|δ| 2.86°, on the bound) | 171.64° (|δ| 1.48°, interior) |
| obs > 5 px / > 20 px / > 50 px / behind camera | 77,079 / 16,123 / 5,409 / 817 | 91,927 / 21,685 / 6,627 / 1,012 |
| trajectory extent (m) | 12.3 × 7.6 × 1.9 | 12.2 × 7.4 × 1.5 |
| scale (m per free-solve unit) | 1.215 (prior 1.16 used for init only) | 1.204 |

Per-face median (H1): f 1.83, u 2.16, l 2.30, d 2.38 (40 % of obs), r 2.72.
Original-sensor radius (H1): r<800 px 1.73 (lens 0 **1.48**, p95 8.0) → 800–1300 2.28 → 1300–1700 3.65 → 1700–1950 **4.32 (p95 79)**.
Sensor row: symmetric about the centre (no monotonic rolling-shutter gradient). Depth: 0–1 m 0.48 px; 2–3 m 2.03; 5–8 m 2.50
(median 4.6 mm at depth, p95 55 mm). Motion: Spearman(speed, per-exposure residual) = 0.10; slow (<0.3 m/s) 3.30 vs
walking 3.19 px. Tail (top 1 %, > 70.9 px): 2,725 ordinary static architecture, 817 behind camera, 6 mask boundary, 3 extreme
periphery; spread over 118/121 exposures; visually = SIFT mismatches on repetitive structure (ceiling light panels/grid,
chair mesh, wall lettering). Mid-tail (20–50 px) = consistent 20–40 px offsets on carpet/ceiling edges at large sensor radius.

## Verdicts
- **PRODUCTION GEOMETRY: FAIL** (frozen gate median ≤ 1.0 / p95 ≤ 2.0 px; best 2.25 / 18.5).
- **DIAGNOSTIC TRAINING SAFE: NO** — p95 18.5 px (band 3–5); 22 % of observations > 5 px; strong systematic pattern by
  sensor radius and by lens; tail spread over 118/121 exposures, not a small excludable subset.
- **RIG ASSIGNMENT: H1 (stream0 = A) supported** — better on every statistic on identical observations/loss (not a tie);
  moot for production since both fail.
- Interpretation rule: **CENTER GOOD / PERIPHERY BAD in original-sensor coordinates** (usable-radius / calibration /
  resampling issue), lens 1 worse than lens 0; static is NOT better than moving and speed is uncorrelated → timing /
  rolling shutter not implicated; low-motion fallback subset not applicable.
- Single pattern that prevents interpretation: reprojection error grows monotonically with distance from the lens optical
  centre in the 3840² sensor frame (1.5 px → 4.3 px median, p95 8 → 79 px), for both lenses, all walks, all speeds. The only
  non-factory quantity in the face generation is the crop similarity (s, ox, oy) fitted from lens-circle geometry
  (degenerate with board distance at the single ChArUco placement); a 0.3 % radial scale error is ~5 px at r = 1800 px.
- No Stage-1 training. `AUTO_TRAIN_AUTHORIZED` withdrawn. HARD STOP: no further BA variants.
