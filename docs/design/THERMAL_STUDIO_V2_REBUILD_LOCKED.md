# Thermal Studio V2 — Complete UI/Workflow Rebuild (LOCKED)

> **Status:** LOCKED design, reconciled from a multi-AI panel (Gemini-class NLE/IDE framing,
> Grok-class pipeline spec ×2) + Brian's corrections on 2026-06-21.
> **Ground rule: NOTHING in the current thermal UI is reused.** The backend (APIs, jobs,
> tables, Modal workers) is strong and stays exactly as-is. Every screen is rebuilt fresh
> under `components/thermal-studio-v2/**` and swapped in when a slice is verified.
> The old `components/ops/thermal/**` components are treated as reference-only slop and
> deleted at the end (Slice 9).

---

## 0. Non-negotiable product rules (apply to every slice)

1. **Everything the user does is visible, editable, movable, and deletable.**
   - Every measurement (point/area/line) can be **selected → dragged → resized → deleted**
     (✕ on the object, ✕ in the list, `Delete` key) and **undone/redone** (Ctrl+Z / Ctrl+Shift+Z,
     plus visible ↶ ↷ buttons). No orphan objects, no one-way actions.
   - Every **batch action shows a preview + a "Keep / Undo" confirmation** (toast with the two
     buttons, 10s timeout to Keep). Applying a tune to 50 images must be reversible in one click.
   - AI findings are **proposals**: each is Accept / Edit / Dismiss — never auto-committed.
2. **Plain language everywhere.** Every control = icon + short verb label + one-line tooltip
   saying what it does ("Point — click the image to read one pixel's temperature").
   No abbreviations (no "CSV" alone → "Spreadsheet (.csv)"), no jargon-only labels,
   no unexplained numbers. A control that can't be explained in one sentence is redesigned.
3. **One global Scope control** in the top bar: `[ This image | Selected (N) | All (N) ]`.
   Every action button states its scope in its own label ("Decode 12 selected").
   Scope persists across tabs. NO per-panel duplicate scope pickers.
4. **No dashboard scroll, no dead space.** The shell is `100dvh` overflow-hidden;
   only inner lists scroll (contained). Panels are resizable (`react-resizable-panels`) and
   collapse to thin labeled rails — never to invisible. If a panel has < 3 items, it does not
   get a full column; it becomes a section of a neighbor. Audit each slice: no region taller
   than 120px may be empty in the default state.
5. **No duplicate buttons, no dead buttons.** Every action exists in exactly ONE place
   (plus optional keyboard shortcut). Any button that can't work right now is disabled
   with a tooltip that says *why* and *how to enable it* — or it isn't rendered.
6. **Design system:** Graphite Glass tokens only (`--graphite-*`, `--mobile-app-card-border`),
   IBM Plex Mono uppercase eyebrows, no amber/orange, accent only on interactive state.
   Shell identical in feel to Content/Design Studio (thin top bar + resizable panels).

## 1. Tab structure — FIVE tabs (Motion tab removed)

`Library → Analyze → AI Review → Report → Deliver`

- **Motion is NOT a tab.** Time-lapse/video is a *deliverable*, so it lives in
  **Deliver → "Time-lapse & video"** section (same engine/controls as built: aspect, speed,
  smoothing, deflicker, overlay clean/keep/animate). Lesser-used ≠ front-and-center.
- Tabs are a **workflow**, left→right; each tab's primary CTA hands to the next
  ("Analyze 12 selected →", "Review AI findings →", "Add to report →", "Deliver →").

### Tab 1 — Library (bring in + triage + kick off)
| Zone | Contents |
|---|---|
| Left (collapsible) | SlateDrop folder tree (project→folder→expand) + drag-drop upload zone + filters (Flagged / In report / High ΔT / camera) |
| Center (hero) | Virtualized thumbnail grid; marquee + shift-click + Select all; thumbnail badges: paired-visual dot, finding count, processed ✓ |
| Right (collapsible) | ONE "Next steps" panel, verb-first, scope-labeled: **Decode temperatures (N)** → **Find problems with AI (N)** → **Add N to report ★** — each with a one-line what-it-does; below: session facts (images, cameras, date range). NO report-set explainer paragraphs, NO duplicate process panel. |
- Batch tune and pairing move OUT of Library (tune → Analyze; auto-pair runs automatically
  after decode, surfaced as a passive "N thermal+visual pairs linked" fact, not a button).

