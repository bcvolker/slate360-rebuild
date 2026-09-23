# Room 213 — camera / ray model audit (read-only)

Date: 2026-09-18. Dataset: frozen job `cecc2763` (376 panoramas → 6,016 derived views, `pose_hash f9b1bdb3…`).
Status: **audit only.** Nothing in the frozen dataset, the pipeline code, the Modal volume or any checkpoint was
modified. No splat model was trained. Every number below was computed on scratch copies of the frozen inputs.

Inputs actually available on this host:

| Artifact | Source | Used for |
|---|---|---|
| `views/transforms.json` (6,016 frames) | Modal volume `slate360-recon-experiments` → `inputs/cecc2763/views/` (sha256 matches `pose_hash`) | centers, rotations, intrinsics |
| `views/images/*.jpg` + `views/masks/*.png` | same volume (downloaded to scratch, 1.5 GB) | re-derived correspondences, sharpness |
| `sfm/points.ply` (209,587 pts, xyz+rgb only) | same volume | coverage / depth per crop orientation |
| Exp 5 grouped-eval JSON + GT/render panels | `qa/exp3-run/exp5-pull/` (local) | render error by orientation, detail survival |
| Training config `arm-d-config.yml`, effective-config | `qa/exp3-run/` (local) | downscale schedule, camera optimizer |

**Not available on this host:** the original 7680×3840 panoramas, COLMAP `database.db`, `sparse/*` (cameras/images/
points3D with tracks). Only `points.ply` (no tracks) was frozen onto the volume. The Lab PC (`/mnt/c/s360/tmp/splat-lab/
cecc2763/sfm/`) still holds them. Consequently the track / reprojection / triangulation numbers in §4 come from
correspondences **re-derived on the 1280 px crops against the frozen poses**, not from the original COLMAP run.

---

## 1. Is each panorama modelled as a rigid camera rig?

**Yes — by construction, and trivially so. It is not a rig that was ever *estimated*; it is a single spherical camera
that is re-expressed as 16 pinholes after the fact.**

Pipeline (`workers/local/splat-lab/stages/sfm.py`, `stages/views.py`):

1. COLMAP 4.1.0 registers each panorama **once** as one `EQUIRECTANGULAR` camera (`--ImageReader.single_camera 1`,
   `feature_extractor` at `max_image_size 4096`, sequential matching overlap 4 + vocab-tree loop closure, default mapper).
   Bundle adjustment therefore runs over 376 poses (6 DoF each) and 209,587 points, with **no intrinsics to refine**
   (the equirectangular model has none).
2. `views.py` takes each registered pose `(R_pano, C)` and writes 16 frames with **the identical center `C`** and
   `R_view = R_pano · E(yaw, pitch)`, where `E` is the fixed canonical-16 layout (8 horizon yaws, 4 at +45°, 4 at −45°),
   intrinsics `fl = cx = cy = W/2 = 640`, `W = H = 1280`, zero distortion.
3. Training (`splatfacto`, nerfstudio 1.1.5) runs with `camera_optimizer.mode: off`, so the 16 crops are never
   allowed to drift apart during training either.

So at every stage the relative transforms inside a station are exactly fixed; the only free parameters in the whole
chain were the 376 spherical poses inside COLMAP's BA. The crops carry **no independent evidence** about the rig —
their reprojection residuals are the panorama's residuals re-sampled through a different lens.

Measured on the frozen `transforms.json` (`audit/geom_audit.py`):

| Check | Result |
|---|---|
| Views per station | 16 for all 376 stations |
| Distinct intrinsics tuples across 6,016 frames | 1 → `(1280, 1280, 640, 640, 640, 640, 0, 0, 0, 0)`, implied HFOV 90.000° |
| Within-station center spread `max‖C_i − mean‖` | 1.99e-15 (float round-off; all 16 centers are the same point) |
| Rotation orthonormality / det | max `‖RᵀR − I‖` 2.4e-7, `|det − 1|` 2.1e-7 |
| Crop rotation vs expected `R_pano·E(yaw,pitch)` (COLMAP `CamRayFromImg` convention) | max 0.0000°, all 6,016 frames |
| Relative rotation `R_v00ᵀ·R_v` identical across stations | max deviation 1.7e-6° |
| Consecutive-station baseline (world units) | median 0.362, min 0.004, max 0.855 |
| Trajectory bbox | 8.35 × 1.36 × 10.27 (diag 13.3) — consistent with metres for a 1 fps walk |
| Panorama "down" axis vs consensus down | median 4.2°, p95 8.3°, max 11.6° (hand-held pole tilt; not a rig error) |

