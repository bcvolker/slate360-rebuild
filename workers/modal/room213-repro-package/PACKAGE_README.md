# Room 213: close table-edge softening (Spirula v2026.9.24), repro subset

## Problem

The source is continuous Insta360 X4 8K walking video. A representative close table edge looks visibly sharper in the source observations than in the trained model.

Edge width (10–90%) at the 4 close training cameras, 0.79–0.97 m from the edge, all through lens 0:

| | Edge width |
|---|---|
| Source (exact training-face pixels) | **2.12 px** |
| Spirula A (native render at the same cameras) | **4.79 px** |

- **Close-view disagreement:** the four close views agree on the table plane to about **0.57 px** (median).
- **Never-trained neighbour frames** (±1, decoded from the `.insv`) have the same edge width as the training frames (×1.03).
- **More close views did not help.** We added about 90 extra close frame pairs (`sam extract -s 8` inside the close passes), and the edge came out **5.01 px** (DENSE-CLOSE).

## What is included

| Folder | Contents |
|---|---|
| `source/` | The **complete, unmodified** original `VID_20260929_152303_00_079.insv` (6.74 GB) and `insv_metadata.json` (streams, trailer record index, per-frame exposure near the close frames). It is not trimmed because a stream-copy cut drops the Insta360 trailer (gyro/exposure/timestamps) and shifts frame alignment. |
| `physical_frames/` | The extracted physical-lens frames Spirula trained on: the 4 close observations from cam0, plus the cam1 frame of each pair. JPEG q95, 3840². The filename is the source frame index. |
| `masks/` | Spirula's masks for those 8 frames. White = train. |
| `training_faces/` | The full 1718² perspective face each close observation falls in (face 0, f = cx = cy = 859), plus the same face warp applied to the mask. |
| `cameras/` | The full A SfM model (`sparse_0/`, COLMAP binary plus rigs) and a text export of camera models plus the poses of the 8 frames. Also `face_cameras_T_table.json`, the exact world→camera face cameras used for the renders, and `spirula_manifest.yaml`. |
| `config/` | `resolved_config_A.json` and the run's own `train_config.json` and `train_scene_transform.json`. Absolute paths have been made relative. |
| `model/` | Spirula A, final `splat.ply` at step 30k. |
| `target/` | `table_target.json` (3D point, plane, the close observations with face pixel and bbox, and all 34 observations). Crops: physical lens, training face, render A, render DENSE-CLOSE. Full 1718² renders. Figures. |
| `diagnostics/` | Existing measurement JSONs (edge widths, Gaussians near the target, refinement score history, screen size), the scripts, and `measure_T_table/`, the exact inputs to the edge measurement. |

## Exact reproduction

**Which observations.** In `target/table_target.json`, the close views are `close_observations`:

| Tag | Image | Source frame | Time | Distance |
|---|---|---|---|---|
| o06 | `cam0/01349.jpg` | 1349 | 45.01 s | 0.79 m |
| o07 | `cam0/01242.jpg` | 1242 | 41.44 s | 0.80 m |
| o08 | `cam0/01362.jpg` | 1362 | 45.45 s | 0.97 m |
| o09 | `cam0/01227.jpg` | 1227 | 40.94 s | 0.96 m |

All four are in face 0. `face_px` and `face_bbox` give the target location in the 1718² face.

**Measure the edge.** Needs `numpy`, `opencv-python`, `pycolmap==4.2.0`.

```
cd diagnostics
MODEL=A      python scripts/analyze_edges.py measure_T_table ../cameras/sparse_0 out_A.json
MODEL=Adense python scripts/analyze_edges.py measure_T_table ../cameras/sparse_0 out_dense.json
```

We ran this on exactly these files while building the package. It gives 2.12 → 4.79 px for A and 2.11 → 5.05 px for DENSE-CLOSE. The original diagnostic quoted 5.01 px for DENSE-CLOSE.

**Render the target.** This needs the release binary, v2026.9.24, sha256 `7e584142…cf97`.

```
python diagnostics/scripts/render_at_face_cameras.py <spirula> model/splat_A_step30000.ply cameras/sparse_0 \
       physical_frames cameras/face_cameras_T_table.json renders_out
```

- It uses `train 360-camera --init-ply … --num-iterations 0 --eval-mode filename`.
- This script is a standalone extraction of the render routine we ran on our cloud workers. That routine produced `target/full_renders/`. The standalone copy itself has not been run outside our environment.

**Regenerate a training face.**

```
forensic_geom.face_pixels(cam, img, 0, 0, 0, 1718, 1718)
```

- It mirrors CameraMath.cpp / ImageWarp.cu: one bilinear tap per pixel centre, no prefilter.
- It is bit-identical to the crops used in the measurement.
- The trainer additionally erodes masks by 0.005·√(W·H) px. That erosion is not applied to `training_faces/*_mask.png`.

**Neighbour frames.**
- `diagnostics/scripts/adjacent.py` decodes frames idx−2…idx+2 from the `.insv` with PyAV. Lens track = cam index.
- Its decode of idx matches Spirula's JPEG at NCC 0.995.
- The resulting face-warped crops are in `measure_T_table/T_table/adj/`.

## Camera/capture information

**Camera and file**
- Insta360 X4 in 8K 360 video mode.
- The `.insv` holds two HEVC Main (yuvj420p) lens tracks, each 3840×3840 at about 105 Mbps, at 30000/1001 fps.
- 7662 frames per track; 255.7 s; AAC audio.

**Shutter** (auto exposure, Insta360 trailer record 4)
- Clip median is 1/100 s.
- At the close frames the nearest record reads about 1/128 s, ranging 1/128–1/100 s within ±15 frames.
- Matching records to frames by timestamp is approximate.
- We do not have the sensor readout (rolling-shutter) time.

**Motion**
- Handheld, walking, about 0.45 m/s near the target (from SfM centres).
- o09 → o07 is one pass, about 21 cm in 0.5 s. o06 → o08 is the return pass in the opposite direction.
- These frames are in an out-and-back close pass at 36.5–50.5 s.
- `use_camera_optimizer = false`, so SfM poses stay fixed in training.

**Extraction:** `sam extract -s 15 -k 3 --sync -q 95` keeps the sharpest of a few candidate frames per 15-frame window. 510 pairs.

**Masks:** `sam mask` (border) plus `sam track` (SAM 3, "person; hand; backpack; shadow of person").

**SfM:**

```
sfm auto --quality high --data-type video --camera-model thin-prism-fisheye --camera-mode folder --mapper flat --features sift --matcher bruteforce --manifest <dual-fisheye rig, .insv telemetry> --masks
```

Result: 1016/1020 images registered, 1.13 px. One THIN_PRISM_FISHEYE camera per lens, dual-fisheye rig.

**Projection:**
- `train 360-camera` defaults (`warp_to_pinhole`): each fisheye becomes 5 pinhole faces of 1718², f = 859. Faces are made on the fly in the trainer; we reproduce them in `training_faces/`.
- 30k steps; the 1M cap is reached at about step 1.4k.

## Why we're sharing it

You suggested rolling shutter / slight pixel misalignment from 8K walking video as a likely cause. This subset gives you:
- the original observations: the full `.insv` with its trailer;
- the exact derived training inputs, cameras and config;
- the trained output and the edge measurement.

That should let you test that possibility directly.
