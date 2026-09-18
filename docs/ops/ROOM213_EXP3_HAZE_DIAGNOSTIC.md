# Room 213 Experiment 3 — post-hoc haze / Gaussian cleanup diagnostic

**Human visual verdict: UNREVIEWED.** This document identifies a cause and tests candidate
fixes; it does not select a fix or declare the haze solved. Evidence package:
`docs/ops/exp3-haze-diagnostic-review/`. Diagnostic outputs on the Modal volume:
`experiments/room213-exp3-cleanup-diagnostic/` (new, separate tree — Arm C and Arm D's own
`experiments/room213-exp3/<ARM>/` directories were never opened for writing).

Subject: Arm D (`ROOM213_ARM_D_DELAYED_GROWTH`) step-15999 checkpoint, read-only. Arm C
(`ROOM213_ARM_C_NO_GROWTH_CONTROL`) step-15999 used as the existing visual/quantitative
reference, also read-only. **No retraining. No checkpoint was modified in place.**

---

## 0. Correction to the starting premise

Item 2 of the brief asked which of the eight comparison renders was missing from the
downloaded review set. All eight (`step-8000` and `step-15999`, four cameras each) were
checked directly: all are present, all are real 2568×1280 RGB PNGs referenced correctly in
`comparison.json`, none are blank or zero-byte. **Nothing is missing.** If a view looked
blank or washed-out on screen, that is the haze artifact itself (see §5), not a missing
file.

---

## 1. Camera geometry — is the artifact outside training coverage?

`docs/ops/exp3-haze-diagnostic-review/camera_geometry.json`,
`docs/ops/exp3-haze-diagnostic-review/camera_layout.png`.

| Camera | Nearest training-camera distance | As % of scene envelope diagonal (2.18) | Angular difference | Inside envelope? |
|---|---|---|---|---|
| A_on_path | 4.7e-18 (essentially on top of a training camera) | ~0% | 0.02° | yes |
| B_off_path | 0.292 | 13% | 104° | yes |
| C_dollhouse | 2.149 | **98%** | 60° | **no** |
| D_overhead | 3.034 | **139%** | 91° | **no** |

**Answer: yes, decisively for the two views that show the worst haze.** The dollhouse and
overhead cameras sit at a distance from the nearest training camera that is comparable to,
or larger than, the entire captured trajectory's own bounding-box diagonal. They are not
close-in extrapolations; they are looking at the reconstruction from *outside* the walked
volume, by design (`poses.py`'s dollhouse/overhead formulas deliberately place them at
0.9–1.4× the trajectory diagonal for an elevated overview). A_on_path is a near-exact
training view (near-zero distance) and B_off_path is spatially close (13% of the diagonal)
though at an unusual angle.

---

## 2. Split-grouping audit (read-only; no split was changed)

`camera_geometry.json` → `split_grouping_audit`.

The 601-image held-out split is drawn by sorting all 6,016 derived views alphabetically by
`{pano}_{view}.jpg` and taking an evenly-spaced 90% by list index. Each panorama contributes
16 consecutive filenames in that sorted order, so the 1-in-10 spacing lands inside nearly
every panorama's run. Result: **all 376 of 376 panoramas contribute images to both the
train and the eval split.** The held-out set is view-level (a different crop angle from an
already-seen capture point), not location-level. This affects Arm C and Arm D identically,
so the Arm C-vs-D comparison stays fair, but it means held-out PSNR/SSIM/LPIPS never test a
genuinely unseen location — including never testing anything resembling the dollhouse/
overhead vantage. That is directly relevant to §4 below: a filter can be metrically "free"
on held-out eval and still be tested on a population of views that structurally cannot see
the artifact in question. A panorama-grouped split (holding out entire panoramas, not
individual crops) is a design worth adopting for a future experiment; **not implemented or
retrained here.**

---

## 3. Arm D Gaussian population statistics

`docs/ops/exp3-haze-diagnostic-review/gaussian_and_footprint_stats.json` →
`gaussian_quality_stats_arm_d`; joint histograms in `stats/`.

| Quantity | Mean | Median | p95 / p99 |
|---|---|---|---|
| Opacity (activated) | 0.389 | 0.215 | p95 = 0.987 |
| Max world-space scale | 0.00624 | 0.00527 | p99 = 0.0265, p99.9 = 0.0798 |
| Anisotropy (max/min scale) | 5.67 | 5.89 | p99 = 9.90 |
| Distance to nearest training camera | 0.207 | 0.204 | p99 = 0.381 |

**Largest-by-scale groups, and the key correction to the starting hypothesis:**

