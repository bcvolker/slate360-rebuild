# Slate360 Capture Studio

Desktop operator app. Drop a capture, get a Gaussian splat the Twin viewer can
open, optionally publish a share link. Free, local, commercially clean.

Launch: `scripts/local-splat/studio/Launch-Capture-Studio.bat`
(or run `Install-Capture-Studio-Shortcut.ps1` once for a desktop icon).

## Engine (all free, all local)

| Step | Tool | License | Where it runs |
|---|---|---|---|
| Pull stills from video | ffmpeg 9 | LGPL | Windows |
| Sharpness filter | OpenCV | Apache-2.0 | WSL (ext4 disk) |
| Camera positions | pycolmap 4.1 | BSD-3 | WSL |
| 360 handling | pycolmap camera **rig**: cube faces share one pose per panorama | BSD-3 | WSL |
| Gaussian training | Brush 0.3 | Apache-2.0 | Windows, RTX 3090 |
| Pack for the viewer | `engine/pack_spz.py` (SPZ v3, 8-bit SH) | ours | WSL |
| Publish | `scripts/local-splat/ingest-splat.mjs` | ours | Windows |

Not used on the production path: Postshot (free tier is non-commercial and
watermarked; SPZ v4 output does not open in Spark 2.1), GGPS/PanoLOG
(CC BY-NC 4.0, research only), OpenSfM. Those stay under research tooling
(`scripts/research/ggps-drop-app/`) for quality comparisons.

The same chain (ffmpeg → pycolmap → Brush/gsplat → 8-bit SPZ) is what the
cloud worker should run later. Nothing here is Windows-GUI-only.

## Files

```
scripts/local-splat/studio/
  Slate360-Capture-Studio.ps1     WinForms UI (Graphite theme)
  Launch-Capture-Studio.bat
  Install-Capture-Studio-Shortcut.ps1
  engine/
    run-job.ps1                   orchestrator; emits STAGE/PROGRESS/STAGEDONE/RESULT/DONE
    check-env.ps1                 GPU / Brush / WSL / pycolmap / ffmpeg check
    probe.py                      what is in the capture (360/2D/GPS/LiDAR/ARKit/GNSS)
    frames.py                     sharpness filter (moves blurry frames aside, never deletes)
    sfm.py                        pycolmap poses; 360 via rig-locked cube faces
    pack_spz.py                   PLY -> SPZ v3 with 8-bit SH
    walk_from_colmap.py           viewer sidecars: upright manifest + walk stations (metres)
  ../upload-sidecars.mjs          puts <model>.manifest.json / .walk.json beside the .spz in R2
```

