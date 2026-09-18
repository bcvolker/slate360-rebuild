# Room 213 Experiment 4 — scale-control results

**Human visual verdict: UNREVIEWED.** This document reports what happened; it does not
select a production winner. Full evidence package: `docs/ops/exp4-room213-review/`.

## Pre-launch confirmation (re-run immediately before this launch, per instruction)

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
`ns-train` argv diff: exactly one token, `0.15` vs `0.08`. **Confirmed before launch, no
other difference present** — the guard in `worker.py`'s `exp4` phase enforces this
programmatically (`if not diff["ok"] or diff["differing_keys"] != [exp4.CHANGED_VARIABLE]:
raise SystemExit`), not just asserted in a document.

## Identity

| Field | Value |
|---|---|
| Modal app | `ap-ZjsGlbH675Y3sN5f81yE75` |
| Results-query app (read-only, post-hoc) | `ap-ObPdYkSCwb0dITIkA9IiVI` |
| Launch branch / HEAD | `feature/recon-controlled-experiment-v1` |
| Dataset/split | **Bit-identical to Experiment 3 Arm D** — 5,415 train / 601 eval, order hashes `1bb881c0…`/`2b5422fd…`, confirmed matching in both arms' own `resolved-config.json` |
| Panorama-grouped split | Not used. Preserved, unchanged: `PREPARED_FOR_FUTURE_LOCATION_GENERALIZATION_VALIDATION` |
| Trainer | `ns_train_wrap.py` → nerfstudio 1.1.5 splatfacto, gsplat 1.5.3, same `exp3_strategy_patch.py` (opacity-reset fix, accumulator clear, 3.5M hard guard) — unmodified |
| GPU | NVIDIA L40S, both arms |

## The two arms

| | D4-Control | E4-Scale-Control |
|---|---|---|
| `cull_scale_thresh` | 0.15 | **0.08** |
| Start | step 0, no `--load-dir` (confirmed absent from both resolved configs) | same |
| Everything else | identical, confirmed above | |

Both arms ran to completion: `exit_code 0`, `harness_valid: true` (opacity-reset patch
probe: stock predicate never fires, patched predicate fires exactly as expected — same
assertion Experiment 3 used), no population-guard trip, 44 refinement events each.

## Required outputs

| | D4-Control | E4-Scale-Control |
|---|---|---|
| Final Gaussian count | 494,503 | 495,851 |
| Peak Gaussian count (max `after_grow` across all 44 events) | 495,002 | 496,365 |
| Runtime | 3,677.3 s (61.3 min) | 3,737.8 s (62.3 min) |
| Cost | $3.0316 | $3.0815 |
| **Max scale (single largest Gaussian)** | **0.5576** | **0.3545 (−36%)** |
| p99 | 0.02602 | 0.02436 |
| p99.5 | 0.03807 | 0.03182 |
| **p99.9** | **0.08253** | **0.05085 (−38%)** |
| **Count above 0.08** | **547** | **49 (−91%)** |
| **Count above 0.10** | **251** | **24 (−90%)** |
| **Count above 0.15** | **41** | **9 (−78%)** |
| Held-out PSNR @ 15999 | 21.785 | 21.773 (−0.013 dB) |
| Held-out SSIM @ 15999 | 0.8340 | 0.8338 |
| Held-out LPIPS @ 15999 | 0.3826 | 0.3831 |

