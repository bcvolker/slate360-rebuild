# Room 213 — raw-stream mapping audit and the one authorised (s, ox, oy) correction (2026-09-22)

Scope (Brian, 2026-09-22): one bounded correction of the factory-Mei → physical 3840×3840 stream mapping, targeted at the
measured sensor-radius residual ramp. No BA variant, no re-matching, no Splatfacto, no capture, no broad calibration search.
Code: `workers/recon-experiment/room213_map_fit.py`; outputs on the volume under `room213/2026-09-21/build/rig_ba_v3/`
(`mapping_audit.json`, `map_fit.json`, `corrected_keypoints.npz`, `corrected_keypoints_summary.json`).

## 1–8. Audit of the current mapping
1. **Factory coordinate system:** Mei/unified (OpenCV omnidir) on a 16000×6000 calibration canvas; per-lens ξ, fx, fy, cx, cy,
   k1–k3, p1, p2 from `.insv` trailer field 54; lens A x∈[0,8000), lens B x∈[8000,16000). Per-lens Euler angles unused
   (convention unknown); translation t_B (|t| 32.2576 mm) used as the fixed baseline.
2. **Circle/offset metadata (field 53):** lens A lit circle r 2899.96 @ (4001.90, 3007.05); lens B r 2882.97 @ (12003.73, 3004.22).
3. **Canvas interpretation:** the 3840² stream is assumed a uniformly scaled, translated crop of the canvas:
   `u_f = s·(u_canvas − 8000·[B]) − ox`, `v_f = s·v_canvas − oy` — no rotation, flip, or anisotropy.
4. **Stream orientation:** stream 0 = lens A, stream 1 = lens B (H1; the assignment the faces were built with and the one the
   rig BA supports). PyAV-decoded frames used as decoded (no rotation/flip).
5. **Decoded frame → ray:** frame px (integer = pixel centre) → canvas via the inverse similarity → normalised Mei coordinates
   → Newton inverse of the radial/tangential distortion → unit-sphere lift with ξ → lens ray → `R_face_from_lensᵀ` → face
   pixel `x = FL·X/Z + 1280`. Face generation samples the frame with `cv2.remap` (INTER_LINEAR).
6. **Current (s, ox, oy):** lens 0: 0.724562, 1028.72, 323.29; lens 1: 0.730566, 999.19, 350.98.
7. **Derivation:** `s = r_frame_circle / r_factory_circle`, `ox = s·(cx_factory − 8000·[B]) − cx_frame`, `oy = s·cy_factory − cy_frame`,
   with frame circles least-squares fitted to the lit-disc boundary of decoded frames (stream 0: r 2101.2 @ (1870.9, 1855.5);
   stream 1: r 2106.2 @ (1925.8, 1843.8); rms 1.3–2.2 px). These are the only non-factory quantities in the chain.
8. **Pixel-centre convention:** COLMAP keypoints (x = i + 0.5) and face generation (u = (i − 1280 + 0.5)/FL) agree; frame side uses
   the integer-centre convention consistently for circle fit and Mei projection. Any residual half-pixel inconsistency is
   ≤ 0.5 px and cannot produce a radial ramp.

**Round trips** (raw px → ray → raw px, both lenses, azimuths 0/90/180/270): r = 0, 500, 1000, 1500, 1800, 2000, 2080 px →
**0.000 px** everywhere (θ from axis 0.3°, 24.7°, 48.3°, 70.2°, 83.6°, 93.7°, 98.7°). As required, this only proves the
similarity is numerically invertible, not that it is right.

## Fit of (s, ox, oy) — calibration/validation split
Source: rig_ba_v2 H1 solution (poses, points fixed). Split: point-track id even = calibration, odd = validation (never used in
the fit). Cauchy loss (f_scale 2 px); observations with current residual > 20 px excluded from the fit (lens 0: 3,040; lens 1:
4,550 — repetitive-structure mismatches); fit subsample stratified by sensor radius (12k per bin where available).

| | lens 0 | lens 1 |
|---|---|---|
| Δs | **−0.005 %** | **−0.007 %** |
| Δox / Δoy | −0.14 / −0.13 px | −0.16 / −0.18 px |
| keypoint shift after correction | median 0.11 px, p95 0.29, max 0.66 (13.0 M keypoints) | |

