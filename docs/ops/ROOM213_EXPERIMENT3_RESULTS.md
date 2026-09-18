# Room 213 — Experiment 3 Results

**Human visual verdict: UNREVIEWED**

Do not treat this document as selecting a winner. Arm C vs Arm D is a controlled comparison of one
variable (`densify_grad_thresh`) on the corrected trainer only. Evidence package:
`docs/ops/exp3-room213-review/`.

## Identity

| Field | Value |
|---|---|
| Protocol | `docs/ops/ROOM213_EXPERIMENT3_FINAL.md` (canonical, unmodified) |
| Launch branch / HEAD | `feature/recon-controlled-experiment-v1` @ `8c615886e38148e9dd98b39d6a79b786133e8ed8` |
| Modal app | `ap-pHzBJQDb2GYPTfueqryFcx` — https://modal.com/apps/bcvolker/main/ap-pHzBJQDb2GYPTfueqryFcx |
| Source dataset | Room 213 `cecc2763` (X4-only), 376 panos / 6,016 derived views, 1280 px |
| Recipe hash | `7e77af47399e6eb8cde7b722304f664ed3e4c8929950bbcbf3bdcc6465639668` |
| Portable mask hash | `2f5bc81ddb14a38b39ac2d688bfed1645b4a784b616b4aec071d41afb1cedb3e` |
| Pose hash | `f9b1bdb367ec5864f0c21c1cd77fd33b2a8fad6ca4a92a3821571db3ae6fa604` |
| Seed hash | `5c24bd98d41607d493a95167512d9489f48783a7dd781f4b31acb80a5bab4416` |
| QA pose hash | `ee51124640e16c92ea2c48cf420719b77ab9c8a02ea996dc4ed849045f3fb37a` |
| Trainer | `ns_train_wrap.py` → nerfstudio 1.1.5 splatfacto, gsplat 1.5.3 (CUDA ops), torch 2.5.1+cu124 |
| GPU | NVIDIA L40S |
| Seed / SH / bilateral | 42 / 3 / True |
| Max steps | 16,000 (final checkpoint step 15,999) |
| Start | step 0, no `--load-dir` (verified absent from both arms' resolved train command) |

## Preflight (laptop, pre-launch)

- Worktree created fresh at `C:\s360-recon-exp` from the exact expected HEAD (the primary checkout at
  `C:\s360` was mid-work on another branch and was not touched).
- `workers/recon-experiment/laptop_preflight.py` → `LAPTOP_CLOUD_PIPELINE_READY` (one environment fix:
  added the `modal` console-script directory to `PATH`; no protocol code was changed).
- All fifteen launch-checklist items were confirmed against live smoke-test output **and** the actual
  source (`exp3.py`, `exp3_strategy_patch.py`, `train_arm_exp3.py`, `ns_train_wrap.py`), not the
  documentation alone: Modal auth (`bcvolker`), canonical input + portable hashes match, Arm C/D diff
  `ok=true` isolating `densify_grad_thresh` only, no resume, `stop_screen_size_at=4000`, corrected
  opacity-reset patch, accumulator clear, no soft cap, 3.5M hard guard, retained checkpoints, held-out
  eval.

## Arms (exactly two, as specified)

| | Arm C — no-growth control | Arm D — delayed-growth candidate |
|---|---|---|
| name | `ROOM213_ARM_C_NO_GROWTH_CONTROL` | `ROOM213_ARM_D_DELAYED_GROWTH` |
| `densify_grad_thresh` | 1e9 (grow condition never fires) | 0.0008 |
| everything else | identical (resolved-config diff: `ok=true`, 61 fields compared, only `densify_grad_thresh` differs) | |

## Harness validity (both arms — runtime-asserted, not assumed)

Recorded in each arm's `exp3-strategy-patch.json`:

| Check | Arm C | Arm D |
|---|---|---|
| gsplat version | 1.5.3 | 1.5.3 |
| Stock buggy predicate found in source | true | true |
| Stock probe: `reset_opa` called at `step==reset_every`? | **false** (confirms the bug reproduces) | **false** |
| Patched probe: `reset_opa` called at `step==reset_every`? | **true** | **true** |
| Bound method is the patched version | true | true |
| `max_live_gaussians` guard configured | 3,500,000 | 3,500,000 |
| Accumulator-clear marker | `EXP3_REFINEMENT_ACCUMULATORS_CLEARED step=6017 refine_start_iter=6016 cleared=grad2d,count,radii` | same |
| Population guard tripped | none (`guard: null`) | none (`guard: null`) |
| Refinement events logged | 44 | 44 |

Both arms exited `0`, `harness_valid: true`, `abort: null`. No auto-resume occurred or was configured.

## Gaussian population

| | Arm C | Arm D |
|---|---|---|
| Seed (step 0) | 209,587 | 209,587 |
| Step 6,300 (first refine event) | after-prune 121,334 (no growth; `n_dupli=0 n_split=0`) | after-grow 221,354 / after-prune 133,236 |
| Peak (any point) | 209,587 (grow never fires) | 496,968 (after-grow, step ≈11,000 window) |
| Step 8,000 | 119,456 | 379,221 |
| Step 9,000 | 118,889 | 458,789 |
| Step 11,000 (last refine event, `refine_stop_iter`) | 99,951 | 496,429 |
| Step 15,999 (final) | 99,951 | 496,429 |

Both arms stayed far below the 3,500,000 hard guard and nowhere near Experiment 2 Arm B's 7,499,239
runaway. Arm C's count *fell* below the SfM seed — with growth disabled, only pruning at
`cull_alpha_thresh=0.005` (now reachable because the opacity-reset fix actually resets opacity to 0.01
every 3,000 steps) removes Gaussians; this is the corrected-trainer prune cycle acting on an unchanging
population, not a bug. Arm D grew under gradient-driven densification, then held flat from step 11,000
(`refine_stop_iter`) through 15,999 — the strategy returns early past that step, so both arms spend their
final 5,000 steps in pure optimization with no further grow or prune.

## Held-out evaluation (`ns-eval`, identical 601-image split, never used in training)

| | Arm C @ 8,000 | Arm D @ 8,000 | Arm C @ 15,999 | Arm D @ 15,999 |
|---|---|---|---|---|
| PSNR | 20.53 ± 2.03 | 20.39 ± 1.97 | 21.20 ± 2.19 | **21.81 ± 2.42** |
| SSIM | 0.814 ± 0.063 | 0.812 ± 0.064 | 0.823 ± 0.062 | **0.834 ± 0.062** |
| LPIPS (lower is better) | 0.473 ± 0.071 | 0.458 ± 0.073 | 0.443 ± 0.073 | **0.382 ± 0.075** |

Held-out PSNR/SSIM/LPIPS at step 15,999 favor Arm D over Arm C by all three metrics. This is an
aggregate scalar comparison only — it is not a visual verdict and does not select a winner. See
`compare_arms_exp3.py`'s note: single-image train PSNR is never a selection metric; these are held-out
aggregates from `ns-eval`, which is the metric class the protocol designates for comparison.

## Opacity fractions (sigmoid of checkpoint logits; export-independent)

| Threshold | Arm C @ 15,999 (n=99,951) | Arm D @ 15,999 (n=496,429) |
|---|---|---|
| < 0.005 | 0.0094 | 0.0485 |
| < 0.01 | 0.0183 | 0.0895 |
| < 0.05 | 0.0809 | 0.2684 |
| < 0.1 | 0.1363 | 0.3787 |
| ≥ 0.5 | 0.6694 | 0.3666 |

Both arms' opacity histograms show the reset-then-prune cycle working as designed: near-total mass at
the reset value (0.01) immediately after each of the three resets (3,000 / 6,000 / 9,000), then
redistribution as training continues past `refine_stop_iter` (11,000).

## Runtime and cost

| | Arm C | Arm D |
|---|---|---|
| Elapsed (train) | 3,526.3 s (58.8 min) | 4,109.2 s (68.5 min) |
| Cost | $2.9071 | $3.3876 |
| Guard tripped | none | none |

Both arms ran in parallel on separate L40S containers. **Total cost: $6.2947.** No guard (150 min
runtime, $15 cost, 3.5M population) was approached by either arm.

## Checkpoints

Kept steps (both arms, matching the protocol): 500, 3000, 6000, 8000, 9000, 11000, 13000, 15999.
`--save-only-latest-checkpoint False` confirmed in the resolved config; all other intermediate
checkpoints were swept as specified. Per-tensor SHA-256 hashes for every kept checkpoint are in
`docs/ops/exp3-room213-review/arm-{c,d}/checkpoint-hashes.json`. Tensor hashes change step-to-step
within each arm (the live-optimizer signature; the historical resume freeze produced bit-identical
hashes across checkpoints, which is not the case here). Note for the record: at the shared step-500
checkpoint (before any refine event and therefore identical recipe in both arms), `means` and
`features_dc` hashes differ between Arm C and Arm D while `features_rest` matches — expected GPU
floating-point non-determinism between separate training processes, not a recipe divergence; no
refinement event occurs before step 6,300 in either arm.

## Matched visual QA

Eight side-by-side composites (Arm C left | Arm D right), frozen 4-camera set (`qa_pose_hash
ee511246…`), same rasterizer/resolution/transform, no per-arm auto-framing, at steps 8,000 and 15,999:

- `comparison/step-8000/{A_on_path,B_off_path,C_dollhouse,D_overhead}.png`
- `comparison/step-15999/{A_on_path,B_off_path,C_dollhouse,D_overhead}.png`

Labels are arm names only. **No BETTER/WORSE/SAME label has been applied.**
`HUMAN_VISUAL_VERDICT = UNREVIEWED` in every manifest and in `comparison/comparison.json`.

## What this experiment did and did not show

- The corrected trainer works as specified: opacity reset actually fires (verified by runtime probe,
  not just by the source diff), accumulators are cleared before the first post-warmup refinement
  decision, and the 3.5M hard population guard was armed and never needed.
- Under this corrected trainer, delayed gradient-driven growth (Arm D) produced a bounded population
  (peak 496,968, well under both the 2M level Experiment 2's uncorrected trainer never approached
  safely and the 3.5M guard) and higher held-out PSNR/SSIM/LPIPS than the no-growth control at the
  16,000-step budget.
- This is **not** a production recommendation. 16,000 steps is 2.95 training cycles over 5,415 train
  images; neither arm is a 30k-step production run. The result is scoped to the corrected trainer at
  this budget on this scene.
- No human has looked at the renders. The held-out metric advantage for Arm D is recorded as data, not
  as a conclusion about visual quality.

## Evidence package

`docs/ops/exp3-room213-review/`:

- `arm-c/`, `arm-d/`: `result-manifest.json`, `resolved-config.json`, `eval-summary.json`,
  `opacity-stats.json`, `checkpoint-hashes.json`, `refine-log.json`, `exp3-strategy-patch.json`
- `comparison/`: `comparison.json` + the eight side-by-side PNGs above

Excluded by design, per protocol: checkpoints, PLY/SPZ exports, source media, secrets. The full
evidence set (including checkpoints and per-step logs) remains on the Modal volume
`slate360-recon-experiments` under `experiments/room213-exp3/<ARM_NAME>/`.

---

`HUMAN_VISUAL_VERDICT = UNREVIEWED`. No winner has been chosen. Human visual review of the composites
in `docs/ops/exp3-room213-review/comparison/` is the next step.
