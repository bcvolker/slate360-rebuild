# Thermal Studio V2 — build log

Running log per roster slice (Addendum G §G4, frozen). One section per slice:
what shipped, evidence, anything skipped/logged per the error-recovery rule.
Cross-reference: `docs/design/THERMAL_STUDIO_V2_2_BUILD_SPECS.md` (specs),
memory `slate360-thermal-studio-v2-rebuild.md` (shipped-state summary).

---

## Slice 1 — R1 reliability pack (2026-07-10)

**Shipped:**
- **Job dedupe.** `dedupe_key` column + partial unique index on
  `(dedupe_key) where status in (queued, processing)` (migration
  `20260710130000_thermal_jobs_reliability.sql`, applied to prod). `POST
  /api/ops/thermal/jobs` computes `sha256(org+session+type+sorted(captureIds))`,
  returns the existing active job with `{deduped:true}` instead of inserting a
  duplicate; a unique-violation race on insert re-fetches and returns the
  winner. Client-side belt: `LibraryNextSteps` now disables its two action
  buttons while a dispatch is in flight (`busy` state) — R1 spec's
  "disable-while-pending stays in UI".
- **Accept-then-processing.** The job row and session status now flip to
  `processing` only AFTER Trigger.dev's dispatch call resolves; a dispatch
  failure marks the job `failed` with `failure_reason: "dispatch_failed"`
  immediately instead of leaving it silently `queued`.
- **Stuck-job reconciler.** New `GET /api/ops/thermal/jobs/reconcile`
  (CRON_SECRET-gated, same pattern as `recover-stale-twin-jobs`), wired into
  `vercel.json` at `*/10 * * * *`. Fails `queued` jobs older than 15 min and
  `processing` jobs with no update in 45 min, each with
  `failure_reason: "worker unresponsive — Retry"`.
- **Partial-failure semantics.** `lib/thermal/job-callback.ts` now diffs
  `input_capture_ids` against the capture ids that actually produced a result;
  a job that completes short marks `partial: true`, records
  `failed_capture_ids`, and writes a human error_log
  (`"m/n processed — k failed"`) instead of a bare "complete". Extracted into
  `lib/thermal/job-partial-failure.ts` (pure helper) to keep job-callback.ts
  under the 300-line gate.
- **`interpret` gets a job row.** `job_type` CHECK constraint extended
  (additive) to include `interpret`. `POST
  /api/ops/thermal/sessions/[sessionId]/interpret` now resolves the eligible
  capture set up front, dedupes the same way as the main jobs route, inserts a
  `thermal_processing_jobs` row, and follows accept-then-processing. `POST
  /api/ops/thermal/interpret/callback` closes out that job row on
  completion/failure/spend-cap, so `useThermalJobRealtime` (extended with
  `job_type`/`partial`/`failed_capture_ids`/`input_capture_ids`) picks it up
  like every other job type — kills the old sleep-then-refresh assumption.
- **Visible save failures.** New `components/thermal-studio-v2/lib/save-status.ts`
  (pub/sub store + `patchCaptureWithStatus` with 1s/3s/9s retry-then-report).
  `spots-api.ts` / `tuning-api.ts` / `findings-api.ts` route through it instead
  of `.catch(() => {})`. New `SavedStatusChip` (global worst-status chip, red
  "Not saved — Retry" on failure) and `JobStatusChip` (Realtime job status,
  red "Retry" on failed/partial with per-scope resubmit) wired into
  `ThermalV2Shell`'s top bar, replacing the old static "Idle" span. A
  `beforeunload` guard blocks navigation while any capture has an unsaved or
  errored change (`hasUnsavedWork()`).
- **V1 protection (small).** `ThermalStudioWorkView.tsx`'s four default save
  functions now report failures via a `thermal-v1-save-error` DOM event,
  surfaced as a small dismissing toast in the same component — V1 gets the
  same "never lie" treatment without any deeper investment (it's deleted
  wholesale at S9).

**Verification:**
- Scoped typecheck: `npx tsc -p tsconfig.thermal-v2.json` — clean (include
  list extended with every touched route/hook/lib file).
