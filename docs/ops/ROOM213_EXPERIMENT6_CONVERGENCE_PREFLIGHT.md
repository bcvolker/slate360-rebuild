# Room 213 Experiment 6 — longer convergence + late scale cleanup, preflight

**Status: preflight only. No training launched. No GPU spent on training. Waiting for
approval.**

This audits H5's actual scheduler and convergence behavior first, as instructed, then
designs a two-arm experiment testing whether a longer budget plus one late, optimizer-aware,
scale-only prune recovers sharpness without reopening any of gsplat's own strategy behavior.

---

## 1. Scheduler audit — read directly from the pinned nerfstudio 1.1.5 source

`nerfstudio/configs/method_configs.py`'s `splatfacto` entry and `nerfstudio/engine/
schedulers.py`'s `ExponentialDecayScheduler`, both fetched and read at the exact pinned
version (not assumed):

| Param group | Optimizer | Init LR | Final LR | Scheduler | Horizon (`max_steps`) | Warmup |
|---|---|---|---|---|---|---|
| `means` (position) | Adam | 1.6e-4 | 1.6e-6 | ExponentialDecay | **30,000 (hardcoded)** | 0 |
| `features_dc` | Adam | 2.5e-3 | — | none (flat) | — | — |
| `features_rest` | Adam | 1.25e-4 | — | none (flat) | — | — |
| `opacities` | Adam | 0.05 | — | none (flat) | — | — |
| `scales` | Adam | 0.005 | — | none (flat) | — | — |
| `quats` | Adam | 0.001 | — | none (flat) | — | — |
| `camera_opt` | Adam | 1e-4 | 5e-7 | ExponentialDecay | 30,000 | 1,000 | *(inert: `camera-optimizer.mode=off` in every arm this series has ever run — this schedule is configured but never applied)* |
| `bilateral_grid` | Adam | 2e-3 | 1e-4 | ExponentialDecay | 30,000 | 1,000 | *(active: `use_bilateral_grid=True`)* |

**The critical fact, confirmed by reading `nerfstudio/engine/optimizers.py`'s `Optimizers.
__init__` line by line: `max_steps` is a literal default baked into each `ExponentialDecay
SchedulerConfig` dataclass. Nothing in `TrainerConfig`, `Trainer.setup_optimizers()`, or
`Optimizers.__init__` ever reads `config.max_num_iterations` and writes it into any per-
param scheduler's `max_steps`.** Our launcher only ever passes `--max-num-iterations
<value>`; it has never passed anything touching `--optimizers.means.scheduler.max-steps`.
So every arm in this entire series (Arm D onward) has trained under a **fixed 30,000-step
decay horizon**, regardless of the CLI step count.

**This answers the two questions that matter most before designing anything:**

1. **"Does `max_num_iterations` change the LR trajectory before step 16,000?"** No. The LR
   at any given step number is a pure function of `(step, warmup_steps, max_steps=30000,
   lr_init, lr_final)` — none of which depend on how long the run actually goes.
2. **"Will extending training silently change the early trajectory?"** No, and this is
   mechanically guaranteed, not just expected: **the LR value at step 6,000 is bit-identical
   whether the run stops at 16,000 or continues to 30,000**, because the schedule was never
   coupled to run length in the first place. A longer run doesn't change history, it just
   lets more of the *same*, already-fixed curve actually play out.

### Exact LR values (computed from the formula above, cross-checked against H5's own
logged `learning_rate/means` scalar — matched to 4 significant figures at every checked
step, confirming the formula is right)

| Step | `means` LR | % through the 30k schedule | `bilateral_grid` LR |
|---|---|---|---|
| 0 | 1.600e-4 | 0.0% | 0 (pre-warmup) |
| 6,000 | 6.370e-5 | 20.0% | 1.193e-3 |
| 11,000 | 2.957e-5 | 36.7% | 7.119e-4 |
| 14,000 | 1.865e-5 | 46.7% | 5.222e-4 |
| **16,000** | **1.372e-5** | **53.3%** | 4.247e-4 |
| 20,000 | 7.427e-6 | 66.7% | 2.810e-4 |
| 24,000 | 4.019e-6 | 80.0% | 1.859e-4 |
| 30,000 | 1.600e-6 (floor) | 100% | 1.000e-4 (floor) |

**H5 stopped at only 53.3% of its own position-optimizer's intended decay.** `means` LR at
step 16,000 is still 8.6× above its designed floor. This is direct, mechanical support for
"is there room for more sharpening" — the position optimizer was still moving at a
meaningfully non-trivial rate when training ended, not idling near its floor.

---

## 2. Convergence audit — H5's actual logs and checkpoints, not assumed

### Loss and train-PSNR (binned every 1,000 steps from the real `scalar-logs.json`)

Per-step values are noisy (one random image per step); binning is essential to see the
trend, so the raw per-step trace is not reported here.

| Step range | Mean train loss | Mean train PSNR (single-image, noisy) |
|---|---|---|
| 11,000–12,000 | 0.0694 | 21.45 |
| 12,000–13,000 | 0.0660 | 21.42 |
| 13,000–14,000 | 0.0610 | 20.87 |
| 14,000–15,000 | 0.0618 | 21.48 |
| **15,000–16,000** | **0.0581 (lowest of the run)** | **23.13 (a real jump, not noise — highest bin of the run)** |

**Detail was still visibly improving at step 15,999.** The final 1,000-step bin has both the
lowest mean loss and by far the highest mean train PSNR of the entire run — not a plateau.
(Train PSNR is single-image and not the selection metric this series uses for real
comparisons — Experiment 3's own rule — but as a *trend* indicator over 20 samples per bin
it is informative here.)

### Parameter movement (checkpoint hashes, real tensors)

`means`, `scales`, `opacities`, `quats`, and `features_dc` all differ between the 13,000 and
15,999 checkpoints — the model is still actively optimizing at the very end, not stuck.

### Gaussian scale-tail evolution across all 8 kept checkpoints (real, queried directly from
H5's actual checkpoint files, not the single final-step snapshot Experiment 5 already had)

| Step | Count | Max scale | p99 | p99.9 | Count > 0.08 | Count > 0.15 |
|---|---|---|---|---|---|---|
| 500 | 209,587 | 13.81 | 0.051 | 0.575 | 1,211 | 684 |
| 3,000 | 209,587 | 18.97 | 0.051 | 0.602 | 1,218 | 721 |
| 6,000 | 209,587 | 21.33 | 0.051 | 0.684 | 1,255 | 764 |
| **8,000** (first refine tick already fired) | 374,390 | **0.0796** | 0.026 | 0.055 | **0** | 0 |
| 9,000 | 456,880 | 0.088 | 0.024 | 0.052 | 11 | 0 |
| **11,000** (last refine event) | 507,199 | 0.085 | 0.024 | 0.051 | **3** | 0 |
| 13,000 (no pruning since 10,900) | 507,199 | 0.120 | 0.024 | 0.050 | 34 | 0 |
| **15,999** | 507,199 | **0.438** | 0.024 | 0.050 | **51** | 5 |

Two findings, both load-bearing for the design below:

- **Before the first refine tick (step ≤6,000), raw seed scales are wild** (max up to 21.3)
  — nothing has pruned them yet. The first densify/prune pass (first tick ≥6,300) is a
  dramatic, one-time cleanup: max scale collapses from double digits to 0.0796 and
  count-above-0.08 goes from a large uncleaned population to exactly **0**. The scale-control
  mechanism visibly does exactly what it's supposed to, the moment it gets to run.
- **After the last refine event (step 10,900), with no further pruning of any kind, the
  tail regrows continuously and does not plateau: 3 → 34 → 51 outliers above 0.08, and max
  scale climbs 0.085 → 0.120 → 0.438 across the recovery window — accelerating, not
  slowing.** This is the direct evidence for how late-prune timing should be chosen (§4).

---

## 3. Mechanism, source-inspected before deciding to reuse it

`gsplat/strategy/ops.py`'s `remove(params, optimizers, state, mask)`, fetched and read at
the exact pinned version: it slices every parameter tensor **and** every optimizer's Adam
moment buffers (`exp_avg`/`exp_avg_sq`) by the same kept-index selection, via
`_update_param_with_optimizer` — the identical function `DefaultStrategy._prune_gs` already
calls internally for its own scale-based prune. **No custom optimizer-state surgery is
needed; this experiment calls the same, already-installed, already-proven function
directly**, just once, outside gsplat's own refine cycle.

`exp6_late_prune_patch.py` wraps `SplatfactoModel.step_post_backward` (the model-level hook,
called every step *after* `DefaultStrategy.step_post_backward` has already run and already
returned early because `step >= refine_stop_iter`). At exactly one configured step, it
builds a boolean mask from the model's live `gauss_params["scales"]` (`exp(scales).max(-1) >
threshold`) and calls `gsplat.strategy.ops.remove()` directly. **`DefaultStrategy` is never
touched, `refine_stop_iter`/`stop_screen_size_at` are never read or modified, and no other
strategy behavior is reactivated** — the new hook lives entirely outside the strategy object.
Gated by `SPLAT_LAB_EXP6_LATE_PRUNE_STEP`; unset (as for every prior arm, and for J6) it does
nothing. Wired into `ns_train_wrap.py` as one small, additive, env-gated import, exactly
matching how the Experiment 3 opacity-reset patch was wired in.

---

## 4. The two arms (Option A, recommended — see §5 for two alternatives)

| | J6-Control | K6-Extended-Recovery |
|---|---|---|
| name | `ROOM213_J6_CONTROL` | `ROOM213_K6_EXTENDED_RECOVERY` |
| `cull_scale_thresh` | 0.08 (= H5, unchanged) | 0.08 (= H5, unchanged) |
| Total steps | **16,000** (bit-identical to H5) | **20,000** |
| Late prune | none | **one, at step 16,000, threshold 0.08** |
| Dataset | Same grouped-safe pool as Experiment 5, reused unchanged | same |
| Everything else | Frozen at H5's values, imported directly | same |

**Why prune exactly at step 16,000, not 14,000 as the candidate suggested:** the evidence in
§2 shows the tail growing continuously with no plateau through the entire recovery window,
and we have a *fully evidenced* state of that tail at exactly 15,999 (51 above 0.08, max
0.438) from H5's real checkpoint — pruning there captures the maximum accumulated regrowth
in one clean sweep using a known, not extrapolated, starting point, and leaves the full
4,000-step extension purely as dedicated recovery. Pruning earlier (e.g. 14,000) would still
leave 2,000 steps of *unpruned* regrowth (14,000→16,000) baked into the final checkpoint
under the original 16k budget — solved here by extending the budget, not by guessing an
earlier cutoff from data we'd have to extrapolate.

**Named limitation, not fixed here:** a single prune only guarantees a clean state at the
moment it fires. The same regrowth dynamic seen in 11,000–16,000 could partially reappear
during the 16,000–20,000 recovery window, just from a smaller, cleaner starting population.
Experiment 6's own scale-tail measurements at K6's final checkpoint will show directly
whether that happened and how much — reported, not assumed away.

**Resolved-config diff, actually run locally, not asserted:**

```json
{
  "ok": true,
  "differing_keys": ["cli_max_num_iterations", "late_prune_mechanism", "late_prune_step",
                      "late_prune_threshold", "max_steps"],
  "expected_differing_keys": ["cli_max_num_iterations", "late_prune_mechanism",
                               "late_prune_step", "late_prune_threshold", "max_steps"],
  "arm_j6": {"name": "ROOM213_J6_CONTROL", "max_steps": 16000, "late_prune_step": null},
  "arm_k6": {"name": "ROOM213_K6_EXTENDED_RECOVERY", "max_steps": 20000, "late_prune_step": 16000},
  "field_count": 55
}
```

Five fields differ, not one — by design, since the treatment here is a linked pair (a longer
budget *that exists to support* the late prune, not two independent variables). Every other
field, including `cull_scale_thresh` itself, `densify_grad_thresh`, refine start/stop,
opacity culling and reset, screen-size logic, SH degree, bilateral setting, resolution,
seed, and the dataset identity, is confirmed identical across 50 of the 55 compared fields.

**`ns-train` argv diff, both arms, actually built and diffed token-by-token:**

```
argv token differences (J6, K6): [('16000', '20000')]
```

Exactly one differing CLI token. The late prune itself is **not** a CLI flag — it's applied
via one environment variable (`SPLAT_LAB_EXP6_LATE_PRUNE_STEP=16000`), set only for K6,
which `train_arm_exp6.py` asserts fired (raises if the expected `EXP6_LATE_PRUNE` marker is
missing from K6's log) before treating that run as valid.

---

## 5. Three scheduling designs, since a "simple" extension needed checking

**Option A — recommended, described above.** 16,000 / 20,000 steps, prune at 16,000 (the
fully-evidenced H5 endpoint), 4,000 recovery steps. Smallest change that still gives
dedicated, uncontaminated recovery time. Estimated cost: J6 ≈ H5's own $2.79/56 min; K6 ≈
25% more steps ≈ $3.50/~70 min.

**Option B — larger budget, later prune.** 16,000 / 24,000 steps, prune at 20,000, 4,000
recovery steps after that. Lets more of the *ordinary* continued-training benefit (§2 showed
loss/PSNR still improving through 16,000; at step 20,000 `means` LR has reached 66.7% of its
decay, closer to convergence) accrue before the cleanup sweep — potentially a sharper base
model going into the prune, at the cost of a larger, less-evidenced tail to clean up (§2's
data doesn't extend past 15,999, so the tail size at 20,000 is an extrapolation, not a
measurement) and a larger budget: K6 ≈ 50% more steps than H5, ≈ $4.20/~85 min.

**Option C — budget-neutral, earlier prune, no extension.** Keep 16,000 steps for *both*
arms; move the prune to step 13,000 (the last point with real evidence before the tail's
growth phase) and use the 3,000 steps already inside the existing budget (13,000→16,000) as
recovery — no cost increase at all. This isolates "does moving the same total budget's
cleanup earlier help" from "does more total budget help," a cleaner single-variable test,
but does not test the §2 finding that loss/PSNR were still improving late in the *original*
16,000-step run, since it does not add any net optimization time.

**Recommendation: Option A.** It is grounded directly in the one checkpoint we actually have
full evidence for (H5's own step-15,999 state), adds a modest, bounded cost, and tests the
literal hypothesis in the brief — more budget, spent partly on cleanup and partly on
recovery — without asking me to extrapolate the tail's size at an unmeasured step.

---

## 6. Required evaluation plan

All of it reuses Experiment 5's already-built, already-verified machinery, pointed at
`experiments/room213-exp6/<ARM>/` instead of `room213-exp5` — no new dataset, no new split,
no new metric objects to validate (Experiment 5's evaluator sanity check already confirmed
the grouped-eval path matches nerfstudio's own metrics to noise-level precision).

- **Grouped panorama validation** — same 38 withheld panoramas / 608 views, same
  `exp5_grouped_eval.py` (real PSNR/SSIM/LPIPS via the same torchmetrics/pytorch_msssim
  objects), same per-panorama-as-primary-sample framing, same aggregate/median/p10/worst
  reporting, same distance-to-nearest-training-panorama correlation.
- **Historical eval for continuity** — `ns-eval` on nerfstudio's own internal split of the
  grouped-safe pool (4,868/540), same as G5/H5 — for continuity with Experiment 5 only, not
  claimed comparable to Experiment 3/4's historical numbers (different pool, as already
  established).
- **QA** — the same 4 frozen cameras (on-path, off-path, dollhouse, overhead), same
  renderer/resolution/no-per-arm-framing every prior arm used.
- **Panels** — `SOURCE | J6 (Control) | K6 (Extended) | ERROR`, same construction as
  Experiment 5's panels, for the same representative-panorama selection (best/median/p25/
  worst/near/mid/far-distance).
- **Fine-detail crops** — ceiling grid, door edges/hardware, chair slats, whiteboard edges/
  text, carpet texture, window frames, extracted at fixed resolution from the same on-path
  (and where visible, other QA-camera) renders for J6 vs K6 side by side, no AI sharpening.
  **Exact crop coordinates are deliberately not guessed here** — they need to be picked
  against real, full-resolution J6/K6 renders (or reused from H5's already-rendered
  `A_on_path` composite, which does contain a door, ceiling tiles, and a whiteboard) once
  those exist; the extraction mechanism itself (fixed-box crop from matching renders, same
  box for every arm) is designed and ready.
- **Reported for both arms:** held-out PSNR/SSIM/LPIPS (historical-style and grouped), full
  per-panorama grouped table, extreme-scale counts (>0.08/0.10/0.15), p99/p99.5/p99.9, max
  scale, final population, runtime/cost, and an explicit visual judgment — does detail
  *look* better, not just score differently — stated separately from the metrics, never
  substituted for them.

---

## 7. What is NOT done yet

- No training has run for Experiment 6. No checkpoint exists for J6 or K6.
- The grouped-validation results pass for Experiment 6 (mirroring `exp5_grouped_results`,
  pointed at `room213-exp6`) is designed but not yet coded — everything it needs
  (`exp5_grouped_eval.py`, the panorama split, the metric objects) already exists and is
  already validated; only the thin dispatch wrapper remains to write once a design (§5) is
  approved.
- Fine-detail-crop coordinates are not chosen (§6).

---

**EXPERIMENT 6 CONVERGENCE PREFLIGHT READY — WAITING FOR APPROVAL**
