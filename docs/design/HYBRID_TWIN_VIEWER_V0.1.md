# Hybrid Twin Viewer V0.1 — Audit & Implementation Plan

Status: audit complete; V0.1 foundation in progress on `feature/hybrid-twin-viewer-v0.1`.
Date: 2026-08-27. Isolated worktree: `C:\s360-viewer`. Do not touch `C:\s360`.

This document is the Phase 1 audit. It describes what already exists, what
must be preserved, why measure currently does nothing in the walkthrough
viewer, and how V0.1 extends that architecture into a multi-layer
`S360_WORLD` construction twin without rebuilding the Matterport-style
navigation that already works.

---

## 1. What currently exists

The Digital Twin viewer is **two stacks**, not one. Both are live. V0.1 must
extend them, not replace them.

### 1.1 Production splat stack (authenticated + share)

Entry points:

| Surface | Route / component |
|---|---|
| Authenticated twin detail | `app/digital-twin/(shell)/twins/[id]/page.tsx` → `TwinDetailClient` → `TwinAuthenticatedViewer` |
| Twin Studio preview | `app/(dashboard)/twin-studio/[spaceId]/preview/[modelId]/page.tsx` |
| Public share | `app/share/twin/[token]/page.tsx` → `TwinShareViewer` / `TwinShareAnnotateShell` |
| Desktop editor | `app/digital-twin/(shell)/twins/[id]/editor/page.tsx` → `DesktopSplatEditor` |
| Cinematic | `…/twins/[id]/cinematic` → `CinematicSplatViewport` |
| Progression compare | `…/twins/[id]/progression` → `ProgressionCompareViewer` |
| Preview harness (no login) | `/preview/twin-splat` |

Core pipeline:

```
SplatViewerCore
  └── Canvas + SparkRenderer
        └── SplatViewerScene
              ├── splatMesh  rotation={[Math.PI, 0, 0]}
              ├── parent group  correction_quaternion (manifest)
              ├── SplatOverviewNavigation  (orbit)
              └── SplatInteriorNavigation  (walk)
```

Spark: `@sparkjsdev/spark ^2.1.0`. Loads `.spz` via URL. Mobile cap 150k
splats, desktop 500k, LOD off, deterministic downsample.

Formats (`lib/digital-twin/viewer-format.ts`):

- `.spz` → splat (Spark)
- `.glb` / `.gltf` / `.usdz` → `TwinModelViewer` / photo explorer
- `lidar_potree` → `LidarPointCloudViewer` (separate canvas, not in the splat world)
- `.ply` / `splat_ply` → **unsupported** in the production format resolver

### 1.2 Matterport-style mesh walkthrough (preview, metric)

Entry: `/preview/twin-mesh` → `MeshTwinViewer`.

This is the construction walkthrough. It is **not** wired into
`TwinAuthenticatedViewer` yet. It already combines:

- TSDF / dollhouse mesh (PLY vertex colour or textured GLB) via `MeshBody`
- Optional Spark splat as a look-only layer (`MeshSplatLayer`, `raycastable = false`)
- Click-to-walk stations, drag-to-look, FOV zoom (never dolly off-station)
- Modes: **Inside / Dollhouse / Floor plan**
- Ceiling: open / closed / plenum (clip plane, not deletion)
- Layer toggle: **Mesh / Splat / Both**
- Mesh `display="collision"` keeps LiDAR in the raycaster while drawing nothing

This is the correct hybrid foundation. Do not invent a third viewer.

### 1.3 Spark `[Math.PI, 0, 0]` — why it exists (do not globalize)

The splat mesh is rendered with `rotation={[Math.PI, 0, 0]}` in:

- `splat-viewer-scene.tsx`
- `MeshSplatLayer.tsx`
- `DesktopSplatViewport.tsx`
- `CinematicSplatViewport.tsx`

That Euler is **Rx(π)**, equivalent to scale `(1, -1, -1)`: flip Y and Z.

