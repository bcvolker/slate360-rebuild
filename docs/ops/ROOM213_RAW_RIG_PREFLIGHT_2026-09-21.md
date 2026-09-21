# Room 213 — raw-rig pretraining preflight (2026-09-21, no training)

Continues the intake and source-gate docs. Volume prefix `slate360-recon-experiments:/room213/2026-09-21/`.
**No Gaussian training was launched. No faces were generated. No camera model was fitted for reconstruction.**
Every "verified" statement below names the artifact it came from. Section timestamps are laptop local (MST).

## X4 CLOUD STATUS

Volume listing at 15:07 + the cloud job's own SHA256 pass (`preflight/verify.json`, app `ap-f11n3pxTj9VkHZ65wt47zB`):

| File | On volume | Byte size | SHA256 vs manifest |
|---|---|---|---|
| `VID_20260921_105956_00_020.insv` (tripod) | **yes** (12:54) | exact | **match** |
| `VID_20260921_111410_00_075.insv` (walk, 31 keepers) | **no** → re-upload started 15:13 | — | — |
| `VID_20260921_110203_00_021.insv` (walk, 87 keepers) | **no** → queued after 075 | — | — |
| stills | 39 of 68 at 15:07, chain continuing; 1 failed (`IMG_060`) → retry pass at the end | 5 SHA256-verified, rest size-only | |
| LRVs | none (deferred, not needed in cloud) | | |

The earlier background chain reported "DONE rc=0" for 075/021 because its status came from `tail`, not from
`modal volume put`; the transfers actually died during the Wi-Fi disruption. The re-upload captures the real exit
code and retries 3×. Originals in `C:\Users\bcvol\OneDrive\Desktop\360 syills and video 213 test` are unchanged.

## NEW IPHONE/LIDAR STATUS — NEW 2026-09-21 CAPTURE CONFIRMED (upload 94 %)

Supabase `digital_twin_captures` / `_capture_assets` + R2 `capture_bundle.json` and `lidar_poses.json.gz` read
directly:

| | NEW 2026-09-21 CAPTURE | OLD PAYNE HALL CAPTURES |
|---|---|---|
| capture id | `2a44da14-a327-43d9-9e8b-083ee2c93514` ("Quick Scans · Sep 21, 11:16 AM") | `ddf04085` (Sep 16, 130 assets), `e3e4daee` (Sep 10, 786 assets, LiDAR) — and the X4/Studio job `cecc2763` that K6 trained on |
| session start | unix 1790014632 = 2026-09-21 11:17:12 local; GPS 33.4187, −111.9367 (ASU Tempe) | |
| RGB stills | **444** hi-res (`highResolutionStills`, wide 1×, 0.5 s interval) — 419 `ready`, **25 still `uploading`** (83 MB) | |
| ARKit poses | **1,538 keyframes** (`transform_4x4`, per-frame `intrinsics`, `gravity`, `heading`, `timestamp`, `ar_timestamp`, `clip_index`) | |
| LiDAR / depth | `lidar_capture.ply.gz` 25 MB, **1,805,621 points**; `lidar_depth.s360depth` 189 MB, 1,093 depth-evidence frames | |
| metadata | `capture_bundle.json` (65 KB): exposure locked 1/250 s, ISO 666, `depthSemantics`, `fastShutter` | |
| metric scale | ARKit-native metric; LiDAR cloud metric | |
| status | `capture_status = uploading`, `uploaded_at = null`, 25 assets not ready **since 11:21 — the phone app has not progressed in ~4 h; it likely needs to be reopened to finish** | |

Validation-only use (scale, geometry sanity, registration, sharp RGB reference). Not used in any X4 appearance
step. The X4 and iPhone were separate passes — trajectories are not expected to coincide; only a similarity
alignment for scale, then rigid for geometry, when that check is run (not run here).

## FACTORY CALIBRATION RECOVERED — NO

