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

---

## 8. Addendum 2026-07-05 — app-first re-prioritization + plan tours (Brian-confirmed)

> Amends §4's phase order per Brian (relayed through a multi-AI review). The P0–P6
> content above stays valid; **the mobile app moves from P5 to front-of-line**, and a
> new deliverable type — the **plan-sheet tour** — is added. Full journey/screen split
> lives in the 2026-07-05 conversation record and `TWIN360_END_TO_END_UX_PLAN.md`'s
> sibling discussion; this section records the durable decisions.

### 8.1 Revised sequencing (two tracks)
1. **Twin Slice 0 (reprocess button) ships first** — separate track, small, stops bad
   twin links. Then the Tours track opens:
2. **App import flow** — Photos/Files pickers + iOS share-sheet target; equirect
   auto-detect by **aspect ratio (~2:1) + XMP `GPano` metadata, never filenames**;
   resumable upload; auto-file to SlateDrop `Projects/{n}/360/Tours/` or org-level
   360 Library inbox when project-less.
3. **Plan-tour recipient viewer** (the differentiator — see §8.3).
4. **Basic desktop authoring + brand kit / white-label viewer** (branding via
   derivative selection per §3 — unchanged).
5. Remaining phases as in §4.

### 8.2 Competitive wedge (validated 2026-07-05 via web scan + external AI teardown)
Construction platforms (OpenSpace, HoloBuilder/StructionSite-DroneDeploy, Cupix):
plan-anchored but utilitarian viewers, enterprise/quote-only pricing, weak branding.
Consumer builders (Kuula, CloudPano, Panoee, 3DVista): artful viewers + white-label on
higher tiers, zero construction/project context. **Nobody sells artful + plan-anchored
+ white-label + integrated file system at SMB price. That combination is the product.**

### 8.3 Plan-sheet tour — recipient motion spec (external AI design pass, accepted)
Full-bleed plan sheet with numbered pins · bottom sheet-strip · pin → cinematic
"dive" into pano · breadcrumb back + next/prev pin-to-pin. Feel: cinematic, calm,
premium — never a modal, never bouncy.

| Interaction | Duration | Easing | Notes | Reduced-motion |
|---|---|---|---|---|
| Sheet strip switch | 280ms | ease-out | crossfade + slight scale on outgoing sheet | instant |
| Pin idle → hover | 120ms | ease-out | scale 1.0→1.08 + accent pulse on number | static accent |
| Pin tap → pano entry ("dive") | 420ms | ease-in-out | zoom+slight rotate toward pin; sheet fades; pano fades in, small overshoot, settle | instant |
| Pano exit (back to sheet) | 320ms | ease-in | reverse — pano pulls back into pin ("coming up for air") | instant |
| Next/prev pano | 380ms | ease-in-out | camera move + subtle crossfade | hard cut |
| Active pin | — | — | stronger accent + ring pulse while inside its pano | static |

### 8.4 Sample assets on hand (local `reference/plan-sets/`, gitignored)
Five real multi-sheet sets characterizing the ingestion envelope:

| Set | Sheets | Sheet size | Text layer |
|---|---|---|---|
| ASU West AOB Rm 205 permit | 14 | 42×30 in (Arch E1) | vector text ✅ |
| Poly Santa Catalina Hall (sealed) | 10 | 24×36 in (Arch D) | none (raster-flattened) |
| PSF166 Rev 1 (sealed) | 11 | 24×36 in | none |
| Payne Hall Classroom TI (sealed) | 12 | 24×36 in | none |
| Pod 5 Phase II | 5 | 16.5×11.7 in (A3) | vector text ✅ |

Implications: sheet rasterization must handle **both** vector and flattened-raster
PDFs at Arch D/E sizes (rasterize at fixed DPI budget, tile for Leaflet — same
pipeline family as walks-with-plans); sheet-index/name extraction can use the text
layer when present but needs a thumbnail-picker fallback when not.

### 8.5 Equirect detection — validated 2026-07-05

