# Room 213 — new raw X4 capture intake + cloud handoff (2026-09-21)

Status: **intake/staging only. No training run, no Studio processing, originals untouched.** Written under a
~15-minute Wi-Fi deadline; the "cloud upload status" section is a snapshot — re-verify with
`python -m modal volume ls slate360-recon-experiments room213/2026-09-21/raw-capture-test` before relying on it.

Local folder (laptop `bcvol`): `C:\Users\bcvol\OneDrive\Desktop\360 syills and video 213 test`
Manifest (same folder + this repo dir): `room213-test-manifest.json` (SHA256 for all 74 files).

## FILES FOUND (74 files, 12.0 GB)

| Group | Count | Files |
|---|---|---|
| 1. X4 interval stills | 68 | `IMG_20260921_105734_00_005 … _019` (15, 10:57–10:59) and `IMG_…_022 … _074` (53, 11:07–11:13); ~7.5 s interval, 12.8–15.0 MB each |
| 2/3. X4 video — tripod/static | 1 | `VID_20260921_105956_00_020.insv` 1.42 GB, 52.9 s (+ `LRV_…_020.lrv` 72 MB) |
| 2/4. X4 video — walking | 2 | `VID_20260921_110203_00_021.insv` 7.23 GB, 274.1 s; `VID_20260921_111410_00_075.insv` 2.60 GB, 97.9 s (+ LRVs 316 / 122 MB) |
| 5. calibration / reference target | — | checkerboard sheet on the center whiteboard; visible in stills and (by position) video — not separate files |
| 6/7. iPhone imagery / LiDAR-ARKit | 0 | **not present** at inventory time (operator: upload in progress) |
| 8. incomplete / still uploading | 0 in folder | all 74 files readable end-to-end (hashed in full) |

Tripod-vs-walking classification is from image motion on the LRV proxies (mean abs frame diff at 320²: ~3 static vs
~17 continuous), not from filenames or gyro.

## X4 STILL FORMAT — not what we wanted

- JPEG, **5888×2944 (2:1), in-camera-stitched equirectangular**, GPano XMP present, `Make: Arashi Vision`,
  `Model: Insta360 X4`, `Software: v1.9.21_build5`, f/1.9, 1/100–1/200 s, ISO 112–200.
- **Not** side-by-side dual fisheye; the two lens circles are **not** preserved; **no `.dng` / `.insp`** in the
  folder at all. The camera was in a JPEG-panorama still mode, so every still has already been through the X4's
  *on-device* stitcher (a different stitcher than Insta360 Studio, but still a stitch + resample before we see it).
- Consequence for the experiment: arm **A (interval stills = raw dual-fisheye observations) is not available from
  this capture.** The stills are usable as a *third stitched-ERP source* (on-device stitch vs Studio stitch) but
  not as a raw-sensor reference. Front/back fisheye previews were therefore not extracted (there are none to
  extract). Three representative stills (005, 022, 074) were inspected directly; preview of 022 confirms the
  checkerboard target on the whiteboard and the operator at both seam edges (yaw ±180°).

## X4 VIDEO FORMAT — this is the raw dual-lens source

- Container: MP4/ISOBMFF (`ftyp avc1 … isom`), `mdat` first, `moov` at end, then an **Insta360 trailer box** ending
  in the magic `8db42d694ccc418790edff439fe026bf` — same trailer format as previously recovered.
- **3 tracks: 2× video 3840×3840 HEVC 29.97 fps (one per lens) + 1 audio.** OpenCV exposes track 0 only (one
  fisheye circle per 3840² frame); the second lens needs a demuxer that selects track 1 (PyAV — not installed on
  the laptop; the Modal training image has full ffmpeg via OpenCV/torchvision and can be given PyAV).
- Timestamps: `VID_020` 10:59:56, `VID_021` 11:02:03, `VID_075` 11:14:10 (filename + mtime; 30 fps, 1584 / 8216 /
  2935 frames).
- Six representative track-0 frames extracted to PNG (laptop scratch only): `VID_020` @10 s, 30 s; `VID_075`
  @20 s, 60 s; `VID_021` @30 s, 120 s. No stitching, dewarp, or processing applied.

## TRIPOD STABLE WINDOWS (`VID_20260921_105956_00_020.insv`, image-motion on LRV, 6 samples/s)

Three placements with repositioning between them:

| Placement | unstable start | settling | **stable interval** |
|---|---|---|---|
| 1 | 0.0 s (light, ≤2 s) | 0.0–3.0 s | **3.0 – 17.0 s** |
| 2 | 17.0 s (move) | 20.4–23.0 s | **23.0 – 35.5 s** |
| 3 | 35.7 s (move) | 39.5–42.0 s | **42.0 – 52.5 s** |

Use only the bold intervals for still-vs-video comparisons. Gyro-trailer confirmation not yet done (image motion
was sufficient to bracket them; the trailer parser can tighten to sub-second later).

`VID_021` and `VID_075` are walking clips: continuous motion the entire duration, no stationary window ≥3 s.

## IPHONE / LIDAR STATUS

Nothing in the folder. When it lands, inventory it (`room213-test-manifest.json` groups 6/7) but it does not gate
any X4 work. Intended use: geometry truth, metric scale, registration, sharp RGB reference — not an X4 substitute.

## CLOUD UPLOAD STATUS (Modal volume `slate360-recon-experiments`, prefix `room213/2026-09-21/raw-capture-test/`)

