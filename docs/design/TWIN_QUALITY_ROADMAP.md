# Twin 360 — Splat Quality, 360 Ingestion & Speed Roadmap (2026-06-30)

Synthesized from a multi-platform expert panel (8+ AIs) + repo audit of `worker.py`. UNANIMOUS
consensus on root causes and fixes. Tags: [WORKER] Modal redeploy + reprocess · [VIEWER] Vercel ·
[CAPTURE] field technique.

## Root causes of the bad car-interior test (agreed by all)
- **Upside-down:** worker GUESSES up via PCA on "bottom 25% by Y" + `normal[1]<0`; floor-less
  interiors flip 180°. The ARKit **gravity-aligned poses are captured but only used for COLMAP-
  bypass, never for the up-axis.** Using them = deterministic up. [WORKER]
- **Off-center / too close-far:** manifest center/bounds computed on the RAW floater-laden PLY
  before cleanup → floaters drag the center off and inflate the radius. [WORKER]
- **Floaters:** car interior = worst case (glass/screens/reflective/textureless + motion blur +
  tiny baseline). Not representative — test on a textured room. [CAPTURE]
- **360 not helping:** real bug — 360 VIDEO is branch-ordered as a flat pinhole image (extracted at
  2 fps, fed to COLMAP as equirectangular-as-pinhole = garbage). Only 360 stills hit the slicer. [WORKER]

## DONE (deployed 2026-06-30, commit 1e7d4350)
✅ [WORKER] `compute_splat_manifest`: median centering on a tight 5-95 core + 3-97 radius (fixes
off-center/zoom); **plane-confidence gate** — only apply the up-axis correction when the floor is
genuinely flat (planarity ≥ 0.6, tilt < 45°), else identity + `up_axis="UNKNOWN"` (no confident
wrong flip for car/blob interiors). Brian's scan reprocessed to verify.

## P0 — next (highest ROI)
1. [WORKER] **Deterministic gravity up-axis from ARKit poses.** When `lidar_poses` exist, derive up
   from the gravity-aligned `transform_4x4` keyframes (worldAlignment=.gravity → +Y up after the known
   flips); build `correction_quaternion` directly. PCA only as the no-pose fallback. Ends upside-down
   for all LiDAR captures.
2. [WORKER] **Prefer the LiDAR-pose COLMAP bypass** whenever poses exist (already wired) — skip SfM:
   −40-70% wall time + removes the reflective-interior SfM failure mode.
3. [WORKER] **Fix the 360-video branch:** route `panorama_360` video through
   `ns-process-data video --camera-type equirectangular --images-per-equirect 8` (perspective crops),
   NOT flat pinhole extraction.
4. [WORKER] **Pass quality/speed from the job row** to splatfacto iterations (Trigger hardcodes
   "standard" today; worker already supports draft/standard/high tiers).

## P1 — quality / speed levers
- [WORKER] **DN-Splatter** (Nerfstudio method) — use iPhone LiDAR depth as SUPERVISION, not just init.
  Biggest floater-killer for textureless/reflective interiors.
- [WORKER] **Blur rejection** (variance-of-Laplacian) before COLMAP/training; drop the bottom ~25%.
- [WORKER] **GLOMAP** instead of incremental COLMAP for the no-pose path (2-5× faster SfM).
- [WORKER] **gsplat MCMC densification** (fewer floaters, fixed budget) — A/B vs current cull-alpha.
- [VIEWER] **scene_type (interior/exterior)** in the manifest → interiors auto-open INSIDE at eye
  height (not orbit a hollow shell); exteriors orbit. (`TwinShareAnnotateShell` hard-defaults "orbit".)
- [VIEWER] **SuperSplat** (PlayCanvas, OSS) embed → let users crop floaters before sharing.

## Capture SOP (field, [CAPTURE])
Walk ~0.5-0.8 m/s (slower indoors), pause ~1 s at corners/doorways, 70-80% overlap, **fast shutter
(1/200 s+)**, **lock exposure + white balance** before the walk, all lights on, avoid HDR/auto.
Reflective/textureless: oblique angles (not head-on glass), temporary texture (tape/markers) on blank
walls, lean on LiDAR depth. Rig: phone owns pose/up/depth; 360 owns coverage; export Insta360 as
**equirectangular** (stabilization OFF) at high bitrate — NOT raw .insv (stitch in Insta360 Studio first).

## Speed targets (A10G, ~300 frames, pose bypass)
Pose-bypass total ~12-22 min; draft (20k iter) ~8-15 min; COLMAP path ~25-40 min. Biggest lever =
pose bypass (skips SfM). Offer **preview (fast) + final (quality)** two-model output.

## OSS stack
Nerfstudio + gsplat (keep) · GLOMAP (faster SfM) · DN-Splatter (LiDAR depth supervision) ·
equirec2perspec / ns-process-data equirectangular (360 slicing) · SuperSplat (floater cleanup) ·
EasyGaussianSplatting (Insta360 end-to-end reference).

## NEW FEATURE — 2D plans + square footage (high value, pre-construction)
Brian's ask: derive a 2D floor plan + compute room area + WALL area from a scan. Feasible from the
LiDAR point cloud / splat geometry:
- **Floor plan:** horizontal slice of the point cloud at ~1.0-1.2 m → wall cross-sections → vectorize
  to a 2D plan (top-down). Tools: Open3D plane segmentation + alpha-shape / line-fit.
- **Room area:** floor-plane polygon area (m²/ft²). **Wall area:** wall planes (RANSAC) → height ×
  length. **Accuracy:** iPhone LiDAR room dimensions are typically **±1-3%** — adequate for
  pre-construction estimating/takeoffs; flag as "estimated."
- Pipeline work: a measurement/floor-plan stage in the worker (or an on-device ARKit RoomPlan path —
  Apple RoomPlan gives parametric walls/dimensions directly and may be the faster route for plans+sqft
  than deriving from the splat). Worth evaluating RoomPlan vs point-cloud extraction.
- Logged for the panel: best accuracy approach (RoomPlan vs LiDAR mesh vs splat) + OSS for floor-plan
  vectorization.
