# iPhone capture data-preservation

**Date:** 2026-08-31  
**Scope:** Native ARKit capture on LiDAR iPhones. Not reconstruction, not X4, not Gaussian pipeline, not client UI.

This report records the minimum changes so a future Slate360 capture never throws away inexpensive trajectory data and never misrepresents the on-device 500k PLY as the sensor master.

## What was true before

| Stream | Rate / policy | Stored as | Role in practice |
|---|---|---|---|
| ARKit poses | 8 cm / 8° keyframes only | `lidar_poses.json` | Treated as the pose source |
| Packed depth / confidence / RGB | Same keyframes | `lidar_depth.s360depth` | Evidence, not a high-rate dump |
| RGB video | ~30 Hz | clip MP4s | Master video |
| On-device PLY | 2 cm voxels, stride 3, `maxPoints=500000` | `lidar_capture.ply` as `ply_lidar` | Looked like a LiDAR master |
| Excess voxels | `Dictionary.keys.prefix` | arbitrary hash-order eviction | Silent geometry loss |

There was no high-rate trajectory file. A 4-minute walk at ~60 Hz ARFrames produced only the keyframe subset in `lidar_poses.json`. The 500k cap could evict already-accepted voxels in hash order, which is not a spatial sample.

## What a future capture now writes

### A. Trajectory master — `lidar_traj.jsonl`

At every valid `ARFrame` while recording (typically 60 Hz):

```json
{"version":1,"ar_timestamp":1.23,"unix_timestamp":1710000000.12,"transform_4x4":[16 floats],"tracking_state":"normal"}
```

A header line is written first (`role=trajectory_master`). Intrinsics are included only when they change. RGB and depth are not stored at trajectory rate. Writes append through a serial `FileHandle` on a dedicated queue; the capture loop does not retain the pose list in RAM.

Trajectory is written **before** the depth-absent early return, so poses survive even when scene depth is missing. The preview voxel budget and depth-queue backpressure cannot stop it.

### B. Keyframe packed depth — unchanged default, opt-in denser

RGB / depth / confidence packing remains keyframe-only. There is no every-frame depth dump.

| Mode | Translation | Rotation | Who gets it |
|---|---|---|---|
| `normal` (default) | 8 cm | ~8° (0.14 rad) | Everyone |
| `high` | ~4 cm | ~4° (0.07 rad) | Opt-in via `presentCapture({ reconstructionQuality: "high" })` |

The 0.1 s ceiling and 2.0 s floor are unchanged, so `high` cannot become an uncontrolled frame dump.

`lidar_poses.json` is still written for the existing reconstruction contract (keyframe poses, including photo frames). It is no longer the trajectory master.

### C. Preview point cloud — `preview_point_cloud.ply`

The 500k on-device cloud is a **display preview**:

- Upload filename: `preview_point_cloud.ply` (gzipped `.ply.gz`)
- PLY header: `comment role preview`, `is_sensor_master 0`, `max_points`, `voxel_size_m`
- Manifest role: `point_cloud_preview`, `is_sensor_master: false`
- Asset kind remains `ply_lidar` so the current Gaussian job still finds a cloud without pipeline changes

`maxPoints` is **not** raised to 5M. Once the display budget is full, new preview voxels are skipped. Existing voxels are never removed. Packed depth and trajectory continue regardless.

The legacy `startSession` path had the same `keys.prefix` eviction; it now also stops inserting instead of deleting.

### D. Source manifest — `capture_manifest.json`

Roles:

| Role | File | Master? |
|---|---|---|
| `trajectory_master` | `lidar_traj.jsonl` | yes |
| `depth_keyframe_master` | `lidar_depth.s360depth` | yes |
| `rgb_video_master` | clip MP4s | yes |
| `point_cloud_preview` | `preview_point_cloud.ply` | **no** |

Each role records counts, frame rates, keyframe thresholds, `maxPoints`, voxel size, depth dimensions, duration, and dropped/missing counts. The same payload is returned on the plugin resolve as `sourceRoles`, `telemetry`, and `qaSummary`.

### E. Data-loss telemetry

Counters:

- ARFrames received
- trajectory poses written
- video frames written / dropped
- depth keyframes written
- depth backlog drops
- voxel updates skipped
- preview points
- tracking-limited frames

At export, the native save HUD shows a one-line QA summary (not a web UI change), and the same string is stored in the manifest and device log.

## Storage estimate

Assumptions: compact JSONL pose line ≈ 360 bytes; 60 Hz; gzip ~8–10× on this payload.

| Capture | Traj poses | Raw JSONL | Gzipped traj | vs video |
|---|---|---|---|---|
| 1 minute | ~3,600 | ~1.3 MB | ~150–200 KB | tiny |
| 4 minutes | ~14,400 | ~5.2 MB | ~0.5–0.7 MB | tiny vs a 60–120 MB HEVC clip |
| 8 minutes | ~28,800 | ~10.4 MB | ~1.0–1.3 MB | still cheap |

Packed depth size is unchanged in `normal` (grows with ground covered, not time). `high` is roughly 2× keyframes, still bounded by the 0.1 s ceiling (≤10 Hz → ≤2,400 depth records in 4 minutes). Preview PLY stays ≤500k vertices × 15 bytes ≈ 7.5 MB uncompressed.

## Isolation guarantees

1. A 4-minute clip does not cap trajectory (no `maxPoses`).
2. Trajectory persists when depth is absent.
3. Hitting 500k preview points cannot stop packed depth or trajectory.
4. There is no `keys.prefix` (or any other) eviction of preview voxels.
5. The source manifest marks the PLY as preview and the other three streams as masters.

## Tests

`lib/digital-twin/capture-data-preservation.test.ts` encodes those five guarantees plus the normal/high keyframe policy. Classification tests cover `lidar_traj.jsonl[.gz]` and `preview_point_cloud.ply[.gz]`.

## Apply before the next TestFlight capture

Additive migration `supabase/migrations/20260831120000_lidar_traj_asset_kind.sql` adds `lidar_traj` to `digital_twin_capture_assets.asset_kind`. It was applied to the linked production database on 2026-08-31. Without it, trajectory upload would fail that one file (other assets still upload). Video, preview PLY, keyframe poses, and packed depth do not depend on it.

`reconstructionQuality: "high"` is not wired into the capture launcher. Default remains `normal`.

## Out of scope (intentionally untouched)

- Gaussian / Modal worker
- X4 processing
- Client capture UI
- Raising `maxPoints` to 5M
- Every-frame depth dumps
