# Quick Twin — product contract

Do not train or reconstruct in this branch.

## Default capture (iPhone Pro)

Video + ARKit trajectory + LiDAR depth.

Optional periodic sharp RGB stills.

Hardware-agnostic: any camera may supply the same roles (RGB, pose, depth).

## Outputs

| Stream | Role |
| --- | --- |
| RGB | Reality — Gaussian appearance |
| LiDAR / depth / TSDF | Geometry — metric truth |

Measurements use Geometry only.

## Without LiDAR

Label: Visual Twin / **UNSCALED**. Measure disabled. Do not imply tape accuracy from appearance.
