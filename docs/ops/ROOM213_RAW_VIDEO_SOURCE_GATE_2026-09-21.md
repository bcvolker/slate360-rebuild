# Room 213 — raw X4 video source gate (2026-09-21, no training)

Continues [`ROOM213_RAW_CAPTURE_INTAKE_2026-09-21.md`](ROOM213_RAW_CAPTURE_INTAKE_2026-09-21.md). Dataset
`slate360-recon-experiments:/room213/2026-09-21/raw-capture-test/`. **No Gaussian training was run. No Insta360
Studio processing. Originals untouched.** All analysis ran on the laptop against the local originals (PyAV 18.1
installed locally for dual-track demux; `py360convert` installed to reproduce the pipeline's ERP→pinhole step).
Scripts + raw numbers: [`room213-raw-capture-2026-09-21/`](room213-raw-capture-2026-09-21/).

## CLOUD DATA STATUS (verified by listing, not assumed)

| | |
|---|---|
| **Confirmed complete in cloud** | 5 stills: `IMG_…_005, _017, _022, _051, _074` (remote sizes match manifest to the MiB rounding `modal volume ls` reports; byte-exact + SHA256 check is the first step of the prepared cloud job) + `room213-test-manifest.json` + intake doc |
| **Missing / incomplete** | **all 3 `.insv` videos, 63 stills, 3 LRVs** |
| Upload state at 12:36 | the 11:59 background chain is still on `VID_020` (1.42 GB) since 12:01 — process alive, CPU still accruing, ~0.7 MB/s effective. Nothing after it has started. Resume loop for after Wi-Fi returns is in the intake doc. |

Consequence: **nothing raw-video can run in the cloud yet.** Everything below was computed locally so the decision
does not wait on the upload.

## RAW LENS EXTRACTION

- PyAV opens every `.insv` as 2 independent HEVC video streams (3840×3840 each, 29.97 fps, `time_base 1/30000`) +
  AAC audio; both lenses decode at the same timestamp (t=10.01 s, both keyframes; 5.3 s seek+decode for the pair).
- **Lens 0 = whiteboard/checkerboard side; lens 1 = room side with the operator standing in its center** (he is in
  lens 1 for essentially every frame — a people mask is mandatory for any raw-rig dataset).
- Lens circle: radius ≈2100 px, center (1899,1889) / (1921,1876) — the circle is clipped by the 3840 frame (lit
  fraction 0.88). Equidistant fit at an assumed 100° half-FOV gives **f≈1200 px/rad ≈ 21 px/deg at center**
  (±10%); straight ceiling lines render straight under this model, so it is adequate for angular matching but must
  be replaced by a proper calibration before reconstruction.
- Contact sheet `raw/contact_vid020_t10_lens0_lens1.jpg` (both raw lenses side by side, unstitched).
- Insta360 trailer present (magic `8db42d69…`); gyro not parsed this pass — image motion was sufficient (below).
- Exposure is **not recoverable** from the HEVC frames without trailer parsing; the stills carry EXIF (f/1.9,
  1/100–1/200 s, ISO 112–200).

## TRIPOD SHARPNESS CEILING (`VID_020`, both lenses, every frame in the stable windows, n=1109/lens)

Windows held after re-checking image motion at 6 samples/s (residual motion 2.2–2.6 mean-abs-diff at 480², i.e.
the static floor): **3.0–17.0 s, 23.0–35.5 s, 42.0–52.5 s**. Sharpest frame per placement requiring *both*
lenses above their own window median:

| Placement | t | lens 0 lv (window median) | lens 1 lv (median) | note |
|---|---|---|---|---|
| 1 (facing whiteboard/checker) | **5.97 s** | 154.6 (142) | 224.9 (206) | used for all B-static comparisons |
| 2 | 23.02 s | 65.4 (69) | 175.1 (186) | lens 0 on blank wall — low texture, not blur |
| 3 | 42.01 s | 112.3 (112) | 153.6 (183) | door/rail side |

Placement-level distribution, lens 0 center-crop lapvar p10/p50/p90 = 68/112/148, lens 1 = 174/190/215.
Placement 1's lens-0 frames are visibly grainier than the walking keepers at the same target (exposure/gain toward
the bright whiteboard is the likely cause; not recoverable from the container).

