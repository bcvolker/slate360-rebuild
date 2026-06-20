# Spec: Twin Viewer — Centering, Orientation, Controls & Two Viewer Modes

Status: **build-ready spec** (consolidates external T1+T2 passes + CEO controls/viewer-mode reqs).
Verified repo state (2026-06): `splat-viewer-scene.tsx:144` still has `rotation={[Math.PI,0,0]}`;
`twin-manifest.ts` / `splat-pca-orientation.ts` do **NOT** exist; `splat-bounds.ts` does 2nd–98th
percentile bounds; `exterior-camera-frame.ts` frames via AABB. **No part of this is implemented yet.**

Risk note: the viewer is CEO-gated and screenshots time out → **stage changes manifest-first and
identity-default so legacy models render exactly as today (zero regression) and new twins get the
fix.** Do not big-bang PCA into the working path.

## 1. Core fix — orientation + framing (consensus across all passes)
**Never mutate splat buffers.** Wrap the splat in a parent `THREE.Group` that carries a single
**correction quaternion**; compute bounds/camera AFTER `group.updateMatrixWorld(true)`.

```
scene
└── orientationGroup        ← correction_quaternion (identity when none)
    └── sparkRenderer
        └── splatMesh        ← keep rotation={[Math.PI,0,0]} (COLMAP→Y-up); group sits on top
```
- **Bounds:** world-space AABB from splat centers, **1st–99th percentile per axis** (reject floaters).
  Extend `splat-bounds.ts` (currently 2–98 → 1–99).
- **Frame:** fit camera to the **bounding sphere**: `distance = radius / sin(fov/2) * 1.2` (~60%
  fill), `target = center`, `near = max(radius/500, .01)`, `far = distance + radius*8`, pleasant
  3/4 azimuth/elevation (reuse `exterior-camera-frame.ts` constants 0.55 / 0.38).
- **Recenter:** compute the home frame ONCE after load, store an immutable `homeRef` snapshot, and
  replay it on `resetToken` (existing pattern) — never re-run PCA on recenter.

## 2. T2 — Worker bakes the answer (the real fix; additive)
In `workers/modal/twin-gaussian-splat/worker.py`, after SPZ export, compute orientation+bounds from
the **trimmed PLY centers** and upload a sidecar `…​.manifest.json` next to `model.spz` (viewer
derives URL via `url.replace(/\.spz(\?.*)?$/, '.manifest.json$1')`). Cache immutable.

**Algorithm:** read PLY xyz at correct vertex stride (⚠ existing `compute_ply_bounds` may use a
12-byte stride on ~200-byte 3DGS vertices — fix to parse full vertex dtype) → simulate client flip
`pts*[1,-1,-1]` → 1–99 percentile clip → **floor cluster = bottom 25% by Y** → PCA (`np.linalg.eigh`
of covariance) → smallest-eigenvalue axis = floor normal (sign so mass is above) → optional
**RANSAC** (`open3d.segment_plane`) when PCA confidence low / outdoor → `quat_from_to(floor_normal,
[0,1,0])` (+ optional yaw from mean COLMAP camera forward in `transforms.json`).

**Manifest schema (v1):**
```json
{ "version":1, "coordinate_system":"three_y_up",
  "bounds":{"min":[x,y,z],"max":[x,y,z],"center":[x,y,z],"radius":4.7},
  "up_axis":"Y_UP", "correction_quaternion":[x,y,z,w],
  "recommended_orbit_camera":{"position":[x,y,z],"target":[x,y,z],"fov":55,"near":0.02,"far":94},
  "interior_entry_point":[cx,fy,cz] }
```
Return `manifestKey` in the job callback. PCA done upstream → viewer is deterministic + instant.

## 3. T1 — Viewer read path (safe, incremental)
1. On `url` change, `fetch` the manifest (fast, CDN-cached).
2. On `splatMesh.onLoad`: set `orientationGroup.quaternion = manifest.correction_quaternion` (else
   **identity** → no change vs today); `group.updateMatrixWorld(true)`.
3. Frame: if manifest → use `recommended_orbit_camera`; else existing AABB path (→ sphere fit later).
4. **PCA client fallback** (`lib/digital-twin/splat-pca-orientation.ts`) ONLY when manifest is
   absent (legacy jobs) — floor-cluster PCA as above; apply conservatively (tilt > ~10°). Ship this
   AFTER the manifest path is proven, to avoid regressing models that look fine today.

## 4. Intuitive controls (both modes)
- **Orbit (default):** drag = rotate around target; **scroll/pinch = zoom (dolly)**; right-drag /
  two-finger drag = pan; double-tap/dblclick = recenter. Clamp `minDistance/maxDistance` to bounds.
- **Interior walk:** enter via "Walk inside" toggle or double-click a surface (raycast hit) →
  camera to `interior_entry_point` (eye height 1.6 m); **drag = look 360°**, pinch = FOV zoom,
  WASD (desktop) / left-thumb virtual joystick (mobile) = move; constrained to floor plane.
- **Discoverable, non-obstructive chrome:** a glass control cluster bottom-right (44px targets):
  **Recenter ⊕ · Orbit/Walk toggle · Zoom ± · Fullscreen**. One-time coach hint ("drag to rotate ·
  pinch to zoom · double-tap to recenter"), dismissible (localStorage). Gentle auto-rotate until
  first interaction (aesthetic mode). All driven through the unified `@use-gesture` layer from
  `UNIFIED_SLATE_PLAYER.md` so feel matches the rest of the player.

## 5. Two viewer modes (CEO requirement) — same engine, different chrome
Both reuse one **splat adapter** (orientation + framing + controls from §1–4); only the surrounding
chrome differs (a `mode` prop):
- **Aesthetic viewer** (`mode="showcase"`): minimal chrome, cinematic, idle auto-rotate, fullscreen,
  share. No measurement UI. For client-facing/marketing share links.
- **Construction viewer** (`mode="field"`): **collapsible side toolbar/sidebar** (auto-hides, never
  covers the model) with:
  - **Measurements:** point-to-point distance + area (raycast to splat surface; render as scene
    overlays + a list in the sidebar; metric/imperial toggle).
  - **Pins/annotations:** click a surface → drop a pin with note/photo/voice; pins list; pins
    persist per twin (DB) and surface in reports. Reuse the report `mediaEmbed`/pin model.
  - Export measurements/pins. Layers toggle (pins/measurements on/off).
Collapsible panels keep the model unobstructed; on mobile they become bottom sheets.

## 6. Build order (safe)
1. **Worker manifest** (T2) — additive sidecar; redeploy Modal worker; fix PLY stride.
2. **Viewer manifest read** (T1 §3.1–3.3) — orientation group (identity default) + manifest camera;
   **zero regression** for legacy twins.
3. **Recenter** snapshot hardening + **sphere fit** + **1–99 percentile**.
4. **PCA fallback** for legacy (manifest-absent) models.
5. **Controls** polish (orbit/walk + on-screen cluster + gesture unification).
6. **Two viewer modes** chrome: `showcase` vs `field` (measurements + pins + collapsible sidebar).

## 7. Open / to verify when implementing
- Spark API for iterating splat centers (`forEachSplat` vs geometry attribute) — confirm in repo.
- Whether to drop the `rotation={[Math.PI,0,0]}` mesh flip once manifest carries full correction
  (keep it initially; manifest correction is computed in the same flipped client space).
- Raycasting against splats for pins/measurements (Spark hit-testing or proxy depth).