**Design decision confirmed against a real file:** detect equirect by **aspect
ratio (~2:1) as the PRIMARY signal, GPano XMP (`ProjectionType=equirectangular`,
`FullPanoWidthPixels`, etc.) as a CONFIRMING/enriching signal only.** Reason, proven
concretely: a genuine 360 panorama on Brian's disk (`pletchers.jpg`, **8192×4096,
exactly 2.000:1**) had **all GPano XMP and camera Make/Model stripped** — likely by an
edit/re-export step. A GPano-first detector would have silently rejected a valid 360.
Real field files lose metadata constantly (editing, chat transfer, re-export), so
ratio-first is the robust primary; XMP, when present, adds heading/pose/full-res hints.
Parse XMP cheaply (scan the first ~few hundred KB for the `GPano` namespace — no full
decode). `pletchers.jpg` (kept in `reference/`) is the "valid-but-metadata-stripped"
test fixture; the second photo batch this session (Sun Devil Baseball pitching lab)
was visually confirmed equirectangular (ceiling arc, full 360° text wrap, pole pinch).

**Still nice-to-have from Brian (does NOT block the detection slice — both branches
are now testable):** 2–3 pristine straight-off-the-X4 exports (Insta360 app → *Export →
360 photo*, moved via AirDrop/Files/USB, NOT chat) to validate the GPano-present happy
path + confirm the X4's native 11904×5952 envelope; one raw `.insp` for Tier-2 raw
ingest planning. DJI Avata deferred (not FAA-registered yet).

---

## 9. Addendum 2026-07-07 — competitive research lock-in + deliverables taxonomy

> Two full research rounds (Kuula deep-dive + 8-platform sweep: Matterport, 3DVista,
> CloudPano, EyeSpy360, Klapty, Metareal, iStaging, Ricoh360, plus a scan of Cupix,
> Zillow 3D Home, Giraffe360, Immoviewer, Asteroom, Roundme, TourBuilder/ex-Panoskin,
> VirtualTourEasy, iGUIDE, Panoee, SeekBeak, Pano2VR). Every finding below is folded into
> the existing plan — nothing here contradicts §0–§8; it fills gaps and resolves open
> questions Brian raised directly.

### 9.1 Rename the `Share` tab → `Deliverables`

Matches platform-wide terminology (Site Walk/SlateDrop already call this concept
"Deliverables," not "Share"). Tab order becomes **Library · Build · Plan · Deliverables
· Analytics**. The Deliverables tab is where a finished tour is packaged and sent —
authoring stays in Build/Plan.

### 9.2 Deliverable types (what "Deliverables" actually offers)

