# Room 213: final source-to-render detail-loss audit (2026-09-30)

**Scope.** This audit only read data and rendered existing models. Nothing was trained, swept, re-captured or changed in production. Golden, Official, A, A+, AX6c, C and D1 are unchanged.

**Tooling.**
- Harness: `workers/modal/room213-forensic/` (app `slate360-room213-forensic`).
- Renders: the official-release native render path `cap_render.render_release_v2`.
- Artifacts: `docs/ops/room213-forensic-2026-09-30/`.
- Compute: about $2, estimated from runtimes; Modal's billing report had not posted when this was written.

**Evidence labels used throughout.** **[M]** = measured or logged. **[C]** = reconstructed from the v2026.9.24 source (183b2c6) with a file:line reference. **[U]** = unknown or not logged.

## 0. Verdict

**The detail loss starts upstream of optimisation.**
- On the targets that can be measured cleanly (T2 carpet, T1 door edge), the Spirula models reproduce every piece of detail the video sources agree on:
  - Fidelity at training views is at or above the level at which two real frames agree with each other.
  - Novel views match the multi-view consensus at least as well as a held-out real frame does.
- The X4 video frames carry little cross-view-coherent detail below about 2–3 training pixels. On the carpet at about 1.5 m, that is about 2 mm.

**Why the 72 MP panoramas added nothing.** They are the only source with more coherent detail (1–2 mm band NCC 0.62 against the video consensus), but three things stop that detail reaching the model:
- **MULTIVIEW_GEOMETRIC_DISAGREEMENT (proven).** Inside AX6c's own training data, the model renders each panorama's own training camera **≈5 px** (0.1–0.15°; 2.55 mm at 1.0 m on the carpet, 4.5 mm at 2.5 m on the chair) away from what that panorama shows. On the door edge at 4–7 m the offset is 1–4 px. The video views of the same features agree to within **0.02–0.2 mm (≤0.1 px)**. The panoramas' global registration is 0.03°. A local, near-field-larger offset like this is consistent with in-camera stitching (a single-viewpoint assumption with two lens centres 2.8 cm apart), but that cause is **not proven**.
- **HIGH_RES_OBSERVATIONS_UNDERWEIGHTED (proven from code).** Each panorama gets about 29 of 30,000 steps. The six together are 0.6% of steps, and each panorama pixel carries about 5× less gradient than a video pixel.
- **HIGH_RES_OBSERVATIONS_INSUFFICIENTLY_SUPPORTED (measured).** One panorama sees T2 and T3; four see T1.

**Next experiment.** Exactly one, in §8: an **X4 unstitched-still (.insp) positive control** on one small region. **X6:** don't borrow one yet (§9). **A+ viewer:** live (§10).

## 1. Resolved pipeline: Official vs A vs AX6c

All three runs use an identical config apart from the paths, and the binary sha is asserted at run time (`resolved_config_*.json`).

