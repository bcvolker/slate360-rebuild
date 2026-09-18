# Room 213 — Experiment 3 (FINAL, canonical protocol)

**Status:** `EXPERIMENT 3 CANONICAL PREFLIGHT READY — WAITING FOR LAUNCH APPROVAL`
**HUMAN_VISUAL_VERDICT:** `UNREVIEWED`
**No training has been launched for Experiment 3.**

This document supersedes:

- the original `ROOM213_EXPERIMENT3_PREFLIGHT.md` (not present in this worktree; superseded by name),
- any earlier draft that used `stop_screen_size_at=11000`,
- any earlier draft that used a 2M soft population cap.

Only this file, `qa/exp3-frozen-recipe.json`, `qa/exp3-preflight/*` and the code under
`workers/recon-experiment/` + `workers/modal/recon-experiment/worker.py` define Experiment 3.

## 0. Why Experiment 3 exists (evidence, not narrative)

- **Historical Room 213 (`cecc2763`) never trained past step 2,250.** All six Gaussian tensors are
  bit-identical in the step-2250, step-6000 and step-30000 checkpoints. nerfstudio 1.1.5 binds Adam to
  the seed parameters, then the checkpoint loader replaces the live parameters without rebinding; only a
  gsplat grow/prune step rebinds, and refinement was dead after the resume (`stop_split_at` 2050 / 1).
  See `qa/historical-ckpt-optimizer-bind.json`, `qa/exp2-integrity-check.json`.
- **Experiment 2** (`docs/ops/exp2-room213-review/EXPERIMENT2_RESULTS.md`, Modal run
  `ap-F6K6wtSXXOOqjuIEatCXXs`) trained both arms from step 0 and proved the harness updates parameters.
  It varied `refine_stop_iter` only (500 vs 4300) at `densify_grad_thresh=0.0002` and 8,000 steps.
  Arm B grew 209,587 → 7,499,239 Gaussians by step 4,300 (train-view PSNR fell 17.3 → 14.5 dB while
  growing); Arm A stayed at the seed (20.1–20.7 dB). Human verdict remains UNREVIEWED.
