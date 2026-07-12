# Thermal Studio V2 — Real-Session Fix + Report Redo + Visual Overhaul Plan (LOCKED 2026-07-12, rev 2)

**Status: LOCKED — approved by Brian 2026-07-12; rev 2 same day adds the Report &
Deliverables ground-up redo after his review of the live Report tab. Supersedes the shipped
audit-remediation plan (`THERMAL_V2_AUDIT_REMEDIATION_LOCKED.md`, Batches 1–4, commits
`b61e4aa6`→`27563450`).**

Trigger: Brian's first hands-on field test of `/thermal-studio-v2` against a REAL session
("Dog Test") failed badly — "everything just seems like window dressing with no substance" —
followed by a review of the Report tab: "the deliverables and reports don't make any sense…
anything that you see in the picture needs to be completely changed." Directives: fix
everything; completely redo Reports/Deliverables FLIR-style (analysis ON and BESIDE the
image, not a list of disembodied temperatures); give V2 a completely different, best-possible
look (same color scheme, thermal pages ONLY); verify every feature; document save/export/
templates; write it all as a build plan Sonnet 5 can execute end-to-end. This document is
also the hand-off artifact for Brian's multi-AI validation panel.

---

## Part 1 — Diagnosis (every item verified against code + Brian's real prod data)

Method: each complaint traced to file:line evidence, plus read-only Supabase queries against
his real session. Root context: the e2e suite passes because it **mocks the grid endpoint**
— real usage exposed what the mocks hid. DB facts: the "Dog Test" captures ARE decoded
(`npz_data_path` present, extract jobs completed), so these are UX/product defects, not
missing data.

**Workspace defects:**

1. **Draw tools never switch back to Move** (`components/thermal-studio-v2/panels/analyze/AnalyzeCanvas.tsx:144-159`):
   with Area/Point/Line active, every empty-canvas click creates another spot; nothing calls
   `setTool("move")` after creation. Drag/resize callbacks are gated `tool === "move"`
   (`AnalyzeCanvas.tsx:252-254`), so the just-created box cannot be moved or resized until the
   user discovers the Move tool — no hint says so. Brian's exact "2nd or 3rd box" report.
2. **Deltas require an undocumented reference step** (`AnalyzeMeasurements.tsx:141-155`) — every
   row's Δ shows "—" until the user clicks the tiny numbered badge ("Set as reference"). Zero
   onboarding. First-time result: "nothing populates on the right hand sidebar."
3. **No span sliders** — the Display accordion (closed by default) has Low/High number inputs +
   histogram only; legend drag handles are 2px slivers. Brian's standing ask: a temp-SPAN
   min/max slider *beside the image* to shrink tolerances — "as if the program does not know
   what thermal tuning is."
4. **Emissivity appears to do nothing** (`lib/useAnalyzeImage.ts` + `lib/thermal/radiometric.ts`):
   retuning recomputes per-pixel temps AND the display span auto-follows the new min/max, so
   the palette re-normalizes and the rendered image looks ~identical; only readout numbers
   shift. Perceptually "nothing happened."
5. **Session status lies** — "Dog Test" shows `failed` from a 06-13 stuck job even though every
   later job completed; `lib/thermal/job-callback.ts` never resets a stale failed status.
