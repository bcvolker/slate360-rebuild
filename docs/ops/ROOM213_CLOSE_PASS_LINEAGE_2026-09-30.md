# Room 213: close-pass training lineage audit (2026-09-30)

**Scope.** Read-only and render-only. Nothing trained, nothing extracted differently, no sampler or Spirula changes. Cost was about $1.

**Code** (`workers/modal/room213-forensic/`):
- `closepass.py`: route analysis, storyboard.
- `forensic_prep.py` (`prep_v6`, `native_orthos_v6`, `mask_cover_v1`).
- `run_renders_A.py`: native renders of A and A+ at identical cameras.
- `adjacent.py`: decodes the never-trained neighbour frames from the original `.insv`.
- `analyze_close.py`, `repeatability.py`.

**Artifacts:** `docs/ops/room213-close-pass-2026-09-30/`.

## 1. The close passes (all four 9/29 clips)

**Route.** `route_map.png` shows the A+ SfM trajectories.
- **079** (red) runs down the centre aisle and then makes **12 out-and-back passes between the desk rows**, E0–E11, alternating toward the window wall and the whiteboard/door walls.
- **080** makes 2 diagonal cuts through the rows (E12–E13).
- **077 and 078** stay in the aisle.

**Storyboard** (`storyboard_between_rows.jpg`): each pass, shown at its far-end turnaround with the lens facing the wall so the pass is recognisable.

| Pass | Clip | Time (s) | Extracted pairs | Spacing | Walk (median) | Nearest furniture (median / min) | Shutter |
|---|---|---|---|---|---|---|---|
| E0 | 079 | 12–27 | 31 | 17 cm | 0.34 m/s | 1.05 / 0.82 m | 1/200 |
| E1 | 079 | 36–50 | 29 | 20 cm | 0.40 | 0.93 / 0.58 | 1/200 |
| E2 | 079 | 61–76 | 30 | 20 cm | 0.40 | 0.96 / 0.85 | 1/100 |
| E3 | 079 | 84–95 | 24 | 25 cm | 0.51 | 0.99 / 0.83 | 1/100 |
| E4 | 079 | 103–124 | 43 | 13 cm | **0.25** | 0.88 / 0.74 | 1/100 |
| E5 | 079 | 127–139 | 25 | 24 cm | 0.48 | 1.41 / 0.90 | 1/144 |
| E6 | 079 | 147–161 | 28 | 20 cm | 0.40 | 1.06 / 0.74 | 1/103 |
| E7 | 079 | 168–179 | 22 | 24 cm | 0.47 | 1.33 / 1.08 | 1/100 |
| E8 | 079 | 187–197 | 22 | 25 cm | 0.50 | 1.24 / 0.97 | 1/114 |
| E9 | 079 | 204–218 | 29 | 25 cm | 0.50 | 0.85 / 0.63 | 1/100 |
| E10 | 079 | 222–236 | 30 | 19 cm | 0.38 | **0.67 / 0.53** | 1/100 |
| E11 | 079 | 243–252 | 19 | 30 cm | 0.60 | 1.34 / 0.72 | 1/100 |
| E12 | 080 | 4–13 | 18 | 26 cm | 0.52 | 2.08 / 1.21 | 1/200 |
| E13 | 080 | 16–27 | 23 | 22 cm | 0.44 | 1.87 / 1.33 | 1/140 |

**How the figures were measured:**
- **Nearest furniture:** distance to the 20th-nearest SfM point the frame actually tracks, at heights 0.05–2.3 m.
- **Speed:** from consecutive extracted poses, 0.5 s apart.
- **Shutter:** per frame, from the `.insv` trailer. The clip medians are 1/121 (077), 1/100 (078), 1/100 (079) and 1/140 (080).

The between-row walking was **not markedly slower** than the aisle: about 0.4 m/s median against 0.44 m/s. The turnarounds were the slowest parts, at 0.03–0.1 m/s.

## 2. What Spirula used (A = 079; A+ = 077 + 078 + 079 + 080)

**Recorded.** Yes: continuous `.insv` video, 3840² per lens, 29.97 fps.