| Type | What it is | Built on |
|---|---|---|
| **Interactive Link** | Token-gated public viewer (branded or MLS-clean) | existing `deliverable_access_tokens` + `layer_config` (§2) |
| **Plan-Sheet Walkthrough** | The slideshow-style plan-pin dive viewer — click through sheets, click a pin, dive into the 360 | already built this session (`PlanSheetTourViewer`) |
| **Embed Snippet** | iframe/JS embed for a client's own website | reuses P1 embed builder |
| **MLS-Compliant Export** | One-click unbranded link: strips contact info, outbound links, and the nadir logo | extends `mls_clean` derivative (§3) — see 9.5 |
| **PDF Leave-Behind** | Static summary doc with cover shots + QR to the interactive link | reuses Site Walk's existing PDF/branding infra — do not build a new PDF pipeline |
| **Video Flythrough** | Rendered MP4 of a guided path (P2's keyframes/paths already produce the camera moves) | new — see 9.7, genuine category gap |
| **Tour Package (offline file)** | Self-contained HTML+assets bundle, registered into the project's SlateDrop **Deliverables** folder | already scoped at P6 ("Standalone offline HTML/JS bundle export") — just needs the SlateDrop registration wired in, same bridge Site Walk uses (`register-deliverable.ts`) |
| **VR / Headset Link** | Same interactive link, with a "View in VR" entry point | uses the already-planned `stereo-plugin` (§1, P5) — WebXR-in-browser, matching how every competitor does it (see 9.10) |
| **Google Business Profile Publish** | Push tour scenes to the org's Google listing | new — see 9.8 |

### 9.3 Tour Type / Purpose (new field, not a new pipeline)

Add `project_tours.purpose` (`marketing | aerial | wayfinding | construction`) — an
additive tag that changes **defaults**, not a fork of the engine:

| Purpose | Default branding mode | Plan-sheet required? | Evidentiary hash? | Notes |
|---|---|---|---|---|
| `marketing` | branded (Slate360 or client logo) | no | no | showcase a business/property; background audio encouraged |
| `aerial` | branded_nadir (P3) | no | no | drone-captured; tiny-planet intro, altitude metadata (P3, already scoped) |
| `wayfinding` | MLS-clean / white-label | no | no | destined for another business's site or Google Business Profile (9.8) |
| `construction` | branded | often yes | yes (content-sha256, matches platform-wide rule) | full Slate360 workflow — project-linked, SlateDrop, plan pins, deliverable registration |

### 9.4 Nadir patch tool (new — fills the "cover the tripod" ask)

Standard, well-understood pattern (Kuula + 3DVista both have it, nobody has anything
better): author uploads a small transparent PNG, drags to position + scales over the
nadir; save as a reusable asset; optional "Master" flag auto-applies it to every scene
in the tour. **Viewer-time overlay, never a destructive edit of `original`** — same
non-mutation principle as §0.5. Ties into `branded_nadir` derivative (§3); auto-hidden
when `mls_clean` is requested (9.5). No AI-based automatic tripod removal exists
anywhere in the category — not attempting that now.

### 9.5 MLS-compliant export — concrete mechanics

Extends the existing `mls_clean` derivative + `layer_config.mode: 'mls'` (§2–§3).
"MLS-compliant" means: no nadir logo (auto-hidden per 9.4), no agent/company
name/contact info anywhere in the viewer chrome, no live outbound links (this rules out
hosting a tour's video/audio on a service whose player links back to itself — matches
the real MLS rule that disallows YouTube-hosted tours). One-click toggle in
Deliverables, not a separate authoring mode.

### 9.6 Native lead-capture as a first-class hotspot/card type

Kuula's "interactive card" is iframe-only (no native form, no gallery, no e-commerce).
CloudPano and EyeSpy360 both ship **native** lead-capture forms (name/email/phone,
submissions emailed to the owner) — that's the bar. Build a `tour_hotspots.type = 'lead_form'`
(extends the type enum in §2) with real fields, not an embedded Google Form. Bonus,
cheap once hotspots exist: an `is_hidden_until_found` flag for scavenger-hunt-style
reveal hotspots — confirmed absent from every platform researched.

### 9.7 Video flythrough export — real category gap, worth building

Checked directly: Kuula, Matterport, 3DVista, CloudPano — **none** offer one-click
"export as MP4." Kuula's own official workaround is manually screen-recording the
browser. This is genuinely buildable for us: P2 already produces `tour_keyframes` +
`tour_paths` (camera moves for guided autoplay) — a Modal job that renders that same
camera path server-side (headless browser + PSV, or a WebGL-to-frames renderer) into
an MP4 is a natural extension, not new authoring surface. Sequence after P2 ships.

### 9.8 Google Street View Publish API integration

Google's old "Trusted Photographer" certification program is dead (ended Dec 31,
2024). What's live today: the **Street View Publish API** (still active, developer-
facing — this is what CloudPano etc. use under the hood). A `wayfinding`-purpose tour
could one-click-publish its scenes to the org's Google Business Profile via this API.
Real and currently available — not chasing a defunct program.

### 9.9 Sending a tour — reuse Coordination Hub, do not build new send infra

"Send" in Deliverables should pick recipients from the org's existing contacts
(`org_contacts`, already built for Coordination Hub) and dispatch via the already-wired
Resend (email) / Twilio (SMS) channels — same pattern as every other coordination
notification in the platform. No new contact-picker or send pipeline needed.

### 9.10 VR / Apple Vision Pro — confirm the plan, don't over-invest

Researched every competitor's VR story: **nobody has a genuinely native, polished
headset app** — even Matterport (the category leader) is browser/WebXR-only on Quest
3 and Vision Pro. The one platform (3DVista) that shipped a real native Quest app sits
at 2.3 stars and is flagged out of Meta's VR-Check compliance. **Our already-planned
P5 `stereo-plugin` (browser-based WebXR entry) is the correct, industry-matching
answer** — do not scope a native VR app now. A genuinely polished native app remains
real, open whitespace for later if we ever want it.

### 9.11 RAW multi-photo stitching — the §6 plan is confirmed correct, still P6