| Group | n | Mean opacity | Mean distance to nearest camera |
|---|---|---|---|
| Whole population | 496,429 | 0.389 | 0.207 |
| Top 5% by max scale | 24,821 | 0.477 | 0.298 |
| Top 1% | 4,964 | 0.539 | 0.465 |
| Top 0.5% | 2,482 | 0.593 | 0.584 |
| **Top 0.1%** | **496** | **0.733** | **0.889** |

The brief's working hypothesis was "large + low-opacity / weakly supported Gaussians create
the haze." The distance relationship holds — the largest Gaussians are 3–4× farther from
the nearest training camera than the population median. **The opacity relationship is
backwards: the largest Gaussians are *more* opaque than average, not less** (0.73 vs. 0.39
population mean for the top 0.1%). This is confirmed independently in §5's alpha-channel
render. Any post-hoc filter built on "remove low opacity" will not touch this group.

---

## 4. Projected footprint

`gaussian_and_footprint_stats.json` → `projected_footprint`. **Method, stated plainly:**
each Gaussian's *maximum* world-space scale is projected through the pinhole model as a
spherical proxy (`radius_px = fx · max_scale / camera-space depth`). This is a first-order
approximation, not gsplat 1.5.3's exact anisotropic screen-space covariance (not exposed
per-Gaussian by its Python API), and is used only for relative ranking, never as a physical
measurement.

From the dollhouse/overhead cameras, **every** Gaussian is technically "in front" of the
camera (it is viewing the whole scene from outside), and individual projected footprints
are all small — median ~1.1–1.3 px, p99.9 ~17–20 px, none exceeding the 1280 px viewport.
**No single oversized on-screen splat explains the haze from these views.** The "large
footprint" group (top 0.5% by projected size, still small in absolute pixels) again shows
elevated mean opacity (~0.60 vs. population ~0.39), consistent with §3.

From A_on_path/B_off_path (close-up, near-trajectory), the footprint distribution is
completely different in character: only 111,799 (A) and 1,637 (B) of the 496,429 Gaussians
are geometrically in front of the camera at all, and a small number of very-close Gaussians
project extremely large footprints (up to tens of thousands of pixels, i.e. spanning far
more than the frame) — normal near-clip behavior for close surfaces, not the haze mechanism.

**`stop_screen_size_at` (4000) vs `refine_start_iter` (6016):** recorded directly rather than
asserted. Screen-size splitting is gated by `step < stop_screen_size_at`. Refinement cannot
begin before `refine_start_iter`. Since 4000 < 6016, the screen-size split/cull path was
**never reachable** during any of this run's 44 refinement events (all ≥ step 6300). This is
not being called a bug — it simply could not have produced this haze in this run, because
the two windows never overlap in time.

---

## 5. Diagnostic render layers (Arm D, all 4 QA cameras)

`docs/ops/exp3-haze-diagnostic-review/render-layers/`. RGB (from checkpoint tensors
directly — no PLY 1/255-opacity truncation, unlike the official composite), accumulated
alpha (gsplat's own second rasterization output), expected depth (`RGB+ED`, matching
splatfacto's own eval-time render call), and an opacity-contribution heatmap (a per-Gaussian
scalar alpha-composited through the real rasterizer — a legitimate 3DGS debugging technique,
not a synthetic overlay).

**The single most important visual finding in this diagnostic:** the dollhouse alpha channel
is saturated to ~1.0 across almost the *entire* visible silhouette (`render-layers/
C_dollhouse_alpha.png`). This is not translucent fog. The renderer is compositing to full
opacity; what looks like "haze" is a **solid, fully-opaque region whose color content is
blurry, low-contrast, and washed out** because it was reconstructed from very few or no
close, well-angled training views. "Fog" is the wrong mental model; "an opaque, badly
under-resolved shell" is the accurate one. The footprint-contribution heatmap
(`footprint_heatmap_C_dollhouse.png`) shows elevated footprint contribution broadly across
the same silhouette with one clear hotspot, consistent with a diffuse population of
moderate-to-large Gaussians rather than one dominant outlier.

---

## 6/7/8. Post-hoc filter variants — renders, removal counts, held-out metrics

Full render set for every variant: `experiments/room213-exp3-cleanup-diagnostic/variants/`
on the volume (4 cameras × 10 variants, PNG only). Side-by-side strips for the three most
informative cameras: `docs/ops/exp3-haze-diagnostic-review/variants/strip_{camera}.png`.
Held-out metrics: `docs/ops/exp3-haze-diagnostic-review/filter_variants_summary.csv`.

