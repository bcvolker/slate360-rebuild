# Room 213 Experiment 6 — longer convergence + late scale cleanup, REVISED preflight

**Status: preflight only. No training launched. No GPU spent on training. Waiting for
approval.** This revises the first draft: H5 is not relaunched, and the two new arms are
restructured so the strict causal pair (K6 vs L6) shares an identical budget and differs by
exactly one behavioral field. The scheduler/convergence audit from the first draft is
unchanged and carried forward below (already approved).

---

## 1. Scheduler audit (carried forward, approved) — read directly from pinned nerfstudio source

Every per-parameter LR scheduler's `max_steps` is a literal constant (30,000) in nerfstudio
1.1.5's `method_configs.py`, confirmed by reading `Optimizers.__init__` and
`Trainer.setup_optimizers()` line by line: **nothing anywhere reads `config.max_num_
iterations` and writes it into any per-param scheduler.** Formula cross-checked against
H5's own logged `learning_rate/means` scalar, matched to 4 significant figures.

| Step | `means` LR | % of 30k schedule | `bilateral_grid` LR |
|---|---|---|---|
| 0 | 1.600e-4 | 0.0% | 0 (pre-warmup) |
| 6,000 | 6.370e-5 | 20.0% | 1.193e-3 |
| 11,000 | 2.957e-5 | 36.7% | 7.119e-4 |
| 14,000 | 1.865e-5 | 46.7% | 5.222e-4 |
| **16,000** | **1.372e-5** | **53.3%** | 4.247e-4 |
| **18,000** | **1.005e-5** | **60.0%** | 3.477e-4 |
| **20,000** | **7.427e-6** | **66.7%** | 2.810e-4 |
| 30,000 | 1.600e-6 (floor) | 100% | 1.000e-4 (floor) |

**Re-confirmed for this revision, as requested:**

1. **LR at every step ≤15,999 is bit-identical whether the run stops at 16,000 or continues
   to 20,000.** The schedule is a pure function of `(step, warmup_steps, max_steps=30000,
   lr_init, lr_final)`; none of those inputs depend on how long the run actually goes.
   Extending `max_num_iterations` cannot retroactively change any earlier LR value, because
   it was never an input to the LR formula in the first place.
2. **K6 and L6 use identical optimizer/scheduler settings** — both resolve through the same
   `exp5.resolved_arm_config` → `exp3.resolved_arm_config(exp3.ARM_D, ...)` base, so every
   optimizer (Adam, same per-group LRs) and every scheduler (same `ExponentialDecay`
   configs) is imported from the same source, not retyped, for both arms.
3. **LR at 16k/18k/20k recorded above.**

H5 stopped at 53.3% of its own position-optimizer's decay (1.372e-5, still 8.6× above the
1.6e-6 floor). At 20,000 steps, K6/L6 reach 66.7% (7.427e-6, still 4.6× above floor) —
meaningfully further decayed, but still not near-converged, which matters for interpreting
outcome (3) in §8.

## 2. Convergence audit (carried forward, approved) — H5's real logs and checkpoints

- Binned train loss and single-image train PSNR both hit their best values of the whole run
  in H5's final 1,000-step window (loss 0.0581, lowest of the run; PSNR 23.13, highest bin) —
  no plateau visible at step 15,999.
- All six Gaussian tensors changed between the 13,000 and 15,999 checkpoints — still
  actively optimizing, not stuck.
- Scale tail, queried from all 8 of H5's real checkpoints: after the last refine event
  (11,000: 3 Gaussians above 0.08), the tail regrows continuously with no plateau through
  the unprotected recovery window — 34 at 13,000, 51 at 15,999, max scale climbing
  0.085→0.120→0.438. This is why the late prune is timed off a real, measured checkpoint
  rather than an extrapolated one (§4).

Full detail: `docs/ops/exp6-room213-review/{lr_trajectory.csv, h5_convergence_binned.csv,
h5_scale_tail_evolution.json}` (unchanged from the first draft).

---

## 3. Late-prune implementation audit

`gsplat/strategy/ops.py`'s `remove(params, optimizers, state, mask)`, read at the exact
pinned version: slices every parameter tensor **and** every optimizer's Adam moment buffers
by the same kept-index selection — the identical function `DefaultStrategy._prune_gs`
already calls internally. Called directly, once, with a scale-only mask
(`exp(gauss_params["scales"]).max(-1) > 0.08`) — **no growth, no opacity reset, no gradient
refinement, and no screen-size refinement are triggered by this call**, because `remove()`
only ever touches the parameters and optimizer state it's given; it has no code path that
invokes any other gsplat operation.

**Where it hooks in, and why `refine_stop_iter` is never reactivated:** the hook wraps
`SplatfactoModel.step_post_backward` (model level) — a different object entirely from
`DefaultStrategy.step_post_backward` (strategy level), which the existing Experiment 3 patch
already leaves untouched. At step ≥ `refine_stop_iter` (11,000), `DefaultStrategy.step_
post_backward` always returns immediately (`if step >= self.refine_stop_iter: return`) —
confirmed from the pinned gsplat source — so nothing about extending training or adding a
late prune can cause it to run any growth/reset/refinement logic again; that early return is
never bypassed, patched, or conditioned on anything Experiment 6 introduces.