Every competitor researched (Kuula, 3DVista, CloudPano, EyeSpy360, Ricoh360, iStaging)
follows the exact same pattern already locked in §6: dedicated-360-camera output is
pre-stitched by the camera's own app before any of these tools touch it; **nobody**
does in-browser or in-app RAW-to-equirect stitching themselves. Our planned free/OSS
Hugin+enblend Modal pipeline (§6, P6) is not behind anyone — it would actually be
*ahead*, since it's the only "we stitch it for you" offering found anywhere in the
category (competitors only accept pre-stitched files). No change to sequencing;
confirmed as still correctly scoped at P6, not urgent to pull forward.

### 9.12 "Remove stitch lines" — be honest about what's real

Kuula's "hide stitching line" toggle is cosmetic UI copy, not actual seam repair —
real seam quality is won at *capture* (overlap %, exposure sync), which is exactly why
§6 already frames it that way. An AI inpainting-based seam fixer is a real, harder R&D
item with no existing precedent anywhere in the category — worth flagging as a future
`enhanced` derivative candidate (§3, already has a slot for exactly this kind of opt-in
paid enhancement), not promising it now.

### 9.13 Camera / drone compatibility — confirm "maximum compatibility" is already true

Principle #3 (any 2:1 equirect JPG/PNG from any camera's own app) already means we're
compatible with Insta360 (X-series/One X2/X3/X4, Titan, Pro), Ricoh Theta, GoPro
Max/Fusion, Kandao, and DJI's 360-capable output, because **every one of those
manufacturers' own apps does the stitching before the file ever reaches us** — same
universal-import model the entire category uses. Insta360's newer drone sub-brand
("Antigravity") should follow the same pattern once its export format is confirmed —
add it to the `camera_profiles` stub list (§2) as unverified until a sample file is
in hand, same treatment already given to DJI Avata. The one concrete to-do: robust
upload-time validation (clear "this doesn't look like a 360 photo" error) plus the
horizon/vertical-alignment handling for partial/drone panoramas Kuula already has,
which we don't yet.

### 9.14 Mobile vs. desktop — confirms §8.1, no change needed

§8.1's app-import-flow (Photos/Files picker + share-sheet, equirect auto-detect,
resumable upload, auto-file to SlateDrop) already matches the phone-captures/desktop-
authors split every competitor with a mobile app uses (CloudPano, iStaging, Ricoh360).
Add one small mobile action confirmed useful by this research: a lightweight "send this
tour" trigger (picks a contact, dispatches via 9.9) — everything else (settings depth,
hotspot/pin authoring, Deliverables assembly) stays desktop-only, unchanged.

### 9.15 Full competitive matrix

Condensed reference table (18 platforms researched; full sourced detail in the
2026-07-06/07 research artifacts, not duplicated here): true gaze/attention heatmap
analytics exists at only 3 of ~16 platforms checked (SeekBeak, Panoee, 3DVista); no
platform has a genuinely polished native VR headset app; no platform has one-click
video export; no platform has an e-commerce/shoppable hotspot except Panoee; only
CloudPano and EyeSpy360 have native (non-iframe) lead-capture forms; Matterport has
no native white-label at all (third-party overlay only); Ricoh360 never fully removes
its watermark even at its top paid tier. These are the gaps this addendum targets.

---

## 10. Addendum 2026-07-07(b) — stitching pipeline confirmed, device table corrected, social sharing reality

> Six independent external-AI research passes on the §9.11/§6 open questions (RAW
> stitching implementation + camera/drone export compatibility), cross-checked against
> our actual current code. All six converge on the same core answer; differences were
> in command-chain detail and device specifics, reconciled below. Also answers a new
> question: interactive 360 deliverables on social platforms.

### 10.1 Stitching pipeline — §6/P6 plan confirmed correct, now with the real command chain

**Confirmed unanimously by all six passes: Hugin + enblend/enfuse remains the correct
free/OSS choice for 2026.** Nothing has displaced it. The concrete, verified headless
chain (replaces the sketch in §6):

