# Twin 360 Platform Roadmap — plans, measurements, editing, deliverables (2026-06-30)

Synthesized from a 10+ AI expert panel + repo audit. UNANIMOUS consensus. Guiding principle:
**everything is contained in Slate360 — no user downloads, no external apps.** Apple RoomPlan is
on-device + free (a framework, not an app/cloud API → fits the rule); SuperSplat is MIT/OSS and is
EMBEDDED into our desktop editor, never a separate tool the user opens.

## The composite twin (three layers, one link)
- **3D Gaussian splat** = the VISUAL twin (walkthrough, pins, context). NOT a measurement source.
- **RoomPlan + LiDAR/ARKit geometry** = the MEASUREMENT layer (walls/doors/windows in meters).
- **2D floor plan** = derived from RoomPlan (interior) + point-cloud footprint (exterior) → areas + net
  wall area (minus openings), all with a **confidence tier** (measured / estimated / inferred).
- **One deliverable link** with tabs: the 3D twin · the 2D plan + measurements · other deliverables
  packaged together (Brian's vision — a subscriber sends ONE branded link; stakeholders click tabs to
  orbit the model, view the plan, read areas for pre-construction estimating).

## What ALREADY EXISTS (extend, don't rebuild)
- `DesktopSplatEditor` + `DesktopSplatToolRail` + `DesktopSplatLayers`: non-destructive **edit-list**,
  a Y-axis **clipping "sweep"** (`createSweepEdit`), pick-to-place ops, layers panel, save to `/edit-list`.
- `TwinMeasureTool` + `TwinMeasurementsList`: 3D two-point distance (labeled "approximate").
- Worker bakes a raster `floorplan.png` (waist-height Y-slice) — non-vector fallback.
- Schema already has `digital_twin_clip_planes`, `digital_twin_measurements`, `digital_twin_viewpoints`,
  `digital_twin_pins`, `lidar_prior_asset_id` (jobs). RoomPlan is NOT used on-device yet.

## Accuracy (set expectations; always show a tier badge)
| Metric | RoomPlan interior | Point-cloud | Splat |
|---|---|---|---|
| Wall length | ±2–5 cm | ±5–15 cm | ❌ not metric |
| Room area | ±1–3% | ±3–8% | ❌ |
| Net wall area (−openings) | ±5–8% | ±10–15% | ❌ |
| Exterior footprint | N/A | ±5–20 cm | ❌ |
Net wall area = Σ(wall L×H) − Σ(opening w×h) — deterministic from RoomPlan's opening rects; require a
one-tap human confirm of the openings list before using it in a deliverable.

## Phased build

### PHASE 0 — make twins GOOD (pipeline; highest priority, in progress)
Already deployed: robust median centering + confidence-gated orientation (worker). NEXT:
1. **Deterministic gravity up-axis from ARKit poses** [worker → Modal + reprocess] — the permanent
   upside-down fix for LiDAR captures (poses already carry gravity; PCA only as no-pose fallback).
2. **Fix 360-video ingestion** [worker] — route panorama_360 VIDEO through `ns-process-data
   --camera-type equirectangular` (perspective crops), not flat pinhole.
3. **Pass quality/speed** from the job row to splatfacto iterations [trigger + worker].
4. **LiDAR depth supervision** (DN-Splatter) [worker] — kills floaters on textureless/reflective walls.
5. **Pose-bypass COLMAP** when poses exist [worker] — speed.

