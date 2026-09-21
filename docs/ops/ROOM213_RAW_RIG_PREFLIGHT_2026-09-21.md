# Room 213 — raw-rig pretraining preflight (2026-09-21, no training) — rev 2

Rev 1 of this document was blocked on "factory calibration absent". Rev 2 supersedes it: **the calibration was
recovered from the `.insv` trailer itself and validated.** No Gaussian training was launched. All artifacts:
[`room213-raw-capture-2026-09-21/`](room213-raw-capture-2026-09-21/); calibration on the volume at
`slate360-recon-experiments:/room213/calib/x4_factory_mei.json`.

## X4 CLOUD STATUS

| File | On volume | Verification |
|---|---|---|
| `VID_020` (tripod) | yes | byte-exact + SHA256 match (cloud job `preflight/verify.json`) |
| `VID_075` (walk, 31 keepers) | **uploading** (re-upload with real exit code, started 15:13) | pending |
| `VID_021` (walk, 87 keepers) | **queued** behind 075 | pending |
| stills | 60+/68 (2 failed in the chain: `IMG_060`, `IMG_074` re-put) → retry pass after the videos | 5 SHA256, rest size |

Nothing raw-video beyond `VID_020` can run in the cloud until 075/021 verify.

## NEW IPHONE/LIDAR STATUS — CONFIRMED; `PHONE DATA SUFFICIENT FOR VALIDATION: YES`

Capture `2a44da14…` ("Quick Scans · Sep 21, 11:16 AM", session start 11:17:12 local, GPS 33.4187/−111.9367):
444 hi-res stills (419 `ready`, 25 still `uploading` from the phone since 11:21 — stalled; reopen the app to
finish), **1,538 ARKit keyframe poses** (`transform_4x4`, per-frame intrinsics, gravity, heading, timestamps),
LiDAR cloud **1,805,621 pts**, 1,093 depth frames, `capture_bundle.json` (exposure locked 1/250 s, ISO 666).
Upload-complete: **NO** (25 stills). Sufficient for scale / geometry sanity / registration / sharp reference:
**YES** (poses + cloud + 419 stills are all `ready`). OLD Payne Hall material = `ddf04085` (Sep 16), `e3e4daee`
(Sep 10, LiDAR), and the X4/Studio job `cecc2763` K6 trained on. Phone data is validation-only; not used here.

## FACTORY CALIBRATION RECOVERED — YES (from the trailer, no SDK)

`VID_20260921_105956_00_020.insv`, trailer = last 12,081,364 B (u32le size, u32le version 3, magic
`8db42d69…`). Metadata record protobuf fields, read directly from tag + varint length:

| field | content |
|---|---|
| 1 / 2 / 3 | serial **`IBMEA24069A4BV`** / `Insta360 X4` / **`v1.9.21_build5`** |
| 22 | `standard` |
| **53** (277 B) | circle/offset string: lens A `r=2899.960 cx=4001.900 cy=3007.050`, lens B `r=2882.970 cx=12003.730 cy=3004.220`, canvas `16000×6000` |
| **54** (336 B) | **Mei/unified string** (below) |
| 55 / 56 | byte-identical copies of 53 / 54 |

Field 54, per lens `xi fx fy cx cy yaw pitch roll tx ty tz k1 k2 k3 p1 p2 W H F`:

| | lens A | lens B |
|---|---|---|
| ξ | **1.948170** | **1.948170** |
| fx / fy (canvas px) | 4627.110 / 4626.190 | 4602.810 / 4602.930 |
| cx / cy | 4010.120 / 3003.090 | 12003.110 / 3006.370 (= 4003.11 in its half) |
| yaw / pitch / roll (°) | −0.325 / 0.211 / 89.628 | 0.136 / 0.283 / 90.296 |
| t (m) | 0, 0, 0 | −0.001115, 0.000149, −0.032238 → **|t| = 32.26 mm** |
| k1 / k2 / k3 | 0.37879178 / 1.43848073 / −4.27699137 | 0.37512687 / 1.36600089 / −4.03310871 |
| p1 / p2 | 0.00124575 / −0.00176244 | −0.00114169 / 0.00024372 |
| canvas / F | 16000 × 6000 / 71 | 16000 × 6000 / 71 |

