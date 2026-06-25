# Slate360 — 360° Tour Builder Build Plan (v2, locked)

> Status: **locked source of truth.** Reconciled from four independent AI design passes +
> four independent red-team passes + Brian's feedback. Supersedes the Grok "360 Tour
> Builder" research docs. CEO-only first, like Thermal Studio.
>
> This doc is intentionally lean. It records **decisions, data model, derivative matrix,
> phases, and acceptance tests** — not architecture debate (that has converged). When a
> phase starts, expand only that phase's slice into code.

---

## 0. Principles (hard rules)

1. **Free / open-source only — no subscription dependency anywhere in the runtime.** This
   feature exists to *replace* Kuula/Matterport/CloudPano subscriptions, so it must not
   require one. Entire runtime is MIT/Apache/BSD/LGPL. GPL tools (Hugin, enblend,
   darktable, RawTherapee) are used **only as isolated server-side CLI processes in the
   Modal worker** — SaaS server-side use does not trigger GPL distribution obligations.
   They are never linked into, or shipped inside, the app. **PTGui and any paid stitcher
   are explicitly NOT in the plan** (Hugin+enblend is the free equivalent). Proprietary
   camera SDKs (Insta360 MediaSDK) are optional Tier-2 accelerators, never required.
2. **Heavy compute is cloud-only.** App/desktop uploads → API enqueues a job → Trigger.dev
   → Modal (Python) → signed callback → Supabase row update → Realtime refresh. No
   in-browser/WASM stitching, tiling, or rendering. (Matches the existing thermal/twin
   pattern in `CLAUDE.md`.)
3. **Export-first, multi-brand by design.** A finished 2:1 equirectangular JPG/MP4 is
   brand-agnostic. Tier 1 ingests any such file from any camera/drone's own free app.
   Tier 2 (later) adds per-brand raw auto-ingest via a `camera_profiles` abstraction —
   always additive, never a rewrite, never a ship blocker.
4. **Viewer is Photo Sphere Viewer 5.14.1.** Keep it. No viewer swap. All plugins pinned
   to exactly `5.14.1`.
5. **Original uploads are never mutated.** Every processed output is a *derivative*. The
   viewer always selects the best **ready** derivative for the active share mode.
6. **Graphite Glass + no-scroll desktop.** Fixed-height workspace, internally scrolling
   panels, React-state sub-tabs. No amber/glow/pill. Tokens only.
7. **CEO-only now.** Hidden from nav (`ceoOnly`), server `notFound()` unless `isSlateCeo`.
   But it still produces public, token-gated, no-login deliverables (like the thermal
   share viewer). Per-tier entitlements/billing deferred.
8. **Three distinct authoring concepts — never one overloaded "hotspot":**
   - **Hotspots** = clickable points (nav / info / media / file / url)
   - **Text Layers** = storytelling overlays (titles, bands, lower-thirds)
   - **Inspection Callouts** = defects (yaw/pitch + severity + status + photo + Q&A)
9. **A sent link is immutable.** Publishing freezes a snapshot. Editing the tour does not
   change what a client already received; "Update link" mints a new version.

---

## 1. Viewer stack (pin all to 5.14.1)

| Package | Purpose |
|---|---|
| `@photo-sphere-viewer/core` | base viewer (already installed) |
| `markers-plugin` | info/media/file/url hotspots, numbered callouts, flat text labels |
| `virtual-tour-plugin` | scene-to-scene nav graph (3D arrows) |
| `gallery-plugin` | thumbnail strip |
| `gyroscope-plugin` + `stereo-plugin` | mobile motion + VR (P5) |
| `equirectangular-tiles-adapter` | tiled load of 8K–16K panos (P0) |
| `equirectangular-video-adapter` / `video-plugin` | 360 video scenes (P5) |
| `plan-plugin` | indoor floorplan minimap |
| `map-plugin` | geo-tagged (drone GPS) minimap |

Camera animation / keyframes use the core `animate({ yaw, pitch, zoom, speed })` API —
no extra dependency.

---

## 2. Data model (table list)

Existing: `project_tours`, `tour_scenes`, `deliverable_access_tokens` (has
`deliverable_type: 'tour'`).

### New / extended tables

