# ASU Sun Deck Viewer — Consolidated Build & Fix Plan (v2, for external review)

Reviewed against three independent AI analyses (georeferencing, GLB packaging, point-cloud
rendering, drain registration, rotated-stage UX). This document is the authoritative
execution plan. Reviewers: please check the transform chain, the verification gates, and
the "Open questions" at the end.

## 0. The frame contract (the single invariant)

Everything lives in ONE local metric ENU frame:

- Anchor: lat0 = 33.4277667, lon0 = −111.9322333 (WGS-84), east = +X, north = +Y, meters.
- Deck display window: x ∈ [−66.66, 54.69], y ∈ [−70.04, 11.29] → 121.35 × 81.33 m.
- Display raster: 12135 × 8133 px @ 1 cm/px. Frame px: u = (x−x0)/0.01, v = (y1−y)/0.01.
- The thermal panorama (4045 × 2711 @ 3 cm) is this exact window (identity ×3). It is
  ALREADY registered to this frame and accepted by the client. It is never re-stitched
  or re-warped in this plan.

Rule: alignment between layers is achieved at IMPORT time (data warped into the frame).
The viewer applies exactly one display transform to the whole stage (all layers as
children of one node), so layers cannot misalign relative to each other at runtime.

## 1. Source inventory (all DroneDeploy, same July 15 2026 flight)

| Asset | File | CRS / units | Role |
|---|---|---|---|
| Hi-res ortho | MapPlan_ortho_…jpg + .tfw + .aux.xml + .kml | EPSG:3857, 0.0129 m/px | MAP base |
| Textured mesh | scene_mesh_textured.obj + .mtl + 4 JPG atlases (63 MB) | local, unknown until inspected | 3D tab |
| Point cloud | points.las, 22.7 M pts RGB | NAD83(2011) AZ Central ft (EPSG:2223/6405) | TERRAIN tab |
| DEM tif | MapPlan_ElevationToolbox…tif (+.tfw) | NAD83(2011) AZ Central ft, 0.1318 ft/px | analysis, later |
| Drain plan | AE102X sheet p.0; 18 dots already extracted (15 moisture / 3 dry) | sheet px, scale 1″=10′ | drain overlay |

Phase-0 checks before anything is built:
- JPG dimensions match KML extents (expected ≈ 14,790 × 11,690 px); nodata is pure white (255) per aux.xml.
- Read LAS VLRs: confirm horizontal EPSG and the vertical datum statement (do NOT assume).
- OBJ bbox statistics → units (m vs ftUS: deck ≈ 121 m must read as O(10²) not O(10⁵)),
  axis convention (Z-up vs Y-up), origin (site-local vs state-plane).

## 2. Phase 1 — MAP base map (fixes: low-res, white backing, crooked, zoom-out)

Placement math (reviewer-confirmed):
- True GSD = 0.0129 × cos(33.4278°) = 1.077 cm/px.
- EPSG:3857 grid north = true north ⇒ transform to ENU is scale + translation ONLY.
- e_enu = (E_px − E0)·cos(φ0), n_enu = (N0 − N_px)·cos(φ0), with (E0,N0) = mercator(lon0,lat0)
  via pyproj (not hand math). Then ENU → frame px per §0.

Translation refinement (the datum trap): the ENU anchor came from consumer-GPS EXIF
(WGS-84); DroneDeploy's georef can disagree by 2–4 m (datum + GPS). So the world file fixes
scale+rotation EXACTLY, and translation is refined by image correlation:
- Phase correlation on high-passed luminance, deck-only crop, Hanning window, against the
  CURRENT thermally-proven base. Require a sharp single peak; fallback ECC (MOTION_TRANSLATION);
  fallback 3–5 manual control points. Datum error is a constant shift — translation-only is correct.
- Gate: post-warp displacement field vs the proven base over ≥20 textured tiles:
  median ≤ 5 cm, p90 ≤ 10 cm. Else stop and diagnose (no silent shipping).

Then:
- White nodata → alpha; map floats on the black canvas (kills the "PDF backing" look).
- Retile pyramid L0–L3; L3 = native ~1.1 cm (real detail at full zoom).
- Zoom clamps: min = 0.25 × fit (unlocks zoom-out), max = 8× native; +/− buttons.