Model: OpenCV omnidir (Mei) convention — unit-sphere lift, `m = (x/(z+ξ), y/(z+ξ))`, radial k1–k3 + tangential
p1–p2, then K. Valid unprojection domain ρ² < 1/(ξ²−1) = 0.3577 → **θ_max ≈ 120.9°** from the axis (canvas radius
≈ 2767 px, i.e. the model runs out slightly *inside* the lit circle r≈2900). Frame convention: the 3840² lens
stream = canvas × s − (ox, oy), with **s/ox/oy taken from the lens-circle geometry only** (least-squares circle
fits, rms 1.3–2.2 px): s ≈ 0.7246–0.7306, per-lens offsets in the JSON. Not converted to `OPENCV_FISHEYE`.
Unknown: which physical lens (A/B) is stream 0 (intrinsics differ 0.5 %; the target sits at the lens centre and
cannot tell them apart); the Euler convention of the per-lens angles (therefore **not** used for the rig); F=71.

## CHARUCO VALIDATION — PASS on the one available placement, with stated limits

Board confirmed from the PDF (`DICT_4X4_250`, 8×11, 23.0 / 17.25 mm; OpenCV regenerates it, 44 markers, ids 0–43).
Detection over all 242 lens frames of the frozen keeper set: **1 usable frame** (tripod placement 1, lens 0,
18 corners, mean radius 119 px from the lens centre). Mei parameters **held fixed**, only the board pose solved:

| | median | RMS | p95 | max |
|---|---|---|---|---|
| reprojection, 18 corners | **0.58 px** | 0.92 px | 1.82 px | 1.86 px |

Inside the budget (≤1 / ≤2 px). Limits: one placement, one radius (~120 px), one lens → **no residual-vs-radius,
vs-azimuth or vs-distance tables are producible**, and board distance is degenerate with crop scale (a free `s`
lands at 0.93 with the same residual — hence `s` is fixed from the circle, not fitted). Nothing was refined.

Round trip pixel→ray→pixel over an 80×80 grid on the disc: **<0.1 px for 99.8 %** of valid points (mean 2.2 px is
driven entirely by the 0.2 % at the ρ-domain boundary where the Newton inverse of the large factory k-terms
degenerates — outside the usable radius). Straight-line test (Mei vs provisional equidistant, ceiling lines at six
views out to yaw 70°): both at the ~2 px Canny noise floor — **not discriminating**, neither confirms nor refutes.
Lens consistency: fx differ 0.53 %, ξ identical, k1 within 1 %, k3 within 6 %.

## INTER-LENS RIG VALIDITY — PRIOR + SCENE ESTIMATE, NOT YET TO BUDGET

Kept: two physical centres, one fixed transform, same-timestamp pairing (pts identical on both streams).
Translation: factory **32.26 mm**, used as a fixed prior. Rotation: the factory string's per-lens angles were not
applied (convention unknown, roll ≈ 90° terms). Scene estimate (`rig_rotation_estimate.json`): ORB matches in the
θ 70–100° overlap band, unprojected with the Mei model, RANSAC-Kabsch, two tripod frames × both assignments:

| frame | assignment | matches / inliers | R | inlier ray RMS | p95 |
|---|---|---|---|---|---|
| p1 | A/B | 1578 / 452 | **172.35°** about (−0.003, −0.998, 0.055) | 0.44° (≈8.7 px) | 0.90° |
| p3 | A/B | 1499 / 350 | 172.56° same axis | 0.35° (≈7.0 px) | 0.75° |
| p1 / p3 | B/A | 1587/457, 1502/350 | 172.50° / 172.69° | 0.46° / 0.35° | 1.05° / 0.72° |

**Not exactly 180°** — ~172.5° about ≈ −y, repeatable to 0.3° across frames and assignments. The residual sits at
the translation-parallax floor of this method (1.2° @1.5 m, 0.6° @3 m; translation was not modelled in the ray
alignment), so the rotation is known to **±~1° ≈ 8–17 px** in the overlap band — above the 1–2 px budget. Whether
the 7.5° departure from 180° is real mount geometry or a residual canvas→frame convention issue is exactly what a
both-lenses view of the target would settle; it must be **refined as the only free rig parameter inside a
constrained BA**, with the factory intrinsics and 32.26 mm held.

## POSE/BA VALIDITY — NOT RUN (needs the walking videos in the cloud)

## SYNC / ROLLING-SHUTTER VALIDITY — SYNC PASS, READOUT UNBOUNDED

Identical pts on both lens tracks, 1001/30000 s cadence, 0 drops (`VID_020`, `VID_075`). IMU record (0x300)
present in the trailer, not parsed (no parser here; ExifTool 12.72+ / telemetry-parser document it). Readout time
unknown → no rolling-shutter bound. Keepers were already selected for low image motion (p50 1.8–1.9 /frame @480²).