- **`tour_scene_derivatives`** — every processed output. `(id, scene_id, derivative_type,
  storage_key, width, height, format, profile_json, brand_id?, tiles_manifest_key?,
  created_at)`. Types: `original | normalized | thumbnail | tiles_manifest |
  branded_nadir | mls_clean | enhanced | video_poster`.
- **`tour_processing_jobs`** — status surface. Stages: `upload_received → validating →
  thumbnailing → tiling → enhancing → ready | failed` (+ `error_log`, `retryable`).
- **`tour_scenes` (extend)** — camera settings: `initial_fov`, `min_fov`, `max_fov`,
  `default_zoom`, `autorotate bool`, `intro_keyframe_id?`; geo: `geo_lat`, `geo_lng`,
  `altitude_ft?`; classification: `scene_kind` (`aerial_geo | interior_plan | generic`);
  `multires_manifest_path?`, `video_path?`.
- **`tour_keyframes`** — camera keyframes. `(id, tour_id, scene_id?, path_id?, seq,
  yaw_deg, pitch_deg, fov_deg, duration_ms, easing, hold_ms, audio_offset_ms?)`. A
  keyframe belongs to either a scene intro move or a guided-path step.
  **Authoring UX (MUST be dead simple):** the author drags the pano to the exact
  angle + zoom they want, then clicks **"Capture keyframe"** — the current
  `viewer.getPosition()` + `getZoomLevel()` is saved verbatim. No numeric typing
  required (numeric fields are an optional advanced fallback). Setting a scene's open
  view is the same gesture: frame it, click **"Set as start view."**
- **`tour_scene_view_limits`** (or `tour_scenes.view_limits jsonb`) — **keep-out /
  restricted regions.** Author frames the area to hide and clicks **"Restrict this
  view"**; stored as yaw/pitch min/max clamps (PSV `setOption('moveInertia'/'maxFov'`
  and range-limited `defaultYaw/Pitch` + a `moverange` guard) and/or masked no-go
  cones. Viewer cannot pan/zoom into restricted regions. Same one-gesture simplicity as
  keyframes.
- **`tour_paths`** — guided autoplay. `(id, tour_id, name, loop bool)` + ordered
  `tour_keyframes` (scene stops with yaw/pitch/fov/dwell/transition).
- **`tour_hotspots`** — `(id, tour_id, scene_id, type[nav|info|media|file|url], yaw_deg,
  pitch_deg, target_scene_id?, target_yaw_deg?, target_pitch_deg?, target_fov_deg?,
  title, body_md, media_path?, media_kind?, external_url?, icon, size_px, opens_in,
  sort_order, is_visible, time_ms?` (360-video stub)`, translations jsonb,
  accessibility_label, metadata jsonb)`. Store **degrees**; convert to PSV at render.
  Constraints: nav requires target; url requires external_url.
- **`tour_text_layers`** — `(id, tour_id, scene_id?, layer_type[title_card|label|
  text_band|lower_third|intro], yaw_deg, pitch_deg, yaw_start?, yaw_end?, arc_height_deg?,
  style_json, animation_json, baked_overlay_key?, is_visible, sort_order)`. Authoring
  shows live DOM text; **bake to equirect overlay sprite on save/publish**, not per
  keystroke.
- **`tour_callouts`** (inspection) — `(id, tour_id, scene_id, seq_number, yaw_deg,
  pitch_deg, severity, status[open|monitor|resolved], title, description, linked_photo_path?,
  linked_item_id?, report_include bool, rectilinear_crop_key?)`.
- **`tour_callout_comments`** — threaded Q&A. `(id, callout_id, author_token?, author_user?,
  body, created_at)`.
- **`tour_publish_snapshots`** — immutable frozen deliverable. `(id, tour_id, version,
  scenes_json, derivatives_json, hotspots_json, paths_json, text_layers_json,
  branding_json, created_at)`. A share token references a snapshot, not the live tour.
- **`camera_profiles`** (Tier 2, stub now) — `(id, brand, model, raw_extensions[],
  lens_fov, stitch_method, imu_keys jsonb)`.

### Token / sharing extensions (P1 migration — not optional)

