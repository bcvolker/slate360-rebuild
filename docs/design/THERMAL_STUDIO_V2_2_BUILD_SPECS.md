# Thermal Studio V2.2 — Slice Implementation Specs (for Sonnet 5)

> Companion to `THERMAL_STUDIO_V2_2_EXPERT_REVIEW.md` (§4 build order) — this file is the
> per-slice implementation detail. Inherit everything from the LOCKED V2 doc (§0 rules,
> §1b guarantees) and V2.1/V2.2. Per-slice gates are unchanged: scoped tsc via
> `tsconfig.thermal-v2.json` (NEVER bare tsc — OOM), guard:design, guard:architecture,
> guard:file-size (new files < 300 lines — extract hooks/components early), preview_eval
> verification in `/preview/thermal-v2` with a mocked grid fetch, zero page scroll at
> 1280×800 + 1440×900, commit explicit paths, push per verified slice.
>
> **Working patterns already established (reuse, don't reinvent):**
> - State per active image: `lib/useAnalyzeImage.ts` (grid fetch → `tuneTemps` recompute →
>   span/isotherm/tuning/spots history via `components/site-walk/canvas/useUndoRedo`).
> - Pan/zoom/drag gestures: `lib/useCanvasStage.ts`. Overlay markers: `panels/analyze/SpotOverlay.tsx`.
> - Autosave: debounced PATCH to `/api/ops/thermal/captures/[id]` (`spots`/`tuning`/`findings`/
>   `palette` fields — route whitelists keys; extend ADDITIVELY only, mirroring types.ts).
> - Batch + Keep/Undo: `lib/tuning-api.ts` + `panels/analyze/KeepUndoToast.tsx` (10s auto-keep).
> - Scope: the global pill state lives in `ThermalV2Shell` (`liveScope`), resolved to
>   `scopeIds` in `AnalyzePanel`/`LibraryPanel`.
> - Preview verification: mock `window.fetch` for `/grid` + PATCH in `preview_eval`, then
>   assert DOM/innerText/pixel state. Screenshots time out on this app — use DOM asserts.
> - DONE already: °F default + persisted unit (29607d9e), S5.5 push 1 (7d752da6).

---

## S5.5 push 2 — Polygon, Δ-compare, line profile

- **Polygon tool.** Add `polygon` to `AnalyzeToolbar` TOOLS. Canvas: clicking with the
  polygon tool appends draft vertices (local state in `AnalyzeCanvas`; render a dashed
  SVG polyline + vertex dots); `Enter`/double-click with ≥3 points commits
  `{id, kind:"polygon", x, y, points}` via `onCreateSpot` (x/y = centroid, for badge/delete
  anchor); `Escape` cancels the draft. `SpotOverlay`: render `<polygon>` from `points`
  (percent coords), whole-shape drag = translate all points (extend `useCanvasStage`
  drag gesture to carry `origPoints`), per-vertex handles draggable in Move/Select.
  Stats already work (`spotStats` polygon branch, shipped). Route already persists
  `points` (shipped). Cap 64 vertices (route cap).
- **Δ between any two.** `AnalyzeMeasurements`: row `onContextMenu` opens a small menu
  ("Compare to…" → list of other measurements). Selection stores `comparePair` in
  `useAnalyzeImage`; a pinned line renders under the list: `#2 vs #1: Δ 7.0°F ✕`.
  One active pair; ✕ clears; deleting either member clears.
- **Line profile chart.** When `selectedId` is a `line` spot, render a chart under the
  Measurements list: add additive helper `lineProfile(spot, temps, w, h): number[]` to
  `lib/thermal/spot-stats.ts` (reuse the existing segment sampler). Render as inline SVG
  polyline (~220×80), min/max dots, axis labels in current unit via `fmtTemp`. No chart lib.
- *Accept:* draw polygon → row shows Area avg; drag vertex changes reading; undo restores;
  right-click compare shows Δ; selecting a line shows the profile; PATCH carries points.

## W1 — Workflow foundations (the "inadequate UI" fix)

- **Double-click → Analyze.** `LibraryGrid` thumbnails: single click = select (as now),
  `onDoubleClick` = `selection.click(id, i, {})` + switch shell tab to `analyze`. Lift a
  `onOpenInAnalyze(id)` callback from `ThermalV2Shell` (owns tab state) into `LibraryPanel`.
- **Drop anywhere.** In `ThermalV2Shell`, window-level `dragover`/`drop` listeners (guard
  `dataTransfer.types.includes("Files")`); dropped files call the existing
  `uploadThermalFile` per file; show count progress in the top bar; switch to Library.
  Remove none of the existing rail dropzone.
- **Start strip.** `LibraryGrid` empty state becomes one centered block: "Drop thermal
  photos to begin — radiometric data is preserved" + a Choose files button (same hidden
  input pattern as `LibraryFiltersRail`).
- **Palette persist + seed.** `useAnalyzeImage`: seed palette from `capture.metadata.palette`
  (fallback "Iron"); move palette state INTO the hook; debounce-PATCH `{palette}` on change
  (route already accepts it). AnalyzePanel consumes from the hook.
- **Copy/Paste settings.** New `lib/settings-clipboard.ts`: module-level variable holding
  `{palette, span, tuning, isotherm}`. Toolbar buttons ⧉ Copy / ⧉ Paste (paste disabled+
  tooltip until copied; paste = one history-visible commit + autosaves). Keyboard
  Ctrl+Shift+C/V in AnalyzePanel's keydown handler. Paste onto Selected/All routes through
  the existing batch apply + KeepUndoToast.
- **Sticky mini-summary.** Above the accordions in the right rail: one row
  `Max 108.8° · Min 67.1° · Avg 84.2°` computed from `img.grid` (tabular-nums, muted).
- *Accept:* dbl-click opens Analyze on the right image; window-drop uploads; empty Library
  shows one verb; palette survives image switch + reload (PATCH observed); copy on image A
  → paste on B applies all four; summary always visible.

## S5.6 — Alarms + sensitivity suite

- **Types:** replace `ThermalV2Isotherm` usage with `ThermalV2Alarm =
  {mode:"off"|"above"|"below"|"interval"|"dewpoint"|"insulation", lo?, hi?, margin?,
  indoor_c?, outdoor_c?, factor?}` (keep isotherm field name in PATCH? No — alarm is
  display-only, session-local; do NOT persist in v1).
- **Render:** `renderHeatmap` already supports an in-band/out-band split via its isotherm
  arg; generalize CALLER-side: compute effective `{lo,hi}` from the alarm mode
  (above → `{lo:limit, hi:+∞}` clamp to gridMax; dewpoint → `{lo:-∞, hi:dewpoint+margin}`)
  and pass through — no changes to `lib/thermal/probe-palettes.ts` needed unless polarity
  requires it; if it does, add an additive optional param.
- **Dew point:** new pure helper `lib/thermal/psychrometrics.ts`:
  `dewPointC(airTempC, rhPct)` — Magnus (a=17.62, b=243.12). Unit-test-friendly, no deps.
  Seed air temp/RH from Tuning's `atmospheric_c`/`humidity_pct`; editable inline.
- **Severity bands:** per-session state `{advisory:number, warning:number, critical:number}`
  (ΔT vs reference thresholds) + presets dropdown (Neutral defaults / NETA-style ΔT /
  RESNET-style envelope) — labels neutral until a preset is chosen (§1b.4). Bands drive
  chip colors in Measurements rows (red/sky/neutral — NEVER amber) and later AI severity.
- **Enhance here:** toolbar button (⌖) + keyboard `E`: set span to `hover.tempC ± 2°`
  (respect unit display; span stored in °C). Escape/Reset-to-full-range restores.
- **Local contrast:** Display accordion toggle: render histogram-equalized grid (compute
  rank-normalized temps client-side into a DISPLAY-ONLY array; all readouts keep using the
  true grid) — label it "Local contrast (display only)".
