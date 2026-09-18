# Room 213 Experiment 4 — scale-control preflight

**Status: preflight only. No training launched. No GPU spent. Waiting for approval.**

This document is the complete preflight for one candidate follow-on to Experiment 3: testing
whether gsplat's own, already-shipped, per-Gaussian max-scale prune — tuned to a threshold
derived from Arm D's actual scale distribution — prevents the pathological large-Gaussian
population the Experiment 3 haze diagnostic identified, without needing any new patch code.

Frozen exactly as instructed, verified by direct import from `exp3.py` (not re-typed): the
dataset, poses, masks, source views, RNG seed, `densify_grad_thresh` (0.0008),
opacity-reset behavior (the corrected gsplat #776-equivalent patch, accumulator clear at
step 6017), `cull_alpha_thresh` (0.005), and every refinement-timing constant
(`warmup_length` 6016, `stop_split_at` 11000, `reset_alpha_every` 30, `stop_screen_size_at`
4000). The 3.5M hard population guard is unchanged. No soft population cap is introduced.

---

## 1. Two things flagged for your confirmation before this counts as "ready"

I resolved two genuine ambiguities in the brief. Both are defensible reads and both are
fully implemented/tested below, but they are judgment calls, not facts, so I'm naming them
explicitly rather than deciding silently.

**(a) What "culling threshold" in the frozen list means.** Arm D actually has *two*
distinct culling thresholds: `cull_alpha_thresh` (opacity-based, 0.005 — the tuned
Experiment-3-consensus value) and `cull_scale_thresh` (scale-based, 0.15 — never tuned,
inherited unchanged from Experiment 2/the Lab default). I read "culling threshold" in your
frozen list as the opacity one specifically, because it's named in the same breath as
"opacity-reset behavior," and because the alternative reading makes the experiment you
asked for impossible — you also asked me to test exactly one scale-control mechanism, and
gsplat's only safer, already-supported mechanism *is* `cull_scale_thresh`. §2 confirms this
is a real, inspected, pre-existing gsplat code path, not something invented to route around
the constraint.

**(b) Training data for the grouped-validation split.** "No perspective crop from a
validation panorama may appear in training" is an absolute requirement. Under the
*historical* split, I confirmed (Experiment 3 haze diagnostic) that **100% of the 376
panoramas already contribute images to both train and eval** — there is no way to compute a
genuine location-held-out metric without changing what the model is trained on. Your own
brief anticipates this ("unless required by the new grouped validation"). I resolved it by
building D4/E4 on a **grouped-safe training pool** that entirely excludes the grouped-
validation panoramas (§4) — meaning D4/E4's training set is not bit-identical to the
original Arm D's 5,415 images (it's 4,868, after removing 608 views from 38 fully-withheld
panoramas). The historical-*style* eval computed on this run is therefore not directly
comparable to Arm D's published 21.805 dB — it's the same split-rule methodology, re-applied
over a smaller pool, and I label it that way everywhere below rather than call it "the
historical metric." If you'd rather keep D4/E4's training data bit-identical to Arm D and
treat the grouped-validation number as a secondary, leakage-aware diagnostic only (not a
training-affecting requirement), say so and I'll rebuild with unchanged 5,415-image
training and drop the grouped-safe pool.

---

## 2. Source inspection: is there a safer supported mechanism? (yes)

Fetched and read gsplat `v1.5.3`'s actual `DefaultStrategy._prune_gs`
(`gsplat/strategy/default.py`, same pinned version Experiment 3 used):

```python
is_prune = torch.sigmoid(params["opacities"].flatten()) < self.prune_opa
if step > self.reset_every:
    is_too_big = (
        torch.exp(params["scales"]).max(dim=-1).values
        > self.prune_scale3d * state["scene_scale"]
    )
    ...
    is_prune = is_prune | is_too_big
```

This runs at every refinement event once `step > reset_every` (3000) — i.e. every one of
this run's 44 refinement events, all at ≥ step 6300. Splatfacto wires its own
`cull_scale_thresh` config field directly to `prune_scale3d`
(`nerfstudio/models/splatfacto.py`: `prune_scale3d=self.config.cull_scale_thresh`) and fixes
`scene_scale=1.0` (`self.strategy_state = self.strategy.initialize_state(scene_scale=1.0)`),
so `cull_scale_thresh` **is already the world-unit max-scale threshold**, no conversion
needed. This is a pre-existing, shipped, previously-inert gsplat mechanism — Arm D's own
resolved config already carries `cull_scale_thresh_prune_scale3d: 0.15`
(`docs/ops/exp3-room213-review/arm-d/resolved-config.json`), which is why it never fired:
0.15 sits roughly 1.9× above Arm D's own empirical p99.9 max-scale. **No new patch code is
required.** `stop_screen_size_at` stays at 4000 (unchanged, per the frozen list) —
confirmed unnecessary for this mechanism since it's a separate code path entirely
(`_grow_gs`'s screen-size split, not `_prune_gs`'s scale prune).

