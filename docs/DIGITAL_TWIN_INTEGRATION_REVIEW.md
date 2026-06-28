# Digital Twin Pipeline — Integration Review & Roadmap

_Architecture review of the Twin 360 / digital-twin workflow vs. the target end-to-end
goal, with prioritized, modular, low-risk integration points for the candidate open-source
tools. Grounded in the actual codebase (June 2026). Licenses must be re-verified at
integration time — treat the license notes here as a first-pass risk flag, not legal advice._

---

## 0. TL;DR — what to build, in order

| # | Move | Why | Effort | Risk |
|---|------|-----|--------|------|
| 1 | **SuperSplat cleanup step** (manual + automated cull tuning) | Output is already `.spz` (PlayCanvas format) → near-zero-friction "beauty" win | S–M | Low (MIT) |
| 2 | **Collision proxy from the LiDAR PLY we already capture** | We already have a clean point cloud + floorplan; unlocks real walk-through with walls | M | Low |
| 3 | **Google Photorealistic 3D Tiles context shell** (`3d-tiles-renderer` in R3F) | The headline "block around the building" feature; we already store georef/GPS | M–L | Med (Google ToS + cost) |
| 4 | **Semantic enrichment** (open-vocab detection on extracted frames → back-projected pins) | Fills the Site-Walk auto-tag gap too; one Modal step serves both | M | Med (YOLO license) |
| 5 | **Photometric consistency** (bilateral-grid appearance, already in gsplat) | "Beautiful," consistent lighting — cheap because it's a Splatfacto flag | S | Low |
| 6 | **GCP / survey-grade alignment** (optional accuracy tier) | Only if customers need measured accuracy | M | Low |
| — | **PPISP / ArtiFixer (NVIDIA)** | High quality, but **non-commercial research licenses** — blocked until cleared | — | **High (license)** |
| — | **LingBot real-time streaming recon** | Architecturally misaligned (on-device heavy compute) — see §4 | — | Arch conflict |

Quick wins are **#1 and #5** (days, low risk). The strategic differentiators are **#2 and #3**.

---

## 1. Current relevant modules (what exists today)

### 1.1 Capture
- **Native iOS LiDAR** — `ios/App/App/Plugins/LiDARCapture/{TwinARKitCaptureViewController,TwinUploader,LiDARCapturePlugin}.swift`, bridged via `src/plugins/LiDARCapture.ts`. ARKit depth + video + per-keyframe poses (`transform_4x4`, intrinsics, timestamps) + voxel PLY in ARKit world space. Direct multipart upload to R2 (never crosses the JS heap).
- **Web capture** — `components/digital-twin/TwinCapture*.tsx` (getUserMedia/MediaRecorder) and Site Walk `components/capture-v2/**`. GPS/heading via `useTwinCaptureDeviceSensors.ts`, stored in `digital_twin_captures.capture_metadata.gps`.
- **360 ingest** — equirectangular **file upload** only (`asset_kind = panorama_360`, `photo_360` plugin). **Drone** = file upload only (`drone_photo`/`drone_video`); no native pilot SDK.

### 1.2 Cloud reconstruction (the heavy path)
- **Trigger.dev** `twin.gaussian_splat` (`src/trigger/twin-gaussian-splat.ts`) → **Modal** `slate360-twin-gaussian-splat` (endpoint label `reconstruct`, `MODAL_TWIN_ENDPOINT`), `workers/modal/twin-gaussian-splat/worker.py`.
- **Stack:** COLMAP (SfM) + **Nerfstudio 1.1.5 + Splatfacto + gsplat 1.4.0**, PyTorch 2.4.1/cu121, **A10G 24 GB**, 3600 s cap.
- **LiDAR bypass:** match video frames (2 fps) to ARKit keyframes (±2 s); if ≥5 match, **skip COLMAP**, write `transforms.json` with ARKit→Nerfstudio axis flip, seed Splatfacto from the LiDAR PLY (~30 % fewer iterations).
- **Post-process today:** `ns-export gaussian-splat` → `splat-transform` cull (opacity < 0.05, scale > 0.5) → **`.spz`** (PlayCanvas/Niantic SPZ). Sidecars: `.manifest.json` (bounds, PCA floor-normal `correction_quaternion`, recommended orbit camera, interior entry point) and `.floorplan.png` (waist-height raster).
- **Callback:** signed `POST /api/digital-twin/jobs/callback` → `lib/twin/job-callback.ts` → `digital_twin_models` row.