| | Official (R213-OFFICIAL-REF) | A | AX6c |
|---|---|---|---|
| **Spirula** | Release v2026.9.24 / 183b2c6, sha `7e584142…` [M] | same [M] | same [M] |
| **Preset** | `360-camera` [M] | same | same |
| **Source** | 9/21 .insv 020/021/075. 1694 frames at 2 fps, sharpest of 3 [M] | 9/29 .insv 079. 1016 of 1020 registered [M] | 079 (1018 frames) + 6 JPEG panoramas at 11904×5952 [M] |
| **Camera model** | THIN_PRISM_FISHEYE, 3840², f≈1071–1082 px/rad, 6 cameras [M] | same model, 2 cameras, f≈1078–1080 [M] | + EQUIRECTANGULAR 11904×5952 [M] |
| **warp_to_pinhole / warp_spherical_to_pinhole** | true / true [M] | true / true | true / true |
| **Face fit / back face** | `uniform` / false [M] | same | same |
| **Generated views** | 5 pinhole faces per fisheye [M: 8470 = 1694×5] | 5080 = 1016×5 [M] | 5126 = 1018×5 + 6×6 [M] |
| **Training-view size** | Fisheye face **1718², f = c = 859 px/rad, exactly 90°** [C `CameraMath.cpp:400-404,449-456`] | same | same. Panorama face **3438², f = 1719** [C] |
| **Resize / divisor** | `train_resolution_divisor 0` = native. **No resize** [C `DatasetCommon.cpp:575-584`] | same | same |
| **Warp resampling** | One bilinear tap per pixel centre, **no prefilter** [C `ImageWarp.cu:43-57`] | same | same |
| **Pyramid (loss scales)** | Fisheye faces: 1 scale (1718 < 1920) [C `EngineLoss.cpp:441-453`] | same | same. Panorama faces: 2 scales (3438, 1719), weight ½ each [C] |
| **Masks** | SAM3 person ∧ fisheye border. Eroded 0.005·√(WH) = 19.2 px [C `DataManager.cpp:468`] | same | same. Panoramas: SAM3 person mask, 42 px erosion |
| **PPISP / bilateral grid** | Both on (`no_crf_no_vig`, 16×16×8), **per face**, applied before the loss; not used in render or export [M config + C `EngineTrainStep.cpp:142-158`, `EngineForward.cpp:432`] | same | same |
| **Sampler** | 1 input image (all its faces) per step, shuffled each epoch without replacement [C `TrainerCore.cpp:1030-1035`, `DataManager.cpp:1716-1803`] | same | same. **Each panorama ≈ 29 steps in 30k** |
| **Loss** | 0.8·L1 + 0.2·(1−SSIM), **mean over valid pixels per step**, no per-camera weights [C] | same | same |
| **Held out** | none (`eval_mode all`) [M/C] | same | same |
| **Steps / Gaussians / time** | 30,000 / 1,000,000 / 56:54 [M] | 30,000 / 1M / 28:21 [M] | 30,000 / 1M / 28:59 [M] |
| **Camera optimiser** | off [M] | off | off |
| **Unknown** | Per-camera face plan (`SS_SPLIT_LOG` not set), step order, learned PPISP values, exact stb_image rounding [U] | | |

The training faces used in this audit were regenerated from the formulas above. My fisheye projection matches COLMAP's within 0.05 px for θ ≤ 90°.

## 2. Targets and lineage

All three targets are same-day (9/29) observations in the AX6c frame, picked on panorama 089:

| Target | Feature | Distance from panorama 089 |
|---|---|---|
| **T1** | Door-frame edge | 6.2 m |
| **T2** | Carpet | 1.02 m (floor plane z = −0.004) |
| **T3** | Chair-back slats | 2.5 m |

- **Seams:** none of the targets sits near a stitch seam; all are in the front lens.
- **Plane placement:** a plane sweep maximised cross-view agreement. The result was 0 for T2 (a sharp peak), +3.2 cm for T3 and +20.8 cm for T1.
- **Sheets:** `lineage_T*.jpg`. Each row shows **A** the native source crop, **C** the exact training-face crop, and **E** native renders of Official, A, A+ and AX6c at that exact camera. The last row shows ortho textures on the target plane.
- **Contact sheets:** `ortho_contact_T*.jpg` show every observation on the shared ortho grid.

### Stage by stage