## WALKING VIDEO QUALITY (keyframe selection at ~3 fps candidates; reject high motion, reject the blurrier 40 %
per lens, require ≥12 px @480² translation vs. last keeper)

| Video | candidates | keepers | median spacing | motion/frame p10/p50/p90 | lens0 lv p10/p50/p90 | lens1 lv |
|---|---|---|---|---|---|---|
| `VID_075` (97.9 s) | 294 | **31** | 1.33 s | 1.43 / 1.75 / 2.21 | 63 / 99 / 168 | 85 / 104 / 123 |
| `VID_021` (274 s) | 822/lens | scan finishing at write time — numbers land in `raw_rig_frames_manifest.json` | | | | |

The best walking keepers (`t=67.40, 68.07, 96.76 s`) **equal or beat the tripod ceiling** on every shared feature
(checkerboard lapvar 3538 vs 2431 static; glyphs inside the checker squares legible in the walking frame). Sharpness
selection at ~1 keeper/1.3 s recovers stationary-grade frames from a walk.

## STITCHED STILL QUALITY (A′ — in-camera-stitched 5888×2944 JPEG, `IMG_022`)

On like-for-like framings rendered to the **same** pinhole grid:

| Feature (view) | metric | A′ still | B raw static (p1) | B raw walk |
|---|---|---|---|---|
| Ceiling T-bar, 1280 grid (`y0 p45`, identical framing) | lapvar / ESF / contrast | 57 / 3.0 px / 22 | **158 / 1.0 px / 35** | 150 / – / 55 |
| Ceiling T-bar, **2560 grid** (no downsampling) | lapvar / ESF | 11.5 / 3 px | **27.4** / 10 px* | – |
| Checkerboard, 1280 grid | lapvar / Michelson / hf | 1639 / **0.753** / 0.696 | 2431 / 0.597 / 0.741 | **3538** / 0.622 / **0.777** |
| Checkerboard, **2560 grid** | lapvar / ESF / Michelson | 197 / 4 px / **0.754** | 386 / **1 px** / 0.593 | **567 / 1 px** / 0.624 |

\*single-strongest-edge ESF at 2560 landed on a soft shadow edge in B; treat as noise.

Reading (with the crops in `raw/r2560/*.png`, `raw/review/feature_*.png`): the still wins **only on Michelson
contrast** — its square edges are crisper-looking because the X4's on-device stitcher sharpens and boosts local
contrast — while the **glyphs printed inside the checker squares are smeared in the still and legible in the raw
frames**, and the ceiling-tile perforation texture is resolved in raw and blurred in the still. Raw carries 2–3× the
high-frequency energy at source scale, part of which is genuine structure and part HEVC/sensor grain (visible on the
whiteboard). Per the rule that sharpening/contrast alone does not count as detail: **the stills are not sharper than
raw video; they are sharpened.**

## HISTORICAL STUDIO COMPARISON (C = frozen Room 213 crops K6 actually trained on, 1280 grid, same metric code)

| Feature | B raw (static / walk) | C historical | read |
|---|---|---|---|
| Ceiling grid | 158–162 lv, ESF 1–3 px | 174 / 47 lv, ESF 2–3 px | equal at this grid |
| Chair mesh | 345–420 (far) / **1438** (walk, near) | 1363 / 1390 (near) | equal when distance matches |
| Door hardware | 169–333 | 98–192 | raw slightly higher |
| Signage plaque | 355–388, ESF 2 px | 381, ESF 1 px | equal; **text unreadable in every source at 1280** |
| Window frame | 122–285 | 62–412 | content/distance dominated, no separation |
| Carpet | 120–234 | 49–81 | raw higher (texture + grain) |

**At the pipeline's own crop grid (11 px/deg at center) raw video and the historical Studio crops are
indistinguishable** — both sources are ~2× oversampled relative to that grid, so the crop step erases the
difference. The raw advantage only exists at ≥2560-equivalent sampling (where C cannot be measured: the 7680 ERP was
never persisted). This is the same conclusion the forensic audit reached from the other side: the 1280 crop already
halves the source density.

## RAW VIDEO SOURCE GATE — PASS

