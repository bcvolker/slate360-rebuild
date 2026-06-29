# Twin 360 Capture — Gaps & Tracked Tasks (pre-TestFlight)

Source: code research (this repo) + an 8-model best-practices panel (Jun 27 2026).
Companion to `docs/TWIN_NATIVE_CAPTURE_PLAN.md` and `docs/TWIN360_MASTER_BUILD_PLAN.md`.
Design reference: `/preview/capture-shell` harness.

## Headline architectural decision (panel consensus)

**"Multi-clip" should mean multiple recording SEGMENTS inside ONE continuous
`ARSession`, NOT separate AR sessions.** If the `ARSession` is kept alive between
"clips" (only the `AVAssetWriter` roll stops/starts), every segment shares one world
coordinate frame, so the LiDAR point clouds and camera poses already align — the
hardest registration problem mostly disappears. Independent AR sessions per clip is
the #1 multi-clip failure mode. Treat the user-facing word "clip" as a chapter marker.

Fallbacks, in order, only when a single session is impossible (app paused / killed):
1. `ARWorldMap` save + relocalize into the next session (gate recording on
   `trackingState == .normal`; provide a reset escape hatch).
2. Cloud-side registration: single COLMAP/GLOMAP solve over all clips' frames as the
   source of truth, with per-clip LiDAR aligned via FGR/RANSAC → ICP → pose-graph.

**Critical context:** iOS 26.4+ has an Apple-acknowledged LiDAR VIO drift regression
in `ARCamera.transform` during walking. Treat ARKit poses as *priors*, never ground
truth; let the COLMAP/GLOMAP solve be authoritative for geometry.

## Tasks

| ID | Task | Priority | TestFlight blocker |
|----|------|----------|--------------------|
| TWIN-001 | Single-`ARSession` segment model: keep session alive across "clips"; roll `AVAssetWriter` per segment with one shared session clock + poses stream. Tag each segment `{captureSessionId, arSessionId, segmentIndex, t_start, t_end}`. | P0 | Yes — fixes multi-clip alignment at the root |
| TWIN-002 | Multi-clip LiDAR dispatch: replace `.find()` with `.filter()` in `src/trigger/twin-gaussian-splat.ts`; pass ALL `ply_lidar` + `lidar_poses`. Worker merges only when same `arSessionId`/known transform; else single-best or registration fallback. Log `lidar_merge_mode`. | P0 | Yes — today multi-clip LiDAR is silently discarded |
| TWIN-003 | Clip cap + auto-stop in `useTwinCaptureSession.ts`: target 90s, soft warn ~75% (~68s), hard auto-finalize+upload at 120s. Never discard at cap — finalize segment, keep session alive. | P0 | Yes — thermal/drift/crash/cost |
| TWIN-004 | Thermal/battery governor: subscribe to `thermalState` + `systemPressureState`. At `.serious` drop fps first (→24), suggest finishing; at `.critical` finalize + cool-down prompt. Disable unused ARKit features (planeDetection, sceneReconstruction). | P0 | Yes — sustained capture trips serious in minutes |
| TWIN-005 | Ghost mode v2: auto-on clip 2+, last *sharp* keyframe at ~40–50% opacity, 10s countdown + auto-hide, tap +10s extend, opacity ±, Stop. Trigger relocalization underneath; gate recording on `.normal`. (Harness: `/preview/capture-shell` → Twin "newclip".) | P1 | No — improves overlap reliability |
| TWIN-006 | Pre-COLMAP frame-quality pass in worker: Laplacian-variance blur cull (bottom ~20% per window) + exposure outliers + near-duplicate prune (pHash/pose-delta). Move toward adaptive sampling (extract dense → select), target ~300–500 frames/area. | P1 | No — quality + cost win |
| TWIN-007 | Web timed-photo storage: spill blobs to Capacitor Filesystem (app sandbox) instead of JS heap; keep only metadata/thumbnails in memory. Preserve no-camera-roll behavior. | P2 | Web only |
| TWIN-008 | Splatfacto seed verification: log `ply_seed_requested/loaded/point_count`, `training_init_mode`, `ply_seed_error`. Don't cut iterations just because a PLY exists — verify it loaded. | P2 | No |
| TWIN-009 | Loop-closure pose export: read FINAL anchor transforms at export (ARKit retro-corrects the world frame after capture); current path may freeze poses at capture time. | P1 | Verify against `TWIN_NATIVE_CAPTURE_PLAN.md` |

## Settling open product values (panel-backed defaults)

- **Clip length:** 60–90s sweet spot, 120s soft cap, 180s hard auto-stop. (Replaces the
  current 480s safety guard as the *quality* target; keep 480s only as a crash backstop.)
- **Clip-to-clip overlap:** 30–50% spatial (re-scan the last doorway/corner ~10–20s);
  hard floor ~20% before registration fails.