It exists because COLMAP / 3DGS PLY is stored in an OpenCV-ish frame, and
Spark’s viewer convention is three.js Y-up after this flip. The Modal worker
(`compute_splat_manifest`) **simulates the same flip** before baking bounds
and `correction_quaternion`:

```
pts = raw * [1.0, -1.0, -1.0]   # match viewer rotation=[Math.PI,0,0]
coordinate_system: "three_y_up_post_pi_flip"
```

A **per-asset** `correction_quaternion` is then applied to the **parent
group**, never by mutating splat buffers. Missing manifest → identity, or a
conservative client PCA fallback (`splat-pca-orientation.ts`).

**V0.1 rule:** this flip is a *Gaussian/Spark source convention*, not an
`S360_WORLD` law. LiDAR/TSDF meshes must not receive it. New ODGS assets must
declare `coordinate_system` + a Sim(3) registration rather than inheriting
this rotation blindly.

### 1.4 Navigation that must be preserved

**Splat stack:** orbit (drag rotate, wheel dolly, pan) and interior walk
(look-drag, click-to-move / WASD). Home/recenter, Walk toggle, fullscreen
(`TwinViewerControlsOverlay`). Camera sync across compare viewers.

**Mesh walkthrough:** Matterport model — rest only at capture stations;
dollhouse sits above the open ceiling; floor plan is overhead pitch −90°.
No orbit, no free-flight. Gestures in `use-viewer-gestures.ts`.

### 1.5 Measurement — two implementations, one of them a no-op

| Surface | What the Measure control does |
|---|---|
| `MeshTwinViewer` (`/preview/twin-mesh`) | Toggles `measureActive` boolean. **Nothing else.** No raycast, no HUD, no persist. This is the “button that does nothing.” |
| `TwinAuthenticatedViewer` | Real 2-point pick via Spark splat raycast → POST `/api/digital-twin/measurements`. Buried in the Collaboration sheet, not the viewport chrome. Uses **Gaussian splat hits**, labeled “Approximate — for coordination, not survey.” |
| `TwinShareAnnotateShell` | Same 2-point splat/model pick → share measurement API. |
| `LidarPointCloudViewer` | Local (non-persisted) 2-point distance on Potree tiles, plus section profile / region flatness. Separate world. |

Schema already exists: `digital_twin_measurements` (`start_point`, `end_point`,
`measured_value`, `unit` in `m|ft|in|mm`, `metadata` jsonb, `model_id`).
No PATCH/DELETE. No polyline/area/kind. List UI cannot rename, hide, or delete.

### 1.6 Pins / comments / attachments

- `digital_twin_pins` — 3D `position` + `normal`, space-scoped. `model_id` is
  **provenance, not ownership** (FK SET NULL on version delete).
- `pin_series_id` for future cross-version lineage.
- `digital_twin_pin_attachments` already supports document/image/360/thermal/
  link/proposal/invoice via `storage_key` / `unified_file_id` / `external_url`.
- Share annotate can **create** pins. Authenticated collaboration API **lists**
  pins and **patches status** only — no authenticated 3D pin placement.
- Overlays: `TwinSceneOverlays` (billboard dots + 2-point lines).

### 1.7 Historical / versions

Two overlapping concepts:

1. **Legacy** `digital_twin_versions` (2024 core asset system) — still in
   generated types; not the live Twin 360 path.
2. **Live** `digital_twin_models` rows per space: `is_primary`, `captured_at`,
   `version_label`, `parent_model_id` (migration `20260806100000`).
   `TwinVersionsPanel` is reprocess/publish, not an in-viewer date dropdown.
   `ProgressionCompareViewer` already does side-by-side/blend/wipe with
   synchronized cameras — the future compare mode.

`digital_twin_alignments.transform_matrix` exists for BIM/reference alignment
but is unused by the walkthrough viewer.

