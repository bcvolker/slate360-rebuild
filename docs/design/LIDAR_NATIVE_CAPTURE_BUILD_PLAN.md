# Slate360 — Native-Led LiDAR Twin Capture: Build Plan (V1)

**Status:** LOCKED architecture (unanimous multi-AI consensus + verified against codebase, 2026-06-24).
**Goal:** Capture video + LiDAR depth + camera poses in ONE ARKit session on LiDAR iPhones, feeding
the EXISTING (already-built, already-tested) upload → Modal COLMAP-bypass → splatfacto pipeline.

## Why (the diagnosis, settled)
iOS allows only ONE owner of the rear camera. The current design runs WebView `getUserMedia`
(video) AND a separate ARKit `ARSession` (depth) simultaneously → ARKit silently fails → no depth.
Fix = native-led: one `ARSession` owns the camera and produces BOTH video (from
`ARFrame.capturedImage` via `AVAssetWriter`) and depth/poses. Keep the existing web getUserMedia
path for non-LiDAR devices. See [[slate360-lidar-camera-conflict]].

## What already exists and is REUSED unchanged
- Swift depth logic: voxel dedup (2cm), 0.5s keyframes, `writePLY`, `writePosesJSON` (in
  `ios/App/App/Plugins/LiDARCapture/LiDARCapturePlugin.swift`).
- Upload: `useTwinSubmitReviewState` uploads `lidarFiles`; `lib/twin/upload-helpers.ts` classifies
  `lidar_poses`/`ply_lidar`. **Existing multipart presigned API:** `app/api/digital-twin/upload/{init,sign-part,complete,abort,single}` — the native uploader calls these.
- Backend: `src/trigger/twin-gaussian-splat.ts` → Modal `workers/modal/twin-gaussian-splat/worker.py`
  "LiDAR COLMAP bypass": extracts MP4 at `-vf fps=2` (NO resize), matches frames to keyframes by
  wall-clock within 2.0s, converts ARKit c2w → Nerfstudio (reshape `order='F'`, negate Y/Z),
  writes transforms.json, runs splatfacto with PLY as prior.

## Decisions (locked)
| Area | Decision |
|---|---|
| Presentation | Full-screen native `UIViewController` presented modally over WKWebView (NOT transparent underlay — underlay is V2 polish) |
| Plugin | Evolve existing `LiDARCapture` plugin: add `presentCapture()`; keep name (web already imports it). Migrate to Swift `CAPBridgedPlugin` registration + add `-ObjC` linker flag |
| Preview | `ARSCNView` bound to our `ARSession` (least effort V1; RealityKit/Metal = V2 coverage viz) |
| Video | `AVAssetWriter`, H.264 V1 (HEVC V2), PTS = `frame.timestamp − sessionStartArkit`, ~10–12 Mbps, **encode at `frame.camera.imageResolution` (NO downscale — intrinsics must match)**, portrait `input.transform = rotate(.pi/2)` |
| FPS | encode 30fps (every 2nd ARKit frame); depth ~15Hz; keyframes 0.5s |
| Container | `.mp4` (worker reads creation_time via ffprobe); set creation-date metadata explicitly |
| Timestamps | `sessionStartUnix = Date()` at first frame; keyframe.timestamp = `sessionStartUnix + (frame.timestamp − sessionStartArkit)`; ALSO keep `session_start_time` in poses (worker fallback). NO `Date()` inside the 60Hz loop |
| Coordinate | Existing column-major `order='F'` + negate Y/Z is CORRECT; apply same to PLY (worker already does). VALIDATE on device with a known fixture |
| RGB | Sample YCbCr→RGB only on NEW voxel insert at step=3 (cheap) |
| File handoff | Small (PLY/poses) → `fetch(convertFileSrc)→File`. MP4 → NATIVE `URLSession` multipart upload via existing `/api/digital-twin/upload/*` endpoints (never Blob a 300MB MP4 in JS) |
| UX | ONE simple mode (no Basic/Pro tiers in V1). Honest failure surfacing via ARSession delegates |
| Limits (15 Pro) | max ~8min (warn 6), 500k pts, min free disk ~500MB–1GB, thermal: warn `.serious` / auto-stop `.critical` |
| Permissions | Camera before `ARSession.run` (ARKit needs no extra entitlement); location optional/non-blocking |
| Codemagic | Keep `add-lidar-plugin.rb`; do NOT add `arkit` to `UIRequiredDeviceCapabilities` (would exclude non-LiDAR phones); no signing changes |

