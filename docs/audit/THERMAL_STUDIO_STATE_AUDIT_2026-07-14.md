# Thermal Studio — Technical State Audit (2026-07-14)

Audit of backend capabilities, interactive UI/deliverables, and 2D/3D integration
readiness. Produced from three parallel code sweeps (backend, frontend, geospatial).
Every claim cites the file it was verified in. Written to be readable by external
AI reviewers with repo access.

---

## 1. Backend capabilities (Modal Python + processing)

**Architecture:** Modal CPU app `slate360-thermal-analysis` (Python 3.11; exiftool,
OpenCV-headless, numpy, ReportLab, anthropic). Flow: upload →
`app/api/ops/thermal/jobs/route.ts` → Trigger.dev (`src/trigger/thermal-extract.ts`,
task `thermal.process`) → Modal endpoint → HMAC-signed callback
(`lib/thermal/job-callback.ts`) → Supabase Realtime → UI.

### Module inventory (`workers/modal/thermal-analysis/`)

| Module | Role |
|---|---|
| `worker.py` | Dispatcher `process_thermal_job` (jobTypes extract / extract_analyze / analyze / align / report / full_pipeline, :104–278); endpoints `process`, `timelapse`, `interpret`, `chat`, `panorama`; Claude-vision interpretation w/ scene-cause whitelist validation (:418–471) + monthly per-org USD spend ledger in R2 (:384–404); HMAC callback signing (:69–85) |
| `extract.py` | Radiometric decode: `detect_sensor` (:50), FLIR Planck (:100), DJI linear (:116), Autel ambient-delta heuristic (:123), HIKMICRO HDRI decoder (:165), generic linear fallback (:156); blur/saturation quality metrics; inferno false-color preview |
| `analyze.py` | Local-contrast statistical anomaly detection (see below); Hough linear-streak detection (:172); SAM segmentation STUB (:229) |
| `panorama.py` | REAL OpenCV stitching on temperature grids: ORB(3000) + BFMatcher + RANSAC homography chain, plausibility gate + translation-prior fallback (:42–73), warp + coverage-weighted average blend, MAX_CANVAS_DIM 8000 (:21). Mosaic stays radiometric (output = new NPZ capture, `metadata.panorama:true`) |
| `pipeline.py` | Orchestration, R2 key builders (:114–125), operator-spot measurement on calibrated grids (:216–279), Open-Meteo weather enrichment (:36–77), report bundling; `process_capture_align` = GPS-manifest STUB, no registration (:343–375) |
| `report.py` | ReportLab PDF (:564–696): cover/logo, exec-summary table, 3 finding layouts, QR link to interactive viewer (:284, :419); static dark HTML report (:435–534); honors Accept/Edit/Dismiss review + neutral cause-free language |
| `timelapse.py` | ffmpeg MP4 ("RIFE" maps to `minterpolate`, not real RIFE) |
| `r2_utils.py` | boto3 R2 client |

### Ingest — formats & calibration

- **FLIR R-JPEG:** absolute (Planck R1/R2/B/F/O), `flir_planck`; falls back to
  `flir_relative` when constants missing.
- **DJI (M3T/M30T):** absolute, linear ScaleFactor/Offset, `dji_linear`.
- **HIKMICRO:** decoded via HDRI post-EOI block; per-file linear fit onto footer
  display min/max, emissivity at footer+0xA0; `absolute_celsius=True` (~0.4 °C
  validated). Parallel client decoder: `lib/thermal/hikmicro-extract.ts`.
  Caveat: source unit hardcoded °F, no firmware auto-detect.
