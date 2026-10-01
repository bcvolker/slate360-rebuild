# R213-LFS-IGS-1: schedule contract and pre-run gates (2026-09-30)

**Pinned:** LichtFeld Studio `c72a0d8554a33371ccd97df1e9fbe480d0981fdd`; recipe = the unmodified upstream
`eval/improvedGSplus_optimization_params.json` (the IGS+ paper's 1M-budget benchmark config) + CLI only.

## 1. Schedule: `--steps-scaler 5` → 150,000 iterations (frozen)

**Exposure, from source:**
- **Spirula A** (v2026.9.24, `TrainerCore.cpp:1034`): `train_bs = round(1016 / max_batch_per_epoch 800) = 1` *input* image per
  step, and the K = 5 faces of one fisheye are rendered and trained together in that step (`DataManager.cpp:718`,
  "the K post-split cameras of one input stay together"). 30,000 steps ⇒ 150,000 face-presentations ⇒ **≈29.5 presentations
  per face** (30,000 / 1,016).
- **LichtFeld**: one image (= one face here) per iteration. At the unscaled recipe (30,000) that would be **5.9 per face**,
  a 5× under-exposure relative to A.
- LichtFeld's own GUI auto-scaling (`parameter_manager.cpp:399`, BASE_IMAGE_COUNT 300; locale text "roughly 100 iterations
  per active training image") would give ×16.93 = 508,000 iterations ≈ 100 per face, **3.4× more exposure than A**.

**Choice: steps_scaler = 5.0 (exposure-matched to A).**
- It gives every face the same ≈29.5 presentations A's faces received, so exposure is controlled and the comparison isolates
  the algorithm. The documented ×16.9 would confound "different method" with "3.4× more passes".
- `steps_scaler` stretches every step-based setting together (`parameters.cpp scale_steps`), so the full refinement schedule
  runs, just stretched; LR decay (`ExponentialLR`, ×0.1 over `iterations`) stretches with it.

**Resolved schedule at ×5:**

| Setting | Recipe | ×5 |
|---|---|---|
| iterations | 30,000 | **150,000** |
| start_refine / refine_every / stop_refine | 500 / 500 / 15,000 | **2,500 / 2,500 / 75,000** |
| refine events (`is_refining`) | 30 | **30** (iters 2,500 … 75,000) |
| opacity reset (`reset_every`, < stop_refine) | 3,000 | 15,000 (at 15k, 30k, 45k, 60k) |
| SH degree step (`sh_degree_interval`) | 1,000 | 5,000 |
| means / scaling LR | 1.28e-4 / 0.020, ×0.1 decay over the run | same, over 150,000 |
| max_cap | 1,000,000 | 1,000,000 (= A) |

**Expected population** (Taming curve, `get_count_array`, seeds 665,307, T = 31; target after each event, before pruning
is refilled at the next event): 2,500 → 707,100 · 10,000 → 764,565 · 25,000 → 860,689 · 40,000 → 931,737 ·
55,000 → 977,710 · 70,000 → 998,606 · 75,000 → **1,000,000**. Opacity pruning (< 0.005) after each event and opacity resets
can leave the final count below 1M after step 75,000 (no growth after `stop_refine`).

**Wall time / cost (measured):** the full-dataset load check trained 5,500 iterations at ≈110 it/s with ~700k
Gaussians (training VRAM 2–5 GB). Allowing for 1M Gaussians late in training, the 150,000-iteration run is expected to
take **≈30–50 min on one L40S, ≈$2–3** (L40S + 8 CPU + 96 GB). The documented ×16.9 schedule (508,000 iterations) would be
≈2–3 h, ≈$7–10; not chosen, for the exposure reason above, not for cost.

## 2. Smoke test (`runs/smoke`, then `runs/smoke_resume`)

- Data: 20 source fisheyes = 100 faces (the 4 close T_table images + 16 spread across the walk); same recipe, same ×5
  scaling, `-i 700` → 3,500 iterations so it passes the first scaled refinement event (2,500). Model discarded.
- **Ran normally** (exit 0, 46.5 it/s average including the eval pass, peak VRAM 3.9 GB).
- **One real refinement event executed at iteration 2,500:** Gaussians 665,307 → **707,098**; the Taming schedule's
  target for that event is 707,100 (2 short = opacity pruning). Before 2,500 the count stays at 665,307, as it should.
- **Checkpoint save/reload:** `project.licht` written at the end (282 MB snapshot); `--resume` reloaded it in a fresh
  container, restored 707,098 Gaussians and re-exported `splat_3500.ply` (exit 0).
- **PLY export:** `splat_3500.ply` written in both runs.

## 3. Full-dataset loading check (`runs/loadcheck2`, 5,500 its at ×5 + `--eval-all`, no images saved)

- LichtFeld log: "Loaded dataset 'data' into scene: **5080 train cameras (5080 with masks)**", "Found 5080 masks",
  "Training on all 5080 images and evaluating on them".
- Every one of the 5,080 images was evaluated at step 5,500 (`per_image_metrics.json`: 5,080 entries, all
  **1718 × 1718**, all `masked: true`). No resizing (`-r 1 --max-width 0`; native 1718² confirmed per image).
- Loader: `failed=0`, `0 misses`, masks `5503/5503/0`; compressed cache **10,160 entries** (5,080 images + 5,080 masks),
  13.1 GB in RAM, **0 spill** → no silent cache failure. No OOM fallback (peak VRAM 40 GB occurs only in the eval pass;
  training used 2–5 GB).
- Second refinement event reached 726,948 Gaussians (schedule target ≈727k).
- (`runs/loadcheck` was stopped: its single-threaded copy from the volume stalled the GPU; replaced by a parallel copy.)

## 4. Loaded-pixel fidelity on the table (`loaded_fidelity.json`)

The GT that LichtFeld itself loaded (left half of its eval image = GT × mask, after its JPEG cache and nvJPEG decode),
for the 4 close T_table faces, against A's float training face (Spirula path: stb_image decode → float bilinear):

| View | LichtFeld-loaded vs exported JPEG | vs A's float face: mean / max | PSNR | Edge width A face → loaded |
|---|---|---|---|---|
| o06 | identical (0.0 LSB) | 0.49 / 4.0 LSB | 51.4 dB | 2.30 → 2.31 px (×1.005) |
| o07 | identical | 0.48 / 4.4 | 51.6 dB | 2.09 → 2.14 (×1.025) |
| o08 | identical | 0.47 / 4.5 | 51.7 dB | 2.13 → 2.15 (×1.013) |
| o09 | identical | 0.49 / 4.5 | 51.4 dB | 1.55 → 1.52 (×0.980) |

The only deviation is the 8-bit JPEG q100 4:4:4 storage (needed because LichtFeld re-encodes non-JPEG inputs to q95):
mean 0.5 LSB, table edge widths within −2% / +2.5%. **The training pixels are materially unchanged.**

**Conversion gate (`gate_report.json`):** 5,080 faces + 5,080 masks, names = `images.bin`, all 1718²; one PINHOLE
camera 1718² f = c = 859; 665,307 points; round-trip reprojection max **1e-11 px** (gate 0.05 px; conversion fidelity
only, not a claim about the camera solution); masks binary, white = train, agree with all 34 T_table observations,
backward band of side faces always 0 (`mask_stats.json`).

## 5. Budget decision and launch

- Spend on the LichtFeld run app before the full run ≈ $3–4 (≈$1.5 of it the stalled first load check); export ≈ $0.7;
  builds ≈ $2.9 (preparation, outside the run budget). Full run ≈ $2–3, evaluation ≈ $1 → within the $10 cap.
- **Launched exactly one benchmark run** (`runs/full`, `--steps-scaler 5`, 150,000 iterations). No other configuration
  will be run.

**Build provenance:** commit `c72a0d85`; base `nvidia/cuda:12.8.1-devel-ubuntu24.04`, gcc-14, CMake 4.0.3, vcpkg;
preset `linux-release`, target `LichtFeld-Studio` only, `ENABLE_COMPILER_CACHE=OFF`; CUDA 12.8.93, arch sm_86 SASS
(upstream fallback without nvidia-smi; runs on the L40S sm_89); exe sha256 `12d1e135375d4cc20be28c74fcf91020bf1ceeafc4d52cae6a82674978ca5c40`.
Build-only fixes, none touching training code: CUDA driver stub on the build library path for nanobind stub generation;
libuuid 1.0.3 tarball from the MacPorts mirror (SHA-512 equal to vcpkg's pin) during a SourceForge 522 outage; the
dev-only "committed stubs" check skipped by building the app target. Run GPU: L40S, driver 580.95.05.

**Non-default settings vs the recipe:** `--steps-scaler 5`; dataset flags `--mask-mode ignore -r 1 --max-width 0`;
`--headless --export ply`. Everything else is the upstream `improvedGSplus_optimization_params.json`.