---

## 3. Threshold, derived from Arm D's own distribution (not invented)

From the Experiment 3 haze diagnostic
(`docs/ops/exp3-haze-diagnostic-review/gaussian_and_footprint_stats.json`,
`gaussian_quality_stats_arm_d`), Arm D step-15999, 496,429 Gaussians:

| Percentile of max world-space scale | Value |
|---|---|
| p50 (median) | 0.00527 |
| p90 | 0.00955 |
| p95 | 0.01249 |
| p99 (top 1%) | 0.02651 |
| p99.5 (top 0.5%) | 0.03830 |
| **p99.9 (top 0.1%)** | **0.08012** |

The Experiment 3 diagnostic's own ablation independently found that excluding exactly this
top-0.1% group (497 of 496,429 Gaussians) was the smallest cut that visibly cleared the
dollhouse/overhead haze, at the smallest held-out cost (−0.065 dB PSNR) of every variant
tested — smaller cuts (top 1%, top 0.5%) cost far more (−0.55 to −1.4 dB) for no clear
additional visual benefit in the renders reviewed. **`E4_CULL_SCALE_THRESH = 0.08`** —
Arm D's own p99.9, rounded to two significant figures. Current (inert) Arm D value: 0.15.

Because gsplat's prune checks the *live* population at every refinement event (not a
one-time end-of-run cut), this threshold will remove outliers continuously as they form
across all 44 refinement events, which should catch the pathological tail earlier and more
thoroughly than a single post-hoc pass.

---

## 4. Panorama-grouped validation split (real numbers, against the real dataset)

`workers/recon-experiment/exp4_panorama_split.py`, run locally against the actual
`transforms.json` (6,016 frames, 376 panoramas, 16 views each), deterministic 10% panorama
holdout (evenly spaced by sorted panorama ID, same style as nerfstudio's own fractional
split, applied one level up):

| | Value |
|---|---|
| Grouped-validation panoramas withheld | 38 |
| Grouped-validation images (entirely excluded from training) | 608 |
| Grouped-safe training pool (panoramas) | 338 |
| Grouped-safe training pool (images) | 5,408 |
| Historical-*style* train (90% of the grouped-safe pool) | 4,868 |
| Historical-*style* eval (10% of the grouped-safe pool) | 540 |
| **Leakage check: grouped-val panoramas appearing in the training pool** | **0 (confirmed programmatically)** |

A grouped-safe `transforms.json` (5,408 frames, the 608 grouped-validation frames removed,
everything else — file paths, poses, masks, intrinsics — byte-identical to the frozen
original) was built and hashed locally: **`52f622b1815d43e8dface4f11d10f70eb4bb9b0cae74c79fbc84d457f5fa766e`**,
zero panorama leakage confirmed by direct set intersection. No source image, pose, or mask
was altered — only which subset of the existing frozen manifest is exposed to the trainer.
Both D4 and E4 would train against this identical grouped-safe view set (`--data` pointed
at a new `views-exp4-grouped/` directory: this new `transforms.json` plus the *same*,
unmodified `images/` and `masks/` directories the frozen tar already provides — no new pixel
data). This file exists locally only (`qa/exp3-run/exp4-grouped-views/transforms.json`); it
is **not staged to the Modal volume and no training references it** until this preflight is
approved.

Two eval passes are planned per arm:

1. **Historical-style eval** — same 90/10 split *rule* re-applied over the grouped-safe
   pool (4,868/540, hashes above) — comparable between D4 and E4, but not bit-identical to
   Arm D's own published numbers (different, smaller training pool; see §1b).
2. **Grouped-validation eval** — the 608 images from the 38 fully-withheld panoramas,
   genuinely zero-leakage held-out locations. This is the metric that actually tests
   generalization to unseen physical positions, which the historical split cannot.

---

## 5. The two arms

| | D4-Control | E4-Scale-Control |
|---|---|---|
| name | `ROOM213_D4_CONTROL` | `ROOM213_E4_SCALE_CONTROL` |
| `cull_scale_thresh` | 0.15 (= Arm D, inert) | **0.08** (derived, §3) |
| everything else | identical | identical |