### PHASE 1 — 2D floor plans (on-device + cloud)
- [SWIFT] **RoomPlan pass** — run `RoomCaptureSession` as the MASTER session and tap its `arSession`
  for the splat frames (RoomPlan owns its ARSession — can't co-run our config). Export CapturedStructure
  → walls/doors/windows/openings JSON (meters) + USDZ. New asset kind `roomplan_structure`.
- [CLOUD] **Point-cloud exterior footprint** — Open3D RANSAC vertical planes → floor-slice → line-fit →
  Manhattan-snap → footprint polygon. Merge with RoomPlan in the shared gravity-aligned ARKit frame
  (no ICP needed when same session).
- New `plan_geometry` JSON (rooms[], walls[{p1,p2,height,openings[]}], units, world_transform,
  source, confidence). OSS: Open3D, Shapely, IfcOpenShell; RoomFormer/HEAT only if ML vectorization needed later.

### PHASE 2 — 2D measurement UI (web)
- SVG (crisp, hit-testable) or Konva canvas over the plan, coordinates in METERS (scale carried from
  RoomPlan/LiDAR — no pixel calibration). Tools: polygon area (shoelace), wall segment (L×H − openings),
  add/remove openings, confidence badge per number. Extend `TwinMeasurementsList` to 2D. Persist to
  `digital_twin_measurements` (add `measurement_kind`, `plan_geometry`, `opening_deductions`, `accuracy_tier`).

### PHASE 3 — desktop Twin Editor (web; extend existing)
- **Floater removal / crop**: EMBED PlayCanvas SuperSplat (MIT) in the desktop shell + automated
  pre-prune in the worker (opacity/scale/isolation filter) so delivered .spz is already lean. Round-trip
  via `@playcanvas/splat-transform` (already in the pipeline).
- **Section cuts ("open like a book/accordion")**: generalize `createSweepEdit` to arbitrary clip
  planes/boxes (Spark SplatEdit volumes; three.js clippingPlanes don't touch Spark's shader). Add
  ceiling-cut (dollhouse), draggable X/Z section, explode-by-floor.
- **Object delete + annotations**: box-select delete (have it); annotations as an additive edit-list op
  (3D-anchored pins) — matches the immutable-.spz principle.

### PHASE 4 — packaged deliverable (web) — CONFIRMED FEASIBLE
One branded interactive link with TABS — 3D twin · 2D plan + measurements · walks-with-plans (360s
embedded on the plan) · PDFs/other deliverables — saved to SlateDrop Deliverables, re-openable/editable,
token-gated for stakeholders. **Architecture:** a "deliverable BUNDLE" = one share token referencing N
child artifacts (twin model, plan_geometry, walk deliverable, PDFs); the share viewer becomes a tabbed
container that renders each artifact type. All on EXISTING infra — the share viewer, deliverables tables,
and register-deliverable wiring already exist; this adds a bundle table + a tab shell. Tier-gated (Twin
Pro). The measurements tab runs on the twin itself (3D area/wall tools + the 2D plan).

### Partial-capture 2D plan (answered)
If most interior + all exterior are captured but some rooms weren't walked, the generated 2D plan shows:
captured rooms SOLID + dimensioned (RoomPlan), the exterior footprint SOLID (point cloud), and unwalked
interior as HATCHED "Not captured — no measurement" gaps (never fabricated). Coverage % shown. **Editing
the 2D plan (move walls, add doors) stays IN Slate360** — it's vector geometry, so a lightweight 2D plan
editor (Konva/SVG) handles move-wall / add-door / add-opening WITHOUT Design Studio. Design Studio /
Unreal is only for 3D/rendered remodeling, not 2D plan edits. Edited walls are tagged `source:"user"` +
`confidence:"edited"` so they're distinct from measured geometry.

## Capture SOP (field)
Prefer extracting the sharpest ARKit video frames (Laplacian-variance pick) over a separate photo burst
(halves thermal load, keeps poses+depth). ~0.5–0.7 m/s, pause 1 s at corners/doorways, shutter 1/500 s+,
lock AE/AWB, all lights on, LiDAR always on (poses per-frame; depth can be 1 Hz for seeding). 360 for
coverage. RoomPlan pass per room, pause 3–5 s at doorways.

## Legacy-UI redesign (separate track — inventory in progress)
Brian flagged major screens as legacy/unpolished ("lists of twins in weird containers," mostly-empty
pages). An inventory agent is ranking the worst offenders (twins list, twin detail, dashboard, projects,
etc.) — redesign AFTER the pipeline/features work, on the unified-shell grammar.