- **Walk speed:** ~0.1 m/s, smooth; lock AE/WB/focus before recording; HDR off; landscape.
- **Frame extraction:** keep 2 fps baseline → add blur/exposure/dup culling → adaptive.
- **Storage:** confirmed app-private (no camera roll), temp files cleaned post-upload.
  Move native PLY/poses from `NSTemporaryDirectory()` to Application Support for
  crash-safety; `@autoreleasepool` per frame; never retain `ARFrame` buffers.

## Site Walk — ghost mode / metadata gaps (found Jun 27)

Mostly already built. Confirmed EXISTS: per-stop GPS (lat/lng), `accuracy_m`, `altitude_m`,
**compass `heading_deg`**, `captured_at`, `location_label`, device info, optional weather
(`lib/site-walk/metadata.ts`). Ghost picker (`CaptureCanvasGhostPicker` — scrollable nearby
photos w/ distance+date+author via `/api/site-walk/nearby`), Fade/opacity slider
(`CaptureCanvasGhostPanel`, 0.1–0.6), and auto-linking `before_item_id` +
`item_relationship='after'` on ghost-select all EXIST.

| ID | Task | Priority | Status |
|----|------|----------|--------|
| SW-001 | Capture **device orientation** (alpha/beta/gamma + iOS `webkitCompassHeading`) into stop metadata for ghost angle alignment. | P1 | **DONE** (Jun 27) — `lib/site-walk/device-orientation.ts` tracker (gesture permission + always-latest snapshot), added `orientation` to `CaptureMetadata`, started on canvas mount + iOS permission on ghost tap (`useNoPlansCaptureCanvas.ts`). Typecheck clean. |
| SW-001b | **Ghost = project-only** (no quick/ad-hoc walks) so the pool spans every walk in the project. | P1 | **DONE** (Jun 27) — `ghostAvailable = Boolean(session.project_id)` (removed single-shot fallback). RPC `get_nearby_photos` already pools project-wide across sessions. |
| SW-002 | **Before/after compare viewer** (slider + side-by-side) — schema + auto-linking exist; viewer UI does not. Harness mock: ProgressionScreen. | P1 | Design done; build pending |
| SW-003 | **Progression timeline UI** (same spot over weeks/months/years, grouped by date) + auto-set `item_relationship='progress'` on repeat captures. APIs `/items/timeline` + `/projects/[id]/progressions` exist (group by location, not date); UI + date-grouping + auto-set pending. | P1 | Design done; build pending |
| SW-004 | Surface orientation in the ghost picker as an **angle-match hint** (rotate N° / level) using `metadata.orientation` vs the reference's. | P2 | **DONE** — `GhostPhoto.heading` from `metadata.orientation.compass_heading` (nearby returns full row, no API change); `CaptureCanvasGhostPicker` polls live compass and shows "Rotate N° left/right to match" → "Aligned — shoot now" (≤8°). Confirm/Clear footer shipped (commit 6e6400a1). |
| SW-005 | Optional: EXIF / focal length / FOV capture. | P3 | Not started |

## Walks-with-plans — verified + gaps (Jun 27)

EXISTS & wired: prev/next sheet nav + sheet picker with name/number search
(`CapturePlanBottomRail`, `CapturePlanSheetPickerSheet`); multiple plan sets per project;
**clean vs annotated layer toggle** (`usePlanViewer` `showCleanSet`/`showMarkedUp` — hides
all pins so hundreds don't clutter); pinch-zoom + pan + fit-to-bounds (`usePlanGestures`,
Leaflet); 500ms long-press → drop pin → source picker; **360 attach to pins + inline
viewer** (Photo Sphere Viewer); **Pro-tier gating** (`canWalkWithPlans`, `can360OnPlans` =
`site_walk === "pro"`).

| ID | Task | Priority | Status |
|----|------|----------|--------|
| SW-006 | Ghost **user-selectable vicinity** (Pin / 5 / 15 / 30 ft, default 5 ft) + **accuracy-aware widening** + "GPS weak" honesty. | P1 | **Core DONE** — `useGhostProgression` defaults 5 ft, widens query to ~2.5× `accuracy_m` (capped 120 m), exposes `weakGps` + `effectiveRadiusFt`; reloads on radius change. **DONE** — radius pills (5/15/30 ft) + weak-GPS banner threaded into `CaptureCanvasGhostPanel` via `useNoPlansCaptureCanvas` (commit 4cc3846b). |
| SW-007 | **Stakeholder 360-on-plan viewer** — share viewer where stakeholders click pins across plan pages → 360 opens. Inline pro-user viewer exists; the public/share plan-pin-tap flow is MISSING. | P1 | Harness mocked; build pending |
| SW-008 | Always-visible **horizontal page strip** + **expandable stops/pins timeline** during a plan walk (sheet picker modal exists; the persistent strip/timeline do not). | P2 | Harness mocked; build pending |
| SW-009 | **Plan keyword search** beyond sheet name/number (item/RTU/OCR). Sheet-name search exists; content search MISSING. | P2 | Harness mocked; build pending |
| SW-010 | "Duplicate as clean master" as a first-class action (layer toggle exists; one-tap clean-master copy does not). | P3 | Not started |