Why Modal and not OneDrive/R2: the folder is inside the OneDrive tree but **OneDrive is not syncing it** (files
carry plain `Archive` attributes, no cloud reparse state, and no `OneDrive.exe` process was running). The Modal
volume is where every prior Room 213 experiment's inputs already live, so it is the location any cloud job needs
anyway. Uploads use `modal volume put` (per-file; a file interrupted mid-transfer must be re-put — the manifest's
SHA256 column is the completeness check).

Priority-ordered upload chain was started at 11:59 laptop time: 5 stills → `VID_020` (tripod) → `VID_075` →
`VID_021` → remaining 63 stills → 3 LRVs. **Confirmed complete before this doc was written:** stills 005, 022,
051, 074, 017. `VID_020` was in progress. Everything after that is not yet in the cloud unless the volume listing
says so. Measured throughput was low (~0.5 MB/s on the stills), so expect the big videos not to have finished
before the Wi-Fi loss — check, don't assume.

To resume after reconnecting (skips files already present by name; re-put anything whose remote size mismatches):
```bash
cd "/c/Users/bcvol/OneDrive/Desktop/360 syills and video 213 test"
PYTHONIOENCODING=utf-8 python -m modal volume ls slate360-recon-experiments room213/2026-09-21/raw-capture-test
for f in VID_20260921_105956_00_020.insv VID_20260921_111410_00_075.insv VID_20260921_110203_00_021.insv IMG_*.jpg LRV_*.lrv; do
  PYTHONIOENCODING=utf-8 python -m modal volume put slate360-recon-experiments "$f" "room213/2026-09-21/raw-capture-test/$f"
done
```

## WHAT IS SAFE TO PROCESS WHILE THE LAPTOP IS OFF

Only what the volume listing shows as present **and** whose size matches the manifest. At minimum the 5 stills
(on-device-stitched ERP, 5888×2944) — enough for the stitched-ERP-vs-Studio-ERP feature comparison and for
locating the seven failure features + checkerboard. Raw dual-lens video analysis needs `VID_020` (tripod) at
least; nothing raw-fisheye can run until that is confirmed uploaded.

## SOURCE-LEVEL TEST PLAN (frozen; no training)

Arms, revised for what the capture actually contains:
- **A′** X4 interval stills — *on-device-stitched ERP* (not raw; arm A as originally defined does not exist here)
- **B** X4 raw dual-stream video, track 0 + track 1, restricted to `VID_020` stable windows (tripod) and
  sharpness-selected keyframes from `VID_021`/`VID_075` (walking)
- **C** historical Room 213 Studio-ERP → 1280 crop pipeline (K6 baseline inputs, frozen job `cecc2763`)

Questions, unchanged in intent:
1. Stills vs video at source: A′ vs B, **angular scale matched first** (ERP 5888 px/360° = 16.4 px/deg at the
   equator; fisheye 3840 px across ~200° ≈ 19 px/deg at center, falling toward the rim — compare at equal px/deg
   or resample both to a common pinhole crop) before any sharpness claim.
2. Raw dual-fisheye vs Studio-derived: B vs C on the same features, same angular scale.
3. Better observations of the 7 failure features (ceiling grid, chair mesh, window frame, signage/text, door
   hardware, tabletop/object edge, carpet) + the checkerboard: per source record sharpness (lapvar, hf_ratio),
   10–90 % edge-spread width, motion/gyro rate at that frame, distance if recoverable, and lens-center vs
   overlap/seam position. Same metric code as `docs/ops/room213-source-detail-audit/detail_forensic_audit.py`.
4. Is the video alone adequate: B keyframes vs A′ — if the stable-window video frames match or beat the
   on-device-stitched stills at matched scale, stills add nothing and raw video is the path.

No winner is declared until angular scale is matched; `HUMAN_VISUAL_VERDICT` stays `UNREVIEWED`.

## NEXT CLOUD JOB (prepared, NOT started)

A bounded CPU-only Modal function (no GPU, no training) in `workers/modal/recon-experiment/worker.py`, phase
`room213-raw-intake-analysis`, reading only `/vol/room213/2026-09-21/raw-capture-test/` and writing only to
`/vol/room213/2026-09-21/analysis/`. It should: verify sizes/SHA256 against the manifest; demux both video tracks
(PyAV) for the stable windows / keyframes; compute per-frame sharpness + motion; build contact sheets; locate the 7
features + checkerboard; compare A′/B/C at matched angular scale; emit a proposed raw-rig dataset manifest.
It must not train, must not touch `experiments/room213-exp6/*` or the frozen recipe. It was not started because
the required raw video had not finished uploading at write time. Start with:
`PYTHONIOENCODING=utf-8 python -m modal run --detach workers/modal/recon-experiment/worker.py --phase room213-raw-intake-analysis`
(function to be added; the manifest + this doc are the spec).

## BLOCKERS

1. **Stills are not raw dual-fisheye** — the still-mode setting produced in-camera-stitched JPEG ERP, no DNG. If a
   raw-still arm is wanted, the X4 must be re-shot in a RAW/DNG or `.insp` dual-fisheye still mode.
2. **Upload bandwidth** — 12 GB at the observed rate does not fit a 15-minute window; the raw videos are the
   likely casualty. Re-run the resume loop above when Wi-Fi returns; the manifest hashes decide what is trustworthy.
3. Second video track needs PyAV (or ffmpeg) — not on the laptop; add to the Modal image for the cloud job.
4. iPhone/LiDAR set not present yet.