**Extracted.** `sam extract -s 15 -k 3 --sync -q 95`.
- **Rule:** in every 15 source frames it looks at the three frames whose index is 12, 13 or 14 (mod 15), keeps the sharpest, and writes both lenses (`FrameExtract.cpp:66`, `sam_extract.cpp:221`). In 079 the kept offsets were 185 at 12, 151 at 13 and 174 at 14.
- **Result:** 2 fps, and 14 of every 15 recorded frames are never used.
- **079:** 7662 frames decoded, 1530 measured, **510 pairs written**, of which **332 (65%) fall in the between-row passes**.
- **A+:** 897 pairs = 163 (077) + 135 (078) + 510 (079) + 89 (080).

**Registered.**
- **A:** 508 of 510 pairs. The only failures are 2 consecutive pairs at 153.6–154.1 s, inside E6.
- **A+:** all 897 pairs listed above are registered.

**Masked.** The actual eroded training masks keep **100% of every target patch** in every observation audited (`mask_cover.json`). SAM removed nothing from the chair, the table or the cable.

**Projected.** Close observations land on faces 0/1 with training/native sampling of 0.92–1.15, so the face-centre minification loss is negligible here. The training faces are the exact tensors (`faces_T_*.jpg`, `lineage_T_*.jpg`).

**Training.** Every registered frame trains (`eval_mode all`).

**Sampling** (estimated from code; per-image counts are not logged):
- 1 input image per step, shuffled each epoch.
- **A:** 1016 input images → ≈29.5 visits per image over 30k steps.
- **A+:** 1794 input images → ≈16.7 visits. **Adding 077, 078 and 080 cut each 079 close image's exposure by 43%**, a factor of 0.57.

## 3. Close targets (A's frame; the SfM points picked them, not a person)

| Target | What it is | Close observations (≤1.3 m) | Also far |
|---|---|---|---|
| T_chair | Table-top power/data box with a thin black cable (**not** a chair; SfM chair-mesh points are too sparse) | 9 frames, 0.56–0.83 m, E9 (208–215 s) | — |
| T_table | Table-top corner with dark edge banding | 4 frames at 0.79–0.97 m (E1) + 4 at 1.1–1.5 m | 26 frames, 1.9–2.7 m |
| T_mix | Chair armrest | 5 frames, 1.04–1.3 m (E0) | 25 frames, 2.2–3.4 m |

**Lineage sheets** (`lineage_T_*.jpg`), one row per close observation:
1. original lens crop;
2. exact training face;
3. native **A** render at that camera;
4. native **A+** render at that camera.

**Neighbour frames** (`adjacent_frames.jpg`): the never-trained frames ±1 and ±2 around each trained frame.

## 4. Does close video contain more real detail?

**Two measures.** Both avoid planar proxies and both ignore raw high-frequency energy.
- **Neighbour repeatability.** Each trained frame is compared, on a 112 px window around the target, with its never-trained ±1 frame, decoded from the original `.insv` through the same training-face warp.
  - The decode matches Spirula's extracted JPEG at fine-band NCC 0.990–0.995, mean difference 0.85/255.
  - HEVC inter-frame prediction makes this an **upper bound** on real repeatable detail.
- **Cross-view coherence.** Registered close views 0.5 s apart, on the local target plane. This is the lower bound.

| Target, group | Train px/mm | Neighbour repeatability, bands 1-2 / 2-4 / 4-8 / 8-16 px | Cross-view coherence in mm (0.5–1 / 1–2 / 2–4 mm) |
|---|---|---|---|
| T_chair CLOSE | 1.33 | 0.51 / 0.83 / 0.95 / 0.97 | 0.24 / 0.49 / 0.41 (non-planar box) |
| T_table CLOSE | 1.36 | 0.43 / 0.58 / 0.73 / 0.86 | 0.25 / 0.40 / 0.71 |
| T_table FAR | 0.48 | 0.62 / 0.76 / 0.91 / 0.97 | — |
| T_mix CLOSE | 1.16 | 0.49 / 0.69 / 0.89 / 0.98 | 0.38 / 0.62 / 0.86 |
| T_mix FAR | 0.49 | 0.57 / 0.79 / 0.94 / 0.99 | — |

