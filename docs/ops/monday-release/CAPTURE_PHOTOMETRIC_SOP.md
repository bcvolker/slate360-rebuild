# Capture photometric SOP — Monday spatial

Date: 2026-09-01  
Scope: future reconstruction. **Do not retrain Brush or rerun TSDF/SfM/SIM3 for Monday.**

## Goal

Scenes will contain bright exterior windows, dim interiors, stadium entries, dark tunnels, and bright field lights. Architecture must carry **per-capture / per-frame exposure metadata** and photometric normalization **before** Gaussian training. Presentation tone-mapping is a derivative, never geometric truth.

## Source of truth

1. Keep the original capture master (X4/X6 Insta360 files, iPhone LiDAR, exposure logs) immutable.
2. Do not apply a destructive global auto-level to masters.
3. Training inputs may be exposure-compensated copies. Masters stay untouched.
4. Viewer presentation may use local tone mapping on **display derivatives only**. Do not bake that into the splat or mesh.

## Metadata the dataset schema must allow (not X4-specific)

Do not hard-code X4 assumptions into the clip/dataset schema. Store optional photometric fields on `capture_meta` / per-frame records:

| Field | Meaning |
|---|---|
| `iso` | Sensor ISO |
| `shutter_s` | Exposure time (seconds) |
| `ev` | Exposure value if the camera reports it |
| `white_balance_k` | Kelvin, if known |
| `color_profile` | Camera color space / Insta360 color mode |
| `hdr_mode` | off / in-camera HDR / bracket |
| `frame_exposure[]` | Optional per-frame EV offset relative to a reference frame |

X6 (and later) must fit the same keys. Missing fields mean “unknown”, not “sRGB auto-leveled”.

## X4 current best settings (operator SOP, not schema)

These are capture recommendations for the current HouseWalk/kitchen kit. They are **not** dataset defaults.

- Indoor walkthrough: lock exposure when walking between rooms if the camera allows; otherwise prefer a stable EV and accept window clip rather than pumping ISO every doorway.
- Avoid Insta360 “auto HDR” that rewrites the master if a linear/log-ish original is available.
- Keep the operator nadir out of training (see operator mask track). If the nadir is mostly operator, drop it.
- iPhone metric mesh remains floor/scale truth. Do not invent floor albedo with generative fill.

## Before Gaussian training (next reconstruction step)

1. Read per-frame exposure if the stitcher/export provides it.
2. Normalize color/exposure **before** Brush/Gaussian training so SH does not bake mixed EV into appearance.
3. If Brush supports exposure compensation in the current train path, use it on the **training copy**.
4. Preserve the source master beside the training set.
5. No generative fill behind the operator. Mask / drop the region.

## Viewer

- Kitchen Twin already sets `NoToneMapping` + sRGB output. Keep that. Do not add a second filmic map on top of an already-toned splat.
- Walkthrough 360 is a video derivative: if a display grade exists, it is playback-only.

## Monday

Do not retrain. This SOP is the contract for the X6-capable pipeline after the commercial demo.