### 1.8 Drawings / BIM

- Worker can emit `floorplan_storage_key` (SVG/DXF). Twin Studio `PlanPanel`
  fetches `/api/digital-twin/models/[id]/floor-plan-data`.
- Walkthrough “Floor plan” is a **camera pose**, not a registered drawing overlay.
- `digital_twin_alignments` is the hook for later IFC/BIM. Do not build BIM in V0.1.

### 1.9 Clipping / sections

Mesh walkthrough: ceiling clip plane only (`gl.localClippingEnabled`).
Desktop splat editor: crop / slice / erase / sweep (edit_list, non-destructive).
`digital_twin_clip_planes` table exists; not wired to MeshTwinViewer.

### 1.10 Mobile vs desktop

- Authenticated twin detail is a mobile-first hero + bottom action sheets.
- Desktop editor / cinematic / progression are separate routes (`desktop-access`).
- Splat budget forks at 768px / coarse pointer.
- Mesh walkthrough is the intended job-site thumb UI (44px targets).
- Thermal Studio is CEO-only and must stay out of this viewer.

### 1.11 Share / permissions

Share tokens: view / annotate / download, optional password, expiry, max views.
Share splat/manifest/pin/measurement/comment/lidar routes are token-gated.
Pin attachments are **not** exposed on share routes today — keep it that way
unless the token role and file permissions both allow it.

---

## 2. Reusable components (do not rewrite)

- `MeshTwinViewer` + `MeshBody` + `MeshSplatLayer` — hybrid canvas
- `WalkthroughControls` + `useWalkthroughNavigation` + `walkthrough-navigation.ts`
- `SplatViewerCore` / `SplatViewerScene` — production splat, Spark, manifest
- `TwinSceneOverlays` — start from here; extend for polylines/polygons
- `TwinAuthenticatedViewer` / `TwinShareAnnotateShell` / `TwinViewerCanvasShell`
- Measurements + pins tables and share APIs
- `ProgressionCompareViewer` — future compare
- `digital_twin_alignments` + splat manifest quaternion — transform metadata
- SlateDrop / `unified_files` / `digital_twin_pin_attachments` — files
- `/preview/twin-mesh` harness (real kitchen geometry, no login)

---

## 3. Gaps V0.1 must close

1. Walkthrough Measure button is a no-op.
2. Production measure raycasts Gaussians, not LiDAR/TSDF.
3. No `S360_WORLD` / Sim(3) transform model; Spark Rx(π) is hardcoded.
4. Layer names (Mesh/Splat/Both) are not Reality/Hybrid/Geometry.
5. No in-viewer capture-date dropdown (versions exist as model rows).
6. Measurements are 2-point only; no persist of type/points[]; no delete/rename/hide.
7. Authenticated users cannot drop 3D pins in the walkthrough.
8. Mesh walkthrough is preview-only, not the authenticated twin page.
9. No registration RMSE / validation status on measure eligibility.
10. No drawing overlay in Plan mode (architecture only).

---

## 4. Files likely to require modification

Preserve behavior; add layers.

| Area | Files |
|---|---|
| Transform model | **new** `lib/digital-twin/s360-world.ts` |
| Measure math | **new** `lib/digital-twin/measurement-*.ts` |
| Epochs | **new** `lib/digital-twin/twin-epoch.ts` |
| Pins | **new** `lib/digital-twin/pin-anchor.ts`, authenticated pin API |
| Walkthrough | `MeshTwinViewer.tsx`, `WalkthroughControls.tsx`, `WalkthroughLayerToggle.tsx`, `mesh-body.tsx`, `use-viewer-gestures.ts` |
| Overlays | `TwinSceneOverlays.tsx` or hybrid overlay sibling |
| APIs | `app/api/digital-twin/measurements/route.ts` (PATCH/DELETE + metadata.kind) |
| Splat measure honesty | `TwinAuthenticatedViewer.tsx` (do not silently treat splat hits as metric) |
| Preview | `/preview/twin-mesh` and `/preview/hybrid-twin` |
| Schema | additive pin `metadata` jsonb only if required; measurement extras in existing jsonb |