6. **Upload never auto-decodes** (`app/api/ops/thermal/upload/route.ts` finalize only writes
   `storage_path`); an undecoded capture leaves the ENTIRE Analyze tab inert (everything gates
   on `grid`) with only a small red text line — and no decode button exists anywhere in
   Analyze (only Library's right rail).
7. **V2 has no session creation** — "New inspection" links back to V1's `/thermal-studio/upload`.
8. **IA mismatch** — Brian expects left = file selector, center = large image, bottom =
   carousel. V2's Library left rail is filters + dropzone only; the Analyze filmstrip is a thin
   unlabeled compact dock; the session list takes 2 clicks with no "continue where you left off."
9. **AI is a 3-button scavenger hunt** across two tabs with only micro-copy hinting at order.

**Report/Deliverables defects (rev 2, from Brian's live Report-tab review — REDO, not patch):**

10. **Per-image pages are value dumps.** The report shows the PLAIN un-annotated preview image
    next to a bare list ("A1 peak 98.6°F / A1 ΔT 17.7°F / A2 peak…"). The A-markers are never
    drawn ON the image, so the numbers have no referent; AI findings text isn't beside the
    image; nothing connects analysis to pixels. (Annotated rendering already exists in the ZIP
    export path — `lib/export-engine.ts` `drawSpotAnnotations` — but the report never uses it.)
11. **Template selection changes ~nothing visible.** All 5 templates share an identical cover +
    identical per-image layout; switching only swaps below-the-fold text (methodology, severity
    table, disclaimer) (`useReportState.ts:131-132`, `ThermalReportPreview.tsx`). Gallery
    thumbnails are gray placeholder boxes — reads as broken.
12. **Branding is a "Logo URL" text field** (`ReportBrandingAndGenerate.tsx`) instead of an
    upload, and branding persists only on the session row (`branding_config`) — nothing carries
    forward to future sessions/users ("can't tell if it would save for users moving forward").
13. **Deliver tab purpose is unclear** — sections don't communicate what the client actually
    receives; no deliverable-first mental model.

---

## Part 2 — How saving / export / templates work today (reference answers)

- **Saving:** everything autosaves; no Save button. Measurements, tuning, palette, rotation,
  span, notes, and AI-review decisions autosave per-image to `thermal_captures.metadata`
  (600 ms debounce; "Saved ✓" chip; failed saves show red Not-saved + Retry). Report
  template/branding/sections/order autosave to session metadata. PDFs + share links persist
  server-side and register into SlateDrop's Deliverables folder.
- **Export — single or batch:** the Scope pill (This image / Selected N / All N) drives every
  action. Library → "Export (N)" = ZIP per scope: clean PNG + annotated PNG + measurement CSV +
  full-grid radiometric CSV + metadata JSON per image. Report → "Generate PDF (N)". Deliver →
  share links (Radiometric Live Link with real hover temperatures), data exports, timelapse MP4.
- **Templates:** Reports — 5 exist today (Roof/ASTM C1153 · Electrical/NFPA 70B · Mechanical ·
  General · Forensic, `lib/thermal/report-templates.ts`) but are structurally identical (defect
  11 — fixed by Slice 6). Analysis — severity presets + Copy/Paste settings exist; full saved
  "recipes" added as Slice 8.

---

## Part 3 — Build slices (execute in order; push after each verified slice)

### Slice 0 — Real-data diagnostic + session-status truth
- Node script calling `readCaptureGrid()` directly (service creds from `.env.local`) for one
  Dog Test capture — proves the NPZ decode path and captures a real grid payload; feed it into
  a local preview fixture to reproduce the palette/emissivity experience with REAL data first.
- Fix defect 5: `lib/thermal/job-callback.ts` — completed job resets a stale `failed` status.
- **Accept:** script prints a decoded grid; a completed job flips a failed session's status.

### Slice 1 — Measurement manipulation (defects 1–2)
Files: `AnalyzeCanvas.tsx`, `useCanvasStage.ts`, `SpotOverlay.tsx`, `AnalyzeMeasurements.tsx`, `useAnalyzeImage.ts`.
- Auto-switch to Move/Select after any draw-tool creation, new spot selected — immediately
  draggable/resizable (FLIR behavior). Draw-another = click the tool again.
- Drag/resize works when the gesture starts ON an existing spot regardless of active tool.
- Resize handle 10px → 16px, hover cursors.
- First measurement auto-becomes reference → second row shows a live Δ instantly; one-line
  hint under the list explains reference/Δ.
- **Accept (e2e):** create area → drag it, no second box; two spots → Δ visible, zero extra clicks.

### Slice 2 — Span sliders beside the image + visible tuning (defects 3–4)
Files: `AnalyzeViewer.tsx`, new `panels/analyze/AnalyzeSpanStrip.tsx`, `AnalyzeDisplay.tsx`, `useAnalyzeImage.ts`.
- Always-visible strip under the viewer: dual min/max range sliders + number twins + span
  readout (drives existing `setSpan`; persists via the existing `display_span` autosave).
- Tuning changes HOLD the current span (no silent re-normalize) so emissivity/material changes
  visibly shift the image; a small "re-tuned ε 0.95→0.90" chip confirms it took effect.
- Bigger legend handles + tooltips.
- **Accept (e2e):** emissivity change repaints differently under a held span; slider drag
  narrows the palette; verified against the Slice 0 real-grid fixture.

### Slice 3 — Never-dead Analyze + auto-decode (defect 6)
Files: `app/api/ops/thermal/upload/route.ts`, `AnalyzeCanvas.tsx`/`AnalyzePanel.tsx`, `lib/grid-api.ts`.
- Upload finalize auto-dispatches `extract` (existing jobs route; dedupe already server-side);
  SlateDrop import path included.
- Grid 415 → Analyze center renders a real CTA card ("This image hasn't been decoded — Decode
  temperatures") with a working button + live job chip; rail accordions echo the state.
- **Accept (e2e):** undecoded capture → CTA renders; click dispatches extract.

### Slice 4 — Entry + file-list IA (defects 7–8)
Files: `app/(dashboard)/thermal-studio-v2/page.tsx`, new `panels/library/LibraryFileList.tsx`, `LibraryFiltersRail.tsx`, `AnalyzePanel.tsx`.
- `/thermal-studio-v2`: "Continue where you left off" hero opens the most-recent session in ONE
  click; in-V2 "New inspection" creates a draft session, landing in the empty-Library drop state.
- Library left rail: real file list (filename rows; click = focus, dbl-click = Analyze) above
  collapsed filters.
- Filmstrip dock gets a visible "Filmstrip — N images" label.
- **Accept (e2e):** 1-click resume; file-row double-click lands in Analyze on that image.

### Slice 5 — One-button AI (defect 9)
Files: `LibraryNextSteps.tsx`, `AiReviewPanel.tsx`, new `lib/run-ai-pipeline.ts`.
- "Run AI analysis (N)": client-side chain decode-if-needed → statistical analyze → VLM
  interpret over the three EXISTING job routes; progress via the existing JobStatusChip
  ("Decoding… Finding problems… Explaining…"). Numbered labels on the manual buttons.
- **Accept (e2e):** one click from a raw scope → findings appear in AI Review.

### Slice 6 — REPORT & DELIVERABLES GROUND-UP REDO (defects 10–13) — nothing current survives
Brian's directive: "completely redo the deliverables… don't bring in any of the things that
are currently there." FLIR Tools/Ignite report conventions are the structural reference.

**6a — The per-image finding page (the heart of the redo):**
- **Annotated thermal image**: render the radiometric grid client-side with the operator's
  palette/span AND burn in numbered markers for every measurement (Sp1/Bx1…) and every
  accepted AI finding (A1/A2… bounding boxes) — reuse `export-engine.ts`'s `renderHeatmap` +
  `drawSpotAnnotations`, extended with an anomaly-bbox layer. The paired visual photo renders
  beside it when one exists (dual-image row, FLIR style).
- **Findings text sits directly beside/under the image**, one numbered entry per marker
  (A1 → "A1 — Localized heating consistent with…"), sourced from the operator-reviewed set
  (`projectReviewedFindings` — dismissed findings never print; operator edits win). No naked
  value lists: every number on the page is tied to a visible marker on the image.
- **Measurement table keyed to markers** (Sp1 · 98.6°F · Δ vs ref) + a compact parameters
  block (ε, reflected °C, distance, RH) + camera line — the FLIR sidebar, but only populated
  rows.
- The PDF worker (`workers/modal/thermal-analysis/report.py`) renders the SAME annotated
  image server-side (PIL drawing of spots + anomaly boxes on the false-color render at native
  resolution) so preview and PDF cannot disagree.

**6b — Templates that actually change the document:**
- Each of the 5 templates gets a real layout identity, not just different disclaimer text:
  e.g. Forensic = one image/page with the full parameter matrix; General = compact 2-up;
  Electrical = severity-forward findings table (NETA-style columns); Roof = moisture/area
  emphasis with plan-view slot. Template choice visibly restructures the preview instantly.
- Gallery thumbnails become real mini-renders of each layout (no gray placeholder boxes).
- **Accept (e2e):** switching templates changes the rendered page structure (assert on
  layout-distinguishing elements, not just text).

**6c — Branding that persists (org-level profile):**
- Kill the "Logo URL" field. Logo = file UPLOAD (stored via the existing upload/storage path,
  rendered from a signed URL/data URI).
- Branding (logo, company name, footer, cert line) saves as an **org-level default profile**
  (jsonb on the org row if a slot exists; otherwise ONE additive migration for
  `thermal_branding_profiles`) — set it once, every future session/report starts from it;
  per-session override still possible.
- **Accept:** set branding in session A → new session B's report shows it without re-entry.

**6d — Deliver tab clarity:**
- Restructure around "what does the client receive": one card per deliverable type (PDF
  report · Interactive Live Link · Data export ZIP · Timelapse) with a thumbnail/preview,
  status (generated/when/views), and its primary action. The existing backend routes are kept;
  only the presentation layer is rebuilt.
- **Accept:** each card visibly answers what-it-is / what-the-client-sees / how-to-send-it.

### Slice 7 — THE VISUAL OVERHAUL (thermal V2 only, same color scheme)
Runs AFTER Slice 6 so the new report/deliver screens get styled once, not twice.
- **Scope mechanics:** `StudioWorkspaceShell` is shared with Tour Builder — fork it into
  `components/thermal-studio-v2/V2WorkspaceShell.tsx` so nothing leaks. New thermal-scoped
  tokens (`--tsv2-*`) in `app/globals.css` (tokens-only; guard:design stays green — no amber,
  no hardcoded brand hex, no rounded-full).
- **Design language ("Obsidian Instrument"):** 3-step elevated-surface system (canvas → panel →
  raised control) with tinted surfaces + soft shadows replacing nested 1px hairlines; real
  typographic hierarchy; signature thermal identity — the iron-palette gradient as a thin
  accent band on the active tab, span strip, and legend; accent on interactive states only;
  generous radius/spacing; large tabular-nums temperature readouts.
- **Coverage:** restyle primitives once (V2WorkspaceShell, V2PanelFrame, AnalyzeAccordion,
  buttons/inputs/chips via `lib/v2-ui.ts` constants), then sweep all 5 tabs.
- **Accept:** before/after screenshots of all 5 tabs for Brian's expand/don't-expand decision;
  guards green; zero visual change on /tours, /thermal-studio (V1), or any other route.

### Slice 8 — Analysis templates ("recipes")
Files: new `panels/analyze/AnalyzeRecipes.tsx`, `lib/recipes.ts`.
- Save the current tuning+palette+span+alarm+severity bundle as a named recipe; apply to Scope
  (reuses the batch-apply plumbing + Keep/Undo toast).
- **Accept (e2e):** save recipe on image A → apply to All → settings land on every image.

### Slice 9 — Full-feature functionality sweep (final gate)
- Real-data verification matrix: every tab, every tool (upload → decode → measure → tune → AI →
  report → export → share). Anything broken is fixed in place and logged in the build log.
- Full `thermal-v2-*` e2e regression + scoped typecheck + all 3 guards.
- Handoff to Brian — the re-test list: ① open in one click, ② draw an area and immediately
  drag/resize it, ③ two spots show a Δ unprompted, ④ span sliders under the image work,
  ⑤ an emissivity change visibly shifts the image, ⑥ one "Run AI analysis" button completes
  end-to-end, ⑦ the report shows annotated images with findings beside them and templates that
  visibly differ, ⑧ branding set once appears in a brand-new session.

---

## Out of scope / unchanged
- No other pages restyled; global Graphite Glass tokens untouched (thermal-scoped tokens only).
- S9 (delete old thermal UI + route swap) stays HELD pending Brian's sign-off.
- DB: no schema changes except, at most, ONE additive table/column for org-level branding
  profiles if no existing jsonb slot fits (prepared as SQL for the standard additive-migration
  flow).

## Standing verification rules (per slice)
Scoped typecheck via `tsconfig.thermal-v2.json` (never bare tsc); `guard:architecture` /
`guard:design` / `guard:file-size-regression`; e2e additions per slice — new specs avoid
over-mocking (the mock-everything pattern is exactly what hid this failure class); push after
each verified slice so Brian gets a live deploy.