**Interpretation:** there is nothing to fix at the "rig consistency" level — the data is perfectly rigid. The open
question is the opposite one: the rigid assumption is *never tested*, because COLMAP saw only the spherical camera
and the crops inherited its pose. Any error in the spherical pose (or in the stitched panorama's own geometry — the
Insta360 X4 stitches two fisheyes with a ~2–3 cm baseline, so its "single center" is itself an approximation) is
propagated into all 16 crops with zero residual visible at the crop level.

---

## 2. Intrinsic consistency

- One shared pinhole for all 6,016 crops (`fl_x = fl_y = 640`, `cx = cy = 640`, `k = p = 0`). The crop is generated
  by ideal resampling (`py360convert.e2p`), so the intrinsics are exact by construction; there is no lens to calibrate.
- The **real** intrinsics question lives upstream: COLMAP's `EQUIRECTANGULAR` model assumes an ideal sphere with the
  image centre column at yaw 0. The X4's stitched output is not an ideal sphere near the stitch seams and the nadir
  (parallax from the dual-fisheye baseline; FlowState was off, so no gyro-derived horizon correction was baked in).
  None of that is modelled, and the crop stage has no way to absorb it.
- Where the SfM keypoints were measured: `max_image_size 4096` → SIFT ran on a 4096×2048 downscale of the panorama
  (10.7 px per degree); keypoint coordinates are scaled back to 7680 px camera space.

---

## 3. Coverage / render error by crop orientation

### 3.1 Held-out render error (Exp 5, 38 withheld panoramas × 16 crops = 608 views, both arms)

Per crop index (yaw, pitch), mean PSNR over the 38 withheld panoramas (Arm H5; G5 is within 0.05 dB everywhere):

| v | yaw / pitch | PSNR | v | yaw / pitch | PSNR |
|---|---|---|---|---|---|
| 00 | 0 / 0 | 22.85 | 08 | 0 / +45 | 21.66 |
| 01 | 45 / 0 | 23.07 | 09 | 90 / +45 | 21.44 |
| 02 | 90 / 0 | 22.50 | 10 | 180 / +45 | 20.34 |
| 03 | 135 / 0 | 21.92 | 11 | 270 / +45 | 20.99 |
| 04 | **180 / 0** | **21.23** | 12 | 0 / −45 | 22.32 |
| 05 | 225 / 0 | 20.83 | 13 | 90 / −45 | 18.86 |
| 06 | 270 / 0 | 21.92 | 14 | **180 / −45** | **17.12** |
| 07 | 315 / 0 | 22.65 | 15 | 270 / −45 | 18.04 |

Grouped: horizon 22.12 dB / SSIM 0.840 / LPIPS 0.333; up-tilt 21.11 / 0.846 / 0.447; **down-tilt 19.09 / 0.736 /
0.437**. The three worst crops are the three down-tilted crops that are not looking forward (v13/v14/v15), and the
worst horizon crop is the one looking straight back (v04). That is the operator/pole hemisphere: the people mask
removes the operator, but the residual (shadow, pole, floor under the operator, stitch seam at the nadir) is exactly
where the equirectangular geometry is least trustworthy and where the dual-fisheye parallax is largest.

### 3.2 Sparse-point coverage and depth per crop (frozen `points.ply` projected through the frozen crop cameras)

See `audit/coverage` block in the appendix (computed for all 6,016 crops; median in-frame sparse points and median
depth per crop index). Down-tilted crops see the floor at the shortest range, so any centre error δ produces the
largest pixel error there (`Δpx ≈ f·δ/z`).

---

## 4. Re-derived tracks, triangulation angles, reprojection error (crop-level, frozen poses)