Do **not** edit `C:\s360`, entitlements, billing, middleware, or existing migrations.

---

## 5. Proposed architecture

### 5.1 Coordinate model

```
source asset frame  (declared: SPARK_SPLAT, ARKIT_LIDAR, TSDF_MESH, COLMAP, …)
        │  Sim(3): uniform scale × rotation × translation
        ▼
    S360_WORLD     ← single three.js scene graph origin for one Twin Version
```

- Never destructively rewrite source blobs to “fix” alignment.
- Spark Rx(π) lives on the **Gaussian asset’s source convention**, not on the world.
- Monocular Gaussians may carry `scale ≠ 1` (Sim(3) to LiDAR).
- Registration metadata: method, RMSE, `validated | unvalidated | absent`, timestamp.

Metric rule:

- If a TSDF/LiDAR mesh is present → **all** measurement raycasts hit that mesh,
  including Reality mode where the mesh is hidden (`display="collision"`).
- If no metric mesh → measurement is **unavailable** (not an unofficial splat number).
- Gaussian centers are never metric truth.

### 5.2 Twin / epoch data

```
Twin (digital_twin_spaces)
 └── Twin Version / Capture Epoch  (digital_twin_models row + captured_at)
      ├── Gaussian asset + source convention + Sim(3) → S360_WORLD
      ├── LiDAR cloud (optional)
      ├── TSDF/metric mesh + Sim(3)
      ├── drawings/BIM refs (transforms only in V0.1)
      ├── trajectories
      └── registration { transform, scale, method, rmse, status }
```

Switching epoch: keep camera pose in `S360_WORLD`, swap representation URLs.

Compare (not built in V0.1): reuse `ProgressionCompareViewer` patterns.

### 5.3 View modes (one canvas, one camera)

Orthogonal axes:

- **Representation:** Reality (splat visible, mesh collision) / Hybrid (both) /
  Geometry (mesh visible). Maps onto existing Mesh/Splat/Both.
- **Navigation:** Inside / Dollhouse / Plan (existing `ViewMode`).

Same `S360_WORLD` and the same walkthrough camera. Pins stay in world coordinates.

### 5.4 Measurement subsystem

Kinds: distance, polyline, height, horizontal, area, perimeter, angle, clearance.

Store metres + ordered `S360_WORLD` points in `metadata.points` / `kind` /
`scope` (`project` | `epoch`). `start_point`/`end_point` remain for compatibility.

UX: snap/hover, undo last point, cancel, finish/save, rename, hide, delete with
confirm, metric/imperial, construction precision.

### 5.5 Pins

Anchor: world point + normal + source mesh/epoch. Scope: `project` (survives
dates) or `epoch` (tied to `model_id`). Attachments reuse
`digital_twin_pin_attachments` + SlateDrop; share links must not leak private files.

### 5.6 V0.1 delivery order

A. Preserve navigation  
B. `S360_WORLD` + Sim(3)  
C. Reality / Hybrid / Geometry labels on the existing layer toggle  
D. Hidden metric mesh as the only measure raycast target  
E–F. Persistent distance/polyline/height/area (+ more kinds in the same engine)  
G. Epoch selector (preview can mock dates; models already have `captured_at`)  
H. Persistent 3D pins + URL attachment  
I. Keep Dollhouse + Plan  
J. Diagnostics overlay (registration/layers/raycast target)

---

## 6. Test routes

- `/preview/twin-mesh` — existing Matterport walkthrough + metric mesh
- `/preview/hybrid-twin` — same assets, hybrid chrome (modes, measure, pins, epochs)
- `/preview/twin-splat` — splat-only (must remain non-metric)

Do not deploy to production. Do not merge to `main`.