`workers/recon-experiment/exp4.py` builds each arm's full resolved config by importing
Arm D's config from `exp3.py` directly (not retyped) and overriding only
`cull_scale_thresh` and arm identity, so every other field is guaranteed identical by
construction, not by hand-checking.

**Resolved-config diff, actually run locally (not asserted):**

```json
{
  "ok": true,
  "differing_keys": ["cull_scale_thresh_prune_scale3d"],
  "expected_differing_keys": ["cull_scale_thresh_prune_scale3d"],
  "arm_d4": {"name": "ROOM213_D4_CONTROL", "cull_scale_thresh_prune_scale3d": 0.15},
  "arm_e4": {"name": "ROOM213_E4_SCALE_CONTROL", "cull_scale_thresh_prune_scale3d": 0.08},
  "field_count": 51
}
```

**Exact `ns-train` argv, both arms, actually built and diffed token-by-token** (with
`--output-dir` held equal in this check to isolate the real variable; in the actual launch
each arm still gets its own output directory, exactly as Arm C/D did — a mechanical
per-arm path, not a scientific variable):

```
argv token differences (D4, E4): [('0.15', '0.08')]
argv length equal: True — exactly one differing token confirmed
```

**Confirmed: there is exactly one intentional behavioral difference between the two arms.**

---

## 6. Evaluation and QA plan

Retained, unchanged from Experiment 3: on-path (A), off-path (B), dollhouse (C), overhead
(D) QA renders at the same frozen camera set (`qa_pose_hash ee511246…`), at steps 8000 and
15999, same renderer/resolution/no-per-arm-framing as every prior arm.

Added, reusing the Experiment 3 haze-diagnostic tooling unchanged
(`exp3_haze_diagnostic_gpu.py`'s `gaussian_quality_stats`, `footprint_report`):

- Gaussian maximum-scale histogram (linear + log), for both arms, at step 15999.
- Top 1% / 0.5% / 0.1% largest-Gaussian counts and their mean distance to the nearest
  training camera, both arms.
- Distance-to-nearest-training-camera distribution for the extreme-scale tail specifically
  (the same metric that showed Arm D's top-0.1% group sat 4× farther than the population
  median).
- Projected footprint statistics at all 4 QA cameras (same documented approximation as
  Experiment 3: perspective projection of a spherical proxy at each Gaussian's max scale —
  relative ranking only, not a physical measurement).
- Both eval passes from §4, clearly labeled by name (`historical_style_eval` vs
  `grouped_validation_eval`) in every output file — never merged into one number.

---

## 7. Pass condition (all five checked before recommending anything)

1. Dollhouse/overhead pathological occlusion materially reduced (visual + the alpha/opacity
   render layers from Experiment 3's diagnostic, reused unchanged, re-run on E4).
2. On-path quality essentially intact (side-by-side QA + historical-style eval delta,
   expect something in the range Experiment 3's own top-0.1% post-hoc filter already
   showed: small, non-zero, not damaging).
3. Grouped-validation quality does not materially regress, E4 vs D4.
4. Population stays bounded — report peak and final Gaussian count for both arms against
   the unchanged 3.5M hard guard.
5. The extreme-scale tail (top 0.1%/0.5%/1%) is materially reduced in E4 vs D4 by count
   and/or by max value.

No production winner will be chosen automatically. `HUMAN_VISUAL_VERDICT = UNREVIEWED` on
every output, same as Experiment 2 and 3.

---

## 8. What is NOT done yet (deliberately, pending your answer to §1)

- The grouped-safe `transforms.json` is built and hashed locally only; not staged to the
  Modal volume.
- No new Modal training function exists for Experiment 4 (Experiment 3's `train_arm_exp3` /
  `ns_train_wrap.py` / `exp3_strategy_patch.py` are reused as-is once launched — no new
  patch code is needed per §2 — but the launcher wiring itself, the volume staging step for
  the grouped-safe views, and the dual-eval driver are not yet written).
- No GPU has been spent. No checkpoint exists for D4 or E4.

**Estimated cost/runtime**, by direct analogy to Arm D (same step count, same schedule, a
lightly larger extra prune workload for E4 only): roughly $3.50–5.00 and 60–90 minutes per
arm, both in parallel — comparable to Experiment 3's per-arm range.

---

**EXPERIMENT 4 SCALE-CONTROL PREFLIGHT READY — WAITING FOR APPROVAL**