```bash
pto_gen -o project.pto --projection=<0|3> --fov=<HFOV> --sort *.jpg
cpfind --multirow --celeste -o project.pto project.pto
cpclean -o project.pto project.pto
linefind -o project.pto project.pto
autooptimiser -a -m -l -s -o project.pto project.pto
pano_modify --projection=2 --fov=360x180 --canvas=AUTO --crop=AUTO -o project.pto project.pto
nona -m TIFF_m -o remap project.pto
enblend --compression=LZW -o pano.tif remap*.tif
convert pano.tif -quality 92 pano.jpg
exiftool -overwrite_original -XMP-GPano:ProjectionType=equirectangular \
  -XMP-GPano:UsePanoramaViewer=True -XMP-GPano:FullPanoWidthPixels=<W> \
  -XMP-GPano:FullPanoHeightPixels=<H> -XMP-GPano:CroppedAreaImageWidthPixels=<W> \
  -XMP-GPano:CroppedAreaImageHeightPixels=<H> -XMP-GPano:CroppedAreaLeftPixels=0 \
  -XMP-GPano:CroppedAreaTopPixels=0 pano.jpg
```

`--projection=0` (rectilinear) for phone/handheld source, `--projection=3` (fisheye)
for fisheye-lens rigs; `--fov` is a client-supplied hint when EXIF lacks focal length
(very common for phone/drone shots — pass a `lens_type` + `fov_hint` from the upload
UI). **Always inject GPano server-side after stitching** — do not assume the source
images (or the stitch itself) carry it.

**Required QA gate, not optional:** after `autooptimiser`, parse the `.pto` for
control-point count/connectivity and mean reprojection error. If images form
disconnected components or mean error exceeds a threshold, **fail to a
`needs_manual_retouch` status** rather than shipping a ghosted/misaligned result —
this is a hard requirement, not a nice-to-have, given our evidentiary use case (§0,
construction `purpose`, §9.3). Retry ladder: low control-point count → retry
`cpfind --fullscan`/`--allpairs`; still failing → mark `failed`, surface a clear
"reshoot with more overlap" message, never auto-ship a bad stitch.

**Construction-specific failure mode, worth flagging in the upload UI copy:** blank
drywall, repeating framing/scaffolding, and handheld parallax (camera not rotated
around its own no-parallax point) are exactly the conditions construction users will
hit most, and are the hardest cases for *any* stitcher, free or paid. Set
expectations accordingly rather than promising flawless results from a walked
handheld set.

### 10.2 What NOT to attempt (explicit, per convergent research)

- **Do not use OpenCV's `cv2.Stitcher` as the primary/only stitcher.** Confirmed by
  every pass: no native full-360 equirectangular output, no zenith/nadir handling, no
  seam-blending quality near enblend, brittle on low-texture surfaces. Fine only as a
  cheap pre-flight "do these images even overlap" check before invoking Hugin.
- **Do not adopt a deep-learning/diffusion stitcher as the production pipeline.**
  Current models (UDIS++, PixelStitch, UniStitch, DiT360, etc.) are pairwise/narrow-
  baseline research code, not closed-loop full-360 N-image engines. Revisit later
  **only** as an optional post-process for nadir/zenith hole-filling on
  `marketing`/`aerial`-purpose tours — never as the primary stitch, and never on
  `construction`-purpose (evidentiary) tours.
- **Never use generative/diffusion inpainting to complete a construction/evidentiary
  photo.** Multiple passes flagged this explicitly: it can hallucinate content (a
  structural beam, a missing wall section) — unacceptable where the photo is a
  record, not a marketing asset. If AI hole-filling ever ships, gate it hard to
  `purpose != 'construction'` and label it visibly as AI-assisted.
- **Do not build around a "DJI `.360` format."** It doesn't exist — `.360` is
  GoPro's/Insta360's raw container. DJI photos are plain JPEG/DNG; a DJI drone's
  in-app "Sphere" panorama is either an auto-stitched JPEG or a set of separate
  rectilinear/fisheye source frames, never a proprietary DJI 360 file type.
- **Do not treat GPano XMP as a hard accept/reject gate** — already the right call in
  §8.5, now doubly confirmed: Insta360's own Studio/app frequently **strips** GPano on
  export (multiple independent community fix-tools exist for exactly this), and GoPro
  Player does the same. Aspect-ratio-first, GPano-confirming-only remains correct.