| Stage | T1 door edge | T2 carpet | T3 chair slats |
|---|---|---|---|
| **Source** (train px/mm) | Video 0.18–1.3 (mostly 4.4–4.9 m away, 0.19); panorama 0.31–0.42 | Video 0.74–0.78 at 1.3–1.8 m; panorama 1.97 | Video 0.63–0.90; panorama 1.11 |
| **Exposure** | Video 1/128 s, handheld walk; panorama 1/100 s, ISO 196, static | same | same |
| **Projection: train/native sampling** | 0.60–1.29 (far views sit near the face centre, 0.6) | 0.75–1.28 | 0.96–1.43 |
| **Projection: finest-band energy transfer** | 0.68–0.97 | 0.81–0.97 | 0.89–0.97 |
| **Cross-view coherence, video, finest→coarsest band** | 0.10 / 0.25 / 0.53 / 0.76 / 0.82 (1–32 mm) | **0.17 / 0.32 / 0.60 / 0.86 / 0.95** (0.5–16 mm) | 0.17 / 0.27 / 0.42 / 0.58 / 0.79 (0.75–24 mm) |
| **Same coherence at NATIVE resolution** | 0.08 / 0.21 / 0.51 / 0.76 / 0.82 | 0.15 / 0.29 / 0.59 / 0.86 / 0.95 | 0.15 / 0.26 / 0.41 / 0.58 / 0.79 |
| **Video local disagreement** | Median 1.05 px, p90 3.7 (the casing is 3D; oblique views show its side faces) | **Median 0.08 px, p90 0.44** | Median 0.20 px, p90 0.43 |
| **Panorama vs video consensus (ortho plane)** | Offset 1.9–12.5 mm (0.6–4 px); after registration NCC 0.31–0.43 (1–2 mm) | Offset **3.65 mm = 7.2 px**; after registration NCC 0.31 / **0.62** / 0.85 | 12.8 mm on the plane: invalid for a non-planar chair (§5). In camera space: 4.5 mm = 5.0 px |
| **AX6c render vs own GT at training cameras: video** | NCC 0.34 / 0.49 / 0.74; energy 0.25 / 0.37 / 0.61 | NCC **0.36 / 0.51 / 0.75**; energy 0.36 / 0.49 / 0.76 | NCC 0.68 / 0.80 / 0.90; energy 0.60 / 0.69 / 0.87 |
| **AX6c render vs own GT at training cameras: panorama** | NCC 0.78 / 0.85 / 0.92; energy 0.51 / 0.56 / 0.63 | NCC 0.21 / 0.44 / 0.78; energy **0.19 / 0.37** / 0.67 | NCC 0.66 / 0.79 / 0.92 |
| **A at the panorama camera** (A never saw the panoramas) | NCC 0.76 / 0.85 / 0.90 | NCC **0.28 / 0.55 / 0.86** | NCC 0.65 / 0.79 / 0.92 |
| **Novel views, AX6c** (vs real-frame ceiling) | 0.43 / 0.70 / 0.80 (ceiling 0.13 / 0.38 / 0.67) | 0.43 / 0.66 / 0.85 (ceiling 0.28 / 0.48 / 0.73) | 0.01 / −0.01 / 0.36 (ceiling 0.45 / 0.62 / 0.69) |
| **Novel views, A** | 0.42 / 0.67 / 0.79 | 0.46 / 0.70 / 0.86 | 0.30 / 0.52 / 0.78, very uneven per view (§6) |
| **PLY / Spark** | Not investigated: the native render already sets the limit (Part 4F) | same | same |

**How to read the table.**
- **Coherence** = the median pairwise NCC between registered video observations, per octave band. It answers the question "is this detail consistent across views?"
- **Ceiling** = one real video frame against the median of the others (leave-one-out). It is the most a correct novel view can score.

## 3. AX6c: how much the high-resolution panoramas contribute

1. **Training views.** The 6 panoramas become **36 views** (6 cube faces each) [M: 5126 − 5090].
2. **Training resolution.** Each face is 3438², f = 1719 px/rad, against a source density of 1894.6 px/rad [C]. Face centres are minified 1.10×, bilinear and unfiltered, so about 91% of the linear resolution survives. The finest-band energy transfer measured 0.97.
3. **Does the 72 MP advantage survive projection?** Yes. A panorama face gives about **2×** a video face's angular sampling (1719 vs 859 px/rad).
4. **Sampling.** One input image per step: round(1024 / 800) = 1. Each panorama is drawn once per epoch, about **29 times in 30k steps**; all six together are about **0.6% of steps** [C].
5. **Weighting.** The loss is a per-pixel mean for each step. A panorama step averages about 71 M pixels, a video step about 14.8 M, so **each panorama pixel gets about 5× less gradient**, and the coarse scale takes half the panorama's weight [C].
6. **Support.** Only **one** panorama sees T2 or T3 within range and angle, and four see T1 [M].
7. **Disagreement.**
   - **Scene movement is ruled out for T3.** A, which never saw a panorama, rendered at the panorama's camera matches it at 0.65–0.92 after a shift.
   - **Occlusion** is not the cause: every target was checked visually.
   - **Pose/stitching is what remains**, as a local offset measured in camera space inside AX6c: 2.55 mm at 1.02 m (5.0 px), 4.5 mm at 2.46 m (5.0 px), 3–14 mm at 4.2–7.3 m (1.0–4.3 px). The ortho-plane values (3.65 mm on T2, 12.8 mm on T3) agree for the planar T2; T3's is inflated by chair parallax.