## Deliverables — before/after + progression + interactive share (Jun 27)

The deliverable is where before/after + progression live for the recipient. Research:

EXISTS & wired: **PDF export** (`lib/site-walk/pdf/*`, `@react-pdf/renderer`) with photos,
notes, voice-memo transcripts, metadata, branding; **interactive share link** `/view/[token]`
(stops, photos, notes, **voice-memo playback** via HTML5 audio, metadata, comments, prev/next,
expiry/view-limits); **before/after deck** (`lib/site-walk/before-after.ts`, cross-walk pairs as
sequential slides); **email/SMS distribution** (link / inline photos / PDF attachment) + audit log.

| ID | Task | Priority | Status |
|----|------|----------|--------|
| DEL-001 | **360 navigation in the share/deliverable viewer** — recipient pans/zooms attached 360s. | P1 | **DONE** — `PublicItemStage.tsx` renders `TourPanoViewer` (Photo Sphere Viewer, dynamic ssr:false) for `photo_360`; `ViewerClient.tsx` suppresses arrow-key slide-nav while a 360 is active; thumbnail strip handles `photo_360`. |
| DEL-002 | **Plan pages + clickable pins in the share/deliverable** — recipient clicks through plan sheets, taps pins to see attachments/360. Plans aren't in deliverables at all today. | P1 | MISSING — harness mocked |
| DEL-003 | **Before/after side-by-side slider** in the public viewer (today: sequential slides only). Progression timeline in deliverable too. | P2 | PARTIAL (deck exists) |
| DEL-004 | **Word/DOCX export** (today: PDF only). | P3 | MISSING |
| DEL-005 | Coordination Hub multi-stakeholder distribution + batch send (today: one recipient/send; hub is layout-only). | P3 | PARTIAL |

## Twin clip review — NO trim (decision, Jun 27)

Clip **trimming was removed** from the design. Multi-clip overlap is the whole point of the
single-ARSession segment model — trimming a clip's head/tail destroys the overlap the COLMAP/
LiDAR solve needs to register segments. Clip review keeps **reorder + remove** only (drop a bad
clip), never trim. (Harness: TwinClipReviewScreen.)

## Implementation audit (Jun 27) — deliverables / offline / evidentiary

Grounded code audit (separates DOCUMENTED specs from IMPLEMENTED code):

- **Report/deliverable editor = WIREFRAME-ONLY.** `ReportBuilderClient` is a static mock — no
  drag-drop, no block CRUD wired, no save API, no template system. BUT the **block model is a
  single source of truth** shared by web viewer + PDF export (good foundation), and
  `lib/site-walk/quick-deliverables.ts` has server-side one-tap generators (punch/photo-log/
  slideshow). Specs exist: `docs/specs/REPORT_EDITOR.md`, `docs/REPORT_BLOCK_SCHEMA.md`,
  `docs/audit/DELIVERABLES_SYSTEM_AUDIT.md`.
- **PDF export = WIRED** but **images render as placeholders** (no presigned blob fetch);
  **no GPS/timestamp/author burn-in**. **Word/DOCX + offline ZIP = MISSING.**
- **Offline = WIRED but partial** — `idb-keyval` queue + Filesystem blobs + idempotency
  (`client_item_id`/`client_mutation_id` unique, migration 20260427092000) + offline mutations
  ledger. **Single presigned PUT, NOT multipart-resumable** (`@aws-sdk/lib-storage` present but
  unwired). **Conflict-surface UI missing.**
- **Conflict model = LAST-WRITE-WINS** (items PATCH unconditional; `markup_revision` column
  exists but no If-Match enforcement). Panel consensus: move shared pins/stops to **append-only
  event model** (also gives chain of custody).
- **Evidentiary:** SHA-256 content hash on items = **MISSING**; raw-note vs AI-formatted dual
  storage = **MISSING**; audit log (`site_walk_activity_log`, append-only) = **WIRED** but
  status-transition-level only.