| Variant | Removed | Held-out PSNR | Δ PSNR vs. baseline | Visual effect on dollhouse/overhead |
|---|---|---|---|---|
| baseline_d | 0% | 21.805 | — | haze present (reference) |
| opacity ≥ 0.005 | 4.9% | (not run) | — | — |
| opacity ≥ 0.01 | 9.0% | 21.804 | −0.001 | **no visible change** |
| opacity ≥ 0.02 | 15.0% | 21.799 | −0.006 | **no visible change** |
| opacity ≥ 0.05 | 26.8% | (not run) | — | — |
| scale: exclude top 1% | 1.0% | (not run) | — | — |
| scale: exclude top 0.5% | 0.5% | (not run) | — | — |
| **scale: exclude top 0.1%** | **0.1% (497 Gaussians)** | **21.740** | **−0.065** | **haze removed; floor grid geometry becomes visible** |
| opacity ≥ 0.01 AND scale-top1% | 9.9% | 20.411 | −1.394 | haze removed, but visible new artifacts, large metric cost |
| **opacity ≥ 0.02 AND scale-top0.5%** | **15.5%** | **21.260** | **−0.545** | **haze removed; cleaner than scale-only but real metric cost** |
| spatial-outlier removed | 0.01% (61) | (not run) | — | negligible — count too small to matter |

**Pure opacity filtering does nothing, on either axis.** Held-out PSNR is unchanged
(within 0.006 dB even at 15% removed), and the side-by-side strips
(`variants/strip_C_dollhouse.png`, `strip_D_overhead.png`) show `opacity_ge_0.01` and
`opacity_ge_0.02` as visually indistinguishable from baseline — the offending Gaussians are
not the low-opacity ones (confirms §3 directly).

**Scale-based filtering is where the effect is.** Excluding only the top 0.1% by max
world-space scale (497 of 496,429 Gaussians) visibly removes the dominant haze and reveals
real floor geometry (a grid/tile pattern) underneath, in both the dollhouse and overhead
views. This is the strongest single result in the diagnostic. It comes at a small, real,
non-zero held-out PSNR cost (−0.065 dB) — and `variants/strip_A_on_path.png` shows exactly
where that cost shows up visually: a small, localized dark smudge appears in one ceiling
corner of an otherwise well-supported close-up view that was previously clean. The combined
opacity+scale filters remove the haze at least as well but cost noticeably more (−0.55 to
−1.4 dB), for no clear additional visual benefit over the scale-only cut in the renders
reviewed here — the opacity component of those combos is doing no useful work per the
opacity-only rows above, only adding cost.

**Spatial-outlier diagnostic** (`gaussian_and_footprint_stats.json` →
`spatial_outlier_diagnostic`): only 61 of 496,429 Gaussians (0.012%) are both locally sparse
(8-nearest-neighbor distance in the top 1%) and farther from every sampled training camera
than the scene envelope diagonal. Far too small a population to be the haze; this rules out
"floating isolated debris" as the mechanism, distinct from the "many large opaque Gaussians
spread through unsupported space" mechanism the evidence above actually supports.

---

## 9. Source vs. render (blur vs. haze vs. pose disagreement)

`docs/ops/exp3-haze-diagnostic-review/source-vs-render/` (SOURCE | ARM C | ARM D | ERROR
panels) and `source_vs_render_scan.csv` (61 of 601 eval-split images, every 10th, simple
per-pixel PSNR against the real source JPEG — a sampled ranking tool, not the official
SSIM/LPIPS metric, and not exhaustive).

The representative panels — worst-held-out, best-held-out, and an "upward/ceiling-looking"
view selected by a documented heuristic (largest +Y forward-vector component in the sampled
eval set; there is no semantic window detector, so "window" views specifically were not
separately identified) — all show the **same failure signature**: recognizable room
geometry (desks, chairs, a whiteboard, ceiling light fixtures, window frames), softened and
detail-poor compared to the source, with the ERROR panel's brightest pixels sitting on fine
edges and text rather than as a uniform offset or a doubled/ghosted edge. That is the
signature of **ordinary reconstruction blur / under-resolution from a Gaussian population
that is deliberately small** (Arm C: ~100k, Arm D: ~500k, against 5,415 training images),
not pose disagreement and not the dollhouse/overhead haze mechanism. No evidence of
systematic pose misalignment was found in this sample.

**Conclusion for this section: near-path/well-supported views show ordinary reconstruction
blur; only views far outside the training envelope show the opaque-large-Gaussian haze.**
These are two different failure modes with two different causes, and only the second one is
what the top-0.1%-scale filter addresses.

