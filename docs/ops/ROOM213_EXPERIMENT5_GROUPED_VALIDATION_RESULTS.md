# Room 213 Experiment 5 — panorama-grouped generalization validation results

**Human visual verdict: UNREVIEWED.** This is a report, not a production decision. Full
evidence package: `docs/ops/exp5-room213-review/`.

Compare G5 against H5 only, under this grouped split. Per instruction, these numbers are
**not** directly comparable to Experiment 3/4's historical-split scores — different,
smaller training pool (4,868 vs 5,415 images), and a genuinely different eval population
(38 never-seen panorama locations vs a view-level held-out set that Experiment 3's own
diagnostic showed overlaps every training panorama).

## 0. Evaluator sanity check (run before launch, as required)

Scored one existing eval image (D4's own held-out image `000001_v10.jpg`) through both
stock nerfstudio `ns-eval`'s own per-image path and the new direct grouped evaluator.
Isolating the metric objects alone (identical render, both metric paths): PSNR delta
0.0000019 dB, SSIM delta 0.000012, LPIPS delta 0.0 — the metric computation is functionally
identical to nerfstudio's own. Full pipeline (independent render + independent metrics):
PSNR −0.025 dB, SSIM −0.00002, LPIPS +0.0001, mean pixel difference 0.015% — ordinary
floating-point/render-order noise, the same magnitude already observed between separate
training runs in this series. Resolution (1280×1280), color space (plain [0,1] RGB, no
gamma), and tensor range all confirmed matching by direct comparison. **Passed. No
meaningful discrepancy found or requiring explanation.**

## 1. Launch — two attempts caught real bugs before spending training budget, one succeeded

Two prior launch attempts of the (approved) design failed, both **before any GPU training
cycle ran**:

1. `_ensure_exp5_grouped_inputs`'s own freshly-computed hash of the regenerated grouped-safe
   `transforms.json` did not match the recorded value. Root cause: the recorded value was
   computed from a Windows-written reference copy (`Path.write_text()` silently translates
   `\n` to `\r\n` on Windows); the Linux container correctly writes plain `\n`. Fixed by
   recording the portable, LF-only hash and confirming it matches the container's own
   output exactly. Same bug class already found and fixed for the mask hash in Experiment 3.
2. `verify_inputs_grouped`'s `seed_hash` check computed `None` — an off-by-one in path
   traversal depth (`grouped_data_dir.parent.parent` instead of `.parent`) pointed one level
   too high for `sfm/points.ply`. Fixed to match the depth Experiment 3/4's own
   `verify_inputs` already used correctly.

Both failures were caught by the identity/hash checks doing exactly their job — refusing to
train on anything that didn't match the frozen, verified dataset — and both are documented
in full in `docs/ops/ROOM213_EXPERIMENT5_GROUPED_VALIDATION_PREFLIGHT.md`'s addendum. The
third attempt succeeded.

## 2. Pre-launch confirmation (re-run immediately before the successful launch)

```json
{
  "ok": true,
  "differing_keys": ["cull_scale_thresh_prune_scale3d"],
  "expected_differing_keys": ["cull_scale_thresh_prune_scale3d"],
  "arm_g5": {"name": "ROOM213_G5_CONTROL", "cull_scale_thresh_prune_scale3d": 0.15},
  "arm_h5": {"name": "ROOM213_H5_SCALE_CONTROL", "cull_scale_thresh_prune_scale3d": 0.08},
  "field_count": 53
}
```
`ns-train` argv: exactly one differing token, `0.15` vs `0.08`.

**Frozen grouped-safe split, confirmed live by both training containers' own
`verify_inputs_grouped`** (`docs/ops/exp5-room213-review/{g5,h5}/input-identity.json`,
both `split.matches_expected: true`): 38 withheld panoramas, 608 grouped-validation views,
zero panorama leakage, 4,868 training images, 540 internal nerfstudio eval images — not
just asserted in the preflight, independently re-verified by the actual training run.

## 3. Identity

| Field | Value |
|---|---|
| Training app | `ap-C6sAlyENvHHSC7ecNe8ozA` |
| Grouped-validation results app | `ap-VxbhRx9zFfnbPJ466MGVxN` |
| Dataset | Grouped-safe pool, 4,868/540, `recipe_hash df051810…` |
| Trainer | Same `ns_train_wrap.py` / `exp3_strategy_patch.py` as every prior arm — unmodified |
| GPU | NVIDIA L40S, both arms |

Both arms: `exit_code 0`, `harness_valid: true` (same opacity-reset probe assertion every
prior arm used), no population-guard trip, 44 refinement events each.

## 4. Scale-tail statistics — the benefit survives the grouped-safe training set

| | G5-Control (0.15) | H5-Scale-Control (0.08) |
|---|---|---|
| Final Gaussian count | 507,321 | 507,199 |
| Peak Gaussian count | 507,887 | 507,749 |
| Runtime | 3,390.9 s (56.5 min) | 3,378.3 s (56.3 min) |
| Cost | $2.80 | $2.79 |
| **Max scale** | **1.018** | **0.438 (−57%)** |
| p99 | 0.0253 | 0.0241 |
| p99.5 | 0.0370 | 0.0313 |
| **p99.9** | **0.0805** | **0.0499 (−38%)** |
| **Count above 0.08** | **510** | **51 (−90%)** |
| **Count above 0.10** | **229** | **18 (−92%)** |
| **Count above 0.15** | **38** | **5 (−87%)** |

Population stayed bounded in both arms, near-identical to each other and to every prior
arm in this series (~495–508k across Arm D/D4/E4/G5/H5), far under the unchanged 3.5M hard
guard, which never tripped in either arm. **The extreme-scale-tail reduction Experiment 4
found is not an artifact of that particular training set — it reproduces at essentially the
same magnitude (78–91% in Experiment 4, 87–92% here) on a training set with 547 fewer images
and a different panorama composition.** G5's own worst outlier (max scale 1.018) is in fact
larger than Arm D's or D4's, making the relative benefit of H5's cap slightly more dramatic
here than in Experiment 4.

## 5. Grouped-validation metrics — the primary result (38 panoramas, 608 views)

`docs/ops/exp5-room213-review/comparison/per_panorama_grouped_validation.csv` (full 38-row
detail), `{g5,h5}/grouped-eval-full.json` (per-view detail, 608 rows each).

| | G5-Control | H5-Scale-Control |
|---|---|---|
| PSNR mean | 21.123 | 21.108 |
| PSNR median | 21.173 | 21.126 |
| PSNR p10 | 20.167 | 20.150 |
| **PSNR worst** | **19.055** | **19.022** |
| SSIM mean | 0.8157 | 0.8156 |
| SSIM median | 0.8157 | 0.8151 |
| SSIM p10 | 0.7919 | 0.7920 |
| **SSIM worst** | **0.7845** | **0.7844** |
| LPIPS mean | 0.3862 | 0.3871 |
| LPIPS median | 0.3903 | 0.3923 |
| LPIPS p10 (best) | 0.3565 | 0.3572 |
| **LPIPS worst** | **0.4264** | **0.4284** |

**No meaningful degradation on unseen panorama locations.** Every aggregate statistic —
mean, median, p10, and worst-case — differs between G5 and H5 by an amount consistent with
ordinary run-to-run noise (≤0.015 dB PSNR, ≤0.0002 SSIM, ≤0.002 LPIPS), not a systematic
cost of the scale-control mechanism. Worst-case panoramas for both arms remain in a normal,
usable PSNR/SSIM range — no collapse, no outlier panorama disproportionately hurt by H5.

**Distance-to-nearest-training-panorama vs. error**, computed across all 38 withheld
panoramas (`corr()` over panorama-level aggregates): weak correlation with SSIM (r ≈ −0.31,
farther is modestly worse, expected sign) and LPIPS (r ≈ +0.21, farther is modestly worse,
expected sign), essentially no correlation with PSNR (r ≈ 0.01). Both arms show nearly
identical correlation strength — the scale-control mechanism does not change how error
relates to spatial distance. One honest caveat: the withheld panoramas' distances to their
nearest training panorama range only 0.002–0.072 world units, versus a scene envelope
diagonal of ~2.18 (Experiment 3). These are genuinely unseen locations, but they sit *on*
the walked trajectory with a training neighbor nearby — this experiment tests interpolation
between trajectory samples, not extrapolation far beyond the trajectory the way the
dollhouse/overhead QA cameras do. That is a different, still-useful, but narrower
generalization question than "does it work off the walked path" — worth naming plainly
rather than overclaiming.

## 6. Visual panels — SOURCE | G5 | H5 | ERROR

`docs/ops/exp5-room213-review/panels/`: best (`000264`), median (`000173`), lower-quartile
(`000223`), worst (`000325`), plus three spanning near/mid/far distance-to-nearest-training
(`000376`/`000153`/`000294`). All seven show the same signature as Experiment 3's near-path
source-vs-render panels: recognizable room geometry, error concentrated on fine edges and
text rather than as ghosting or systematic offset — ordinary reconstruction blur from a
bounded Gaussian budget, not haze, not misalignment, and no visible difference in kind
between G5 and H5 in any panel. **No new artifact class** on withheld locations.

## 7. Stress-test QA — dollhouse/overhead haze reduction replicates, on-path preserved

`docs/ops/exp5-room213-review/qa/qa_{A,B,C,D}*.png`, same 4 frozen cameras, step 15,999.

- **Dollhouse and overhead**: the same effect as Experiment 4, if anything more visible
  here. G5 shows the familiar hazy silhouette plus two additional large floating blob
  artifacts off to the side that are not present in H5's render. H5 shows a visibly
  smaller, tighter silhouette with legible floor structure and no floating blobs.
- **On-path**: G5 and H5 are visually near-identical — same room, same sharpness; H5 again
  shows a very slightly less saturated tint on foliage through a window, the same small,
  consistent difference already seen in D4 vs E4.
- **Off-path**: both arms show the same low-detail appearance, unchanged between arms —
  expected, this view has very little geometric support for reasons unrelated to Gaussian
  scale (established in Experiment 3's diagnostic).

## 8. Pass condition — assessed

1. **Retained scale-control benefit** — yes, 87–92% reduction across all three thresholds,
   comparable to or stronger than Experiment 4's 78–91%.
2. **No meaningful degradation on unseen panorama locations** — yes, every grouped-
   validation statistic (mean/median/p10/worst, all three metrics) differs by noise-level
   amounts between G5 and H5.
3. **Acceptable worst-case grouped-validation views** — yes, worst-panorama PSNR/SSIM/LPIPS
   for both arms are in a normal range, confirmed visually in the `worst` panel.
4. **No new artifact class** — confirmed by both the panels (identical failure signature to
   Experiment 3's near-path renders) and the QA renders (same pre-existing effects as
   Experiment 4, H5 if anything cleaner).

**All four criteria met.** H5's benefit is not an artifact of Experiment 4's particular
training set. No production winner is selected here.

## 9. What this does not establish

- Generalization to locations *far* outside the walked trajectory (the dollhouse/overhead
  regime) was not tested by the grouped-validation metric — only by the unchanged QA
  cameras, which is a visual, not quantitative, check. The withheld panoramas are
  interpolation tests, not extrapolation tests (§5).
- No production recommendation. G5 vs H5 comparison only, under this one split.

## Evidence package

`docs/ops/exp5-room213-review/`:
- `g5/`, `h5/`: `result-manifest.json`, `resolved-config.json`, `refine-log.json`,
  `opacity-stats.json`, `eval-summary-nerfstudio-internal-split.json`,
  `exp3-strategy-patch.json`, `input-identity.json`, `grouped-eval-full.json` (608-row
  per-view detail)
- `comparison/`: `exp5_summary.csv`, `per_panorama_grouped_validation.csv` (38-row
  aggregate detail), `exp5-results-summary-full.json`
- `qa/`: 4 side-by-side stress-test QA composites
- `panels/`: 7 SOURCE\|G5\|H5\|ERROR panels

Excluded by design: checkpoints, PLY/SPZ exports, source media, secrets. Full evidence,
including checkpoints and the complete 608-view render set, remains on the Modal volume
under `experiments/room213-exp5/<ARM_NAME>/` and `experiments/room213-exp5-results/`.

---

`HUMAN_VISUAL_VERDICT = UNREVIEWED`. No production winner selected.

**EXPERIMENT 5 COMPLETE — HUMAN VISUAL REVIEW REQUIRED**