## 3. Phase 2 — Thermal swipe (nothing re-stitched)

The thermal mosaic never broke; an earlier base swap moved the ground under it (already
reverted). Because Phase 1 lands the new map in the SAME frame, thermal alignment carries
over by construction. Verification, not assumption:
- 6-landmark split-crop montage (building corners, membrane strip, HVAC curbs).
- Re-run the formal tie-point RMSE against the new base. Gate: no worse than the
  previously ACCEPTED alignment (prior formal numbers: median ≈ 41 cm global tie-point
  set; visually verified feature-level agreement on the deck). Report the number honestly
  in the viewer's methods panel; do not claim better than measured.
- Hover/click radiometrics: unchanged (same frame fractions, same temp grid).

## 4. Phase 3 — Drain overlay locked to real drains (dots only)

Per client: dots only — no text, no outlines, no PDF anything. Numbered discs
(blue = moisture on mat, red = dry), toggle + opacity slider.

Registration (consensus of all three reviews):
1. Scale prior from the sheet's dimension string: 247′-1¼″ = 75.32 m across the building
   run → plan px/m known to ±1 % (construction tolerance), reducing the fit to ~3-DOF.
2. Hand-pick 4–6 well-spread correspondences between plan drains and PHYSICALLY VISIBLE
   drains in the 1.1 cm ortho (drains read as small dark squares with staining; confirmed
   visible in DroneDeploy at 3 ft scale). Claude does the picking from zoomed crops.
3. Least-squares similarity + RANSAC. Gates (at 1.1 cm/px): median residual ≤ 3 px (≈3 cm),
   RMSE ≤ 4 px, worst verified drain ≤ 8–10 px. Reject and re-pick if 2+ drains fail.
4. Verify ALL 18 with a 3 m crop each (a contact sheet is produced as an artifact).
5. Bake final positions as frame fractions into the build chain (no runtime fitting).
   Manual nudge UI is kept as a hidden fallback. Drains render with an optional ~0.5 m
   uncertainty ring, per reviewer recommendation, honest to the method.
6. Auto-detection (ICP/CPD on dark-square candidates) is a cross-check only, never the
   authority — false positives (joint caps, stains, shadows) make it fragile.

## 5. Phase 4 — 3D tab: DroneDeploy textured mesh

- Convert with Cesium obj2gltf (preserves MTL → one primitive per material, 4 draw calls);
  trimesh is the fallback if obj2gltf is unavailable.
- Textures: 2048² default, q85–88; deck-hero atlas may go 4096 only if a visual check
  demands it. Target GLB ≤ 25–35 MB (reviewers agree 4×4096 risks iGPU black-screens).
- Coordinates: detect units/axis per Phase 0; apply Z-up→Y-up if needed; place into ENU
  by translation (site-local origin) — verified by rendering the mesh nadir and phase-
  correlating against the Phase-1 base. Gate ≤ 15 cm.
- glTF hygiene (learned the hard way + reviewer list): JSON chunk pads with SPACES,
  BIN with zeros; POSITION accessor min/max set; indexed geometry; one bufferView per
  image; UNSIGNED_INT indices only with OES_element_index_uint.
- Controls: orbit drag; Ctrl+drag pan (two-finger on touch); wheel zoom to cursor;
  TOP / reset chip. Tab lazy-loads (fetch on first open; loading card until ready).

## 6. Phase 5 — TERRAIN tab: DroneDeploy point cloud

- CRS: pyproj with explicit EPSG codes (EPSG:2223 → EPSG:6318 → local topocentric ENU).
  US survey foot 0.3048006096 — at ~695,000 ft absolute eastings the intl-vs-survey foot
  difference is ~0.4–0.6 m, so the EPSG code (not a hand factor) does the conversion.
- Vertical: read the LAS VLR. If orthometric (NAVD88) or unstated, DO NOT feed Z into the
  topocentric pipeline (geoid ≈ −25…−30 m in AZ would bias it). Instead use RELATIVE
  elevation: z_rel = z − deck-plane median. The TERRAIN tab is a relative-elevation
  product; this is stated in its caption. (Defensible and sidesteps the geoid entirely.)
- Decimation: voxel grid (reviewer consensus; random/Poisson rejected), 2–3 cm inside the
  deck ROI, 15–25 cm outside, hard cap ~3 M points.