- `npm run guard:architecture` — PASS.
- `npm run guard:design` — pre-existing failures only (`app/preview/twin-screens`,
  `app/preview/capture-shell` — other teams' files, not touched this slice).
- `npm run guard:file-size-regression` — the repo-wide baseline is already red
  (~35 pre-existing offenders across teams, e.g. `ThermalProbeViewer.tsx` at
  858 lines, `capture-shell/page.tsx` at 1716 — none touched here). Of the two
  files this slice pushed over 300: `lib/thermal/job-callback.ts` was
  extracted (apply-appliers → `job-result-appliers.ts`, partial-failure →
  `job-partial-failure.ts`) back down to 249 lines — no net regression left.
  `components/ops/thermal/ThermalStudioWorkView.tsx` (V1, pre-existing at 528
  lines, already over threshold and never baselined) grew to ~565 with the
  toast port; not further extracted — it is wholesale-deleted at S9 and not
  worth surgery. Logged here rather than silently accepted.
- Un-mocked persistence check: queried prod `thermal_processing_jobs` directly
  via `supabase db query --linked` post-migration — `dedupe_key`, `partial`,
  `failed_capture_ids`, `failure_reason` columns present and readable; the
  `job_type` CHECK constraint accepts `interpret`. Full authenticated
  HTTP-level exercise of the dedupe/accept-then-processing/reconciler paths
  needs either a logged-in browser session (this route is CEO-gated) or
  Brian's manual pass — noted rather than claimed.
- e2e: `e2e/thermal-v2-r1-reliability.spec.ts` — 3 specs against
  `/preview/thermal-v2` with mocked `fetch`: (1) Decode button disables while
  a job dispatch is in flight and re-enables after, with exactly one network
  call reaching the mock; (2) a failing autosave surfaces the chip's
  "Not saved — Retry" within the 1s/3s/9s retry window, and clicking Retry
  after flipping the mock to succeed shows "Saved ✓"; (3) no page scroll at
  1280×800 / 1440×900. First two are the load-bearing R1 assertions and pass
  reliably; the third is layout-only and needed `test.slow()` on this
  dev-server host (cold Next.js compiles under sequential Playwright runs are
  slow here, unrelated to R1 code).
- **Test-harness note (not a product bug):** `components/providers/SWRegistrar.tsx`
  triggers exactly one `location.reload()` on the very first page load in any
  fresh browser profile (no `slate360-last-build` localStorage key yet →
  read as a build-id change → cache nuke + reload). Every Playwright test
  gets a fresh profile, so this fires once per test and races with the next
  action. Spec works around it with a `warmBuildIdThenGoto()` helper (goto,
  wait for the localStorage key to be set, goto again) rather than changing
  the app.

**Skipped / deferred (none after 3 attempts — logging for completeness only):**
- None. Every G1 acceptance item shipped. The one open item is the manual/
  authenticated HTTP round-trip note above — not a skip, a scoping note.

**Not started yet:** Slices #6–#16 of the frozen roster.

---

## Slice 5 — S7 Reports (2026-07-10)

Both named pushes (Quick Report/auto-fields/TOC → template gallery + field
editor + branding) landed together, same reasoning as S6 — gated + committed
as one checkpoint rather than an artificial split.

**Shipped:**
- **Reused the real WYSIWYG renderer instead of rebuilding it.** V1's
  `ThermalReportPreview` (`components/ops/thermal/ThermalReportPreview.tsx`)
  is a faithful HTML mirror of the actual PDF the Modal worker builds — cover,
  2-up findings pages, methodology/severity/disclaimer/signature back matter.
  Its `StudioCapture` prop type is structurally identical to `ThermalV2Capture`
  (same fields: id/filename/previewUrl/qualityMetrics/metadata/anomalies), so
  V2's Report tab imports and renders it directly — zero adapter code, and the
  preview is provably byte-for-byte what Generate PDF produces (it's the same
  component the PDF path was modeled on), not a lookalike reimplementation.
  `guard:architecture` confirms this import direction isn't forbidden.
- **Template gallery** (`ReportTemplateGallery`) over the real
  `GET /report-templates` API, seeded with the 5 existing built-ins
  (`SEED_REPORT_TEMPLATES`) plus any org-saved templates.
- **Outline with real drag-reorder.** `ReportOutline` (left rail) — HTML5
  drag-and-drop reordering + per-section visibility toggles. Deliberately did
  NOT invent a second "report order" concept: the outline reads/writes
  `selection.reportOrder` — the same `session.metadata.report_set` state
  Library's ★ "Add to report" funnel already owns (`useLibrarySelection`
  gained a `reorderReport()` method) — so the ★ funnel and the outline can
  never disagree about what's in the report or in what order.