The brief asks to load a previously recovered X4 Mei/unified calibration (ξ≈1.948170, fx/fy/cx/cy, k1–k3, p1–p2,
inter-lens transform, ≈32.3 mm baseline). **It does not exist on this host.** Searched: both worktrees (`C:\s360`,
`C:\s360-recon-exp`) — docs, workers, memory; every Claude session scratch dir; the Codex session logs; the Cursor
plans. No file contains ξ, `1.948`, "Mei", "unified camera" or "32.3 mm". The only related material is the two
Cursor plans on 360/LiDAR alignment, which cite the X4 trailer *format* (ExifTool forum topic 15989: registries
0x300 IMU, 0x400 exposure, 0x700 GPS; AdrianEddy/telemetry-parser) — no parser implementation and no lens model.
Likewise "Astra's adversarial prelaunch review" is not on this machine (the only textual hit is the word
*cadastral*).

Therefore, per the brief's own rule, no reconstruction camera model is available: the provisional equidistant fit
(f≈1200 px/rad, used only for the source-gate angular matching) is **not** promoted, and nothing was silently
converted to `OPENCV_FISHEYE`. `cv2.omnidir` (the Mei implementation) is also absent from the laptop's OpenCV
build (non-contrib); the Modal image would need `opencv-contrib-python-headless` to fit or evaluate a Mei model.

## CHARUCO VALIDATION — INSUFFICIENT OBSERVATIONS

Board confirmed from `Downloads\x4_home_charuco_letter_23mm.pdf`: `DICT_4X4_250`, 8×11 squares, 23.0 mm, marker
17.25 mm, 44 markers ids 0–43 (OpenCV `CharucoBoard((8,11),…)` regenerates it and self-detects 70/70 corners).
Detection on the raw 3840² lens frames (`charuco_detections.json`, local + cloud runs agree):

| Set | frames | frames with ≥6 ChArUco corners |
|---|---|---|
| tripod (3 placements × 2 lenses) | 6 | **1** — placement 1, lens 0, t=5.97 s, 18 corners / 19 markers, mean radius 119 px from the lens center |
| walking keepers 075 + 021 (×2 lenses) | 236 | **0** |

The board (184×253 mm) subtends ~200 px in the fisheye at 1.5 m and ~60–100 px at typical walking distance;
17 mm markers fall below the detector's reliable size everywhere except the one close tripod placement. One
placement at one radius/azimuth cannot separate calibration from validation, cannot test residual vs radius or
azimuth, and cannot test the factory parameters (which are absent anyway). **Residual tables by lens / radius /
azimuth / distance: not producible from this capture.**

## INTER-LENS RIG VALIDITY — NOT ESTABLISHED

What is established: two physical lens streams, same container, identical presentation timestamps (below), fixed
mechanical mount. What is not: the relative rotation and the ~32.3 mm baseline are neither recovered from a
factory source nor observable from the target (one lens only sees it). Rotation uncertainty is therefore unbounded
by evidence; a 1° inter-lens rotation error is ≈21 px at the lens center under the provisional scale, i.e. far
outside the 1–2 px budget. Scene-based (common-feature) recovery is possible in the SfM step but is a *refinement*,
not a calibration, and was not run.

## POSE/BA VALIDITY — NOT RUN

Blocked on the camera model. Nothing in the frozen keeper set was solved; no faces exist to solve with.

## SYNC / ROLLING-SHUTTER VALIDITY — SYNC PASS, READOUT UNBOUNDED

- PyAV packet timestamps, both lens streams, `VID_020` and `VID_075`: **identical pts sequences**, cadence exactly
  1001/30000 s, **0 dropped frames**, same start pts. Same-timestamp pairing is exact at the container level.
- Angular velocity: image-motion only (LRV mean-abs-diff; keepers p50 1.75–1.92 /frame at 480², tripod 2.2 static
  floor). IMU not parsed (no parser on host; format reference above).
- Rolling-shutter/readout: X4 readout time unknown here; no bound computed. Not a confirmed blocker, not cleared.

## MASK / COVERAGE VALIDITY — REQUIRED, NOT YET MEASURED

Operator is in lens 1's center in essentially every frame (tripod and walking); pole/stick at the nadir of both.
Estimated loss from the contact sheets: ~10–15 % of lens 1's disc, ~3–5 % of lens 0's (nadir band). The people mask
exists in the pipeline; it has not been run on these frames, so no measured coverage number.

## 2560 FACE VALIDITY — NOT GENERATED

Faces require a validated pixel→ray mapping (round-trip <0.1 px). Only the provisional equidistant model exists;
generating faces from it would bake an unvalidated model into the dataset. Not done.

