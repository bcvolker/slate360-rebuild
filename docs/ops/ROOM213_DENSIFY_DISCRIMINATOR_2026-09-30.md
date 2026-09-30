# Room 213: densification discriminator (2026-09-30)

**Result: STOP RULE #1.** The table-edge Gaussians are **not** under-ranked. They rank high and still barely refine. The under-ranking hypothesis is not supported, so no ROI run was made.

## 1. Provenance (from artifacts)

**Trainer used for A / Adense / Official-ref:**
- Official release `spirula-2026.9.24-ubuntu-vulkan-x86_64.zip`.
- Binary sha256 `7e584142e7a9dd6cd8fb3e494a7b0085a26689907885ad57229cb8f4ec81cf97`, asserted by `check_bin()` at the start of every stage.

**Source:** tag v2026.9.24 = commit `183b2c6df72f42ecb9a0500cdad96749847da171`, confirmed by clone and `rev-parse`.

**`fd1afca1`** is a different trainer: the golden-line build (custom CUDA build + resume patch) used for the golden model and the 9/21–9/25 experiments. **It was not used for any 9/29 condition.**

**Densification config (resolved `config.json`, identical for A and for the replay):**
- `use_revised_densification` true
- `densify_loss_map_mode` ssim_cs
- `densify_accum_mode` avg
- `densify_score_mode` mean
- `densify_loss_map_power` 4
- `densify_score_power` 0.4
- `densify_final_score_power` 1
- `densify_score_clip_quantile` 1
- `growth_factor` 1.05
- `refine_every` 100
- `refine_start_iter` 500
- `refine_stop_iter` 14000
- `refine_stop_num_iter` 2500
- `min_opacity` 0.005
- `densify_oversize_split_fraction` 0.15
- `max_screen_size` 0.3
- `cap_max` 1,000,000

**Correction to earlier reports:** refinement runs while `step < max(14000, 30000 − 2500) = 27,500`, not only to step 14,000 (`EngineDensify.cpp:91-94`).

**Initial Gaussian count** = SfM seed points:

| Run | Seed points | Cap (1M) reached at |
|---|---|---|
| A | 665,307 | **step 1401** |
| Adense | 809,263 | step 1001 |
| Official-ref | 925,005 | step 701 |

Count vs iteration for A (logged): 665,307 up to step 501 → 698,572 (601) → 733,500 (701) → 770,174 (801) → 849,116 (1001) → 936,149 (1201) → 1,000,000 (1401 onward).

**The "≈ step 6,400" figure** comes from `ROOM213_FULLCIRCLE_MCMC_1M_PREFLIGHT_2026-09-23.md`. It was an *estimate* for the fd1afca1 FullCircle run seeded with 56.7k points. It does not apply to the 9/29 runs.

## 2. Direct measurement

**Instrument:** the same source commit plus a 32-line **dump-only** patch in `EngineDensify.cpp` (diff sha `25ae8533…`). At listed refinement steps it copies positions, log-scales, opacity logits, radii and `accum_buffer` to disk, just before and just after the parent draw.
- Built with the existing stock CUDA recipe: binary sha `69ff7004…`.
- Code: `workers/modal/room213-forensic/densify_probe.py` and `analyze_probe.py`.

**Replay:** A's exact dataset and command, killed at step 14,101. No model was kept.

**Equivalence to A:**
- Resolved config identical.
- Cameras (1016 / 5080) and seed (665,307) identical.
- **Splat-count trajectory identical at every logged step, cap at 1401.**
- Mean logged PSNR after step 3000: 25.81 (replay) vs 25.75 (A). Per-step values differ because the training view is random.
- Backend: CUDA, where A used Vulkan (same source; the project ships a densify parity test).

**Sets:** Gaussians within 3 cm (and 1.5 cm) of the table-edge point, the cable point and the armrest point, in A's world frame. The training frame is identity (`scene_transform.json`).

**Definitions:** rank = percentile among live splats (opacity ≥ 0.005, score > 0). Score = `accum_buffer.x`.

