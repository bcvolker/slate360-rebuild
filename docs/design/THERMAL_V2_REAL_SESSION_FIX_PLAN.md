# Thermal Studio V2 — Real-Session Fix + Visual Overhaul Plan (LOCKED 2026-07-12)

**Status: LOCKED — approved by Brian 2026-07-12. Supersedes the shipped audit-remediation
plan (`THERMAL_V2_AUDIT_REMEDIATION_LOCKED.md`, Batches 1–4, commits `b61e4aa6`→`27563450`).**

Trigger: Brian's first hands-on field test of `/thermal-studio-v2` against a REAL session
("Dog Test") failed badly — "everything just seems like window dressing with no substance."
His follow-up directive expanded scope: fix everything, give V2 a completely different,
best-possible look (same color scheme, thermal pages ONLY — other pages untouched), verify
every feature works, document how save/export/templates work, and write it all as a build
plan Sonnet 5 can execute end-to-end.

---

## Part 1 — Diagnosis (verified against code + Brian's real prod data)

Every complaint was traced to code with file:line evidence, plus read-only Supabase queries
against his real session. Root context: the e2e suite passes because it **mocks the grid
endpoint** — real usage exposed what the mocks hid. DB facts: the "Dog Test" captures ARE
decoded (`npz_data_path` present, extract jobs completed 06-13→06-18), so most complaints
are genuine UX defects, not missing data.

**Confirmed hard defects:**

1. **Draw tools never switch back to Move** (`components/thermal-studio-v2/panels/analyze/AnalyzeCanvas.tsx:144-159`):
   with Area/Point/Line active, every empty-canvas click creates another spot; nothing calls
   `setTool("move")` after creation. Drag/resize callbacks are gated `tool === "move"`
   (`AnalyzeCanvas.tsx:252-254`), so the just-created box genuinely cannot be moved or resized
   until the user discovers the Move tool — no hint says so. This is Brian's exact
   "2nd or 3rd box, can't drag or resize" report.
2. **Deltas require an undocumented reference step** (`AnalyzeMeasurements.tsx:141-155`) — every
   row's Δ shows "—" until the user clicks the tiny numbered badge ("Set as reference"). Zero
   onboarding. First-time result: "nothing populates on the right hand sidebar."
3. **No span sliders** — the Display accordion (closed by default; Measurements is the
   default-open single-open accordion) has Low/High number inputs + histogram only; the
   draggable legend handles are 2px slivers. Brian's standing ask (also recorded in the
   thermal-studio issues memory): a temp-SPAN min/max slider *beside the image* to shrink
   tolerances — "it's as if the program does not know what thermal tuning is."
4. **Emissivity appears to do nothing** (`lib/useAnalyzeImage.ts` + `lib/thermal/radiometric.ts`):
   retuning recomputes per-pixel temps AND the display span auto-follows the new min/max, so the
   palette re-normalizes and the rendered image looks ~identical. Only the hover readout/legend
   numbers shift. Physically defensible, perceptually "nothing happened." Also `tuneTemps`
   no-ops when |Δe| < 1e-4 and (by construction) on reflected-temp-only changes.
5. **Session status lies** — "Dog Test" shows `failed` from a 06-13 stuck job even though every
   later job completed; the job callback (`lib/thermal/job-callback.ts`) never resets a stale
   failed status on success.
6. **Upload never auto-decodes** (`app/api/ops/thermal/upload/route.ts` finalize only writes
   `storage_path`) + an undecoded capture leaves the ENTIRE Analyze tab inert (canvas, clicks,
   palette, tuning, display all gate on `grid`), signalled only by a small red `text-xs` line in
   the canvas center — and there is **no decode button anywhere in Analyze** (the only trigger
   is Library → right rail "Decode temperatures").
7. **V2 has no session creation** — the list page's "New inspection" links back to V1's
   `/thermal-studio/upload` (previously logged gap, now user-facing).
8. **IA mismatch** — Brian expects left = file selector, center = large image, bottom = carousel.
   V2's Library left rail is filters + dropzone only; the Analyze filmstrip exists but is a thin
   unlabeled compact dock; the session list takes 2 clicks with no "continue where you left off."
9. **AI is a 3-button scavenger hunt** across two tabs (Library "Decode temperatures" →
   Library "Find problems with AI" → AI Review "Run AI on N") with only micro-copy hinting
   at the order.

---

## Part 2 — How saving / export / templates work (reference answers)

- **Saving:** everything autosaves; there is no Save button. Measurements, tuning, palette,
  rotation, span, notes, and AI-review Accept/Edit/Dismiss decisions autosave per-image into
  `thermal_captures.metadata` (600 ms debounce; "Saved ✓" chip in the top bar; failed saves show
  a red Not-saved chip with Retry). Report template/branding/section toggles/image order autosave
  to session metadata. Generated PDFs and share links persist server-side and register into the
  project's SlateDrop Deliverables folder.
