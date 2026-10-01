# Room 213: product path decision memo (2026-09-30)

**Scope:** memo only. Nothing trained or launched.

## A. Existing Spirula-supported solution: **POSSIBLE**

- **The pinned v2026.9.24 has nothing that targets this.**
  - No option exists to concentrate refinement locally or preserve fine planar detail.
  - The densify options present (`densify_score_power`, `densify_accum_mode`, and so on) would only be speculative parameter changes.
- **The upstream release v2026.9.30** (published 2026-09-30, `spirula-2026.9.30-ubuntu-vulkan-x86_64.zip`) adds a **supported, documented ROI and partition mechanism.** Sources: `docs/notes/scene-partition.md`, `TrainConfig.h`.
  - **`--roi-region <region.json>`:** boxes, spheres and half-spaces, combinable with union, intersection and difference.
  - **`--roi-outside-weight` (default 1e-4):** splats outside the region are drawn for relocation and growth at 1e-4 of the weight inside, so the fixed 1M budget concentrates inside the region.
  - **`--roi-mask-pixels` (default on):** only pixels showing the region are supervised.
  - **`spirula partition`:** splits the scene into parts that each get their own budget, trains them and merges the results.
  - **Other changes:** `alpha_loss_weight` default 0.1 → 0.5, a fix for occasional training divergence, and SfM/masking changes.
- **Classification:** *relevant upstream change worth one bounded test* (category 2). It is a released feature, not a parameter sweep and not custom development.
- **Issues:** no issue reports sharp edges rendering broader. The closest open issue is #34 ("oversized splats on flat surfaces").

## B. Developer package: **READY** (not sent)

`docs/ops/SPIRULA_DEVELOPER_REPORT_FINE_EDGE_2026-09-30.md` plus `docs/ops/spirula-dev-report-2026-09-30/` contain:
- figures;
- the 2.12 → ≈2.6 (expected) → 4.79 px observation, and the 0.57 px close-view agreement;
- the 4 → 20 close-view result (5.01 px);
- score-rank history, and Gaussian sizes and counts;
- exact trainer and source SHAs, the resolved config, and reproduction steps.

It asks the neutral question: is this expected, and is there a supported setting or newer revision intended to preserve such detail? It proposes no fix. Posting it on GitHub needs Brian's approval.

## C. External workflow candidate: **Jawset Postshot v1.1.69** (2026-08-18), Indie tier

**Why this one:**
- A mature commercial trainer with Splat3/MCMC profiles and a max-splat-count setting.
- It **imports COLMAP poses** (.bin/.txt, including the FullOpenCV model) and then skips its own SfM, so the comparison isolates the trainer.
- It **exports standard PLY** (SH degree 0–3) and SPZ.

**Licensing:** the Indie tier allows commercial use and PLY/SPZ export, and the EULA leaves output ownership with us. The price was not visible on the vendor page, so it must be confirmed.

**Constraints:**
- Windows only, NVIDIA GPU with compute capability ≥7.5, one active device.
- **No fisheye or 360 support is documented.** X4 footage would have to be converted to perspective crops, with a PINHOLE COLMAP export of our registered poses. That drops the >180° periphery and adds a resampling step.
- Postshot's extra PLY header fields need a check in Spark.
- A 4K training limit on the Indie tier is unverified.

**Effort (estimate):** 3–6 hands-on hours plus 1–3 GPU hours on an RTX 4090-class machine. It cannot run on Modal.

**Only alternative checked:** gsplat 1.5.3 (Apache-2.0, fisheye via 3DGUT). It is a library close to Spirula, not a product comparison.

## D. Forced refinement: **CHEAP_AND_WORTH_ONE_TEST**, only through the supported v2026.9.30 ROI mechanism

- No custom refinement system is needed.
- **Source of local capacity:** redistribution of the fixed 1M budget. Growth and relocation outside the region are drawn at 1e-4 weight.
- A continuation design is unnecessary. A matched from-scratch pair on the frozen A dataset (control vs ROI, same release) is cleaner.
- **Cost:** well under 2 engineering hours and $10.

## E. Recommended next action: **`TEST_SUPPORTED_SPIRULA_FIX`**

**Experiment: R213-ROI-930**, run on A's frozen workspace (images, masks, sparse, manifest unchanged) with the v2026.9.30 release binary (sha recorded at run time) and `train 360-camera` defaults. Two runs:

| Run | Flags |
|---|---|
| **CONTROL-930** | no ROI (isolates the version change) |
| **ROI-930** | `--roi-region roi.json` only |

- **Region:** one box in A's world frame covering the table corner and the chair armrest: x −2.8…+0.8, y 3.2…4.6, z −0.05…1.3. Defaults otherwise (`--roi-outside-weight 1e-4`, `--roi-mask-pixels` on).
- **Same 30k steps and 1M cap.**
- **Measured with the existing harness, at the same cameras and holdouts as before:**
  - table and armrest close edge width;
  - retention against never-trained neighbour frames;
  - nearby novel midpoints;
  - local Gaussian count and size;
  - visual crops.

**Cost:**
- Human effort: about 1 h (fetch the release, write the region JSON, run, evaluate).
- Compute: 2 × about 30 min training on L40S plus renders, **≈$5–6**.
- Elapsed: about 1.5–2 h.

**PASS (all required):**
- ROI-930 table close edge **≤3.2 px (≤1.5× source)**, visibly sharper banding at the training cameras, the never-trained neighbours and the novel midpoints.
- Armrest not worse than A (≤3.7 px).
- No new floaters or ghosting.
- Local Gaussian count near the table substantially up (≥5×).
- CONTROL-930 table within about ±10% of A (4.8 px), so any gain comes from the ROI, not the version change.

**FAIL:**
- Table edge still **≥4.3 px** (<10% better) while the local Gaussian count rose ≥5×.
- That means concentrated capacity through the supported path does not recover the source sharpness, so the limit is optimisation, loss or rendering and not allocation.

**What happens after each result:**
- **PASS:** the supported product path is **partitioned training** (`spirula partition` gives each part its own budget) of the whole Room 213 X4 walkthrough. One partitioned whole-room run is then validated in native Spirula and the Slate360/Spark Walk viewer (separate approval).
- **FAIL:** stop Spirula tuning. Send the developer package with the ROI result added, and in parallel run the Postshot benchmark (C) as the single remaining product comparison. If Postshot also fails to keep the table edge, conclude that X4 video plus current 3DGS trainers cannot meet the fidelity bar within budget.