## ACTUAL TRAINING-LOADER RESOLUTION — VERIFIED FROM INSTALLED SOURCE (cloud introspection)

- `nerfstudio_dataparser.py:39` `MAX_AUTO_RESOLUTION = 1600`; the auto-downscale at lines 470–484 only steps to
  `images_2/` if that folder **already exists**. A 2560 face set with no `images_2/` loads at 2560 as long as
  `--pipeline.datamanager.dataparser.downscale-factor 1` is also pinned explicitly (belt and braces).
- `InputDataset.get_numpy_image` (`base_dataset.py:73`) resamples with PIL BILINEAR only when
  `scale_factor != 1.0` — never in this pipeline.
- splatfacto `resize_image()` box-average schedule: with 2560 inputs, steps 0–2999 at 640², 3000–5999 at 1280²,
  ≥6000 at 2560². So the first 6k steps see ≤1280 — the same schedule shape K6 had, one octave up. Not a hidden
  return to 1280 after step 6000.
- The detail-survival check *through the loader* (mandatory item 9) could not be run: there are no faces to load.

## K6 VALIDITY

- Camera optimizer: `splatfacto.py:213` default `mode="off"`, and K6's resolved config runs it off → derived faces
  cannot drift independently. Rig motion is therefore trivially shared (no motion at all) — acceptable for stage 1.
- Masks: supported (`masks-on-gpu False`, mask tensors downscaled with the image).
- Observation count: K6 trained on 4,868 crops for 20k steps. A raw-rig set of 121 exposures × 2 lenses × ~4 faces
  ≈ 970 faces → each face gets ~5× *more* visits per step budget, not fewer. No iteration-count concern.
- No appearance hyperparameters were changed.

## METRIC / IPHONE VALIDATION — DEFERRED

Data confirmed (above) but 25 stills still uploading and no X4 geometry exists to compare against. Scale test
plan unchanged: similarity align → scale error → rigid → plane/dimension checks.

## DATASET BUILD — FAIL (blocked before construction)

## GAUSSIAN TRAINING — BLOCKED

## SINGLE BLOCKER

**The X4 factory Mei/unified calibration (ξ≈1.948170 …, inter-lens transform, 32.3 mm baseline) is not on this
host or in either repo, and this capture cannot substitute for it: the ChArUco target was resolved in exactly one
frame (one lens, one placement).** Everything downstream — rig validity, faces, loader detail check, BA, splits —
depends on that model. Second-order issues (IMU parser, readout bound, people-mask run) are real but would not
unblock anything on their own.

Two ways to clear it, either is sufficient:
1. Locate the recovered calibration (it was produced somewhere other than this laptop — the desktop, or a
   different assistant's session) and place it at `slate360-recon-experiments:/room213/calib/x4_factory_mei.json`
   with lens identity, conventions, distortion ordering and ray domain stated.
2. Re-shoot a calibration pass only (not the room): the same ChArUco board held at 0.4–1.0 m, filling 30–60 % of
   each lens, swept across the disc (center → rim, all azimuths) for both lenses, ≥3 distances, with a few frames
   where **both** lenses see it at once (for the inter-lens transform). ~3 minutes of video. Then fit Mei (needs
   `opencv-contrib` in the Modal image) with held-out placements.

## EXACT NEXT COMMAND

Not "ready", so no training command. The bounded job that *is* safe to run once the two videos land (re-verifies,
demuxes all 121 keepers × 2 lenses to PNG, ChArUco, splits; CPU; no training):
```bash
cd C:\s360-recon-exp
PYTHONIOENCODING=utf-8 python -m modal run --detach workers/modal/recon-experiment/worker.py --phase room213-raw-preflight
```

## CLOUD EXECUTION / LAPTOP-OFF

**SAFE TO POWER OFF LAPTOP: NO** — as of this writing, `VID_075` and `VID_021` (the 118 walking keepers) are still
being uploaded *from this laptop*, and the iPhone's last 25 stills depend on the phone, not on any cloud job. The
detached preflight job already ran once and completed on what was present (`ap-f11n3pxTj9VkHZ65wt47zB`; persistent
input `/vol/room213/2026-09-21/raw-capture-test/`, persistent output `/vol/room213/2026-09-21/preflight/`). It will
be re-launched detached the moment both videos verify; after that point nothing required depends on the laptop and
the answer flips to YES for that job.