Conditional PASS, with the condition being the whole point:
- Raw dual-lens video **does** preserve additional genuine detail versus the in-camera-stitched stills (glyphs, tile
  texture; 2–3× HF energy at source scale, not explainable by noise alone — the structure is legible).
- Raw video **equals** the historical Studio-ERP observations at the historical crop grid, and exceeds what that grid
  can carry at 2560 sampling — i.e. it contains more than K6 was ever shown.
- The gain is **only realizable if the reconstruction consumes the lenses at ≥ native density** (direct fisheye
  cameras, or ≥2560² pinhole crops). Re-running the existing 1280-crop pipeline on raw frames would reproduce the
  K6 ceiling and read as a false FAIL.

Answers to the five questions:
1. **Stationary raw vs historical Studio observations — not materially sharper at the historical grid; the grid, not
   the source, is the limiter.** At source scale the raw frames carry detail the 1280 crops cannot hold.
2. **Walking keyframes vs stationary ceiling — yes, at or above it** with ~1 keeper / 1.3 s and both lenses gated.
3. **Stitched interval JPEGs vs raw at matched sampling — no.** Higher contrast, less genuine detail. Stills add
   nothing to the experiment.
4. **More recoverable detail in the failed features — yes for ceiling grid/tile texture and fine print (glyphs),
   equal for chair mesh and window frames, unresolved everywhere for plaque text at 1280.** Carpet: more energy, part
   grain.
5. **Raw video as the practical Slate360 source without raw stills — yes.** Interval stills are unnecessary; the
   operational costs are the people mask (operator in lens 1) and exposure control toward bright surfaces.

## ARE WE READY FOR RAW-RIG STAGE 1? — Almost; three prerequisites, none of them training

Prepared (not built): `raw_rig_frames_manifest.json` — 3 tripod frames + 31 `VID_075` keepers (+ `VID_021` keepers
when its scan lands), each with both-lens sharpness and motion; provisional lens model (equidistant f=1200,
measured circle centers); rig = 2 fixed back-to-back cameras, ~2–3 cm baseline; masks = pipeline people mask +
nadir band; holdout = every 10th keeper frozen before SfM; trainer = K6 recipe unchanged. Still required before
the dataset is "physically correct":
1. **Lens calibration** — replace the ±10% equidistant guess: COLMAP `OPENCV_FISHEYE` self-calibration on the
   keepers (the checkerboard is a marker board of unknown dictionary, so direct calibration needs the board spec).
2. **Raw video in the cloud** — `VID_075` first (31 keepers, 98 s), then `VID_021`; `VID_020` adds only 3 stations.
3. **Crop density decision** — direct fisheye cameras in nerfstudio, or 2560² crops; 1280 crops are excluded by
   this gate's own finding.

## WHAT EXACTLY SHOULD RUN NEXT

1. Let the upload finish `VID_020`, then **reorder** to `VID_075` → `VID_021` (the intake chain's order was
   020→075→021; 075 is the more valuable file). Verify byte sizes + SHA256 against the manifest on the volume.
2. Cloud job `room213-raw-intake-analysis` (CPU, no GPU): re-verify hashes; demux both tracks with PyAV for the
   keeper timestamps only; write lens PNGs + people masks; run COLMAP `OPENCV_FISHEYE` on the keepers as a rig
   (fixed sensor_from_rig) to get calibrated intrinsics + poses; emit the frozen raw-rig dataset + holdout list.
   **Stops before any splat training.**
3. Human visual review of `raw/review/feature_*.png` and `raw/r2560/*.png` (`HUMAN_VISUAL_VERDICT` stays
   `UNREVIEWED` until then).

## WHAT DATA, IF ANY, MUST STILL BE CAPTURED

- **None required for stage 1.** `RAW STILL ARM NOT CAPTURED` — no `.insp`/`.dng` anywhere on this host, no SD
  card mounted; the gate shows raw stills are not needed.
- **iPhone/LiDAR: not arrived** (folder unchanged, 74 originals). Inventory separately when it lands; it is metric
  scale / registration / reference, not part of this comparison.
- Optional, for a cleaner *next* capture: keep the operator out of lens 1's center (walk with the pole ahead or
  behind), and avoid pointing lens 0 straight at the bright whiteboard from 1.5 m (placement-1 grain).
