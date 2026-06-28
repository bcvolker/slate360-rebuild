# Slate360 — Platform split, deliverables, and ghost/progression (synthesized)

Synthesis of an 8-model best-practices panel (Jun 27 2026) + repo audit. Companion to
`docs/TWIN360_CAPTURE_GAPS.md` and the unified-capture harness `/preview/capture-shell`.

## Platform split (locked)

- **Mobile apps (iOS/Capacitor) = LIGHT capture + light review.** Capture screens (Site
  Walk + Twin 360), stop data entry, ghost mode, plan walks, save/submit. No heavy
  authoring. Keep field-fast and offline-first.
- **Desktop web (login) = the workbench.** Project management, plan/asset management,
  collaborators, and **deliverable authoring** — including advanced/complex deliverables
  (multi-walk reports, progression series, plan-pin tours, branded packages). This is where
  the rich composition happens; the apps feed it.
- **Stakeholder share = read-only consumption.** Token-gated `/view/[token]` (+ PDF/print).
  Recipients (owners/GCs) never log in.

## Interactive deliverable — best-practice structure (target)

Cover (project · date · sender · "frozen as of" snapshot · expiry)
→ Plan overview (optional, Pro): plan pages, clickable pins → open the stop  [DEL-002]
→ Stop timeline (chronological, grouped by area/walk)
→ Per stop: photo | **navigable 360** | **voice (play + transcript)** | note | metadata
→ Comparisons: dated **before/after** (slider when aligned, side-by-side when not) +
   **progression series** (timeline scrubber)  [SW-002/003, DEL-003]
→ Comments (per stop)
→ Download PDF (print/evidentiary fallback) · offline self-contained export  [DEL-004/-006]

**Viewer tech:** Photo Sphere Viewer (`TourPanoViewer`, already used) for 360; Leaflet image
overlay for plan pages (reuse capture stack); native `<audio>` for voice; before/after slider
(react-compare-slider pattern) only on aligned pairs.

**Evidentiary (panel-stressed):** burn **visible** timestamp + GPS + heading + author into
images for PDF/export (EXIF-only gets stripped by email/Teams and fails FRE 901); preserve
originals immutably; label comparisons with dates not bare "Before/After"; surface the share
**snapshot** ("Frozen as of …"); audit log opened/viewed/commented. Treat **AI-formatted notes
as a liability** in claims — preserve the raw note alongside, and disclose AI assistance.

**Field UX (panel-stressed):** ≥56–72px touch targets (gloves); a **high-contrast/sunlight
mode** (the dark Graphite Glass can vanish in direct sun); voice-memo **noise warning** >~80 dB
with text fallback + transcription confidence score; clamp web video to 1080p/30.

## Ghost / progression — locked approach

- **Matching = sensor-first retrieve, optional visual confirm.** Plan-pin is the precise key
  (hard gate); GPS is a soft boost only when `accuracy_m` < ~10 m; heading/tilt rank within
  the pin/position cohort. Realistic precision: plan-pin ±0.5–3 m (world), GPS 3–8 m outdoor /
  unusable indoor. **Never claim GPS precision at 5 ft** — SW-006 widens by accuracy and shows
  a "GPS weak" banner (shipped in `useGhostProgression`).
- **Default vicinity = 5 ft** (most precise), user-selectable (Pin / 5 / 15 / 30 ft).
- **Auto-cluster progression series:** spatial DBSCAN/HDBSCAN (haversine, eps≈8–12 m) →
  heading sub-cluster (±~25–30°) → sort by time; optional CLIP/visual merge for ambiguous.
  Keep singletons. Always allow manual merge/split. Plan walks cluster by (plan_sheet_id, pin
  cell ~2.5% of sheet) instead of GPS.
- **Before/after presentation:** slider only when aligned; **side-by-side for misaligned**
  (most field pairs). Show date + confidence; cross-fade for timelapse; histogram-normalize
  for lighting only as an optional toggle; never AI-recolor (claims risk).

## Recommended build order (panel consensus)

1. **DEL-001** 360 in share viewer — **DONE** (`PublicItemStage` renders `TourPanoViewer`; arrow-keys suppressed).
2. **SW-006** ghost vicinity 5 ft default + accuracy widening — **core DONE** (`useGhostProgression`); radius-pills UI + weak-GPS banner in `CaptureCanvasGhostPanel` pending.
3. **SW-004** live compass/heading delta HUD in ghost (cheap capture-side win).
4. **DEL-002** plan pages + clickable pins in the share/deliverable (extends Photo Sphere Viewer markers/virtual-tour).
5. **SW-002/003** before/after slider + progression timeline (in-app + deliverable).
6. **DEL-004/005/006** Word export, Coordination Hub batch send + distribution lists, offline self-contained export.
7. **TWIN-001…004** native pipeline P0 — **parallel TestFlight track**, separate PRs.

## New items surfaced by the panel (added to backlog)

- DEL-006 offline self-contained deliverable (static HTML+assets ZIP, runs in-browser, outlives subscription).
- DEL-007 distribution lists / multi-recipient batch send (today: one per send).
- SW-011 visible burned-in metadata stamp on export images (evidentiary).
- SW-012 sunlight/high-contrast mode + glove-sized targets audit.
- SW-013 voice-memo noise warning + transcription confidence; text fallback.
- SW-014 raw-note preservation + AI-format disclosure (legal).
- WORKFLOW-001 offline-first capture (Capacitor Filesystem spill) + multi-user pin conflict resolution.
- WORKFLOW-002 photo→action (observation/punch) fast-path + Procore outbound sync.