- **Stock gsplat 1.5.3 never resets opacity** (`step % reset_every == 0 & step > 0` is always False,
  upstream fix PR #776). Experiment 2 therefore ran without any opacity reset and with
  `cull_alpha_thresh=0.001`, i.e. with no mechanism that removes low-opacity Gaussians.

Experiment 3 asks one question on a corrected trainer: **with opacity resets working, pruning at 0.005,
and refinement delayed until after a full stabilisation cycle, does delayed gradient-driven growth at
the nerfstudio-tuned threshold (0.0008, absgrad) change the held-out result versus no growth at all?**

## 1. Arms (exactly two)

| | ARM C — corrected no-growth control | ARM D — corrected delayed-growth candidate |
|---|---|---|
| name | `ROOM213_ARM_C_NO_GROWTH_CONTROL` | `ROOM213_ARM_D_DELAYED_GROWTH` |
| `densify_grad_thresh` | **1e9** (grow condition can never fire) | **0.0008** |
| everything else | identical | identical |

Shared, both arms (resolved values, see `qa/exp3-preflight/arm-C-resolved.json` / `arm-D-resolved.json`):

| Field | Value |
|---|---|
| start | step 0, **no resume of any kind** (`--load-dir` never passed) |
| total steps | 16,000 (`--max-num-iterations 16000`, final checkpoint step 15999) |
| trainer | `ns_train_wrap.py` → nerfstudio **1.1.5** splatfacto, gsplat **1.5.3** (CUDA ops asserted), torch 2.5.1+cu124 |
| source | Experiment 2 frozen Room 213 inputs: 376 panos, 6016 derived views at 1280 px, masks, poses, 209,587-point seed, QA cameras (hashes below) |
| SH / bilateral / scale-reg | SH 3 (interval 16000//30 = 533), bilateral grid on, scale regularization on |
| `use_absgrad` | True |
| `refine_start_iter` (`--pipeline.model.warmup-length`) | **6016** — fixed stabilisation delay covering at least one full training cycle (5,415 train images → 1.111 cycles) |
| `refine_stop_iter` (`--pipeline.model.stop-split-at`) | **11000** (absolute) |
| `pause_refine_after_reset` | **250** (wrapper clamp; splatfacto requests 5,515 and the clamp is recorded in `wrap-status.json`) |
| `refine_every` / `reset_alpha_every` | 100 / 30 → `reset_every` 3000 |
| `cull_alpha_thresh` (`prune_opa`) | **0.005** (reset value 0.01) |
| `cull_scale_thresh` | 0.15 (unchanged from Experiment 2) |
| `stop_screen_size_at` | **4000** (splatfacto default, passed explicitly; < 6016 so screen-size splitting is inactive before refinement can act) |
| opacity-reset predicate | corrected in place (PR #776 equivalent), asserted at runtime — §3 |
| soft population cap | **none** |
| hard failure guard | **3,500,000 live Gaussians** — §3 |
| `--machine.seed` | 42 |
| checkpoints | every 500 steps, `--save-only-latest-checkpoint False`; kept set §5 |
| eval | ns-eval on the held-out split at steps 8000 and 15999 — §5 |
| GPU | Modal L40S, 8 CPU, 80 GiB; `$2.96784/h` (posted rates) |

Derived schedule (identical in both arms): opacity resets at steps **3000, 6000, 9000** (none at 12000 or
15000: the strategy returns early once `step >= 11000`); accumulator clear at step **6017**; refinement
events **6300 … 10900** every 100 steps (44 events; 6100/6200 skipped by the post-reset pause).
Arm C performs *pruning only* at those events; Arm D performs grow + prune.

## 2. Preflight diff (Phase 9)

`qa/exp3-preflight/preflight-diff.json`:

```
ok: true
differing_keys: ["densify_grad_thresh"]   (61 resolved fields compared; arm_name excluded)
arm_c densify_grad_thresh = 1000000000.0
arm_d densify_grad_thresh = 0.0008
```

Full field-by-field table: `qa/exp3-preflight/preflight-table.md`. Exact ns-train argv per arm:
`qa/exp3-preflight/train-cmds.json` (the two argv lists differ only in the token after
`--pipeline.model.densify-grad-thresh`). The Modal launcher re-runs this diff and refuses to spawn if
any other field differs. **If any other field differs at launch: STOP.**

## 3. Harness changes required for validity (Phase 4)

All in `workers/recon-experiment/exp3_strategy_patch.py`, applied by `ns_train_wrap.py` only when
`SPLAT_LAB_EXP3=1` (Lab jobs unaffected). The patch rewrites the *source* of
`DefaultStrategy.step_post_backward`, compiles it into the gsplat module namespace and binds it to the
class, so the stock control flow (including the `step >= refine_stop_iter` early return) is preserved.
There is no outer wrapper.

1. **Opacity reset.** `if step % self.reset_every == 0 & step > 0:` → `... == 0 and step > 0:`
   (gsplat PR #776 "Fix bit-wise 'and' preventing opacity reset", merged 2025-08-22, commit 6e8c837).
   Runtime assertions before training starts: gsplat is exactly 1.5.3; the stock source contains the
   buggy predicate exactly once; a CPU probe of the **stock** method at `step == reset_every` does **not**
   call `reset_opa`; after patching, the bound method's source contains the corrected predicate and the
   same probe calls `reset_opa` exactly once. Stock/patched source SHA-256 and the bound code-object
   SHA-256 are written to `<arm>/exp3-strategy-patch.json` and printed as `EXP3_STRATEGY_PATCH`. The
   runner marks an arm `failed_invalid_harness` if that record is missing or either probe is wrong.
2. **Screen-size splitting.** `stop_screen_size_at=4000` (not 11000). Inactive before step 6016.
3. **Accumulator clear.** At `step == refine_start_iter + 1` (= 6017), before `_update_state` runs for
   that step, `grad2d`, `count` and `radii` are zeroed once and
   `EXP3_REFINEMENT_ACCUMULATORS_CLEARED step=6017 …` is printed. Warm-up statistics therefore never
   feed a refinement decision.
4. **Population guard.** No 2M skip-grow cap, no random growth subsampling, no tensor truncation. Live
   count is recorded before grow, after grow and after prune at every refinement event
   (`EXP3_REFINE …` lines → `<arm>/refine-log.json`). If the live count exceeds **3,500,000** after
   grow or prune, `EXP3_POPULATION_GUARD_TRIPPED {…}` is printed and `RuntimeError` is raised: ns-train
   exits non-zero, checkpoints and logs stay on disk and are copied to the volume, the arm is marked
   `failed_population_guard`, and it is **not resumed**. A 10-second heartbeat that reads the TensorBoard
   `gaussian_count` is kept as a backstop with the same limit.

## 4. Dataset / sampler (Phase 5, verified with nerfstudio 1.1.5's own split function)

| Item | Value |
|---|---|
| total derived images | **6016** (376 panos × 16 views) |
| actual train images | **5415** (`ceil(6016 × 0.9)`) |
| actual eval images | **601** (held out by `train_split_fraction=0.9`, evenly spaced after sorting frames by path) |
| sampler | `FullImageDatamanager`, `train_cameras_sampling_strategy=random`: per-epoch shuffle **without replacement**, `random.Random(train_cameras_sampling_seed=42)`; one full image per optimizer step |
| ordered train-image SHA-256 | `1bb881c0bd18a735cf7e72a805639de1901b73bf96a63c94cf3a8a1bf53547d6` |
| ordered eval-image SHA-256 | `2b5422fd94c0cca9f18a3cdbedf8076ee5b930dedefd0de30187424ff8abeb76` |
| hash rule | sha256 of the `file_path` strings in nerfstudio order joined by `\n` (`exp3.dataset_split`) |

`refine_start_iter=6016` is a **fixed stabilisation delay covering at least one full training cycle**
(6016 / 5415 = 1.111 cycles), not "exactly one pass". The runner recomputes the split from the volume's
`transforms.json` at start and refuses to train if counts or hashes differ (`input-identity.json`).

Frozen input identity (must match on the volume): pose `f9b1bdb3…6fa604`, seed `5c24bd98…ab4416`,
masks `2f5bc81d…cedb3e` (portable hash, corrected 2026-09-18 — see below), source `1753a05b…35c99`,
QA cameras `ee511246…3fb37a` (`qa/exp3-frozen-recipe.json`, recipe hash
`7e77af47399e6eb8cde7b722304f664ed3e4c8929950bbcbf3bdcc6465639668`).

> **Portable-hash correction, 2026-09-18 (data unchanged):** the mask hash originally recorded here
> (`653f881f…` recipe, mask `20daa8e2…8a2b6`) was a path-dependent bookkeeping artifact —
> `sha256_dir` embedded each file's absolute filesystem path, so the identical 6,016-mask tree hashed
> differently on the desktop vs. the Modal volume vs. the immutable tar despite being byte-for-byte
> and pixel-for-pixel identical everywhere. `workers/recon-experiment/hashes.py` now hashes
> root-relative paths only; all three copies converge on `2f5bc81d…cedb3e`, confirmed live against
> Modal (`qa/exp3-portable-hash-audit.json`, `docs/ops/ROOM213_MASK_PROVENANCE_2026-09-17.md`). No
> mask, pose, seed, or QA-camera byte changed. `recipe.mask_hash_legacy_path_dependent` preserves the
> old value on record.

## 5. Checkpoints, evaluation, opacity, visual QA (Phases 6–8)

- **Checkpoints kept:** 500, 3000, 6000, 8000, 9000, 11000, 13000, 15999. Others are swept once a newer
  one exists (never the newest). Each kept checkpoint's `means`, `scales`, `quats`, `opacities`,
  `features_dc`, `features_rest` are SHA-256 hashed → `<arm>/checkpoint-hashes.json`.
- **Evaluation:** `ns-eval` on the identical 601-image held-out split at **8000** and **15999**
  (config pinned to the exact checkpoint via `load_step`). Reports mean ± std **PSNR, SSIM, LPIPS**
  (all three already produced by splatfacto's eval path; no recipe change) →
  `<arm>/eval/metrics-<step>.json`, `<arm>/eval-summary.json`. **Single-image train PSNR is not a
  selection metric.** Note: the bilateral grid is a per-train-image transform and is not applied to
  eval renders; this holds equally for both arms.
- **Opacity analysis:** sigmoid of the checkpoint opacity logits for every kept checkpoint, fractions
  below 0.001 / 0.005 / 0.01 / 0.05 / 0.1, quantiles, non-finite count → `<arm>/opacity-stats.json`.
  PLY opacity fields are not used (ns-export drops Gaussians below 1/255).
- **Visual QA:** the frozen 4-camera set `qa/visual-poses.json` (hash `ee511246…`) rendered with the
  same gsplat rasterizer, resolution, transform and no per-arm framing, from PLY exports at 8000 and
  15999: on-path, off-path, dollhouse/elevated oblique, overhead. `compare_arms_exp3.py` builds
  Arm C (left) | Arm D (right) composites. Labels are arm names only. No better/worse labels.
  `HUMAN_VISUAL_VERDICT=UNREVIEWED` until Brian reviews.

## 6. Launch (human approval required) and reproducibility from a fresh machine

Prerequisites on the launching machine: this branch checked out, Modal CLI authenticated
(`modal profile current` → `bcvolker`), the frozen inputs on the Modal volume
`slate360-recon-experiments` at `inputs/cecc2763.tar` (already staged; a fresh volume needs
`modal volume put slate360-recon-experiments <cecc2763.tar> inputs/cecc2763.tar`, tar containing
`views/{images,masks,transforms.json}` and `sfm/points.ply` with the hashes in §4).
No R2 or other secret is required for training; the Modal secret `slate360-twin-worker` is only
attached for the Experiment 1 render path.

```bash
cd C:\s360-recon-exp && PYTHONIOENCODING=utf-8 modal run workers/modal/recon-experiment/worker.py --phase exp3
```

The entrypoint re-checks the preflight diff, stages the views, spawns **both** arms on L40S in
parallel, and prints both result manifests (`status: needs_review`). Durable outputs land on the volume
under `experiments/room213-exp3/<ARM>/` (checkpoints, logs, eval JSON, opacity stats, QA PNGs,
effective config, result manifest). Pull with `modal volume get slate360-recon-experiments
experiments/room213-exp3 qa/exp3-run`.

**Expected cost / runtime** (from Experiment 2: 8,000 steps took 29.3 min at 209k Gaussians and
40.3 min at ≤7.5M; $2.96784/h):

| Arm | Train | Eval ×2 + export/render ×2 | Estimated wall | Estimated cost |
|---|---|---|---|---|
| C (no growth, 209,587 Gaussians) | ~55–60 min | ~8 min | ~65 min | ~$3.3 |
| D (≤3.5M Gaussians) | ~60–90 min | ~10 min | ~75–100 min | ~$3.7–5.0 |
| **Total** | | | both arms in parallel, ~100 min wall | **~$7–8.5** |

Guards: 150 min runtime per arm, $15 per arm, 3.5M live Gaussians. Modal function timeout 170 min.

## 7. Known properties to keep in mind when reading results (not variables)

- Both arms prune at refinement events 6300 and 9300, i.e. 300 steps after the resets at 6000 and 9000.
  Gaussians still below 0.005 opacity 300 steps after a reset to 0.01 are removed in **both** arms.
- Arm D may trip the 3.5M guard. Experiment 2 at 0.0002 grew ~190k Gaussians per refinement event; the
  rate at 0.0008 on this data is unknown. A tripped guard is a recorded failure of that arm, not a
  reason to resume or to add a soft cap.
- 16,000 steps is 2.95 training cycles. Neither arm is a 30k production run; conclusions are about the
  corrected trainer at this budget.
- SPZ conversion is deliberately not part of Experiment 3 (Experiment 1 cleared SPZ; the 2.7.1 CLI flag
  mismatch that failed in Experiment 2 is irrelevant here). PLY exports are used for QA renders.

## 8. What is committed

- Experiment infrastructure that produced Experiment 2 and now defines Experiment 3:
  `workers/recon-experiment/**` (runner, harness, hashes, poses, render, tests),
  `workers/modal/recon-experiment/worker.py`, `workers/local/splat-lab/ns_train_wrap.py`,
  `workers/local/splat-lab/trainer_control.py`, `.gitignore` (excludes checkpoints/renders/experiments).
- Evidence and frozen configs (no secrets): `qa/exp2-frozen-recipe.json`, `qa/exp2-integrity-check.json`,
  `qa/exp2-run/**/*.json`, `qa/exp3-frozen-recipe.json`, `qa/exp3-preflight/*`, `qa/visual-poses.json`,
  `qa/frozen/*.json`, `qa/historical-ckpt-*.json`, `qa/result-manifest.json`.
- Not committed by design: checkpoints, PLY/SPZ, source images/panos, QA PNGs outside the review
  package, Lab product-side stage edits (`stages/*.py`, `config.py`), the unused Trigger dispatch stub.

**No training was launched while preparing this protocol.**