- Packing: positions quantized uint16 over the bbox + RGB u8, interleaved stride 12
  (2-byte alignment for SHORTs) or two parallel buffers; ≈ 24–36 MB fetch.
- Rendering: WebGL1 gl.POINTS; gl_PointSize = clamp(base·projFactor/−viewZ, 1, 64)·DPR;
  depth cue via linear fog (EDL deferred — needs a second pass, not v1); single
  drawArrays with a 512 k-chunk frustum-cull fallback for weaker GPUs.
- Same camera + control set as the 3D tab. Verify: nadir view vs base map overlay.

## 7. Phase 6 — PLANS tab

The registered drain layout as its own clean page: the 18 numbered dots at their FINAL
registered positions over a dimmed base map, moisture legend (15 blue / 3 red), nothing
else. (Same data as the MAP drain layer — one source of truth.)

## 8. Phase 7 — Stage rotation + interaction parity (MAP)

- One 3×3 matrix on the stage: M = T(pan)·T(center)·R(θ)·S(s)·T(−center). CSS transform
  string written in that order (transforms compose right-to-left — reviewer-flagged trap).
- Pointer → content: invert M numerically. NEVER use getBoundingClientRect on the rotated
  stage for content coords (it returns the axis-aligned bounds of the rotated box).
- Pan deltas rotated by R(−θ) so dragging feels screen-natural at any rotation.
- Pinch: scale about the pinch midpoint with the content anchor preserved
  (pan′ = M_mid − s′·R(θ)·contentAnchor). One finger on MAP stays reserved for the wipe;
  two-finger = pan; Ctrl+drag = pan on desktop.
- Default θ = "square to deck" (deck's long wall horizontal, measured once from the
  ortho); compass chip shows θ and click-resets to north-up.
- Because rotation is display-only on the single stage node, thermal/drains/markers/wipe
  all rotate together — inter-layer alignment is untouched by construction.

## 9. Phase 8 — Assembly & QA

- Rebuild chain: assets p1→p4 → viewer build → refresh hosted ASU_DELIVERABLE folder
  (index.html + tiles + GLB + point-cloud bin).
- Serving matrix: hosted folder = full experience; double-clicked single file = MAP +
  THERMAL + drains + REPORT (embedded), 3D/TERRAIN show a "serve to enable" card
  (browsers block sibling-file fetch on file://; 60–90 MB cannot be embedded).
- QA checklist (each item screenshotted/measured, not assumed): swipe alignment at 6
  landmarks; hover temps at 4 known spots; all 18 drains vs crops; zoom out to 0.25×,
  in to 8×; rotation on/off with hover still correct; Ctrl-pan + pinch on touch;
  3D orbit/pan; TERRAIN density and colors; PLANS page; REPORT untouched.

## 10. Risks & honest caveats (stated up front)

1. The DD ortho also shows mild tonal variation (pre-dawn flight). Import fixes geometry
   and sharpness, not radiometry. Accepted as-is per client direction.
2. Thermal alignment gate = "no worse than previously accepted", not a new claim.
3. If phase correlation gives a broad peak (color/processing differences), the fallback
   ladder is ECC → manual control points; the plan does not ship an unverified base.
4. OBJ axis/units are unknown until inspected; Phase 0 resolves this deterministically.
5. iGPU memory is the 3D/TERRAIN constraint; hence 2048 textures, ≤3 M points, lazy tabs.
6. LAS vertical datum likely orthometric → TERRAIN uses relative elevation by design.

## 11. Open questions for reviewers

1. Any flaw in the ENU placement chain (world file → mercator anchor → cos(φ) scale →
   frame px), or in refining translation only?
2. Is "relative elevation" for TERRAIN acceptable, or is a GEOID18 lookup worth the
   dependency for v1?
3. Drain gates: median ≤3 px / RMSE ≤4 px / worst ≤10 px at 1.1 cm/px — right thresholds?
4. Anything missing from the stage-matrix / pointer-inverse math for a rotated,
   zoomable, wipe-enabled stage?
5. Packaging: obj2gltf vs manual converter given the 4-material OBJ — any known DD
   export quirks (per-face materials, vertex normals, non-manifold) that break obj2gltf?