**Checkpoint-ordering proof (why 16,000's own checkpoint already IS the post-prune state
for L6):** read directly from `nerfstudio/engine/trainer.py`'s `Trainer.train()` loop —
for a given step, the order is (1) `BEFORE_TRAIN_ITERATION` callbacks, (2) `train_iteration`
(forward/backward/optimizer/scheduler step), (3) `AFTER_TRAIN_ITERATION` callbacks — where
the late-prune hook fires — (4) *then*, later in the same step's block, `if step_check(step,
steps_per_save): self.save_checkpoint(step)`. Checkpoint-saving happens strictly after the
late-prune hook for the same step number, so the checkpoint nerfstudio writes for step
16,000 (a natural save point under the unchanged `steps_per_save=500`) already reflects L6's
state immediately after the prune. No custom out-of-cadence save logic was needed for that
point.

**`SPLAT_LAB_EXP6_LATE_PRUNE_STEP`/`_THRESH`** gate the hook; unset for K6 (and every prior
arm), it does nothing. `train_arm_exp6.py` asserts the `EXP6_LATE_PRUNE` marker actually
appears in L6's training log before treating that run as valid — if the hook silently failed
to fire, the run is marked `failed_invalid_harness`, not `needs_review`.

---

## 4. The two arms — K6 vs L6 is the strict causal pair; H5 is a reference, not relaunched

| | H5_16K_REFERENCE (existing, not relaunched) | K6-Extended-Control | L6-Extended-Scale-Prune |
|---|---|---|---|
| Steps | 16,000 (already trained) | **20,000** | **20,000** |
| Late prune | none | none | **one, at step 16,000, threshold 0.08** |
| `cull_scale_thresh` | 0.08 | 0.08 | 0.08 |
| Dataset | Grouped-safe pool (Exp5) | same | same |
| Everything else | — | Frozen at H5's values, imported directly | same |

H5's existing checkpoint, metrics, and evidence
(`docs/ops/exp5-room213-review/h5/`) stand as-is for **16k appearance quality, 16k
scale-tail state, and grouped-validation baseline** — no GPU spent reproducing it; there is
no technical reason it can't serve this role, since K6/L6 use the identical recipe and
dataset it already ran on.

### (1) H5 vs K6 — informational, not gated

```json
{
  "differing_keys": ["cli_max_num_iterations", "late_prune_mechanism",
                      "late_prune_threshold", "max_steps"],
  "behavioral_differences": ["cli_max_num_iterations", "max_steps"],
  "schema_only_differences": ["late_prune_mechanism", "late_prune_threshold"],
  "expected_behavioral_difference": ["max_steps", "cli_max_num_iterations"],
  "note": "informational only -- H5 vs K6 answers 'does more training help', not a controlled ablation; the strict comparison is K6 vs L6"
}
```

The only *behavioral* difference is step count, exactly as expected — `late_prune_mechanism`/
`late_prune_threshold` differ only because those are new bookkeeping fields Experiment 6
introduced (both are constants, always 0.08/the same description, whether or not the hook
actually fires) that H5's own resolved-config schema never had; not a real behavioral gap.
Everything else — `cull_scale_thresh`, densify threshold, refine timing, opacity behavior,
screen-size logic, SH degree, bilateral setting, resolution, seed, dataset identity —
confirmed identical.

### (2) K6 vs L6 — the strict, single-variable comparison

**Resolved-config diff, actually run locally, not asserted:**

```json
{
  "ok": true,
  "differing_keys": ["late_prune_step"],
  "expected_differing_keys": ["late_prune_step"],
  "arm_k6": {"name": "ROOM213_K6_EXTENDED_CONTROL", "late_prune_step": null},
  "arm_l6": {"name": "ROOM213_L6_EXTENDED_SCALE_PRUNE", "late_prune_step": 16000},
  "field_count": 67
}
```

**Exactly one differing field, out of 67 compared** — `late_prune_step`. Every other field,
including `cull_scale_thresh` and the total step count itself (both 20,000), is identical.

**`ns-train` argv diff, both arms, actually built and diffed token-by-token:**

```
argv token differences (K6, L6): []
```

**The training command line is bit-identical between K6 and L6.** The late prune is applied
entirely through one environment variable (`SPLAT_LAB_EXP6_LATE_PRUNE_STEP=16000`, set only
for L6), never a CLI flag — the cleanest diff of any arm pair in this series so far.

---

## 5. Required checkpoints and scale-tail tracking

| Tracking point | K6 source | L6 source |
|---|---|---|
| **15,999 / pre-late-prune state** | *(not independently produced — see note)* | *(not independently produced — see note)* |
| **Immediately after the late prune** | n/a (no prune) | **16,000's own checkpoint** (proof in §3) |
| **~18,000** | 18,000 (natural, `steps_per_save=500`) | 18,000 (natural) |
| **Final ~19,999** | 19,999 (forced final save, any run length) | 19,999 (forced final save) |

**Flagged design decision:** step 15,999 is not a multiple of the unchanged `steps_per_
save=500` cadence, and no positive stride starting from 0 can land on "N−1" for an arbitrary
N without either reducing the cadence to 1 (thousands of checkpoint files, clearly wrong)
or writing custom out-of-cadence checkpoint-save code inside the model-level hook (which
lacks a direct handle on the `Trainer`/`Pipeline` needed to replicate `save_checkpoint`'s
exact file format safely, and would be new, unverified low-level code with no way to test it
before a real run exists). **Recommendation: use H5's own real step-15,999 checkpoint as
this data point** — same recipe, same dataset, already exists, and is exactly what
`H5_16K_REFERENCE` was designated for. The one caveat, stated plainly: L6's *own* trajectory
up to step 15,999 will differ from H5's by ordinary GPU/floating-point run-to-run
nondeterminism (the same magnitude already seen between every "identical-recipe" arm pair
in this series, e.g. D4 vs the original Arm D), so this is a same-recipe substitute, not a
bit-identical stand-in. If an exact, independently-produced L6 step-15,999 checkpoint is
required instead, the alternative is reducing `steps_per_save` to 1 for a narrow window only
(e.g. steps 15,900–16,100) via a small, separate, easily-reviewable change — not built here,
since the recommendation above avoids needing it.

**At each of the four points, for both arms where produced**, report: count above
0.08/0.10/0.15, p99/p99.5/p99.9, max scale, total Gaussian count — the exact statistics
already validated and reused unmodified from Experiment 4/5's `exp4_results_gpu.py` /
`exp6_scale_evolution.py`. This will show directly whether K6 keeps regrowing outliers
through 18,000/19,999 (expected, per §2's trend), whether L6's prune actually removes them
at 16,000, and whether they partially return during the 16,000→19,999 recovery window —
reported as measured, not assumed.

---

## 6. Required evaluation

Reuses Experiment 5's already-validated machinery unmodified, pointed at
`experiments/room213-exp6/<ARM>/`:

- **Panorama-grouped validation** — same 38 withheld panoramas / 608 views, same real
  PSNR/SSIM/LPIPS objects (already sanity-checked against nerfstudio's own metrics in
  Experiment 5 to noise-level precision).
- **Historical eval for continuity** — `ns-eval` on the grouped-safe pool's own internal
  split (4,868/540), same convention as G5/H5/K6/L6.
- **Frozen QA** — on-path, off-path, dollhouse, overhead, same 4 cameras every arm in this
  series has used.
- **Fine-detail crops**, expanded per this revision: ceiling-grid intersections,
  door/frame/hardware, chair slats, whiteboard edges/visible writing, carpet texture,
  window frames, small tabletop objects. Produced as `SOURCE | H5-16K | K6-20K | L6-20K`
  where the same fixed camera view is available across all three trained arms (the on-path
  camera is the primary candidate; H5 already has this render). Exact crop *coordinates* are
  deliberately not guessed here — same reasoning as the first draft — they'll be picked
  against real, full-resolution renders once they exist, using a fixed-box extraction
  mechanism applied identically across all three models.
- **No AI sharpening**, anywhere in this comparison.
- **Explicit visual judgment reported separately from metrics**: does detail visibly recover
  more source structure, not just move a number.

---

## 7. Expected runtime and cost

Both new arms run 20,000 steps (25% more than H5's 16,000). By direct scaling of H5's own
measured rate (3,378.3 s / 16,000 steps = 0.2111 s/step): **≈4,222 s (≈70 min) and ≈$3.48
per arm**, both in parallel (K6 and L6 have no dependency on each other). L6's one-time
`ops.remove()` call adds negligible overhead (a single masked tensor-slice operation).
**Total training: ≈70–75 min wall time, ≈$7.00.** The grouped-validation/scale-tracking
results pass (4 checkpoints × 2 arms, more than Experiment 5's single-checkpoint version)
is estimated at **≈20–35 min, ≈$2–4**. **Combined: ≈90–110 minutes, ≈$9–11** — comparable to
Experiment 5's actual cost, not the larger two-extra-arm estimate the first draft implied,
since H5 is reused rather than reproduced.

---

## 8. Interpretation — reference only, not evaluated yet

The four scenarios in the approval message (K6>H5 & L6≥K6; K6>H5 & L6<K6; K6≈H5; L6 cleaner
but same sharpness) will be assessed against the real held-out metrics, scale-tail counts,
and — separately — the visual fine-detail crops once both arms complete. No outcome is
assumed here.

---

## 9. Excluded from this experiment (per instruction, unchanged)

No camera optimization, VGGT, MASt3R, MCMC, new projection, new X4 preprocessing, or new
capture data. No architectural changes of any kind.

## 10. What is NOT done yet

- No training has run for Experiment 6. No checkpoint exists for K6 or L6.
- The grouped-validation/scale-tracking results pass (mirroring `exp5_grouped_results`,
  extended to 4 checkpoints per arm) is designed but not yet coded.
- Fine-detail-crop coordinates are not chosen.

---

**EXPERIMENT 6 REVISED PREFLIGHT READY — WAITING FOR APPROVAL**
