# Twin360 Native Capture — Implementation Plan & Spec

_Grounded follow-up to `TWIN360_APP_BUILD_PLAN.md`. This is the concrete, file-level plan for
fixing the LiDAR capture + cloud reconstruction pipeline, synthesized from an 8-expert review
panel plus verification against this repo._

---

## Why this exists

User reported: no LiDAR indicator while recording (screenshot = the **web** getUserMedia path).
Investigation + an 8-AI review panel reached strong consensus on root causes and fixes. This
doc is the execution plan.

### Verified findings (this repo)
- **Web LiDAR is impossible by design.** `hooks/useLiDARCapture.ts:40` swallows the
  `startCapture()` failure (`console.warn(...non-fatal)`). On iOS an `ARSession` and
  WebView `getUserMedia` (`AVCaptureSession`) cannot co-own the rear camera → LiDAR never
  activates on the web path, so the chip never shows. Not a bug — a platform constraint.
- **Loop-closure pose bug (CONFIRMED).** `ios/App/App/Plugins/LiDARCapture/TwinARKitCaptureViewController.swift:400`
  logs the **live** `frame.camera.transform`, appends it immediately (`:459`), and writes those
  frozen transforms to poses (`:609 "frames": keyframes`). When ARKit performs loop closure on a
  longer walk it retroactively corrects its world frame, but our poses are already written
  pre-correction → geometry can "tear" on long sessions.
- **Multi-clip = separate ARSessions = separate arbitrary origins.** Worker
  (`workers/modal/twin-gaussian-splat/worker.py:461-490`) uses only the single best LiDAR clip
  and ignores the rest. No cross-session registration.
- **No frame quality control.** No blur/off-target/duplicate filtering in `worker.py`.
- **LiDAR seed too loose.** Native depth clamp is 0.1–8.0m
  (`LiDARCapturePlugin.swift:289`); too generous for splat seeding.

### Panel consensus (8/8)
1. Native-only LiDAR; honest status state machine (never silent).
2. One continuous ARSession per twin; "clips" = chapter markers, not session restarts.
3. Record long, trim/section after upload — avoids cross-session registration entirely.
4. Frame quality control (blur + off-target) is the highest ROI.
5. Tighten LiDAR seed (~0.3–5m, medium+ confidence, RGB-colored, outlier-removed).
6. Clean inputs (filtered PLY init + masks + AABB cull) before depth-supervised training.
7. Ship order: capture continuity + honesty + loop-closure fix → worker blur/PLY filter → HUD.

### Our exceptions (where we diverge from parts of the panel)
- **Defer** depth-supervised Splatfacto fork & semantic sky masking (L-effort research). Quality
  is ~80% capture+culling, ~20% training knobs for our use case.
- Depth-clamp exact number is **tunable config**, not gospel (start seed 0.3–5.0m).
- "One session" ≠ "one file": keep one ARSession / one world frame / one poses.json, but you
  MAY roll multiple MP4 segments for crash-safety & upload.
- **Graceful deprecation** of multi-clip, not delete-on-day-one: default to single-session +
  chapters; worker rejects/warns on multiple `lidar_poses` assets instead of silently picking one.

---

## P0 — Capture continuity, honesty & determinism

### P0.1 Native-only LiDAR
- Remove the doomed web-path LiDAR attempt: stop calling `startCapture()` in the web flow
  (`hooks/useLiDARCapture.ts`, `components/digital-twin/TwinCaptureScreen.tsx`). Web path is
  explicitly labeled "video only — no depth."
- Route all depth-capable devices to `TwinNativeCaptureLauncher` (`components/digital-twin/TwinCaptureFlow.tsx:261-276`).
- **Investigate** why a Pro device hit `isNativeTwinCaptureAvailable() === false` in TestFlight
  (likely plugin registration via `scripts/ios/add-lidar-plugin.rb`, or the availability check).
  This is why the user saw the web path.

### P0.2 Honest LiDAR state machine
Replace the boolean `isActive` chip with an explicit status surfaced from native → web:
```ts
type LidarStatus =
  | 'unsupported'   // no scene-depth hardware → hide LiDAR UI
  | 'ready'         // capable, native capture not yet started
  | 'starting'      // requested, awaiting first depth frame
  | 'active'        // depth frames arriving, pointCount rising
  | 'degraded'      // tracking .limited / low confidence / thermal throttle
  | 'interrupted'   // call, backgrounding, camera interruption
  | 'failed'        // didFailWithError / no depth >3s while recording
  | 'saving' | 'complete';
type LidarStatusEvent = { status: LidarStatus; reason?: string; pointCount?: number;
  keyframeCount?: number; trackingQuality?: 'good'|'limited'|'poor' };
```
Rules:
- Only emit `active` after the **first valid depth frame** (confidence ≥ medium) — never on
  `startSession()` resolve.
- Implement `session(_:didFailWithError:)`, `sessionWasInterrupted(_:)`,
  `sessionInterruptionEnded(_:)`, `session(_:cameraDidChangeTrackingState:)` in the native VC.
- Depth-health watchdog: if recording && `pointCount` unchanged for 3s → `degraded`/`failed`.
- Web review must say "LiDAR: not used on this capture" — never imply depth was collected.