Validation subset (untouched), face-px residual by ORIGINAL sensor radius, poses fixed — before → after:

| radius | lens 0 median | lens 0 p95 | lens 1 median | lens 1 p95 |
|---|---|---|---|---|
| < 800 | 1.47 → 1.47 | 7.7 → 7.7 | 2.61 → 2.61 | 27.6 → 27.6 |
| 800–1300 | 2.20 → 2.20 | 13.0 → 13.0 | 2.32 → 2.33 | 19.3 → 19.3 |
| 1300–1700 | 3.62 → 3.61 | 21.5 → 21.5 | 3.68 → 3.68 | 33.1 → 33.1 |
| 1700–1950 | 4.17 → 4.13 | 42.0 → 41.9 | 4.11 → 4.11 | 84.1 → 84.0 |

**The similarity cannot remove the radius-dependent error** (a 0.2 % scale error would have been required to explain a 4 px
ramp at r = 1800; the data want 0.005 %). The single BA rerun on corrected coordinates was therefore not launched: the
corrected coordinates are the old ones to 0.1 px.

## Bias vs noise (validation subset, residual vectors mapped back into the sensor frame)
| sensor radius (θ) | lens 0 median \|d\| (sensor px) | \|mean\| / median | lens 1 median \|d\| | \|mean\| / median |
|---|---|---|---|---|
| 0–400 (< 20°) | 1.33 | 0.11 | 2.66 | 0.27 |
| 400–800 (20–39°) | 0.88 | 0.19 | 1.50 | 0.28 |
| 800–1300 (39–62°) | 1.54 | 0.21 | 1.53 | 0.09 |
| 1300–1700 (62–79°) | 3.00 | 0.27 | 2.96 | 0.23 |
| 1700–1950 (79–91°) | 3.53 | **0.92** (mean radial +2.2, tangential −2.3) | 3.27 | **0.70** |

Inside θ ≈ 79° the residuals have no consistent direction (|mean| ≈ 0.1–0.3 of the median): they are **noise that grows with
radius** (feature localisation / resampling on the compressed fisheye periphery), not a low-order calibration bias. Only the
extreme band 79–91° (≈ 3 % of observations) shows a genuine consistent bias (~3 px, radial-outward and rotational) — the
region where the factory Mei model runs against its ρ-domain boundary and the lit-circle vignette.

## Fallback (report only, not run): restrict the usable raw-lens radius
Validation residuals in the best region are still above the diagnostic band: lens 0 r 500–800 (θ 25–39°) median 1.29–1.44 px,
p95 6.8–7.0; lens 1 r 650–1000 median 2.2, p95 18. No radius meets p95 3–5 px.

| usable radius | θ | obs retained lens 0 / lens 1 | solid angle per lens (fraction of hemisphere) | overlap |
|---|---|---|---|---|
| ≤ 800 | 39° | 49 % / 31 % | 22 % | none (seam at 90°) |
| ≤ 1000 | 48° | 65 % / 50 % | 34 % | none |
| ≤ 1300 | 62° | 82 % / 76 % | 52 % | none |

Physical exposures retained: 121/121 (restriction is per observation). Room coverage: a ≤ 48° cone forward and backward
along the walk; the down face (55° pitch, 40 % of observations — floor, tables, chairs) and the ceiling fall largely outside
→ not an inspectable room model. Not authorised to train and not recommended.

## Conclusion
`CALIBRATION CORRECTION: FAIL (no correction exists in (s, ox, oy))` — `DIAGNOSTIC TRAINING SAFE: NO` — no training.
The radius-dependent error is not a coordinate-mapping error. Inside 79° it is localisation noise of the raw-X4 face
pipeline (≈ 1.3–1.5 px median even in the best central region, p95 ≈ 7 px); beyond 79° it is a genuine model bias of the
factory Mei description that a different calibration source / proper multi-position calibration capture would be needed to
fix — but fixing it would touch ≈ 3 % of observations and would not bring the median/p95 into the diagnostic band.
