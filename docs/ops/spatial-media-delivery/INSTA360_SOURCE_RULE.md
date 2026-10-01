# Insta360 source rule — Spatial Walkthrough

## Does source need to be stitched before Slate360 ingest?

**Yes, for a standard web Spatial Walkthrough today.**

Insta360 Studio (or an equivalent licensed SDK/process) must produce a full **2:1 equirectangular** video before the web player can render a sphere. Slate360 does **not** currently stitch raw `.insv` in the browser or on Vercel.

## Current recommended path

1. Preserve the raw `.insv` pair (do not discard originals)
2. Insta360 Studio
3. Full 2:1 ERP export
4. FlowState
5. Horizon Lock
6. Presentation master
7. Slate360 ingest
8. Privacy bake (CLIENT/PUBLIC derivative)
9. Same-origin web proxy (`/api/spatial-walkthrough/.../media`)

## Long-term

Slate360 may automate stitching if it is commercially and technically viable (SDK/licensing). Do not claim automated raw `.insv` stitching unless that pipeline exists in this repo.

## Classifier (`lib/spatial-walkthrough/source-class.ts`)

| Class | Browser panorama? |
|---|---|
| `RAW_INSTA360` | no |
| `STITCHED_ERP_VIDEO` | yes (≈2:1) |
| `STITCHED_ERP_STILL` | yes (≈2:1) |
| `PERSPECTIVE_VIDEO` | no |
| `PERSPECTIVE_STILLS` | no |
| `RGBD_IPHONE` | no |
| `LIDAR` | no |
| `DRONE` | classified via filename/telemetry; not a sphere unless 2:1 |
| `DOCUMENT` | no |

Raw `.insv` is **never** handed to Photo Sphere Viewer.

## What the browser may load

- Stitched 2:1 ERP MP4/MOV (walkthrough proxy / baked derivative)
- Stitched 2:1 JPG stills

Not valid as a panorama source:

- `.insv`
- Dual-fisheye without stitch
- HTML/JSON error bodies
- MASTER objects under CLIENT/PUBLIC policy