`deliverable_access_tokens` gains: `password_hash`, `role` (`view | comment | annotate |
download`), `layer_config jsonb` (`{ mode: 'branded'|'mls'|'inspection', watermark?,
visible_layers? }`), `snapshot_id`, `max_views`, `view_count`, `expires_at`, `revoked_at`.

---

## 3. Derivative matrix

Per scene, generated lazily (MLS/enhanced only on first share that needs them):

| derivative_type | When | Notes |
|---|---|---|
| `original` | on upload | never mutated |
| `normalized` | P0 | validated 2:1, orientation/color fixed |
| `thumbnail` | P0 | 640px, gallery + OG card source |
| `tiles_manifest` | P0 | libvips pyramid; must match tiles-adapter 5.14.1 schema (JSON-schema test in Modal) |
| `branded_nadir` | P3 | logo nadir treatment baked in |
| `mls_clean` | P3 / on share | neutral/blur/solid nadir, NO logo |
| `enhanced` | P5/P6 | Real-ESRGAN, opt-in paid only |
| `video_poster` | P5 | first frame of 360 video scene |

**MLS leak rule:** branding compiles into the *derivative selection*, not a CSS overlay.
An MLS token serves `mls_clean` tiles; it must be impossible to reach a `branded_*`
derivative URL from an MLS link. Define canonical S3 keys; lazy-generate to bound storage
bloat; add a retention policy (purge stale MLS/enhanced after N days).

---

## 4. Phases + acceptance tests

### P0 — Foundation + media pipeline
Un-hide `/tours` (remove `redirect`), CEO-gate via `layout.tsx` (`isSlateCeo` +
`notFound()`) and API (`withAppAuth` + CEO check), `ceoOnly` nav entry copied from Thermal,
4-tab no-scroll shell (**Library · Build · Share · Analytics**), brand-agnostic equirect
upload with **chunked/multipart presign** (iOS-safe), Modal thumbnail + libvips tiles,
`tour_scene_derivatives` + `tour_processing_jobs`, scene status via Realtime, basic tiled
viewer, scene-row states (uploading → processing → ready → error + retry; thumb shows
first).

**Done when:** CEO-only route hidden from normal nav; non-owner access → `notFound()`;
upload an 8K 2:1 equirect JPG; Modal generates thumbnail + tile pyramid; scene goes
processing → ready via Realtime; tiled scene loads with no page scroll; **token embed of
that scene first-paints < 3s on iPhone Safari**; failed processing shows readable
retry/error.

### P1 — Navigation + share parity
VirtualTour graph, nav + info/media/file/url hotspots, Gallery, deep links
(`?scene=&yaw=&pitch=&autoplay=`), embed builder, **MLS/unbranded mode**, token+password
parity migration, **publish snapshots**, unify public routes (token-first; UUID slug =
CEO preview, non-enumerable), **oEmbed/OG social cards** (1200×630 from cover/thumb, not
raw equirect), basic analytics events.

**Done when:** a published tour navigates scene→scene via arrows + gallery; a branded
token link and an MLS-clean token link both open with correct derivatives and no
cross-leak; password gate works; a Slack/iMessage paste unfurls a proper card; editing
the tour after sending does not change the already-sent snapshot.

### P2 — Authoring polish + storytelling spine
Click-to-place **with drag-adjust + undo + numeric yaw/pitch/fov + pole-exclusion**;
mode toggle (Navigate vs Place); marker style presets; **per-scene camera settings
(initial yaw/pitch/zoom, min/max, autorotate)**; **keyframes + guided autoplay path +
cover/start screen** (with Walkthrough Speed 0.5/1/2×, "Play from here", reduced-motion =
instant cut); floorplan minimap (`plan-plugin` indoor vs `map-plugin` geo; per-scene
`scene_kind` badge; mobile = collapsible radar); **list-view a11y fallback**; analytics
rollup (pg_cron/Trigger) with embed-vs-full + drop-off scene + autoplay completion.

**Done when:** author sets a scene's open view + zoom and a 3-stop guided path with
keyframed camera moves; "Play Tour" runs the path smoothly; reduced-motion disables
kinetic camera; keyboard Tab cycles hotspots, Enter activates; List view enumerates
scenes + hotspots.

