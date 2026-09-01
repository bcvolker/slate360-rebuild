# X4 V1 Canonical Gaussian

Appearance-only recreation of the known Route B V1 experiment (`06_gaussian.py`). Metric TSDF, OpenSfM/pycolmap poses, and `EXACT_FRAME_SIM3` were not touched. V2 was not used. Viewer/dashboard were not changed.

**This is not commercial quality.** It is a faithful V1 recreation whose only product change is that learned Gaussian attributes now exist on disk, plus a true holdout. Do not promote it because it matches V1 settings.

## Gate

| Criterion | Result |
|---|---|
| V1 recipe reproduced | **Pass.** 166 panos × 4 equatorial 800×800 faces, 53,944 COLMAP seed, 25k steps, camera opt OFF, no densify, no zenith/nadir. |
| Attributes persisted | **Pass.** `checkpoint.pt` + canonical PLY with `x y z`, `f_dc_*`, `opacity`, `scale_*`, `rot_*`. |
| SIM3 is EXACT_FRAME, full | **Pass.** Existing `scale = 0.6300199669353641` applied to centers, orientations, and uniform scale. Not recomputed. |
| True holdout | **Pass.** Every 8th panorama station held out entirely (21 panos, 84 cameras). No face from a held-out pano in train. |
| Commercial / photoreal | **Fail.** Train **26.94 dB / 0.853 SSIM**. Holdout **26.17 dB / 0.838**. Soft vs GT. AprilTags are blobs. |

## What ran

- Trajectory: existing Route B pycolmap sparse (`/home/rian_/route_b_x4`). **166 / 166** panos, **664 / 664** equatorial images. Poses not recomputed.
- Faces: **front / right / back / left** at **800×800**. `up`/`down` exist on disk and were ignored (operator-contaminated nadir, empty zenith SIFT).
- Seed: COLMAP `points3D.bin` **53,944** points. No densify — count stayed 53,944.
- Engine: gsplat **1.5.3** Apache-2. RGB (SH degree 0). L1. Pose / center / scale optimization **OFF**.
- Holdout: panorama index `i % 8 == 0` → 145 train panos / 21 holdout panos → **580 / 84** cameras.
- SIM3 source: `…/2026-08-31T17-32-exact-frame-anchor-rescue/EXACT_FRAME_SIM3.json` (`gate = USABLE`, `x4_sfm_rerun = false`).

The previous trainer (`06_gaussian.py`) trained scale / quat / opacity in GPU RAM and wrote **xyzrgb only**. No checkpoint survived. This run writes them.

## Metrics

| | Original V1 | This recreation |
|---|---|---|
| Gaussians | 53,944 | **53,944** |
| Faces / px | 4 equatorial, 800 | 4 equatorial, 800 |
| Steps | 25k | 25k |
| Peak VRAM | (not recorded) | **67 MiB** of 24 GiB |
| Runtime | (not recorded) | **105.2 s** (~1.8 min) on RTX 3090 |
| Train PSNR / SSIM | **27.94 dB** on 20 random views; SSIM null | **26.94 dB / 0.853** on **all 580** train cameras |
| True holdout | none | **26.17 dB / 0.838** on **all 84** holdout cameras |
| Holdout min PSNR | n/a | **17.36 dB** |

Original 27.94 dB is not a holdout number and is a 20-view subsample. This train score is the full 580-camera mean, including the weak `back` face (**24.55 dB** train). Front-only train is **29.35 dB**. Do not treat 26.94 vs 27.94 as a like-for-like regression.

Final L1 **0.0297** vs original **0.020**. Expected: 21 panos never enter the training loop.

### Holdout PSNR / SSIM per direction (n = 21 each)

| Face | PSNR dB | SSIM |
|---|---|---|
| front | 28.55 | 0.873 |
| right | 26.71 | 0.861 |
| left | 25.78 | 0.837 |
| back | 23.63 | 0.784 |

No zenith/nadir in this recipe, so there is no `up`/`down` holdout.

## Qualitative (GT left, rendered right)

Screenshots: `docs/ops/x4-v1-canonical/screenshots/`

| View | Split | Notes |
|---|---|---|
| `fridge_side` | train t=55 front | Fridge + AprilTag recognizable. Soft. Notes on the door are not readable. |
| `island_side` | **holdout** t=40 front | Island / sink / dishwasher layout holds. Rug pattern and dish-rack items smear. |
| `archway_side` | train t=90 front | Pillar and boards present. Tag and calendar text unreadable. |
| `dark_cabinetry_side` | train t=70 left | Cabinets and fridge exist as dark masses. Ceiling light is a blob. |
| `living_opening_side` | **holdout** t=120 front | Dining room through the opening is painterly. Marker is a grey square. |

No V2-style rainbow floaters. Also no photoreal materials, no metrology-sharp tags, no commercial appearance layer.

## Persisted artifacts (research run — do not git weights)

```
…/Runs/2026-08-31T22-x4-v1-canonical/
  checkpoint.pt                      means, log-scales, quats, logit opacity, rgb, Adam state
  TRAIN_CONFIG.json
  OPTIMIZER_META.json
  x4_v1_canonical_raw.ply            53,944 GS, X4 world, full attributes
  x4_v1_canonical_arkit.ply          same count, EXACT_FRAME SIM3 on xyz + rot + uniform scale
  x4_v1_canonical.spz                53,944 / 53,944 retained (100%), 761.6 KB, --filter-nan only
```

### Final PLY header

```
ply
format binary_little_endian 1.0
element vertex 53944
property float x
property float y
property float z
property float f_dc_0
property float f_dc_1
property float f_dc_2
property float opacity
property float scale_0
property float scale_1
property float scale_2
property float rot_0
property float rot_1
property float rot_2
property float rot_3
end_header
```

`opacity` is post-sigmoid. `scale_*` are linear (not log). `rot_*` are wxyz. `f_dc_*` are SH0 (`(rgb - 0.5) / 0.28209479177387814`). No `f_rest_*` (SH degree 0, matching V1 RGB).

Verified on the ARKit PLY: median `scale_arkit / scale_raw = 0.63001996`, quaternions rotated by SIM3 `R`, `f_dc` and `opacity` unchanged.

## SIM3 (not recomputed)

```
P_arkit = scale * R @ P_x4 + t
scale = 0.6300199669353641
gate = USABLE
x4_sfm_rerun = false
```

Orientation: `q_arkit = q_R * q_x4`. Uniform scale: `s_arkit = s_x4 * scale` on all three axes.

## Reproduce

```
wsl -e bash /mnt/c/s360/scripts/ops/x4-v1-canonical/run.sh
```

Locks: `scripts/ops/x4-v1-canonical/test_x4_v1_canonical.py` (whole-pano holdout, equatorial-only, frozen SIM3, SIM3 hits center + quat + scale).

`scripts/ops/recreate-x4-v1-gaussian.py` now refuses and points here.