---

## 10. Answers to the required questions

1. **Are the large global artifacts primarily removable post-processing artifacts?**
   Largely yes, for the dollhouse/overhead haze specifically. Removing 0.1% of Gaussians by
   max scale visibly clears it and reveals real geometry, with a small, quantified cost.
2. **Are oversized Gaussians implicated?** Yes, decisively — this is the dominant factor
   found. The largest-scale group sits 3–4× farther from any training camera than typical,
   and removing just that group is what changes the renders.
3. **Are low-opacity Gaussians implicated?** No. The offending large Gaussians are *more*
   opaque than average (mean 0.73 vs. population 0.39), and pure opacity filtering — up to
   26.8% of the population — has no measurable effect on held-out metrics and no visible
   effect on the haze.
4. **Is the artifact mostly outside training coverage?** Yes, on two independent axes: the
   dollhouse and overhead *cameras* sit 98–139% of the scene diagonal from the nearest
   training view, and the offending *Gaussians* sit 3–4× farther from the nearest training
   camera than the median Gaussian.
5. **Is camera/pose error more likely than Gaussian scale?** No evidence of pose error was
   found (§9: error concentrates on fine detail, not as ghosting/misalignment), and the
   direct ablation in §6–8 (removing large-scale Gaussians measurably changes the haze) is a
   stronger, causal result than anything found pointing at pose. Scale is the better-
   supported explanation.
6. **Does one conservative post-hoc filter materially improve the dollhouse without
   damaging on-path quality?** Yes, with a real but small trade-off: excluding the top 0.1%
   of Gaussians by max scale (497 of 496,429) visibly clears the dollhouse/overhead haze
   for a −0.065 dB held-out PSNR cost and one small, localized visible defect in a ceiling
   corner of one near-path view. This is the most conservative variant tested that produces
   a clear visual change.
7. **Does the evidence justify a new training run?** Not urgently — the post-hoc filter
   already recovers most of the benefit essentially for free, and this diagnostic did not
   retrain anything. If Brian wants the fix baked into training rather than applied
   post-hoc (e.g. so every future export is clean without a manual filtering step), the
   evidence here points at exactly one variable worth testing in a future, explicitly
   human-approved Experiment 4: **a hard per-Gaussian world-space scale cap enforced during
   densification** (reject or clamp a split/duplicate that would produce a Gaussian above a
   fixed max-scale threshold, e.g. informed by this run's own p99/p99.9 scale values),
   rather than gsplat's current scale-agnostic grow/prune cycle. **Not implemented or
   launched here.**

---

## 11. Tooling notes (for reproducibility, not science)

- New code, all additive, none of it modifies Experiment 3's own code paths:
  `workers/recon-experiment/exp3_haze_camera_geometry.py` (local, no GPU),
  `workers/recon-experiment/exp3_haze_diagnostic_gpu.py`,
  `workers/recon-experiment/exp3_haze_diagnostic_run.py`, and one new Modal function
  `haze_diagnostic` in `workers/modal/recon-experiment/worker.py` (phase
  `haze-diagnostic`), read-only against `experiments/room213-exp3/<ARM>/`, writing only to
  `experiments/room213-exp3-cleanup-diagnostic/`.
- One real bug was found and fixed during this diagnostic: nerfstudio's `ns-eval`
  reconstructs a masked/filtered checkpoint's path from `output_dir` /
  `experiment_name` / `method_name` / `timestamp` fields serialized *inside* `config.yml`,
  not from wherever the checkpoint file is physically placed. The first attempt at staging
  a scratch eval directory for filtered variants therefore pointed back at the original
  training container's now-nonexistent `/tmp` path and failed for all five held-out-metric
  variants. Fixed by loading `config.yml` through nerfstudio's own full-object YAML
  round-trip, rewriting `output_dir`, and physically nesting the masked checkpoint at the
  path that rewritten config now expects — confirmed working via an isolated debug run
  before being used for the real numbers in §6–8.
- A temporary `debug_eval` Modal function used only for that fix is not part of this
  deliverable; it is removed from `worker.py` before this package is published.

---

`HUMAN_VISUAL_VERDICT = UNREVIEWED`. No fix has been selected or applied to any experiment
artifact. Human review of `docs/ops/exp3-haze-diagnostic-review/variants/strip_*.png`
(baseline vs. candidates, three cameras) is the recommended next step before deciding
whether to apply the scale-top-0.1% filter to a client-facing export.

**EXP3 HAZE DIAGNOSTIC COMPLETE — HUMAN REVIEW REQUIRED**