### Tab 2 — Analyze (the heart: measure + tune, single or batch)
| Zone | Contents |
|---|---|
| Left (collapsible) | Working-set list (toggle: filmstrip ↔ folder tree) w/ per-image badges |
| Center (hero) | Large viewer: zoom/pan, hover temp readout at cursor, color-scale legend w/ **draggable span handles**, **floating draggable/collapsible/resizable loupe** (grab title bar to move, − to collapse to a pill, ⤢ to resize), thermal↔visual **blend slider** on paired images, synced side-by-side compare |
| Toolbar (top of viewer, one row) | Tool segmented control with labels: **Point · Area · Line · Move/Select** — Move/Select is the default arrow tool that selects existing measurements for drag/resize/delete; palette dropdown (named swatches); °C/°F; Undo ↶ Redo ↷ |
| Right (accordions, Measurements OPEN first) | **Measurements** (each row: badge #, type word, temp, Δ vs reference, ✎ rename, ✕ delete; "set reference" star; group stats avg/spread; "Copy table") · **Tuning** (emissivity + material preset picker, reflected, distance, humidity, atmospheric — each a labeled slider+number; "Reset to camera values"; **"Apply to…" respects global Scope with Keep/Undo**) · **Display** (span, isotherm, histogram) · **Notes & photo data** (findings note, camera/sensor/resolution, map) |
| Bottom dock (resizable, collapsible) | Filmstrip carousel: click = open, ✓ corner = select, badges; ←/→ keys navigate |
- **Measurement lifecycle (explicit):** create with a tool → object appears on image AND in
  the list simultaneously → arrow-select to drag/resize (handles) → ✕ or Delete to remove →
  Ctrl+Z at any point. Camera-baked marks import as removable objects labeled "from camera."

### Tab 3 — AI Review (AI proposes, the operator decides)
| Zone | Contents |
|---|---|
| Left | Images with detections (severity-sorted), filter by type/severity |
| Center (hero) | Viewer with numbered outline boxes matching the right-hand list; click either to highlight both |
| Right | Finding cards: type in words ("Hot spot — possible loose connection"), severity chip, peak + ΔT, **AI-drafted note in an editable textarea**, buttons **Accept ✓ / Edit ✎ / Dismiss ✕**; bulk: "Accept all severe"; "Run AI on N images" CTA when scope has unprocessed images |
| Bottom dock | Carousel with detection-count badges |
- Accepted findings attach to the image and flow into Report; dismissed ones keep an
  "restore" affordance under a "Dismissed (N)" collapsed group (nothing is unrecoverable).

### Tab 4 — Report (see the deliverable being built)
| Zone | Contents |
|---|---|
| Left | Report outline: ordered image list (DRAG to reorder — real drag, not arrows), section toggles (cover, summary, methodology, severity, disclaimer, signature) |
| Center (hero) | **WYSIWYG paginated preview** — white paper sheets exactly matching the PDF: image featured + full metadata beside (measurements, camera/sensor/resolution, emissivity/reflected/distance/humidity, conditions, time, weather, lat/lon) + findings below; **2 images per page** (template can switch 1/2/4) |
| Right | Template gallery (visual thumbnails), branding (logo upload, company, footer, °C/°F), site conditions, signature, **Generate PDF** + history |
- Empty state previews ALL images with a banner: "Showing all N images — drag into the
  outline or ★ in Library to curate."

### Tab 5 — Deliver (send it)
Left section nav (words, not icons alone): **Share link · Report downloads · Data exports ·
Time-lapse & video · Site map (twin) · Q&A inbox**. Center = the active surface.
- Share link: live preview of what the client sees + create/revoke + password/expiry.
- Data exports: "Spreadsheet (.csv) · Raw data (.json) · Map data (.geojson)" with purpose lines.
- Time-lapse & video: the existing Motion engine (source select → timeline → aspect/speed/
  smoothing/deflicker/overlay → Render MP4) as a section, not a tab.
- Site map: Leaflet GPS pins (severity colored) + thermal layer toggle + twin link/align.
- Q&A: client questions with inline replies (feeds Ops Console).

## 2. Build plan — slices for Sonnet 5 (each: build → scoped tsc → preview-verify → push)

Rebuild in `components/thermal-studio-v2/**` + `app/(dashboard)/thermal-studio/**` swap.
Backend untouched. Preview harness `/preview/thermal-v2` built FIRST and kept faithful.

- **S1 — Shell + scope + harness.** `ThermalV2Shell` (thin bar: title/session · 5 tabs ·
  global Scope pill · status chips · job pill), resizable-panel frame primitives
  (reuse `StudioPanels` handle), `/preview/thermal-v2` harness with fixture data.
  *Accept: 5 tabs render empty frames, no scroll at 1280×800 and 1440×900.*
- **S2 — Library.** Tree+dropzone+filters / virtualized grid / "Next steps" rail;
  upload + SlateDrop import + decode dispatch wired to existing APIs.
  *Accept: import→grid→Decode(N)→job chip live; zero duplicate actions.*
- **S3 — Analyze viewer core.** Canvas render, zoom/pan, hover readout, legend with drag
  handles, floating loupe (drag/collapse/resize), filmstrip dock.
- **S4 — Measurements + edit lifecycle.** Point/Area/Line + **Move/Select arrow tool**,
  drag/resize/delete on-canvas + in-list, reference Δ, undo/redo stack, autosave.
  *Accept: create→drag→resize→delete→undo each verified in harness.*
- **S5 — Tuning + Display + batch with Keep/Undo.** Sliders w/ material presets, span/
  isotherm/histogram, scope-aware apply with preview toast + revert.
- **S6 — AI Review.** Detection overlays ↔ finding cards, Accept/Edit/Dismiss(+restore),
  AI-draft notes, bulk ops, run-AI dispatch.
- **S7 — Report.** Outline drag-reorder, WYSIWYG 2-up preview (port + polish the faithful
  renderer), template gallery, branding, generate + history.
- **S8 — Deliver.** Section nav + share/exports/motion-section/map/Q&A (port Motion engine
  from the old tab into the section; delete the Motion tab concept).
- **S9 — Swap + delete.** Route the real pages to V2, delete `components/ops/thermal/**`
  screens (keep `lib/thermal/**` logic), update memories/docs, full-tab no-scroll +
  dead-button audit at 3 viewport sizes.

Per-slice gates: scoped tsconfig typecheck (never bare tsc), guard:design, guard:architecture,
preview_eval measurements (page scroll = 0, panel/handle counts, feature presence),
commit small, push after verify (parallel-chat safe: never touch `src/trigger/**`,
`components/content-studio/**`, `components/design-studio/**`).

## 3. Standalone thermal app (separate sellable product, NOT Slate360)

**Positioning:** a general-purpose thermal analysis app for anyone with a thermal camera —
inspectors, electricians, home inspectors, hobbyists. Own name/brand/repo/bundle-id
(new Capacitor project, e.g. `C:\thermal-app\`), own Supabase project or local-first,
**no Slate360 branding, projects, or SlateDrop**.

**Sensor support (import-first, no camera SDKs in v1):** parse radiometric files from the
most common ecosystems — FLIR R-JPEG (incl. Cx/One/E-series), DJI (M3T/M30T H20T R-JPEG),
HIKMICRO, Autel EVO 640T, Topdon/InfiRay/UNI-T/Hti (R-JPEG variants), plus plain images
(no radiometrics → display-only mode with honest labeling). The existing `extract.py`
parser already covers several; factor it into a shared decode service both products call.
Live-camera SDKs (FLIR One, Topdon USB-C) are a v2 track.

**App structure (5 bottom tabs, streamlined):**
1. **Files** — folders on-device + import (Files app, Photos, USB drive); drag-select many.
2. **View** — swipe carousel; tap = spot temp; pinch zoom; long-press loupe; palette/span/
   emissivity essentials; add point/area/line with the same edit/delete/undo rules.
3. **Detect** — one-tap cloud AI (metered) with Accept/Edit/Dismiss.
4. **Report** — pick images → 2-up PDF with logo/company (their own branding) → share sheet.
5. **Settings** — account, subscription, units, privacy.

**Monetization / App Store compliance:**
- Free tier: view + measure + 3 report exports/month. **Pro subscription via Apple IAP**
  (StoreKit through Capacitor plugin — NEVER an external purchase link): unlimited reports,
  AI detection credits, batch tools, cloud sync.
- Review checklist: works fully offline for core viewing (no login wall for free features),
  Sign in with Apple if any social login, in-app **account deletion**, privacy policy +
  App Privacy labels (location/photos usage strings), no "coming soon" surfaces, no
  references to external payment, all third-party sensor names used descriptively
  ("supports FLIR® R-JPEG files") not as branding.
- Cloud costs metered by credits inside the IAP subscription; heavy work (AI, PDF) reuses
  the same Modal workers behind a separate API key/tenant.

**Build order (after desktop V2 stabilizes):** A1 scaffold app + file import + viewer ·
A2 measurements/palettes/tuning essentials · A3 decode service multi-sensor hardening ·
A4 reports + IAP · A5 AI credits · A6 store assets + TestFlight → review.

## 4. Panel ideas adopted / rejected

**Adopted:** global Scope pill (Gemini) · NLE/IDE shell framing · accordions with
Measurements first · thermal/visual blend + synced compare · keyboard shortcuts
([ ] navigate, A accept, D dismiss, 1-9 palettes, Delete removes selection) ·
material/emissivity preset library · Accept/Edit/Dismiss finding cards · virtualized grid ·
report outline with real drag · Deliver as delivery hub with Q&A.
**Rejected:** Motion as a standalone tab (→ Deliver section) · duplicate per-panel scope
selectors · versioning/peer-review/asset-routes/cost-estimates (v3 backlog, not V1) ·
severity-colored orange badges (amber ban — use red/sky/neutral chips only).
