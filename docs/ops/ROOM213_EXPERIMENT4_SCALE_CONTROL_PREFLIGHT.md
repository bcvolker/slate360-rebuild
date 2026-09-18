# Room 213 Experiment 4 — scale-control preflight (final)

**Status: preflight only. No training launched. No GPU spent on training. Waiting for
launch approval.** This revises the first draft after review: dataset/split ambiguity is
now resolved in favor of strict bit-compatibility with Experiment 3 Arm D.

Experiment 4 tests exactly one question: **does lowering `cull_scale_thresh` from 0.15 to
0.08 prevent the pathological extreme-scale Gaussian tail the Experiment 3 haze diagnostic
found, while preserving Arm D's quality?**

---

## 1. Decisions confirmed this round

**Decision 1 — "culling threshold."** Confirmed: the frozen `cull_alpha_thresh = 0.005`
(opacity culling) is unchanged. `cull_scale_thresh` is the one intended variable.

**Decision 2 — dataset and split.** Confirmed: **do not** change the training split. D4 and
E4 both train on the exact, unmodified Experiment 3 dataset partition — same 6,016 derived
views, same 5,415-image train set, same 601-image historical eval set, byte-identical order
hashes to Arm D's own:

| Field | Value |
|---|---|
| Total derived views | 6,016 |
| Train images | 5,415 |
| Historical eval images | 601 |
| `dataset_train_order_sha256` | `1bb881c0bd18a735cf7e72a805639de1901b73bf96a63c94cf3a8a1bf53547d6` |
| `dataset_eval_order_sha256` | `2b5422fd94c0cca9f18a3cdbedf8076ee5b930dedefd0de30187424ff8abeb76` |

Confirmed by direct comparison, not just by construction: these four values were re-printed
from both `exp4.resolved_arm_config(ARM_D4)` and `exp4.resolved_arm_config(ARM_E4)` and
checked byte-for-byte against Arm D's own published `resolved-config.json`
(`docs/ops/exp3-room213-review/arm-d/resolved-config.json`) — identical in all three places.
The 5,408-frame panorama-grouped-safe `transforms.json` built for the earlier draft is
**not referenced anywhere in this design** and is not staged to the Modal volume.

---

## 2. The two arms — unchanged design, re-verified

| | D4-Control | E4-Scale-Control |
|---|---|---|
| name | `ROOM213_D4_CONTROL` | `ROOM213_E4_SCALE_CONTROL` |
| `cull_scale_thresh` | 0.15 (= Arm D, inert) | **0.08** |
| dataset/split | Arm D's, unchanged | Arm D's, unchanged |
| everything else | identical | identical |

**Mechanism** (unchanged from the first draft, source-inspected not invented): gsplat
1.5.3's `DefaultStrategy._prune_gs` already implements

```python
if step > self.reset_every:
    is_too_big = exp(params["scales"]).max(-1) > self.prune_scale3d * state["scene_scale"]
    is_prune = is_prune | is_too_big
```

