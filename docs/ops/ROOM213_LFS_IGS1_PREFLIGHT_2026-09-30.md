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

**Wall time / cost:** PENDING (measured s/iteration from the smoke and load check; see section 5).

## 2. Smoke test
PENDING

## 3. Full-dataset loading check
PENDING

## 4. Loaded-pixel fidelity (table target)
PENDING

## 5. Budget decision
PENDING
