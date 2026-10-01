# Room 213: close-detail loss, final pre-training diagnostic (2026-09-30)

**Scope.** Diagnostic only. No training, no extraction change, no calibration change. Compute was local only, $0.

**Tools and inputs.**
- Code: `workers/modal/room213-forensic/analyze_edges.py`.
- Data: the close-pass lineage (`prep_cp1`, native A/A+ renders, never-trained neighbour frames).
- Artifacts: `docs/ops/room213-close-detail-2026-09-30/`.

## 1. Displacement vs blur (camera space, A's own training cameras)

**Method.**
- Strong edge points are taken on the **exact training pixels**, inside a 112 px window at the target.
- 1-D profiles are sampled along each edge's gradient in four images: the training pixels, the never-trained ±1 neighbour frames, the render **unaligned**, and the render **aligned**.
- **Aligned** means one global 2-D shift of at most 3 px from band-pass phase correlation. It is recorded for diagnosis only and is never part of any quality score.
- Each profile gives a sub-pixel 50% position and a 10–90% width.

| Target, close views | Edge position error, unaligned → aligned | Shift used | Edge width: training → render (aligned) | Neighbour/training width | Contrast render/training |
|---|---|---|---|---|---|
| T_table (table-top corner, planar), 4 views at 0.8–1.0 m | 1.41 → 0.66 px | 1.14 px | **2.12 → 4.79 px (×2.3)** | 1.03 | 1.11 |
| T_table, mid, 4 views at 1.1–1.35 m | 0.66 → 0.37 | 0.72 | 1.55 → 2.97 (×1.9) | — | 1.08 |
| T_table, far, 26 views at ~2 m | 0.38 → 0.21 | 0.43 | 1.87 → 3.19 (×1.6) | — | 1.07 |
| T_mix (armrest), 5 views at 1.0–1.3 m | 0.65 → 0.49 | 0.37 | **2.30 → 3.70 (×1.6)** | 1.13 | 1.03 |
| T_mix, far, 19 views at ~2.4 m | 0.56 → 0.39 | 0.66 | 3.00 → 4.04 (×1.35) | — | 1.04 |
| T_chair (cable box), 9 views at 0.56–0.83 m | 1.15 → 0.70 | 0.56 | 5.55 → 7.17 (×1.15–1.3) | 1.00 | 0.91 |

- **Per view:**
  - T_table's training edges are 1.6–2.3 px in all 4 close views, and the render gives 3.3–6.0 px.
  - T_mix: 1.8–2.5 px in the training views, 3.5–4.9 px in the render.
  - T_chair's source edges vary 2.5–8.5 px from view to view (per-view motion blur at 1/100 s).
- **Visual** (`displacement_vs_blur.png`, training vs render with **no** alignment, plus the difference): the edges sit in the same place. Differences appear as thin symmetric lines on both sides of each edge (broadening), not one-sided light/dark pairs (displacement). Surface texture is absent in the render.
- **Answer to the key question: yes.** After removing the small positional disagreement (≤1.4 px), the render is still **materially broader** than the training observation at close range: ×2.3 table, ×1.6 armrest. The same edge in a never-trained neighbour frame has the same width as the training frame (×1.0–1.1), so the source edge width is real and repeatable.
- The broadening also exists at far range (×1.35–1.6) and grows with closeness.

## 2. Close-view geometry

**How well the source observations agree with each other:**
- T_table close views agree on the (valid) table plane to **0.57 training px** median.
- SfM track reprojection near the targets (native px, median / p90):

  | Target | Close | Far |
  |---|---|---|
  | T_table | 1.64 / 2.84 | 1.00 / 2.39 |
  | T_mix | 1.15 / 2.05 | 0.96 / 2.28 |
  | T_chair | 0.93 / 2.65 | 1.20 / 2.15 |

  These include SIFT localisation noise, so they are **upper bounds** on pose/calibration inconsistency.

**Could the disagreement alone explain the broadening?**
- Averaging views that jitter by σ widens a 10–90% edge to about √(w² + (2.56σ)²).
- T_table: w = 2.12 px and σ = 0.57 px (measured on the plane) predict **≈2.6 px**. The render is **4.8 px**.

**Classification**