### 1.3 Viewer (browser)
- **Splat:** `@react-three/fiber` + **`@sparkjsdev/spark` v2.1.0** (`components/digital-twin/splat-viewer-{core,scene}.tsx`). Budget **80k splats mobile / 250k desktop** (`splat-viewer-constants.ts`). Orbit + first-person **interior** camera (`splat-overview-navigation.tsx`, `splat-interior-navigation.tsx`), raycast picking (`splat-raycast.ts`) for pins/measure.
- **GLB:** Google `<model-viewer>` 3.5.0 (`ModelViewerClient.tsx`). **360:** `@photo-sphere-viewer/core` 5.14.1 (`TourPanoViewer.tsx`).
- **Share:** token-gated `/share/twin/[token]`, streamed splat via `/api/share/twin/[token]/splat` (range-aware, rate-limited). Pins/measure/comment APIs exist.
- **Desktop editor:** `components/digital-twin/desktop/*` — edit-list, layers, **camera-path/cinematic**, progression compare.
- **No 3D Tiles / Cesium / MapLibre anywhere in the twin viewer.** Leaflet is Site-Walk-plan only. GPS is stored but **never used for coordinate transform or visualized**.

### 1.4 Data model (already friendly to this work)
- `digital_twin_capture_assets.asset_kind` **already enumerates** `geospatial_kml`, `gpx`, `geojson`, `imu_log`, `lidar_depth`, `lidar_mesh` — most new inputs need **no migration**.
- `digital_twin_models`: `model_format ∈ {spz, ply, glb, usdz}`, plus `georef` + `bounds` (jsonb), `lidar_prior_key`, `quality_metrics`.
- `processing_jobs.job_type` already includes `gaussian_splat`, `photogrammetry_mesh`, `lidar_fusion`, `nerf_training`, `mesh_reconstruction`.
- SlateDrop taxonomy `03_Digital_Twin/{Clips,LiDAR,Models,Source_Assets,Deliverables}` (`lib/slatedrop/folder-taxonomy.ts`).

---

## 2. Gaps vs. the target workflow

| Target capability | Today | Gap |
|---|---|---|
| Multi-modal capture (phone+LiDAR, mounted 360, 360 drone) | phone+LiDAR native ✓; 360/drone = file upload | No tuned 360-video frame pipeline; no drone flight/GCP path |
| GCP / survey-grade accuracy | none | No control-point ingestion or constrained alignment |
| Contextual blending w/ Google/OGC 3D Tiles ("block around building") | none | **Largest gap** — no map/tiles layer, georef unused |
| Artifact / hole cleanup | opacity+scale cull only | No inpainting / floater removal / manual surgical clean |
| Photometric consistency ("beautiful") | none | No appearance modeling / exposure harmonization |
| Semantic enrichment (object detection) | manual chips only (Site Walk + Twin) | No detection anywhere |
| Collision data for navigation | free-fly interior, no collision | Walkthrough clips through walls; no navmesh |
| Downloadable files + interactive viewer | `.spz`/`.ply` download ✓, orbit/interior/measure ✓ | Solid — incremental polish only |

---

## 3. Prioritized integrations

Effort key: **S** ≈ days · **M** ≈ 1–2 wks · **L** ≈ 3–5 wks · **XL** ≈ 6 wks+.