- **Export — single or batch:** the global Scope pill (This image / Selected N / All N) drives
  every action. Library → "Export (N)" downloads a ZIP per scope: clean PNG + annotated PNG +
  measurement CSV + full-grid radiometric CSV + metadata JSON per image. Report tab →
  "Generate PDF (N)" builds the branded PDF server-side. Deliver tab → share links (Radiometric
  Live Link with real hover temperatures), data exports, and timelapse MP4 (Motion).
- **Templates:**
  - *Reports — exist today:* 5 selectable templates (Roof/Building-Envelope ASTM C1153 ·
    Electrical NFPA 70B/ASTM E1934 · Mechanical/HVAC · General · Detailed/Forensic,
    `lib/thermal/report-templates.ts`), each with toggleable sections + branding profile.
  - *Analysis — partial today:* severity-band presets (NETA/RESNET-style) and Copy/Paste
    settings between images exist; full saved "analysis recipes" (one-click apply of a whole
    tuning/alarm/palette/span bundle) are NOT built — added as Slice 7 below so both kinds of
    templates exist.

---

## Part 3 — Build slices (execute in order; push after each verified slice)

### Slice 0 — Real-data diagnostic + session-status truth
- Scratchpad node script calling `readCaptureGrid()` directly (service creds from `.env.local`)
  for one Dog Test capture — confirms the NPZ decode path in isolation and captures the real
  grid payload; feed it into a temporary local fixture for `/preview/thermal-v2` to reproduce
  the palette/emissivity experience with REAL data before fixing.
- Fix defect 5: `lib/thermal/job-callback.ts` — a completed job resets a stale `failed`
  session status (additive logic only).
- **Accept:** script prints a decoded grid; a completed job flips a failed session's status.

### Slice 1 — Measurement manipulation (defects 1–2)
Files: `AnalyzeCanvas.tsx`, `useCanvasStage.ts`, `SpotOverlay.tsx`, `AnalyzeMeasurements.tsx`,
`useAnalyzeImage.ts`.
- Auto-switch to Move/Select after any draw-tool creation, with the new spot selected —
  immediately draggable/resizable (FLIR behavior). Draw-another = click the tool again.