### P3 — Drone "beautiful aerial" mode
**Baked nadir treatment** (modes: `logo | blur | solid | none`; MLS forces non-logo),
tiny-planet intro, altitude metadata + cinematic transitions, branded/MLS derivative
generation. Extract altitude/GPS/IMU from EXIF/XMP for transition tuning.

**Done when:** an Avata/X5 aerial export gets a feathered baked nadir patch invisible on
gyro pitch-down; MLS derivative shows neutral patch (no logo); tiny-planet intro plays;
scene carries GPS → map-plugin minimap.

### P4 — Inspection mode
`tour_callouts` (numbered, severity, status, linked photo), single **Callout drawer**
(severity + photos + thread), comment→camera-animates-to-callout, **Modal rectilinear
crop** (~90–110° FOV centered on yaw/pitch) for each callout + mini equirect inset with
pin, inspection PDF reusing thermal ReportLab **shell** (not `describe_anomaly`), QR back
to token URL per callout, before/after slider (tie to Ghost Mode pairs). Web inspection
deliverable = token viewer with callout-list sidebar.

**Done when:** place 3 callouts across 2 scenes; recipient with `annotate` role opens a
callout, sees an undistorted rectilinear crop, and posts a comment; PDF renders flat crops
(not warped equirect slices) with QR links; copy says "professional inspection package,"
not "ASTM-grade" (unless a standard is actually mapped).

### P5 — Immersion + advanced creative
**Text Studio** (start minimal: static title card, static label, simple fade, baked
overlay proof — *then* curved bands/kinetic; caps ≤8 animated layers/scene; MLS disables
kinetic; reduced-motion → static; **live DOM preview, bake on save**), 360 video +
time-coded hotspots, per-hotspot/ambient audio + narration, gyro/VR, **Capacitor view +
chunked upload app** (offline cached tiles for trailer viewing).

### P6 — Power features (deferred)
Per-brand raw auto-ingest profiles (free path: FFmpeg `v360` for `.insp`; Hugin+enblend
isolated CLI for multi-photo aerial sets; darktable/RawTherapee for RAW grade — all
GPL-isolated, server-side only). Optional Insta360 MediaSDK accelerator. AI auto-hotspots
(Florence-2 MIT or GroundingDINO Apache; avoid AGPL YOLO). DepthAnythingV2 (Apache)
parallax. MP4 fly-through. Measurement (only with real scale calibration — risky, gated).
DJI `.360` raw stitch (only after sample-file validation). Standalone offline HTML/JS
bundle export (USB deliverable, like 3DVista). Custom domains.

---

## 5. Viewer-safe fallback rules (define for every advanced feature)

| Condition | Fallback |
|---|---|
| MLS mode | non-logo nadir; kinetic text off; no Slate chrome |
| mobile / low-power | static text; floorplan → radar; cap animations |
| reduced-motion | autoplay = instant cut; no kinetic text/camera |
| embed iframe | token-in-URL or public MLS token (third-party cookies may block password) |
| no WebGL | scene-list + hotspot-list view (also the a11y fallback) |
| role lacks annotate | inspection comments read-only |
| large pano | tiled adapter (never single giant JPG) |

---

## 6. Free/OSS stitching pipeline (desktop, for unstitched aerial sets — outside the app)

For overlapping multi-photo drone spheres (not single-shot 360s), the **free** path:
RAW (DNG) → **darktable / RawTherapee** (grade one frame, sync settings to the whole set,
export 16-bit TIFF) → **Hugin** (control points, equirect align) → **enblend** (multi-band
seam blending) → upload finished 2:1 equirect to Slate360 (Tier 1). Seam quality is mostly
won at capture (30–50% overlap, synced exposure, even light) — not in the viewer. This is a
desktop workflow today; an optional Modal job type only at P6. (PTGui is faster but paid →
out of scope by Principle #1.)

---

## 7. Integration hooks (Slate360 synergy)

- Auto-file ingested scenes under SlateDrop `Projects/{n}/360/Tours/{tourId}/`.
- Embed a published tour in a Site Walk deliverable block (existing
  `tours360InSiteWalk`-style entitlement).
- Clone tour / duplicate scene for fast CEO iteration.
- Scene tags/filters (`roof`, `exterior`, `floor-2`, date) in Library + Analytics.
- Before/after aerial progression = date-stamped scene pairs for owners.
