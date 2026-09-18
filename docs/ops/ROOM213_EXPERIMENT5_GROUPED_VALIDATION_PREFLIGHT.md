# Room 213 Experiment 5 — panorama-grouped generalization validation preflight

**Status: preflight only. No training launched. No GPU spent. Waiting for approval.**

This tests whether Experiment 4's scale-control recipe (`cull_scale_thresh=0.08`) still
helps, and still preserves quality, when scored against physical panorama locations the
model has **never seen in any form** — not the historical split, which the Experiment 3
haze diagnostic showed leaves every panorama contributing to both train and eval.

---

## 1. Panorama-grouped split — re-verified fresh against the real dataset

`workers/recon-experiment/exp5.py`'s `dataset_split_grouped()`, run locally this session
against the actual `transforms.json` (6,016 frames) and the already-staged grouped-safe
manifest built in Experiment 4's preflight:

```json
{
  "total_derived_views": 6016,
  "withheld_panoramas": 38,
  "withheld_images": 608,
  "grouped_safe_pool_panoramas": 338,
  "grouped_safe_pool_images": 5408,
  "nerfstudio_internal_train_images": 4868,
  "nerfstudio_internal_eval_images": 540,
  "leakage_check": {"withheld_panoramas_in_pool": 0, "ok": true},
  "staged_grouped_transforms_matches_recomputed_pool": true,
  "hashes": {
    "withheld_images_sha256": "a4651d9eab83fd663b9c7188b889f7df72f416a94de06f00892ed6c33474e9d8",
    "nerfstudio_internal_train_sha256": "0f8f367e6a43001f42fe58199009c9423876869192dfc3e50e5c4c25dbff0949",
    "nerfstudio_internal_eval_sha256": "bdccc23ccd377f2e659fc83635d05d175cace40c71307a75d45261df5b21b3a5",
    "grouped_safe_transforms_json_sha256": "52f622b1815d43e8dface4f11d10f70eb4bb9b0cae74c79fbc84d457f5fa766e"
  },
  "matches_expected": true
}
```

**Zero panorama leakage, proven by direct set intersection, not asserted.** The staged
grouped-safe `transforms.json` was also cross-checked against a *fresh* recomputation from
the untouched original manifest (`staged_grouped_transforms_matches_recomputed_pool: true`)
— it is provably derived from the frozen source, not a separately hand-edited copy that
could drift.

**~4,868 actual training images**, exactly as expected: `nerfstudio_internal_train_images:
4868` — this is what nerfstudio's own dataparser will use once it applies its usual 90/10
fractional split *to the already-panorama-filtered 5,408-image pool* (never to the withheld
608). That 4,868/540 split is a mechanical byproduct of reusing nerfstudio's own dataparser
unmodified; the real held-out-for-genuinely-unseen-locations set is the 608 images from 38
panoramas that are not in this pool at all.

**All 38 withheld panorama IDs** (printed in full, as requested):

```
000001 000011 000021 000031 000041 000051 000061 000071 000082 000092
000102 000112 000122 000132 000142 000153 000163 000173 000183 000193
000203 000213 000223 000234 000244 000254 000264 000274 000284 000294
000305 000315 000325 000335 000345 000355 000365 000376
```

## 2. Historical split artifacts — preserved, not treated as comparable

The original Experiment 3/4 historical split (5,415/601, hashes `1bb881c0…`/`2b5422fd…`) is
untouched and still on record in `docs/ops/exp3-room213-review/` and
`docs/ops/exp4-room213-review/`. Experiment 5 does not use it and does not train against
it. Per instruction, grouped-validation scores from this experiment are **not** directly
comparable to Experiment 3/4's historical PSNR/SSIM/LPIPS numbers — different, smaller
training pool, different (and genuinely unseen) eval images. G5 and H5 are compared only
against each other, under this one grouped split.

## 3. The two arms

| | G5-Control | H5-Scale-Control |
|---|---|---|
| name | `ROOM213_G5_CONTROL` | `ROOM213_H5_SCALE_CONTROL` |
| `cull_scale_thresh` | 0.15 (= D4/Arm D) | **0.08 (= E4)** |
| Training/eval data | Grouped-safe pool (4,868/540), identical between arms | same |
| Everything else | Frozen at Arm D's values, imported directly from `exp3.py`/`exp4.py`, not retyped | same |