Jobs live in `%USERPROFILE%\Slate360Jobs\<stamp>-<name>\`:
`request.json` (what the UI asked for), `probe.json`, `images\`, `dataset\`
(COLMAP text model + images for Brush), `export\gaussian.ply|spz`,
`status.json`, `engine.log`. Exports copy to `Desktop\Slate360Exports\` by default.

## What each kind of dropped data does

| Dropped | Detected as | Used for |
|---|---|---|
| Stitched 360 MP4 or 2:1 stills (X4, X6, any 360) | 360 | Splat — appearance (Reality layer) |
| Phone / drone / DSLR video or photos | 2D | Splat — appearance |
| Raw `.insv` | raw360 | Rejected with instructions: stitch in Insta360 Studio first |
| iPhone `.s360depth`, ARKit trajectory, `transforms.json` | ARKit / LiDAR | **Not fused into the splat.** Feeds the metric mesh job (Geometry layer). Shown in the inventory so you know it arrived. |
| `.ply/.las/.laz/.e57` point clouds | LiDAR | Same: geometry job, not the splat |
| GPS in EXIF or video tags, DJI `.srt` | GPS | Stored with the job; not used in the solve yet |
| `.pos/.obs/.rinex/.ubx/.gpx`, lat/lon CSV | RTK / GNSS | Stored; georeference later |

Rule: one lens per capture. iPhone splat walks use 1× Wide only. Mixing
Ultra Wide / Tele / 360 in one job is refused by the solve, not by policy.

## Settings, in plain terms

- **Coverage** = stills per second pulled from video (2 / 1 / 0.5). Photos-only uses every file.
- **Quality** = training steps: Preview 7k (~5 min), Standard 15k (~10 min), Final 30k (~20 min) for one room on the 3090.
- **Output** = SPZ always (viewer format). PLY / .splat / HTML optional.
- **Publish** = upload to R2, create a Twin share link, copy it.

## Walkthrough viewer sidecars

The share page opens the Matterport-style walkthrough (Inside / Dollhouse / Plan,
click-to-walk) when a `.walk.json` sits beside the published `.spz`. Generate both
sidecars from the job's COLMAP model and upload them:

```
python engine/walk_from_colmap.py --mode 2d  --sparse <job>/dataset/sparse/0 --out <dir> --name <model>
python engine/walk_from_colmap.py --mode 360 --sparse <job>/dataset/sparse/0 --out <dir> --name <model>
node scripts/local-splat/upload-sidecars.mjs <storage_key.spz> <dir>/<model>.manifest.json <dir>/<model>.walk.json
```

Gravity comes from the data (camera-height spread + dense floor slab), not the
image axis: iPhone video frames are stored landscape and a 360 camera may hang
inverted. Scale puts the median camera 1.45 m (phone) / 1.6 m (360) above the
floor; stations are camera centres thinned to 0.7 m. Verified 2026-09-08 on both
test models (kitchen upright, cafeteria upright, 14 / 95 stations).

## Reconstruction gate and 360 faces (panel review, 2026-09-09)

`sfm.py` now fails a job when fewer than 70% of images register (exit 7) and warns
below 90% or above 0.8 px reprojection. 360 side faces are rendered at 110° so
neighbours overlap 20° (butt-jointed 90° faces left half of AOB 205 unregistered),
at 2048 px. Feed the sharpest stitched ERP, never a "low-pass" or horizon-locked
export; those are for the client walkthrough MP4 only.

## Cleanup (`clean_ply.py`) — read before using

The tool implements the panel's prune rules (invisible, giant, statistical outliers,
floor/ceiling clip, footprint crop, visibility support, an optional faint+oversized+isolated
"haze" rule) and a phone derivative (`--mobile-out`, pack with `--max-sh 0`).
**On the 2026-09-08 test models every rule damaged real surfaces**: a 0.12 opacity cut
blacked out walls and ceiling (surfaces are stacks of faint splats), the haze rule ate
the near wall, the fixed 3.4 m ceiling clip removed AOB 205's ceiling, and a 3 m footprint
crop removed its walls. Off-path fog is invisible from the training cameras, so it cannot
be separated from surface splats by geometry alone on an undertrained model. Use the
tool only after `render_compare.py`-style before/after checks; the fix for haze is a
better capture (inside the room, two heights, sharp stills) and a longer train, not a
prune.

## Exit codes (engine)

2 nothing usable · 4 raw .insv · 5 too few sharp frames · 6 camera solve failed
· 7 fewer than 60% of images placed · 8 Brush wrote no PLY · 9 packing failed.

## Verified on this desktop (2026-09-08)

| Test | Input | Cameras | Train | Output |
|---|---|---|---|---|
| 2D | 365 iPhone 1x frames (kitchen), 1920x1440 | 295/365 placed, 0.71 px, 9.7 min CPU | Brush 3k steps, 74 s | 84,469 splats, 5.5 MB SPZ, sharp kitchen |
| 360 | stitchedlowpass.mp4, 158 s, 5.7K, 2 stills/s | 604/1260 faces placed (48%), 1.06 px, 13 min CPU | Brush 7k steps, 3 min | 354,852 splats, 12.6 MB SPZ, saved to Desktop\Slate360Exports |

Camera solving is the slow step (CPU SIFT). Coverage under 70% means thin
spots, not failure; the engine says so in the progress panel.

## Roadmap (after the first sellable splat)

1. LiDAR mesh sidecar: when `.s360depth` is present, queue the existing metric
   mesh job and attach `geometry.glb` to the same share (Reality + Geometry).
2. Operator sector mask for 360 at training time (Brush `--masks`), driven by
   the same keyframed mask the Walkthrough uses.
3. Cloud parity: run `frames.py` → `sfm.py` → Brush/gsplat → `pack_spz.py`
   inside the Modal worker with the same request.json.