8. **Globally plausible, locally inaccurate: YES (proven).**
   - Globally, the panorama's registration is healthy: mean reprojection 1.14 px at 11904 wide, about 0.03°, and 6/6 panoramas registered.
   - Locally, inside AX6c's own training data, the model renders its panorama cameras **5.0 px** away from what those panoramas show (T2, T3), while its video cameras agree within ≤0.1 px.
   - The model follows the video, and the panorama's finer detail lands in the wrong place.
   - Result: AX6c at its own panorama camera (1–2 mm NCC 0.44) is **no better than A, which never saw it (0.55)**.

## 4. The "~60%" metric, defined and reassessed

**Definition.** Reproduced from `stations/station_metrics.json`: median 0.605 recomputed vs 0.597 reported.
- `fineE = std(F(render)) / std(F(source))`, with `F(g) = g − GaussianBlur(g, σ = 1.5 px)` on BT.709 luma.
- It is taken over the frame, **with no registration** (the energy ratio doesn't depend on shift) and no correlation requirement.
- Source = the 72 MP panorama rectified by **one bilinear tap to 1280×720 at f = 640 (11.2 px/deg)**. That is 2.96× below the panorama's 33 px/deg and below the video's own training scale (15 px/deg), so the reference is **aliased**.
- The value is the median over 30 station views (6 panoramas × 4 headings + 1 view 25° down).

**Sensitivity** (median over the 30 views; `metric60_sensitivity.json`):

| Variant | A | AX6c |
|---|---|---|
| As defined | 0.605 | 0.604 |
| Alias-free reference (4× supersampled, box-filtered) | **0.675** | 0.673 |
| + noise σ = 2 on the render | 0.637 | 0.628 |
| + mild sharpen (0.5 × unsharp mask, σ = 1) | **0.744** | 0.743 |
| + 10% contrast | 0.666 | 0.665 |
| **Fine-band NCC, render vs source** | **0.08** | **0.12** |

**Assessment.** "60%" is **not** a measure of detail preserved, and certainly not a ceiling.
- The reference inflates its denominator with aliasing, worth about 7 points.
- Noise and sharpening both raise it.
- The energy it does count barely coincides with the real structure (fine-band NCC ≈ 0.1).
- The station views were rendered at a scale where the 72 MP advantage cannot appear.
- **Retire it.** Replace it with the registered per-band coherence and fidelity used in §2.

## 5. Global comparison alignment vs internal camera consistency

- **Global model-to-model transforms leave 9–28 mm residuals at these targets.**

  | Model | Residual |
  |---|---|
  | Official | 14–28 mm |
  | A | 9–14 mm |
  | A+ | 9–12 mm |

  Unregistered, those residuals made A, A+ and Official look like they "fail" at the training cameras (fine-band NCC ≈ 0). After a per-view shift, **A matches its training frames as well as AX6c does** (T2: 0.35 / 0.51 / 0.75 vs 0.36 / 0.51 / 0.75). The failure belonged to the comparison transform, not the reconstructions. Earlier cross-model conclusions that relied on global alignment at mm scale should be treated as confounded.
- **Internal consistency** (AX6c rendered at its own cameras against its own training pixels):
  - Video: ≤0.1 px on T2; ≤0.3 px on T3 except 2 views at 1–3 px.
  - Panoramas: 5.0 px on T2 and T3, 1–4.3 px on T1.
  - **The only internal inconsistency demonstrated is the panoramas.**
- **T1 casing and T3 chair are not planar.** Ortho-plane comparisons across wide baselines therefore mix parallax into "disagreement". Those cells are flagged, and the camera-space render comparisons were used instead. This correction reverses an earlier-session reading: the T3 chair **did not move** between the 15:23 video and the 15:40 panorama.

## 6. Earliest demonstrated loss stage

| Target | Classification |
|---|---|
| **T2 carpet** | **SOURCE_DETAIL_NOT_PRESENT** for the video below about 2 mm (coherence ≤0.32; the same at native resolution). DETAIL_LOST_DURING_DECODE_OR_PROJECTION is **minor** (finest-band energy 0.81–0.97, coherence unchanged). The panorama: **MULTIVIEW_GEOMETRIC_DISAGREEMENT** (5 px internal, proven) + **HIGH_RES_OBSERVATIONS_UNDERWEIGHTED** (code) + **INSUFFICIENTLY_SUPPORTED** (1 panorama). Not an optimisation failure: training-view fidelity exceeds inter-view coherence, and novel views exceed the real-frame ceiling. |
| **T1 door edge** | **SOURCE_DETAIL_NOT_PRESENT**: most video views sit 4.4–4.9 m away at 0.19 train px/mm. **DETAIL_LOST_DURING_DECODE_OR_PROJECTION** is minor but real for far views that land near a face centre (sampling ×0.6, finest-band energy ×0.7). The panoramas: **MULTIVIEW_GEOMETRIC_DISAGREEMENT** (1–4 px) + **UNDERWEIGHTED**. AX6c ≈ A at the panorama views, so the panorama added nothing. |
| **T3 chair slats** | **MULTIVIEW_GEOMETRIC_DISAGREEMENT** for the panorama (5 px). The video views agree (0.2 px), and the model fits them (NCC 0.68 / 0.80 / 0.90, above inter-view coherence). **OPTIMIZATION_FAILS_TO_REPRODUCE_AVAILABLE_DETAIL: PLAUSIBLE, not proven.** Novel views are unstable: A reaches the ceiling at 3 of 5 video-midpoint views and collapses at the others, and AX6c/A+ are worse, but the ortho comparison is only approximate for a non-planar chair. |
| **All** | GAUSSIAN_REPRESENTATION_LIMIT_SUPPORTED: **no**. EXPORT_OR_VIEWER_LOSS: **not tested**, because nothing survives natively that Spark could lose. |

## 7. Proven vs unresolved

**Proven**
- The projection stage is native resolution with one bilinear tap. Face-centre minification is up to 0.6× for fisheye and 0.91× for panoramas. It changes coherent cross-view detail negligibly.
- The video's coherent detail runs out at about 2–3 training px.
- A, A+ and AX6c reproduce all video-coherent detail at the planar targets.
- The panoramas are locally inconsistent with the video geometry: 5 px inside AX6c.
- The panoramas get about 0.6% of steps and about 5× less per-pixel weight.
- The "60%" metric is aliased, unregistered and easy to game.
- The global comparison transforms carry 1–3 cm residuals.

**Unresolved**
- Whether the panorama offset comes from in-camera stitching parallax (the magnitude is consistent, but the distance dependence is weak and the cause is not isolated).
- Whether sharp, geometrically consistent, adequately sampled high-resolution stills would turn into model detail. This is the one question that decides the path.
- Thin-structure stability at novel views (T3).
- Why A+ is no better than A at these same-day targets (A+'s gain was on the 9/21 walk path, at pole height).

## 8. The ONE next experiment: R213-INSP, an X4 unstitched-still positive control

**Hypothesis.** The X4 and the official Spirula workflow can reproduce ≤2 mm detail when the high-resolution observations share one viewpoint per lens (unstitched `.insp`, the same thin-prism-fisheye rig path as the video) and are numerous enough to be sampled. The 72 MP failure is the stitched equirect's near-field inconsistency plus its 0.6% sampling share, not the sensor and not the optimiser.

**Unchanged control (V).** A new same-session short X4 video pass over the region (079 settings, 2 heights), processed exactly like A: official v2026.9.24, `360-camera`, every SfM and train flag unchanged.

**Exact change (V+S).** V plus about 30 X4 **photo-mode stills saved unstitched (.insp)**:
- Static (monopod or tripod, 3 s timer), ISO ≤200, ≥1/100 s.
- 3 heights (0.8 / 1.2 / 1.7 m) × 10 positions at 1.0–2.0 m, spaced 20–30 cm.
- 4 further positions are captured but **held out** through the official `--eval-mode filename` naming (the same mechanism the render harness already uses).
- Ingested through Spirula's own `.insp` dataset prep (`DatasetPrep.cpp:82, 2198`, one JPEG per lens).
- Nothing else changes.

**Region and rules.** One window bay about 2×2 m, containing a window reveal (edge), one chair (thin structure) and carpet (texture). Nothing moves, nobody is in frame, and the lights stay constant.

**Pre-flight (15 min, no cost).** Shoot one .insp and confirm the official ingest works from the CLI. If it only works in the desktop GUI, do the dataset prep there and run SfM and training on Modal unchanged.

**Cost and time.** About 40 min on site. Two small official runs (SfM about 15 min + training about 25 min each on L40S) plus this harness: about **$6–8** including CPU and RAM (check `modal billing report` before launching). About 3 h wall time.

**Success criteria (all required)**
1. **Registration.** Median .insp offset to the video consensus on the planar target **≤0.5 training px** (the stitched panorama is 5–7 px).
2. **Source coherence.** Still-vs-still NCC in the 1–2 mm band **≥0.5**.
3. **Held-out stills.** V+S beats V at the held-out still views in the 1–2 mm band by **≥ +0.15 NCC**, with energy ratio **≥0.6**, on at least 2 of 3 targets. At walk-height novel views it must not drop below V.
4. **Visual.** Carpet tufts, slat edges and the reveal are visibly crisper in a blind-order native side-by-side (Brian judges). Spark only after that.

**Stop rules**
- ≥20% of stills fail to register, or median offset **>1.5 px**: stop. The X4 still calibration is the blocker; no more capture work.
- Registration and coherence pass, but V+S ≤ V: the optimiser or sampling is the limit. Stop capture work. The next test is one bounded sampling or weighting change **using these same stills**, not new hardware.
- Success: dense unstitched stills are the detail path for close-up zones, and the X6 question (§9) becomes worth asking.

## 9. X6 loan verdict: not now

- The failure this audit demonstrated is **geometric (stitching) and in the sampling**, on top of a video source whose coherent detail stops at about 2–3 training px.
- An X6's **stitched** output keeps the same single-viewpoint near-field problem.
- Underweighting is on the pipeline side.
- The **video** MTF limit is the one thing an X6 might improve, but not until R213-INSP shows that sharp, consistent observations actually become model detail.
- **Borrow an X6 only if R213-INSP succeeds.** Then run a 1-hour loan test measuring per-band cross-view coherence of X6 video vs X4 video on a static target with this harness.
- If R213-INSP fails in optimisation, an X6 is not the next experiment.

## 10. Temporary A+ viewer

**URL:** https://slate360-rebuild-git-preview-room213-poc-slate360.vercel.app/preview/room213/aplus (branch `preview/room213-poc`, commit 041d2885).

- **Model:** the frozen A+ model, sha `11e39407…`, served as trained from `media.slate360.ai` (private copy at `experimental/spirula-hardened/aplus-2026-09-29/splat.ply`).
- **Placement:** in the golden frame by A+'s verified similarity. It equals `Aplus_align.json cond_to_golden` exactly.
- **Rendering:** with **the identical Spark profile as R213-OFFICIAL-REF**.
- **Label:** "A+ MULTI-PASS · temporary".
- **Verified** in headless GPU Chromium: ready in 23 s, profile check OK, no mismatches (`aplus_viewer_deployed.jpg`).
- **Unchanged:** golden (`/preview/room213`), official (`/preview/room213/official`) and all production URLs. `/preview/room213/aplus` returns 404 on production.
- **Caveat:** 9/29 furniture differs from the 9/21 golden pins and walk collisions. The viewer is for subjective evaluation only.