- **Autel:** RELATIVE — percentile-span heuristic anchored to ambient
  (`autel_ambient_delta`, `absolute=False`); without ambient, raw counts. The
  profile JSON advertises `autel_makernote` which is NOT implemented
  (`autel-evo-ii-dual-640t.json:6`). ΔT analysis honest; absolute temps must not
  be claimed (a "Relative ΔT only" banner is spec'd — roster slice 9).
- **Topdon/InfiRay:** no dedicated parser — degrade to `generic_relative`.

### Radiometric preservation — YES, end-to-end

Original at `orgs/{org}/thermal/{session}/raw/{captureId}/{filename}`; float32 grid
at `…/processed/{captureId}/radiometric.npz`; preview JPEG + quality JSON separate
(`pipeline.py:114–120`, `lib/thermal/storage-keys.ts`). DB keeps `storage_path` /
`npz_data_path` / `preview_path` distinct. All edits are metadata JSON on capture
rows — originals immutable. Node reads NPZ via `lib/thermal/npz.ts`.

### Analysis engine (`analyze.py`)

Local-contrast method: wide Gaussian local background (σ ≈ 0.12·max dim, :63);
MAD-robust sigma (:71); seed threshold max(2 °C, 1.5σ) OR scene offset (:115);
`connectedComponentsWithStats`; ΔT vs ring-mean of surrounding surface (:86);
Sobel edge-softness → focal|diffuse pattern (diffuse path catches moisture-like
plumes); severity action ≥12 °C / watch ≥7 °C (operator-overridable via
`analysis_params`); confidence 0.5 + ΔT/25 capped 0.95. Outputs: id, type,
severity, confidence, temp_c, delta_c, scene_delta_c, background_c, pattern,
**bbox** (no contour polygons yet — component masks computed then discarded),
area_px, rule_id. Caps: 25 anomalies, 8 Hough lines.

Isotherms, span/level, alarm bands (above/below/interval/dew-point/insulation)
and emissivity what-if recompute are CLIENT-side by design
(`lib/thermal/radiometric.ts` gray-body `tuneTemps`, `lib/thermal/alarm-band.ts`,
`lib/thermal/psychrometrics.ts`) — per the locked live-recompute law.
No dedicated moisture algorithm; diffuse classification + dew-point band +
`moisture_pattern` AI cause family cover it today.

### Reliability state

LIVE: SHA-256 job dedupe + unique-violation race handling
(`jobs/route.ts:12–15, 91–129`), accept-then-processing with rollback (:134–163),
cron reconciler (queued >15 min / processing >45 min → failed w/ reason,
`jobs/reconcile/route.ts`). DEBT: panorama/timelapse have NO job row → no
reconciler coverage; dispatch failures still return `queued:true`
(`panorama/route.ts:78–85`); spend ledger is racy read-modify-write JSON; weather
fetch serial per-capture; any failed job fails the whole session status; stale
comments claim interpret has no job row (it now does).

---

## 2. Current UI & interactive deliverables

**Three frontends:**
1. Legacy owner UI `components/ops/thermal/**` at `/thermal-studio` —
   `ThermalProbeViewer.tsx` (858 lines) workbench.
2. V2 owner UI `components/thermal-studio-v2/**` — 5 tabs (Library / Analyze /
   AI Review / Report / Deliver), mounted at `/preview/thermal-v2` AND
   `app/(dashboard)/thermal-studio-v2/[sessionId]/page.tsx` (the V2Shell comment
   claiming preview-only is stale).
3. Client share viewer `components/share/thermal/**` at
   `app/share/thermal/[token]`.

**Stack:** custom Canvas 2D via `renderHeatmap` (`lib/thermal/probe-palettes.ts:90`,
12 palettes); `react-resizable-panels` (V2 layout); SVG for measurement geometry;
Leaflet for maps. No Konva/Three/Pixi in thermal paths.

**Owner tools (both UIs):** point/box/circle/line (+polygon in V2) measurements
w/ drag/resize; span/level drag legend; isotherms; palettes; hover tag + draggable
loupe; emissivity/reflected live recompute; histogram; undo/redo; extreme markers;
°C/°F; zoom/pan; collapsible rails; V2 adds compare 2-up (synced pan/zoom,
span-lock), fusion blend, rotate/flip, local contrast, A/B flicker, alarm bands,
analyst chat, focus mode, copy/paste settings.

### Feature checklist

| Feature | Owner UI | Client share viewer |
|---|---|---|
| Before/after draggable slider | MISSING (2-up compare only, `AnalyzeCompareView.tsx`; a clip-path slider exists in `components/digital-twin/desktop/ProgressionCompareViewer.tsx` — liftable) | MISSING |
| Hover exact temps | EXISTS (tag + loupe) | **EXISTS** — `useShareHoverTemp.ts` lazily fetches the real grid via `/api/share/thermal/[token]/grid/[captureId]`; readout hardcoded °F (`ThermalShareSlide.tsx:119`) |
| Zoom & pan | EXISTS (`useCanvasStage`) | MISSING (fixed `<img>`) |
| Toggleable layers | EXISTS/PARTIAL | MISSING — boxes always on; token has an unused `layer_config` column |
| Multi-tab viewer | EXISTS (3-tab / 5-tab) | PARTIAL — prev/next + thumbnail strip only |
| Collapsible sidebar | EXISTS | MISSING — fixed grid |

**Reports & links:** PDFs = Modal `report` jobs (ReportLab) → R2 → signed-URL
redirect (`app/api/share/thermal/[token]/report/route.ts`). Template gallery UIs
exist over `thermal_report_templates` (V2 `ReportTemplateGallery.tsx` thumbnails
are placeholder divs). Share links: `thermal_analysis_share_tokens` — 24-byte
token, roles view/annotate/download, `expires_at`, `max_views`, `is_revoked`,
`password_hash`, `layer_config`, `branding_snapshot`; Q&A widget
(`ThermalShareQA.tsx`); deep-link `?c=<captureId>`; `?embed=1`.
GAP: `annotate` role has API support but ZERO client UI — behaves as `view`.

**Tech debt:** 858-line probe viewer (legacy — deleted at S9); duplicated
letterbox math in `AnalyzeCompareView` vs `useCanvasStage`; two parallel owner
UIs until the swap; hardcoded °F in share readout; inconsistent zoom clamps
(1–8 legacy vs 0.25–12 V2); fake template thumbnails.

---

## 3. Integration readiness — 2D map / 3D model

### 2D map: essentially ready
- Thermal-aware Leaflet components SHIPPING: `ThermalTwinOverlayMap.tsx` (OSM
  tiles, anomaly-colored capture pins, thumbnail popups, fit-bounds, layer
  toggle), V2 `LibraryMap.tsx` (Grid⇄Map, click-to-open, shared `capturesToPins`
  in `geo-pins.ts`), `AnalyzeGpsMiniMap.tsx`.
- SITE-PLAN (non-GPS) pattern exists: `components/site-walk/capture/
  PlanViewerLeaflet.tsx` — `L.CRS.Simple` + `ImageOverlay` + percent-coordinate
  pins with `x_pct/y_pct ↔ latlng` transforms (:49, :296), pan/zoom, drag pins.
  Rasterized-plan columns + serving route already exist (site-walk).
- Verify: `extract.py:311–343` records GPS *presence*; confirm decimal lat/lon
  reaches `metadata.gps` for pins on drone imagery.
- No Mapbox/Cesium; none needed. OSM tiles keyless.

### 3D model: viewer ready; thermal-on-surface NOT
- Complete web 3D stack ships: three.js + R3F + Spark Gaussian-splat renderer
  (`components/digital-twin/splat-viewer-core.tsx` — orbit controls, raycast
  picking, context-loss recovery, `overlay` slot), share-ready wrapper
  (`TwinShareSplatViewer.tsx`), 3D pin/measurement overlays
  (`TwinSceneOverlays.tsx`, Vec3 billboard pins + lines). Formats: .spz splats,
  glTF/GLB/USDZ, 360 pano (`lib/digital-twin/viewer-format.ts`).
- Embedding a 3D chapter with clickable finding pins = MEDIUM effort (lift +
  `ssr:false` dynamic imports — existing pattern).
- Thermal-pixel → 3D-surface projection = NOT BUILT (align is a GPS stub;
  `ThermalTwinLayerPanel.tsx:115–130` says COLMAP fusion is future). Struck from
  product surface per build-specs Addendum H5. Do not promise.
- Synced tri-view (panorama ⇄ plan ⇄ 3D): feasible via a shared finding-ID
  selection store; all three surfaces already expose click callbacks.

---

## 4. Overall assessment & recommendations

**Readiness:** hover temps on links DONE; owner zoom/pan/layers/tabs/sidebar DONE;
radiometric panorama REAL v1 (naive blend, sequential assumption); client
zoom/pan/layers/tabs/sidebar MISSING but LOW effort (owner components +
`layer_config` column exist); before/after slider MISSING, LIFTABLE; 2D plan
overlay PATTERN EXISTS; 3D chapter COMPONENTS EXIST; thermal-on-3D NOT REAL.

**Priority (value ÷ effort):**
1. **Client viewer upgrade** (frontend-only): grid-render via `renderHeatmap`
   instead of static preview (unlocks client palettes/isotherms), zoom/pan via
   `useCanvasStage`, layer toggles from `layer_config`, collapsible sidebar,
   unit toggle.
2. **Before/after slider**: port the digital-twin clip-path slider; two
   grid-rendered canvases + locked span; same surface hosts the pre/post-rain
   per-pixel ΔT difference lens.
3. **2D site-plan chapter**: PlanViewerLeaflet pattern + finding pins
   (percent coords), click-to-jump into panorama.
4. **Backend quick wins**: emit contour polygons + gradient trend vectors from
   the already-computed component masks in `analyze.py`; raise the 25-anomaly
   cap for panoramas; job rows for panorama/timelapse (reconciler coverage);
   Autel relative-only flag in `sensor_profile`.
5. **Defer**: multi-band seam blending (cosmetic); thermal→3D projection
   (research-grade); true Autel makernote decode (reverse-engineering/vendor SDK).

**Constraints:** Modal CPU-only (fine for stitching at this scale); Vercel share
routes must stay thin (stream grids, never decode per-hover server-side);
Leaflet/Spark = client-only dynamic imports; tile-pyramid (spec'd for 20 MP+
panoramas) not yet built — ImageOverlay is fine up to the 8000px canvas cap.