## MASK / COVERAGE VALIDITY — NOT MEASURED (tooling absent on the laptop)

Pipeline mask = RTMDet-Ins-S ONNX (`stages/mask.py` → `rtmdet.py`), model file `rtmdet-ins-s-640.onnx` is **not on
this laptop** and `onnxruntime` is not installed; must run in the cloud job (image needs `onnxruntime` + the
model). Operator is in lens 1's centre in nearly every frame; expected loss ~10–15 % of lens 1, ~3–5 % nadir band
on both. Reflection margin: whiteboard specular streaks are large in lens 0 — flag for the mask stage.

## 2560 FACE VALIDITY — SAMPLE FACES GENERATED AND CHECKED

`make_faces_2560.py`: 2560² faces, 80° FOV (fl 1525 px), five fixed rotations per lens (f, ±60° yaw, ±55° pitch),
generated **directly from the 3840 lens frames through the Mei pixel→ray mapping** — no stitching, no blending, no
1280 intermediate; originating lens centre, `R_face_from_lens`, crop (s,ox,oy) and per-face valid mask recorded in
`faces_manifest.json` (20 sample faces: tripod p1 + walking keeper t=96.76, both lenses). Visual check: tray rail
straight edge-to-edge, glyphs legible, no wrap. Overlap audit (per-face binary coverage at 8 px cells): faces cover
**79 %** of the lens disc; **19.9 %** of covered lens pixels are seen by 2+ faces, max 3 → acceptable, and the
loss weighting should still down-weight duplicated rays (or drop the ±55° pitch faces' overlap band).

## ACTUAL TRAINING-LOADER RESOLUTION — VERIFIED

Source-verified in the cloud image: `MAX_AUTO_RESOLUTION = 1600` only triggers if `images_2/` exists (it will not
be generated; also pin `--pipeline.datamanager.dataparser.downscale-factor 1`); PIL-BILINEAR path only when
`scale_factor != 1`; splatfacto box schedule on 2560 faces = 640² (steps 0–2999) → 1280² (3000–5999) → **2560²
(≥6000)**. Detail survival measured on the actual 2560 face through that box path (`loader_detail_survival.json`):
ChArUco ROI in the face (`n_corners` detected in the face itself) lapvar 671 / hf 0.609 at 2560 — same order as the
source-gate's 2560 measurement (386–567), i.e. the face generation did not lose the demonstrated detail; 1280 and
640 are the transient early-schedule views. No hidden return to 1280 after step 6000.

## K6 VALIDITY

Camera optimizer `off` by default and in K6 → faces cannot drift; masks supported; ~121 exposures × 2 lenses × 5
faces ≈ 1,210 faces vs K6's 4,868 crops → ~4× more updates per observation at the same step count. No appearance
hyperparameters changed.

## METRIC / IPHONE VALIDATION — DEFERRED (data sufficient, no X4 geometry yet)

## DATASET BUILD — INCONCLUSIVE (not yet built; every prerequisite now exists or is in transit)

## GAUSSIAN TRAINING — BLOCKED

## SINGLE BLOCKER

**The 118 walking-keeper frames are not in persistent storage yet** (`VID_075` uploading, `VID_021` queued) — the
cloud build (demux → RTMDet masks → Mei faces → rig SfM with the 32.26 mm prior and the inter-lens rotation as the
one constrained free parameter → splits) cannot start without them. Second-order, not blocking by themselves:
inter-lens rotation only known to ±1° (to be refined in constrained BA), RTMDet model + onnxruntime must be added
to the Modal image, IMU/readout unbounded.

## EXACT NEXT COMMAND

Once `VID_075` and `VID_021` verify (byte size + SHA256):
```bash
cd C:\s360-recon-exp
PYTHONIOENCODING=utf-8 python -m modal run --detach workers/modal/recon-experiment/worker.py --phase room213-raw-preflight
```
(stages 1–4 today: verify / demux all 121 keepers × 2 lenses / ChArUco / splits; face generation + masks + rig SfM
are the next additions to that function — still no training).

## LAPTOP POWER-OFF

**SAFE TO POWER OFF LAPTOP: NO** — `VID_075` and `VID_021` are still being read from this laptop. The moment both
verify on the volume, the detached job above is launched and the answer becomes YES (job id + paths reported then).