### ⭐ #1 — SuperSplat cleanup (PlayCanvas) — _quick win_
- **Where:** (a) **post-export, pre-`.spz`** automated cull tuning in `worker.py` (~the `splat-transform` step); (b) a **desktop "Clean" tool** in `components/digital-twin/desktop/DesktopSplatEditor.tsx` for surgical manual cleanup (box-delete floaters, crop to AABB, recenter).
- **Repo / license:** `playcanvas/supersplat` — **MIT**. Web-based, runs in-browser; reads/writes PLY + **compressed/SPZ** splats. CLI sibling `splat-transform` is already in the pipeline.
- **Approach:** Two layers. Worker side: expose `cull-alpha-thresh`, scale-clip, and SOR (statistical outlier removal) as job params; default tuned per quality tier. Editor side: embed SuperSplat (iframe or its engine modules) as an in-app editing surface that round-trips the model's `.spz`, writes a new `digital_twin_models` version (we already have progression/versioning).
- **Impact:** Big jump in "beauty" (floaters/halos are the #1 ugliness in GS). Manual mode gives the CEO a deterministic "make it presentable" lever before sharing.
- **Pros:** MIT; format-native (we're already SPZ/PlayCanvas); reuses our versioning + desktop editor. **Cons:** Embedding the full editor is L; the automated cull tuning alone is S and captures most of the value.
- **Effort:** S (auto-cull params) → M (embedded editor). **Risk:** Low.

### ⭐ #2 — Collision proxy from the LiDAR PLY — _strategic, data already exists_
- **Where:** new **post-reconstruction worker sub-step** (after the model uploads) that derives a coarse collision mesh from the **already-captured** `lidar_*.ply`; new viewer module in `components/digital-twin/` consumed by `splat-interior-navigation.tsx`.
- **Tooling / license:** Open3D (**MIT**) or PyVista/`trimesh` (**MIT**) for voxel-downsample → Poisson/alpha-shape mesh, or a pure **voxel occupancy grid** (cheapest). All permissive. Client-side collision via three.js + `three-mesh-bvh` (**MIT**) raycast, or a capsule-vs-voxel test.
- **Approach:** Worker writes a `collision.glb` (or a quantized voxel grid `collision.bin`) sidecar next to the `.spz`; store key on `digital_twin_models` (reuse `lidar_prior_key` pattern → add `collision_storage_key`). Interior nav loads it as an **invisible** BVH and clamps the camera capsule against it ("Walk Mode"). Falls back to free-fly if absent (fully reversible).
- **Impact:** Turns the interior walkthrough from a "fly through walls" demo into a believable building walk — exactly the PM/remote-meeting use case. We get this nearly free because the LiDAR cloud is **already in hand and already axis-corrected**.
- **Pros:** Permissive licenses; reuses existing PLY + manifest bounds; additive + reversible. **Cons:** Collision quality depends on LiDAR coverage; needs gravity/teleport UX decisions.
- **Effort:** M. **Risk:** Low.

### ⭐ #3 — Google Photorealistic 3D Tiles context shell — _headline feature_
- **Where:** new **additive R3F layer** in the splat scene (`components/digital-twin/splat-viewer-scene.tsx` neighbor), gated by space `georef`. Not a worker change — purely viewer-side.
- **Repo / license:** **`NASA-AMMOS/3DTilesRendererJS`** (`3d-tiles-renderer`) — **Apache-2.0**. Renders OGC 3D Tiles **and Google Photorealistic 3D Tiles** directly in three.js, with a first-class R3F binding. Alternative base map: **MapLibre GL JS** (BSD-3) for a 2D context, but tiles-renderer-in-R3F composites better with the splat.
- **Data licensing (important):** Google Photorealistic 3D Tiles come via the **Map Tiles API** — **commercial Google Maps Platform terms**: per-session/tile billing, **mandatory on-screen attribution**, and **caching restrictions**. Budget + ToS review required. OGC alternative: Cesium ion datasets or municipal open 3D Tiles (engine is Apache-2.0; data terms vary).
- **Approach:** Use the splace's stored lat/lng/heading to place the splat into ECEF/local-ENU, load Google 3D Tiles for a configurable radius (half-block/block), and **feather** the boundary (depth-blend + a ground-plane mask from the `floorplan` footprint) so the high-detail capture sits inside contextual geometry. Add a "Context: off / block / neighborhood" toggle and required attribution overlay.
- **Impact:** This is the "wow." A captured building dropped into its real surroundings is the single most compelling artifact for documentation, safety briefings, and remote large-site management.
- **Pros:** Apache-2.0 engine, R3F-native, georef already captured, no GPU pipeline change. **Cons:** Google data cost + ToS; alignment accuracy depends on GPS quality (couple with #6 GCPs for precision); attribution/caching compliance.
- **Effort:** M–L. **Risk:** Med (legal/cost, not technical).

### #4 — Semantic enrichment (object detection) — _serves Twin + Site Walk_
- **Where:** new **Modal post-process** over the frames `worker.py` already extracts (2 fps) → detections **back-projected** through the known camera poses onto splat 3D positions → written as auto-pins; same service powers the **missing Site-Walk auto-tagging** (`SmartClassificationChips` is manual-only today).
- **Models / license (choose carefully):**
  - **Ultralytics YOLOv8/v11 = AGPL-3.0** → commercial use requires a paid Ultralytics license. **Avoid for shipped product** unless licensed.
  - **Permissive alternatives:** **YOLOX (Apache-2.0)**, **RT-DETR (original, Apache-2.0)**, **Grounding DINO (Apache-2.0, open-vocabulary** — detect "ladder", "scaffold", "electrical panel" with no training), **SAM 2 (Apache-2.0)** for segmentation. Recommend **Grounding DINO + SAM 2** for construction objects without a training set.
- **Approach:** Detect on keyframes → cluster detections across frames → back-project via poses to 3D → store as `semantic_labels` jsonb on the model + optional auto-pins. Reuse the existing pin schema (`/api/share/twin/[token]/pin`). For Site Walk, run the same detector on captured photos to pre-fill classification chips.
- **Impact:** Inspection layers ("3 ladders, 2 open panels"), searchable twins, and closes the auto-tag gap across two products with one worker.
- **Pros:** One investment, two products; permissive model options exist; additive. **Cons:** Back-projection accuracy needs good poses (great when LiDAR bypass is active); **YOLO license trap** — must pick Apache models.
- **Effort:** M. **Risk:** Med (license discipline).

### #5 — Photometric consistency — _quick win, it's a flag_
- **Where:** `worker.py` Splatfacto training args.
- **Tooling / license:** **Already in your stack.** gsplat/Nerfstudio support **per-image appearance / bilateral-grid** color correction (Apache-2.0). Enabling appearance embeddings + bilateral grid harmonizes exposure/white-balance drift across a walk.
- **Approach:** Add training flags (appearance embedding + `--pipeline.model.use-bilateral-grid True` style options), tuned per quality tier; A/B against current output on space `281b1ebb`.
- **Impact:** Removes the patchy "lighting changes as you turn" look — a major contributor to "not beautiful."
- **Pros:** No new dependency, no license risk, days of work. **Cons:** Slightly higher train time/VRAM; verify within the A10G 24 GB / 3600 s budget.
- **Effort:** S. **Risk:** Low.

### #6 — GCP / survey-grade accuracy tier — _optional_
- **Where:** capture-side control-point entry + worker constrained alignment; a new `accuracy` tier on `processing_jobs`.
- **Tooling:** COLMAP supports georegistration / model alignment to control points (BSD); ground-control via known lat/lng or measured tape points. ENU transform from GPS already feasible.
- **Approach:** Let the user tag ≥3 control points (known coordinates or measured distances); constrain the COLMAP/LiDAR solve and stamp a real-world scale + georef on the model. Also sharpens #3's alignment.
- **Impact:** Measured-accuracy measurements + tighter 3D-Tiles registration. Niche but high-value for AEC documentation.
- **Effort:** M. **Risk:** Low.

### ⚠️ NVIDIA PPISP (photometric pre-processing) & ArtiFixer (GS hole inpainting)
- **Where (if cleared):** PPISP as a **pre-train image-correction** step; ArtiFixer as a **post-export hole/floater inpainting** step in `worker.py`.
- **License flag:** NVIDIA research releases are typically under the **NVIDIA Source Code / non-commercial research license**. **Do not ship in a commercial product until the exact license is confirmed.** Treat as R&D only.
- **Commercial-safe substitutes:** #5 (bilateral grid/appearance) covers much of PPISP's benefit; #1 (SuperSplat) + statistical outlier removal covers much of ArtiFixer's floater cleanup. Revisit the NVIDIA tools only if a license permits.

### ❌ Robbyant LingBot-Map real-time streaming recon
- **Architecture conflict.** `CLAUDE.md` mandates heavy compute is **cloud/desktop, never on the app**; streaming on-device recon violates that and risks the same WebView/native instability we just fixed. **Recommend not adopting.** Capture the _intent_ (live coverage feedback) cheaply instead: surface ARKit's on-device mesh/coverage overlay in the native HUD during capture — no streaming recon backend.

---

## 4. Architecture guidance (keep changes minimal, reversible, auditable)

- **Additive layers only.** #3 (3D Tiles) and #2 (collision) are new viewer modules that **no-op when their sidecar/georef is absent** — old models keep working untouched.
- **Sidecars over schema churn.** Ship new worker outputs as sidecar keys on `digital_twin_models` (`collision_storage_key`, `semantic_labels`, `context_anchor`), mirroring the existing `lidar_prior_key`/`floorplanKey` pattern. Most input `asset_kind`s already exist — minimal/likely-zero migrations.
- **Worker sub-steps, not new tasks.** Add stages inside `worker.py` and extend `TwinWorkerCallbackPayload` (`lib/twin/job-callback.ts`) with optional fields — no new Trigger tasks, no new endpoints.
- **File-size discipline / DESIGN.md tokens.** New viewer UI (Context toggle, Walk Mode, semantic layer) uses existing Graphite Glass tokens + `lib/digital-twin/twin-accent.ts`; keep components small and split per the repo's conventions.
- **Budget guardrails.** Respect `splat-viewer-constants.ts` splat budgets; 3D Tiles + splat + collision BVH must stay within mobile GPU limits — gate Context/Walk Mode behind a device-tier check.
- **Licensing gate.** Add a one-line license note next to any new dependency in `package.json`/worker `requirements`. Hard-block AGPL (Ultralytics) and NVIDIA non-commercial in shipped code; prefer Apache/MIT (SuperSplat, 3DTilesRendererJS, gsplat, YOLOX/Grounding DINO/SAM2, Open3D).

---

## 5. Key pseudocode

### 5.1 Google 3D Tiles context shell (viewer, R3F)
```tsx
// components/digital-twin/SplatContextTiles.tsx  (additive; renders only when georef present)
import { TilesRenderer } from '3d-tiles-renderer';
import { GoogleCloudAuthPlugin } from '3d-tiles-renderer/plugins';

function SplatContextTiles({ georef, radiusMeters }: { georef: TwinGeoref; radiusMeters: number }) {
  const { scene, camera, gl } = useThree();
  useEffect(() => {
    if (!georef?.lat) return;                       // no-op for legacy/non-georef models
    const tiles = new TilesRenderer();
    tiles.registerPlugin(new GoogleCloudAuthPlugin({ apiToken: GOOGLE_3DTILES_KEY }));
    // place capture origin at local-ENU 0,0,0; offset tiles by ECEF→ENU of georef
    setEnuFrame(tiles.group, georef.lat, georef.lng, georef.alt);
    tiles.setResolutionFromRenderer(camera, gl);
    scene.add(tiles.group);
    return () => { scene.remove(tiles.group); tiles.dispose(); };
  }, [georef, radiusMeters]);
  useFrame(() => tiles && (tiles.update()));        // LOD streaming
  return <AttributionOverlay required="© Google" />; // ToS-mandated
}
// Mount beside <SplatMesh/>; feather boundary with the floorplan footprint mask.
```

### 5.2 Collision-enabled interior ("Walk Mode")
```ts
// worker.py (sidecar): voxel-downsample LiDAR PLY → coarse mesh → collision.glb
//   pts = load_ply(lidar_ply); vox = voxel_downsample(pts, 0.05)
//   mesh = poisson_or_alpha_shape(vox); export_glb(mesh, "collision.glb")  // upload as collision_storage_key

// splat-interior-navigation.tsx (client): clamp camera capsule to BVH
import { MeshBVH } from 'three-mesh-bvh';
const bvh = new MeshBVH(collisionMesh.geometry);
function stepCamera(pos, desiredDelta) {
  const next = pos.clone().add(desiredDelta);
  const hit = bvh.closestPointToPoint(next, CAPSULE_RADIUS);   // wall test
  if (hit && hit.distance < CAPSULE_RADIUS) next.copy(slideAlong(hit.normal, desiredDelta));
  applyGravity(next, bvh);                                     // keep eye at ~1.6 m above floor
  return next;
}
// Absent collision sidecar → fall back to current free-fly (fully reversible).
```

### 5.3 360 → perspective conversion (enhance what worker.py already does)
```python
# worker.py already renders 12 equirect views at 30°. Enhancement: overlap + up/down rings
# for better SfM coverage of 360 stills/video, and feed poses when available.
def pano_to_perspectives(equirect, yaw_step=30, pitch_rings=(-30, 0, 30), fov=90, overlap=15):
    views = []
    for pitch in pitch_rings:
        for yaw in range(0, 360, yaw_step - overlap):     # overlap improves feature matching
            views.append(reproject(equirect, yaw, pitch, fov))
    return views   # then COLMAP exhaustive (stills) or sequential (video frames)
```

---

## 6. Complementary tools worth standardizing on
- **Already yours, keep:** COLMAP (BSD), Nerfstudio + Splatfacto + gsplat (Apache-2.0), Spark viewer (MIT), SPZ (MIT), `<model-viewer>`, Photo Sphere Viewer.
- **Add (permissive):** `3d-tiles-renderer` (Apache-2.0), `three-mesh-bvh` (MIT), Open3D / trimesh (MIT), SuperSplat (MIT), Grounding DINO + SAM 2 (Apache-2.0), MapLibre GL JS (BSD-3, optional 2D base).
- **Use with caution:** Google Photorealistic 3D Tiles (commercial ToS + billing + attribution), Cesium ion data (data terms), RealityScan (proprietary, desktop-only — not a fit for the Modal pipeline; Nerfstudio/COLMAP already covers this).
- **Block from shipped code:** Ultralytics YOLO (AGPL-3.0 unless licensed), NVIDIA PPISP / ArtiFixer (non-commercial research) until licenses are cleared.

---

## 7. Recommended sequencing
1. **Sprint A (days):** #5 photometric flags + #1 automated cull tuning — pure `worker.py`, immediate "beauty" lift, zero license risk. A/B on `281b1ebb`.
2. **Sprint B (1–2 wks):** #2 collision proxy + Walk Mode — reuses the LiDAR we already capture; biggest UX leap for PM walkthroughs.
3. **Sprint C (2–4 wks):** #3 Google 3D Tiles context shell — the headline differentiator (do the Google ToS/cost review first).
4. **Sprint D (1–2 wks):** #4 semantic enrichment (Apache models) — ships value to **both** Twin and Site Walk.
5. **Later/optional:** #6 GCP accuracy tier; revisit NVIDIA tools only if licenses clear; embed full SuperSplat editor.
