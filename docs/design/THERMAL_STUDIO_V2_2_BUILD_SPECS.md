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
