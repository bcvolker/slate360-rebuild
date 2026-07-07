# Thermal Studio V2 — Complete UI/Workflow Rebuild (LOCKED)

> **2026-07-06 addendum:** Brian approved a V2.1 enhancement pass (FLIR-parity teardown +
> human-factors review). New slices S5.5/S5.6/S6.5/S7.5/B1 and upgraded S7/S8 scope live in
> `THERMAL_STUDIO_V2_1_ENHANCEMENTS.md` — read it together with this doc. §0 rules and §1b
> guarantees here remain authoritative and unchanged; S9 remains HELD.

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

## 1b. Workflow guarantees (verify in EVERY slice, desktop and app)

These are behavioral requirements, not suggestions. Each slice's acceptance check includes them.

1. **Single / multiple / batch everywhere.** Any operation that can apply to one image must
   also work on a selection and on the whole set: decode, AI detect, tuning, palette, span,
   add-to-report, export, delete. Multi-select is first-class in every list/grid/carousel
   (checkbox corners, shift-click ranges, marquee in grids, Select all). The global Scope
   pill is the single source of truth; batch results always end with the Keep/Undo toast.
2. **Real-time image response.** Level/span (and isotherm) adjustments re-render the image
   **live while dragging** — no Apply button, no debounce visible to the eye (<50ms; render
   from the in-memory temperature grid on a canvas). **Emissivity, reflected temperature,
   distance, humidity, atmospheric** changes recompute the actual per-pixel temperature
   values live (the client-side gray-body recompute already exists in `lib/thermal/radiometric.ts`
   — `tuneTemps`; V2 must keep this path, never a server round-trip for preview). Every
   readout — cursor temp, loupe, measurement list, legend endpoints, histogram — updates
   from the SAME recomputed grid so numbers never disagree with the picture.
3. **Save + export are explicit and complete.**
   - **Save to file (session):** tuning, palette, span, measurements, notes autosave to the
     capture record (existing PATCH API) with a visible "Saved ✓" state — plus "Save as
     preset" for tuning profiles.
   - **Export image:** current view as PNG/JPEG at full resolution, user choice of
     **Clean** (no overlays) or **Annotated** (measurements + legend burned in), single or batch.
   - **Export data with the image:** every image export can include a sidecar (and a batch
     export produces a ZIP): `image.png` + `image.json` (all metadata: camera, sensor,
     resolution, capture time, GPS, weather, tuning values, span) + measurements table
     (CSV rows: label, type, temp, Δ) + **AI findings** (accepted text, severity, boxes).
     One "Export package" button — never image-only unless the user unchecks data.