`workers/recon-experiment/exp5.py`'s `resolved_arm_config()` builds on `exp3.
resolved_arm_config(exp3.ARM_D, recipe)` (the exact function Experiment 3/4 already used)
and overrides only `cull_scale_thresh` and the dataset-identity fields (which must differ
from Experiment 4 by design — that's the whole point of this experiment). `exp4.
build_train_cmd` is reused **unmodified** for the actual `ns-train` argv — no new command
builder was needed, since the arm shape (`{"name", "cull_scale_thresh"}`) is identical to
Experiment 4's.

**Resolved-config diff, actually run locally, not asserted:**

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

**`ns-train` argv diff, both arms, actually built and diffed token-by-token:**

```
argv token differences (G5, H5): [('0.15', '0.08')]
exactly one differing argv token confirmed
```

**Confirmed: exactly one intentional scientific difference between the two arms.**

Everything on the frozen list is untouched, confirmed by reuse (not by promise): densify
threshold, refine start/stop, opacity culling, opacity reset, screen-size behavior,
scheduler, resolution, masks, poses, seed, and source data all come from the same `exp3.py`
constants Experiment 3 and 4 already used.

## 4. Frozen recipe

`qa/exp5-frozen-recipe.json` (new, built and hashed this session):

| Field | Value |
|---|---|
| `pose_hash` | `52f622b1815d43e8dface4f11d10f70eb4bb9b0cae74c79fbc84d457f5fa766e` (grouped-safe manifest — the one thing that legitimately differs from the Experiment 3/4 recipe) |
| `mask_hash`, `seed_hash`, `qa_pose_hash`, `source_hash` | **unchanged**, identical to Experiment 3/4's recipe — same underlying files |
| `view_count` | 5,408 |
| `pano_count` | 338 (training-pool panoramas only) |
| `recipe_hash` | `c05b8a57d91e0b01a81b6848c1ff85d1bbeeb027bf15ce46d969550e649d643e` |

## 5. Input staging (designed, not yet run)

`_ensure_exp5_grouped_inputs(vol)` in `worker.py`: stages a new
`inputs/cecc2763/views-exp5-grouped/` directory by **regenerating** its `transforms.json`
on the volume from the frozen original using `exp5.build_grouped_safe_frames` — the exact
same function that produced the file this preflight verified — then asserts its hash equals
the expected `52f622b1…` before accepting it, refusing to stage anything that doesn't match.
`images/` and `masks/` are symlinked to the existing `views/images` and `views/masks` (same
underlying files, no ~1.5 GB duplication). The training container's `verify_inputs_grouped`
(`train_arm_exp5.py`) independently re-checks `pose_hash`/`mask_hash`/`seed_hash` and the
full split shape against the recipe before any GPU cycle is spent training.

## 6. Evaluation design

### Grouped-validation metric (the primary result)

`workers/recon-experiment/exp5_grouped_eval.py`. nerfstudio's own `ns-eval` cannot reach
the 608 withheld images at all — they are not in the dataset it loads, so its internal
90/10 split never sees them. Instead, this renders each of the 608 images directly from the
trained checkpoint at its real camera pose (still known — pose data isn't deleted, only
excluded from the training manifest) and scores it against the real source JPEG using the
**exact metric objects nerfstudio's own splatfacto model uses internally**, confirmed
against nerfstudio 1.1.5's actual source (`SplatfactoModel.__init__` /
`get_image_metrics_and_images`):

```python
psnr  = torchmetrics.image.PeakSignalNoiseRatio(data_range=1.0)
ssim  = pytorch_msssim.SSIM(data_range=1.0, size_average=True, channel=3)
lpips = torchmetrics.image.lpip.LearnedPerceptualImagePatchSimilarity(normalize=True)
```
— not a simplified proxy. Reported per the brief:

- **Per-panorama aggregate** PSNR/SSIM/LPIPS (mean over each panorama's 16 views) — this,
  not the 608 individual crops, is the primary observation unit (38 independent samples).
- **Aggregate over the 38 panoramas**: mean, median, 10th percentile, worst-case, for all
  three metrics.
- **Distance of each withheld panorama to its nearest training panorama** — panorama center
  = mean position of its 16 camera views; nearest-training-panorama distance computed
  against the 338-panorama training pool only (never against other withheld panoramas).

### Panels

`select_panels()` picks, from H5's per-panorama results: worst, 25th-percentile, median,
best (by mean PSNR), plus three more spanning the low/mid/high range of distance-to-nearest-
training-panorama — up to 7 distinct panoramas, one representative view each (`_v00`).
`render_panel()` builds `SOURCE | G5 (CONTROL) | H5 (SCALE-CONTROL) | ERROR` at matching
resolution, no AI sharpening, same renderer/settings as every panel in this experiment
series.

### Stress-test QA (unchanged)

The same 4 frozen QA cameras (on-path, off-path, dollhouse, overhead) at step 15,999,
rendered directly from each arm's checkpoint tensors, same as Experiment 4.

### Scale behavior (unchanged methodology)

Count above 0.08/0.10/0.15, p99/p99.5/p99.9, max scale, final population — the identical
`exp4_results_gpu.py` statistics module, reused unmodified, pointed at
`experiments/room213-exp5/<ARM>/` instead of `room213-exp4`. This is what tells us whether
the scale-control benefit survives the smaller, grouped-safe training set.

## 7. One bug found and fixed while building this (transparency, not a launch blocker)

While wiring the panel-rendering step, `built["by_pano"]` (a mapping of panorama ID to
*file-path strings*, used for split verification) was mistakenly indexed as if it held full
frame dictionaries. Caught on review before any GPU dispatch — fixed by building a proper
`frames_by_pano` (panorama ID → full frame dict, with pose/intrinsics) directly from the
untouched original `transforms.json` for panel rendering specifically. A second
inconsistency (SSIM computed on CPU while PSNR/LPIPS stayed on GPU, with no reason for the
difference) was also normalized to match nerfstudio's own usage. Neither has run against
real data yet; both are now correct by inspection, ready to be exercised by the real run.

## 8. Expected runtime and cost

Training: same 16,000-step schedule, same guards as every prior arm in this series; a
*smaller* training set (4,868 vs 5,415 images) should not increase per-step cost. By direct
analogy to D4/E4 (61–62 min, ~$3.05 each): **roughly $3.00–5.00 and 55–90 minutes per arm**,
both in parallel. Guards unchanged: 150 min runtime, $15 cost, 3.5M live Gaussians, per arm.

Grouped-validation results pass (`exp5_grouped_results`, read-only, both arms): 608 renders
× 2 arms, each with a PSNR/SSIM/LPIPS pass plus 4-camera QA renders and scale/footprint
stats — estimated **15–25 minutes, a few dollars**, well inside the 60-minute budget set for
that function.

## 9a. Addendum (2026-09-18) — portable-hash correction, first launch attempt caught it

The first launch attempt of Experiment 5 refused to stage, exactly as designed:
`_ensure_exp5_grouped_inputs` freshly regenerated the grouped-safe `transforms.json` inside
the Linux training container and its hash did not match `EXPECTED_GROUPED_SAFE_TRANSFORMS_
SHA256` — so it raised and stopped before any GPU training cycle ran. **No GPU training
budget was spent on this failure.**

Root cause: the "expected" hash recorded during Experiment 4's preflight was computed from
a local reference copy this Windows machine wrote via `Path.write_text()` in text mode,
which silently translates `\n` to `\r\n` on Windows. The Linux training container correctly
writes plain `\n`. The two were never going to match — this was a platform-dependent
artifact of how the *reference copy* was written, not a data problem. Same bug class
already found and fixed for the mask hash during Experiment 3 (see
`docs/ops/ROOM213_EXPERIMENT3_FINAL.md`'s "Portable-hash correction" note).

Fix: `EXPECTED_GROUPED_SAFE_TRANSFORMS_SHA256` in `exp5.py` now records the portable,
LF-only-serialized hash (`95f678f1…`), reproduced locally and confirmed to match the
container's own freshly-computed value exactly. `qa/exp5-frozen-recipe.json`'s `pose_hash`
and `recipe_hash` were updated the same way, with the old value preserved on record
(`pose_hash_legacy_windows_crlf_artifact`). Re-ran `dataset_split_grouped()` after the fix:
**identical 38 withheld panoramas, 608 views, zero leakage, and identical content hashes for
the withheld/train/eval image lists** — confirming no frame, pose, mask, or split membership
changed, only the file's own serialization identity. Re-ran the resolved-config diff after
the fix: unchanged, `ok=true`, exactly one differing field.

## 9. What is NOT done yet

- No training has run. No checkpoint exists for G5 or H5.
- The grouped-safe views directory is not yet staged on the Modal volume (designed,
  verified locally, not executed).
- `exp5_grouped_eval.py` has not been run against real data (no checkpoint exists to run it
  against) — reviewed by inspection only, per §7.

---

**EXPERIMENT 5 GROUPED-VALIDATION PREFLIGHT READY — WAITING FOR APPROVAL**