- **A/B flicker:** Display accordion: "Snapshot A/B" — store current `{palette,span}` as A,
  adjust to B, `\` key or button toggles; flicker mode swaps at 2Hz (setInterval, cleared
  on unmount; respect prefers-reduced-motion by disabling auto-flicker).
- *Accept (P2 core):* fixture grid with an embedded 0.8 °C blob — assert rendered pixel
  color distance blob-vs-surroundings crosses threshold only after Enhance-here; dew-point
  alarm lights expected pixels for known RH/temp; band presets change row chips.

## S6 — AI Review (+ S6-CR credit metering)

- **UI (per locked doc §1 Tab 3):** left = severity-sorted image list (filter type/severity);
  center = viewer reusing `AnalyzeCanvas` in read-only mode + numbered bbox overlays from
  `capture.anomalies` (grid-pixel bboxes → percent, same letterbox math via `useCanvasStage`'s
  canvasBox); right = finding cards (type words, severity chip via S5.6 bands, peak/ΔT,
  **explanation paragraph**, editable draft note, Accept ✓/Edit ✎/Dismiss ✕, Dismissed(N)
  collapsed group with restore); bottom = strip with detection-count badges. "Run AI on N"
  CTA dispatches existing `/api/ops/thermal/jobs` `job_type:"analyze"` then `"interpret"`
  per current pipeline; job chip in top bar via `useThermalJobRealtime` (reuse hook).
- **Finding state:** accepted/dismissed/edited persist per capture in `metadata` — extend
  the PATCH route additively with `findings_review: {accepted:string[], dismissed:string[],
  edits:Record<anomalyIndex,string>}` (mirror in types.ts).
- **Worker upgrades (Modal — separate deploy, follow DEPLOY.md):** in `interpret`:
  (a) include the paired VISUAL image bytes when `visual_pair_id` resolves (second image
  block); (b) pass tuning env fields + new optional `camera_side` ("interior"/"exterior",
  persisted in capture metadata via additive PATCH key) into the prompt for directional
  reasoning; (c) require `explanation` (2–3 sentences) + `confidence` (0–1) per finding in
  the JSON contract. In `analyze.py`: add `sensitivity:"high"` param → significance pass
  (seed at `max(0.8, 1.0σ)` local deviation + min-area 12 + shape features already computed),
  emit `confidence` from area×deviation. ADDITIVE param, default unchanged.
- **S6-CR — credit metering (MUST ship with S6; AI never runs unmetered):**
  - Config: `THERMAL_AI_CREDITS_PER_IMAGE` constant in `lib/thermal/ai-credits.ts`
    (default 1 — Brian owns final pricing; see cost table below).
  - Pre-flight: in `POST /api/ops/thermal/jobs` for `analyze`/`interpret`/`full_pipeline`,
    read `organizations.credits_balance`; if `balance < images × rate` return 402-shaped
    `{error:"insufficient_credits", required, balance}`. UI shows "You need N credits —
    Buy credits" linking to the existing billing/credits purchase surface (link only; do
    NOT edit billing code).
  - Debit: in the jobs callback route on completion, `deductCredits(admin, orgId,
    imagesProcessed × rate, `${orgId}:thermal-ai:${jobId}`, "Thermal AI analysis")` —
    same idempotent pattern as `lib/twin/job-callback.ts`. `lib/credits/idempotency.ts`
    is shared util (twin precedent), NOT a forbidden zone; entitlements/billing/Stripe
    files remain untouched.
  - Backstop: keep the worker's per-org USD ledger cap (already live) as the hard stop.
- *Accept (P3 core):* run-AI on 3 fixture images → queue sorted by severity; every card
  shows an explanation; Accept persists + survives reload; Dismiss → restore works;
  insufficient-credits path returns the purchase prompt (mock balance); debit key
  idempotent (double callback = one deduction).

### AI cost + margin table (grounded 2026-07-08; model = claude-opus-4-8, worker default)

| Path | Input tokens ≈ | Cost in | Cost out (~500 tok) | Total/image |
|---|---|---|---|---|
| Today (thermal 640×512 only) | ~850 | $0.0043 | $0.0125 | **~$0.015** |
| S6 fused (thermal + visual ≤1024×768 + env) | ~1,850–2,400 | $0.009–0.012 | $0.0125 | **~$0.022–0.025** |
| Fused via Batches API (50% off, for B1/large runs) | — | — | — | **~$0.011–0.013** |
| Fused on Sonnet 5 ($3/$15; intro $2/$10 to 2026-08-31) | same | ~$0.006 | $0.0075 | **~$0.013 (intro ~$0.009)** |
| Fused on Haiku 4.5 ($1/$5) — triage tier only | same | ~$0.002 | $0.0025 | **~$0.005** |

Image tokens ≈ (w×h)/750. Statistical detection (analyze.py) is CPU-only — effectively
free; ONLY the VLM interpret step is metered. 347-frame survey, fused, Opus: ~$8.30
(~$4.15 batched). **Margin rule: credits charged per image must retail ≥ 3× raw cost.**
At 1 credit/image, any credit price ≥ $0.08 clears 3× even at worst-case 2.5¢. Prompt
caching doesn't help here (system prompt < 4096-token Opus minimum); the Batches API is
the real cost lever for B1 — wire `interpret` batches through it when >20 images.

## S6.5 — Compare + fusion + normalize-scale

- Side-by-side: `AnalyzeCompare` view (toolbar toggle when 2 images selected): two
  `AnalyzeCanvas` instances, shared pan/zoom state (lift from `useCanvasStage` via
  controlled props), optional span-lock checkbox, per-side hover readouts.
- Thermal↔visual blend: when active capture has `visual_pair_id`, toolbar slider 0–100%
  compositing the visual `<img>` under the thermal canvas (canvas opacity), plus alignment
  nudge (dx/dy/scale) persisted additively as `metadata.pair_align`.
- Normalize scale: Display accordion "Lock this span across {scope}" → batch-PATCH? NO —
  span isn't persisted per capture today; implement as session-level `lockedSpan` in shell
  state applied to every image's viewer until unlocked (cheap, reversible, no backend).
- *Accept (P4 core):* compare view pans in sync; blend slider composites; locked span
  applies to next image opened.

## S7 — Reports (re-openable documents)

- Backend reuse: `thermal_report_templates` GET/POST routes (exist), session `report_set`
  (exists), `POST /sessions/[id]/export` (exists — verify its request shape before wiring).
- Template gallery: click-through picker with real page-thumbnail previews (render
  miniature WYSIWYG pages in-DOM, scaled; no images needed). Seed 5 built-ins + org
  templates from the API; "Save current layout as template" POSTs back.
- Branding profile: org-level `{logoUrl, company, footer, accent, certLine}` — persist in
  template metadata or session metadata (verify which the export worker reads; NEVER
  hardcode the cert line).
- WYSIWYG: white paper sheets, 2-up default (1/2/4 switch), image + metadata + findings
  + accepted AI findings; outline rail with REAL drag reorder (HTML5 dnd like WidgetCard);
  severity summary page auto-added when bands active.
- Re-openable: report state (outline order, template id, branding, conditions) persists
  to session metadata on change; "Continue editing" restores exactly.
- *Accept (P1/P3):* ★-funnel → template pick → live preview → Generate ≤ 4 clicks;
  reload → Continue editing restores; generated PDF row appears in history.

## TS-SD — SlateDrop persistence

- Provision: ensure a **Thermal Studio** folder via the existing SlateDrop provisioning
  helpers (`lib/slatedrop/**`) — project-scoped when the session links a project, org
  root otherwise. Follow `lib/slatedrop/register-deliverable.ts` + Site Walk's
  `lib/site-walk/slatedrop-bridge.ts` as the pattern (new `lib/thermal/slatedrop-bridge.ts`).
- Register: on report PDF generation + export ZIP completion, register the blob in the
  folder (name = report title + date). Share links register as link-type entries if the
  existing deliverable registration supports them (check Site Walk's handling first).
- Re-open: SlateDrop row click for a thermal deliverable deep-links
  `/thermal-studio?session=…&report=…` → Report tab with state restored (S7's persistence).
- *Accept (P1):* generate PDF → row in SlateDrop Thermal Studio folder → open → editor
  restores; works for a project-linked and an unlinked session.

## S7.5 / S8 / S8.5 / B1 / PAN — headline contracts (detail on entry)

- **S7.5 Deliver picker:** one chooser → PDF | Interactive link | Cinematic. Cinematic =
  token-gated route reusing share-viewer auth; Ken Burns via CSS transforms + crossfade;
  lower-third findings; `prefers-reduced-motion` honored; password/expiry; view-analytics
  from share-token access logs (table exists for share tokens — verify before building).
- **S8 video import:** Library accepts video files → new Modal job extracts frames →
  capture rows (NEW worker function — additive; follow DEPLOY.md; redeploy Modal, and
  Trigger only if a new task id is added). Timelapse section ports the old Motion engine.
- **S8.5 export engine:** canvas render at native grid resolution with overlays burned
  (Clean/Annotated), JSON+CSV sidecars, batch→ZIP via JSZip client-side or worker for
  large sets.
- **B1 recipes:** recipe = ordered flags {decode, applySettings(settingsClipboard|preset),
  runAI, addToReport, exportZip}; run client-orchestrated over existing APIs with a
  progress chip; save recipes in localStorage v1, org table later. Route interpret through
  the Batches path when >20 images (cost table above).
- **PAN:** new Modal function: register on paired-visual/gradient features (OpenCV ORB +
  homography), warp temp grids, temperature-space blend, seam-confidence mask → one NPZ +
  capture row flagged `panorama:true`. UI: multi-select → "Stitch panorama (N)".

## App (A0–A6) — unchanged from V2.2 §3.2; build after desktop S7. Import tab is the
crux: Files-app byte-copy with R-JPEG signature sniff → "Radiometric ✓" badge; never
Photos re-encode. Assistant tab consumes the same S6 endpoints + credit metering.

## Persona specs → files

`e2e/thermal-v2-p1.spec.ts` … `p6` land WITH their slices (P1→S7/TS-SD, P2→S5.6,
P3→S6/S7, P4→W1/S6.5, P5→S7.5, P6→A-slices). All run against `/preview/thermal-v2`
with mocked `/grid` + PATCH; assertions per V2.2 §5 including the cross-cutting
invariants (no scroll, undoable everything, readout agreement, no raw errors).

---

# Addendum A (2026-07-08) — workflow Q&A decisions (Brian)

Locked answers to the end-to-end workflow review. These AMEND the slices above.

## A1. Non-destructive versioning (architectural guarantee — document + surface it)

The original is NEVER modified, by construction: the raw R-JPEG bytes are immutable in
R2 (`storage_path`); the decoded per-pixel grid is immutable (`npz_data_path`); every
edit (spots, tuning, palette, findings, review state) is metadata JSON on the capture
row; every view is a live render of original + layers. Surfacing (new slice **W2**,
after W1):
- **"View original" toggle** in Analyze (`O` key + toolbar eye icon): temporarily hides
  all overlays and resets span/palette to camera values. Releasing restores the working
  state. No data changes.
- **Focus mode** (`F` key + toolbar ⛶): collapses both rails + filmstrip for a maximum
  viewer; `F`/Esc restores. Satisfies the "large work area" requirement without layout
  changes.
- **Library status filters** (extend `LibraryFiltersRail`): `Not decoded` ·
  `Not AI-analyzed` · `Has findings` · `Reviewed` — derived: decoded =
  `qualityMetrics.is_radiometric`; AI-analyzed = `anomalies != null`; reviewed =
  `metadata.findings_review` present. This answers "where do I see analyzed vs not" —
  ONE place (Library), filtered, never two galleries.
- Exports (S8.5) materialize both file versions on demand: **Clean** (no overlays) and
  **Annotated** — the answer to "is there a version without all of it".

## A2. AI run UX (amends S6)

- **One primary action** ("Find problems with AI (N)") honoring the Scope pill. An
  optional **"Add context" popover** on that button: free-text ("what am I inspecting"),
  optional lens dropdown (General default / Building / Roof / Electrical / Mechanical /
  Drone), camera-side toggle. Analysis is AUTOMATIC by default — context only refines.
- **Progress:** the top-bar job chip shows `n/N images` (jobs table carries progress via
  callback updates — verify field, else poll status); AI Review's left list fills as
  results land (`router.refresh` on job completion, pattern exists in old shell).
- **Triple protection against double-charge:** (1) button disabled while a job for the
  same scope is queued/running; (2) jobs POST dedupes — same session + job_type +
  capture-set hash while active returns the existing job id; (3) S6-CR debit is
  idempotency-keyed per jobId. An accidental second click can never double-bill.
- **Markups:** every detection renders as a numbered outline box on the image (grid-pixel
  bbox from `analyze.py`, already emitted) — hover/click highlights the matching card.
  Accepted findings keep their boxes into Report/Deliver renders (Annotated exports).
- Per-finding "Ask why" follow-up (extra interpret round-trip) = v1.1, optional.

## A3. Project integration (new slice **TS-PROJ**, ships with TS-SD)

- Inspection (session) creation/import offers a **project picker** (GET
  /api/ops/thermal/projects exists; `initialProjectId` plumbing exists in the old shell —
  keep the linkage fields, rebuild the picker UI).
- Project-linked inspections: SlateDrop "Thermal Studio" folder is created under THAT
  project (TS-SD); generated deliverables ALSO register in the project's Deliverables
  folder so they sit beside Site Walk and Tour deliverables.
- The project workspace lists thermal inspections alongside walks/tours (read-only list
  + "Open in Thermal Studio" links — no thermal editing embedded in the project screen).
  One location = one project = every tool's output together; unlinked "quick inspections"
  remain fully supported (org-root folder).

## A4. Radiometric Live Link (amends S7.5 — the flagship interactive deliverable)

Viewer (token-gated, reuses share-viewer auth patterns): per-image rendered PNG +
anomaly pins + accepted finding text. **Industry-first:** lazy-load the per-pixel grid
per image (existing grid endpoint shape, token-gated variant; ~300KB gzipped JSON at
640×512) so the CLIENT can hover anywhere and read live temperatures. Viewer tools kept
deliberately minimal: hover temp readout (°F/°C), pin hover tooltips (finding +
explanation + ΔT), palette cycle (3 presets), one "Enhance" span slider (client-side
`renderHeatmap` re-render), pinch/scroll zoom. Plus: per-image Q&A threads (owner
notified, feeds Ops/Coordination), **Accept & sign** button (timestamped), password +
expiry, view analytics (opened/when from token logs). No incumbent link can do hover-
temperature — this is the demo moment.

## A5. Timelapse (amends S8) — honest radiometrics + the Scrubber

- A baked **MP4 is never radiometric** (video codecs carry color, not temperature).
  Radiometrics are retained on every SOURCE frame (grids stay in R2). Two outputs:
  1. **MP4 render** (email/social): existing Motion engine (fps/aspect/smoothing/
     deflicker/overlay) + NEW: **duration target** ("Condense to [30 s]" → fps computed
     from frame count), trim range, text/timestamp/logo overlays from the branding
     profile.
  2. **Timelapse Scrubber link** (interactive deliverable): web viewer scrubbing the
     actual frames (server-rendered once), radiometric hover per frame (lazy grid
     fetch), and an optional **region trend chart** — apply a saved area measurement
     across all frames, worker computes the temp-time series, viewer charts it.
     Equipment warm-up curves for commissioning firms; moisture dry-down for restoration.
- Batch scale: hundreds of frames fine (frames render server-side in the existing
  timelapse worker path).

## A6. Thermal video (amends S8) — quick-trim only, hand off the rest

In Deliver → Time-lapse & video (deliberately NOT featured — a section, not a tab):
trim in/out, speed (re-time), crop → Modal re-encode job. Anything deeper (multi-clip,
titles, audio) = **"Open in Content Studio"** handoff (register the clip as a Content
Studio asset) — keeps Thermal Studio uncluttered and reuses the platform's real editor.
Frame-extraction to stills (S8) remains the analysis path for video.

## A7. Panorama create + view (amends PAN)

Create: Library multi-select → overflow menu "Stitch panorama (N)" → Modal job →
returns a NEW capture row (`metadata.panorama: true`) holding the stitched grid — so
Analyze/measure/AI work on it unchanged (it's just a big image). Deliver: **Panorama
Explorer link** — full-bleed pan/zoom (tile the render if > 4096px wide), pins, hover
temps, same viewer chrome as the Live Link. Seam-confidence overlay toggle.

## A8. Deliverable catalog (amends S7/S7.5 template registry)

Gallery groups into **Documents** and **Interactive links** (both from the same ★
report set + branding profile):
| Type | Wow for |
|---|---|
| Branded PDF (1/2/4-up templates, severity summary, cert line) | Everyone; the paper trail |
| Executive One-Pager (auto top-5 findings + counts) | Owners/GCs who won't read 40 pages |
| Radiometric Live Link (A4) | Inspection firms — clients hover real temps |
| Cinematic Slideshow (S7.5) | Sales-grade walkthrough of findings |
| Before/After Compare link (two sessions, slider per matched image) | Contractors proving remediation; FM recurring routes |
| Panorama Explorer (A7) | Roof consultants, drone surveys |
| Timelapse Scrubber + trend chart (A5) | Commissioning firms, restoration dry-downs |

Build order for the catalog: PDF + Live Link + Cinematic in S7/S7.5 (as planned);
One-Pager = a template, not a slice; Compare link with S6.5's matching; Explorer with
PAN; Scrubber with S8. Every type registers in SlateDrop (TS-SD) + project Deliverables
(TS-PROJ) and is re-openable.

## A9. Build-order amendment

…S5.5p2 → W1 → **W2** → S5.6 → S6(+CR) → S6.5 → S7 → **TS-SD + TS-PROJ** → S7.5(+A4) →
S8(+A5/A6) → S8.5 → B1 → PAN(+A7) → app → S9 (HELD).

---

# Addendum B (2026-07-08) — unified link container, panorama at scale, moisture surveys, personal-use scope, standalone app branding

## B1. ONE deliverable link, many chapters (amends S7.5 + A8)

A share link is a **container**, not a single artifact. One branded, token-gated URL
carries ordered **chapters**, each of a registered type: `cover` (cinematic title card),
`slideshow` (cinematic sequence), `photos` (finding cards + Live-Link hover viewer),
`panorama` (Explorer), `video` (player for rendered MP4/trimmed clips), `timelapse`
(Scrubber), `compare` (before/after slider), `qa` (thread surface — always present
unless disabled). Left chapter rail (words, not icons), branded header/footer, one
password/expiry/analytics envelope for the whole link. Deliver's picker becomes a
**link composer**: check the chapters to include, drag order, send. So a slideshow +
AI-annotated panorama + video for the same inspection = ONE link the client walks
through — never three URLs. PDF stays a separate download artifact from the same set.

## B2. Panorama at scale — tiles, hover, and contour callouts (amends PAN/A7)

- **Tile pyramid.** The stitched render (potentially 10k+ px wide) is tiled server-side
  once at export (256px tiles, 3–5 zoom levels, standard slippy-map scheme); the
  Explorer viewer is a pan/zoom tile viewer — opens **fit-to-width, centered**, scroll/
  pinch zooms toward cursor down to native pixels, drag pans. No giant single download.
- **Tiled radiometric hover.** The stitched grid is chunked the same way (256×256
  float16 chunks in R2); the viewer lazy-fetches only the chunk under the cursor —
  hover temps work across a 20-megapixel panorama with kilobyte-sized fetches. At low
  zoom, a downsampled whole-grid gives coarse readout; native chunks load past ~50%
  zoom.
- **Contour callouts, not boxes (amends S6 worker spec).** `analyze.py` already builds
  connected-component masks; ADDITIVELY emit `contour` (simplified cv2.findContours
  polygon, ≤120 pts) and `trend` (unit vector from region centroid along the thermal
  gradient — a "which way is it running" hint) on each anomaly, alongside the existing
  bbox. Viewers render soft-filled tinted contour regions (severity tint, red/sky/
  neutral) with a numbered pin at the centroid and an optional direction chevron;
  clicking opens the finding card (type, ΔT vs surroundings, area in px→ft² when
  ground-sample distance is known, explanation, confidence). Boxes remain the fallback
  when no contour is present. Diffuse moisture patterns read as organic outlined
  plumes — not rectangles slapped on concrete.
- **Moisture-survey sensitivity (S6 high-sensitivity pass applies unchanged):**
  spatially-coherent sub-degree regions are the target class; `edge_softness` (already
  computed) separates diffuse/moisture-like from sharp/focal; the VLM explanation uses
  neutral language ("retained-heat region consistent with subsurface moisture,
  trailing toward the drain at lower right") — never asserts water as fact.

## B3. Differential (before/after-rain) survey support (amends S6.5 compare)

For active-leak tracing: two sessions of the same area (e.g. pre-rain and 24–48h
post-rain panoramas) → **Compare** with locked span + a **difference lens**: viewer
computes per-pixel ΔT between the two grids (client-side where sizes match; worker
job for tiled panoramas) and renders the delta as its own layer — regions that
CHANGED are the active water paths; static features cancel out. Ships as part of the
`compare` chapter (B1) and the desktop compare view. This is the strongest moisture
evidence a survey can produce and no incumbent offers it as a client-facing link.

## B4. Scope note — personal use now, product later (Brian, 2026-07-08)

Thermal Studio remains **CEO-only** (existing gate) and is NOT entering Slate360
subscriptions yet. Therefore: **S6-CR credit metering ships behind a config flag,
default OFF** (`THERMAL_AI_METERING_ENABLED=false`) — the code lands with S6 so
productization is a flag flip + price decision, but Brian's own use is unmetered.
The worker's per-org USD ledger cap STAYS ACTIVE as his personal cost control.
Everything else builds unchanged — the product-grade path is the point.

## B5. Standalone app — branding-grade links, reproducible product (amends A-plan/§3.2)

Reaffirmed target: a separate App Store product, built later in its OWN repo (locked
A0 rule: `packages/thermal-core` is COPIED, never imported). Additions from this
review:
- **Branding editor (shared desktop + app, ships with S7's branding profile):** logo
  upload + placement (corner presets) + **opacity slider** (watermark-grade
  transparency), accent color, header/footer text, per-deliverable **title + subtitle +
  free-text notes blocks** insertable into links and PDFs. Stored on the branding
  profile; applied uniformly to every deliverable type (PDF pages, link chrome,
  slideshow title cards, MP4 overlays).
- **Links parity from the app:** interactive links are cloud URLs rendered by the
  server-side viewer — the app composes and sends the SAME links as desktop (chapter
  composer in the Deliver tab, mobile-optimized). PDFs generate via the same worker.
- **Mobile-first viewer requirement:** every chapter type must pass a 390px-wide
  audit (touch pan/zoom on panorama tiles, tap-for-temp instead of hover, swipe
  between slideshow frames) — the ASU-leadership demo happens on someone's phone.

# Addendum AE (2026-07-15) — rotation-inclusive pose solve SHIPPED (EJ/line continuity fix)

Implemented per AD + Brian's go: stage 2 is now a full (dtheta, tx, ty) pose graph —
small-angle linearized rotation + translation per frame, 2 Gauss-Newton iterations,
same progressive prune ladder and ECC validated-admission (1/551 admitted). Results:
- **Rotation corrections: median 1.95 deg, max 21.4 deg** — matching AD's measured
  per-leg disagreements (the transit/weak frames take the largest corrections).
- Verification renders: full QC noticeably tighter (canvas shrank 2884->2711 as
  mis-rotated spread collapsed); `qc/line_continuity_check.jpg` shows long thin
  rail/joint lines crossing multiple frame seams UNBROKEN; deck-field zoom shows
  the drain band + mottling continuous. Envelope OK (offsets ±4.7 °C).
- Remaining cosmetics: soft tone patches (vignette/AGC residual — future radial
  gain flattening), the SE sunrise band (real, documented AA), stand parallax
  (physics, post-splat ortho). Brian to eye-pass the refreshed mosaic_v5 files.

# Addendum AD (2026-07-15) — EJ-kink ROOT CAUSE: per-leg rotation errors (measured, unfixed pending Brian's go)

Brian: "why is the EJ line not straight?" Measured the per-leg rotations the
mosaic actually uses (stage-1 Procrustes per leg):
- **Adjacent grid legs disagree in rotation by 2.3–10.6°** (leg0→1: 7.8°, 2→3:
  10.6°, 6→7: 9.3°); leg 9 (transit-contaminated) fits GPS at 23 m RMS.
- ROOT CAUSE (two compounding parts): (1) a leg's GPS points are nearly COLLINEAR,
  so a similarity fit's rotation about that line is ill-determined — consumer GPS
  noise (±2–3 m) swings it degrees; (2) within-leg chain drift bends the chained
  centers, which the fit averages into a wrong rotation. **Stage 2 then solves
  TRANSLATIONS ONLY — the pairwise feature edges MEASURE relative rotation to
  ~0.1° but stage 2 discards that information.** So each leg keeps its wrong
  rotation; a 100 m straight EJ kinks at EVERY leg seam (a 7° disagreement =
  ~1.2 m lateral break across a 10 m leg width). Equipment/wall misalignments at
  seams are the same error. Scale had the same disease and was already cured by
  median-unification; rotation was not.
- **THE FIX (designed, awaiting go):** extend the global solve to rotation —
  per-frame (θ, t) pose graph with small-angle linearization, one/two Gauss-Newton
  iterations; feature edges constrain relative rotation (their strong suit), GPS
  constrains only global orientation/position (its strong suit). Expected result:
  legs rotationally reconciled to the feature measurements (~0.1°), EJ straight,
  seam misalignments collapse. Cheap to run (sparse LSQ, 3N vars).

# Addendum AC (2026-07-15) — ECC verdict: valuable as sequential rescue, unreliable as cross-matcher

Final mosaic build (v5 files refreshed) uses a **two-population solve**: ORB-verified
edges establish geometry; ECC-derived edges are admitted only where they agree
within 0.8 m. Results:
- ECC as SEQUENTIAL rescue: WORKS — sequential registration failures 19 → 9.
- ECC as CROSS-LEG matcher: UNRELIABLE on this dataset — only **4/551** ECC cross
  edges survived the geometry check (barely-overlapping pairs converge to false
  optima with passable correlation scores). An earlier build that trusted them
  regressed visibly (seam patchwork; median correction 1.54→3.23 m) and was
  rejected. The validated-admission architecture keeps ECC's wins and locks out
  its failures automatically — this gate is now a permanent pipeline feature.
- ECC's remaining upside (per Grok's own framing): sub-pixel REFINEMENT of good
  ORB pairs, and the thermal↔visual pair calibration — both queued.
Final state: geometry ≈ best-known (v5-grade) + 10 rescued sequential pairs +
connectivity median 12 with a single weak frame. Envelope OK. Ship it.

# Addendum AB (2026-07-15) — blotches explained (display, not data), ECC rescue implemented

## AB1. "Bright yellow blotches" = display saturation, DATA FULLY INTACT (proven)

Investigated the v5 blotches (`qc/blotch_recovery_proof.jpg`): the QC render uses ONE
global span (0.2–30.7 °C = 1st–99th percentile); any surface warmer than ~31 °C
renders the same near-white yellow. The underlying float32 data is normal
(blotch temps 20–32 °C, data max 59.8 °C — nowhere near sensor saturation; 224
regions exceed the display ceiling). Re-rendering the same crops with a LOCAL span
reveals full structure (trusses, texture, equipment). CONCLUSION: nothing to
recover — the viewer's span/level control + per-finding presentation recipes (I2)
make every region inspectable; the flat QC JPGs are inherently one-span previews.
This is the strongest demo yet of WHY the interactive viewer beats static images.

## AB2. Grok round-3 research — implementation status

- **ECC intensity-based rescue: IMPLEMENTED** (`tools/stitch_spike.py ecc_fallback`)
  — multi-scale findTransformECC (euclidean, half-res, 3 pyramid levels, cc≥0.25
  gate + translation sanity) now catches every pair where ORB features fail
  (uncooled thermal on low-texture deck = the exact failure case). Wired as the
  fallback on ALL failure paths incl. the plausibility gate. Grok's "single
  highest-ROI addition" — agreed and done.
- **Thermal↔visual pair calibration + RGB-ortho-assisted refinement:** adopted as
  DESIGN (fixed rigid mapping estimated once via ECC over many MAX/IRX pairs;
  transfer visual-frame registrations to thermal siblings) — implementation queued
  behind the COLMAP/GPU worker (needs the RGB ortho to exist).
- **orthority (leftfield-geospatial): noted** as the reference for DEM
  orthorectification (CPU-feasible per Grok); queued with P4.
- **Kapil repo:** adopt the NGF idea, not the code (license unclear, ODM-coupled) —
  matches our earlier verdict.

## AB3. Future flights: the R&D is DONE — reruns are turnkey

All of today's iterations are encoded in the pipeline (similarity model, GPS
anchoring, dense graph + progressive pruning, offset compensation, winner-take-most
+ boundary reclaim, transit exclusion, ECC rescue). A future flight = drop folder →
one command → decode + stitch + QC in ~15 min unattended. The port into the Modal
worker (PAN slice) makes it a button. Revisions this week were one-time algorithm
R&D, not a per-flight cost.

# Addendum AA (2026-07-15) — mosaic v5 MAX AREA shipped

`qc/mosaic_v5_QC.jpg` + `mosaic_main_flight_v5.npz`: 104 transit/turn frames
excluded from painting (kept as solve constraints — cured the south lay-over
smear); three-pass composite (crisp interior -> uncropped grid-frame boundary
reclaim [1.25M px recovered] -> transit frames as last-resort fill [95k px]).
Coverage now extends to the full captured footprint. Honest notes for the
deliverable: (1) peripheral reclaim strips are softer than the interior (single
uncropped frames, acceptable); (2) the warm diagonal band at the SE is TIME, not
error — the last legs flew ~40 min after the first as sunrise approached; the
conditions banner must state the capture window, and the difference/compare
chapters must not mix early vs late frames as if simultaneous; (3) stand parallax
remains inherent (Addendum X) pending DEM orthorectification.

# Addendum Z (2026-07-15) — north/south frame-level audit: covered concourse, not lost data

Frame-level inspection (`qc/north_frames_check.jpg`, `qc/south_frames_check.jpg`)
revises Addendum Y — **no re-flight required**:
- **NORTH:** the deck continues UNDER A ROOF/canopy. The northernmost 100-ft frames
  image the wall + curved canopy top (aerial thermal physically cannot see beneath).
  **The low flight (103MEDIA) flew INTO the covered concourse** — its northernmost
  frames (~y +9) show the pillared covered space from below across roughly the full
  deck width. That IS the north data: it enters the deliverable as the covered-area
  insets (O2), pinned along the north edge of the panorama. Nothing aerial was
  missed; nothing is recoverable from above.
- **SOUTH:** captured. Southern legs (to y −59, footprint ≈ −66) image the deck-to-
  seating transition (bleacher rows visible) — the deck's southern boundary is in
  the data. Perceived loss comes from RENDERING: transit-frame lay-over + the 15%
  symmetric border crop trimming ~2 m at the coverage boundary.
- **Render fixes queued (final presentation build):** exclude transit/turn frames
  from compositing; ASYMMETRIC border crop for boundary frames (keep the outward
  edge, crop only interior edges — reclaims the trimmed perimeter strip); mask to
  the deck; deck-bounded silhouette.

# Addendum Y (2026-07-15) — coverage audit: the missing north/south areas were NOT FLOWN (thermal) — REVISED BY ADDENDUM Z

GPS ground-track plot (`qc/flight_tracks.png`) is decisive:
- **102MEDIA thermal serpentine covers ONLY the central band** (~y +3 to −60 m,
  x −56 to +45 m local). With the ~17×14 m frame footprint, thermal coverage ends
  ≈ y +10 north and ≈ −67 south. Nothing north/south of that was captured at
  100 ft — **no processing can recover unflown area; a gap-fill re-flight is
  required** (same parameters: pre-dawn, 100 ft, 2 s interval, ~2 mph; 2–4
  serpentine legs beyond the north edge + 2–4 beyond the south; the pipeline
  merges them into the existing mosaic via the same GPS-anchored solve — flights
  from DIFFERENT mornings are fine for geometry, but for radiometric consistency
  fly the gaps at the same pre-dawn hour; the difference-lens chapter must only
  compare same-epoch data).
- **103MEDIA (low flight)** touched a strip north of the main pattern but at
  few-feet AGL — cannot merge into a 100 ft mosaic (scale/parallax); stays inset.
- **RGB mapping flights covered a much larger footprint** (±80 m x, −80..+45 m y)
  → the 3D splat WILL cover the full site including areas thermal missed.
- Alignment next-fix: frames 225–250 are diagonal TRANSIT legs crossing the grid —
  they lay obliquely over grid coverage and likely cause residual visible
  misalignment; next build EXCLUDES transit/turn frames from COMPOSITING (kept as
  solve constraints only) and masks the presentation render to the deck.

# Addendum X (2026-07-15) — mosaic v4: dense graph + perimeter verdict (parallax, not error)

v4: dense match graph (791 cross-leg + loop-closure edges, median connectivity 8),
progressive outlier pruning (1.5→0.8→0.4 m re-solves), finer 3 cm/px canvas,
deeper border crop, per-edge perimeter QC crops (edgeL/R/T/B).
**Perimeter verdict from the crops:** the flat INTERIOR (deck field + roofs — the
survey subject) is aligned and crisp. The "broken concrete walls" Brian saw are the
STADIUM SEATING/STAND STRUCTURES at the coverage periphery — elevated 3D structure
viewed from different drone positions has parallax a 2D mosaic PHYSICALLY cannot
reconcile (no 2D transform aligns two viewpoints of a tall object). Weakly-connected
frames (227–239 run, feature-poor stand views) compound it.
**Resolution:** (1) the PRESENTATION panorama is bounded/masked to the deck +
building roofs — stands excluded (they are not survey subject); (2) stands render
properly in the 3D SPLAT chapter (that's what 3D is for); (3) a true orthomosaic
(DEM-rectified, stands included) becomes possible after P4's splat produces the
surface model — optional post-ASU upgrade. Full-scene 2D perfection is not a
achievable target and must not be promised.

# Addendum W (2026-07-15) — mosaic v3 QUALITY PASS (after Brian rejected v1 quality)

Brian rejected v1 (misaligned, soft). v2/v3 rebuilt the geometry + compositing:
1. **Cross-leg feature registration**: 253 verified feature-matched pairs BETWEEN
   legs (was GPS-only) feeding a **two-stage global solve** — stage 1 fixes each
   frame's rotation+scale (per-leg chain + GPS Procrustes, scales unified to the
   median: altitude is constant), stage 2 solves ONLY translations (2N sparse LSQ,
   edges + weak GPS priors) with **residual-based edge pruning** (>1.5 m dropped,
   re-solved). Full 4-DoF solve was tried and REJECTED — scale drifted (0.89 cm/px,
   std 3.1) exactly as Grok's translation-focused recommendation predicted.
2. **Sharp compositing**: 12% border crop (lens-distortion zone) + center-feather^14
   (winner-take-most — one frame owns each pixel, soft only at transitions) →
   killed ghost-averaging blur AND parallax double-edges on rooftop equipment.
3. **Per-frame temperature offsets** solved from overlap medians (±4.05 °C found!)
   → strip banding gone; envelope check still PASSES (blend is convex per-pixel).
Result: `mosaic_main_flight_v2.npz` + `qc/mosaic_v2_QC.jpg` + `qc/mosaic_v2_zoom.jpg`
— coherent geometry, crisp drains/pipes/EJ, visible deck-field mottling. Remaining
polish options: per-frame vignette flattening (radial gain), the residual soft
shading gradients, and porting this whole method into worker panorama.py (the
worker's naive chain+average is now obsolete). GSD note: unified scale solved at
2.70 cm/px (finer than the 4 cm assumption — more native detail available).

# Addendum V (2026-07-15) — FULL MOSAIC BUILT (same-day): 251 frames, radiometric, GPS-anchored

`deliverables/mosaic_main_flight.npz` + `qc/mosaic_main_QC.jpg`: the COMPLETE deck,
3097×2232 @ 4 cm/px, 251 frames across 10 serpentine legs, per-leg similarity
chains Procrustes-anchored to per-frame GPS (Grok's pose-graph shape, simplified:
chain-within-leg + GPS similarity fit per leg). **Envelope check PASSED** — every
mosaic pixel is a real °C value inside the source-frame envelope (float32 grid,
NaN outside coverage). 19/241 pair registrations fell back and were rescued by GPS
anchoring. Overlap measured from the GPS track: median 3.61 m forward spacing vs
~20 m frame footprint ≈ **82% forward overlap**; adjacent legs ~7–15 m apart vs
~25 m swath ≈ **40–70% side overlap** — comfortably sufficient (median 393 RANSAC
inliers/pair). Visible in QC: both building roofs w/ HVAC, EJ lines, the central
deck field showing a double row of circular features with surrounding mottled
texture (ANALYSIS DEFERRED per S2 — no claims until drawings arrive).
Queued refinements: per-frame gain/offset seam compensation (visible strip
banding), retry logic for the 19 fallback pairs, and porting the similarity model
into worker panorama.py.

# Addendum U (2026-07-15) — P1 KICKED OFF: decode complete, stitch proven; architect hypothesis H6

## U1. Processing status (local validation lane, tools in .tmp/asu/tools/)

- **Decode: COMPLETE, zero thermal failures.** 102MEDIA = 251 thermal frames (the
  "failures" were MAX_*.JPG — the payload's PAIRED VISUAL camera frames, one per
  thermal shot → free thermal↔visual pairs + potential RGB-assisted registration).
  103MEDIA = 89 thermal + 89 visual. All frames carry GPS (Sun Devil Stadium
  coords) → footprint/auto-pinning enabled. NPZ grids + contact sheets + per-frame
  stats in deliverables/ (T3 artifacts).
- **Stitch: registration model PROVEN.** Full homography chains diverged (nadir
  flight → wrong model); switched to similarity transform (estimateAffinePartial2D,
  scale/translation sanity gates) → 40-frame strip: 37/39 pairs, median 393
  inliers, 3426×1145 clean mosaic, span 1.2–23.2 °C. QC render shows rooftop
  equipment, EJ lines, and a repeating pattern of circular cool spots along the
  deck centerline w/ subtle surrounding mottling (drains? — ANALYSIS DEFERRED per
  S2 until PM drawings arrive; no claims yet).
- **Scale-up path for the full 251-frame mosaic:** stitch per-strip (serpentine
  legs), then cross-strip registration + GPS-anchored global adjustment to kill
  accumulated drift (per-frame GPS makes this tractable). Worker `panorama.py`
  should adopt the similarity model + sanity gates from the spike.

## U2. Hypothesis H6 (the architect's theory — added to the N1 panel)

Architect's theory: the waterproofing membrane under the 4″ topping slab is
failing AND the DRAINS THEMSELVES leak — predicting ~4 ft-radius moisture halos
around drains EVEN WITH NO RAIN (supply = drain leakage, not weather), possibly a
~1/16″ water film, with unknown travel paths. Thermal test: drain-centered
radial-ring ΔT profiles (signature = elevated retained-heat annulus out to ~4 ft,
decaying with radius) + trend vectors for travel. This is a TIGHT-margin
signature — per-finding presentation recipes (I2) + Enhance-here + sigma-relative
local contrast are the required tooling; absolute calibration (verified) lets
halo ΔTs be quoted in real °C. The hypothesis panel now tests RDH H1–H5 + H6,
tagged by evidence like the rest.

# Addendum T (2026-07-15) — processing logistics: where outputs live, QC without a UI, viewer-first order

## T1. Spheres located (corrects S1's "not in folder")

8× DJI onboard-stitched spheres at the ROOT of `.tmp/asu` (`DJI_2026071507…_D.JPG`,
12000×6000 true equirectangular, 07:01–07:04). Standard format — no decoding;
render directly in a sphere viewer.

## T2. Where processing runs and where files land (Brian's "computer closed" question)

- Heavy jobs run on MODAL (cloud). Once dispatched they do NOT need Brian's
  computer on; outputs persist in R2 + DB rows regardless.
- Files do NOT auto-appear in the local folder. The working session (Claude)
  PULLS artifacts into `.tmp/asu/deliverables/` when producing/fetching them —
  so local copies appear whenever a session runs with the machine on, not on
  their own. The authoritative copies are always R2.

## T3. QC WITHOUT a working UI (the unblock for "how do I view results")

Every processing stage emits **flat QC artifacts** — ordinary JPG/PNGs Brian can
double-click in Windows Photos, zero web UI required:
- Stitch QC: the panorama rendered in 2–3 palettes at full span, WITH a legend +
  min/max + a coverage/seam diagnostic image.
- Decode QC: contact-sheet grids (thumbnails w/ per-frame min/max °C).
- Splat QC: turntable-rendered MP4/frames of the reconstruction.
Interactive verification (hover temps, pan/zoom) happens ONLY in the NEW viewer —
never the old UI. Nothing ever needs manual "import": pipeline outputs register in
the DB; the viewer streams from R2 by URL. Brian receives a link, not a file.

## T4. Order of operations (revised: viewer shell EARLY, in parallel)

1. Batch decode + stitch validation (cloud) → flat QC images into deliverables/.
2. IN PARALLEL: build the NEW viewer shell v0 (S3 design mandate, static mockup →
   Brian approval → minimal live shell rendering the real panorama w/ hover+pan/
   zoom + sphere chapter). This is the ONLY interactive surface Brian ever opens.
3. Splat pipeline (GPU) → turntable QC → embedded as a chapter in the NEW viewer
   with proper controls (the old twin UI is never used for this).
4. Analysis pass after PM drawings arrive → analyzed chapter + overlays + PDF.

## T5. Low-flight presentation rule (Brian's confusion concern)

Ground-level thermal frames are DISORIENTING to non-thermographers. Rule: low-
flight frames NEVER appear standalone. They render only as a paired card inside a
finding: location mini-map + the panorama crop (context) + the visual pair +
the close-up, with a caption. Default OFF for the leadership link; Brian decides
per-finding whether a close-up earns its place. If in doubt, leave them out —
they're ground truth for HIS analysis, not necessarily for the audience.

# Addendum S (2026-07-15) — Brian's corrections: dataset roles, staged processing, VIEWER DESIGN MANDATE

## S1. Corrected dataset roles (supersedes R1 assumptions)

- **NO handheld thermal exists.** Drop all handheld-inset items for ASU (O2 stays
  as future capability). Two thermal flights only:
  - `102MEDIA` (502 frames, 100 ft, 2 s interval @ ~2 mph) = THE panorama source.
  - `103MEDIA` (178 frames, few feet AGL) = NOT stitched (ground-level parallax
    makes mosaicking wrong) → role: **pinned detail insets** + spot ground-truth
    for panorama findings. Verified absolute °C.
- **RGB sets are DJI waypoint MAPPING missions** (filenames carry
  `map-plan-…-wp` ids; per-photo .MRK positions): 0015 (381) + 0016 (408) + 0017
  (126, larger area) + 0014 (5 manual context stills) → combine ALL (~920 photos)
  into ONE COLMAP reconstruction for the splat + DEM. Different angles/areas
  combining is exactly right.
- **Spherical panoramas are NOT yet in the folder** (`Panoramic/` is empty; no 2:1
  images anywhere in the sets — all stills are 4:3 5280×3956). DJI's onboard-
  stitched sphere output is a standard equirectangular JPEG → **needs NO decoding**;
  the existing spherical pano viewer renders it interactively as-is. ACTION
  (Brian): copy the DJI panorama JPGs (typically in DCIM/PANORAMA) into
  `Panoramic/`.

## S2. Staged processing (answers "process individually now, analyze after drawings")

YES — the pipeline stages are independent and that's the plan:
- **NOW (no drawings needed):** batch-decode both thermal flights → NPZ; stitch
  validation passes on 102MEDIA (strip/section composition, gain/offset comp);
  COLMAP+splat run on the combined RGB sets; spherical panos viewable on copy-in.
  These are mechanical and slow — get them RIGHT and DONE early.
- **AFTER drawings/context arrive (PM docs, ideally the submitted sloping plan):**
  the analysis pass — moisture detection + recipes + callouts + sq-ft + overlays +
  hypothesis tagging — runs ON the already-stitched panorama. Analysis is a
  display/metadata layer over immutable data (§1b), so re-running it later costs
  nothing and loses nothing.

## S3. VIEWER DESIGN MANDATE (Brian, verbatim intent)

The current viewer is unacceptable for leadership eyes — nobody at ASU sees ANY
existing thermal UI. The ASU link viewer is a **fresh build** and becomes the
design flagship for the whole platform's coming redesign. Bar: "looks like SpaceX/
Tesla built it." Canon for it:
- Cinematic dark canvas; imagery owns ≥85% of the frame; chrome is hairline and
  recedes; one accent; premium typographic hierarchy (large numerals for temps,
  mono microlabels); fluid 150–250 ms eased transitions; every control feels
  physical (sliders drag with inertia-free precision, layers crossfade).
- No-scroll, tab/chapter architecture (locked); collapsible sidebar; toggles +
  opacity sliders; hover/tap temps; mobile parity.
- Process: DESIGN-FIRST — static mockups/preview harness of the viewer shell get
  Brian's approval BEFORE feature wiring; the approved shell then becomes the
  design reference for the platform-wide upgrade.

# Addendum R (2026-07-15) — ASU flight COMPLETE: dataset inventory + execution plan (roles corrected by Addendum S)

## R1. Dataset facts (verified on disk, C:\s360\.tmp\asu — 2,524 files, 19 GB)

| Folder | Contents | Verified |
|---|---|---|
| `102MEDIA/` | 502 × `IRX_*.JPG` — main thermal flight | **Decodes ABSOLUTE °C** (13.1–24.2 on IRX_0500; same Planck set as the validated sample) |
| `103MEDIA/` | 178 × `IRX_*.JPG` — second thermal set | **Decodes ABSOLUTE °C** (19.7–44.5 on IRX_0751) |
| `DJI_202607150603_0015/` | 381 files — RGB splat flight A | `.MRK` per-photo position files present |
| `DJI_202607150618_0016/` | 408 files — RGB splat flight B | " |
| `DJI_202607150638_0017/` | 126 files — third DJI set | |
| `DJI_202607150558_0014/` | 6 files — small set (likely pano shots) | |
| `Low/ Under deck/ Panoramic/ Extra/` | EMPTY placeholders — handheld HIKMICRO + 360 content not yet copied in | |

Entire thermal dataset = FLIR FFF absolute radiometry → calibrated °C moisture
thresholds valid; no Autel-relative caveat needed for this survey.

## R2. Execution decision (vs Grok's "master prompt" approach)

Grok's phased outline is right; two corrections: (1) the interactive deliverable is
NOT a standalone ad-hoc HTML folder — it is built on the repo's real share-viewer
infrastructure (token links, grid streaming, Q&A) so it inherits hosting, security,
analytics, and every spec'd chapter; deliverable OUTPUTS live in R2 + share tokens,
with `.tmp/asu/deliverables/` only as a local archive. (2) Heavy processing runs on
the Modal worker (extract/stitch/analyze at 680-frame scale), not ad-hoc local
scripts — local runs are for validation spikes only.

## R3. Phase plan for the ASU package (order of operations)

P1 batch decode 102MEDIA→NPZ + stitch main radiometric panorama (worker
panorama.py; gain/offset compensation per H-research; MAX_CANVAS review for 502
frames — likely stitch in strips/sections then compose). P2 moisture detection +
presentation recipes + contour callouts on the panorama; sq-ft via drawing scale.
P3 alignments (J3 control points): RDH sheet-33 overlay, RGB ortho (from splat
pipeline) → thermal↔visual slider. P4 GPU worker: COLMAP+gsplat on flights A+B →
splat chapter + DEM slope/ponding layer (P4-addP). P5 the link: no-scroll tabbed
chaptered viewer per spec (raw / analyzed / compare / map+overlay / 3D / 360s /
hypotheses / Q&A) with insignia+branding. P6 PDF with signature block. 103MEDIA +
handheld/360s slot in as insets when copied in.

# Addendum Q (2026-07-15) — market positioning: a NEW BREED of interactive deliverable

Brian's directive: market this as a new platform / new category he has created —
NEW, yet CALIBRATED against proven industry tools, and SUPERIOR in (a) how it
presents evidence and (b) its ability to extract the most sensitive, hard-to-get
data from difficult situations. This refines H0 (which still holds: we are not a
FLIR-suite replacement — we are a NEW CATEGORY: the interactive thermal-evidence
platform).

## Q1. Messaging canon (use these claims; each is backed by a shipped/planned proof)

| Claim | Proof behind it |
|---|---|
| "A new breed of thermal deliverable" | Live radiometric links (hover real temps on a phone), chaptered viewer, hypothesis panel, three-evidence overlays — no incumbent ships any of these |
| "Calibrated against proven industry tools" | flir_fff_decode.py --csv validation vs FLIR Tools (±tolerance, the H4 gate); golden per-brand fixtures; worker↔client ±0.1 °C parity |
| "Extracts what handheld spot-scans can't" | Per-pixel statistical detection (spatial coherence beats eyeball), presentation recipes that make 0.5–2 °C signatures visible, full-coverage panorama vs point samples, differential (post-rain) lens |
| "Evidence, not opinion" | Immutable raw chapter beside every analyzed chapter; capture-time provenance (absolute/relative flags, conditions banner); operator-of-record review of every AI finding |

## Q2. Where the positioning appears (tasteful, not salesy)

- Link intro line under the title: "An interactive thermal-evidence deliverable —
  a new format created by Brian Volker, Level III Infrared Thermographer."
- PDF foreword: one short paragraph — new format, calibrated against
  industry-standard tooling, raw data preserved and inspectable.
- About-the-thermographer card (P6): the platform sentence + contact.
- NEVER: competitor put-downs, "AI-powered" as a headline (AI is a reviewed
  assistant, not the product), or accuracy claims beyond the validated gates.

## Q3. Naming note (decision open)

The deliverable format needs a name Brian can own in conversation ("I'll send you
a ___"). Candidates to decide later: "Live Thermal Report", "Radiometric Live
Link" (already the feature name), or a branded coinage. Publisher brand per N3 =
Slate360. Do not print a placeholder name on ASU deliverables until Brian picks.

# Addendum P (2026-07-15) — 360 pinning, LiDAR verdict, slope layer, business layer

## P1. 360 photos pin EVERYWHERE via one anchor

A 360 is stored once with ONE spatial anchor (auto from the Mini 5 Pro's GPS, else
the J3 point-picker) and then appears on EVERY chapter that shows space: a pin on
the thermal panorama, a pin on the 2D map/drawing, and a floating billboard pin in
the 3D splat (TwinSceneOverlays). Click any of them → the same TourPanoViewer
opens. Same rule for handheld-thermal insets and findings: anchor once, surface
everywhere — this is what makes the chapters feel like ONE model of the site.
Capture-time metadata records that 360s were shot later in daylight (visual
context, not thermal-state evidence) — shown quietly in the inset header.

## P2. Handheld intentional zones — confirmed

Brian will walk covered zones with deliberate high overlap → each becomes a LOCAL
radiometric mini-panorama inset (O2.2). Voice-note or sequence-note the zone per
sweep so insets are labeled.

## P3. Phone LiDAR (Twin 360 capture) — honest verdict

Prior twin captures have been poor and phone LiDAR range is ~5 m, so: NOT useful
for the open deck expanse. Two narrow, optional uses if time permits (never at the
expense of the thermal mission): (a) under-deck covered zones at close range —
local geometry context for the handheld insets; (b) small experimental patches at
EJ/drain locations to probe local ponding depressions. Treat as bonus data;
centimeter-level slope for the whole deck comes from P4 instead.

## P4. **Slope & ponding layer from the daylight 3D flight** (big one)

The COLMAP/splat pipeline's intermediate product is a dense point cloud → DEM →
**per-pixel slope + ponding-basin map of the whole deck**. RDH's central claims
(H3/H4) are NEGATIVE SLOPE — this layer can SHOW it: predicted ponding basins and
downhill flow directions, overlaid against the moisture plumes and drains. Where
predicted ponding ∩ thermal moisture ∩ a blocked drain — that's a three-evidence
overlay no inspection deliverable has ever shown. Scale/level from drawing
alignment + GPS; label as photogrammetric relative topography (good for slope
direction/basins; not a survey instrument). Also yields the **RGB orthomosaic** →
P5. Runs in the same GPU worker slice as J1.

## P5. Panorama-scale thermal ↔ visual slider

The daylight flight's RGB orthomosaic, control-point aligned to the thermal
panorama (same J3 tool, same transform family as the drawing) → the link gets a
thermal↔visual opacity/wipe slider across the WHOLE deck. Stakeholders instantly
see WHERE a plume is ("that's outside concessions 216") without reading a drawing.

## P6. Presentation & business layer (the report IS the business card)

- **Narrated auto-tour:** Brian records a ~90-second voiceover over the executive
  auto-tour (O3.5) — a Level III walking leadership through the findings in his own
  voice. Slideshow/audio support is already in the deliverable plans.
- **"How to read this" explainer:** a collapsible 30-second primer in the sidebar
  (what colors mean, why pre-dawn, what a moisture signature looks like) — written
  for leadership, not thermographers.
- **About-the-thermographer card:** footer panel with insignia, cert, photo
  optional, and CONTACT — tasteful, one card, no sales copy. Multiple inspection/
  commissioning companies will open this link; the deliverable itself is the pitch.
- **Per-stakeholder links + analytics:** issue each party (ASU, RDH, the other
  inspector, the Cx firm) its OWN link (exists: token roles/labels) — the analytics
  glance shows who viewed what and who asked questions; follow up accordingly.
- **Monsoon differential:** July in Tempe = monsoon season. Plan the post-rain
  re-flight (same pattern, same pre-dawn hour) the day after the first storm —
  the difference lens (B3) turns it into the active-leak-path chapter, the
  strongest single piece of evidence in the package.

# Addendum O (2026-07-15) — insignia v2, covered-area strategy, wow-factor additions

## O1. Insignia v2 + color treatment

Fixed the center-text overflow (INFRARED / THERMOGRAPHER now stacked inside the
inner circle; crosshair ticks moved outside it). Color is a RENDER-time choice
(the SVG inherits `currentColor`): recommended **muted gold `#C9A227`** on the dark
viewer — full-strength in the footer credibility block beside the signature,
~15–25% opacity as the large watermark. Gold-on-graphite reads "seal" without
shouting; pure yellow or saturated gold looks cheap — keep it muted. PDF (white
paper): render in near-black or dark gold. Signature PNG (pending Brian's photo)
gets the same dual treatment.

## O2. Covered areas the drone can't see — the HIKMICRO inset strategy

Honest verdict: handheld HIKMICRO frames should NOT be forced into the drone
panorama. Different sensor/resolution/focal length, oblique viewpoints, and
parallax under canopies make orthographic mosaicking unreliable — a visibly warped
patch would undermine the whole deliverable's credibility. But the areas are NOT
lost. Strategy:
1. **Located insets.** Each covered zone gets a pin on the panorama/2D map
   ("Covered area — handheld survey") that opens the handheld capture(s) as a
   first-class viewer: same hover-temps (HIKMICRO decodes absolute — temperatures
   are directly comparable), same measurement/finding treatment. Placement via GPS
   where available or the J3 point-picker.
2. **Local mini-panoramas.** Where Brian shoots a covered zone as a deliberate
   overlapping sweep (same height/orientation, 50%+ overlap), the stitcher can
   build a small LOCAL radiometric panorama for that zone as its own inset —
   fine at room-scale even though a global mosaic isn't.
3. **Coverage map layer** (see O3.1) shows drone-surveyed vs handheld-surveyed vs
   inaccessible, so nothing reads as an oversight.
Capture tips for the walkthrough: perpendicular to surfaces where possible,
consistent distance, let the camera stabilize a few seconds per zone, note the
location per photo (voice note or pattern).

## O3. Wow-factor additions (feasible, high impact — in priority order)

1. **Coverage & confidence map.** A layer/chapter tinting the deck: drone-surveyed /
   handheld-surveyed / not accessible. Instantly answers "did you check everywhere?"
   and reads as rigor, not weakness.
2. **Moisture-area quantification in SQUARE FEET.** Once the drawing overlay is
   control-point aligned, the drawing's scale (sheets are 1/8"=1'-0") gives the
   panorama real-world scale → every suspect region's area computes in sq ft, with
   a rollup table ("~2,340 sq ft of thermal signatures consistent with retained
   moisture across 14 zones"). This is EXACTLY what repair scoping/pricing needs
   and nothing a $20k spot-scan PDF can offer. Also enables an on-viewer scale bar
   + a measure tool in the link.
3. **RDH exploratory-opening pins.** Pin RDH's test/opening locations (report
   Appendix A) on the panorama — leadership sees RDH's point evidence and Brian's
   full-coverage evidence in ONE view, reinforcing the hypothesis panel (N1).
4. **Survey-conditions banner.** Auto-populated ASTM-style conditions block on link
   + PDF: date/time span, ambient, sky, wind, last-rain date, camera, pilot, cert.
   Rigor signal; weather enrichment already exists in the pipeline.
5. **60-second executive auto-tour.** The cinematic chapter opens with an
   auto-playing guided pass (pan across the panorama → zoom to top 3 findings →
   drain overlay fade-in) before handing over interactive control. Leadership gets
   the story in a minute even if they never touch a toggle.

# Addendum N (2026-07-15) — ASU deliverable package: RDH hypothesis panel, signature/insignia, 3D capture plan

## N1. The RDH hypothesis panel (the never-before-seen deliverable)

Extracted RDH's Summary of Findings (report §3.6) — five specific failure claims,
each a TESTABLE HYPOTHESIS for the thermal survey:
| # | RDH claim | Thermal test signature |
|---|-----------|------------------------|
| H1 | EJ wing-flange↔waterproofing tie-in failed (adhesion/loose-laid) | Moisture concentrations ALONG the EJ line |
| H2 | No membrane upturns at walls/interfaces → water into elevator shafts & rooms | Moisture signatures at wall bases / bldg 203+207 interfaces |
| H3 | Negative TOPPING-slab slope → ponding at EJ → water travels into bldgs 203/207 | Plume trend vectors pointing from EJ toward the buildings |
| H4 | Negative STRUCTURAL-slab slope → standing water at membrane (Hydralastic 836 not rated submerged) | Broad diffuse retained-moisture zones adjacent to EJ |
| H5 | Drain installation BLOCKS drainage (membrane lapped over drain mat) | Wet halos AROUND drains (water arriving but not entering) |
Deliverable feature: a **Hypotheses chapter** in the link — each RDH claim listed
with the thermal evidence beside it, tagged **Supports / Neutral / Contradicts**
(operator-assigned; AI proposes via the analyst chat with the RDH PDF as drag-drop
grounding, Brian decides). Language stays evidentiary ("thermal patterns consistent
with…"), never structural conclusions — Brian is the thermographer of record; RDH
remains the engineer of record. This directly answers "offer theories based on an
inspection report that may be right or wrong."
Context anchors for water-travel analysis: EJ line + drains from the sheet-33 red
overlay (proven); RDH says slope is negative TOWARD the EJ — trend vectors that
agree with gravity+slope strengthen findings; ones that don't are flagged for review.

## N2. Signature + Level III insignia (credibility block)

- **Insignia: DRAFTED** — `public/branding/level3-thermographer-insignia.svg`:
  circular professional mark, "BRIAN VOLKER · THERMOGRAPHY / ITC CERTIFIED ·
  NO. 140957677 / LEVEL III INFRARED THERMOGRAPHER", mono/graphite style,
  `currentColor` + opacity-ready for the watermark treatment on the viewer.
  Deliberately a PERSONAL professional mark — not a reproduction of any official
  ITC seal (don't imply ITC issued the stamp itself; the cert number is real).
- **Signature: needs one input from Brian** — a photo/scan of his signature on
  plain white paper (phone photo fine). Pipeline (same white-key technique proven
  on the RDH sheets): key background → transparent PNG → stored in the branding
  profile → rendered in the PDF sign-off block (I3) and, at low opacity beside the
  insignia, in the link footer. RDH's own report closes with two P.E. signatures —
  matching that credibility bar is the point.
- **Placement:** PDF = signature + insignia + name + cert line at the closure page.
  Link = insignia at footer/corner at ~15–25% opacity with the brand logo; both
  per-deliverable togglable (E5).

## N3. Branding recommendation

Use **Slate360** as the publisher brand on the ASU deliverables (legal entity, the
platform story if leadership asks "what is this tool"), with the Level III insignia
carrying personal credibility. Site Walk 360 stays the field-documentation product
brand — a thermography deliverable under a "site walk" brand invites confusion.
Both remain one dropdown away per E5 (profiles: Slate360 / SiteWalk 360 / Unbranded).

## N4. Dual-panorama deliverable (confirmed shape)

Chapter A = **raw radiometric panorama**: neutral palette, full span, hover-temps,
pan/zoom — untouched evidence. Chapter B = **analyzed panorama**: moisture-mask
tint, contour plume callouts + trend chevrons, per-finding presentation recipes,
drain/EJ overlay with opacity slider. Both render from the SAME stitched NPZ —
"analysis" is a display layer, originals immutable (§1b law). A/B toggle or
before/after slider between them is the wow moment.

## N5. DJI Mini 5 Pro 3D capture plan (Brian's fallback if DroneDeploy can't)

Brian's instinct (POI orbits + angled top-down grid + large orbit) is the RIGHT
pattern for Gaussian splatting. Corrections/additions:
- **DAYLIGHT REQUIRED** — 3D reconstruction uses RGB photos; the pre-dawn thermal
  flight cannot double as the 3D flight. Fly 3D in good, even light (morning after
  sun is up; harsh mid-day shadows are worse than gentle morning light).
- Pattern: (1) top-down grid at ~70–80% overlap, gimbal at 45° (not nadir-only);
  (2) 2 orbit rings at different heights/radii around the whole deck; (3) POI
  orbits at key features (EJ crossings, drains of interest, building corners);
  (4) a few context shots of adjacent facades. 150–300 photos total is the sweet
  spot. Keep shutter fast/ISO low; avoid people/moving shadows.
- Gaussian splat > mesh for presentation, agreed (photorealistic, renders in the
  existing Spark viewer). Pipeline = J1 (COLMAP poses → splat, GPU worker) —
  phase-2 after the thermal deliverable unless time allows.

## N6. Q&A loop (already spec'd — confirming it closes Brian's ask)

Stakeholders ask questions pinned to a specific image/finding in the link (E7);
questions land in Brian's per-deliverable inbox; he can consult the analyst chat
(with the RDH PDF + findings as grounding) before replying; replies thread back to
the viewer. No ASU accounts needed. This is the "dialog → filtered through my
thermal analysis program" flow.

# Addendum M (2026-07-14) — PROVEN: a real radiometric file decodes to absolute °C from bytes

Decoded Brian's real file `IRX_0110.JPG` end-to-end in pure Python (no exiftool),
from the raw JPEG bytes. Definitive facts:
- **Make = "FLIR Systems AB"**, 12 segmented FLIR APP1 records → standard **FLIR FFF**
  radiometric format (magic `FFF\0`, big-endian record directory).
- **Full Planck constants present** (params record type 0x20, little-endian interior):
  Emissivity 0.95, Reflected 22.0 °C, R1 1,143,194.6, R2 1.0, B 1476.99, F 1.0,
  O −15,665. Raw image type 0x01 = 640×512 uint16.
- **Absolute temperature 10.1–41.6 °C (mean 36.5)** via the Planck equation —
  physically correct. So this camera's files decode ABSOLUTE with zero heuristics.

Implications:
1. **If tomorrow's drone files are this format** (Make FLIR / segmented FFF), they
   decode ABSOLUTE via extract.py's existing FLIR path — no Autel problem, and the
   calibrated °C moisture thresholds (I2/L3) ARE valid. Run the probe on file #1 to
   confirm Make + FFF presence.
2. **The make-routing gap (L2) is real and now concrete:** IF an Autel body writes
   Make="AUTEL" while embedding FLIR FFF data, `detect_sensor` sends it down the
   heuristic path and THROWS AWAY recoverable absolute temps. Fix: when FFF/Planck
   data is present, decode via Planck regardless of the Make string.
3. **New tool shipped:** `workers/modal/thermal-analysis/flir_fff_decode.py` — a
   pure-Python FLIR FFF decoder (no exiftool dependency). Doubles as (a) a robustness
   fallback / the standalone-app decoder, and (b) the golden-fixture VALIDATOR:
   `--csv <FLIR Tools per-pixel export>` compares our decode to FLIR Tools within a
   tolerance (default ±0.5 °C) — this is the scientific-validity gate artifact (H4).

## What would actually help from FLIR Tools (Brian offered)

- **YES, high value:** a **per-pixel temperature CSV export** of ONE file from FLIR
  Tools (Tools can export the radiometric matrix to CSV), plus that same original
  JPG. Feeds `flir_fff_decode.py --csv` to PROVE our decoder matches FLIR to a
  fraction of a degree — the decode-accuracy gate. Also: one **sample FLIR Tools PDF
  report** as a visual quality bar for our report rework.
- **NOT needed:** FLIR Tools binaries/DLLs (proprietary, not liftable) — we decode
  natively, just proven. The earlier 19-screenshot FLIR teardown already covers UI.

# Addendum L (2026-07-14) — Autel decode path (real code) + a correctness rule for moisture thresholds

Read the actual `extract.py` Autel path. Findings + one important correction that
affects every downstream moisture number.

## L1. What extract.py actually does with an Autel file (verified)

`detect_sensor` (:50) routes Make=AUTEL → profile "autel". `extract_raw_matrix`
(:216) tries HIKMICRO's post-EOI block first (miss for Autel), then pulls the first
exiftool binary tag >1KB from `["ThermalData","EmbeddedImage","RawThermalImage"]`
(:93). If NONE exist → `is_radiometric:False`, **no grid at all** — the real
make-or-break risk for tomorrow. If a block exists it's read as uint16 → reshaped to
640×512 → `autel_raw_to_celsius` (:123): with an ambient tag it spreads raw counts
±~20 °C around ambient via `(raw-median)*(40/span)`; without ambient it returns raw
counts. **Always `absolute_celsius=False`, parser `autel_ambient_delta`.**

## L2. Opportunity: try FLIR Planck decode on Autel files

Some Autel dual-sensor bodies embed FLIR-style radiometric data (which is why FLIR
Tools reads them). `extract.py` never tries the Planck path for Make=AUTEL. **Fix
(small, additive):** in `convert_raw_to_celsius`, for the autel branch, attempt
`flir_raw_to_celsius` first when PlanckR1+PlanckB tags exist — that yields ABSOLUTE
°C, strictly better than the heuristic. The test probe
(`workers/modal/thermal-analysis/test_autel_decode.py`) checks for this and reports it.

## L3. CORRECTNESS RULE — absolute vs relative thresholds (amends I2 + Grok's calibration)

Grok's `calibrated_moisture_probability` maps ΔT in **absolute °C** (1.0–3.5 °C) to
probability. **That is only valid on absolute-calibrated grids (HIKMICRO, DJI, FLIR-
Planck).** On a RELATIVE Autel grid the °C values are a synthetic ±20 °C spread with
arbitrary scale — a "2 °C" reading is not 2 °C, so absolute thresholds are
meaningless there. Rule the detector MUST follow:
- **Absolute grid** (`absolute_celsius=True`): use the calibrated °C thresholds.
- **Relative grid** (`absolute_celsius=False`): use SIGMA-relative thresholds only
  (n × robust local sigma), never fixed °C, and stamp every finding/report/link
  "Relative ΔT only". The existing detector floor `max(min_delta_c, 1.5*sigma)` must
  DROP the `min_delta_c` term when the grid is relative.
- Local-contrast moisture detection itself works on both (the mapping is monotonic,
  and moisture is a local anomaly) — only the CALIBRATION differs.
This is a per-finding provenance requirement: store `absolute_celsius` +
`parser_id` on every capture and gate threshold logic + report language on it.

## L4. Pre-flight test (ready now)

`workers/modal/thermal-analysis/test_autel_decode.py` — run on ONE original R-JPEG
after the flight: prints make/model, which binary block (if any) is present, whether
Planck constants exist, the decoded grid shape + min/mean/max, absolute-vs-relative,
and the correct detector path. If it reports "NO extractable thermal block" but FLIR
Tools reads the file, the data is in a proprietary segment exiftool doesn't surface
as a named tag — bring the file + the FLIR Tools reading and we locate the offset.

# Addendum K (2026-07-14) — drawing-overlay pipeline PROVEN on the real RDH file

Ran the extraction against the actual RDH deliverable ("Final Rev 33040.000 … Sun
Devil Stadium EJ Investigation.pdf", 39 pages). Confirmed, not theorized:
- **Sheets 33–35 are the sun-deck EJ/drain plans** (SAF Level 150, HNTB base), TRUE
  VECTOR — sheet 33 alone has 49,027 vector paths (`re`/`l`/`c`/`qu`). Report body
  (pp. 1–32, 36–39) is narrative + photos (drain 90 hits, waterproof 117, membrane
  35, expansion-joint 36). Legends on sheets 34–35.
- **Color-separable layers.** Black = HNTB architecture; **RED (≈129k px on sheet 33)
  = RDH's investigation markup** — dashed callout boxes w/ leader lines + the EJ line;
  blue = zone highlights; green = notes. So the overlay can isolate JUST RDH's
  findings layer, or show full linework, by stroke color.
- **Extraction method that works (proven):** render page at 3× → key out near-white
  to transparent → optional per-color isolate. Output = RGBA PNG (full linework +
  red-markup-only), 9072×6480. This is simpler and preserves exact CAD colors better
  than re-rendering `get_drawings()` geometry; keep `get_drawings()` only if
  semantic per-path filtering is later needed. Sample assets:
  `docs/audit/asu-overlay-samples/`, working extractor pattern in this addendum.
- **Geometry is compatible:** these are top-down plan views; a pre-dawn top-down
  drone thermal panorama aligns to them via the J3 control-point affine (3–4 points:
  building corners / stair cores / the EJ line). Confirms I1's control-point choice
  over feature matching.
- **Extractor belongs in the Modal worker** as `extract_drawing_overlay(pdf, page,
  mode="full"|"color", color=…)` → RGBA PNG to R2, consumed by the share viewer's
  opacity-slider layer (I1). Ship it in the PAN/overlay slice.
- **Note on the thermal SAMPLE image:** the shared JPG is a false-color PREVIEW
  (Iron palette, oblique facade) — decoding real per-pixel °C still requires the
  ORIGINAL radiometric file through Modal `extract.py`, not the rendered preview.

# Addendum J (2026-07-14) — 3D photogrammetry, 360 embedding, prompt-driven pinning

Answers to Brian's oblique-photogrammetry + 360-embed questions. These are POST-W4
capability tracks (not in the frozen G4 desktop roster) EXCEPT the shared
point-placement mini-UI (J3), which lands with the drawing-overlay work (PAN slice)
because three features depend on it.

## J1. Oblique-drone photogrammetry → 3D model in deliverables

Feasible, but it is its own pipeline, not a thermal-worker add-on:
- **Reuse the EXISTING Twin 360 cloud pipeline where possible.** Slate360 already
  runs cloud Gaussian-splat reconstruction (Trigger → Modal GPU) for digital twins;
  output is rendered by the shipping R3F/Spark viewer (splat + glTF/GLB). A folder of
  overlapping 45° oblique JPEGs is a valid photogrammetry input.
- **The missing middle step = camera poses.** Splat/mesh reconstruction needs per-image
  camera poses. iPhone twin capture supplies ARKit poses; a raw drone photo set does
  NOT — so a **COLMAP (SfM) pose-estimation stage** must run first (structure-from-
  motion → sparse poses → dense/splat). COLMAP is open-source (BSD) but GPU-hungry;
  this requires a **GPU Modal worker** (thermal is CPU-only today).
- **Recommendation:** treat 3D as a **separate post-ASU capability slice** ("3D-1:
  drone-photo → COLMAP poses → Gaussian splat, rendered as a deliverable chapter").
  For the ASU deadline, ship the thermal panorama + drawing overlay first; add the 3D
  chapter after. Deliverable integration itself is easy — the twin share viewer +
  chapter container (B1) already render a 3D model beside thermal chapters.
- **Effort:** COLMAP+splat GPU pipeline = large; deliverable embedding = small
  (components exist).

## J2. 360 spherical photos embedded on the panorama / 3D model

The rendering half is BUILT: the Tour 360 system already has a pano viewer
(`TourPanoViewer`) and a plan-sheet pin system. Embedding a 360 as a clickable
hotspot on the thermal panorama (2D) or as a billboard pin in the 3D scene
(`TwinSceneOverlays`) reuses those. What's new is only WHERE the pin sits (J3).

## J3. Prompt-driven pinning WITHOUT a drag UI — the honest answer + the fix

Placing pins precisely by prompt alone is fragile. Two real paths:
1. **GPS auto-placement (best when data has GPS).** DJI Mini 5 Pro geotags photos;
   if the thermal panorama stores a **geographic footprint** (corner lat/lons —
   which the stitch can record when source frames are geotagged), then every 360's
   pin position is COMPUTED from its GPS with zero manual placement. Same transform
   georeferences finding pins and the drawing overlay. This is the clean prompt-only
   path and the reason GPS persistence (currently a gap) is now P1.
2. **Shared point-placement mini-UI (the pragmatic win).** A tiny reusable
   "tap N points on this image" tool — 2 minutes of clicking — serves THREE features
   at once: drawing-overlay control points (I1), 360-hotspot placement (J2), and
   manual finding pins. This is far more reliable than prompt-typed coordinates and
   trivial to build. **Build it once (J3) with the PAN/drawing-overlay slice**; it is
   the correct answer to "everything through prompts" for spatial placement — the ONE
   place a 30-second click beats any prompt.
- **Verdict:** GPS auto-placement where GPS exists; the mini point-picker everywhere
  else. Pure-prompt coordinate typing is the fallback of last resort, not the plan.

## J4. Priority for the ASU deadline (few days)

In order: (1) thermal panorama stitch of the pre-dawn flight; (2) moisture/anomaly
detection with per-finding presentation recipes (I2); (3) drawing overlay of the RDH
drain PDF with opacity (I1) via control points (J3 mini-UI); (4) share-viewer upgrade
(zoom/pan/layers/hover/before-after) + mobile parity; (5) branded PDF with signature.
360 embedding and the 3D model are phase-2 (after ASU) unless time allows.

# Addendum I (2026-07-14) — Grok collaboration round: drawing overlay, presentation recipes, signature, mobile parity

New items from Grok's gap analysis + Brian's deliverable requirements. These amend
existing G4 slices (owners noted); the frozen order is unchanged.

## I1. Drawing/layout overlay pipeline (owner: PAN slice + share viewer work)

Brian has consultant drawings (e.g. RDH drain layout for the ASU sun deck) to lay
over the thermal panorama as a toggleable layer:
- **Extraction (backend, prompt-driven):** new Modal helper that takes a PDF/image
  drawing and outputs a TRANSPARENT overlay of linework only (no paper background):
  PyMuPDF vector extraction where the PDF is vector; luminance-keyed alpha matte
  fallback for raster scans. Output: PNG-with-alpha (+ optional SVG) in R2.
- **Alignment: control points, NOT feature matching.** CAD linework and thermal
  imagery share almost no visual features — SIFT/ORB alignment will not work.
  Owner picks 3–4 corresponding points (drawing ↔ panorama) in a small alignment
  UI; affine transform computed client-side, stored in metadata. Reusable pattern:
  the walks-with-plans percent-coordinate math.
- **Delivery:** the share viewer renders the overlay as a layer with an on/off
  toggle AND an opacity slider (drains sit exactly where the plumes point — the
  ASU money shot). `layer_config` on the token already reserves the storage.

## I2. Per-finding presentation recipes (owner: S6/AI Review + report/link rendering)

Brian's requirement: the pixels/palette/scale must be ADJUSTED so each finding
actually SHOWS. A finding stores not just what/where but HOW TO SHOW IT:
`presentation: { palette, span_lo, span_hi, isotherm?, local_contrast? }` —
auto-computed at detection time (span tightened to the anomaly region ±2 °C,
palette chosen for the pattern class), operator-overridable from Analyze ("Save
this view for the finding"). Reports render each finding crop WITH its recipe;
the share viewer applies the recipe when a finding is selected (and animates
span back to global when deselected). This is the Enhance-here concept promoted
into the deliverable.

## I3. PDF branding completeness (owner: S7)

Branding profile gains a **signature block**: signature image (transparent PNG) +
name + cert line (ITC #) rendered at the report footer/sign-off page, above the
existing disclaimer. Logo header already exists in report.py; add header-band
placement option. Every element individually togglable per E5/E6.

## I4. Share links: mobile parity is REQUIRED, not optional (owner: S7.5)

The link is one responsive web page — same URL on desktop and phone. Desktop:
tabs/chapter rail + collapsible sidebar + hover temps. Mobile (≤768px): chapter
rail becomes a bottom tab bar; sidebar becomes a drag-up bottom sheet; hover-temp
becomes tap-and-hold probe; pinch zoom/pan on the grid canvas; slider handle
sized 44pt. The existing 390px audit (Addendum B) is the acceptance gate. No
app install, no desktop-only fallback.

## I5. External research handed to Grok (tracked)

Grok is researching: Autel EVO makernote absolute decode; the
rudrakshkapil/Integrated-RGB-Thermal-orthomosaicing repo (license + liftable
co-registration); radiometric-safe seam blending; moisture-detection algorithms
(ASTM C1153-style + spatial-coherence classifiers); PDF linework extraction
recipes. Results land as future amendments — do NOT block G4 slices on them.

# Addendum H (2026-07-10) — critique round 2: R1 appendix, second P0 fixed, honesty cuts, positioning

## H0. Positioning statement (read first, every session)

Thermal Studio's target is to be **the most trustworthy, easiest construction-oriented
thermal-evidence workflow**: vendor-neutral import → honest radiometric analysis →
human-reviewed AI explanations → branded reports → interactive radiometric client
links → permanent project record. It does NOT aim to out-FLIR FLIR on batch depth,
camera-vendor integration, calibration labs, or predictive-maintenance routes. No doc,
pitch, or slice may claim otherwise. Scope-creep toward "beat everyone at everything"
gets rejected in review.

## H1. Second P0 — session metadata erasure: CONFIRMED AND FIXED (2026-07-10)

`lib/thermal/job-callback.ts` `refreshSessionSummary` wrote `metadata: {last_job_id,
…}` as a REPLACEMENT object on every completed processing job — erasing
`motion_requests`, `ai_interpret` status, and any operator fields (summary_metrics
merged `...prior`; metadata didn't). Fixed: prior metadata is now selected and
spread. Residual risk (accepted, documented): read-modify-write races between
concurrent callbacks remain until R1 adds jsonb-merge semantics; single-operator use
makes this low.

## H2. R1 engineering appendix (the paragraph becomes a spec)

**Files:** `app/api/ops/thermal/jobs/route.ts` (dedupe + accept-then-processing),
new `app/api/ops/thermal/jobs/reconcile/route.ts` (sweep; called by a Vercel cron),
`lib/thermal/job-callback.ts` (partial-failure semantics; jsonb-merge for session
metadata), `app/api/ops/thermal/interpret/route.ts` (+job row; job_type
`interpret` added to the existing jobs table — additive), V2 `lib/*-api.ts` ×3
(surface failures), `components/thermal-studio-v2/` Saved-chip error state, V1
`ThermalProbeViewer` save-failure toast port (small, V1-protection).
- **Dedupe key:** `sha256(org_id + session_id + job_type + sorted(capture_ids) +
  params_json)` stored on the job row (additive column `dedupe_key` + partial unique
  index where status in (queued, processing)); POST returns the existing row with
  `{deduped: true}`.
- **Reconciler SLA:** sweep every 10 min; `queued` > 15 min without dispatch-accept
  OR `processing` > 45 min without a callback progress event → `failed` with
  `failure_reason` ("worker unresponsive — Retry"). Retry = new job (new dedupe key
  via attempt counter).
- **Accept-then-processing:** job stays `queued` until Modal's dispatch POST returns
  2xx; non-2xx → `failed` immediately with the response text.
- **Callback retry (worker side):** Modal callback POSTs retry 3× exponential (worker
  change, follow DEPLOY.md); reconciler is the net beneath it.
- **Chaos matrix (e2e/thermal-v2-r1-reliability.spec.ts + manual checklist):**
  double-click Run; dispatch 500; kill worker mid-job; callback dropped; PATCH 500
  (red chip + retry); concurrent job on same session; partial n-of-m failure.

## H3. Metering contradiction resolved (S6-CR vs B4)

Final rule: **the metering CODE (pre-flight balance check, idempotent debit) ships
WITH S6, wired but gated behind `THERMAL_AI_METERING_ENABLED` (default false).**
Personal/CEO use runs unmetered by design (B4); the worker USD ledger cap stays as
the cost backstop. "AI is never unmetered" applies to any NON-CEO exposure and is
enforced by S9 gate #6 (flag review is a blocking checklist item). Both earlier
statements are amended to this.

## H4. Gate-artifact registry (G6 gates now have named artifacts + owners)

| S9 gate | Artifact | Created by |
|---------|----------|------------|
| Chaos/reliability | `e2e/thermal-v2-r1-reliability.spec.ts` + checklist in this doc (H2) | Slice 1 (R1) |
| Golden radiometric fixtures | `workers/modal/thermal-analysis/fixtures/` (1 real file/brand) + `e2e/thermal-v2-golden-decode.spec.ts` (min/max/center ±0.5 °C vs vendor-tool readings; worker↔client parity ±0.1 °C) | Slice 9 (W2+CAM-1) |
| Share-token audit | `docs/audit/THERMAL_SHARE_TOKEN_AUDIT.md` (expiry, scope, revocation, enumeration, org isolation) | Slice 7 (S7.5) |
| AI false-positive review | Brian runs S6 on a REAL inspection set DURING slice 4 (not at S9); results + accepted thresholds recorded in `docs/audit/THERMAL_AI_REVIEW_BASELINE.md` | Slice 4 (S6) |
| Sign-off/analytics | Live Link sign-off = name + timestamp + content-hash recorded server-side, shown in the owner's deliverable row; analytics = per-chapter view events (open, dwell, question) — acceptance in S7.5 push 3 | Slice 7 (S7.5) |

## H5. Honesty cuts + orphan claims (effective immediately)

- **Twin overlay/align and SAM refinement are STRUCK from the product surface** until
  genuinely built: no Deliver promise, no pitch line, no UI affordance. The Modal
  align endpoint is a GPS stub; SAM is a stub. The `metadata.alignment` schema hook
  stays (harmless), but nothing user-visible references twin alignment. Any future
  revival is its own post-W4 slice.
- **Autel honesty:** decodes that are not absolute-calibrated render a quiet
  "Relative ΔT only — not absolute temperature" banner in Analyze + reports/links
  (flag carried in `sensor_profile`; worker sets it). Owner: slice 9.
- **Upload/R2 orphan cleanup** stays out of the roster (cost, not correctness) —
  logged as a post-W4 backlog item; do not silently drop it from this doc.
- **⌘K command palette:** owner W1 (slice 3) — §0 canon already promises it.
- **F3 `asset_tag` (recurring inspections, helps P4):** optional free-text asset tag
  on sessions + a Library filter; additive column; owner slice 6 (TS-PROJ). Full
  asset/route management stays OUT of scope (H0).

## H6. Checkpoint discipline (epic rows)

For multi-push rows (S7.5, S5.6, S6, S7, PAN): each named push has its OWN
acceptance list and gates and lands as its own commit+push; a later checkpoint may
not start until the previous one's acceptance passed in the preview. A slice is
reported "done" only when all its pushes are. This is the merge-gate answer to
"epics disguised as prompts" — few conversations, many verified landings.

# Addendum G (2026-07-10) — external-critique response: reliability track, FROZEN roster, S9 gates

Two external AI audits (relayed by Brian 07-10) reviewed the plan and product. Verdict
on their findings, what was fixed same-day, and the FINAL FROZEN roster. **G4's roster
supersedes F2. After this addendum the order is FROZEN — no chat may reorder it again
without Brian's explicit instruction.**

## G0. Critique intake — accepted / fixed / rebutted

**FIXED same-day (2026-07-10):**
- **P0 schema landmine — CONFIRMED AND FIXED.** Prod `thermal_captures` had NO
  `metadata` column, yet the capture PATCH route selects/updates it — every per-image
  save (spots/tuning/findings/palette/curation) failed, and client `.catch(() => {})`
  swallowed the failure. Applied additive migration (jsonb default '{}') to prod +
  recorded `supabase/migrations/20260710120000_thermal_captures_metadata.sql`.
  Lesson institutionalized: preview harnesses mock fetch, so **every slice that
  touches persistence must include one un-mocked round-trip check against the real
  route** (curl or e2e) — added to the per-slice gates.

**ACCEPTED → became the R1 slice + gate changes (G2/G3):** no job dedupe on POST
/jobs; no stuck-job reconciler; job marked processing before Modal accepts; partial
capture failure still completes sessions; interpret has no job row/Realtime; silent
`.catch(() => {})` in V2 save paths (3 confirmed: spots-api, tuning-api,
findings-api); zero thermal e2e files despite the plan citing them; roster churn
(now frozen); differentiators scheduled too late (now moved up); S9 held with no
dated criterion (now gated, G6); app track as a distraction (now deferred until
desktop W4 green — matches Brian's separate-project decision); V3 doc IA conflict
(now marked historical).

**REBUTTED (with code facts):** "§1b radiometric live recompute may be physically
false — UI only recolors." Incorrect for V2: client-side per-pixel recompute from
the NPZ grid is SHIPPED (S5) — `tuneTemps` in `lib/thermal/radiometric.ts`, wired
through `useAnalyzeImage`, and cursor/loupe/measurements/legend/histogram all read
the recomputed grid. What IS fair: it must be provably consistent with the worker's
math and honest about scope. → G5 adds a **worker↔client parity test** (golden
fixtures, ±0.1 °C) and labels the approximation honestly: emissivity/reflected-temp
correction is exact under the gray-body model; distance/humidity atmospheric terms
are display-consistent approximations pending re-extract.

**NOTED, resolved by the swap itself:** V1 findings (858-line probe viewer, dead
components, layout scroll conflict, hardcoded palette, amber/hex drift) live in
`components/ops/thermal/**`, which S9 deletes wholesale. V1 gets ONLY the P0 schema
fix (its saves work now too) — no other V1 investment.

## G1. New slice **R1 — "Never lie" reliability pack** (BUILD FIRST, before any UI)

- **Save failures are visible:** replace the three silent catches — failed PATCH →
  red "Not saved — Retry" state on the global Saved chip + toast; queued retry with
  backoff; unsaved-changes guard on tab/image switch.
- **Job dedupe:** POST /jobs returns the existing active job for (session, type,
  scope-hash) instead of creating a duplicate; disable-while-pending stays in UI.
- **Stuck-job reconciler:** a sweep (API route + cron) marks jobs `processing`/
  `queued` older than a threshold with no callback as `failed` with a reason;
  UI shows failure honestly with a Retry action.
- **Accept-then-processing:** mark `processing` only after Modal 200-accepts the
  dispatch; dispatch failure → `failed` immediately, not orphaned.
- **Partial-failure semantics:** a session with n-of-m failed captures shows
  "m−n processed · n failed · Retry failed" — never a clean "complete".
- **interpret gets a job row** → Realtime progress like every other job type (kills
  the sleep-then-refresh hack).
- *Accept:* kill Modal mid-job → row fails with reason within the sweep window;
  double-click Run → one job; unplug network → red chip + retry recovers; e2e spec
  `e2e/thermal-v2-r1-reliability.spec.ts` green.

## G2. Test-first gate (per-slice, hard rule)

A slice is NOT done without its Playwright spec landing in the same push
(`e2e/thermal-v2-*.spec.ts`) plus one un-mocked persistence round-trip. Golden
radiometric fixtures (one real file per brand, expected min/max/center-pixel temps)
land with W2+CAM-1 and gate decode accuracy forever. W4 becomes the cross-journey
sweep — not the first time tests exist.

## G3. Sequencing principle — differentiators before deep parity

The wedge (AI Review + reports + Live Link deliverables) moves ahead of Analyze
parity packs: incumbents already win on deep analysis tools; nobody matches an
explained-AI + interactive-live-link vertical. Analyze parity (S5.6, S6.5) follows
so Level III users don't switch back — but the demo-able vertical exists first.

## G4. THE FROZEN ROSTER (supersedes F2 — FINAL, no further reordering)

Big slices ship in **named pushes** (checkpoints with their own gates) so nothing
merges half-finished, but each row remains one Sonnet prompt/conversation:

| # | Slice | Contents (pushes) |
|---|-------|-------------------|
| 1 | **R1** | Reliability pack (G1): visible save failures, job dedupe, reconciler, accept-then-processing, partial-failure, interpret job row |
| 2 | **L1+W3** | Layout restructure + polish (D3/C1): kill duplicate strip, ⋯ menu, one-pill, viewer ≥60%, Saved chip (now with R1's error state) |
| 3 | **W1** | Workflow foundations: dbl-click→Analyze, drop-anywhere + import tray, selection grammar, two peer verbs, Match look, palette persist+seed |
| 4 | **S6** | AI Review tab: run UX + context popover, triage queue, Accept/Edit/Dismiss, explanations, metering flag OFF (pushes: run+queue / review UI) |
| 5 | **S7** | Reports (pushes: Quick Report + auto-fields/TOC → template gallery + field-level editor + branding profiles) |
| 6 | **TS-SD + TS-PROJ** | SlateDrop folder + deliverable registration + open-from + project picker |
| 7 | **S7.5** | Deliver (pushes: saved-deliverables home + 4-step composer → Radiometric Live Link + per-link branding/No-logo → cinematic + Q&A) |
| 8 | **S5.6** | Analyze completion pack (pushes: polygon/Δ/line-profile → alarms suite → Enhance-here/contrast/sweep/flicker + rotate/flip) |
| 9 | **W2+CAM-1** | View-original, Focus, filters + per-brand golden fixtures, badges, voice notes, display-only fallback (scientific-validity gate) |
| 10 | **S6.5** | Compare synced, fusion blend+PiP+edge, normalize-across-set, cross-image trend |
| 11 | **S8.5** | Export engine + batch recipes + rename + watermark + full-grid CSV |
| 12 | **S6.6** | Analyst chat (worker `chat` endpoint, proposal cards, drag-drop grounding) |
| 13 | **S8-M** | Motion: Timelapse Builder + Video Trim |
| 14 | **MAP-1** | Location layer |
| 15 | **PAN** | Panorama: stitch, tiles, contours/trend, difference lens |
| 16 | **W4** | Cross-journey walkthrough + fix pass (specs already exist per-slice; this is the sweep + interaction bars) |
| 17 | **S9** | THE SWAP — gated, see G6 |

**App track (A0–A6 + B5): DEFERRED until desktop W4 is green** — and it is a
separate future project per Addendum E9. Do not start it from s360 chats.

## G5. §1b honesty clause (amends the law, doesn't weaken it)

Emissivity/reflected-temp edits recompute per-pixel temps exactly (gray-body model,
client-side, shipped). Distance/humidity/atmospheric fields are display-consistent
approximations until a re-extract job runs (queued lazily, results reconciled).
The UI never claims more than this; the worker↔client parity test (±0.1 °C on golden
fixtures) lands with slice 9 and runs in CI thereafter.

## G6. S9 go/no-go gates (replaces "held indefinitely")

S9 executes only when ALL are true, then within 2 weeks of Brian's sign-off so the
dual codebase cannot drift indefinitely: (1) W4 green including P1–P7; (2) golden
radiometric fixtures green; (3) R1 chaos checks green; (4) share-token authorization
audit done (expiry, scope, revocation verified); (5) AI false-positive review on a
real inspection set (Brian judges); (6) **metering/entitlement review** — the
THERMAL_AI_METERING_ENABLED flag MUST be revisited before any non-CEO exposure;
(7) Brian's explicit written approval. V1 (`components/ops/thermal/**`, ~600 lines
dead code included) deletes in the same slice.

## G7. Doc hygiene

`docs/design/THERMAL_STUDIO_REDESIGN_V3.md` is HISTORICAL (useful diagnosis, wrong
IA — 3-tab model lost to the locked 5-tab). A banner marks it non-executable. The
authoritative stack: LOCKED doc (laws) → V2.1 (parity) → V2.2 review (critique/
personas) → THIS file, newest addendum wins, G4 roster frozen.

# Addendum F (2026-07-10) — condensed roster (superseded by Addendum G) + competitor gap pack

## F1. Competitor gap pack — basics FLIR Thermal Studio / Testo IRSoft / Fluke have

Swept against the incumbent desktop suites; these are table-stakes items we were
missing. Each is assigned to an existing roster slice (no new prompts):

1. **Embedded voice annotations** (FLIR/HIKMICRO cameras record voice notes into the
   image file): parse on import, show a play button row in Notes & photo data.
   → owner CAM-1 (worker extract) + W2 (playback row).
2. **Rotate / flip** (drone + handheld orientation): non-destructive 90° rotate and
   H/V flip in the Analyze ⋯ menu, stored as metadata, applied at render (grid AND
   overlays rotate together). → owner S5.6 pack.
3. **Fusion modes beyond blend**: Picture-in-Picture (thermal window on the visual
   photo, draggable/resizable) and edge-overlay (visual edges extracted onto the
   thermal, MSX-style) alongside the blend slider. → owner S6.5.
4. **Report auto-fields + one-click Quick Report**: templates support auto-fields
   (date, inspector name + cert from branding profile, project, page x/y, image
   filename/timestamp) and a TOC/summary page; AI Review gains **"Quick report (n
   accepted)"** — one click → draft PDF from accepted findings using the default
   template. → owner S7.
5. **Export completeness**: optional branding/watermark overlay on exported PNGs;
   **full-grid radiometric CSV** (per-pixel temps) beside the measurement CSV.
   → owner S8.5.
6. **Batch rename** with a pattern ("{project}-{date}-{n}") on any selection.
   → owner S8.5 (with batch recipes).
7. **Cross-image spot trend**: a named spot that exists on multiple images (via
   match-look propagation) can plot avg/max across the set — the static-set cousin
   of the timelapse region trend. → owner S6.5.

## F2. CONDENSED ROSTER — ⚠️ SUPERSEDED by Addendum G §G4 (do not build from this table)

Merges (same files, compatible scope): L1+W3 (restructure IS polish), S5.5p2 folded
into S5.6 (one Analyze completion pack), W2+CAM-1 (two small independent halves),
B1 folded into S8.5 (batch outputs). App: A3 folded into A2. **Desktop 16 (15 + held
swap) · App 6 · Total 22 prompts (21 buildable now).**

| # | Slice | One prompt implements |
|---|-------|------------------------|
| 1 | **L1+W3** | Layout restructure + polish: delete duplicate strip, toolbar de-noise + ⋯ menu, one-pill rule, viewer ≥60%, slider+type-in pairs, token/density/micro-interaction audit, ← breadcrumb, Esc cascade, Scope ✕, global Saved ✓ chip |
| 2 | **W1** | Workflow foundations: dbl-click→Analyze, global drop target + import queue tray (E1), selection grammar everywhere (E1), two peer verbs (E2), **Match look** (E3), palette persist, sticky mini-summary |
| 3 | **S5.6** | Analyze completion pack: polygon tool UI, Δ-compare, line profile, alarms (above/below/interval/dew-point/insulation), Enhance-here, local contrast, isotherm sweep, A/B flicker, rotate/flip (F1.2) |
| 4 | **MAP-1** | Location layer: Library Grid⇄Map (Leaflet+OSM), pin-select→Scope, Analyze mini-map, panorama footprint (D2) |
| 5 | **W2+CAM-1** | View-original (O), Focus (F), analyzed/not filters, voice-note playback (F1.1) + camera fixtures per brand, auto-recognition badges, display-only fallback, NO picker (D1) |
| 6 | **S6** | AI Review tab: run UX (button + context popover), triage queue, Accept/Edit/Dismiss, explanations, metering flag OFF (B4) |
| 7 | **S6.6** | Analyst chat: grounded Q&A, revision proposal cards, drag-drop PDF/image grounding, worker `chat` endpoint (C5) |
| 8 | **S6.5** | Compare (synced pan/zoom), fusion (blend + PiP + edge overlay, F1.3), normalize-scale-across-set, cross-image spot trend (F1.7) |
| 9 | **S7** | Report builder: WYSIWYG sheets, template gallery + field-level template editor (E6), auto-fields + TOC + Quick Report (F1.4), branding profiles (E5) |
| 10 | **TS-SD + TS-PROJ** | SlateDrop Thermal folder, deliverable registration, open-from-SlateDrop, project picker |
| 11 | **S7.5** | Deliver tab: saved-deliverables home + 4-step composer w/ content layers (E4), link container/chapters (B1-addB), Radiometric Live Link, cinematic, Q&A UI (E7), per-link branding incl. No-logo (E5) |
| 12 | **S8-M** | Motion: Timelapse Builder + Video Trim time-ruler editors (D4) |
| 13 | **S8.5** | Export engine: clean/annotated PNG (+watermark option), CSV (+full-grid CSV), JSON, ZIP, batch recipes, batch rename (F1.5/6) |
| 14 | **PAN** | Panorama: stitch job, tile pyramid + grid chunks, contour/trend callouts, difference lens, map footprint (B2/B3) |
| 15 | **W4** | End-to-end walkthrough + fix pass, P1–P7 specs green, measured interaction bars (D7) |
| 16 | **S9** | THE SWAP — HELD until Brian approves |

App (separate future project, cold-start per E9): **A0** scaffold/IAP shell → **A1**
Files + offline viewer → **A2** decode + measurements + bottom sheets + save/export →
**A4** reports + StoreKit → **A5** AI credits + Assistant → **A6** store readiness +
B5 branding editor + 390px audit.

# Addendum E (2026-07-10) — import/selection grammar, match-look, deliverable composer, template editor, link branding

Fresh-eyes flow audit per Brian. These AMEND existing roster slices (owners noted) —
the D8 roster count is unchanged.

## E1. Import & file handling (owners: L1 + W1)

- **Global drop target:** dropping files ANYWHERE in Thermal Studio imports them
  (full-window dashed overlay on dragenter, per §0 canon). Also: Import button →
  OS picker (multi-select + folders), and SlateDrop import modal (exists).
- **Import queue tray:** a bottom-right toast-tray during import — per-file rows with
  progress, brand badge on completion (Radiometric ✓ / Display-only), failures inline
  with a Retry. Tray collapses to a count chip; never blocks work on already-imported
  images. Duplicate detection by content hash → "already imported, skipped (n)".
- **Selection grammar (one grammar everywhere — Library grid, filmstrip, map pins):**
  click = focus; Ctrl/Cmd-click = toggle; Shift-click = range; drag on empty space =
  marquee; Ctrl/Cmd-A = all (in current filter); Esc = clear. Selection count always
  visible in the Scope pill; a checkbox appears on thumbnail hover for mouse-only
  users. Delete key on a Library selection = remove-from-library confirm (files stay
  in SlateDrop; nothing destructive to originals, ever).

## E2. Two analysis entry paths, never a forced pipeline (owner: W1 + S6)

From any selection (1, group, or all), the Library action bar offers exactly two
verbs side by side: **Analyze** (→ Analyze tab, manual work) and **Find problems
with AI (n)** (→ queues the run, jumps to AI Review as results stream in). Manual
and AI are peers — AI first then manual refinement, or manual only, or AI only, in
any order, per image or per batch. Every downstream verb states its scope count.

## E3. **Match look** — first-class bulk styling (owner: W1; upgrades copy/paste settings)

The "make the set match" flow is a named verb, not a hidden clipboard:
- On the active image: **Apply this look to… ▾** (toolbar ⋯ menu + right-click on any
  filmstrip/Library thumb). Opens a small popover: target = Selected (n) / All (n);
  checkboxes for WHAT transfers — Palette, Span/level, Isotherm, Alarms, Tuning
  (emissivity/reflected/distance/env), Unit — each independently togglable (checked
  state persists as the user's default recipe).
- Applies via the existing batch PATCH path; ends in a **Keep/Undo toast** ("Applied
  Iron + span to 23 images — Keep / Undo") per the editability law.
- Copy/paste settings (Ctrl-Shift-C/V) remains as the keyboard twin of the same
  engine. *Accept:* style 1 → match 20 in ≤3 interactions; undo restores all 20.

## E4. Deliverable composer — the Deliver tab flow (owners: S8 Deliver shell + S7.5 links + B1-addB)

Deliver = two zones, no scroll:
- **Zone 1 — Saved deliverables (the home, default view):** a grid of every
  deliverable created for this inspection/project: type badge (PDF · Live Link ·
  Cinematic · Compare · Explorer · Scrubber · Timelapse · Video), title, updated-at,
  status (Draft / Published), link analytics glance (views · questions). Row actions:
  **Open** (re-enter the composer, fully editable — deliverables are SAVED DOCUMENTS,
  wired to `thermal_deliverables` rows + SlateDrop registration), Copy link,
  Regenerate link, Expire, Duplicate, Delete (confirm). This answers "always go back
  to them, open them, generate viewing links."
- **Zone 2 — New deliverable → a 4-step composer** (steps as a left stepper rail;
  each step is the full canvas; back/next + Esc-safe):
  1. **Type** — card picker: Report (PDF) · Live Link (interactive scroll report:
     image/map/metadata/notes/AI per finding) · Cinematic slideshow · Before/After
     Compare · Panorama Explorer · Timelapse Scrubber · Video. (Chapter-container
     links = pick Live Link then add chapters — the composer IS B1-addB.)
  2. **Images** — the Library grid embedded, same E1 selection grammar, pre-seeded
     from the current Scope; filter to analyzed-only; drag to order.
  3. **Content layers** — the customization Brian specified: a checklist of what
     shows, GLOBAL with per-image overrides (per-image = click a thumb in the side
     strip): Metadata (time/date/camera/GPS — individually togglable), Map, Spots,
     Deltas, AI findings (accepted only / all), AI markups (contours/boxes), Notes,
     Visual pair, Legend/scale, Hover-temps (Live Link only), Q&A (on/off). Defaults
     come from the chosen type; everything is switchable.
  4. **Branding & publish** — see E5/E6. Ends in: Save draft · Generate PDF ·
     Publish link (copies URL).
- *Accept:* compose a Live Link from 5 analyzed images with map+notes on,
  metadata off, in ≤10 interactions; reopen it later and flip a layer; the link
  updates on republish.

## E5. Per-deliverable branding — logos are ALWAYS optional (owners: S7 + S7.5)

Branding is a per-deliverable override on top of saved **branding profiles**:
- Profile = logo (w/ opacity + size + corner position), company name, cert line
  (ITC #), contact block, accent color. Multiple profiles (e.g. "Slate360",
  "BV Thermography", "Unbranded").
- The publish step shows the profile picker + live preview; **"No logo" and
  "No branding" are first-class options** — sending to ASU leadership WITHOUT the
  Slate360 logo is one dropdown. Per-element toggles (logo yes, cert line no).
  Applies identically to PDFs, link containers, cinematic outro, and MP4 overlays.

## E6. PDF template editor — field-level control (owner: S7)

Templates are user-customizable documents, not fixed layouts:
- Every block in a template is removable: per-image metadata rows (each field its
  own toggle), findings table, notes section (**explicit on/off toggle** — off =
  clean template, on = a lined comments block per image or per report), map locator,
  legend, cover page, summary page, signature line.
- Edited layouts save as **My templates** beside the stock gallery (thermal_report_
  templates API exists); a template remembers its branding-profile default.
  *Accept:* strip a stock template to images+findings only, save as "Clean", reuse
  it on a second report in 2 clicks.

## E7. Link Q&A / communication UI round (owner: S7.5)

Viewer side (client): a floating "Questions (n)" button — never overlaying content —
opens a right sheet (mobile: bottom sheet); questions attach to a specific image/pin
or the whole report; composer = one text field + Send (name/email captured once,
remembered). Owner side (Brian): a Q&A inbox per deliverable in Zone 1's row +
coordination notification on new questions; replies threaded; each thread shows the
image context inline; resolve toggle. Keep it chat-simple — no accounts required for
the client.

## E8. Space audit for Deliver (owner: W3/W4)

The composer steps are full-canvas (no half-empty wizard modals); Zone 1 grid
densifies like Library; the no->120px-empty rule and zero-scroll bars apply to every
step at 1280×800 and 1440×900.

## E9. Standalone app = a SEPARATE PROJECT — cold-start notes (owner: A0; restated)

Brian will build the app later in a NEW repo/project, not inside s360. A0's prompt
must therefore be executable cold. Everything needed is in this doc + the locked
doc's app plan (A0–A6, B5, D5): copy (never import across repos) `packages/
thermal-core` candidates — lib/thermal/{radiometric,probe-palettes,spot-stats,
types}.ts + the V2 viewer/measurement components; server side stays the SAME Modal
workers behind a separate tenant/keys; links render server-side so the app sends
identical URLs; Apple IAP per A4; branding editor per B5. When Brian says go, a
fresh session reads THIS file + THERMAL_STUDIO_V2_REBUILD_LOCKED.md and scaffolds
without s360 context.

# Addendum D (2026-07-10) — layout round 2, location layer, Motion UIs, simplicity audit, SLICE ROSTER

Brian's directive: the current UI is extremely poor; the rebuild must be OBVIOUSLY
different, more intuitive, less confusing. Layout-restructure work moves FIRST in the
build order. The numbered roster at D8 is now the authoritative prompt list for Sonnet.

## D1. Camera recognition is metadata, NEVER a picker (principle)

There is NO camera-selection UI anywhere. The worker sniffs the brand/format from the
file bytes on import; the recognized camera appears only as one small row in
Notes & photo data (e.g. "HIKMICRO B20 · radiometric ✓") and as the import-result
badge. CAM-1 (C2) is entirely detection + fixtures — if any slice sketches a camera
dropdown, that is a spec violation.

## D2. New slice **MAP-1 — location layer** ("tie everything to location")

GPS already parses into capture metadata (S5.5 shows lat/lon + OSM link). Build on it:
- **Library map toggle:** a Grid ⇄ Map segmented control in the Library toolbar. Map
  mode = full-canvas **Leaflet + OSM tiles** (free, keyless, already a repo pattern in
  walks-with-plans; do NOT take a Google Maps key dependency for v1 — leave a provider
  seam so Google satellite tiles can be slotted in later if Brian supplies a key).
  Geotagged captures render as pins (clustered when dense); pin click = thumbnail
  popover → Open in Analyze; drag-select pins = sets Scope selection. Captures without
  GPS are simply absent + a quiet count chip ("14 of 24 have location").
- **Analyze mini-map:** Notes & photo data's GPS row expands to an inline 160px-tall
  Leaflet mini-map (non-interactive until clicked). Never dominates the rail.
- **Deliverables:** link container gains an optional **map chapter** (pins for every
  included finding; pin click jumps to that photo/panorama region). Report templates
  get an optional small locator-map block per image.
- **Panoramas:** if source frames carry GPS, the stitch stores a bounding footprint so
  the panorama pin renders as a small footprint rectangle, not a dot.
- *Accept:* fixture captures with GPS appear as pins; pin click opens the right image;
  no-GPS captures degrade gracefully; map mode adds zero page scroll.

## D3. New slice **L1 — Analyze/desktop layout restructure round 2** (BUILD FIRST)

Kill list + restructure, from a code-level redundancy audit of the current V2 build:
1. **Double image strip (confirmed in `AnalyzePanel.tsx`):** the left "Working set"
   rail and bottom "Filmstrip" render the SAME captures twice. DELETE the left rail on
   Analyze entirely; the bottom filmstrip (96px thumbs, selection ticks, active ring)
   is the only strip. The viewer gains the freed width.
2. **Toolbar de-noising:** °C/°F is a set-once preference → move it (with future
   set-once prefs like reduced motion) into a single right-edge **overflow menu (⋯)**;
   the toolbar keeps only per-image working controls: tools, palette, undo/redo,
   ‹ n/N ›, breadcrumb, hover readout. Rule: every control that survives must pass
   "used many times per session"; set-once things live in ⋯.
3. **One pill rule:** the Scope pill in the top bar is the ONLY pill-shaped control
   in the product. Anything else pill-styled restyles to standard segmented/button
   tokens. No double pills, ever.
4. **Viewer is the hero:** at 1440×900 the canvas owns ≥60% of the tab area with the
   right rail at default width. Accordions single-open by default (opening one
   collapses the previous) so the rail never scrolls in the common case.
5. **Typing everywhere:** every numeric slider (span endpoints, emissivity, distance,
   opacity, speeds) pairs with a click-to-type field — sliders for feel, fields for
   precision. Audit + retrofit.
- *Accept (preview_eval):* one strip in the DOM; toolbar ≤8 top-level controls;
  exactly one pill; canvas ≥60% measured; each slider has a paired input.

## D4. **Motion — timelapse & video get their OWN UIs** (amends S8; inside Deliver)

Image analysis is a spatial paradigm; motion is a TIME paradigm — different surface,
deliberately tucked away (few users need it): Deliver shows a quiet "Motion" section
with two cards (Timelapse · Video); opening one takes over the tab as a full-canvas
editor with a `← Deliver` breadcrumb. Shared grammar:
- A horizontal **time ruler** across the bottom (the "filmstrip of time"): frame
  ticks, draggable in/out handles, a playhead; click a tick = that frame in the
  preview above. No spot tools here — spatial tools stay in Analyze.
- Right rail = collapsed-by-default expander groups (expanding bars, toggles,
  sliders, type-in fields per Brian). **Timelapse Builder** — Source (project/
  date-range), Range + speed/condense slider ("6 hours → 30 s") with type-in
  duration, Overlay toggles (timestamp, region-temp readout, logo w/ opacity slider,
  title text), Region trend (draw ONE box in preview → line chart of its avg/max
  over time — the commissioning wow), Output (resolution/format). **Video Trim** —
  in/out handles, retime (0.25×–4×), crop (drag in preview), overlay toggles; deeper
  editing hands off to Content Studio (locked — no timeline-editor scope creep).
- Both render server-side via the existing timelapse job type; MP4s stay honest
  (non-radiometric) per Addendum A.
- *Accept:* Motion cards visible-but-quiet in Deliver; editor is full-canvas with a
  working ruler + handles; every slider has a type-in twin; Esc/breadcrumb returns
  to Deliver with state kept.

## D5. App layout round 2 (amends A0–A6)

Same round-2 laws on the phone product: one strip only (bottom filmstrip above the
dock); viewer owns the screen with rails as drag-up bottom sheets (Measurements/
Tuning/Notes — one open at a time); Scope = the only pill; set-once prefs live in the
Settings tab, never toolbars; 44pt+ targets with primary actions in the thumb zone;
Files tab gets MAP-1's map view (same Leaflet component); Motion is desktop-first and
appears in-app only as an "Open on desktop" handoff.

## D6. Simplicity audit — standing bans (enforced by W4)

Beyond D3's kill list, re-confirmed for every slice: no two controls that do the same
thing on one screen (keyboard shortcuts excepted, and every shortcut appears in its
tooltip); no button without a verb; no toggle with ambiguous state (labeled states,
never a lone dot); accordions — not nested tab bars — inside rails; empty states name
exactly one action; confirmation dialogs only for destructive+irreversible
(everything else = Keep/Undo toast).

## D7. New slice **W4 — virtual end-to-end walkthrough + fix pass** (last before S9)

Run six journeys as Playwright specs AND a manual preview_eval pass; fix every
friction point; no new features: (1) import 20 mixed-brand files → tune → report →
PDF; (2) drone survey → panorama → AI → link to client; (3) open a 6-month-old
inspection from SlateDrop and resume; (4) phone: shoot → transfer → analyze → send
link from the field; (5) client opens the link at 390px; (6) correction loop: AI
wrong → Analyst chat → revised finding → re-export. Measured bars: import→first-
tuned-image ≤3 interactions; analyze→sent-link ≤6; zero dead clicks; zero page
scroll at 1280×800 and 1440×900.

## D8. THE SLICE ROSTER — ⚠️ SUPERSEDED by Addendum G §G4 (do not build from this table)

Desktop (each row = one prompt, one verified push):

| # | Slice | What it implements |
|---|-------|--------------------|
| 1 | **L1** | Layout restructure round 2: delete duplicate strip, toolbar de-noise + ⋯ menu, one-pill rule, viewer ≥60%, slider+type-in pairs (D3) |
| 2 | **W1** | Workflow foundations: dbl-click→Analyze, drop-anywhere import, palette persist + last-used seed, copy/paste image settings, sticky mini-summary |
| 3 | **W3** | Professional polish: token/density/micro-interaction audit, ← breadcrumb, Esc cascade, Scope ✕, global Saved ✓ chip (C1) |
| 4 | **S5.5p2** | Polygon tool UI, Δ-compare between measurements, line-profile chart |
| 5 | **MAP-1** | Location layer: Library map toggle, pin→open, map-select→Scope, Analyze mini-map (D2) |
| 6 | **W2** | View-original (O), Focus mode (F), Library analyzed/not filters |
| 7 | **S5.6** | Sensitivity suite: alarms (above/below/interval/dew-point/insulation), Enhance-here, local contrast, isotherm sweep, A/B flicker |
| 8 | **CAM-1** | Camera compatibility: per-brand fixtures, auto-recognition badges, display-only fallback — NO picker (C2/D1) |
| 9 | **S6** | AI Review tab: run UX (button + context popover), triage queue, Accept/Edit/Dismiss, explanations; metering flag OFF (B4) |
| 10 | **S6.6** | Analyst chat: grounded Q&A, revision proposal cards, drag-drop PDF/image grounding, worker `chat` endpoint (C5) |
| 11 | **S6.5** | Compare view, thermal↔visual fusion blend, normalize-scale-across-set |
| 12 | **S7** | Report builder: WYSIWYG sheets, template gallery, branding profile + cert line |
| 13 | **TS-SD + TS-PROJ** | SlateDrop Thermal folder, deliverable registration, open-from-SlateDrop, project picker |
| 14 | **S7.5** | Link composer (chapter container, B1-addB), Radiometric Live Link, cinematic slideshow, Q&A/sign-off/analytics |
| 15 | **B1** | Batch recipes (saved multi-step batch operations) |
| 16 | **S8-M** | Motion surfaces: Timelapse Builder + Video Trim time-ruler editors (D4) |
| 17 | **S8.5** | Export engine: clean/annotated PNG, CSV, JSON, findings, batch ZIP |
| 18 | **PAN** | Panorama: stitch job, tile pyramid + grid chunks, contour/trend callouts, difference lens, map footprint (B2/B3) |
| 19 | **W4** | End-to-end walkthrough + fix pass; P1–P7 persona specs green (D7) |
| 20 | **S9** | THE SWAP (HELD for Brian): /thermal-studio serves V2, old UI deleted |

App (can start after desktop #11; each = one prompt): **A0** repo/scaffold/IAP shell
→ **A1** Files + offline viewer (D5 laws) → **A2** on-device decode + measurements +
bottom sheets → **A3** save/export + autosave parity → **A4** reports + StoreKit →
**A5** AI credits + Assistant → **A6** store readiness + B5 branding editor + 390px
audit. **Total: 20 desktop + 7 app = 27 prompts** (26 without the held swap).

Persona specs P1–P7 land inside their owning slices, not as separate prompts.

# Addendum C (2026-07-08) — polish pass, file management, camera compatibility, Analyst chat

## C1. New slice **W3 — Professional polish pass** (after W2; repeat before S9)

A dedicated design-quality slice, not features. Checklist (each item preview-verified):
- **Slate360 identity:** graphite-glass tokens audited across every V2 surface (no
  stray grays), IBM-Plex-style mono uppercase eyebrows on rail headers (via
  `--font-mono`), one accent used ONLY on interactive states, consistent 12px radius,
  hairline dividers per the Design-Studio flat standard (already adopted — audit drift).
- **Density & dead-space audit** per §0.4: no empty region >120px in default state on
  any tab at 1280×800 and 1440×900; zero page scroll re-verified on all five tabs.
- **Micro-interactions:** 120ms ease transitions on accordion expand, tab switch
  cross-fade, toast slide-in, thumbnail hover lift (2%); respect
  `prefers-reduced-motion` everywhere.
- **Navigation affordances:** breadcrumb chip in the Analyze/AI Review toolbars
  (`← Library`) mirroring tab-switch; `Esc` = clear selection → collapse menus →
  exit focus mode (in that order); Scope pill gains an ✕ when Selected(N) to clear
  the selection in one click ("way to clear things out").
- **Save state, globally visible:** one top-bar chip `Saved ✓ / Saving…` aggregating
  the per-panel debounced autosaves (spots/tuning/palette/findings already autosave —
  this SURFACES it; no new persistence). Undo/redo covers everything per §0.1.
- **Empty states audit:** every empty region names exactly ONE next action.

## C2. New slice **CAM-1 — Camera compatibility matrix** (parallel-safe, after S6)

Goal: the widest sensor support in the industry, honestly labeled.
- **Already parsed by `extract.py` (verify each with a fixture file):** FLIR R-JPEG
  (Cx / One / E-series / Boson), DJI (M3T / M30T / H20T), **HIKMICRO (Brian's camera —
  also the live fast-path in the grid route via `decodeHikmicro`)**, Autel EVO 640T,
  Topdon / InfiRay / UNI-T / Hti R-JPEG variants.
- Work: per-brand fixture test suite (one real file each, golden min/max/center-pixel
  assertions); tighten signature sniffing; unknown/non-radiometric files import in
  **display-only mode with an honest badge** ("No temperature data — display only"),
  never silently wrong.
- **UI surface:** the import dropzone's tooltip + an "Supported cameras" line in the
  Library empty state listing brands ("FLIR · DJI · HIKMICRO · Autel · Topdon ·
  InfiRay + any radiometric JPEG"); per-file result badges on import (Radiometric ✓ /
  Display-only).
- New-brand additions (e.g. Fluke .is2, Testo .bmt) are worker-side parser additions —
  additive, follow DEPLOY.md; queue behind demand.

## C3. Clean images — baked-in camera graphics (statement + one small feature)

**Automatic by architecture:** cameras burn spot markers/scales/logos into the
COLORIZED JPEG only — the radiometric payload underneath is untouched, and V2 renders
every image from that raw grid (`renderHeatmap`). So our render is ALWAYS clean; the
camera's baked graphics simply never appear. Remaining cases:
- Camera-defined measurement points that exist as DATA (not pixels) import as
  removable spot objects labeled "from camera" (locked doc §1 — build in S5.5p2 scope
  if the parser exposes them, else backlog per-brand).
- Display-only files (no radiometrics) are shown as-is — baked graphics can't be
  removed there; the badge (C2) sets expectations.
- The paired VISUAL photo is presented uncropped; no cleanup needed.

## C4. Metadata panel interactivity (statement — already live, keep it true)

The Notes & photo data accordion (S5.5) shows time/date/GPS/camera compactly without
dominating space; emissivity/reflected/environment live in Tuning; **changing
emissivity re-renders every pixel live** via the client-side gray-body recompute
(S5, `tuneTemps`) — cursor readout, loupe, measurement list, legend, and histogram all
read the SAME recomputed grid (§1b.2). W3 adds a cross-link: the metadata panel's
emissivity row is a click-through that opens the Tuning accordion. Guard this
guarantee in every future slice (P-spec cross-cutting invariant).

## C5. New slice **S6.6 — Analyst chat** (after S6; the "something more")

The AI interaction is LAYERED — each layer optional, none cluttering the last:
1. **One button** ("Find problems with AI (N)") — automatic, per Scope. Default path.
2. **Context popover** on that button (free text, lens, camera side) — refinement.
3. **Analyst chat** — a collapsible right-side drawer (`💬 Ask the analyst`) available
   in AI Review and Analyze; per-INSPECTION thread (persists in session metadata).
   Capabilities:
   - Follow-up Q&A grounded in the inspection: context = accepted + pending findings
     (text), per-image stats (max/min/avg/ΔTs), measurement tables, session env
     fields — NOT raw grids (token discipline); when the user references a specific
     image, that image (+ visual pair) attaches to the message.
   - **Corrections:** "finding 3 is a sun-warmed junction box, not moisture" → the
     assistant replies AND emits a **revision proposal card** (rendered in-thread:
     revised type/severity/note) with Accept / Dismiss — accepting updates
     `findings_review` through the SAME editability law as everything else. The AI
     never silently rewrites findings.
   - **Drag-and-drop grounding:** drop PDFs (prior inspection reports, drawings,
     spec sheets) or images into the thread — sent as document/image blocks (Claude
     handles PDF natively, ≤32MB/600pp); the assistant cites them in explanations
     ("the 2024 report flagged this same drain"). Files register in the SlateDrop
     Thermal Studio folder so they're kept with the inspection.
   - Worker: new `chat` endpoint beside `interpret` (same Modal app, same model env,
     same org USD ledger + metering flag). Streamed responses. Cost ≈ 1.5–3¢/message
     (Opus, one image attached) — metered per-message when the flag is on.
   - UI: drawer never overlays the viewer (panel group resize, collapses to a pill);
     thread scoped per inspection; clear-thread action; copy-to-findings on any
     assistant paragraph.
- *Accept:* ask "why is finding 2 severe?" → grounded answer citing its ΔT; drop a
  PDF → next answer references it; correction → proposal card → Accept updates the
  finding + survives reload; metering flag off = no debit rows.

## C6. Panorama measurement management (amends A7/B2)

Panoramas are capture rows, so Measurements/AI panels work unchanged — but counts get
large. `AnalyzeMeasurements` gains (when >8 rows): a filter box, sort by ΔT/severity,
and section grouping (Manual / From AI / From camera). The AI Review right rail gets
the same sort. No new components — extend the lists.

## P7 — persona spec: drone moisture survey (ASU sun-deck class)

Fixture: 24 synthetic overlapping frames of a "deck" grid embedding (a) three diffuse
warm plumes 0.5–1.0 °C above background trailing toward drain points, (b) sharp hot
HVAC features as decoys. Flow: import batch → batch-apply tuning → stitch panorama →
run AI (high-sensitivity) → assert: plumes detected as CONTOUR regions (not boxes)
with soft edges classified diffuse, decoys classified focal; explanations use neutral
moisture language; compose link with panorama + slideshow chapters → viewer opens
fit-to-width, zooms to native, hover reads correct fixture temps at two zoom levels,
contour click opens card; before/after pair shows difference lens highlighting only
the changed plume. *(Lands across PAN + S6 + S7.5/B1 + S6.5/B3.)*