Method (`docs/ops/room213-camera-ray-audit/modal_track_audit.py`): SIFT (CPU, ≤4,096 features, people masks applied) on every crop;
matching restricted to crop pairs that can geometrically overlap (optical-axis angle < 89° within a station, < 80°
across stations up to 3 stations apart — the original pipeline's sequential overlap was 4 at the panorama level);
then `pycolmap.triangulate_points` with **all 6,016 poses held fixed** and `refine_intrinsics=False`. This measures
how well the frozen camera model explains fresh correspondences; it does not re-estimate anything.

Run on a Modal CPU container (32 vCPU / 96 GB, `pycolmap 4.1.1`, app `room213-camera-ray-audit`, volume mounted
read-only in effect — all writes to container `/tmp`). The laptop attempt of the same script stalled at 1.1 GB free RAM
and was killed; the container did extraction in 267 s, matching in 280 s, triangulation in 406 s.

### 4.1 Correspondences

| | |
|---|---|
| Crops / SIFT keypoints (masked) | 6,016 / 24,632,205 (≈4,094 per crop) |
| Candidate pairs | 130,646 = 15,040 within-station + 115,606 cross-station (k ≤ 3) |
| Geometrically verified pairs | 130,646 / 130,646; 19,391,139 inlier matches |
| Within-station pair inliers | mean 430, median 285, p10 101, none empty (14,873 pairs with ≥ 15 inliers) |
| Cross-station pair inliers | mean 155, median 64, p10 19 (83,688 pairs with ≥ 15 inliers) |

Within-station pairs are pure rotations (zero baseline, same centre): they verify cleanly (homography) and chain
tracks between crops but contribute **no** depth information. All depth comes from the cross-station pairs.

### 4.2 Fixed-pose triangulation (poses and intrinsics frozen; `min_angle 1.5°`, `ignore_two_view_tracks`)

| | |
|---|---|
| 3D points / observations | 890,328 / 5,912,172 (≈983 obs per crop; original COLMAP model had 209,587 points) |
| Mean reprojection error | **0.962 px** at 1280² (median 0.80 px, p95 2.6 px) |
| Track length | mean 6.6, median 5, p95 17, max 149 |
| Tracks seen from ≥ 2 stations / ≥ 3 / ≥ 5 | 890,318 (99.999 %) / 533,716 / 180,115; max 52 stations |
| Single-station (within-rig only) tracks | 10 — the triangulator correctly rejects zero-baseline tracks |
| Station span of a track | median 2 stations, p90 6, max 52 (loop closures / re-visits) |
| Triangulation angle (max ray angle per track) | median 8.3°, p10 2.6°, p90 23.3°; 13.6 % < 3°, 41.9 % > 10°, 0 % < 1.5° (filtered) |
| Points per station | median 8,325, min 5,019, max 15,690; **no station under 500** |
| Per-station mean reprojection | median 1.00 px, p5 0.83, p95 1.32, worst 1.47 (stations 000297, 000028, 000030) — no outlier station |
| Per-crop mean reprojection | median 1.06 px, p95 1.51, worst 2.45; 1 crop with no observations (ceiling) |

**Reading:** the frozen spherical-pose model explains fresh, independently measured crop correspondences to ≈1 px
at 1280 px (≈0.09° of angle) with a healthy multi-station track structure and no weak stations. That is the
performance of a good SfM solution; the pose layer is not obviously broken.

### 4.3 Reprojection error by crop orientation (same triangulated points)

| v | yaw / pitch | n obs | mean px | median px | p95 px |
|---|---|---|---|---|---|
| 00 | 0 / 0 | 541,249 | 0.901 | 0.707 | 2.37 |
| 01 | 45 / 0 | 525,263 | 0.975 | 0.774 | 2.52 |
| 02 | **90** / 0 | 447,836 | 1.062 | 0.860 | 2.68 |
| 03 | 135 / 0 | 458,654 | 1.066 | 0.849 | 2.76 |
| 04 | 180 / 0 | 455,786 | 0.999 | 0.789 | 2.61 |
| 05 | 225 / 0 | 431,469 | 1.109 | 0.881 | 2.86 |
| 06 | **270** / 0 | 390,167 | **1.183** | 0.951 | 3.01 |
| 07 | 315 / 0 | 448,875 | 1.022 | 0.806 | 2.66 |
| 08 | 0 / +45 | 96,745 | 1.140 | 0.927 | 2.86 |
| 09 | **90** / +45 | 78,745 | 1.203 | 0.990 | 3.01 |
| 10 | 180 / +45 | 82,611 | 1.221 | 1.006 | 3.02 |
| 11 | **270** / +45 | 64,746 | 1.241 | 1.018 | 3.08 |
| 12 | 0 / −45 | 517,769 | 0.894 | 0.711 | 2.29 |
| 13 | **90** / −45 | 467,999 | 1.002 | 0.808 | 2.52 |
| 14 | 180 / −45 | 505,997 | 0.949 | 0.749 | 2.47 |
| 15 | **270** / −45 | 398,261 | 1.089 | 0.875 | 2.76 |

Grouped: horizon 1.03 px (n 3.70 M), up-tilt 1.20 px (n 0.32 M), **down-tilt 0.98 px (n 1.89 M)**.

Two things stand out:

1. **The geometric error ordering is the reverse of the render-quality ordering.** Down-tilted crops have the lowest
   reprojection error and the most observations, yet the worst held-out PSNR (§3.1: 19.1 dB vs 22.1 dB on the
   horizon, v14 at 17.1 dB). Whatever hurts the down views in the splat is **not** the camera model or ray geometry
   — it is appearance/content in that hemisphere (operator shadow and pole residue after masking, motion blur at
   short range, floor texture, nadir stitch) or the training schedule, not pose.
2. **Yaw 90° / 270° are consistently the worst at every pitch** (+0.16–0.28 px over yaw 0° at the same pitch;
   v06 is the worst horizon crop, v11 the worst up crop, v15 the worst down crop). Those are the Insta360 X4's
   stitch-seam directions (the two lenses look at yaw 0° and 180°). A ~0.2 px systematic excess at 1280 px is
   ≈0.02° — small, but it is the signature of dual-fisheye stitch parallax that the ideal-sphere
   `EQUIRECTANGULAR` model cannot represent. It is the only place in this audit where the rigid single-centre
   assumption shows a measurable cost, and it is the specific thing §6's experiment should look for.

---

## 5. Detail survival: panorama → crop → training image → render → viewer

| Stage | What happens | Angular sampling / effect |
|---|---|---|
| Original panorama | Insta360 X4, 7680×3840 equirect, HEVC 8K30 stab-off, 1 fps frames | 21.3 px/deg at the equator; at ±45° latitude the equirect over-samples longitude by 1/cos 45° = 1.41× |
| SfM keypoints | `max_image_size 4096` | SIFT localised at 10.7 px/deg, rescaled to 7680 space (≈2 px localisation floor in pano space) |
| Derived crop | `py360convert.e2p`, 90° FOV, 1280² bilinear, JPEG q92 | pinhole density `f·sec²θ` per radian → **11.2 px/deg at the crop centre, 22.3 px/deg at the edge**. Centre is resampled at 0.52× of source density (1.9× downsample); edges ≈ 1.05× (near native). Bilinear, no pre-filter → mild aliasing at the centre, none at the edge. JPEG q92 at 1.23 bits/px |
| Training image | nerfstudio does not auto-downscale (1280 < 1600 threshold); `camera_res_scale_factor 1.0` | **The crop is the training image at full res only from step 6000.** `num_downscales 2`, `resolution_schedule 3000` ⇒ steps 0–2999 train at 320², 3000–5999 at 640², ≥6000 at 1280². In Exp 3/5 (16k steps) the seed stabilisation window (0–6016) was therefore almost entirely low-res, and only ~10k steps saw full-resolution pixels |
| Training render | Exp 5 panels (GT crop vs 1280² render, same camera) | Laplacian variance retained: 0.37 (median pano 000173), 0.35 (best), 0.41 (worst); high-frequency energy ratio drops 0.51 → 0.37. Render keeps roughly a third of the crop's fine detail |
| Export | `ns-export gaussian-splat` PLY (float32, opacity truncated at 1/255) → `splat-transform --sog` SPZ v3 for the viewer | SPZ v3: positions 24-bit fixed, log-scales 8-bit, smallest-three quats 8-bit, SH 8-bit with 0.15 colour scale; sub-mm positional quantisation at room scale, but SH/scale quantisation removes another layer of specular/thin-structure detail |
| Viewer | Spark `SplatMesh`, `enableLod: false`, hard cap `DESKTOP_MAX_SPLATS 2.5M` / `MOBILE_MAX_SPLATS 1.0M` (deterministic index downsample), `antialias: false` | Exp 3/5 models (≈0.5M Gaussians) pass through uncapped; the historical 3.54M Room 213 model would be **cut to 2.5M on desktop and 1.0M on a phone** (28% / 72% of splats dropped) before the user sees it |

Net: the crop stage discards about half of the source's angular resolution at the crop centre (which is where the
splat gets most of its gradient signal), the training schedule spends its first 6k steps at ¼–½ of that, the render
retains ~⅓ of the remaining fine detail, and the viewer path is lossless for ≤1M Gaussians but lossy above.