| ID | Task | Priority | Status |
|----|------|----------|--------|
| REPORT-001 | **Desktop report editor** — Projects→Deliverables→Edit. **Phase 1/2A/2B DONE** (route + PATCH save, curates real `ViewerItem[]`, source library + Add-all). **Phase 2C DONE** ("Blank report — build it yourself" creates an empty report and opens the editor). **Phase 3a DONE** (source filters All/Photos/360/Voice/Notes + search + filter-aware Add-all + card metadata). **Pending:** templates, true drag-reorder, before/after source filter. | P0 (desktop) | Phase 3a shipped |
| REPORT-003 | **PDF presentation** — capture metadata (date/GPS) is **OPTIONAL, OFF by default** (editor "Date / GPS on PDF" toggle → `export_config.show_metadata`); **side-by-side** layout (image left, info right, 2-3 stops/page); **org branding logo** in header. | P0 | **DONE** (commit 89e29242) |
| REPORT-004 | **Cinematic viewer** — EVOLVE `app/view/[token]/ViewerClient.tsx` (NOT the old `DeliverableSlideshow`). LOCKED spec: docs/design/CINEMATIC_DELIVERABLE_VIEWER.md (multi-AI synthesis). **Slice 1 DONE**: info rail flipped LEFT (desktop), crossfade fade-in per stop, ±1 media preload, active-thumb auto-scroll-to-center. **Remaining:** Q&A collapsed chip→drawer/sheet, in-place 360/video immersive overlay (fade-to-black), `--deliverable-accent` brand tokens + trust line, timeline virtualization, deep-link `?stop=N`. | P1 | Slice 1 shipped |
| REPORT-005 | **Notify owner on per-item comments** — Brian wants a notification on ANY question/response. **DONE** — extracted `notifyOwner` → shared `lib/site-walk/notify-deliverable-owner.ts` (`notifyDeliverableOwner`, kind question/comment); the per-item `viewer_comments` POST (`/api/view/[token]/comments`) now notifies the owner (in-app `project_notifications` + email), and the whole-deliverable Q&A route reuses the same helper (de-duped). | P1 | DONE |
| REPORT-002 | PDF export now **embeds real images** (S3 fetch → base64 → `addImage`, aspect-correct, page-break aware) + **timestamp/GPS burn-in** + renders `note`/`voice`/photo content (was: rendered nothing for real `ViewerItem[]` deliverables). **DONE.** Author-name burn-in (needs user join) pending. | P1 | DONE (author name pending) |
| WORKFLOW-001 | Offline **multipart resumable upload** orchestrator (TUS or S3 multipart) + **conflict-surface UI**. | P1 | PARTIAL |
| SW-011 | **SHA-256 content hash + chain-of-custody** (evidentiary). **Capture hash DONE** (`content-hash.ts` → `content_sha256` in item metadata). **Audit log DONE (code)** — additive migration `supabase/migrations/20260628120000_evidence_and_sync_foundation.sql` (`evidence_events` append-only + hash-chain, HLC/integrity columns on `site_walk_items`, `entity_tombstones`); `lib/site-walk/evidence-events.ts` `recordEvidenceEvent()` (non-fatal, hash-chained) emits **`captured`** on item create. Migration **APPLIED on prod** (Jun 28). **Server re-verify DONE** — `POST /api/site-walk/items/[id]/verify-hash` refetches the S3 object, recomputes SHA-256, compares to the capture hash, writes `server_sha256`/`hash_verified_at`, and emits `hash_verified`/`hash_mismatch`. **TODO:** trigger verify automatically post-upload (client-after-upload or background sweep); emit uploaded/included/shared/viewed events. | P1 | Capture hash + audit log + server re-verify shipped |
| SW-014 | **Raw-note vs AI-formatted dual storage** + provenance (evidentiary). **DONE** — `/api/site-walk/notes/format` returns `provenance` (model/provider/formatted_at/policy `format_only_no_new_facts`); `useCaptureItems.formatNotesWithAi` preserves the **verbatim raw note** + provenance onto `item.metadata` (`note_raw`/`ai_formatted`/`ai_provenance`) before the AI version overwrites the field — raw is never lost. **TODO:** deliverable AI-disclosure badge + "view original" link. | P1 | Dual-storage shipped |
| CONFLICT-001 | Move shared pin/stop edits to **append-only events** (or field-level merge + If-Match), replacing whole-record LWW. | P2 | LWW today |
| DEL-004 | Word/DOCX export from the block model. | P3 | MISSING |
| DEL-006 | Offline self-contained ZIP deliverable. | P3 | MISSING |

## Verified-already (no action)

- No camera-roll writes on native or web (no `PHPhotoLibrary`/`saveToGallery`).
- Multi-clip VIDEO already passed as `sourceKeys[]` array.
- Token + time calculator auto-updates from assets/quality/format.
- LiDAR pipeline end-to-end exists: native capture (device-gated) → Trigger → Modal
  worker (`workers/modal/twin-gaussian-splat/worker.py`) → SPZ model → web splat
  viewer + token-gated share links (`?embed=1` device) + downloadable export. Operational
  dependency: Modal worker must stay deployed (`MODAL_TWIN_ENDPOINT`).
