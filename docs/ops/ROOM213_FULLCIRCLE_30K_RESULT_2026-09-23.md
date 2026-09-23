# Room 213 — FullCircle native-fisheye 3DGRT: full 30k result (2026-09-23)

Run `room213-2309_004634`, call `fc-01M35VHXEKA76VJGAY1SMNK1NA`, native 3840², released `apps/colmap_3dgrt.yaml`
with only the proven GS hook fix (`dd5513b5`) and checkpoint cadence [7k,15k,20k,25k,30k]. Launched server-side
(deploy + spawn) after two earlier runs died to local-client coupling. Completed 05:45:48 UTC, ~5 h.
Outputs: `ours_{7000,15000,20000,25000,30000}/ckpt_*.pt`, `export_last.ply`, `export_last.ingp`.

## Training
| | |
|---|---|
| Gaussians | 56,674 → **78,000** (peak 78,021); growth stopped at 15k as configured (+37.6 %) |
| rate | 3.4 → 1.7 it/s, settling once densification ended |
| peak GPU | 5,635 MiB of 46,068 (12 %) |
| stability | no NaNs, smooth growth, no runaway |

## Held-out (24 novel-view frames, never trained on)
PSNR **22.405** (std 0.82), SSIM **0.771**, LPIPS **0.419**; Sobel edge-energy ratio render/GT median **0.369**
(range 0.289–0.440). Visually: correct structure from unseen viewpoints, no floaters, no duplicated surfaces, no holes,
operator removed and background plausibly filled. One minor smudge where the operator occluded the view.
K6 (PSNR 21.999 / SSIM 0.838 / LPIPS 0.368) is **not cross-comparable**: K6 was scored on 2560 perspective faces,
this on native fisheye frames — different pixel populations.

## Fixed physical camera across checkpoints (camera2/frame_00103, view match 0.0 on every checkpoint)
Edge-energy ratio render/GT (1.0 = source detail):

| | left | right | ceiling grid | windows | chair backs | table edges | door | carpet |
|---|---|---|---|---|---|---|---|---|
| broken run, 56.7k Gaussians, 25k | 0.272 | 0.448 | 0.114 | 0.342 | 0.484 | 0.488 | 0.604 | 0.455 |
| fixed 7k | 0.229 | 0.370 | 0.042 | 0.272 | 0.467 | 0.468 | 0.543 | 0.402 |
| fixed 15k | 0.258 | 0.419 | 0.067 | 0.329 | 0.525 | 0.522 | 0.583 | 0.432 |
| fixed 20k | 0.270 | 0.428 | 0.071 | 0.351 | 0.535 | 0.534 | 0.588 | 0.445 |
| fixed 25k | 0.284 | 0.435 | 0.092 | 0.356 | 0.535 | 0.536 | 0.578 | 0.457 |
| **fixed 30k** | **0.285** | **0.438** | **0.092** | **0.353** | **0.547** | **0.547** | **0.589** | **0.464** |

**Densification working (+37.6 % Gaussians) did not materially recover detail.** On the same camera the fixed 30k model
matches the broken 25k model within ±0.013 on both regions; chairs and tables gain ~12 %, ceiling texture is slightly
worse, everything else is flat. Visually the two are indistinguishable: structure, colour and exposure are right; fine
texture (ceiling acoustic-tile speckle, carpet pattern, chair mesh) is absent in both.

Process notes: a first pass rendered the wrong lens (the released renderer crashed with `KeyError: 'ssim'` after one
frame when extra metrics were disabled, and a warm container then re-served stale code). It was caught by an explicit
view-match check (46.7 vs 0.0) and discarded; only the 0.0-match results above are valid.

## Why — Gaussian footprint
78k Gaussians over roughly 316 m² of room surface is ~250 per m², ~6 cm apart. At 2.5 m that subtends ~1.4°; at the
self-calibrated ~1075 px/rad (~18.8 px/deg) that is **~27 source pixels per Gaussian**. Detail finer than that cannot be
represented. +37.6 % population shrinks the footprint only ~15 %, consistent with no visible change. Reproducing
source-pixel texture would need primitives of a few pixels — an order of magnitude or two more Gaussians. The released
GS thresholds (2e-4, ~1 % split per event) are far too conservative for native-resolution input.

Caveat on the metric: the raw X4 video frames carry visible sensor noise and HEVC compression, so part of the "missing"
edge energy is noise the model correctly does not reproduce. The texture loss on ceiling tiles and carpet is real.

## Classification
**`RESOLUTION/DETAIL`** — structure, generalisation, colour/exposure and cleanliness (no haze/floaters) are good; fine
texture is not reproduced. Camera/coverage: excellent. Viewer/export: not yet tested.

## Single next experiment (recommended, not launched)
The released **MCMC** configuration (`apps/colmap_3dgrt_mcmc.yaml`) with an **explicit Gaussian budget** in the low
millions, preceded by a short throughput/memory probe. MCMC sets population directly instead of via a gradient
threshold, its strategy hook is correctly wired (no code change), and memory headroom is large (78k used 12 %).
It discriminates the two remaining explanations: detail returns ⇒ population was binding, productionise on MCMC;
detail does not return ⇒ the X4 video source itself is the ceiling, and the fix is on the capture side.