- Drag/resize gestures work when starting ON an existing spot regardless of the active tool
  (the overlay already stopPropagation's).
- Resize handle 10px → 16px with hover cursors.
- First measurement auto-becomes the reference → the second shows a live Δ instantly. One-line
  hint under the list: "Row ① is the reference — other rows show Δ vs it. Click a row number
  to change."
- **Accept (e2e):** create area → drag it, no second box appears; two spots → Δ visible with
  zero extra clicks.

### Slice 2 — Span sliders beside the image + visible tuning (defects 3–4)
Files: `AnalyzeViewer.tsx`, new `panels/analyze/AnalyzeSpanStrip.tsx`, `AnalyzeDisplay.tsx`,
`useAnalyzeImage.ts`.
- Always-visible strip directly under the viewer: dual min/max range sliders + number twins +
  span readout, driving the existing `setSpan` (persists via the existing `display_span`
  autosave from remediation Batch 3).
- Tuning changes HOLD the current span (no silent re-normalize) so emissivity/material changes
  visibly shift the image; a small "re-tuned ε 0.95→0.90" chip confirms the change took effect.
- Legend handles get bigger hit targets + tooltips.
- **Accept (e2e):** an emissivity change repaints differently under a held span; slider drag
  narrows the palette; verified against the Slice 0 real-grid fixture.

### Slice 3 — Never-dead Analyze + auto-decode (defect 6)
Files: `app/api/ops/thermal/upload/route.ts`, `AnalyzeCanvas.tsx`/`AnalyzePanel.tsx`,
`lib/grid-api.ts`.
- Upload finalize auto-dispatches `extract` (existing jobs route; server-side dedupe already in
  place); the SlateDrop import path gets the same.
- Grid 415 ("not decoded") → Analyze's center renders a real CTA card with a working "Decode
  temperatures" button + live job status chip, not a faint red line; the rail accordions echo a
  one-liner instead of sitting silently inert.
- **Accept (e2e):** undecoded capture → CTA renders; click dispatches extract.

### Slice 4 — Entry + file-list IA (defects 7–8)
Files: `app/(dashboard)/thermal-studio-v2/page.tsx`, new `panels/library/LibraryFileList.tsx`,
`LibraryFiltersRail.tsx`, `AnalyzePanel.tsx`.
- `/thermal-studio-v2`: "Continue where you left off" hero card opens the most-recent session in
  ONE click; full list below; in-V2 "New inspection" creates a draft session and lands in the
  empty-Library drop state (closes the V1-upload detour).
- Library left rail: a real file list (filename rows; click = focus, double-click = open in
  Analyze) above collapsed filters — the left-hand selector Brian expects.
- Filmstrip dock gets a visible "Filmstrip — N images" label instead of the anonymous ▼.
- **Accept (e2e):** 1-click resume; file-row double-click lands in Analyze on that image.

### Slice 5 — One-button AI (defect 9)
Files: `LibraryNextSteps.tsx`, `AiReviewPanel.tsx`, new `lib/run-ai-pipeline.ts`.
- "Run AI analysis (N)": client-side chain decode-if-needed → statistical analyze → VLM
  interpret over the three EXISTING job routes (server dedupe + credit gates untouched);
  progress via the existing JobStatusChip ("Decoding… Finding problems… Explaining…").
- Numbered labels on the manual buttons (1 Decode · 2 Find problems · 3 Report) so the manual
  path is self-explanatory too.
- **Accept (e2e):** one click from a raw scope → findings appear in AI Review (job routes mocked
  per stage).

### Slice 6 — THE VISUAL OVERHAUL (thermal V2 only, same color scheme)
Brian's directive: a completely different, best-possible look; keep the graphite/dark scheme +
existing accents; restyle NO other page. Depending on the result he may expand it platform-wide.
- **Scope mechanics:** `StudioWorkspaceShell` is shared with Tour Builder — fork it into
  `components/thermal-studio-v2/V2WorkspaceShell.tsx` so nothing leaks. New thermal-scoped design
  tokens (`--tsv2-*`) in `app/globals.css` (tokens-only; guard:design stays green — no amber, no
  hardcoded brand hex, no rounded-full).
- **Design language ("Obsidian Instrument"):** replace hairline-boxes-on-black with a 3-step
  elevated-surface system (canvas → panel → raised control) using tinted surfaces + soft shadows
  instead of nested 1px borders; real typographic hierarchy (mono uppercase section labels stay,
  with genuine size/weight contrast); a signature thermal identity — the iron-palette gradient as
  a thin accent band on the active tab, the span strip, and the legend; accent color on
  interactive states only; generous radius + spacing rhythm; large readable tabular-nums
  temperature readouts.
- **Coverage:** restyle the primitives once (V2WorkspaceShell, V2PanelFrame, AnalyzeAccordion,
  buttons/inputs/chips via shared classname constants in a new `lib/v2-ui.ts`), then sweep all
  5 tabs so nothing looks half-migrated.
- **Accept:** before/after screenshots of Library / Analyze (Display+Fusion open) / AI Review /
  Report / Deliver from the preview harness, presented to Brian for the expand/don't-expand
  decision; guards green; zero visual change on /tours, /thermal-studio (V1), or any other route.

### Slice 7 — Analysis templates ("recipes")
Files: new `panels/analyze/AnalyzeRecipes.tsx`, `lib/recipes.ts`.
- Save the current tuning+palette+span+alarm+severity bundle as a named recipe; apply to Scope
  (reuses the existing batch-apply plumbing from Copy/Paste settings + the Keep/Undo toast).
- **Accept (e2e):** save recipe on image A → apply to All → settings land on every image.

### Slice 8 — Full-feature functionality sweep (final gate)
- Systematic real-data verification matrix: every tab, every tool, against the Slice 0 real-grid
  fixture + live routes where possible (upload → decode → measure → tune → AI → report → export →
  share). Anything broken found here is fixed in place and logged in the build log.
- Full `thermal-v2-*` e2e regression + scoped typecheck + all 3 guards.
- Handoff note to Brian: the 6-point re-test list for `/thermal-studio-v2` — ① open in one
  click, ② draw an area and immediately drag/resize it, ③ two spots show a Δ unprompted,
  ④ span sliders under the image work, ⑤ an emissivity change visibly shifts the image,
  ⑥ one "Run AI analysis" button completes end-to-end.

---

## Out of scope / unchanged
- No other pages restyled; global Graphite Glass tokens untouched (thermal-scoped tokens only).
- S9 (delete old thermal UI + route swap) stays HELD pending Brian's sign-off.
- No DB schema changes; everything rides existing tables, routes, and job types.

## Standing verification rules (per slice)
Scoped typecheck via `tsconfig.thermal-v2.json` (never bare tsc); `guard:architecture` /
`guard:design` / `guard:file-size-regression`; e2e additions as listed per slice — new specs
avoid over-mocking where possible (the mock-everything pattern is exactly what hid this
failure class); push after each verified slice so Brian gets a live deploy.