4. **AI is general-purpose.** The AI assistant/interpretation must serve ANY thermal use case
   — building envelope, electrical, mechanical, plumbing, solar, veterinary, automotive,
   hobbyist — not assume construction. Rules: (a) the model infers the subject from the
   image + asks nothing; (b) domain standards (ASTM/NFPA…) are ONLY cited when the operator
   picked a template/standard — otherwise findings use neutral physical language ("localized
   heating consistent with electrical resistance or friction"); (c) severity words are
   universal (Critical/Warning/Advisory), never trade-specific; (d) an optional free-text
   "context" field lets the operator say what they're inspecting, which is passed to the AI;
   (e) the app copy never says "construction" — it says "whatever you inspect."

## 2. Build plan — slices for Sonnet 5 (each: build → scoped tsc → preview-verify → push)

**PARALLEL-BUILD DIRECTIVE (Brian, 2026-06-21):** V2 is built entirely behind
`/preview/thermal-v2` (unauthenticated harness + a `/thermal-studio-v2` CEO-gated live route
if useful). The existing `/thermal-studio` stays untouched and working while V2 is built.
**S9 (the swap + deletion of the old UI) is NOT executed until Brian reviews V2 and
explicitly approves the swap.** Push every verified slice so Brian can look at the preview
route on prod at any time.

Rebuild in `components/thermal-studio-v2/**`. Backend untouched. Preview harness
`/preview/thermal-v2` built FIRST and kept faithful.

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
- **S8.5 — Export engine.** Clean/Annotated PNG export (canvas render at native resolution),
  data sidecars (JSON metadata + CSV measurements + accepted AI findings), batch → ZIP,
  "Export package" in Analyze + Deliver (one implementation, two entry points).
- **S9 — Swap + delete. ⚠ HOLD — do NOT execute until Brian reviews V2 and approves.**
  Route the real pages to V2, delete `components/ops/thermal/**` screens (keep
  `lib/thermal/**` logic), update memories/docs, full-tab no-scroll + dead-button audit
  at 3 viewport sizes.

Per-slice gates: scoped tsconfig typecheck (never bare tsc), guard:design, guard:architecture,
preview_eval measurements (page scroll = 0, panel/handle counts, feature presence, and the
§1b workflow guarantees relevant to the slice — e.g. S5 must demonstrate live-drag span
re-render and live emissivity recompute updating cursor/loupe/list/legend together),
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

**Complete app build plan (executable slices — start after desktop S5 is verified, since
A-slices reuse the V2 viewer/measurement components):**

- **A0 — Product setup.** New repo (e.g. `C:\thermal-app\`), working name + logo placeholder
  (Brian picks the real name), Capacitor + Next.js (static export) or Vite+React scaffold,
  new Apple bundle id, new Supabase project (auth + `app_sessions`, `app_captures`,
  `app_purchases` tables), separate Modal tenant key for AI/PDF calls, Codemagic pipeline
  cloned from the Slate360 one. NOTHING imports from the Slate360 app; shared logic is
  copied into a `packages/thermal-core` folder (decode client, radiometric math, palettes,
  spot-stats, markers) so both products evolve independently.
- **A1 — Files + viewer.** Bottom tabs scaffold (Files/View/Detect/Report/Settings).
  Files: on-device folders, import from Files app / Photos / USB, multi-select.
  View: swipe carousel, pinch zoom, tap = spot temp, long-press loupe, palette + span
  (live-drag re-render) + °C/°F. Works fully OFFLINE for non-radiometric display and for
  radiometric files decoded on-device (see A2) — no login wall.
- **A2 — Decode + measure.** Port the R-JPEG/DJI/HIKMICRO/Autel parsing to a device-side
  decode where feasible (JS/WASM port of `extract.py` logic for the common R-JPEG variants;
  cloud decode as fallback for exotic formats). Point/Area/Line with the same
  select/drag/resize/delete/undo lifecycle; emissivity + reflected live recompute;
  measurement list with Δ vs reference.
- **A3 — Save + export.** Autosave per image; Export image (Clean/Annotated) to Photos/
  Files/share sheet; Export package (image + JSON metadata + CSV measurements) single or
  multi-select ZIP.
- **A4 — Reports + IAP.** 2-up PDF (their logo/company/footer, °C/°F) → share sheet.
  StoreKit subscription via Capacitor IAP plugin (free: view/measure/3 reports/mo;
  Pro: unlimited reports + AI credits + batch). Paywall copy neutral and review-safe.
  In-app account creation optional (Sign in with Apple) + in-app account deletion.
- **A5 — AI Detect.** One-tap cloud detect (metered credits) with the general-purpose AI
  rules from §1b.4 (optional "what are you inspecting?" context field); Accept/Edit/Dismiss;
  findings flow into the PDF and exports.
- **A6 — Store readiness.** App Privacy labels (photos, location-in-EXIF disclosure),
  privacy policy + terms URLs, screenshots/preview video, TestFlight, submission checklist
  (no external payment references, no coming-soon, offline free core, deletion flow,
  descriptive third-party sensor naming). Run the app-store-readiness audit before submit.

**App workflow guarantees:** identical §1b rules apply — multi-select everywhere, live-drag
span + live emissivity recompute on-device, save/export always offers data-with-image,
AI stays domain-neutral. The app is a lighter SUBSET of desktop (no Motion, no twin map,
no template designer — those say "available in the desktop studio").

## 4. Panel ideas adopted / rejected

**Adopted:** global Scope pill (Gemini) · NLE/IDE shell framing · accordions with
Measurements first · thermal/visual blend + synced compare · keyboard shortcuts
([ ] navigate, A accept, D dismiss, 1-9 palettes, Delete removes selection) ·
material/emissivity preset library · Accept/Edit/Dismiss finding cards · virtualized grid ·
report outline with real drag · Deliver as delivery hub with Q&A.
**Rejected:** Motion as a standalone tab (→ Deliver section) · duplicate per-panel scope
selectors · versioning/peer-review/asset-routes/cost-estimates (v3 backlog, not V1) ·
severity-colored orange badges (amber ban — use red/sky/neutral chips only).