- **Do not chase PTGui or any paid stitcher** — still excluded by Principle #1; Hugin
  reaches comparable quality for our unattended-cloud-job use case (speed doesn't
  matter when nobody's watching it run).

### 10.3 Two real, small gaps found in current code — worth a quick fix

Checked `lib/tours/upload-constraints.ts` directly against the research: `.dng` is
already correctly rejected (good — one pass's concern was already handled). Two real
gaps remain:
1. **`.gpr`** (GoPro's RAW format) is missing from `REJECTED_RAW_EXTENSIONS` — a
   dual-fisheye GoPro RAW file could pass the aspect/MIME checks and be wrongly
   accepted as if it were equirectangular. Add it alongside `.insp`/`.insv`/`.360`/`.dng`.
2. **No server-side minimum width.** Not a clean fix: a hard 4000px floor would
   correctly catch flat/reframed/low-res exports, but would also reject legitimate
   older-generation equirect exports (Ricoh Theta S: 2048×1024; original Theta:
   3584×1792). If a width floor is added, pair it with a quality-tier warning
   ("this panorama is lower resolution than recommended") rather than an outright
   reject, or grandfather known-legacy resolutions.

### 10.4 Device compatibility table — corrections and additions

Supersedes/extends the compatibility statement in §9.13:

| Device | Format | Resolution | GPano reliable? |
|---|---|---|---|
| Insta360 X3/X4/X5 | JPEG via app/Studio (native `.insp`/DNG) | X4: 11904×5952 (72MP) or 5888×2944 (18MP) | **No — frequently stripped by Insta360's own export**, independent community fix-tools exist for this |
| Insta360 Titan | JPEG/TIFF via Stitcher | up to ~10560×5280 | Unconfirmed, assume same as X-series |
| **Insta360 "Antigravity" A1 — confirmed real, shipping** | JPEG/DNG via Antigravity app/Studio (same workflow as Insta360) | 55MP (10496×5248) or 14MP (5248×2624), 8K 360 video | Unconfirmed, assume same stripping behavior — inject server-side regardless |
| DJI Mini/Air/Mavic "Sphere" mode | **Not a single-shot 360 camera** — captures 26-35 rectilinear frames, auto-stitches in DJI Fly to one JPEG, or saves raw frames for manual stitch | varies by model | Inconsistent — verify per export, don't assume |
| **DJI Avata 360 — DJI's real native-360 drone** (dual 200° fisheye) | JPEG (auto-stitched) or DNG (2 separate fisheye files, needs stitching) | 30MP (7776×3888) or 120MP (15520×7760) | Unconfirmed |
| **DJI Osmo 360 — dedicated 360 camera (not a drone)** | Panoramic JPEG | 15520×7760 (120MP) | Unconfirmed |
| Ricoh Theta (Z1/X) | Equirect JPEG in-camera | Z1: 6720×3360; X: 11008×5504 | **Yes — best-in-class, includes full pose data** |
| GoPro Max/Max 2 | Stitched equirect JPEG (+ `.gpr` RAW dual-fisheye) | Max: 5760×2880; Max 2: 7680×3840 | **No — not reliably embedded**, community injection scripts exist |

Net: our aspect-ratio-first/GPano-confirming design (§8.5) is validated, not just for
the one metadata-stripped file already found on disk — it's the correct default
behavior for Insta360 and GoPro specifically, both mainstream devices.

### 10.5 Interactive 360 deliverables on social media — the honest picture

Researched directly (not part of the six external passes): can a tour be genuinely
interactive *inside* a LinkedIn/social feed, or does it always have to link out?

**LinkedIn, Instagram, X/Twitter: no way around linking out.** None of these
platforms execute arbitrary WebGL/iframe content inside a feed post — this is a
platform security restriction, not a gap in our implementation. A shared tour link
will always render as a static preview card (image + title + description) that the
viewer must click to open the real interactive experience. **This is exactly why
§4 P1's OG/Twitter-card work (1200×630 card from the cover/thumbnail, not a raw
equirect) already matters most** — it's the only lever we have for these platforms,
so it needs to look genuinely good, not an afterthought.

**Facebook is the one real exception, worth a feasibility check.** Facebook has
native support for uploading a photo tagged with 360-spherical metadata that renders
as a pannable, drag-to-look-around photo directly in the feed (a long-standing
Facebook Graph API capability, distinct from a regular photo post). If current Graph
API permissions still allow posting this programmatically (Meta's API access has
gotten more restrictive over time — needs verification, not assumed), a "Publish to
Facebook" deliverable option would be a genuine native-interactive social placement,
not just a link-out. Flagged as worth a feasibility spike, not committed yet.

**Bottom line for messaging to Brian/users:** don't oversell "interactive on
LinkedIn" — it isn't possible on that platform no matter what we build. Sell the OG
card quality (already planned) as the real lever everywhere except Facebook, and
treat native Facebook 360-photo publishing as a distinct, separately-scoped
possibility to verify before promising it.

### 10.6 Marketing text effects — already covered, no new work needed

The "good-looking embedded text with effects" ask is already the P5 Text Studio
scope (§4, §0.8): title cards, labels, text bands, lower-thirds, kinetic
animation, baked-to-equirect-overlay-sprite rendering, capped at ≤8 animated
layers/scene, MLS mode disables kinetic, reduced-motion forces static. No new
addendum item needed — just confirming this ask is already inside the locked plan.

---

## 11. Addendum 2026-07-07(c) — human-factors sweep + implementation

> Role-played five user personas against the actual live code (not hypothetically)
> to find real workflow dead-ends before shipping further. Findings below drove the
> fixes implemented in this same pass — this section records both.

### 11.1 Personas and findings

- **Marketing agency, Insta360 X4 owner** — shoots a business showcase. Entry screen
  (drag-drop + thumbnails) works well. **Gap found:** nothing on entry asked what
  *kind* of tour this is, so every tour got generic Build/Deliverables treatment
  regardless of intent. **Fixed:** purpose selector (§11.2).
- **GC/superintendent, phone or cheap 360 camera, project-linked weekly documentation**
  — needs plan-sheet pins. **Real bug found:** clicking a plan sheet before any scene
  finished uploading did **nothing at all** — no cursor change, no message, a silent
  dead end. **Fixed:** a hint banner now tells the author to upload in Library first
  (§11.2).
- **Drone/aerial marketing, DJI or Insta360 Antigravity** — P3 (baked nadir, tiny-
  planet intro) isn't built yet, so this persona gets generic Build-tab treatment
  today. Acceptable for now — flagged, not fixed this pass; sequencing unchanged.
- **Wayfinding, embedding on another business's site / Google** — Deliverables tab
  copy was vague ("arrives in P1") and didn't say what already works. **Fixed:**
  clearer copy distinguishing what's live (Interactive Link, which already serves
  the plan-sheet walkthrough automatically when pins exist) from what's queued
  (§11.2).
- **Mobile-first, phone capture, non-technical** — `/app/tours` import flow (project
  picker + equirect auto-detect) still works as designed; no purpose selector added
  there this pass — deferred, not a regression, since mobile tours mostly land as
  project-linked or 360-Library-inbox regardless of purpose.

### 11.2 What was implemented this pass

- **`project_tours.purpose`** column (migration `20260707120000_tour_purpose.sql`,
  applied to prod) — `marketing | aerial | wayfinding | construction`, per §9.3.
- **Purpose selector on the entry screen** (`TourImportZone.tsx`) — the first
  decision an author makes, before a single photo lands; drop-zone copy echoes the
  selection back ("start a new aerial tour") so the choice feels consequential, not
  decorative.
- **`Share` tab renamed to `Deliverables`** throughout `TourStudioWorkspace.tsx`
  (§9.1) — copy updated to name what's live (Interactive Link, auto-serves the
  plan-sheet walkthrough) vs. queued (embed, MLS export, PDF, video, package, VR).
- **Plan-tab dead-end fixed** — a visible hint banner replaces the silent no-op when
  an author tries to place a pin before any scene has finished uploading.
- **Dashboard nav re-verified** — `resolveDashboardNav` is the single source of
  truth for both the sidebar and (indirectly, via `twinVisible`) the top
  AppSwitcher; no duplicate/orphaned nav list found. The earlier "incorrect tabs"
  report (2026-07-06/07 conversation) was fully resolved by the Twin 360 naming fix
  already shipped — nothing further to fix here.

### 11.3 Deferred, not forgotten

P3 aerial nadir/tiny-planet treatment, the embed builder, MLS-compliant export
toggle, native lead-capture hotspot type, video flythrough export, and the mobile
purpose selector all remain queued per the phase order in §4/§9/§10 — none of this
addendum changes that sequencing, it only fixes what was broken in the slices
already shipped.
