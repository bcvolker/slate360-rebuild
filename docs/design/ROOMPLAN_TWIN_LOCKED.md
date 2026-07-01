# RoomPlan × Twin — LOCKED decisions (2026-06-30)

Decided summary from a 9+ AI panel + Apple-API grounding. Detailed reference:
[`ROOMPLAN_TWIN_INTEGRATION.md`](./ROOMPLAN_TWIN_INTEGRATION.md). RoomPlan = **measurement / 2D plan layer**;
splat = **visual twin**. Never derive contract measurements from the splat. On-device/OSS; no paid cloud APIs.

## The decisions
- **Capture: two-pass, same-visit, ONE continuous ARSession (iOS 17+).** Per room: Pass A = splat (your existing
  ARWorldTracking + sceneDepth → video/depth/poses), then WITHOUT pausing, Pass B = `RoomCaptureSession(arSession:
  same)` → `CapturedRoom`. `stop(pauseARSession: false)` keeps the session alive for the next room.
  `StructureBuilder` merges rooms in the splat's **gravity-aligned world frame** → 2D merge, no ICP, kills the
  upside-down problem. **Why not simultaneous:** `frame.sceneDepth` is **nil while RoomPlan runs** (Apple confirmed)
  and two ARSessions can't co-run. Single-pass (tap RoomPlan's session) = experimental V2 only.
- **`StructureBuilder(options: [])`** (no `.beautifyObjects`) for measurement accuracy.
- **iOS gate:** RoomPlan controller must be `@available(iOS 17, *)` — app deployment target is iOS 15 (see the
  build-guard lesson, commit d09fb622: unguarded iOS-16 APIs fail the Codemagic archive).
- **Data:** export Slate360-normalized JSON (own schema) + USDZ (`roomplan_structure` asset). Exterior footprint =
  Open3D RANSAC + Shapely in a Modal `twin-floor-plan-merge` task (same world frame → 2D union).
- **Accuracy tiers badged everywhere:** Measured (RoomPlan ±2–5cm) / Estimated (LiDAR ±5–15cm) / Inferred (never
  for contract) / Adjusted. Area math filters `measured==true`. No universal ±cm claim.
- **UI:** phone = "Measure rooms" sub-mode in the rebuilt HUD (RoomPlan headless, our coaching chrome). Desktop =
  Konva 2D plan editor at `/digital-twin/twins/[id]/plan` (append edit layer, never mutate source). Deliverable =
  tabbed twin **[3D] [2D Plan+Measurements] [Photos] [Q&A]**, plan read-only for clients.
- **OSS:** RoomPlan · Open3D+Shapely · Konva (+react-konva-to-svg) · SuperSplat · IfcOpenShell (later) · RoomFormer/
  HEAT (defer).

## Additive schema
`twin_roomplan_captures`, `twin_plan_layers`, extend `digital_twin_measurements`, `digital_twin_captures.has_roomplan`,
deliverable manifest `tabs`.

## Build order
1. Swift `TwinRoomPlanCaptureController` (two-pass, `@available(iOS 17,*)`) + normalized JSON export → **TestFlight**.
2. Modal `twin-floor-plan-merge`.
3. Desktop Konva plan editor (read-only → edit).
4. Deliverable plan tab + tier badges.