| Step | Draws / live | Table (3 cm): n, rank, score ÷ room median | Cable | Armrest | Table parents, observed / expected |
|---|---|---|---|---|---|
| 600 | 64,480 / 665k | 10, **91%**, ×1.39 | 6, 70%, ×1.11 | 13, 96%, ×1.57 | 0 / 1.35 |
| 700 | 53,330 / 699k | 7, **96%**, ×1.70 | 7, 62%, ×1.08 | 16, 94%, ×1.59 | 1 / 0.90 |
| 800 | 57,004 / 734k | 9, **86%**, ×1.35 | 6, 48%, ×0.99 | 14, 78%, ×1.22 | 0 / 0.93 |
| 900 | 62,322 / 770k | 7, **90%**, ×1.41 | 8, 58%, ×1.05 | 20, 85%, ×1.31 | 0 / 0.79 |
| 1000 | 67,224 / 809k | 10, **83%**, ×1.33 | 8, 56%, ×1.05 | 26, 87%, ×1.39 | 2 / 1.12 |
| 1100 | 73,025 / 849k | 8, **85%**, ×1.31 | 13, 30%, ×0.88 | 22, 82%, ×1.26 | 1 / 0.92 |
| 1200 | 78,163 / 892k | 6, **93%**, ×1.53 | 16, 53%, ×1.02 | 27, 77%, ×1.22 | 0 / 0.80 |
| 1300 | 84,281 / 936k | 7, **91%**, ×1.42 | 14, 67%, ×1.12 | 27, 91%, ×1.44 | 0 / 0.88 |
| 1400 | 62,082 / 983k | 9, **94%**, ×1.55 | 14, 30%, ×0.87 | 31, 83%, ×1.28 | 2 / 0.87 |
| 2000 | 25,958 / 1M | 10, 84%, ×1.30 | 18, 79%, ×1.23 | 29, 42%, ×0.95 | 0 / 0.33 |
| 4000 | 18,568 / 1M | 20, 68%, ×1.12 | 17, 21%, ×0.81 | 30, 62%, ×1.07 | 1 / 0.41 |
| 7000 | 12,039 relocations | 26, 79%, ×1.24 | 21, 67%, ×1.12 | 33, 11%, ×0.70 | 2 / 2.41 |
| 10000 | 7,044 | 34, 83%, ×1.31 | 22, 59%, ×1.06 | 27, 31%, ×0.88 | 0 / 0.30 |
| 14000 | 3,351 | 33, 70%, ×1.18 | 27, 62%, ×1.09 | 30, 58%, ×1.06 | 0 / 0.12 |

**Over the dumped events, parents near the table: 9 observed vs 12.1 expected. Cable: 9 vs 10.6.**

**Per-set details** (`probe_result.json`):
- Table opacity median 0.04–0.15.
- Longest world scale: p10 2.4–6.3 mm, p50 5–17 mm.
- Children created within 3 cm: 0–2 per event.

**`view_radius`:** the dumped radii are last-view only (zero for Gaussians the last view didn't see), so they are **not usable** as a per-Gaussian view radius. That is reported as unavailable, not estimated.

## Findings

1. **The table-edge Gaussians rank high:** 83–96th percentile during growth, 68–84th during relocation. That is consistently **above** the cable (21–79th), which in Adense *did* refine.
2. **Selection follows the score exactly** (observed ≈ expected draws). The refinement path is working as designed.
3. **Why high rank doesn't produce local refinement:** the score distribution is **flat**.
   - A top-decile table Gaussian scores only 1.3–1.7× the room median (`score_power` 0.4 compresses, and the mean over views averages).
   - Draws are proportional to score, not to rank.
   - About 60–85k draws spread over 0.7–1M splats per growth event gives the table's ~7–10 Gaussians roughly one draw per event: essentially uniform allocation across the room.
   - After step 1401 the cap limits draws to the dead pool (26k → 3k per event).
4. **This falsifies the earlier suggestion** (`ROOM213_DENSE_CLOSE_1_RESULT` §Diagnosis) that the allocation signal under-ranks the soft table edge.

## Decision

**Stop rule #1:** the table is high-ranking but still fails to refine, so the tested hypothesis ("ranked too low") is **not supported**. No ROI discriminator was run, and no further models.

**For review, not proposed:**
- What the data does show is a **flat proportional sampler with a hard cap reached at 4.7% of training**.
- High-value regions cannot get concentrated refinement under the current score shaping, whatever their rank.
- Any next step would change score shaping, budget or the optimiser. Those are all excluded by this brief and are left for review.

**Cost:** build about 7 min on CPU, replay 17 min on L40S. **About $1.5.**