- **Per pixel, close ≈ far.** The information floor is fixed in pixels, about 1.5–2 training px, as found on 9/21.
- **Close views put 2.4–2.8× more pixels on each millimetre,** so the same repeatable pixel band now resolves **≈1.5–3 mm** instead of ≈4–8 mm.
  - The cable, the box edges and the edge banding are resolved close up.
  - At 2 m and beyond, the same features fall below the floor.
- **Local geometric agreement:** close views land within 0.57–0.90 training px of each other on the target plane, measured on the plane.
- **Sharpest-of-3 frame selection** makes the kept frame only 0–5% sharper than its neighbours.
- **Estimated 1/100 s motion blur is large up close:** at 0.4 m/s and 0.7 m, (v/d)·t·f ≈ 6 native px, along the direction of motion. The repeatability shows it has not wiped out the close-range gain.

## 5. Did the close observations influence the model?

"Retained" = NCC(render, never-trained neighbour) / √(neighbour repeatability). A value of 1.0 means the render holds all the repeatable detail and none of the noise. "Energy/repeatable" = render band energy / repeatable band energy.

| Target, group | A retained (1-2 / 2-4 / 4-8 / 8-16 px) | A energy/repeatable | A+ retained | A+ energy/repeatable |
|---|---|---|---|---|
| T_chair CLOSE | 0.63 / 0.81 / 0.93 / 0.96 | 0.52 / 0.68 / 0.87 / 0.94 | 0.63 / 0.82 / 0.90 / 0.94 | 0.57 / 0.75 / 0.84 / 0.90 |
| T_table CLOSE | **0.62 / 0.67 / 0.72** / 0.84 | 0.59 / 0.77 / 1.04 / 1.14 | 0.61 / 0.72 / 0.85 / 0.92 | 0.62 / 0.76 / 0.98 / 1.08 |
| T_table FAR | 0.85 / 0.90 / 0.97 / 0.99 | 0.85 / 0.96 / 1.12 / 1.17 | 0.74 / 0.86 / 0.94 / 0.98 | 0.68 / 0.90 / 1.11 / 1.15 |
| T_mix CLOSE | 0.81 / 0.88 / 0.94 / 0.98 | 0.59 / 0.75 / 0.91 / 0.99 | 0.75 / 0.83 / 0.92 / 0.97 | 0.52 / 0.67 / 0.83 / 0.93 |
| T_mix FAR | 0.65 / 0.80 / 0.90 / 0.97 | 0.68 / 0.74 / 0.89 / 1.02 | 0.65 / 0.78 / 0.88 / 0.97 | 0.57 / 0.68 / 0.85 / 0.97 |

- **Camera-space fit:** A's renders at its own close training cameras sit **≈2 px** off those pixels for T_chair and T_table, against ≈0.5 px for far views. That is local multi-view compromise at close range.
- **A+ vs A at close cameras:** equivalent once the known model-to-model transform residual (5–10 px at close range) is removed.
- **Nearby novel midpoints:** they match the close-view consensus at or above the real-frame leave-one-out ceiling (`close_metrics.json`). That consensus is a median of close views and therefore soft, so this is a lenient test.

**Classification per target**

| Target | Classification | Basis |
|---|---|---|
| **T_mix** (armrest) | `CLOSE_DETAIL_RECONSTRUCTED` | Retains 0.81 / 0.88 of the close repeatable signal, at least as well as far. |
| **T_chair** (cable box) | `CLOSE_DETAIL_RECONSTRUCTED`, partial | 0.63 / 0.81 retained; finest band keeps about 52% of repeatable energy. Visibly softer than the training face. |
| **T_table** (edge banding) | `CLOSE_DETAIL_REACHES_TRAINING_BUT_MODEL_LOSES_IT`, partial | Only 0.62 / 0.67 / 0.72 retained at close cameras, against 0.85 / 0.90 / 0.97 far. Only 4 frames within 1 m. A+ does better at 4–8 px (0.85). Visibly softer banding edge in the renders. |

## 6. Extraction cadence