at every refinement event (step > 3000; all 44 of this run's events qualify). Splatfacto
maps `cull_scale_thresh` directly to `prune_scale3d` and fixes `scene_scale = 1.0`, so
`cull_scale_thresh` is already the world-unit threshold — no new patch code, no unit
conversion. No screen-size splitting is reactivated; `stop_screen_size_at` stays at 4,000
(unchanged), because it gates a different code path (`_grow_gs`'s screen-size split) that
this mechanism does not touch.

**Threshold provenance.** `E4_CULL_SCALE_THRESH = 0.08`, from Arm D's own empirical
max-scale p99.9 (0.08012), the exact cutoff the Experiment 3 haze diagnostic's own ablation
found removed the dollhouse/overhead haze for the smallest measured cost of every variant
tested. Not a round number chosen a priori.

**Resolved-config diff, re-run fresh after this revision:**

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

**`ns-train` argv diff** (both arms, `--output-dir` held equal to isolate the scientific
variable — in the real launch each arm still gets its own output directory, a mechanical
per-arm path, same as Arm C/D):

```
argv token differences (D4, E4): [('0.15', '0.08')]
exactly one differing token confirmed
```

**Confirmed: exactly one intentional behavioral difference between the two arms.**

---

## 3. Baseline facts, measured on Arm D's actual existing checkpoint (not estimated)

Arm D step-15999, 496,429 Gaussians. Queried directly from the checkpoint tensors
(`docs/ops/exp3-haze-diagnostic-review/exp4_baseline_scale_counts.json`):

| Threshold | Count above | Fraction |
|---|---|---|
| > 0.08 (proposed E4 threshold) | 496 | 0.0999% |
| > 0.10 | 241 | 0.0485% |
| > 0.15 (current, inert D4/Arm D threshold) | **40** | 0.0081% |

| Statistic | Value |
|---|---|
| p99 | 0.02651 |
| p99.5 | 0.03830 |
| p99.9 | 0.07982 |
| p99.99 | 0.14207 |
| **Maximum scale (single largest Gaussian)** | **0.40207** |

**Important nuance found while gathering this baseline, worth stating plainly:** the
current 0.15 threshold *is* live and checked at every one of the 44 refinement events, yet
40 Gaussians up to 0.402 (2.7× the threshold) survived to the final checkpoint. The
per-event population trajectory
(`docs/ops/exp3-haze-diagnostic-review/exp4_baseline_refine_trajectory.csv`, all 44 events)
shows why: the last refinement event lands at step 10900 (`refine_stop_iter = 11000`), and
`_prune_gs` only runs inside that refinement block. From step 11000 to 15999 — one third of
the whole run — Gaussians keep optimizing (their scale parameters can still grow via
ordinary Adam updates) with **zero** further pruning of any kind, opacity or scale. This
applies identically to D4 and E4. **Prediction, not a claim:** E4's tighter 0.08 threshold
should catch more outliers *before* step 11000 than the current 0.15 does, but it cannot
prevent scale growth during the unprotected 11000–15999 recovery window — so a full
elimination of the extreme tail down to exactly zero in E4 should not be expected; a
*material reduction*, per the pass condition, is the actual bar.

---

## 4. Panorama-grouped validation split — preserved, not used here

**`PREPARED_FOR_FUTURE_LOCATION_GENERALIZATION_VALIDATION`**

Not deleted, not used for Experiment 4 training or evaluation. Kept exactly as built and
verified:

| | Value |
|---|---|
| Withheld panoramas | 38 |
| Withheld (grouped-validation) views | 608 |
| Grouped-safe training pool | 338 panoramas / 5,408 views |
| Train/validation panorama leakage | **0**, confirmed by direct set intersection |
| Grouped-safe `transforms.json` SHA-256 | `52f622b1815d43e8dface4f11d10f70eb4bb9b0cae74c79fbc84d457f5fa766e` |

Code: `workers/recon-experiment/exp4_panorama_split.py`. Summary:
`docs/ops/exp3-haze-diagnostic-review/exp4_grouped_split_summary.json`. This becomes the
basis of a **separate**, later experiment (location-level generalization, once a scale
policy is validated) — deliberately not mixed into this one, per your instruction to keep
training-policy validation and generalization-validation redesign apart.

---

## 5. Evaluation plan for the real run

Primary pass/fail evidence, in the order given:

1. **Frozen on-path QA** (camera A) — same `qa_pose_hash ee511246…`, same renderer, both
   steps (8000, 15999), no per-arm framing.
2. **Frozen off-path QA** (camera B) — same.
3. **Dollhouse** (camera C) — same. This and #4 are where the effect should show.
4. **Overhead** (camera D) — same.
5. **Extreme-scale population statistics**, both arms, at 15999 (and ideally at each kept
   checkpoint: 500/3000/6000/8000/9000/11000/13000/15999):
   - count above 0.08, above 0.10, above 0.15
   - p99, p99.5, p99.9
   - maximum scale
   - population count at every one of the 44 refinement events (`EXP3_REFINE` log lines,
     same format Experiment 3 already produces — reused unchanged)
6. **Projected footprint statistics** at all 4 QA cameras, both arms — same documented
   approximation as Experiment 3 (perspective projection of a spherical proxy at each
   Gaussian's max scale; relative ranking only).
7. **Historical held-out PSNR/SSIM/LPIPS**, the original 601-image split, both arms — used
   for continuity and as one input to the pass condition, explicitly **not** interpreted as
   evidence about spatial/location generalization (the Experiment 3 diagnostic already
   established that split is view-level, not location-level).

Reused without modification: `exp3_strategy_patch.py` (opacity-reset fix, accumulator
clear, 3.5M hard guard — unchanged, still armed, still no soft cap),
`exp3_haze_diagnostic_gpu.py`'s stats/footprint functions, the QA camera set, the checkpoint
retention schedule.

---

## 6. Pass condition

E4 is technically successful only if, together:

1. Dollhouse/overhead pathological haze is materially reduced (visual, both QA and the
   Experiment 3 alpha/opacity-contribution render layers re-run on E4).
2. On-path image quality is essentially preserved.
3. Historical held-out metrics do not materially regress.
4. The extreme-scale tail (§3's three count thresholds, p99/p99.5/p99.9, max value) is
   substantially reduced, D4 vs E4.
5. Gaussian population remains bounded (report peak and final count against the unchanged
   3.5M hard guard for both arms).
6. No new artifact class appears (checked visually against all four QA cameras and the
   diagnostic render layers, not assumed).

No production winner is selected automatically. `HUMAN_VISUAL_VERDICT = UNREVIEWED` on
every output, same convention as Experiments 2 and 3.

---

## 7. After Experiment 4

If E4 passes, the next experiment uses the already-prepared panorama-grouped split (§4) to
test location-level generalization with the improved scale-control recipe — kept as its own,
separate experiment so training-policy validation (this one) is never mixed with
generalization-validation redesign (the next one). Not designed further here.

---

## 8. Expected runtime and cost

Same step count (16,000), same schedule, as Arm D — the only difference is a lightly heavier
per-event prune pass for E4. By direct analogy to Arm D (68.5 min / $3.39) and Arm C (58.8
min / $2.91): **roughly $3.50–5.00 and 60–90 minutes per arm, both in parallel** (comparable
to, not exceeding, Experiment 3's per-arm range). Guards unchanged: 150 min runtime, $15
cost, 3.5M live Gaussians, per arm.

---

## 9. What is still not done (deliberately)

- No Modal training/launcher function exists yet for Experiment 4. `exp3_strategy_patch.py`
  and `ns_train_wrap.py` are reused unmodified once launched — no new patch code needed —
  but the actual `train_arm_exp4`-style Modal function and phase wiring are not written.
- No GPU has been spent on training. The one GPU query run during this preflight
  (`exp4_baseline_scale_counts.py`, via a temporary Modal function removed immediately
  after use) was read-only against Arm D's existing checkpoint — no training, no new
  checkpoint, nothing written to any experiment directory.

---

**EXPERIMENT 4 FINAL PREFLIGHT READY — WAITING FOR LAUNCH APPROVAL**
