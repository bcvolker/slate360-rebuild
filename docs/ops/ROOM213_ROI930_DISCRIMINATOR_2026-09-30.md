# R213 CONTROL vs TABLE-ROI discriminator (Spirula v2026.9.30): **ROI_DISCRIMINATOR_INVALID**

**Scope.** Two training runs, as approved. Stopped after them, with no extension.

**Spend.** About $6 GPU and CPU: 2 × ~28 min on L40S, plus renders and the census.

## Provenance (verified)

**Release and source:**
- Release tag v2026.9.30 = commit **`1943edaf83abf0d00b9ca2d2023424ba1e831d6a`**.
- The binary reports `2026.9.30 (1943eda)`.
- Zip sha256 `123d6d0b826388abb64129b6fcf2a8d34fe0662a57ba34e53212a148c891431d`.
- Binary sha256 **`1c4d54bbeda9e72bb9277c6525a949164e1bcdf0377d388dbf008419e9351736`**, **identical in both runs** (one image).

**ROI behaviour, from source at that commit:**
- `TrainerSession::setup_region`: the region is read in the **dataset's world frame** and the trainer maps it into its own training frame.
- `BoxRegion` defaults to identity rotation and uses a standard axis-aligned test.
- Splats outside the region draw for relocation and growth at `roi_outside_weight` (1e-4).
- `roi_mask_pixels` (default on) masks each image to what it shows of the region, and **keeps pixels no seed point covers**.

**Config:**
- CONTROL vs ROI resolved configs differ **only** in `roi_region`.
- v2026.9.24 (A) vs v2026.9.30 (both new runs) differ in **one changed default**: `alpha_loss_weight` 0.1 → **0.5**. The new ROI and partition fields are inactive in CONTROL.

**Frozen inputs:**
- A's images, masks, sparse poses and intrinsics; `360-camera`; 30k steps; 1M cap.
- Both runs: 1016 cameras (5080 views), 665,307 seeds, cap reached at **step 1401** (as in A).
- The same cameras, holdouts, renderer (frozen v2026.9.24 render path) and measurement scripts as every previous comparison.

## ROI (table only)

**Box** (A world frame): centre (0.1872, 3.8137, 0.70), half-extents (0.45, 0.45, 0.35) m.
- The table-edge target is inside with **≥324 mm** margin to every face. The measurement window spans ±41 mm.
- The armrest and the cable box are outside.
- Seed points inside: 742 of 665,307 (0.11%).

**Applied**, per the ROI log: "program nodes 1; splats outside draw with weight 0.0001"; "1016 images masked to what they show of it; 69% of pixels left out".

## Results

| | A (v2026.9.24) | CONTROL (v2026.9.30) | TABLE-ROI (v2026.9.30) |
|---|---|---|---|
| Table close edge width (training 2.12 px) | 4.79 px | **5.75 px** | not reconstructed (edge statistics measure blur: 9–10 px, contrast 0.2–0.45) |
| Table retention vs never-trained neighbours, 1-2 / 2-4 px | 0.62 / 0.67 | 0.69 / 0.78 | **−0.02 / 0.00** |
| Table fine energy vs repeatable signal | 0.59 / 0.77 | 0.53 / 0.67 | 0.06 / 0.04 |
| Armrest retention (outside the ROI) | 0.81 / 0.88 | 0.70 / 0.79 | 0.00 / 0.01 |
| Gaussians within 3 cm of the table edge, contributing (opacity ≥ 0.05) | 22 | 24 | **0** |
| Within 15 mm | 7 | 8 | **0** |
| Gaussians inside the ROI box | 1,299 (0.13%) | 1,258 (0.13%) | 1,705 (0.18%), median size 0.46 mm |
| Within the box + 20 cm | 0.35% | 0.35% | 1.30% |
| Height distribution: floor (z < 0.3 m) / ceiling (2.55–2.7 m) | — | 592k / 126k | **79k / 540k** |
| Total Gaussians | 998,762 | 998,737 | 969,957 (10.9% with opacity < 0.01) |

**Visual** (`roi_training_views.png`): at every table training camera, the ROI model shows a washed-out blur where the table edge is. CONTROL looks like A.

**Masks** (`roi_masks_table_views.jpg`): the trainer's own ROI masks for the table's close images keep the table top around the edge (100% within 150 px). They also keep **the whole whiteboard wall and much of the ceiling**, which are textureless areas with no seed points ("keeps what nothing covers"). The floor is masked.

## Classification: `ROI_DISCRIMINATOR_INVALID`

**Why it is invalid:**
- The supported ROI mode, applied as documented with a table-only box, **did not increase local representation at the table**. It removed it: 24 → 0 contributing Gaussians within 3 cm.
- The budget went mainly to the ceiling (126k → 540k) and away from the floor (592k → 79k).
- The table is not reconstructed (holdout correlation ≈ 0), so the question "does concentrated capacity recover the source sharpness?" **cannot be answered** from this pair.

**Cause: not determined.** The two runs and the 2-hour budget allowed no root-cause work.
- **Consistent with the evidence:** for a small box of 742 seeds next to large textureless surfaces, the pixel-mask policy still supervises uncovered areas outside the box, which the down-weighted outside splats then have to explain.
- The documented use of the feature is partitions, where the region is a whole part of the scene. This was a 0.9 m box.

**Side result, the version effect:**
- v2026.9.30 CONTROL renders the table edge at **5.75 px**, against A's 4.79 px (training 2.12 px).
- Its holdout correlation is slightly higher (0.69/0.78 vs 0.62/0.67), but its fine energy is lower.
- The new release does not fix the softening.

**Per the brief:** stop. No other ROI size, settings or Spirula variation was run. The brief defines no next step for INVALID. The developer has already been contacted; this ROI result could be added to that thread if useful.