### P0.3 Loop-closure pose fix
- In `TwinARKitCaptureViewController.swift`, stop writing live `frame.camera.transform`
  (`:400,459`). Instead drop an `ARAnchor` per keyframe (store timestamp + intrinsics + anchor
  id), and at session end read each anchor's **final** `anchor.transform` (loop-closure
  corrected) before building `poses.json` (`:609`).

### P0.4 Single ARSession + chapters
- Replace per-clip session restarts (`components/digital-twin/useTwinCaptureSession.ts`
  start/stopVideoClip) with one continuous session.
- "Mark section" / pause writes **timestamps/chapter metadata only**; pause must NOT
  `resetTracking` (keep ARSession + world frame alive).
- One MP4 (or rolled segments sharing the session clock) + one `poses.json` + one PLY per twin.

### P0.5 Timestamp determinism
- Enforce `sessionStartUnix` == MP4 `creation_time` == pose clock so the worker's 2fps↔pose
  matching (the `>2s` drop in `worker.py`) is reliable. Native writes a single anchor time.

---

## P1 — Frame quality, tighter LiDAR, guidance HUD

### P1.1 Worker frame QC (`worker.py`)
Run before COLMAP/bypass on extracted 2fps frames:
- **Blur:** variance-of-Laplacian on grayscale; drop bottom 15–25% per clip (start absolute
  floor ~100 @1080p; calibrate). Borrow `laplacian_blur_score()` from the thermal worker.
- **Motion blur:** optical-flow magnitude between kept frames; drop median flow > ~8px @480p.
- **Off-target:** depth-valid ratio in center ROI; drop if < ~0.25, or median valid depth > ~6m.
- **Duplicates:** SSIM/pHash > ~0.95 vs last kept frame.
- **Report** `blur_drop_count`, `offtarget_drop_count`, etc. back to the job (visibility).

### P1.2 Tighter LiDAR seed + multi-clip rejection (`worker.py`, `src/trigger/twin-gaussian-splat.ts`)
- Reject/warn on **multiple `lidar_poses` assets** instead of silently picking the "best" clip.
- PLY seed filter: depth ∈ [0.3, 5.0]m, confidence ≥ medium, statistical outlier removal
  (Open3D `remove_statistical_outlier(nb_neighbors=20, std_ratio=2.0)`), **RGB-colored** points,
  cap ~200k voxel-downsampled.
- Post-train **AABB cull** from LiDAR bounds (+0.5m margin) using the manifest bounds already computed.
- Log `lidar_seed_loaded`, `lidar_seed_point_count`; on PLY-init failure drop `ply_file_path`,
  don't fail the whole job.

### P1.3 Native depth seed clamp
- Tighten `LiDARCapturePlugin.swift:289` voxel insert to medium+ confidence and the
  seed-useful range (keep capture clamp wider than seed clamp; expose as config).

### P1.4 Capture HUD (native, non-distracting)
- Tracking pill (Good/Limited) + reach reticle ("too far / move closer" from center-ROI median
  depth) + coverage % from a top-down occupancy grid (5cm cells, XZ). One rotating tip; no modals.
- RoomPlan-style mesh "painting" deferred to V2.

### P1.5 Thermal/battery guards
- Observe `ProcessInfo.thermalState`: throttle depth rate at `.serious`, auto-save at `.critical`.
  Soft cap ~3 min / warn past it. Battery warning < 20%.

---

## P2 — Long-session UX & robustness
- Post-walk **trim/section UI** in review → pass keep-ranges to worker (ffmpeg `-ss/-to`).
- **"Close the loop"** prompt near capture end (distance-to-start) to cut drift.
- **Native presigned upload** for large MP4 (no JS Blob buffering).

## P3 — Deferred / Pro / research
- ARWorldMap relocalization for multi-room (Pro).
- Depth-supervised Splatfacto fork.
- ARMesh coverage "painting" overlay.

---

## Tunable thresholds (single config source)
| Key | Start value | Notes |
|---|---|---|
| `seed.depth.min_m` | 0.30 | PLY seed near clamp |
| `seed.depth.max_m` | 5.00 | PLY seed far clamp (tune 4–6) |
| `seed.confidence.min` | medium | ARKit ARConfidenceLevel |
| `seed.max_points` | 200000 | after voxel downsample |
| `qc.blur.laplacian_floor` | 100 | @1080p; also drop bottom 20% percentile |
| `qc.offtarget.valid_depth_ratio_min` | 0.25 | center ROI |
| `qc.duplicate.ssim_max` | 0.95 | redundant-frame drop |
| `capture.softcap_seconds` | 180 | warn past; hard guard at thermal `.critical` |
| `hud.reach.too_far_m` | 4.0 | reticle amber; red > 5.5 |

---

## Ship order (panel-unanimous)
P0.1–P0.5 (capture continuity + honesty + loop-closure + determinism) →
P1.1–P1.2 (worker blur + PLY filter + multi-clip rejection) → P1.4 HUD → P2.

## Build / TestFlight note
P0–P1 native changes touch Swift (`TwinARKitCaptureViewController.swift`,
`LiDARCapturePlugin.swift`) and need a **Codemagic iOS build → TestFlight** to test LiDAR on a
real Pro device (LiDAR cannot be tested in the simulator or sandbox). Worker changes
(`worker.py`) require a Modal redeploy; `src/trigger/*` changes require a Trigger.dev redeploy.
Docs-only changes (this file) require neither.