| Target | Classification | Basis |
|---|---|---|
| **T_table** (planar, measured) | `TRUE_RECONSTRUCTION_SOFTENING` | Geometry explains ≲25% of the extra width. |
| **T_mix** (non-planar, so no planar claim) | `BOTH` | Upper-bound SfM disagreement (≈0.9 training px) could explain up to about half. |
| **T_chair** (cable box) | `INCONCLUSIVE` | Source sharpness itself varies 2.5–8.5 px by view (motion blur), so the model can't match all views. |

**Also relevant:**
- `use_camera_optimizer = false`, so SfM poses stay fixed during training.
- The Gaussian cap (1M) was reached at step ≈1.4k of 30k in every run. Densification capacity is therefore a candidate cause, but out of scope (no more Gaussians).

## 3. Calibration grouping (no change made)

- **A (079):** 2 lens cameras, one per physical lens, plus 1 dual-fisheye rig.
  - Lens 0: fx 1079.1, k1 0.073.
  - Lens 1: fx 1078.1, k1 0.056.
  - Rig baseline 2.79 cm.
- **A+ (077–080):** **8 independent lens calibrations** (clip × lens) and **4 independent rigs**. Nothing is shared.
  - Physical lens 0 is consistent: fx 1078.9–1079.5, k1 0.074–0.076.
  - **Physical lens 1 is not.** fx is 1070.5 / 1082.5 / 1076.8 / 1072.0 (a 1.1% spread) and k1 is 0.075 / 0.048 / 0.059 / 0.070.
  - Rig baselines are 2.3–2.8 cm.
  - All three close targets are seen through lens 0 in A, so this doesn't touch them. It is a real multi-clip consistency risk for A+ (on the order of 10 native px at the lens periphery).

## 4. Decision: exactly one next training experiment

On the only target where geometry could be measured on a valid plane, genuine reconstruction softening dominates, and **close support is sparse** there (4 views within 1 m). Per the approved decision tree, the next step is a local, controlled denser-extraction experiment. A pose/calibration refinement is not indicated for these lens-0 targets.

**R213-DENSE-CLOSE-1 (proposed, NOT launched)**

**Base:** A's exact 1016 training images, unchanged (byte copies).

**Addition:** extra frames from 079, **only inside the three close-pass windows** that contain the targets:
- E0, 12–27 s (T_mix);
- E1, 36.5–50.5 s (T_table);
- E9, 204–218 s (T_chair).

**Source of the extra frames:** the official extractor, `sam extract -s 8 -k 3 --sync -q 95`, run into a scratch folder. A candidate is kept only if it:
- falls inside a window;
- is at least 4 source frames from every original A frame, which avoids near-duplicates and protects the holdouts.

**Reserved evaluation frames, declared before selection:**
- For every close observation of the three targets, the never-trained neighbours at idx ±1 and ±2 (already decoded and validated) are holdouts.
- Any candidate within ±3 frames of an original is excluded, so no holdout can enter training.
- A short novel-view path is also reserved: 7 poses sliding about 20 cm past each target at the observed height.

**Unchanged recipe:** official `sam mask`/`sam track` masks for the new frames; official `sfm auto` with A's flags and manifest on the augmented set; official `train 360-camera`, identical config, 30k steps, 1M cap.

**Expected exposure** (from the sampler code; confirmed on the real counts before launch):
- About 80 new frame pairs (160 images), so ≈1176 inputs and ≈25.5 visits per image (A had 29.5).
- Close views of each target roughly double: T_table 4 → about 8.
- Total close-view exposure rises about +70%. Everywhere else, per-image exposure falls about 14%.

**Cost and time:** extraction ~3 min, masks ~3 min, SfM ~5 min, training ~30 min on L40S, renders and analysis ~5 min. About **50 min, ≈$3–4** including CPU and RAM (checked with `modal billing report` before launch).

**Success (all visual, native Spirula first):**
- At the reserved neighbour holdouts and along the novel-view path: sharper table-banding and armrest edges, a better-defined cable, texture that correlates with the source, and no new floaters or ghosting.
- The improvement holds through the short movement, not only at training cameras.
- Supporting numbers: the T_table close edge-width ratio drops from 2.3 toward ≤1.5, and repeatable-signal retention rises.
- No regression at far targets.
- A metric-only gain does not count.

**If it fails:** extra views don't cure the softening. That points at optimisation or capacity (the 1M cap is reached at step ≈1.4k), which is outside the current bounds and needs separate approval. Geometry would stay a secondary suspect for non-planar targets.
