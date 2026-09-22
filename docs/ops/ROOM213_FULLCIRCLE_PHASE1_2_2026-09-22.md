# Room 213 — FullCircle native-fisheye reference attempt: Phase 1 + Phase 2

`theialab/fullcircle@6d5afc16` (Apache-2.0). Raw X4 physical-lens frames, no H1 poses, no factory Mei, no rig
constraint, no perspective faces. Outputs: `room213/2026-09-21/fullcircle/{phase1_colmap.json,phase2_validation.json}`.

## Setup notes
- The released repo declares **none** of its own dependencies (`setup.py install_requires=[]`) while importing
  `ncore.sensors`/`ncore.data`, `simplejpeg`, `scipy`; the same gap exists upstream in `nv-tlabs/3dgrut`.
  `nvidia-ncore` is NVIDIA's own Apache-2.0 package. Three pip names, no code changes.
- **Real incompatibility found** (the standing equivalence guardrail): the pycolmap PyPI wheel is built without
  CUDA/OpenGL SIFT — "Cannot use GPU feature extraction without CUDA or OpenGL support" — so it cannot reproduce
  FullCircle's GPU extraction/matching. Resolved by installing **COLMAP 3.12.6 (cuda_126) from conda-forge** and
  running `scripts/run_colmap.sh`'s three commands **verbatim**, so every default is COLMAP 3.12's own and the
  pycolmap option translation in ROOM213_FULLCIRCLE_COLMAP_EQUIVALENCE_2026-09-22.md is superseded (kept as the
  record of why). Masking module (ultralytics/YOLOv8, AGPL) not installed; existing person masks reused,
  intersected with a fisheye-border mask at 0.98 of the fitted lens radius.

## Phase 1 — native camera estimation (COLMAP 3.12.6, OPENCV_FISHEYE, self-calibrated)
| | |
|---|---|
| registered images | **242 / 242 (100 %)** |
| registered physical exposures | **121 / 121**, both lenses **121 each** |
| components | best holds **all 242** (a degenerate 2-image model also emitted) |
| walks | 020 = 3, 021 = 87, 075 = 31 exposures — **all connected in one component** |
| mean reprojection / track length | **1.15 px** / 4.79 |
| self-calibrated cam1 (lens A) | f 1078.87 / 1080.55, c 1920/1920, k 0.0799, −0.0276, 0.0102, −0.0027 |
| self-calibrated cam2 (lens B) | f 1067.26 / 1069.40, c 1920/1920, k 0.0818, −0.0317, 0.0121, −0.0028 |
| timings | extraction + exhaustive matching of 29,161 pairs ≈ **6 min**; mapper ≈ 20 min |

## Phase 2 — quick GO/NO-GO on native frames (read-only, no training)
Leave-one-out: triangulate each track from **3 distinct physical exposures** through the self-calibrated fisheye
cameras, predict into a 4th, measure in **native 3840² pixels**. 12,003 tests.

| stratum | n | median | p95 | p99 | >5 px | >20 px |
|---|---|---|---|---|---|---|
| **overall** | 12,003 | **1.70** | **4.46** | 8.29 | 3.5 % | 0.14 % |
| lens 0 / lens 1 | 7328 / 4675 | 1.74 / **1.61** | 4.47 / 4.41 | | | |
| walk 021 / 075 | 8469 / 3423 | 1.67 / **1.75** | 4.41 / 4.49 | | | |
| cross-walk held out | 1259 | 1.87 | 5.26 | 10.9 | 5.5 % | |
| radius <800 / 800–1300 / 1300–1700 / 1700–2100 | 1870 / 4926 / 4297 / 910 | 1.58 / 1.62 / 1.81 / **1.86** | 4.21 / 4.30 / 4.64 / 4.90 | | | |
| depth <2 m / 2–5 m | 7914 / 3491 | 1.76 / 1.59 | 4.52 / 4.35 | | | |

**Every H1 failure signature is absent.** H1: median 5.33 / p95 26.7 px, a monotonic 3× ramp with sensor radius
(1.5 → 4.3), lens 1 much worse (2.75 / p95 29.8), walk 021 2.5× worse than 075 (8.58 vs 3.50), near-field 23 px.
Native: flat in radius (1.58 → 1.86, a 1.18× variation), flat across lenses, flat across walks, no near-field
collapse. The residual 1.70 px median is at the level of SIFT localisation noise itself (the H1 landmark test
measured SIFT-vs-independent agreement at 1.67 px median), so this rules out H1-scale coherent camera/ray error;
it does not by itself prove sub-pixel camera accuracy.

## Physical plausibility (the 32.26 mm baseline used only as an external ruler, never as a constraint)
Inter-lens distance recovered **independently** for all 121 exposures: median 0.02905 units, **CV 0.20**
(the unconstrained H1 solve was 0.35) → scale 1.1106 m/unit. Then:
- camera trajectory **11.11 × 0.72 × 7.79 m**; scene points (5–95 %) **11.52 × 3.11 × 8.37 m** — an ~11.5 × 8.4 m
  room with a **3.11 m floor-to-ceiling extent**, which is a plausible lecture room and was never an input;
- walk 021 spans 11.11 × 7.68 m, walk 075 spans 10.76 × 7.15 m, centroids 1.60 m apart — both walks cover the room;
- nothing was discarded: 242/242 images, both lenses, all three walks.

Two independent reconstructions (H1 with a forced baseline, FullCircle with a measured one) agree the room is
≈ 11–12 × 7–8 m, which corroborates both scales.

# `FULLCIRCLE CAMERA SOLUTION: GO`
Caveat carried forward: baseline CV 0.20 means the two lenses are not perfectly rigid in this solution — expected,
since FullCircle imposes no rig. That is a productionisation item, not a blocker for an appearance experiment.

## Phase 3 layout facts (read from the loader/trainer before staging)
- Training masks live at `masks{_N}/masks-5{_N}/<camera>/<stem>_mask.png` (`dataset_colmap.py:512`).
- **Polarity is inverted relative to ours**: `trainer.py:530` computes `capturer_mask = (1 - batch.mask)` and
  multiplies both `rgb_gt` and `rgb_pred` by it, so **1 = capturer = EXCLUDE**. Our masks are 255 = keep, so the
  training masks must be written as the inverse of the COLMAP masks (person/rim = 255). Feeding ours unchanged
  would have supervised only the operator and the dead rim.
- The fisheye border mask is a single greyscale file read from the working directory (`conf.border_mask_train`,
  default `mask_train.png`), resized to the current resolution, applied to rgb and used to NaN rays outside it.
  Their file matches their camera; ours must be regenerated. Our two lenses have different circle centres, so a
  single global mask must be the intersection: centre (1920, 1920), radius 1980 px (inside both fitted circles).
- `_resize_image_folder` only auto-downsamples **.jpg**; our frames are .png, so any `downsample_factor > 1`
  requires pre-built `images_N/` and `masks_N/masks-5_N/` folders.