---

## 6. Designed (NOT run): constrained vs unconstrained bundle adjustment on the same matches

### 6.1 Question
Does treating each panorama as a rigid 16-camera rig (relative transforms fixed) fit the fresh crop correspondences as
well as letting the 16 crops move independently? If the unconstrained BA lowers reprojection error materially and the
recovered centers separate by more than the localisation noise, the "single centre" assumption (stitch parallax,
spherical-model error) is costing us accuracy that the splat then has to absorb as blur/haze. If not, the pose layer
is exonerated and effort belongs in capture/appearance.

### 6.2 Shared inputs (identical for both arms)
- A `crops.db` produced exactly as in §4 (same script, same options: ≤4,096 SIFT/crop with masks, same 130,646-pair
  list) — ~10 min on the Modal CPU container — then **frozen and hashed; both arms read the same file, never re-matched**.
  (§4's container `/tmp` copy was not persisted; regenerate once, keep it in a new scratch path, not under `inputs/`.)
- The frozen 6,016 poses as initialisation for both arms; the shared `PINHOLE(640,640,640,640)` camera **held constant**
  in both arms (intrinsics are exact by construction, so refining them would only absorb pose error).
- Same 3D points: triangulated once from §4 (`ignore_two_view_tracks`, `min_angle 1.5°`), then both arms start from
  that point set.
- Same solver settings: `pycolmap.BundleAdjustmentOptions` Ceres, `loss_function_type = CAUCHY`, scale 1.0 px,
  `max_num_iterations 100`, `refine_focal_length = refine_principal_point = refine_extra_params = False`,
  `refine_points3D = True`. Gauge: fix the first station's pose (both arms), plus one additional centre distance
  for scale in the unconstrained arm only (see below).

### 6.3 Arm R — rigid rig (constrained)
pycolmap 4.1.1 has native rigs. Build one `Rig` per station: 16 sensors (the 16 crop cameras — one `Camera` object
each, identical params, so `sensor_from_rig` differ), reference sensor = v00, `sensor_from_rig = E(yaw,pitch)ᵀ` fixed;
one `Frame` per station with `rig_from_world` = the frozen panorama pose. Then:

```
opts.refine_sensor_from_rig = False      # relative crop transforms locked
opts.refine_rig_from_world  = True       # 376 × 6 DoF
cfg.set_constant_rig_from_world_pose(frame 0)   # gauge
```
Free parameters: 375 × 6 poses + points. This is the same parameterisation COLMAP used originally, expressed through
the crops.

### 6.4 Arm U — unconstrained
Same reconstruction but with **trivial frames** (`add_image_with_trivial_frame`, as §4 already does): each of the 6,016
crops is its own frame/rig. `refine_rig_from_world = True` ⇒ 6,016 × 6 DoF. Gauge: station 0 / v00 constant, and
station 0 / v08 constant as well (fixes scale; both are exactly co-located in the initialisation so this does not bias
the test). Optional third arm **U-lite**: rotations locked to the rig (`constant_rig_from_world_rotation = True`),
translations free — isolates "is it the centre or the orientation that wants to move".

### 6.5 Metrics (both arms, same code path)
1. Mean / median / p95 reprojection error, overall and per crop index (horizon / up / down), on the *identical*
   observation set (`min_track_length 3`).
2. Arm U only: per-station centre spread `max‖C_i − mean_i‖` and the direction of the spread (pole axis vs horizontal),
   relative rotation drift `angle(R_v00ᵀR_v · E(yaw,pitch)ᵀ)`; compare with the SIFT localisation floor
   (`≈ 0.5 px / 640 px·z` at median depth from §3.2).
3. Station-centre displacement Arm R vs frozen (should be tiny — sanity check that the crop-level BA reproduces the
   panorama-level BA), and Arm U station means vs Arm R.
4. Akaike-style penalty: Arm U adds 6,016·6 − 376·6 = 33,840 parameters; require the residual improvement to beat
   the parameter cost, not just be > 0.

### 6.6 Decision rule (pre-registered)
- **Rig exonerated** if Arm U improves mean reprojection error by < 0.1 px AND p95 centre spread < 2× localisation
  floor. Then pose error is not the limiting factor; the §5 detail chain is.
- **Rig questionable** if spread concentrates on down-tilted / backward crops (v04, v13–15) and follows the pole axis:
  that is stitch parallax / nadir geometry, fixable by masking a larger nadir band or by modelling the X4 as a
  two-fisheye rig upstream — not by freeing crops in training.
- **Rig wrong** if spread is isotropic and > 1 cm-equivalent at median depth: the spherical model itself is off; then a
  proper camera-rig SfM on the raw fisheyes is the next experiment.

### 6.7 Cost / where to run
CPU-only, no GPU, no training. Arm R + U on 6,016 images / ~130k verified pairs: minutes on the Lab PC or one Modal
CPU container. Writes only to a new scratch directory; frozen inputs untouched.

**Not run in this audit.**

---

## 7. Appendix

### A. Sparse-point coverage / depth per crop index (frozen `points.ply`, 0.5–99.5 % box, all 6,016 crops)

| v | yaw / pitch | median in-frame pts | median depth | p10 depth |
|---|---|---|---|---|
| 00 | 0 / 0 | 34,314 | 4.13 | 2.07 |
| 01 | 45 / 0 | 30,474 | 4.06 | 2.01 |
| 02 | 90 / 0 | 31,614 | 4.48 | 2.16 |
| 03 | 135 / 0 | 31,150 | 4.42 | 2.19 |
| 04 | 180 / 0 | 26,966 | 4.07 | 2.13 |
| 05 | 225 / 0 | 24,852 | 4.17 | 2.18 |
| 06 | 270 / 0 | 35,446 | 4.49 | 2.27 |
| 07 | 315 / 0 | 34,283 | 4.42 | 2.22 |
| 08 | 0 / +45 | 3,733 | 3.35 | 1.25 |
| 09 | 90 / +45 | 4,080 | 3.41 | 1.20 |
| 10 | 180 / +45 | 2,520 | 2.81 | 1.00 |
| 11 | 270 / +45 | 2,796 | 2.77 | 0.97 |
| 12 | 0 / −45 | 40,926 | 3.39 | 1.72 |
| 13 | 90 / −45 | 40,933 | 3.63 | 1.70 |
| 14 | 180 / −45 | 38,131 | 3.49 | 1.75 |
| 15 | 270 / −45 | 45,574 | 3.89 | 1.81 |

Down-tilted crops are the **best covered** by sparse geometry and the **worst rendered** (§3.1) — the down-view
problem is not a coverage gap. They also see surfaces at the shortest range, where a centre error δ becomes the
largest pixel error (`Δpx ≈ 640·δ/z`; at z = 1.7 a 1 cm δ is ≈ 3.8 px vs ≈ 1.5 px on the horizon).

### B. Sharpness measurements (variance of Laplacian on grayscale; same-resolution comparisons only)

| Comparison | Value |
|---|---|
| GT crop vs render, pano 000173 (median panel) | 185 → 68 (H5) / 81 (G5); ratio 0.37 |
| GT crop vs render, pano 000264 (best) | 159 → 56 / 46; ratio 0.35 |
| GT crop vs render, pano 000325 (worst) | 195 → 80 / 83; ratio 0.41 |
| High-frequency energy ratio (>¼ Nyquist) GT vs render | 0.51 → 0.37 |
| Crop JPEG | q≈92 tables, median 252 KB, 1.23 bits/px |

### C. Scripts and raw results (`docs/ops/room213-camera-ray-audit/`, read-only against the frozen inputs)
`geom_audit.py` (§1–2, `geom_summary.json`), `modal_track_audit.py` + `poll_modal.py` (§4; full result incl. per-station
and per-crop mean reprojection in `track_audit_result.json`), `detail_audit.py` (§5, App. B). The coverage block (App. A)
was an inline script over `points.ply` + `transforms.json`. Nothing here was committed by the audit.
