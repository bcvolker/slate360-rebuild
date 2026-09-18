# Experiment 3 — Revised consensus (do not launch original preflight unchanged)

**Written:** 2026-09-17 (Pacific)  
**Author:** Grok Bot (Hans) — second opinion synthesizing Astra + Fable reviews of `ROOM213_EXPERIMENT3_PREFLIGHT.md`, plus Experiment 2 visual/review package  
**Audience:** Brian’s desktop Cursor chat (`C:\s360`)  
**Scope:** Docs only. This file does **not** launch training, does **not** edit workers/train code, and does **not** touch Experiment 2 artifacts.

Related (not on this docs branch): Exp 2 review package lives on `feature/recon-controlled-experiment-v1` at `docs/ops/exp2-room213-review/`.

---

## Verdict

Do **not** approve Experiment 3 as written in the first preflight. Apply the corrections below, then re-issue preflight, then launch.

The first preflight mixed good science (from-scratch, absgrad + 0.0008, #776, 16k budget, hard abort) with two experiment-killing knobs: **`stop_screen_size_at=11000`** (Arm B’s gradient-free screen-split growth vector) and a **soft 2M skip-grow cap** that changes the densify policy mid-run. It also lacked a matched no-growth control (Arm C) and Fable’s accumulator-zero at `refine_start_iter`.

Desktop Cursor must treat the original preflight as **blocked**.

---

## Common ground (Astra ∩ Fable ∩ Exp2 visual review)

- **From-scratch.** No resume until a dedicated continuation test passes. Historical Room 213 (`step-2250` / `6000` / `30000`) is a frozen optimizer, not a 30k model. Exp 2 already proved from-scratch tensors actually change.
- **`densify_grad_thresh=0.0008` with absgrad.** Lab `0.0002` + absgrad was harmful (gsplat docs: if `absgrad=True`, raise `grow_grad2d` to ~0.0008; that pairing is Splatfacto’s). Exp 2 Arm B’s 7.50M count used the Lab 0.0002 pairing.
- **Fix gsplat 1.5.3 opacity reset (#776):** replace the predicate `&` with `and`. Do **not** outer-wrap `DefaultStrategy.step` / reset in a way that can fire during recovery. Stock 1.5.3 never resets (`step % reset_every == 0 & step > 0` is dead code because `&` binds tighter than `==` / `>`). See [PR #776](https://github.com/nerfstudio-project/gsplat/pull/776) / [issue #797](https://github.com/nerfstudio-project/gsplat/issues/797).
- **`stop_screen_size_at` must remain 4000 (default).** Raising it to 11000 enables gradient-free screen-space splits — that was the Arm B growth vector, not a “keep densify longer” switch. Delete the override.
- **`save_only_latest_checkpoint=False`.** Keep intermediate checkpoints. Hash the step-15999 tensors.
- **Evaluate with fixed / held-out renders + `ns-eval`.** Do **not** crown winners from train-view PSNR at step 7950 vs 16k. Exp 2 Arm A train PSNR 20.77 vs Arm B 15.37 at step 7950 is not a client-visible verdict.
- **Preserve seed 42, SH interval 266** (or freeze SH explicitly), **same source / masks / poses / QA cameras** as Exp 2 (`source_hash`, `mask_hash`, `pose_hash`, `qa_pose_hash`).
- **Hard abort ~3.5M is OK.** Soft 2M skip-grow is **contested** (Astra: omit for Exp 3 science; Fable: optional later via `_grow_gs` wrap returning `(0,0)`). Consensus pick: **omit**.

---

## Required recipe corrections (table)

| Item | First preflight | Revised |
|---|---|---|
| `stop_screen_size_at` | 11000 | **4000** (delete override; keep gsplat / Splatfacto default) |
| `densify_grad_thresh` | 0.0008 | keep (with absgrad) |
| `refine_start` / `stop` / `total` | 6016 / 11000 / 16000 | keep as schedule, but document `train_count≈5415`; warmup = **≥1 train cycle** (6016 ≥ 5415) |
| Opacity fix | #776 | **replace method** + assert 1.5.3 predicate was bitwise `&`; document resets at **3k / 6k / 9k only**; recovery (11k–16k) has **no** reset |
| Soft 2M cap | skip-grow | **Omit for Exp 3 science** (Astra). Optional later via `_grow_gs` wrap returning `(0,0)` (Fable) — **pick omit** |
| Hard abort | 3.5M | keep |
| `cull_alpha` | 0.005 | keep |
| Accumulator zero | missing | **zero `grad2d` / `count` / `radii` at `refine_start_iter`** (Fable) so the first densify is not stale warmup grads |
| Matched control | missing | Add **Arm C**: same 16k budget, `densify_grad_thresh=1e9` (growth off), reset + prune **on** — for fair PSNR vs grown arms |
| Checkpoint | incomplete | `save_only_latest_checkpoint=False`; hash step-**15999** (means / scales / quats / opacities / features_dc / features_rest) |

### Opacity-fix rule (do not mis-apply #776)

Stock gsplat **1.5.3** `DefaultStrategy`:

```python
if step % self.reset_every == 0 & step > 0:  # NEVER true; operator precedence
```

Correct patch (replace the operator, assert the old predicate):

```python
if step % self.reset_every == 0 and step > 0:
```

**Forbidden:** wrapping the outer `step()` / reset so opacity clamp can run after `refine_stop_iter`. For a 16k run with `reset_every=3000` and `refine_stop_iter=11000`, logged resets must be **3000, 6000, 9000 only**. Steps 12000 and 15000 sit in recovery — **no reset**.

After patch: assert the installed 1.5.3 source still contains the bitwise `&` *before* replace, then assert `and` *after*. Pin / SHA the patched file in the re-issued preflight.

### Why `stop_screen_size_at=11000` is disallowed

Screen-size split (`max_2Dsize > split_screen_size`) is gated by `step < stop_screen_size_at` and does **not** require a high positional gradient. Extending that gate to 11000 re-enables the same unbounded-count path Exp 2 Arm B demonstrated (seed 209,587 → 7,499,239 by `stop_split_at=4300`, with Lab `densify_grad_thresh=0.0002`). Exp 3 is testing **gradient densify + working reset + prune** on a 16k budget, not replaying screen-split growth.

### Arm C (required matched control)

Without Arm C, a 16k grown run cannot be compared fairly to “more steps on a frozen count.” Arm C uses the **same** 16k budget, seed, data, reset, and prune, with growth disabled via `densify_grad_thresh=1e9` (not via a short `refine_stop_iter`, which would also skip prune/reset scheduling). That isolates whether growth under the revised recipe beats longer optimization of the SfM seed.

---

## Resume (deferred)

Do **not** resume Exp 3. Do not resume historical Room 213. Do not resume Exp 2 arms.

When a continuation test is eventually written (not this experiment):

- Rebind Adam state via **param object migration** (identity: `optimizer.param_groups[*]["params"][0] is gauss_params[name]`), plus `strategy_state`, plus sampler / RNG.
- `stop_split_at` / `refine_stop_iter` / `stop_screen_size_at` are **absolute global steps**, never “steps since this launch.”
- Do **not** clamp an absolute stop into remaining `run_iters` (that silently shortens densify).
- Densify/prune already rebinds through gsplat `_update_param_with_optimizer`; checkpoint **load** does not (nerfstudio `splatfacto.load_state_dict` allocates new `nn.Parameter` objects). That is why historical `step-2250`/`6000`/`30000` Gaussian tensors were bit-identical.

**Exp 3 enforcement:** no `--load-dir`, no checkpoint resume, start at step 0. Preflight must assert the **resolved** config (not the requested YAML) has no load path.

---

## Success criteria

- **Frozen QA views A / B / C / D** vs Exp 2 Arm A, Arm B, and historical — same `qa_pose_hash` (`ee511246…`), same renderer, same 1280, no per-arm auto-frame. Composites labeled by arm + recipe, not by score.
- **Held-out / fixed-image eval** at **8k and 16k** (`ns-eval` or equivalent). Train-view scalars every 50 steps are diagnostics only.
- **Log duplicate / split / prune counts** and **refinement event steps** (including the three opacity resets). If screen-size splits are non-zero after step 4000, the `stop_screen_size_at` correction failed — abort science, do not “wait for 16k.”
- **Language:** `BETTER` / `SAME` / `WORSE` / `NO CLIENT-VISIBLE IMPROVEMENT` only. No winner from PSNR. No “looks sharper so ship it.”

If Arm B-style count explosion returns (>> 3.5M or hard abort), the recipe is wrong; do not raise the cap.

---

## Exterior note (product)

Stadium stills ≠ exterior 360 win. Experiment 3 is **interior Room 213** (X4-only source `cecc2763`, 376 panos / 6016 views). After Exp 3, run **separate** tracks:

| Track | Sensor | Do not |
|---|---|---|
| `EXTERIOR_GROUND_360` | Ground exterior 360 | Reuse interior densify knobs or stadium-stills recipe |
| `AERIAL_360` | Aerial 360 | Overwrite interior, or overwrite protected stadium aerial benchmark `2bb07176` |

Reality vs Geometry stays split. Future handheld LiDAR (Airy / Mid-360) is Geometry authority; photometric densify must not relocate metric means.

---

## Hard stop for desktop Cursor

Do **not** launch until this revised preflight is applied.

Do **not** change MCMC, SfM, or X4 preprocess for Experiment 3.

Do **not** train, patch workers, or rewrite Exp 2 artifacts from this note. Re-issue `ROOM213_EXPERIMENT3_PREFLIGHT.md` with the table above, then wait for explicit launch approval.

Resolved-config checklist before any GPU job:

1. From scratch, seed 42, no load dir  
2. `densify_grad_thresh=0.0008` + absgrad  
3. `stop_screen_size_at` **absent or 4000**  
4. Opacity predicate is `and`, resets 3k/6k/9k only  
5. No soft 2M skip-grow  
6. Hard abort 3.5M  
7. Accumulators zeroed at `refine_start_iter`  
8. Arm C present  
9. `save_only_latest_checkpoint=False`; hash 15999  

---

EXPERIMENT 3 REVISED CONSENSUS — NO TRAINING LAUNCHED
