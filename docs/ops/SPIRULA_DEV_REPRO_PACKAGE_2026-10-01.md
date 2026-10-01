# Spirula developer reproduction package: Room 213 table edge (2026-09-30 → 10-01)

**Purpose.** This is a private package for the Spirula developer (Harry), who replied to our GitHub issue. He suspects that X4 rolling shutter / slight pixel misalignment explains the close table-edge softening. The package contains the source edge (2.12 px), Spirula A (4.79 px), and DENSE-CLOSE (5.01 px).

This was packaging only:
- no training;
- no change to the dataset, cameras or pipeline;
- no production code touched.

Brian sent the link on GitHub on 2026-10-01. **We are awaiting Harry's reply.**

## Where it lives

The presigned URLs are deliberately **not** recorded here.

| Copy | Location | Size | SHA-256 |
|---|---|---|---|
| Internal (original) | R2 `slate360-storage` / `private-developer-share/room213/room213_spirula_repro_2026-09-30.zip`; also on the Modal volume `slate360-recon-experiments` at `room213/2026-09-29/share/` | 7,123,046,698 B | `fc1cf414…2441` |
| **Shared with Harry (neutral)** | R2 bucket **`developer-share`** / `reproduction-package.zip`; also on the Modal volume at `room213/2026-09-29/share/reproduction-package.zip` | 7,191,456,483 B | `f84d1f37…a87b` |

**The neutral copy is the shared one.**
- Text files are scrubbed of "slate360" and "Room 213". The top folder is `repro_package/`.
- Binary payloads are byte-identical to the internal copy.
- The manifest was regenerated.

**`developer-share` is private.**
- It has no public access and no custom domain.
- Unsigned requests return 400.
- It uses its own R2 token: `DEV_SHARE_R2_*` in `.env.local`. The `slate360-storage` token cannot create buckets or reach this one.

**The link expires 2026-10-08 13:03 UTC.** To re-share after that, re-run the presign step in `share_neutral.py:upload` (it re-uploads; a presign-only call is a 5-line change).

## Contents

There are 114 files; per-file SHA-256 values are in `MANIFEST.json`.

**`source/`**
- The **complete, unmodified** `VID_20260929_152303_00_079.insv` (6.74 GB).
- It is not trimmed because a stream-copy cut drops the Insta360 trailer: gyro rec 3, exposure rec 4, timestamps rec 5.
- `insv_metadata.json`: streams, trailer record index, and per-frame exposure. At the close frames the shutter is about 1/128 s (1/128–1/100 within ±15 frames); the clip median is 1/100.

**`physical_frames/` and `masks/`:** close views o06 / o07 / o08 / o09 = 079 cam0 frames 1349 / 1242 / 1362 / 1227, plus each frame's cam1 partner.

**`training_faces/`:** the full 1718² face 0 for each close view, plus the warped mask. These are bit-identical to the cp1 diagnostic crops.

**`cameras/`:** the A `sparse/0`, the exact face cameras, and a text subset.

**`config/`:** `resolved_config_A.json` and the run's `config.json` and `scene_transform.json`.

**`model/`:** A `splat.ply` at step 30k.

**`target/`:** crops, full renders (A and DENSE-CLOSE), and the figures.

**`diagnostics/`:** the measurement JSONs, the scripts, and `measure_T_table/`.

**Self-check while building.** We re-ran `analyze_edges.py` on the packaged files only:

| Model | Edge width (source → render) |
|---|---|
| A | 2.12 → 4.79 px |
| DENSE-CLOSE | 2.11 → 5.05 px (the earlier report said 5.01) |

## Privacy review

- **No secrets.** A regex scan was run over all text files.
- **No GPS.** There is no trailer record 7 and no container location tags.
- **Present and not removable without altering the evidence:**
  - the operator's face and shirt logo in the rear lens;
  - an AAC audio track;
  - the camera serial number in the trailer.

  Brian was told before sharing.

## Not included / limitations

- **Full A workspace not included.** Retraining from scratch needs the 1016 images and masks; we can send them on request.
- **Sensor readout time unknown.**
- **Standalone render script untested.** `render_at_face_cameras.py` is a standalone extraction of `cap_render.render_release_v2` and has not been run outside Modal.

## Code

All code is in `workers/modal/room213-repro-package/`.

| File | What it does |
|---|---|
| `probe_insv.py` | `.insv` trailer and container probe |
| `build_pkg.py` | `stage` / `pack` / `upload` |
| `share_neutral.py` | scrubbed copy, then upload to `developer-share` |
| `PACKAGE_README.md` | the README shipped in the package, pre-scrub |
| `render_at_face_cameras.py` | standalone render routine |

`build_pkg.py` expects a local `stage/` dir holding the forensic scripts from `workers/modal/room213-forensic/` and the dev-report JSONs from `docs/ops/spirula-dev-report-2026-09-30/`. Both live on `feature/spirula-worker-hardening`, **not on main**.
