# Room 213 — H1 camera/ray validity: leave-one-view-out landmark test (2026-09-22)

Read-only, fixed-camera. Frozen: H1 physical exposure poses (`build/rig_ba_v2/H1_stream0=A/rec`), factory Mei calibration,
H1 stream assignment, 32.26 mm baseline, coordinate mapping, masks. Nothing was modified, no BA, no refit, no training.
Code `workers/modal/recon-experiment/diag_landmark_loo.py`; outputs `build/landmark_loo/` (`landmark_loo.json`, four overlays).

## Method
A landmark is a texture patch anchored in a **reference exposure** (the observation with the smallest sensor radius; that
exposure is never a test view). It is then **independently localised** in four other *physically distinct* exposures
(pairwise rig translation ≥ 0.25 m — multiple faces of one exposure never count as a baseline) by rotation/scale template
search (±30°, 0.8–1.25) + ECC affine refinement, seeded **only** by a ±80 px window around that track's old SIFT coordinate.
H1's predicted position, the triangulated 3D point and epipolar geometry were **not** used to select or refine any match.
Rejected: NCC peak < 0.5, second-peak gap < 0.12 (repetitive structure), template-size bootstrap (48/64/80 px) uncertainty
> 1.5 px, and implausible local deformation (total scale outside 0.65–1.55, |shear| > 0.30, anisotropy outside 0.7–1.4,
|rotation| > 42°) — 24 measurements were rejected on deformation alone. Accepted deformation: scale median 1.05,
|shear| p95 0.15, |rotation| p95 30°. Then: triangulate through the **frozen** H1 cameras from three measured exposures,
predict into the fourth, rotate over all four.

Two quantities are reported separately and never conflated:
**(A) measurement agreement** = old SIFT coordinate vs independent coordinate;
**(B) camera/ray agreement** = leave-one-out H1 prediction vs independent held-out coordinate.

## Counts
120 landmarks attempted (from 5,043 distinctiveness-screened candidates with ≥ 5 exposures); 52 valid with all 4
independent measurements; 68 INCONCLUSIVE (77 measurement failures on NCC/uniqueness, 21 mixed, 17 crop-at-border,
16 deformation, 3 uncertainty). 206 leave-one-out tests. **Accepted measurements by sensor radius: central (< 800 px)
32, middle (800–1300) 177, peripheral (1300–1700) 121, extreme (1700–1950) 16** — the result is not carried by easy
central features. Measurement uncertainty: median 0.49 px; the LOO error exceeds it by a median factor of **10.7×**
(only 15 of 206 tests are within 3σ of the measurement noise).

## (A) Measurement agreement — old SIFT vs independent (346 accepted measurements)
median **1.67 px**, p95 4.28 px, 2.9 % > 5 px. By radius: central 1.31, middle 1.75, peripheral 1.51, extreme 2.22.
On the disputed high-residual tracks (BA residual > 20 px): median 1.97 px (n = 65).
→ **SIFT coordinates are not materially wrong**, including on the tracks the BA blamed. Every overlay shows the yellow
(old SIFT) and green (independent) markers coincident, in PASS and FAIL tiles alike. No overlay category
"old-SIFT-bad / independent-good" could be populated: it does not occur.

## (B) Camera/ray agreement — leave-one-out prediction vs independent measurement
| subgroup | n | landmarks | face median | face p95 | sensor median | angular median | coherence \|mean\|/median (radial, tangential px) |
|---|---|---|---|---|---|---|---|
| **overall** | 206 | 52 | **5.33 px** | **26.7 px** | 4.08 | 0.175° | 0.23 (+0.80, −0.45) |
| lens 0 | 201 | 51 | 5.19 | 25.1 | 3.99 | 0.169° | 0.02 |
| lens 1 | 5 | 2 | 10.37 | 186.8 | 8.15 | 0.352° | — (n too small) |
| central < 800 px (< 39°) | 14 | 10 | 3.84 | 11.3 | 2.34 | 0.111° | 0.64 |
| middle 800–1300 (39–62°) | 111 | 48 | 4.32 | 17.2 | 3.19 | 0.137° | 0.65 (−1.69, +1.18) |
| peripheral 1300–1700 (62–79°) | 70 | 37 | **8.87** | 33.0 | 6.98 | 0.287° | **0.64 (+3.65, −2.60)** |
| extreme 1700–1950 (79–91°) | 11 | 10 | **17.34** | 46.1 | 13.67 | 0.497° | **0.78 (+8.95, −5.71)** |
| walk 021 | 110 | 47 | **8.58** | 31.4 | 7.34 | 0.294° | 0.08 |
| walk 075 | 93 | 37 | **3.50** | 13.1 | 2.55 | 0.110° | 0.44 |
| cross-walk held-out | 23 | 22 | 4.71 | 22.6 | 4.24 | 0.169° | 0.56 |
| disputed tracks (BA > 20 px) | 34 | 9 | 18.26 | 69.4 | 15.43 | 0.567° | 0.28 |
| depth < 2 m | 8 | 8 | 23.21 | 48.0 | 19.21 | 0.787° | 0.73 |
| depth 2–5 m | 192 | 50 | 4.86 | 22.5 | 3.81 | 0.163° | 0.14 |
Per-landmark median error: p10 2.3, p25 2.9, p50 5.7, p75 12.5, p90 16.6 px. 3-view triangulation rms (the fitting views'
own consistency): median 2.07 px. 26 of 206 tests ≤ 2 px; 4 of 52 landmarks pass.

## Predeclared criteria (≤ 2 px median, ≤ 5 px p95 at the 2560 face, no coherent lens/walk/peripheral displacement,
enough non-central samples)
median 5.33 (fail), p95 26.7 (fail), coherent peripheral radial-outward displacement of +3.65 px (62–79°) and +8.95 px
(79–91°) at |mean|/median 0.64–0.78 (fail), coherent walk difference 8.58 vs 3.50 px (fail); sample distribution adequate
(174 of 346 accepted measurements outside the central region).

# `H1 CAMERA/RAY: INVALID FOR DIAGNOSTIC TRAINING`
# `H1 DIAGNOSTIC TRAINING: DO NOT AUTHORIZE`

Independently localised landmarks **still** show large, coherent displacement, so the previous BA residuals were not
inflated by sparse feature localisation or correspondence error. Primary attribution, in order of evidence strength:
1. **Lens/ray model in the peripheral field** — error is monotonic in original sensor radius (3.8 → 4.3 → 8.9 → 17.3 px)
   and the displacement is *coherently radial-outward* beyond 62°, which no pose error can produce (a pose error is not a
   function of field angle within one exposure).
2. **Pose** — a secondary but real component: the central field is still 3.84 px (0.11° angular) where the lens model is
   at its best, walk 021 is 2.5× worse than walk 075 with the same lenses, and the < 2 m depth group is 23 px
   (a translation-error signature).
Not unresolved; not correspondence; not motion/timing (established earlier: speed correlation 0.10).

Per the predeclared architecture rule: **stop perspective-face reconstruction for this capture; the next path is the
native-fisheye / 3DGRUT architecture.** Not started. No Gaussian training launched; `AUTO_TRAIN_AUTHORIZED` stays withdrawn.
