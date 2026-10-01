# Visual Twin — product / data contract

Status: contract only. Do **not** train, reconstruct, or rebuild Twin pipelines in this pass.

## What a Visual Twin is

A Visual Twin is a phone-captured spatial record of a real place. The capture/source model stays **camera-agnostic**. A device may contribute RGB, poses, and/or depth. None of those streams is implied by another.

## Accepted inputs

- **A.** iPhone timed RGB images + ARKit poses + LiDAR/depth
- **B.** iPhone video + ARKit poses + LiDAR/depth
- **C.** RGB only, explicitly **non-metric**

Other cameras may supply the same roles (RGB, pose, depth). Do not hard-code a single vendor into the source model.

## Architecture split

| Stream | Product role |
| --- | --- |
| RGB | Gaussian Reality — appearance, look-around, visual walk |
| LiDAR / depth | metric Geometry — scale, snap, measure |

Measurements use Geometry only.

## Labels

- Do not label an RGB-only splat as metric.
- Do not imply tape-measure accuracy from Gaussian Reality alone.
- Input C must stay marked non-metric in UI, API, and exports.

## Out of scope this pass

No Gaussian retraining. No Twin reconstruction changes. No Journey / Google Tiles.
