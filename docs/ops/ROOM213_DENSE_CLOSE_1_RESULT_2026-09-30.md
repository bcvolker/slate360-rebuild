# R213-DENSE-CLOSE-1: result and densification diagnosis (2026-09-30)

**Verdict: FAIL on the primary gate (the planar table corner).** Per the stop rule, no further training was run.

## Run (as approved)

**Data.** A's exact 1016 registered images, plus **90 added frame pairs (180 images)** from the official `sam extract -s 8 -k 3 --sync -q 95`:
- inside E0: 30 pairs;
- inside E1: 28 pairs;
- inside E9: 32 pairs;
- every added frame is at least 4 source frames from every original A frame;
- all **2040 reserved ±1/±2 holdout frames** stayed out of training (overlap 0).

**Masks.** Official `sam mask` + `sam track` for the new frames; A's masks copied unchanged.

**SfM and training.** The **same deployed official stages** that built A (`cap_official.pipeline`, sfm + train): v2026.9.24, `360-camera`, 30k steps, 1M cap, no step compensation.
- SfM: 1194 of 1200 images registered, 1.12 px mean reprojection (A: 1.13).
- Training: 5970 views, 28 min 09 s.

**Pre-launch exposure** (estimated from the sampler):
- Visits per image: 29.5 (A) → **25.1** (−15% for every unaffected image).
- Close-window images (upper bounds): table 4 → 4+16, armrest 5 → 5+17, cable 9 → 9+26.

**Comparison.** Renders at the **same physical cameras**, mapped A → Adense by a similarity fitted on 1014 shared images (1.3 mm median residual, 4.3 mm p95), using the same harness, the same never-trained neighbour holdouts and the same novel midpoints.

**Cost.** About $4–5 GPU/CPU (estimated from runtimes).

## Results (A → Adense)

| | Table corner (PRIMARY) | Armrest (secondary) | Cable box (supporting) |
|---|---|---|---|
| Edge width, training → render (close) | 2.12 → 4.79 px **→ 5.01 px** (×2.25 → ×2.45) | 2.30 → 3.70 → **3.51** px (×1.75 → ×1.57) | 5.55 → 7.17 → **6.02** px |
| Edge position error after alignment (px) | 0.66 → 1.69 | 0.49 → 0.39 | 0.70 → 0.83 |
| Holdout retention, 1-2 / 2-4 px | 0.62 / 0.67 → **0.56 / 0.67** | 0.81 / 0.88 → 0.81 / 0.89 | 0.63 / 0.81 → **0.78 / 0.88** |
| Fine energy vs repeatable signal, 1-2 / 2-4 px | 0.59 / 0.77 → **0.51 / 0.64** | 0.59 / 0.75 → 0.58 / 0.70 | 0.52 / 0.68 → **0.69 / 0.79** |
| Novel midpoints vs close consensus, 0.5–1 / 1–2 mm | 0.64 / 0.78 → **0.40 / 0.54** | 0.51 / 0.71 → 0.62 / 0.80 | 0.42 / 0.62 → 0.45 / 0.65 |
| Visual (`dense_training_views.png`, `dense_novel_*.png`) | Identical softness, no texture; stable, no ghosting or floaters; slight positional shift | Unchanged | Cable slightly crisper |

**Table far views:** edge ratio ×1.50 → ×1.26. This is not a target, but noted.

**Primary gate:** the table edge ratio moved **away from** ≤1.5× (2.25 → 2.45). There is no visible improvement and no retained texture. **FAIL.**

## Diagnosis: did the added views cause local refinement, and did the cap block it?

**1. Where local densification happened, quality followed.** Gaussians within 3 / 6 cm of each target (A → Adense), with sizes as the major-axis median in mm:

| Target | Count within 3 cm | Count within 6 cm | Size change | Quality change |
|---|---|---|---|---|
| Cable box | 37 → **73** | 133 → **289** | 4.7 → 4.4 (p10 3.2 → 2.5); minor axis 1.16 → 0.93 | improved |
| Armrest | 43 → 60 | 97 → 143 | 7.2 → 7.6 | marginal |
| Table corner | **23 → 28** | 92 → 112 | **8.2 → 8.6 (p10 3.8 → 4.3)** | none |

The added close views drove real local refinement for the cable, and there measurable quality followed. The table received almost no refinement, and its primitives stayed ~8 mm, against a ~1.6 mm edge ramp.

**2. The cap is reached almost immediately.**
- A hits 1M at **step 1401**; Adense at **step 1001**, because its 809k SfM seed points (A: 665k) start closer to the cap.
- In Spirula's revised MCMC-style densification (`EngineDensify.cpp:305-321`), each refinement adds `min(cap, 1.05·N) − N` new splats. At the cap that is **zero**.
- From then on (step ~1000 to 14,000), only **dead splats (opacity < 0.005) are relocated** by long-axis split, toward high-score regions of the `ssim_cs` loss map.

**3. The pool left to reallocate is small, and the room is represented coarsely.**
- The final models have only **1.3–1.4%** of splats below opacity 0.02.
- Median Gaussian size is **~9.5 mm**; only **3.4–3.8% are under 3 mm**; 15% are over 30 mm.
- Adding views therefore redistributes a fixed budget: gains near the cable, −15% exposure everywhere else.

**Conclusion.**
- **Plausible:** hitting the 1M cap at ~3–5% of training blocks further local representation. Refinement then becomes a zero-sum relocation of a ~1% dead pool, and the room sits at ~1 cm primitive scale, too coarse for 1.5–3 mm close features.
- **Not established:** that the cap alone explains the table. Even with 4–5× more close views, relocation barely touched the table corner while it doubled the cable's splats. That suggests the **allocation signal** also under-ranks a soft, low-texture straight edge.
- The two effects (**total budget** vs **where the densifier spends it**) cannot be separated without a further training run. None was launched, per the stop rule.
- Geometry remains a minor contributor. Adense's table positional error rose to 1.7 px aligned, which fits one more re-solved SfM, not a new cause.

**No cap, optimiser or densification change is proposed here.** That waits on review of this diagnosis.

## Separate production issue (not changed; does not explain this lens-0 result)

A+ solves **each clip × lens independently**: 8 cameras, 4 rigs. Physical lens 1 comes out with fx 1070.5 / 1082.5 / 1076.8 / 1072.0 across clips 077–080, a 1.1% spread, which is about 10 native px at the fisheye periphery. Multi-clip datasets should share per-lens intrinsics, or at least be checked for this.
