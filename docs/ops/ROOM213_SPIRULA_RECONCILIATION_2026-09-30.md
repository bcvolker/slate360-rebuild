# Room 213: Spirula reconciliation before LichtFeld (2026-09-30)

**Decision: `PROCEED_LICHTFELD`.** No training was run.

**Sources:**
- A's resolved config: `spirula-dev-report-2026-09-30/resolved_config_A.json`, preset `360-camera`.
- Spirula source at the v2026.9.24 tag, `183b2c6df72f42ecb9a0500cdad96749847da171`.
- The frozen A model `conditions/A/ws/outputs/ref/step-000030000.ckpt/splat.ply` and A's `sparse/0` cameras.

## 1. Densification path: long-axis splitting WAS active in A

**A's resolved values:**

| Setting | A |
|---|---|
| `use_revised_densification` | **true** |
| `use_long_axis_split` | true (see the note below) |
| `long_axis_split_opacity_k` | [0.5, 0.6, 15000] (from the `360-camera` preset) |
| `densify_oversize_split_fraction` | 0.15 |
| `densify_oversize_score_blend` | 1 |
| `growth_factor` | 1.05 |
| `densify_loss_map_mode` | ssim_cs (no edge map, no NMS) |
| `densify_score_mode` / `densify_score_power` | mean / 0.4 |

**Source (`src/engine/EngineDensify.cpp`):**
- `use_revised = cfg.use_revised_densification` (line 89).
- If `do_densify && use_revised` (line 304):
  - `relocate_splats_with_long_axis_split_tensor(...)` runs every refine event (dead-splat relocation);
  - growth to `min(cap, 1.05 × n)` runs through `add_splats_with_long_axis_split_tensor(...)`;
  - the oversize channel (`use_oversize_channel = densify_ongoing && use_revised && oversize_split_fraction > 0`, line 197) draws 15% of the added splats first.
- **The only switch that decides whether long-axis splitting runs is `use_revised_densification`.** It was true.

**Note on `use_long_axis_split`:** this config field exists (`TrainConfig.h:197`, default true; the `academic-baseline` preset sets it false). However, nothing in the engine reads it at this commit (`grep` finds only the config and i18n). It was true in A in any case.

**Conclusion:**
- **Long-axis splitting was active in A** for relocation, growth and the oversize channel.
- After the cap (step 1401), it ran through relocation until refinement stopped at step 27,500.
- **The earlier LichtFeld rationale claiming Spirula lacks a directed split was wrong** and has been corrected (section 4).

## 2. Maximum on-screen size: `SCREEN_SIZE_CONTROL_NOT_APPLICABLE`

**A's values:**
- `max_screen_size` = **0.3**
- `max_screen_size_clip_hardness` = 1.5
- `max_screen_size_penalty` = 1
- `max_world_size` = inf
- The hinge is active because penalty > 0. It also feeds the oversize channel (`densify.slang:78`, `radii > max_scale2d`).

**What "screen size" is** (from `src/generated/primitive_3dgs.cuh`, `view_radius_3dgs`):
- `R = exp(max log_scale) · sqrt(2 ln(max(255·opacity, 1)))`, the radius where alpha falls to 1/255.
- `size = R / (max(d, R) + sqrt(max(d² − R², 0)))`, which is about R / 2d and dimensionless.
- The trainer keeps the maximum over the faces a splat lands in (`projection_fwd.slang`, `InterlockedMax`). So the value that matters is at the nearest training camera that sees the splat.

**Measured** on the frozen A model (no retraining) by `workers/modal/room213-forensic/screen_size.py`. Contributors are Gaussians with opacity ≥ 0.05. Views:
- the 34 training observers of T_table, 4 of them at the close range of 0.79–1.0 m;
- every one of the 1,016 camera centres, as a visibility-free upper bound.

Output: `spirula-dev-report-2026-09-30/screen_size_table_A.json`.