Both arms peaked well under the unchanged 3.5M hard guard (both ≈495–496k, essentially
identical to each other and to the original Arm D's own ~497k peak) — **population remains
bounded in both arms**, and total count is not meaningfully different between them (E4's
mechanism removes the extreme tail, it does not suppress overall growth — freed budget from
pruning an oversized Gaussian is largely refilled by ordinary smaller splits/duplicates in
later refinement events).

Full per-arm scale statistics: `docs/ops/exp4-room213-review/comparison/exp4-results-full.json`.
Side-by-side table: `docs/ops/exp4-room213-review/comparison/exp4_summary.csv`. Per-event
population trajectories (all 44 events, both arms):
`docs/ops/exp4-room213-review/comparison/{d4,e4}_refine_trajectory.csv`.

## QA renders

`docs/ops/exp4-room213-review/comparison/qa_{A_on_path,B_off_path,C_dollhouse,D_overhead}.png`
(D4 left | E4 right, both at step 15999, same renderer/resolution/no-per-arm-framing as
every prior arm in this experiment series).

- **Dollhouse and overhead: the haze is materially reduced.** D4 shows the same soft,
  hazy, cotton-ball silhouette Arm D showed in Experiment 3 — no visible floor structure.
  E4 shows a visibly smaller, tighter silhouette with a clear floor grid/tile pattern now
  legible underneath, matching what Experiment 3's post-hoc top-0.1%-scale filter revealed,
  now produced directly by training rather than by filtering afterward.
- **On-path: quality is essentially preserved.** D4 and E4 are visually near-identical at
  the A_on_path camera — same room geometry, same overall sharpness; the largest visible
  difference is a slightly less pink/magenta tint on foliage seen through a window in E4,
  well within the range of ordinary run-to-run variation.
- **Off-path:** both arms show the same hazy, low-detail appearance, essentially unchanged
  between D4 and E4. This is expected and not a regression: the Experiment 3 diagnostic
  already established this specific view has very little geometric support (very few
  Gaussians are ever in front of this camera at all) for reasons unrelated to oversized
  Gaussians — it is not the mechanism E4 targets.
- **No new artifact class.** A direct three-way comparison
  (`docs/ops/exp4-room213-review/comparison/three_way_sanity_check_dollhouse.png`) against
  the *original* Experiment 3 Arm D render shows D4 reproduces Arm D's appearance closely,
  including the same colorful streak artifact near the ceiling in both. That artifact is
  present in the original Arm D, in D4, and (fainter) in E4 — pre-existing, not introduced
  by this experiment, and not addressed by the scale-control mechanism (a separate,
  unresolved issue, plausibly related to spherical-harmonics color extrapolation at extreme
  viewing angles far outside training coverage — not investigated further here).

## Scale histogram

`docs/ops/exp4-room213-review/comparison/scale_histogram_d4_vs_e4.png` — log-scale
population histogram, D4 (blue) vs E4 (red), with the 0.08/0.10/0.15 thresholds marked.
E4's distribution visibly compresses well before the yellow threshold lines; D4's tail
extends well past all three.

## Projected footprint

Same documented approximation as Experiment 3 (perspective projection of a spherical proxy
at each Gaussian's max scale; relative ranking only). At the dollhouse/overhead cameras, the
absolute footprint size at the 99.5th percentile shrank in E4 relative to D4 (dollhouse:
8.18 px vs 9.50 px; overhead: 6.42 px vs 7.64 px), consistent with the scale-statistics
result. Full per-camera footprint data for both arms in
`docs/ops/exp4-room213-review/comparison/exp4-results-full.json`.

## Interpretation: the recovery-window prediction was correct

The preflight predicted that E4's tighter threshold would materially reduce, but not fully
zero out, the extreme-scale tail — because gsplat's prune check only runs through the last
refinement event at step 10,900 (`refine_stop_iter = 11,000`), and the final third of
training (11,000–15,999) has no pruning of any kind for either arm. That is exactly what
happened: E4 still has 49 Gaussians above its own 0.08 threshold and 9 above 0.15 at the
final checkpoint, down 91% and 78% from D4 respectively, but not to zero. **This is the
isolated problem to document for a future experiment, as instructed**: some regrowth past
the threshold during the unprotected 11k–16k recovery window is real and measured, not
eliminated by this mechanism alone.

## Pass condition — assessed against the six criteria

1. **Dollhouse/overhead haze materially reduced** — yes, visually and by every scale
   statistic (78–91% reduction in extreme-tail counts, 36–38% reduction in max scale/p99.9).
2. **On-path quality essentially preserved** — yes, visually near-identical; held-out
   metrics at the identical split confirm no measurable degradation.
3. **Held-out metrics do not materially regress** — yes: PSNR −0.013 dB, SSIM −0.0002,
   LPIPS +0.0005 at step 15999 — noise-level differences, not a regression.
4. **Population remains bounded** — yes, both arms peaked at ≈495–496k, far under the
   unchanged 3.5M hard guard, and the guard never tripped for either arm.
5. **Extreme-scale tail substantially reduced** — yes, confirmed at all three requested
   thresholds (0.08/0.10/0.15) and at p99/p99.5/p99.9.
6. **No new artifact class** — confirmed by direct three-way comparison against the
   original Arm D; the one visible artifact (ceiling streak) pre-dates this experiment.

**All six criteria are met.** Per instruction, this is a report of what happened, not a
production decision — no winner is selected here.

## What this does not resolve (documented, not fixed)

- The 11,000–15,999 recovery-window regrowth noted above.
- The pre-existing ceiling-streak artifact, unrelated to Gaussian scale.
- Location-level generalization was not tested (deliberately — the panorama-grouped split
  was withheld from this experiment by design; that remains a separate, future experiment).

## Evidence package

`docs/ops/exp4-room213-review/`:
- `d4/`, `e4/`: `result-manifest.json`, `resolved-config.json`, `eval-summary.json`,
  `refine-log.json`, `opacity-stats.json`, `checkpoint-hashes.json`, `exp3-strategy-patch.json`
- `comparison/`: `exp4-results-full.json`, `exp4_summary.csv`, `{d4,e4}_refine_trajectory.csv`,
  `scale_histogram_d4_vs_e4.png`, `qa_{A,B,C,D}*.png`, `three_way_sanity_check_dollhouse.png`

Excluded by design: checkpoints, PLY/SPZ exports, source media, secrets. Full evidence,
including checkpoints, remains on the Modal volume under
`experiments/room213-exp4/<ARM_NAME>/` and `experiments/room213-exp4-results/`.

---

`HUMAN_VISUAL_VERDICT = UNREVIEWED`. No production winner selected. Human review of
`docs/ops/exp4-room213-review/comparison/qa_*.png` is the recommended next step.

**EXPERIMENT 4 COMPLETE — HUMAN VISUAL REVIEW REQUIRED**
