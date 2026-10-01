# AOB205 import contract

Do **not** process AOB205 captures on a laptop. This document is the ingest inventory so desktop data can become a real Slate360 project later.

## Acceptable sources

### 360 video
- Already stitched **2:1 equirectangular** MP4/MOV, or
- Raw Insta360 `.insv` pair (preserved, not browser-ready)

### 360 stills
- Stitched **2:1** JPG/DNG derivative, or
- Raw Insta360 files

### iPhone
- RGB frames
- `.s360depth`
- `lidar_poses.json`
- `lidar_traj.jsonl` if available

### Drone
- 360 video/stills
- Telemetry
- Ordinary photos

### Documents
- PDF / drawings / photos

## Ingest wizard classification

The wizard must label each item:

| Label | Meaning |
|---|---|
| `STITCHED` | Full 2:1 ERP the web viewer can load |
| `RAW` | Device original (`.insv`, unstitched dual-fisheye, depth packages) |
| `UNKNOWN` | Not yet classified |

Raw Insta360 `.insv` **must not** be treated as a browser-ready panorama. Passing it to Photo Sphere Viewer will fail.

See `INSTA360_SOURCE_RULE.md` for the current Spatial Walkthrough path.