| Contributors near the table edge | n | Extent R (mm), p50 / max | Screen size at close views, p50 / max | Max over observers, per splat: p50 / max | Upper bound, any camera: max | Share > 0.1 |
|---|---|---|---|---|---|---|
| within 15 mm | 7 | 12.0 / 17.5 | 0.0064 / 0.011 | 0.0075 / 0.011 | 0.016 | **0%** |
| within 30 mm | 22 | 23.9 / 65.8 | 0.014 / 0.042 | 0.015 / 0.042 | 0.061 | **0%** |
| within 60 mm | 89 | 30.7 / 80.9 | 0.017 / 0.052 | 0.019 / 0.052 | 0.073 | **0%** |

**Reading:**
- The table-edge contributors are **2.4–9× below the recommended 0.1** and 7–27× below A's 0.3, even at the nearest camera centre with visibility ignored.
- Lowering the limit to 0.1 would leave the hinge gradient at exactly zero for these splats, and leave their oversize-channel weight at its floor.
- The developer's advice targets oversized splats on low-texture surfaces. The table-edge splats are not oversized in screen terms. They are 4–8 mm σ splats seen from 0.8 m, which is a world-scale problem, not an on-screen one.

**Limitation:** this measures the *final* model. The per-step history of the screen-size values during training was not recorded, so splats that were larger early in training cannot be ruled out. The final contributors, the ones that render the edge, do not qualify.

## 3. Distractor robustness: `distraction_robustness = "off"`, NOT active

- **Resolved value in A:** `"off"` (the default; the `360-camera` preset does not set it).
- **Source** (`TrainConfig.h:589–600`): when it is not "off", it overrides `densify_loss_map_power` → 1, `densify_score_power` → 1 and `ssim_lambda` → 0.1. "strong" also sets `robust_edge_aware` / quantile 0.75 / median.
- A's resolved values are all the unmodified defaults (`densify_score_power` 0.4, `ssim_lambda` 0.2, `densify_loss_map_mode` ssim_cs, `densify_score_mode` mean). That confirms the mode did not run.
- `floater_suppression` is also "off", so its own `max_screen_size` override (0.1 or 0.2) was not applied either.

**Classification:** it **could not have reduced detail in A**, because it was inactive. Unchanged.

## 4. LichtFeld comparison corrected

`ROOM213_CLOUD_NATIVE_TRAINER_CHECK_2026-09-30.md` is updated.

**Shared by both trainers (removed as a claimed difference):**
- long-axis splitting;
- the starting means/scales learning rates (1.28e-4 / 0.02);
- L1 + 0.2 D-SSIM.

**Verified differences only:**
- **Population growth timing.** Spirula reaches its cap at step 1401 and only relocates after that. IGS+ follows a Taming quadratic budget over the 500–15,000 window.
- **Candidate-selection concentration.** Spirula draws in proportion to score^0.4, measured as flat. IGS+ hard-filters to the top 4× budget by error.
- **Edge-weighted selection.** Off in A (ssim_cs, no NMS). On in IGS+ (Sobel+NMS, weight 0.25).
- **Optimiser and loss scheduling:**
  - LR end points: IGS+ decays ×0.1 over the run; Spirula decays to 1.6e-6 / 0.005.
  - Position noise: SGLD noise in Spirula, none in IGS+.
  - Opacity handling: IGS+ uses opacity reset and pruning; Spirula relocates dead splats instead.
  - Regularisers: Spirula has opacity, scale, erank and screen-size regularisers; IGS+ has none.
  - Appearance: Spirula has PPISP + bilateral grid; IGS+ has neither.
  - Renderer: Vulkan vs CUDA.

**Effect on the case for the benchmark:** the expected difference is narrower than first stated. It remains a materially different *refinement and optimisation regime* applied to the same pixels and cameras, which is the question the benchmark asks.

## 5. Decision: `PROCEED_LICHTFELD`

**Why the alternatives don't apply:**
- No Spirula configuration confound was found.
  - Distractor robustness and floater suppression were off.
  - Long-axis splitting was on.
  - The screen-size limit can't touch the table-edge contributors, at 0.3 or at 0.1.
- So `REVIEW_SUPPORTED_SCREEN_SIZE_TEST_FIRST` has no measured basis.
- `SPIRULA_CONFIGURATION_CONFOUND_FOUND` does not apply.

**What continues:** the LichtFeld benchmark runs under its corrected final contract, with the schedule, smoke test and resource gates done before any training.