## Plugin API (evolved)
```ts
isAvailable(): Promise<{ available: boolean }>
presentCapture(opts?: { confidence?, maxDurationSec?, maxPoints? }): Promise<CaptureManifest>
addListener('state'|'progress', cb)
// CaptureManifest: { cancelled, videoUri, plyUri, posesUri, pointCount, keyframeCount,
//   durationSec, sessionStartUnix, width, height }
```
Swift: `presentCapture` holds the `CAPPluginCall`, presents `TwinARKitCaptureViewController`
(`.fullScreen`, `isModalInPresentation=true`), **dismiss → then resolve** (never resolve early;
resolve `{cancelled:true}` on cancel, never reject for user cancel).

## Threading
ARSession delegate = dispatch only. `videoQueue` (YCbCr→BGRA + writer append, drop frame if
`!isReadyForMoreMediaData`), `depthQueue` (unproject + voxel + RGB), `keyframeQueue`. Never retain
`ARFrame` — copy `capturedImage`/depth/transform out immediately. Stream video to disk; 500k voxel
dict (~12MB) stays in RAM; monitor `os_proc_available_memory`.

## File-by-file change list
1. NEW `ios/App/App/Plugins/LiDARCapture/TwinARKitCaptureViewController.swift` — ARSCNView preview,
   ARSession(.smoothedSceneDepth, .gravity), AVAssetWriter, ports existing voxel/PLY/poses logic,
   ARSession error/interruption delegates, thermal/disk guards, HUD (dark glass #0B0F15 + teal).
2. EDIT `LiDARCapturePlugin.swift` — add `presentCapture`/`dismissCapture`, `CAPBridgedPlugin`
   registration; fix timestamps to ARKit base; RGB voxel color.
3. EDIT `LiDARCapturePlugin.m` — register `presentCapture` (or drop for CAPBridgedPlugin).
4. EDIT Xcode project — `OTHER_LDFLAGS = -ObjC`.
5. NEW native multipart uploader (Swift) calling `/api/digital-twin/upload/{init,sign-part,complete}`.
6. EDIT `src/plugins/LiDARCapture.ts` — new API + manifest types.
7. EDIT `components/digital-twin/TwinCaptureFlow.tsx` / `TwinCaptureScreen.tsx` — branch: iOS+LiDAR →
   `presentCapture()` (skip getUserMedia); ingest manifest → existing review/upload. DELETE the
   `streamReady → lidar.startCapture()` effect for the iOS LiDAR path.
8. (optional V1.5) worker: prefer exact `video_time` match if present in poses v3.

## Milestones
- **Week 1 (unblock):** native VC + ARSCNView + ARSession; AVAssetWriter video w/ ARKit timestamps;
  port PLY/poses; `presentCapture` + React branch; **device test → Modal log shows lidar-bypass
  success + splat geometry aligned (not mirrored/offset).** ← the on-device validation gate.
- **Week 2 (harden):** native MP4 multipart upload; interruption/thermal/disk handling; remove silent
  failures; RGB PLY; TestFlight to 15 Pro.
- **V2 (later):** transparent underlay + web chrome, coverage heatmap, photo-burst, HEVC, Pro controls.

## Open validation items (on-device only)
- Confirm splat orientation/scale from a known fixture (door-on-left / corridor / wall) — adjust
  Y/Z/world transform if mirrored.
- Confirm encoded video resolution == keyframe intrinsics resolution (worker does NOT resize).
- Thermal envelope on real 5–8 min captures.
```