- 2 fps, keeping the sharpest of frames 12–14 of each 15.
- During the between-row passes that is one view per 13–30 cm (median ~20 cm). At 0.6–1 m from the target, that is 11–19° between views, which is a useful baseline.
- Each close feature gets only **4–9 views within 1 m**.
- Going to 30 fps would add mostly near-duplicates: neighbours are 1–1.3 cm apart, with correlated HEVC content.
- **Smallest sensible change (hypothesis only, not demonstrated as necessary):** `-s 8 -k 3` (≈3.75 fps). Views would be 7–13 cm apart (6–10° at 0.7 m) and there would be about 2× more close views.
- **Caveat:** it would re-extract the whole clip, and with 30k fixed steps it halves per-image visits (≈15). The run would therefore change both support and exposure at once.

## 7. Exposure (estimates, from the sampler code)

| | Input images | Training views (5 faces each) | Visits per image (30k steps) | Visits per 079 close image |
|---|---|---|---|---|
| A | 1016 | 5080 | ≈29.5 | ≈29.5 |
| A+ | 1794 | 8970 | ≈16.7 | ≈16.7 (−43%) |

- A+ did not reproduce the close targets worse than A (see table §5), so the dilution is **not** shown to have mattered here.

## 8. Direct answers

**A. Did the between-row footage make it into A and A+ training?**
- Yes: 332 of 079's 510 pairs are between-row passes, about 65% of A's training images.
- They are in A+ as well. 508/510 pairs registered in A, masks are intact, and the passes are fully in training.

**B. Was it represented densely enough to matter?**
- Yes for the room as a whole: every between-row metre gets about 5 views, each visited about 30 times (A) or 17 times (A+).
- **Thin per feature:** 4–9 views within 1 m. T_table had 4.

**C. Does close footage contain substantially better real detail?**
- **Yes.** Pixel-level repeatability is the same close and far, but close views sample 2.4–2.8× more finely.
- Reliable detail reaches about 1.5–3 mm close up, against about 4–8 mm at 2 m.

**D. Does the Gaussian preserve that advantage?**
- **Mostly.** At close cameras it keeps 62–81% of the repeatable finest band and 67–88% at 2–4 px, about as much as at far cameras.
- But fine-band energy is only 52–59% of repeatable, and the renders are visibly softer than the training faces on T_chair and T_table.

**E. Where is the advantage first lost?**
- **Not** in extraction, registration, masking or projection.
- The **first measurable loss is in the reconstruction's fit at close range:**
  - ≈2 px camera-space offset at its own close cameras (local multi-view compromise), against ≈0.5 px far;
  - a 20–40% shortfall in the finest band.
- It is largest where close support is sparsest (T_table, 4 views).

**F. Does `VIDEO_INFORMATION_LIMIT_LIKELY` still hold?**
- **Refined.** The per-pixel information floor stands, and getting close lifts physical detail roughly in proportion.
- The room's softness is mainly where observations were far: aisle views at 2–3 m.
- There is also a **measurable secondary reconstruction loss at close range**, in the finest band and on sparsely supported features.
- **New primary classification:** `VIDEO_INFORMATION_LIMIT_LIKELY`, with `RECONSTRUCTION_LOSS_STILL_PLAUSIBLE` as a secondary for close, thin, sparsely supported features.

## 9. Correction proposal

**Not executed.** No hard failure is demonstrated: every stage delivers the close observations intact. The one partial loss (T_table) coincides with sparse close support and a ≈2 px close-view fit offset. The smallest bounded test, using the existing 079 data only, would be:
- re-extract 079 at `-s 8 -k 3` (about 2× close views);
- run the identical official SfM and `360-camera` training;
- evaluate with this harness against the same never-trained neighbour frames. Neighbours of the old extracted frames that become newly extracted must be swapped for other never-trained neighbours.

**Cost:** about 3 min of extraction, 6 min SfM and 45 min training on L40S, **≈$4–5**.

**Confound:** per-image visits drop from ≈29.5 to ≈15.

**Recommendation:** approve only if the finest-band close-range loss is the priority. Otherwise these findings support leaving the pipeline alone and capturing closer.
