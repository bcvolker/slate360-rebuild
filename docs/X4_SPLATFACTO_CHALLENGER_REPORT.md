# X4 Appearance Challenger — Nerfstudio Splatfacto

Fixed-camera appearance A/B on the KitchenAprilTags Route B X4 trajectory. Same 4 equatorial faces, operator masks, no nadir, and whole-panorama holdout as the Brush experiment. SfM was not rerun. Camera optimizer is **off** on both arms.

**Recommendation: do not promote B.** Bilateral grid did not beat baseline holdout PSNR or SSIM. Keep classic (non-antialiased) export. A is the stronger splatfacto arm numerically; it is still not photoreal on dark cabinets / AprilTags and is ~18× V1’s Gaussian count.

## Locks

| Lock | Value |
|---|---|
| Engine | nerfstudio splatfacto **1.1.5** (Apache-2.0), gsplat CUDA 1.5.3 |
| Camera optimizer | **off** (explicit `--pipeline.model.camera-optimizer.mode off`) |
| Poses | Route B COLMAP `c2w`; OpenCV→OpenGL camera axes only. `dataparser_transforms` = **I**, scale **1.0** |
| Faces | front / right / back / left @ **1200²**. No zenith, **no nadir** |
| Holdout | every 8th **whole panorama station** — 166 panos → 145 train / 21 holdout → **580 / 84** cameras |
| Masks | YOLOv8s-seg person masks, white=keep, 12 px dilate. **202 / 664** faces with operator (mean coverage 0.219). Fill masks on every frame |
| Rasterize | **classic**. Antialiased PLY is not the winner (Nerfstudio: not necessarily compatible with classic web viewers) |
| B only | `--pipeline.model.use-bilateral-grid True` (X4 exposure / ISP variation hypothesis) |
| Seed | Route B `x4_sparse.ply` (53,944 pts). No SfM rerun |

Shared dataset (research disk, not git): `…/Runs/2026-08-31T22-x4-appearance-shared/`

## Metrics (held-out whole panorama stations, n = 84)

| | A baseline | B + bilateral grid |
|---|---|---|
| PSNR dB | **25.09** | 24.83 |
| SSIM | **0.827** | 0.813 |
| LPIPS (Alex) | 0.261 | **0.257** |
| Masked PSNR (keep pixels) | 21.91 | 21.55 |
| Holdout min PSNR | 13.72 | 13.75 |
| Gaussian count | 976,091 | 790,443 |
| Runtime | 2405 s (~40.1 min) | 1853 s (~30.9 min) |
| Peak VRAM | 7276 MiB | 5462 MiB |

B is slightly better on LPIPS only. PSNR −0.26 dB and SSIM −0.014 vs A. Not a promote.

### Per-direction holdout PSNR / SSIM (21 cameras each)

| Face | A PSNR | B PSNR | A SSIM | B SSIM |
|---|---|---|---|---|
| front | **27.40** | 27.13 | 0.859 | 0.848 |
| right | **26.56** | 26.23 | 0.860 | 0.848 |
| left | **25.17** | 24.83 | 0.827 | 0.807 |
| back | **21.24** | 21.11 | 0.761 | 0.748 |

Back remains the weak equatorial face on both arms.

Train-distribution subsample (25 front views): A **28.04** dB / 0.869 SSIM, B 27.86 / 0.859. Not holdout.

## Versus custom gsplat V2 (different face set — do not over-read)

V2 was 6 faces including nadir, 40k steps, 273k Gaussians, holdout 24.14 dB. Equatorial-only V2 mean was ~23.59 dB. This 4-face splatfacto A holdout **25.09** dB is higher on the equatorial subset and drops the operator-heavy nadir, at the cost of **976k** primitives.

## Qualitative — GT \| A \| B

Screenshots: `docs/ops/x4-splatfacto-challenger/screenshots/`

| View | Split | Notes |
|---|---|---|
| `fridge_GT_A_B` | train t=55 left | Dark cabinets + microwave. A/B both hazy with color floaters. AprilTag unreadable. |
| `dark_cabinetry_GT_A_B` | train t=70 left | Rainbow mottling on fridge and ceiling in both arms. B does not clean it up. |
| `island_GT_A_B` | train t=55 front | Fridge AprilTag smudged. Iridescent streaks on steel and cabinet/ceiling join. |
| `arch_GT_A_B` | train t=90 front | Pillar AprilTag soft. Color splotches on the tan pillar in both; B not a clear win. |
| `living_opening_GT_A_B` | **holdout** t=120 front | Dining room through the opening is painterly. Ceiling/wall chromatic noise in A and B. |

Orientation matches GT (not flipped). Neither arm is photoreal.

## Export

Canonical classic PLY via `ns-export gaussian-splat --ply-color-mode sh_coeffs`:

- means `x y z`
- scales `scale_0..2` (log)
- quaternions `rot_0..3`
- opacity (logit)
- SH DC `f_dc_0..2` + rest `f_rest_0..44` (SH3)

Checkpoints: `…/A/A/splatfacto/2026-08-31_230602/nerfstudio_models/step-000029999.ckpt` and the B sibling. PLYs stay on the research disk (too large for git).

## Reproduce

```
wsl -e bash /mnt/c/s360/scripts/ops/x4-splatfacto-challenger/run.sh
```

Locks tested: `scripts/ops/x4-splatfacto-challenger/test_x4_splatfacto_challenger.py` (camera optimizer off, bilateral grid is the only A/B, poses not recentered, whole-pano equatorial holdout, no nadir).