- **Branding + site conditions + signature** (`ReportBrandingAndGenerate`) —
  persists to `session.branding_config` / `session.metadata.report` via the
  EXISTING session PATCH route, which already jsonb-merges (no new backend).
  Section on/off toggles are stored as a per-report override merged onto the
  selected template's `sections`, so choosing a template doesn't silently
  mutate the shared saved template.
- **Generate PDF + history.** Reuses the existing `job_type: "report"` job
  dispatch (already supported by `/api/ops/thermal/jobs`) and the existing
  `GET /sessions/[id]/reports` listing/download route — no new backend.
  "Continue editing" restore: template id, conditions, signature, and section
  overrides are seeded back from `session.metadata.report` on tab load.

**Verification:**
- Scoped typecheck: clean — confirmed the `StudioCapture`/`ThermalV2Capture`
  structural compatibility with no cast needed.
- `guard:architecture` — PASS (V2 importing the V1 preview component is an
  allowed direction). `guard:design` — pre-existing failures only. File
  sizes: all new files well under 300 lines.
- e2e: `e2e/thermal-v2-s7-reports.spec.ts` — 5 specs (WYSIWYG preview renders
  with the fixture's already-★'d image in the outline, template selection
  persists via session PATCH, branding edit updates the live preview AND
  persists, Generate PDF dispatches the real `report` job type with the
  outline's capture ids, no page scroll). Two selector-ambiguity fixes needed
  along the way (the "Report" tab button collides with Library's "In report
  (N)" filter chip and "★ Add N to report" button under substring matching;
  the shell's session-name subtitle collides with the preview's own `<h1>`)
  — both are test-authoring fixes, not product bugs.
- Full 5-spec cross-slice regression (R1 + L1+W3 + W1 + S6 + S7, 26 specs)
  run together before push.

---

## Slice 4 — S6 AI Review tab (2026-07-10)

G4 lists this as two named pushes ("run+queue / review UI", H6). Both landed
in the same working session and are gated + committed together — treated as
one verified checkpoint rather than an artificial split of code that was
built as one piece.

**Shipped:**
- **Run + queue.** AI Review's "Run AI on N" reuses R1's `/sessions/[id]/interpret`
  route (job row, dedupe, accept-then-processing, Realtime progress — all
  already built; no new dispatch infrastructure needed). Scope-aware: N =
  captures in the current Scope pill selection that already have detected
  anomalies (statistical `analyze` must run first, same as before).
- **findings_review persistence.** Capture PATCH route gained an additive
  `findings_review: {accepted, dismissed, edits}` field (per-anomaly-index),
  mirroring the `spots`/`tuning` pattern. New `useFindingsReview` hook seeds
  from it and autosaves through `patchCaptureWithStatus` (R1's visible-save-
  failure path, reused for free).
- **Triage queue UI.** Real `AiReviewList` (left): severity-sorted (Critical
  → Warning → Advisory, universal words per §1b.4c — never amber, never
  trade-specific), filterable. New `severity-labels.ts` maps the raw
  `action`/`watch`/`info` values consistently across the list, chips, and
  filter — the preview fixture's anomaly data was updated from placeholder
  `"critical"`/`"advisory"` strings (which don't match the real
  `ThermalAnomalyType`) to real values so the filter is actually exercised.
- **Read-only viewer with numbered boxes.** New `AiReviewViewer` — a
  deliberately lighter build than `AnalyzeCanvas`/`useCanvasStage` (no
  measurement tools needed for reviewing AI proposals): fetches the grid,
  renders it with `renderHeatmap`, overlays numbered severity-colored boxes
  from `anomaly.bbox`; click a box or its matching card to highlight both.
- **Finding cards: Accept ✓ / Edit ✎ / Dismiss ✕.** New `AiReviewFindingCard`
  + `AiReviewFindings` container — AI-drafted `observation` text is editable
  inline; dismissed findings collapse into a "Dismissed (N)" group with a
  Restore action (nothing is unrecoverable, per doc §0.1); "Accept all
  severe" bulk action when more than one Critical finding exists.
- **S6-CR credit metering — code ships, flag OFF (Addendum H3/B4).** New
  `lib/thermal/ai-credits.ts` (`THERMAL_AI_METERING_ENABLED`, default false;
  `THERMAL_AI_CREDITS_PER_IMAGE`). Pre-flight balance check added to the
  interpret route (402-shaped `insufficient_credits` response when the flag
  is on); idempotent debit added to the interpret callback via the existing
  `lib/credits/idempotency.ts` (twin precedent, not a forbidden zone),
  keyed `${orgId}:thermal-ai:${jobId}` so a retried/duplicate callback can
  never double-charge. Both paths are no-ops today since the flag is off —
  Brian's own use stays unmetered; the worker's per-org USD ledger remains
  the real cost backstop until this flag is revisited before any non-CEO
  exposure (S9 gate #6).

**Scoping note:** the spec's "two peer verbs" framing (Addendum E2 — a
single "Analyze | Find problems with AI (n)" pairing that implies one
combined dispatch) was NOT built as a single auto-chaining button. Library's
existing "Find problems with AI (N)" (statistical `analyze`, already
shipped) and AI Review's new "Run AI on N" (VLM `interpret`, this slice)
stay as two distinct, sequential steps rather than inventing job-chaining
infrastructure to auto-run one after the other. This matches "AI Review: AI
proposes, the operator decides" as a genuinely separate step, and avoids a
nontrivial new orchestration layer for a slice that was already large.
Revisit if a later slice needs the fully-combined verb.

**Verification:**
- Scoped typecheck: clean (fixed one real type error — the interpret route's
  402 response needs the `ok()` helper's status-code overload, not a raw
  `Response`, to satisfy `withThermalOpsAuth`'s handler type).
- `guard:architecture` — PASS. `guard:design` — pre-existing failures only.
  File sizes: all new/touched files under 300 lines (largest: `AiReviewViewer.tsx`
  at 128, `captures/[captureId]/route.ts` at 222 after the findings_review
  addition — still comfortably under the gate).
- e2e: `e2e/thermal-v2-s6-ai-review.spec.ts` — 6 specs (severity-sorted list +
  AI observation text, Accept persists via findings_review PATCH, Dismiss →
  Dismissed group → Restore, Run AI dispatches interpret with the right scope
  ids, severity filter narrows the list, no page scroll). One test-authoring
  fix needed: filtering the left list doesn't auto-navigate the viewer
  (consistent with how Library's own filters behave) — the severity-filter
  test was asserting against the wrong panel and got corrected to check the
  list's own contents.
- Full 4-spec regression (R1 + L1+W3 + W1 + S6, 21 specs) run together to
  confirm no cross-slice regressions before push.
- Un-mocked persistence: `findings_review` reuses the same real PATCH route
  R1/W1 already exercise against the real DB shape; no new migration needed
  (metadata is jsonb).

---

## Slice 3 — W1 workflow foundations (2026-07-10)

**Shipped:**
- **Double-click → Analyze.** `LibraryGrid` thumbnails gained `onDoubleClick`;
  a new `onOpenInAnalyze` callback threads Shell → LibraryPanel → LibraryGrid,
  and the shell's `openInAnalyze` focuses the capture + switches tabs.
- **Drop-anywhere + Start strip.** `ThermalV2Shell` now has window-level
  `dragover`/`drop` listeners (guarded on `dataTransfer.types.includes("Files")`)
  that upload every dropped file via the existing `uploadThermalFile`, switch
  to Library, and show `Uploading n/N…` in the top bar — the rail's own
  dropzone is untouched. `LibraryGrid`'s empty state is now the one-verb
  "Drop thermal photos to begin… + Choose files" strip (was a passive
  "No images yet" message) with its own drop target + hidden file input.
- **Palette persist + seed.** Palette moved OUT of `AnalyzePanel`'s local
  `useState` and INTO `useAnalyzeImage`, seeded from
  `capture.metadata.palette` (fallback "Iron") on every image switch, and
  autosaved via a new `palette-api.ts` (reuses R1's `patchCaptureWithStatus`,
  so a failed palette save gets the same visible-failure treatment for free).
- **Copy/Paste settings.** New module-level `settings-clipboard.ts`
  ({palette, span, tuning, isotherm}); toolbar ⧉ Copy / ⧉ Paste (Paste
  disabled + tooltipped until something's copied); `Ctrl+Shift+C` /
  `Ctrl+Shift+V`. "This image" scope applies all four fields locally;
  Selected/All batch-applies the two that persist per OTHER capture (palette
  + tuning, one PATCH per capture via new `settings-batch-api.ts`) with the
  same Keep/Undo toast pattern as `AnalyzeTuning`'s existing batch apply.
- **Sticky mini-summary.** New `AnalyzeMiniSummary` — `Max/Min/Avg` computed
  with a manual min/max/sum loop (NOT `Math.max(...array)`, which would blow
  the call stack on a 640×512 = 327,680-element grid) — sits above the
  right-rail accordions, always visible regardless of which accordion is open.

**Bug found and fixed (pre-existing, not introduced this slice):**
`V2PanelFrame`'s center Panel had no `defaultSize` prop (relied on `flex-1`
CSS alone). `react-resizable-panels` needs an explicit `defaultSize` on
every panel in a group for a correct first render — confirmed via direct DOM
measurement that the Library tab's 3-panel layout (left+center+right) was
hydrating with the center panel at **~25px wide** (should be ~700px), pushing
the real thumbnail grid underneath/behind the right rail so clicks landed on
the "Next steps" panel instead. The 2-panel Analyze tab (post-L1+W3, no left
rail) happened not to trip this. Fixed by computing `centerDefaultSize =
100 - left% - right%` explicitly. This was very likely the root cause of the
original double-click test failure, not a bug in the double-click wiring
itself (confirmed by dispatching a raw native `dblclick` DOM event directly,
which worked correctly once the layout was fixed).

**Verification:**
- Scoped typecheck: clean. `guard:architecture` — PASS. `guard:design` —
  pre-existing failures only. File sizes: `AnalyzePanel.tsx` grew past 300
  with the new copy/paste + summary code, so the copy/paste state machine was
  extracted to `useSettingsClipboardActions.ts` and the summary row to
  `AnalyzeMiniSummary.tsx`, bringing `AnalyzePanel.tsx` back to 276 lines.
- e2e: `e2e/thermal-v2-w1-workflow.spec.ts` — 6 specs (double-click→Analyze,
  empty-state start strip via a new `?empty=1` preview harness param,
  drop-anywhere upload, palette seed+persist, copy→paste, sticky summary).
  Two test-authoring fixes needed along the way: (1) the left rail's own
  dropzone text contains "choose files" as a substring, colliding with the
  new center-panel button under Playwright's default substring name
  matching — scoped the assertion to the viewer panel testid; (2) palette/
  tuning autosave is gated on `useAnalyzeImage`'s `!grid` check, so tests
  that exercise it need the `/grid` endpoint mocked (the R1/L1+W3 specs
  never needed this since findings-note autosave doesn't share that gate).
- Un-mocked persistence: palette is a pre-existing PATCH field on the real
  capture route (verified in R1's review of `captures/[captureId]/route.ts`);
  no new server-side mutation was added this slice.

---

## Slice 2 — L1+W3 layout restructure + polish (2026-07-10)

**Shipped:**
- **Killed the duplicate "Working set" strip.** `AnalyzePanel.tsx` had a
  left rail (`AnalyzeCaptureStrip` vertical) rendering the exact same capture
  list as the bottom filmstrip (`AnalyzeCaptureStrip` horizontal) — confirmed
  redundant per Addendum D3. Removed the `left` slot entirely; the bottom
  filmstrip is now the one place to browse/select images in Analyze.
- **Viewer ≥60% width at 1440×900.** A direct consequence of removing the
  duplicate strip: center went from `56%` (100 − 22 left − 22 right) to
  `~62%` (measured via DOM `getBoundingClientRect`, confirmed both by e2e and
  a live `preview_eval` check).
- **Single-open accordions.** `AnalyzeAccordion` was self-toggling (each of
  the 4 sections held its own `useState`, so multiple could stack open).
  Converted to a controlled component; `AnalyzePanel` now owns one
  `openSection` string so opening one closes the others (Measurements opens
  first, per doc §1).
- **°C/°F → ⋯ overflow menu.** Moved out of a standalone toolbar segmented
  control into a small "More display settings" dropdown (same open/close
  pattern as the existing area-shape picker) — one fewer pill-shaped control
  competing with the tool segmented control for toolbar space.
- **Scope-pill ✕.** `ScopePill` now renders a small ✕ whenever scope isn't
  "This image", resetting it in one click.
- **Esc-cascade.** `ThermalV2Shell` owns a global Escape listener with a
  2-level cascade: the active tab can register a handler (Analyze registers
  "clear the selected measurement, return whether it did"); only when that
  returns false does Escape fall through to resetting the Scope pill. Wired
  via a ref-based `registerEscapeHandler` callback (Analyze → Shell) rather
  than lifting all of `useAnalyzeImage`'s state up, to keep the change small.
- **"Every slider gets a type-in twin" — audited, already satisfied.**
  `AnalyzeTuning`'s `Field` component already pairs a number input with each
  `<input type="range">` (Emissivity, Reflected temp — shipped in S5/S5.5).
  `AnalyzeDisplay`'s span/isotherm controls are number-input pairs whose
  "slider" is the legend's draggable handles (shipped in S3) — verified this
  is the only other `type="range"` in the tree (grepped the whole
  `components/thermal-studio-v2` tree — one file, both already paired). No
  code change needed; recorded here so it isn't re-investigated later.
- **One-pill rule — audited, already satisfied.** `ThermalV2Shell`'s top bar
  has exactly one `radiogroup`-styled pill (Scope); the other top-bar items
  (Images count, Saved status, Job status) are plain status chips, not
  pills. No change needed.

**Skipped / scoped down (logged, not silently dropped):**
- **"← Library breadcrumb" (Addendum C).** Not built. Every ThermalV2Shell
  tab is always one click away via the visible tab bar — a separate "←
  Library" button next to the title would do the exact same thing as
  clicking the "Library" tab, which is a literal duplicate control under the
  LOCKED doc's own §0.5 ("no duplicate buttons... every action exists in
  exactly ONE place"). There's also no drill-down sub-screen yet that lacks
  a visible tab bar (those arrive with S7's template editor and S7.5's
  composer) — until one exists, a breadcrumb has no distinct job to do.
  Revisit when S7/S7.5 land a sub-screen that hides the tab bar.
- **"Token/density/micro-interaction audit" (Addendum C).** Treated as a
  light-touch pass, not a full re-theme: reviewed the touched files for
  Graphite Glass token usage and spacing consistency (all clean, no
  hardcoded hex introduced — guard:design confirms) rather than auditing
  every existing V2 screen line-by-line. A full audit is better scoped to
  W4's cross-journey sweep (roster #16), which already exists specifically
  to catch this class of issue across the whole finished app instead of a
  half-built one.

**Verification:**
- Scoped typecheck: clean.
- `guard:architecture` — PASS. `guard:design` — pre-existing failures only
  (untouched files). File sizes: all touched files well under 300 lines
  (`AnalyzePanel.tsx` 250, `ThermalV2Shell.tsx` 132, `AnalyzeToolbar.tsx` 224,
  `ScopePill.tsx` 67, `AnalyzeAccordion.tsx` 36).
- e2e: `e2e/thermal-v2-l1-w3-layout.spec.ts` — 6 specs (no duplicate strip,
  viewer ≥60% width, single-open accordions, unit menu relocation, Scope ✕ +
  Esc cascade, no page scroll at 1280×800/1440×900).
- DOM verification via `preview_eval` at 1440×900 confirmed all of the above
  live (viewer fraction measured 0.62, single accordion expanded, no scroll).
- **Test-harness note:** running the Playwright suite while a separate
  `preview_start` dev server is also live against the same repo caused every
  test to fail on a `localStorage` wait timeout — two `next dev` processes
  compiling into the same `.next` cache concurrently corrupts/slows the
  build. Fix: never run `preview_start` and the Playwright-managed webServer
  at the same time against this repo; confirmed both ports clear before each
  run going forward.
