# Room 213 — projection A/B and 3M capacity test (2026-09-24)

Hardened worker (`slate360-spirula-hardened`, build `fd1afca1+resume-nsh-2f6a873bb639`). Dataset, cameras, frames,
masks, split and viewer unchanged. Every model scored at the SAME native fisheye eval cameras (24 holdouts, fixed view
camera2/frame_00103, 800-frame walkthrough) with the same metric code; the perspective model was re-rendered at the
native cameras by an eval-only `--resume` (validated: re-rendering the native model reproduces its own eval metrics
to 6 decimals). R2: `experimental/spirula-hardened/ab/test1-projection/`, `…/ab/test2-capacity/`.

## Step 0 — why the 1M model is soft (fixed view, no training)

| crop | render vs source | primary cause |
|---|---|---|
| ceiling / acoustic tile | fine band 0.24, mid 0.47 of source; best blur fit σ≈4 px | **source noise**: source fine-band energy 3.47 = flat-wall grain floor 3.32 at the same brightness; the "texture" is sensor/codec grain |
| carpet | fine 0.82, mid 0.94 (noise-corrected ≈100 % of real texture) | **exposure/view mismatch** (affine colour explains 24 % of MSE; render contrast ≠ this view) — detail itself retained |
| chair backs | fine 0.68 (≈73 % of real fine signal), blur σ≈1 px | **spatial blur** of thin slat edges (+13 % exposure) |
| table edges | fine 0.67 (≈71 %), blur σ≈1 px | **spatial blur** of edges |
| window frames | fine 0.50 (≈63 %), blur σ≈2 px | **colour/exposure** (27 % of MSE, gain 1.08) + blur |
| door / hardware | fine 0.78 (≈100 % of real), mid 0.97 | **colour/exposure** (30 % of MSE) |

Not the cause anywhere: alpha haze (low-opacity splats in front of the surface carry 2–5 % alpha; 2–4 splats reach
α=0.5) or SH smoothing (SH rest energy 6–12 %, normal). Holdout exposure gain spread ±2.5 % (0.97–1.10): per-view
exposure/white-balance variation is real and unmodelled (bilateral grid / PPISP are off in the golden recipe).

## Test 1 — projection A/B (only `--warp-to-pinhole 0 → 1`)

Resolved-config diff vs golden: `warp_to_pinhole` only. 218 fisheye → 1,090 pinhole faces (5 × 1718², uniform fit);
faces keep the parent centre (max 4.7e-7) with a fixed per-face rotation (spread 1.3e-7): no new SfM.

| | native (1M) | perspective (1M) |
|---|---|---|
| Gaussians | 996,260 | 995,544 |
| holdout PSNR / SSIM / LPIPS | **19.21** / **0.715** / **0.272** | 18.90 / 0.713 / 0.293 |
| holdout detail (edge ratio, fine band) | **0.453, 0.730** | 0.419, 0.704 |
| fixed view PSNR / LPIPS | **19.17 / 0.237** | 18.90 / 0.262 |
| crops (PSNR) | ceiling 29.2, door 25.4, carpet 19.7 better | window 28.4, chairs 24.1, table 23.3 better |
| crops (fine-band retention) | higher on 5 of 6 | higher on door |
| walkthrough grad energy / flicker | **23.9** / 8.60 | 22.7 / 8.45 |
| Spark (80 poses) | reference | 30.8 dB vs native, gradient energy ×0.964 |
| training time | 1,587 s | 1,155 s |

**NATIVE WINS** — small but consistent (holdout PSNR +0.31 dB, LPIPS −0.021, more retained detail in the renders,
walkthrough and Spark). Visually close; projection is not the main remaining limit.

## Test 2 — 3M / 50k, native (only `--cap-max 3M`, `--num-iterations 50k`)

Probe: reached the 3M cap at step ~9k; 0.088 s/step at 3M (1M: 0.044); peak VRAM 5.1 GB; projected $3.90.

| | 1M / 30k | 3M / 50k |
|---|---|---|
| Gaussians | 996,260 | 2,980,559 |
| runtime (end-to-end) / cost | 55 min / ~$1.80 | 82 min / ~$2.67 |
| holdout PSNR / SSIM | **19.21 / 0.715** | 19.10 / 0.704 |
| holdout LPIPS | 0.272 | **0.258** |
| holdout detail (edge ratio, fine, mid) | 0.453, 0.730, 0.870 | **0.539, 0.794, 0.921** |
| fixed view PSNR / SSIM / LPIPS | 19.17 / 0.746 / 0.237 | **19.29 / 0.762 / 0.215** |
| ceiling (PSNR, fine band) | 29.2, 0.23 | 30.2, 0.34 — still grain-floor limited |
| carpet | 19.7, 0.88 | 19.8, 0.90 |
| chair slats | 23.7, edge 0.756 | 24.0, edge 0.776 |
| table edges | 23.0, edge 0.774 | 23.8, edge 0.799 |
| window frames | 27.3, fine 0.52 | 28.0, fine 0.60 |
| door / hardware | 25.4 | 25.0 |
| walkthrough grad energy / flicker | 23.9 / **8.60** | **26.7** / 9.13 (+6 %) |
| Spark | loads 8.3 s | loads 21.5 s, 923 MB JS heap; 30.9 dB vs 1M, gradient energy ×1.063 |

3M is measurably sharper (LPIPS −5 %, edge energy +19 % on holdouts; window exteriors and table tops show more
texture) but it does NOT close the source-to-render gap where it matters: slat and table-edge retention move by
2–3 points, the ceiling stays at the source grain floor, carpet/door were already retained. Holdout PSNR/SSIM drop
(−0.11 dB / −0.011) and walkthrough flicker rises 6 %, and walls pick up a fine speckle — part of the extra
capacity is fitting per-view sensor grain, which does not generalize. No clearly visible improvement over 1M in the
fixed crops.

## Verdict

**C. 1M→3M PLATEAUS — SOURCE/APPEARANCE IS NOW THE LIMIT.** Capacity scaling stops here (no 5M/10M/15M).

Smallest next diagnostic (not launched): an appearance-only A/B at 1M — the golden recipe with Spirula's per-image
appearance model (`--use-bilateral-grid 1`, or PPISP) switched on, everything else frozen — because per-view
exposure/colour mismatch explains 13–30 % of the remaining crop error and is the largest unmodelled term; paired with
a source-side check of X4 denoise/bitrate on one exposure to confirm how much ceiling/wall grain is recoverable at all.

## Cost

GPU (L40S card rate $1.95/h): Test 1 run $2.55 (incl. a transport-timeout fresh read, re-checked on CPU; no retrain),
warp native re-render ~$0.8, native re-render validation $0.82, Test 2 run $2.67, 3M probe $0.48, the mistaken full-
length warp probe $0.87 (`--max-steps` is an LR horizon in this revision — now banned from jobs), ~$0.3 of failed
short render starts. ≈ $8.5 GPU + <$1 CPU. One GPU trainer at a time; each test under its $5 cap.
