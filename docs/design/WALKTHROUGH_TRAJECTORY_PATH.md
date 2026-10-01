# Walkthrough camera path

A walkthrough may have a real camera path without becoming a Digital Twin.

## Capability tiers

| Level | Source | Viewer meaning |
| --- | --- | --- |
| PATH_LEVEL_0 | Video + timestamps / spaces only | No spatial floor nodes. Previous/next is time. |
| PATH_LEVEL_1 | Authored or estimated yaw/pitch stations | Recorded look-from points. Not metric XYZ. |
| PATH_LEVEL_2 | Registered ARKit / LiDAR trajectory | Real camera XYZ. Plan position and click-to-move may use it. |

HouseWalk today is **PATH_LEVEL_1**: waypoints have `t` + yaw/pitch. Do not draw them as metric floor coordinates.

## iPhone ingest (future)

Accepted sidecars, camera-agnostic:

- `trajectory.jsonl`
- `lidar_traj.jsonl`

Each sample: `timestamp`, `c2w` or `position`, `tracking` quality.

If an X4 walk was captured beside iPhone, time-register X4 playback to the ARKit trajectory.

Store as generic `spatial_path_samples` on the clip (`capture_meta` or an existing trajectory asset). Do **not** add a table unless those assets cannot hold the samples.

Walkthrough alone may use that path for true path, station placement, plan position, and click-to-move. A Twin is optional, not required.
