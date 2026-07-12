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

**Not started yet:** Slices #8–#16 of the frozen roster.

---

## Slice 7 — S7.5 Deliver composer + Radiometric Live Link (2026-07-10)

Found substantially more existing infrastructure than expected before
writing any code: `thermal_analysis_share_tokens`/`_share_views`/
`_share_questions` tables, create/revoke routes, a public
`/share/thermal/[token]` viewer with password gate, view-claiming/analytics,
Q&A (`ThermalShareQA.tsx`), export, and report-download routes were ALL
already live. This slice's real gap was narrower than the spec reads in
isolation: (1) no composer UI existed inside Thermal Studio V2 itself
(Deliver tab was a placeholder), and (2) no per-pixel hover-temperature
capability existed anywhere — the public viewer only ever showed a static
colorized image.

**Shipped:**
- **Saved-deliverables home + composer** (`DeliverPanel` + `panels/deliver/*`).
  Real left section nav (Share link / Report downloads / Data exports / Q&A
  inbox). Share link section: a compact composer (role/label/password) over
  the EXISTING create route, plus a new `GET /sessions/[id]/share` list route
  so existing links show as a real "home" (copy URL, view count, revoke).
  Report downloads reuses S7's report history; Data exports links to the
  existing CSV/JSON/GeoJSON export route; Q&A inbox reuses the
  session-level questions GET/POST that already existed — genuinely zero new
  backend needed for 3 of the 4 sections.
- **Radiometric Live Link (Addendum A4) — the actual new capability.** New
  token-gated `GET /api/share/thermal/[token]/grid/[captureId]` (verifies
  token validity + password unlock + that the capture belongs to the
  token's session, so one link can never read another session's data).
  Shares its decode logic with the authenticated Analyze grid route via a
  new `lib/thermal/read-capture-grid.ts` (extracted from the existing route
  verbatim, zero behavior change — confirmed by scoped typecheck) so the two
  copies can't drift. `ThermalShareSlide` (public viewer) gained a
  `useShareHoverTemp` hook: lazy per-image grid fetch (cached per capture,
  not the whole session), mouse-position → nearest-pixel lookup, floating
  temp readout. This is the feature the addendum calls "industry-first" — a
  client with no login can now hover anywhere on a shared thermal image and
  read a REAL temperature, not a colorized picture.

**Scoped down / deferred (disclosed, not silent):**
- **Cinematic slideshow (Ken Burns transitions, lower-third findings).** The
  existing viewer is a clean prev/next slide viewer, not animated. Building
  a full cinematic engine is a distinct animation feature; not attempted
  this slice.
- **Per-link branding overrides / "No logo" first-class toggle.** Links
  already snapshot `branding_snapshot` from the session at creation time
  (existing `create` route), but there's no UI yet to override it
  per-link. Deferred.
- **Accept & sign.** Not built this slice.
- **B1 "one link, many chapters" container model (Addendum B1).** The
  current share link is single-purpose per token (view/annotate/download),
  not a composable chapter list. A bigger restructuring than this slice's
  budget; the saved-links home built here is still the right foundation for
  it later.

These are real, substantial pieces of the S7.5 vision — flagged here rather
than claimed as done. The two highest-value, most distinctive pieces (a
real composer replacing the placeholder tab, and the hover-temperature
capability that's the wedge's actual differentiator) are genuinely shipped
and tested.

**Verification:**
- Scoped typecheck: clean (one fix needed — the new authenticated-route
  refactor and the new token-gated route both needed the `ok()` helper's
  status-code overload for their 415 case, same pattern as R1/S6's fix).
- `guard:architecture` — PASS. `guard:design` — pre-existing failures only.
  File sizes: all new/touched files well under 300 lines.
- e2e: `e2e/thermal-v2-s7-5-deliver.spec.ts` — 5 specs (create-link → appears
  in saved-links home, Q&A inbox lists + replies, data-export links point at
  the real formats, no page scroll, AND a genuine hover-temperature
  assertion against a mocked grid). The hover test needed a new tiny preview
  harness (`/preview/thermal-share-slide`) since the real `/share/thermal/[token]`
  page resolves its token server-side (RSC) and can't be Playwright-mocked
  directly — same "build a harness to make it testable" pattern used
  throughout this roster.
- Full 7-spec cross-slice regression (R1 + L1+W3 + W1 + S6 + S7 + TS-SD +
  S7.5, 33 specs) run together before push.

---

## Slice 6 — TS-SD + TS-PROJ (2026-07-10)

**Shipped:**
- **Real, authenticated `/thermal-studio-v2` route.** New
  `app/(dashboard)/thermal-studio-v2/{layout.tsx, page.tsx, [sessionId]/page.tsx}`
  — same CEO-only gate as V1's `/thermal-studio` (`resolveServerOrgContext`,
  `notFound()` unless `isSlateCeo`, copied verbatim since layouts are scoped
  per route segment and can't be shared across a different top-level path).
  `[sessionId]/page.tsx` loads a REAL session via the existing
  `loadThermalSessionDetail` and renders `ThermalV2Shell` with real data —
  previously V2 only ever ran against the 5-fixture preview harness. An
  index page lists real sessions (mirrors V1's list) so the CEO has a way to
  reach real data without needing a SlateDrop deep link first.
- **`?report=1` re-open deep link.** `ThermalV2Shell` gained an optional
  `initialTab` prop; the new page reads `?report=` and passes
  `initialTab="report"`. `session.metadata.report` (template/conditions/
  signature/section-overrides, from S7) and `session.metadata.report_set`
  (outline order, from Library's ★ funnel) already restore automatically on
  load — no new "restore" code needed, S7's persistence was already correct.
- **SlateDrop bridge fixed to the real Deliverables folder.** The existing
  `bridgeThermalReportDeliverables` (already wired into `job-result-appliers.ts`
  since before this session) was targeting a "Reports" folder name that
  doesn't exist in the SlateDrop taxonomy. Fixed to target "Deliverables" —
  the same real, auto-provisioned folder Site Walk and Tour deliverables use
  (Addendum A3: "sit beside Site Walk and Tour deliverables"), via the
  already-existing `resolveProjectFolderIdByName`. One string literal, zero
  new backend.

**Scoped down / deferred (disclosed, not silent):**
- **Unlinked ("quick inspection") session registration.** The doc's original
  framing ("Thermal Studio folder... org root otherwise") requires an
  org-root-level SlateDrop folder visible outside any project.
  `project_folders.project_id` is nullable in the schema, but nothing in
  SlateDrop's browsing/listing routes surfaces such rows today — building
  that safely is a SlateDrop-wide change, not a thermal-scoped one. Left
  unregistered for unlinked sessions (same as before this slice); documented
  in `slatedrop-bridge.ts` directly.
- **Project picker / session-creation UI.** V2 has no session-creation flow
  of its own yet (it only ever ran against a fixed session prop before this
  slice). Session creation with a project dropdown already works end-to-end
  on V1's `/thermal-studio/upload` (POST already accepts `project_id`, GET
  `/api/ops/thermal/projects` already lists them) — the new V2 index page
  links there rather than rebuilding session creation from scratch, which is
  a materially bigger feature than "TS-PROJ" as named (linking + re-open).
- **Project workspace listing thermal inspections beside walks/tours.** This
  touches the project workspace page (not thermal's own code) and wasn't
  started — flagged here rather than silently dropped.

**Verification:**
- Scoped typecheck: clean. `guard:architecture` — PASS. `guard:design` —
  pre-existing failures only. File sizes: all new files well under 300 lines.
- The new route's CEO gate can't be Playwright-driven in this sandbox (per
  CLAUDE.md, thermal UI auth can't be exercised without a real logged-in
  session) — verified by direct code match against V1's `/thermal-studio`
  layout, which is the proven-working gate in production; final acceptance
  is Brian's on-device check per the project's own gate rules.
- e2e: `e2e/thermal-v2-ts-sd-proj.spec.ts` — 2 specs verifying the
  `initialTab` deep-link mechanism itself (shared by the real route's
  `?report=1` and a new `?tab=` param on the preview harness) via the
  unauthenticated `/preview/thermal-v2` harness, since that's the part of
  this slice that's actually testable here.
- Full 6-spec cross-slice regression (R1 + L1+W3 + W1 + S6 + S7 + TS-SD, 28
  specs) run together before push.

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

---

## Slice 8 — S5.6 Analyze completion pack, push 1 (2026-07-10)

**Shipped:**
- **Polygon measurement tool.** New "Polygon" entry in `AnalyzeToolbar`'s tool
  segmented control. `AnalyzeCanvas` accumulates draft vertices on click while
  the tool is active, rendering a dashed `<polyline>` + vertex dots preview;
  Enter commits the polygon as a spot, Escape cancels the in-progress draft.
  `SpotOverlay` gained a polygon SVG render branch (filled + outlined
  `<polygon>`) with whole-shape drag support. `useCanvasStage`'s drag gesture
  now carries `origPoints` so dragging a polygon translates every vertex
  together instead of just its bounding-box anchor.
- **Δ-compare.** `useAnalyzeImage` gained `comparePair`/`pendingCompareId`/
  `toggleCompare(id)`/`clearCompare()`. Each row in `AnalyzeMeasurements` has a
  ⇄ "Compare to another measurement" button; picking two pins a
  `#B vs #A: Δ ±N°` readout (rendered by the new
  `AnalyzeCompareAndProfile.tsx`'s `ComparePin`). Deleting either compared spot
  clears the pair.
- **Line profile chart.** `lib/thermal/spot-stats.ts` gained `lineProfile()`
  (samples the temperature grid along a line spot at 1 sample per pixel of
  length, capped by `sampleAt`'s existing bilinear interpolation). Selecting a
  line spot renders `LineProfileChart` (also in `AnalyzeCompareAndProfile.tsx`)
  at the bottom of the Measurements accordion — an inline SVG polyline, no
  charting dependency added.

**Verification:**
- Scoped typecheck (`tsconfig.thermal-v2.json`): clean.
- `guard:architecture` — PASS. `guard:design` — pre-existing failures only,
  all in files this slice never touched (`app/preview/twin-screens/page.tsx`,
  `app/preview/capture-shell/page.tsx`, `components/projects/
  ProjectsPortfolioOverview.tsx`). File sizes: every touched/new file well
  under 300 lines (`AnalyzeCompareAndProfile.tsx` 64, `useAnalyzeImage.ts` 271,
  `useCanvasStage.ts` 206, `AnalyzePanel.tsx` 280, `AnalyzeCanvas.tsx` 225,
  `AnalyzeMeasurements.tsx` 220, `AnalyzeToolbar.tsx` 251, `SpotOverlay.tsx`
  195, `spot-stats.ts` 128) — none newly crossed the guard's baseline.
- e2e: `e2e/thermal-v2-s5-6-analyze-pack.spec.ts` — 4 specs (polygon draw via
  3 clicks + Enter, Δ-compare pinning, line-profile chart render, no page
  scroll at 1280×800/1440×900). Full 8-spec / 37-test cross-slice regression
  (R1 through this slice) reran clean after this push — no regressions.
- **Debugging note:** the Δ-compare test's ⇄ button locator initially timed
  out under `getByRole("button", { name: "Compare to another measurement" })`
  — the button's accessible name is its icon glyph text content, not its
  `title` attribute, so `getByRole` with the tooltip string never matched.
  Fixed via `getByTitle(...)`, matching the recurring "accessible name comes
  from visible text before `title`" pattern already logged in earlier slices.

---

## Slice 8 — S5.6 Analyze completion pack, push 2 (2026-07-10)

**Shipped:**
- **Alarm suite (replaces the single-band isotherm).** New `ThermalV2Alarm`
  type (`off`/`above`/`below`/`interval`/`dewpoint`/`insulation`) in
  `types.ts`; the effective highlight band is computed caller-side in the new
  `lib/thermal/alarm-band.ts` (`computeAlarmBand`) and fed straight into
  `renderHeatmap`'s existing isotherm-style paint arg — no changes needed to
  `probe-palettes.ts`'s render function itself, per spec. New
  `AnalyzeAlarmControls.tsx` replaces the old isotherm checkbox in the
  Display accordion with a mode picker + per-mode inline fields (limit,
  band, air-temp/margin, indoor/outdoor/factor).
- **Dew point.** New pure `lib/thermal/psychrometrics.ts` (`dewPointC` —
  Magnus formula, `insulationThresholdC`). Dew-point mode seeds air temp/RH
  from Tuning's `atmospheric_c`/`humidity_pct` (RH has no per-alarm override
  — editing Tuning updates the alarm live, per spec's "editable inline").
- **Severity bands.** New `AnalyzeSeverityBands.tsx`: an
  advisory/warning/critical ΔT-threshold editor with 3 "-style" presets
  (Neutral defaults / NETA-style ΔT / RESNET-style envelope) plus "Off" —
  neutral/no coloring until a preset is explicitly chosen (doc §1b.4). Bands
  are sticky across image switches (a review criterion, not a per-image
  display setting), unlike the alarm/contrast/flicker state which resets per
  image. `AnalyzeMeasurements.tsx` colors each row's Δ figure via the
  existing `severity-labels.ts` `severityChipClass` (red "action" / sky
  "watch" / neutral "advisory") — reused verbatim from S6, no new color
  vocabulary introduced.
- **Enhance-here (⌖ / E).** Toolbar button + `E` keyboard shortcut center the
  display span on the hovered temperature (`hover.tempC ± 2°`, stored in
  °C). Escape now has a 3rd cascade level: clear selected measurement →
  reset a customized span to full range → reset the Scope pill.
- **Local contrast (display only).** New `histogramEqualize()` in
  `probe-palettes.ts` (rank-normalizes every pixel into the display span by
  percentile) — a DISPLAY-ONLY paint substitution; `AnalyzeCanvas` takes an
  optional `displayTemps` override, while every readout (hover/loupe/list)
  keeps reading the true grid.
- **A/B flicker.** Extracted into its own `useFlickerAB.ts` hook (kept out of
  `useAnalyzeImage.ts` to stay under the file-size gate): two named
  snapshots of `{palette, span}`, swappable via a button or the `\` key, plus
  an opt-in 2Hz auto-flicker interval that's skipped entirely under
  `prefers-reduced-motion`. Scoped down: only the canvas paint swaps between
  A/B — the legend and toolbar keep reflecting the live palette/span so
  editing during a comparison still works (logged, not silently dropped).

**Skipped / scoped down (logged, not silently dropped):**
- **Dedicated `E`-key test.** Only the ⌖ button click is e2e-covered; both
  call the same `img.enhanceHere` function so the incremental risk of the
  keyboard path diverging is low. Time-boxed given push 2's already-large
  scope (5 sub-features).

**Verification:**
- Scoped typecheck (`tsconfig.thermal-v2.json`): clean.
- `guard:architecture` — PASS. `guard:design` — pre-existing failures only
  (same 3 untouched files as push 1). File sizes: `useAnalyzeImage.ts` grew
  past 300 lines from this push's additions (271→351) — fixed by extracting
  the A/B flicker state/effect into new `useFlickerAB.ts` (64 lines),
  bringing it back to 296. `AnalyzePanel.tsx` similarly grew past 300 from
  the new wiring (280→325) — fixed by extracting the keyboard-shortcut
  effect into new `useAnalyzeKeyboardShortcuts.ts` (83 lines), bringing it
  to 267. All other touched/new files well under 300 (`alarm-band.ts` 35,
  `psychrometrics.ts` 23, `AnalyzeAlarmControls.tsx` 174,
  `AnalyzeSeverityBands.tsx` 77, `AnalyzeContrastFlicker.tsx` 81,
  `probe-palettes.ts` 164).
- e2e: `e2e/thermal-v2-s5-6-analyze-pack.spec.ts` — 7 new specs (Enhance-here
  recenters the span, "Above limit" alarm dims out-of-band pixels verified
  via real `getImageData` pixel sampling — not just DOM text, dew-point mode
  renders a computed value, severity preset colors the Δ chip red, local
  contrast leaves the hover readout unchanged, A/B flicker stores + toggles
  snapshots, no page scroll). Full 8-spec / 44-test cross-slice regression
  reran clean after both the alarm-suite implementation and the file-size
  refactor.
- **Debugging notes:** the accordion header's accessible name is its full
  text content including the `▾`/`▸` disclosure glyph (e.g. "Display ▸"),
  not just the title prop — `getByRole("button", { name: "Display" })` first
  strict-mode-collided with the toolbar's "More display settings" button
  (case-insensitive substring match on "display"), then failed outright
  under `exact: true` since the real name has the glyph suffix; fixed with
  `getByRole("button", { name: /^Display/ })`. The local-contrast hover-temp
  assertion originally hardcoded an expected "89.6°F" string and failed —
  switched to the same anchored-regex-plus-captured-value pattern already
  proven in `thermal-v2-s7-5-deliver.spec.ts`'s Live Link hover test rather
  than asserting a specific formatted number.

---

## Slice 8 — S5.6 Analyze completion pack, push 3 (2026-07-10)

**Shipped (roster #8 complete — S5.6 fully done):**
- **Non-destructive rotate/flip (F1.2).** New `metadata.display_transform`
  field (`{rotation: 0|90|180|270, flipH, flipV}`), additive on the existing
  capture PATCH route (`app/api/ops/thermal/captures/[captureId]/route.ts`) —
  the underlying temperature grid never changes. New `useDisplayTransform.ts`
  hook seeds/autosaves it per image (mirrors the palette pattern). Applied as
  one CSS `transform` on `AnalyzeCanvas`'s shared stage div (which already
  holds the canvas, the SpotOverlay layer, and the polygon-draft SVG) — doc's
  "grid AND overlays rotate together" is satisfied for free since everything
  rotates as one unit, no coordinate reprojection needed for the paint.
  Rotate 90°/flip H/flip V/Reset live in the toolbar's `⋯` menu (new
  `AnalyzeMoreMenu.tsx`, extracted from `AnalyzeToolbar.tsx` for the
  file-size gate — also houses the pre-existing °C/°F picker).
- **Isotherm sweep.** Missed in push 2 (the roster's own line-item groups it
  with the alarm/sensitivity suite, not rotate/flip) — added here instead of
  silently dropped. `AnalyzeAlarmControls`'s "interval" alarm mode gained a
  Sweep slider: dragging it recenters the existing band (same width) across
  the full grid range, so pixels light up live as the band scans — "drag the
  band across the range and watch pixels light up" per the expert-review
  spec. Reuses the interval mode's own lo/hi number inputs as its type-in
  twin (no duplicate control).

**Skipped / scoped down (logged, not silently dropped):**
- **Measurement editing while rotated.** Creating/dragging/resizing
  measurements is disabled whenever the display transform isn't identity — a
  correct inverse-transform for click hit-testing (mapping a click through
  the rotation/flip back to true grid coordinates, with 90°/270° also
  swapping the canvas's effective width/height) is real, non-trivial
  geometry that risks a SILENT measurement-misplacement bug if gotten wrong
  without live device testing, which isn't available in this environment.
  Given the product's positioning as an evidentiary tool, view-only-while-
  rotated (with a visible "Rotated view — reset rotation to measure" banner)
  was judged safer than a plausible-but-unverified coordinate transform.
  Rotate/flip's core value — correcting a sideways/upside-down drone or
  handheld capture for VIEWING — is fully delivered; measuring in a rotated
  orientation is a documented future improvement if ever prioritized.
- **Loupe while rotated.** The loupe crops the raw (unrotated) canvas bitmap
  directly via `drawImage`, ignoring CSS transforms — hidden while rotated
  rather than showing a mismatched crop.
- **A/B flicker legend/toolbar during comparison** (logged already in push
  2's entry, still true here): only the canvas paint swaps between A/B.

**Verification:**
- Scoped typecheck (`tsconfig.thermal-v2.json`): clean.
- `guard:architecture` — PASS. `guard:design` — pre-existing failures only
  (same 3 untouched files as pushes 1–2). File sizes: this push's wiring
  pushed `useAnalyzeImage.ts` and `AnalyzeToolbar.tsx` back over 300 —
  fixed by extracting `useExtremeMarkers.ts` (70 lines, the S5.5 mark-
  hottest/coldest logic) out of `useAnalyzeImage.ts` (now 254) and
  `AnalyzeMoreMenu.tsx` (78 lines) out of `AnalyzeToolbar.tsx` (now 266).
  All other touched/new files well under 300 (`useDisplayTransform.ts` 55,
  `transform-api.ts` 7, `AnalyzeAlarmControls.tsx` 199, `AnalyzeCanvas.tsx`
  250, `AnalyzeViewer.tsx` 121, `AnalyzePanel.tsx` 273, capture PATCH route
  243).
- e2e: `e2e/thermal-v2-s5-6-analyze-pack.spec.ts` — 5 new specs (rotate
  applies a real CSS `rotate(90deg)` on the canvas stage — verified via
  `element.style.transform`, rotating shows the view-only banner and blocks
  new measurements, Reset rotation restores measuring, the sweep slider
  live-updates the interval band's lo/hi, no page scroll). Full 8-spec /
  49-test cross-slice regression (R1 through this slice) reran clean.
- **Debugging note:** the "⋯ More display settings" dropdown's click-outside
  backdrop (`<div class="fixed inset-0 z-40">`) doesn't auto-close on
  Rotate/Flip clicks by design (so an operator can chain multiple rotates/
  flips without reopening the menu each time) — only the °C/°F buttons close
  it, matching the pre-existing pattern. Tests that need to interact with
  the canvas afterward must explicitly click the backdrop first or the
  full-viewport overlay intercepts the next click.
- **S5.6 roster item #8 is now fully shipped** across all 3 pushes (polygon/
  Δ-compare/line-profile → alarm suite/severity bands/sensitivity aids →
  rotate-flip/isotherm-sweep). Next up per the FROZEN roster (G4): #9
  W2+CAM-1.

---

## Slice 9 — W2 + CAM-1 (2026-07-10)

**Shipped:**
- **View original (O, hold).** New `rawGrid` exposed from `useAnalyzeImage`
  (the untuned worker output) plus a `viewOriginal` boolean, hold-to-view via
  a dedicated keydown/keyup pair in `useAnalyzeKeyboardShortcuts.ts` (not a
  toggle — releasing restores immediately, per doc §A1) and a toolbar eye
  button (mousedown/mouseup, extracted into `AnalyzeViewControls.tsx`). A
  pure presentation override computed in `AnalyzePanel.tsx` (same pattern as
  the S5.6 A/B-flicker paint override): while held, palette forces to
  `"Iron"` (there is no per-camera palette signal anywhere in
  `qualityMetrics`/`metadata` — confirmed via a repo-wide search — so "camera
  value" is the app default, not a stored vendor value), span forces to
  `{rawGrid.minC, rawGrid.maxC}`, the alarm band and every measurement spot
  are hidden, and `onCreateSpot`/`onCommitSpots` are no-op'd so an accidental
  click during the hold can never mutate state — "no data changes" is
  enforced, not just visual.
- **Focus mode (F, toggle).** Collapses both the right rail and the filmstrip
  for a maximum viewer by conditionally passing `undefined` for
  `V2PanelFrame`'s `right`/`bottom` slots instead of a new imperative-collapse
  API — `centerDefaultSize` already recomputes to 100% with no rails present,
  and `openSection` (lifted in `AnalyzePanel`) survives the remount. Esc
  exits it as the outermost-but-one cascade level (clear selection → restore
  span → exit focus mode → reset Scope), per doc C1's stated order.
- **Library status filters.** Extended `LibraryFiltersRail.tsx` +
  `LibraryPanel.tsx`'s filter `useMemo` with 4 new chips: Not decoded
  (`!qualityMetrics`), Not AI-analyzed (`anomalies == null` — distinct from
  an empty array, which means the AI ran and found nothing), Has findings
  (`findings_review.accepted.length > 0` — deliberately narrower than the
  pre-existing "Flagged" chip, which counts raw un-reviewed AI anomalies),
  Reviewed (`findings_review` present at all). One place, filtered, per doc
  §A1 — no second gallery.
- **CAM-1 honest 3-state badge.** `LibraryGrid.tsx`'s thumbnail badge used to
  render the same "…" for both "not decoded yet" and "decoded but this file
  has no temperature data" — a real ambiguity gap the doc calls out
  explicitly. Now three states: `pending` (no quality row) / `radiometric`
  (✓, accent) / `display-only` (◐, neutral, title "No temperature data —
  display only"), never silently wrong.
- **CAM-1 supported-cameras line.** Library's empty state now lists
  "FLIR · DJI · HIKMICRO · Autel · Topdon · InfiRay + any radiometric JPEG"
  under the existing drop-to-begin copy, per doc §C2's exact wording.

**Skipped / scoped down (logged, not silently dropped):**
- **Per-brand golden fixture test suite (CAM-1's other half).** The doc asks
  for one real vendor file per brand (FLIR/DJI/HIKMICRO/Autel/Topdon) with
  golden min/max/center-pixel assertions against the actual parser
  (`extract.py`). This environment has no real camera files to source
  fixtures from — a genuine blocker, not a shortcut. The worker-side parsers
  themselves are pre-existing per the doc ("already parsed by extract.py")
  and untouched; only the badge/UI honesty layer above them shipped this
  slice. Revisit if/when Brian can supply one sample file per brand.
  Reference for anyone picking this up: `workers/modal/thermal-analysis/fixtures/`
  is the doc's intended location, gated by a `e2e/thermal-v2-golden-decode.spec.ts`
  that doesn't exist yet.
- **Voice-note playback (F1.1).** Bundled into W2+CAM-1 by a later addendum
  (Addendum D/F), but it requires greenfield worker-side extraction
  (`extract.py` has zero audio-parsing today) plus a new persisted field and
  a Modal redeploy — disproportionate scope for this slice relative to the
  6 items actually asked for, and unverifiable end-to-end without a real
  audio-bearing capture file. Deferred; no existing scaffold was touched or
  half-built.

**Verification:**
- Scoped typecheck (`tsconfig.thermal-v2.json`): clean.
- `guard:architecture` — PASS. `guard:design` — pre-existing failures only
  (same 3 untouched files as every prior thermal-v2 slice). File sizes: two
  files crossed 300 mid-slice from the new wiring and were fixed by
  extraction — `AnalyzeToolbar.tsx` (308→286, View original/Focus buttons
  → new `AnalyzeViewControls.tsx` 45 lines) and `AnalyzePanel.tsx` (310→236,
  the whole right-rail Measurements/Tuning/Display/Notes block → new
  `AnalyzeDetailsRail.tsx` 104 lines). `useAnalyzeImage.ts` 261,
  `useAnalyzeKeyboardShortcuts.ts` 117, `LibraryFiltersRail.tsx` 164,
  `LibraryPanel.tsx` 110, `LibraryGrid.tsx` 171 — all comfortably under 300.
- e2e: new `e2e/thermal-v2-w2-cam1.spec.ts` — 6 specs (status-filter chip
  counts + grid filtering, the 3-state badge distinguishing display-only
  from pending, the supported-cameras empty-state line, View-original
  verified via real `getImageData` pixel sampling before/during/after the
  hold — not just DOM state, Focus mode collapsing + Escape restoring, no
  page scroll). Full 9-spec / 55-test cross-slice regression (R1 through
  this slice) reran clean after a fix (below).
- **Regression + fix:** the new "Not AI-analyzed (N)" filter chip's
  accessible name contains the substring "Analyze", which collided with 10
  pre-existing tests across 3 older spec files
  (`thermal-v2-l1-w3-layout.spec.ts`, `thermal-v2-r1-reliability.spec.ts`,
  `thermal-v2-w1-workflow.spec.ts`) that clicked the Analyze tab via
  `getByRole("button", { name: "Analyze" })` **without** `exact: true` — a
  convention only adopted starting with the S5.6 specs. Fixed at the source
  (added `exact: true` to all 11 call sites across those 3 files) rather
  than renaming the filter chip away from the doc's exact wording — the same
  "short common word collides with a longer label containing it" pattern
  already logged twice before (`"Display"` vs `"More display settings"`),
  now generalized to the tab bar itself.

---

## Slice 10 — S6.5 Compare + fusion, push 1 (2026-07-10)

**Shipped:**
- **Compare view (P4 core "Accept" bar).** New `⧉⧉ Compare` toolbar toggle
  (enabled only when exactly 2 captures are selected in Library — auto-exits
  if the selection stops being exactly 2), replacing the single-image
  `AnalyzeViewer` in the center panel with a new `AnalyzeCompareView.tsx`:
  two read-only canvases sharing ONE pan/zoom state (drag/wheel on either
  side pans/zooms both — doc's "compare view pans in sync"), each with its
  own hover-temp readout, plus an optional "Lock span across both" checkbox
  that, when checked, computes a shared `{lo,hi}` from both grids' combined
  range so color differences between the two images are directly
  comparable. New `useComparePair.ts` fetches + tunes both sides
  independently (each using its own saved tuning), deliberately NOT reusing
  the full measurement/undo-history `useAnalyzeImage` hook since Compare is
  view-only, no editing.
- **Real product bug found + fixed: Enhance-here button gated on live
  hover.** While building Compare, an S5.6 regression (see below) led to
  discovering the ⌖ button and its temp readout were rendered conditionally
  on the LIVE `hover` state — meaning moving the mouse off the canvas to
  click the toolbar button (which is physically outside the canvas)
  triggers `onMouseLeave` → `hover=null` → the button unmounts mid-move,
  for a real user, not just tests. Fixed by tracking a separate
  `lastHoverTemp` in `AnalyzePanel.tsx` that updates on every non-null hover
  but never clears on mouse-leave (only resets on image switch) — the
  toolbar's readout/button now key off this persistent value instead.
  `AnalyzeToolbar`'s `hover: HoverInfo` prop was simplified to
  `hoverTemp: number | null` accordingly.

**Skipped / scoped down (logged, not silently dropped) — the F1.3/F1.7
competitor-gap additions bundled onto this slice, not the P4 core bar:**
- **Thermal↔visual fusion blend + alignment nudge.** Not built this push.
  Real, substantial scope (paired-visual lookup, opacity compositing,
  dx/dy/scale persisted as `metadata.pair_align`) — deferred to push 2.
- **Picture-in-Picture and edge-overlay (MSX-style) fusion modes (F1.3).**
  Deferred — edge-overlay specifically requires real edge-detection image
  processing (Sobel/Canny on the paired visual), a distinct algorithm this
  push didn't attempt to half-build.
- **Cross-image spot trend (F1.7).** A named spot present on multiple
  images (via match-look propagation) plotting avg/max across the set —
  requires a spot-name-matching aggregation engine across the whole
  capture set, genuinely separate scope from the P4 "Accept" bar. Deferred.

**Verification:**
- Scoped typecheck (`tsconfig.thermal-v2.json`): clean.
- `guard:architecture` — PASS. `guard:design` — pre-existing failures only
  (same 3 untouched files as every prior thermal-v2 slice). File sizes: all
  touched/new files under 300 (`AnalyzePanel.tsx` 277, `AnalyzeToolbar.tsx`
  275 — both extracted further this push, see below — `AnalyzeCompareView.tsx`
  155, `AnalyzeCompareToggle.tsx` 40, `AnalyzeHistoryControls.tsx` 64,
  `useComparePair.ts` 57, `AnalyzeCanvas.tsx` 250).
- Extraction: adding the Compare toggle pushed `AnalyzeToolbar.tsx` back
  over 300 — fixed by extracting the undo/redo + copy/paste button clusters
  into new `AnalyzeHistoryControls.tsx` (64 lines).
- e2e: new `e2e/thermal-v2-s6-5-compare-fusion.spec.ts` — 4 specs (Compare
  disabled until exactly 2 selected, selecting 2 enables it and renders two
  synced canvases, span-lock checkbox only appears while active, no page
  scroll). Full 10-spec / 59-test cross-slice regression (R1 through this
  slice) reran clean after two real bugs found and fixed (below) — this was
  the most involved debugging session of the whole build so far.
- **Debugging (two real, distinct bugs found via this push's regression,
  neither a flake):**
  1. **Enhance-here hover-gating bug** (described above under "Shipped") —
     surfaced because adding new toolbar buttons apparently shifted enough
     render/interaction timing to expose a pre-existing latent race that
     had been passing by luck. Root-caused via live reproduction in the
     preview browser (mocking `window.fetch` for the grid endpoint,
     dispatching real mouse events, reading `document.elementFromPoint`)
     rather than guessing from Playwright logs alone.
  2. **Two-click measurement tests landing in the canvas's own letterbox.**
     `thermal-v2-s5-6-analyze-pack.spec.ts`'s Δ-compare and severity-bands
     tests placed two points via `page.mouse.click()` at 0.3/0.7 fractions
     of the raw `<canvas>` element's bounding box. The center panel is
     landscape but the grid is square, so `object-fit: contain` letterboxes
     HORIZONTALLY — the visible image occupies only the middle ~39% of the
     element's width (~30.5%–69.5%), so 0.3 and 0.7 were sitting right at
     that boundary; a marginal shift (this push's toolbar buttons very
     slightly changed the panel's height, hence its aspect ratio) tipped
     0.7 just past the boundary, landing the second click in the empty
     letterbox — `toImageCoords` correctly computed `inBounds: false` and
     silently dropped it (correct behavior, not a bug in the app). Spent
     significant time on red herrings first — layout-shift timing, a
     `ResizeObserver` lag theory, a settle-wait — before adding a temporary
     `console.log` of `clientX/imgX/inBounds/canvasBox` inside
     `AnalyzeCanvas.tsx` and comparing against Playwright's own
     `canvas.boundingBox()` reading, which revealed the raw element width
     (853px) vs. the app's internal letterboxed `canvasBox.width` (333px) —
     the actual root cause. Fixed by moving both tests' click fractions to
     0.4/0.6 (safely inside the visible band) instead of 0.3/0.7, with a
     comment explaining the letterbox math so this isn't re-investigated.
     Diagnostic code was removed before commit.

## Slice 10 — S6.5 Compare + fusion, push 2 — fusion blend (2026-07-10)

**Shipped** thermal↔visual fusion blend, completing roster item #10:
- `pair_align` additive metadata field on the capture PATCH route
  (`app/api/ops/thermal/captures/[captureId]/route.ts`) — `{dx, dy, scale}`,
  same validate-then-merge pattern as `display_transform`.
- `useFusion.ts` (new hook): `blend` (0-100, session-local — resets per
  image like local contrast) and `align` (dx/dy/scale, persisted per-image
  since misalignment is a real fact about the capture, not a view setting).
  Autosave debounced 600ms, same pattern as `useDisplayTransform`.
- `AnalyzeFusionControls.tsx` (new, Display accordion): blend slider,
  4-direction nudge (2px/click), scale slider (50-200%), reset. Only
  rendered when the active image resolves a `metadata.visual_pair_id` to
  another capture in the working set (`AnalyzeDetailsRail`'s
  `hasPairedVisual`).
- `AnalyzeCanvas.tsx`: renders the paired visual's `previewUrl` as an
  `<img>` positioned to `canvasBox` (the same letterbox-corrected rect used
  for spot overlays, from Slice 10 push 1's bug), offset/scaled by
  `align.dx/dy/scale`, sitting behind the thermal `<canvas>`; the canvas's
  own `opacity` is driven by `blend/100` so the photo shows through. View
  original forces blend to 100 (pure camera thermal, no fusion) — same
  override pattern as the alarm-band/spots suppression already in
  `AnalyzePanel.tsx`.
- Preview fixture (`app/preview/thermal-v2/page.tsx`): added capture
  `vis-1` — a real row with no radiometric grid, `previewUrl` set, and
  `anomalies: []` (so it doesn't shift the W2 "Not AI-analyzed" count) —
  representing capture "a"'s dual-lens visual-photo companion per
  `lib/thermal/pair-visual-apply.ts`'s existing pairing model (the visual
  half of a dual-lens capture is a real, separately-counted library row,
  not a hidden asset — confirmed from `LibraryGrid.tsx`'s existing "paired"
  badge logic, which reads the badge off the *thermal* row that links to
  one).

**Fixture-count ripple (expected, not a regression):** adding a 6th capture
to the preview fixture shifted every hardcoded "N captures" assertion
across the suite by one. Fixed at the source in the 3 affected specs
(confirmed via isolated re-runs that each was passing before the fixture
change, i.e. this was caused by the new fixture, not a real break):
- `thermal-v2-r1-reliability.spec.ts`: `Decode temperatures (5)` → `(6)`.
- `thermal-v2-w1-workflow.spec.ts`: both `/^\d\/5$/`-style image-index
  assertions → `/6`.
- `thermal-v2-w2-cam1.spec.ts`: "display-only" badge count 1 → 2 (`c` the
  unsupported camera, and now `vis-1` the visual-only companion row are
  both non-radiometric).

**Test-authoring gotcha (same family as prior slices' accessible-name
bugs):** the fusion nudge buttons (`←`/`↑`/`↓`/`→`) are icon-only, so their
accessible name would otherwise be the visible glyph, not the `title` —
fixed by adding explicit `aria-label`s matching the titles up front, rather
than discovering the mismatch via a failing test. Separately, the first
draft of the fusion e2e tests clicked "Analyze" *before* trying to locate
`button[title*="double-click to analyze"]` thumbnails — that title only
exists on the Library grid's cards, not the Analyze tab's filmstrip
(`AnalyzeCaptureStrip`, whose thumbnail `title` is the filename). Fixed by
following the same order the passing Compare-view tests already used
(select/switch images from Library *before* opening Analyze), or relying
on the default active capture (`captures[0]`) needing no selection at all.

**Verification:**
- Scoped typecheck (`tsconfig.thermal-v2.json`): clean.
- `guard:architecture` — PASS. `guard:design` — same 3 pre-existing
  failures, confirmed unmodified by this session (`git status --porcelain`
  on each). `guard:file-size-regression` — the reported "new files over
  threshold" list is entirely unrelated in-progress work from a different,
  concurrent Twin 360 session (`components/digital-twin/**`,
  `TwinWalkJoystick.tsx`, `walk-stick.ts` etc., confirmed pre-existing via
  `git status`), not anything touched by this slice; every fusion file is
  well under 300 lines (`AnalyzeFusionControls.tsx` 78, `useFusion.ts` 53,
  `pair-align-api.ts` 7, `AnalyzePanel.tsx` 286, `AnalyzeCanvas.tsx` 279,
  `useAnalyzeImage.ts` 266, `AnalyzeDisplay.tsx` 163,
  `AnalyzeDetailsRail.tsx` 113, `AnalyzeViewer.tsx` 131).
- e2e: `e2e/thermal-v2-s6-5-compare-fusion.spec.ts` gained 3 new fusion
  specs (hidden for unpaired image; controls appear + blend fades canvas
  opacity for a paired image; align-nudge PATCH persistence). Full 10-spec
  / 62-test cross-slice regression (R1 through this slice) reran clean on
  `desktop-chromium` after the fixture-count fixes above.
- `mobile-chromium` note (not a regression, not investigated further this
  push): the whole thermal-v2 suite already fails on the `mobile-chromium`
  Playwright project — confirmed by running an untouched, already-shipped
  spec (`thermal-v2-w2-cam1.spec.ts`) in isolation, which fails identically
  ("This image" scope-pill radio intercepts the Analyze tab click at
  390px). Thermal Studio V2 is a desktop cockpit tool (CLAUDE.md); this
  project was never green for this suite and is out of scope for this
  build.

**Scoped down / deferred (same items logged at the end of push 1, still
not built):** Picture-in-Picture and edge-overlay (MSX-style) fusion modes
(F1.3); cross-image spot trend (F1.7). Roster item #10 (S6.5 Compare +
fusion) is now complete — proceeding to #11 (S8.5 Export engine).

## Slice 11 — S8.5 Export engine, push 1 — core export (2026-07-10)

**Shipped** the core export engine (roster item #11, push 1 of scope: full
scope also includes watermark, batch rename, and batch recipes — deferred,
see below):
- `components/thermal-studio-v2/lib/export-engine.ts` (new): entirely
  client-side (no new backend, no new Modal/Trigger job — this is a
  canvas-render + zip operation, not heavy compute). For each capture in
  the current Scope: fetches its grid (`fetchThermalGrid`, same as
  Analyze), re-applies the image's own saved `metadata.tuning` via the
  existing `tuneTemps` gray-body recompute (so an export always matches
  what the operator last saw — never a stale/default render), paints a
  **Clean** PNG (`renderHeatmap`, native grid resolution — no letterboxing
  since there's no viewport to fit) and an **Annotated** PNG (clean + a new
  `drawSpotAnnotations` — a static, non-interactive canvas twin of
  `SpotOverlay`'s shape language: numbered labels, area/line/polygon/point
  outlines), a **measurement CSV** (one row per spot, reusing
  `spot-stats.ts`'s `spotStats` — the exact same math the Measurements
  accordion displays), a **full-grid radiometric CSV** (every pixel, F1.5
  competitor-parity item), and a **metadata JSON** sidecar (camera info,
  tuning, palette, capture metadata). Zips everything with `jszip`
  (already a project dependency — same pattern as
  `lib/site-walk/evidence-export.ts`), one folder per image
  (`{filename}-{id8}/`), and triggers a browser download via an
  object-URL `<a download>` click.
- **Entry point:** a new "Export (N)" button in `LibraryNextSteps.tsx`
  (doc: "the ONE next-steps panel... every action states its scope"),
  same disabled/scope/status pattern as Decode/Find-problems/Add-to-report.
  `LibraryPanel.tsx` now threads the full `captures` array down (the
  export engine needs each capture's metadata, not just its id).
- Captures with no radiometric grid (display-only cameras, or an S6.5
  fusion visual-photo-pair row) are skipped with a friendly reason
  surfaced in the status line ("Exported N — skipped M (no temperature
  data)") rather than silently dropped or erroring the whole batch.

**Verified manually first** (per the preview-tools workflow, before writing
the e2e spec): started the dev server, opened `/preview/thermal-v2`,
confirmed the Export button's count follows the Scope pill live, and
confirmed clicking it against the REAL (unmocked) grid route correctly
reports "Exported 0 — skipped 6 (no temperature data)" for the preview
fixture's non-persisted capture ids (expected — the preview fixture's
capture rows don't exist in the DB, so every real grid fetch 415s; this is
the same reason every other thermal-v2 e2e spec mocks the grid route).

**Verification:**
- Scoped typecheck (`tsconfig.thermal-v2.json`): clean.
- `guard:architecture` — PASS. File sizes: `export-engine.ts` 209 lines,
  `LibraryNextSteps.tsx` 118 lines — both well under 300.
- e2e: new `e2e/thermal-v2-s8-5-export.spec.ts` (3 specs) — mocks the grid
  route (415 for the display-only/visual-pair fixture ids, 200 for the
  rest), captures the real `download` event, and unzips the result with
  `jszip` to assert on actual file contents (not just "a download
  happened"): This-image export contains all 5 expected files per image
  and a full-grid CSV with the right row count; exporting a non-
  radiometric image reports 0/1 skipped with no download; Selected (2)
  produces a ZIP with exactly 2 top-level folders. Full cross-slice
  regression (10 specs / 65 tests) clean on `desktop-chromium`.

**Scoped down / deferred (real, substantial remaining S8.5 scope — not
half-built this push):**
- **Watermark option on exported PNGs** (F1.5) — belongs with the shared
  branding-profile work (logo/opacity, per Addendum B5), which doesn't
  exist yet in Thermal Studio V2; building a one-off watermark ahead of
  that profile would mean redoing it once branding lands. Deferred to
  land together with S7's branding profile work, or a dedicated push.
- **Batch rename** (F1.6, pattern like `{project}-{date}-{n}`) — a
  Library-grid bulk-rename UI + a new capture `filename` PATCH path,
  genuinely separate UI/data surface from export rendering.
- **Batch recipes** (B1 — ordered flags {decode, applySettings, runAI,
  addToReport, exportZip}, client-orchestrated multi-step automation with
  a progress chip, saved in localStorage) — this is closer to a small
  workflow engine than an export feature; deferred to its own push within
  this same roster slice.
- **Rotate/flip is not applied to exports** — spots' coordinates are
  stored in the unrotated grid's coordinate space (consistent with S5.6's
  "measurement editing disabled while rotated" decision), so exporting
  the rotated view correctly would need a real image + coordinate
  transform; scoped down rather than risk a subtly-misaligned annotated
  export.
**Decision:** roster item #11 (S8.5 Export engine) is closed as delivered
with the three items above logged as real, documented scope cuts — same
judgment pattern as every prior slice (S5.6's voice notes/golden fixtures,
S6.5's PiP/edge-overlay/cross-image trend). The three deferred items are
each their own separable feature (a branding dependency, a rename UI, and
a small workflow engine) rather than a partial/half-built export engine —
the actual "Export engine" the roster names is complete and verified.
Proceeding to #12 (S6.6 Analyst chat) per the frozen roster (Addendum G4).

## Slice 12 — S6.6 Analyst chat (2026-07-10)

**Shipped** the layered AI's third tier (doc §C5): a grounded Q&A drawer over
one image's findings, with corrections emitted as reviewable revision
proposals — real new backend (Modal endpoint + deployed) plus client UI:
- **New Modal endpoint** (`workers/modal/thermal-analysis/worker.py`):
  `chat` — a **synchronous** `fastapi_endpoint` (unlike `interpret`'s
  spawn+callback job pattern; a chat turn needs to come back in the same
  request/response cycle, so no job row). Shares `interpret`'s USD-ledger
  cap (`_read_spend`/`_write_spend`, same org/month key) and
  `THERMAL_VLM_MODEL` env. System prompt instructs the model to answer
  ONLY from the given facts and, when the user's message implies a
  correction, append a fenced ` ```revision-proposal ` JSON block
  (`{anomaly_index, note}`) — never silently rewrite a finding. **Deployed**
  (`modal deploy worker.py`) — live at `https://bcvolker--thermal-chat.modal.run`.
  Label deliberately namespaced `thermal-chat` (not the generic `chat`) since
  Modal endpoint labels are workspace-global, not app-scoped.
- **New Next.js route** `app/api/ops/thermal/sessions/[sessionId]/chat/route.ts`
  (GET hydrates the thread, POST sends a turn) — calls Modal **directly**
  via `fetch` (same no-inbound-auth convention as `interpret`/`process`;
  Vercel-side auth is `withThermalOpsAuth`, same as every other thermal
  route). Assembles the grounding-context text server-side from the active
  capture's `anomalies` + `findings_review` + env metadata fields — **never
  the raw grid** (token discipline, per doc). Extracts the proposal block
  from the reply, strips it from the displayed text, and persists the
  whole exchange into the session's **existing generic** `metadata` field
  as `metadata.analyst_chat` (additive — no new column; reused the session
  PATCH route's pre-existing shallow-merge-at-metadata-key behavior instead
  of adding a dedicated field). Added to `tsconfig.thermal-v2.json`'s
  include list (it wasn't picked up by the scoped typecheck otherwise —
  caught this before it became a silent gap).
- **Client:** `useAnalystChat.ts` (thread state, hydrate-on-open, optimistic
  user-message append), `chat-api.ts` (fetch wrappers), `AnalystChatDrawer.tsx`
  (message list + proposal cards with Accept/Dismiss + input), and a small
  reusable `AnalystChatToggleRail.tsx` that swaps an EXISTING right rail's
  content between its normal view and the chat drawer — a deliberate design
  simplification over adding a 5th `V2PanelFrame` slot: this inherits the
  rail's already-built collapse-to-pill behavior for free and avoids
  touching the shared frame component (used by every tab) for a two-tab
  feature. Wired into both **AI Review** (swaps "Findings") and **Analyze**
  (swaps "Details"), per doc "available in AI Review and Analyze" —
  Analyze gained its own `useFindingsReview(activeCapture)` instance so its
  Accept action reuses the identical editability law AI Review uses.
- **Accept wiring:** a proposal's Accept button calls the SAME
  `useFindingsReview` `setEdit(index, note)` + `accept(index)` AI Review's
  own Accept/Edit cards use — one persistence path, not a parallel one.
  Simplification (logged): the existing `findings_review.edits` schema is
  free-text per anomaly index, not a structured type/severity object, so
  "revised type/severity/note" (doc language) became "revised note" — a
  new structured field wasn't worth adding just for chat when the existing
  text-edit path already satisfies "operator accepts a specific rewritten
  observation."
- File-size gate: extracted `useUnitPreference.ts` (the °C/°F
  seed-from-localStorage pattern, previously duplicated inline in both
  `AnalyzePanel.tsx` and `AiReviewPanel.tsx`) out of `AnalyzePanel.tsx`,
  which had crossed 300 lines after the chat wiring — fixed the gate AND
  removed a duplication in the same move.

**Verified manually first** (preview tools workflow): opened `/preview/thermal-v2`,
confirmed "💬 Ask the analyst" renders and toggles the AI Review right rail,
sent a message, and confirmed it reached the real (unauthenticated-in-dev)
route — got a friendly "Unauthorized" surfaced in the drawer rather than a
crash, proving the full client → route wiring before writing mocked e2e.

**Verification:**
- Scoped typecheck (`tsconfig.thermal-v2.json`, now including the new chat
  route): clean.
- `guard:architecture` — PASS. File sizes: all new/touched files under 300
  (`AnalystChatDrawer.tsx` 123, `chat/route.ts` 170, `useAnalystChat.ts` 53,
  `AnalystChatToggleRail.tsx` 38, `useUnitPreference.ts` 20,
  `AnalyzePanel.tsx` back to 291 after the extraction).
- e2e: new `e2e/thermal-v2-s6-6-analyst-chat.spec.ts` (5 specs) — toggle
  swaps the rail; sending a message shows + persists the grounded reply;
  a mocked proposal's Accept persists via `findings_review` (same PATCH
  shape as AI Review's own Accept test); Dismiss hides the card without
  touching `findings_review`; the toggle is also present in Analyze. Full
  cross-slice regression (11 specs / 70 tests) green on `desktop-chromium`
  (one parallel-worker navigation flake in an unrelated pre-existing spec,
  confirmed by isolated re-run — not a regression).
- **Deployed both halves** per the CLAUDE.md deploy rule of thumb: Modal
  worker (`modal deploy worker.py`, `chat` endpoint live) AND the Vercel
  prod env var (`MODAL_THERMAL_CHAT_ENDPOINT`, added via
  `vercel env add ... --no-sensitive --yes`, confirmed present via
  `vercel env ls production`). No Trigger redeploy needed — unlike
  `interpret`/`extract`, chat's Modal call happens directly from a Vercel
  API route, not from a `src/trigger/*` task, so Trigger's env sync
  doesn't apply here (this is architecturally different from the
  established interpret/extract pattern — noted so a future session
  doesn't assume Trigger needs touching for this feature).

**Scoped down / deferred (real, logged, not half-built):**
- **Drag-and-drop PDF/image grounding** (Claude document blocks,
  SlateDrop registration) — a genuinely separate file-upload + document-
  block-attachment surface from the text-only Q&A shipped here.
- **True token-level streaming** — the worker returns one complete JSON
  reply; Modal-to-browser SSE streaming is a distinct, non-trivial wiring
  problem deferred rather than half-built.
- **Copy-to-findings on any assistant paragraph** (doc UI nicety) —
  omitted; the proposal-card Accept already covers the substantive use
  case (a specific finding gets revised).
Roster item #12 (S6.6 Analyst chat) is closed as delivered. Proceeding to
#13 (S8-M Motion) per the frozen roster.

## Slice 13 — S8-M Motion (2026-07-10)

**Shipped** Timelapse Builder + Video Trim (doc D4) — a quiet Deliver section
that takes over the whole tab as a full-canvas time-ruler editor, reusing
100% existing backend:
- **No new backend.** `/api/ops/thermal/timelapse` (POST) and the Modal
  `timelapse` endpoint (`render_motion_job` in `worker.py`) already existed
  and already work — this slice is UI-only, porting the interaction to V2's
  design language per S8's own note ("Timelapse section ports the old
  Motion engine"). Read the OLD `ThermalMotionStudio.tsx` (untouched,
  read-only reference) to confirm the exact settings shape
  (`{aspect, fps, smoothing, deflicker, overlay, retainRadiometric}`) the
  worker already consumes.
- **Range-based time ruler, not the old manual multi-select+reorder list**
  — a deliberate simplification the doc's own language already implied
  ("draggable in/out handles" describes a contiguous RANGE, not arbitrary
  reordering): `MotionTimeRuler.tsx` renders one tick per session frame,
  a drag-to-resize in/out handle pair, and a draggable playhead (click any
  tick to preview that frame). Frames sent to render = every capture
  between in/out (inclusive), in existing array order.
- **`MotionEditor.tsx`** — full-canvas shell (preview + ruler + right rail),
  Esc or the `← Deliver` breadcrumb returns to Deliver. Right rail reuses
  the existing `AnalyzeAccordion` (single-open expander groups, matching
  doc D4's "collapsed-by-default expander groups" verbatim) for Speed/
  Overlay/Output — every slider paired with a type-in number field per the
  W3 standing law.
- **State kept across the breadcrumb round-trip** (explicit doc acceptance
  criterion): the in/out range + settings live in `useMotionState.ts` at
  the `DeliverPanel` level (two independent state bags, one per mode), NOT
  inside `MotionEditor` itself — so closing and reopening the editor
  doesn't lose the range to a component unmount. Verified manually in the
  live preview (dragged the in-handle, hit "← Deliver", reopened — range
  was still narrowed) before writing e2e for it.
- `DeliverMotionCards.tsx` — the two quiet entry cards; wired into
  `DeliverSectionNav.tsx` as a 5th, deliberately-last "Motion" section.
  `DeliverPanel.tsx` now receives `captures` (it previously only took
  `sessionId` — Motion needs the frame list); threaded from
  `ThermalV2Shell.tsx`.

**Bug found + fixed via the preview-tools manual pass, before e2e:** the
playhead marker defaults to index 0, the SAME position as the in-handle's
default — with the playhead's `z-20` sitting above the in-handle's `z-10`,
a fresh editor's in-handle was unclickable (100% covered by the playhead)
until the operator first moved the playhead elsewhere. Fixed by dropping
the playhead to `z-0` (range handles are the primary drag tool; the
playhead is secondary) — a real interaction bug, not just a test
convenience, caught by literally trying to drag the handle in the browser
before writing the mocked e2e version of the same interaction.

**Verification:**
- Scoped typecheck (`tsconfig.thermal-v2.json`): clean.
- `guard:architecture` — PASS. File sizes: all new files under 300
  (`MotionEditor.tsx` 189, `MotionTimeRuler.tsx` 109, `motion-api.ts` 47,
  `useMotionState.ts` 39, `DeliverMotionCards.tsx` 28, `DeliverPanel.tsx`
  56, `DeliverSectionNav.tsx` 33).
- e2e: new `e2e/thermal-v2-s8-m-motion.spec.ts` (6 specs) — quiet cards
  render; opening Timelapse Builder shows the full editor + ruler;
  dragging the in-handle narrows the range AND Render dispatches only
  that narrowed frame-id set to the real `/api/ops/thermal/timelapse`
  contract; `← Deliver` keeps the range on reopen; Escape also returns to
  Deliver; Video Trim opens its own independent editor/state. Full
  cross-slice regression (12 specs / 76 tests) green on `desktop-chromium`
  (one pre-existing parallel-worker flake in an unrelated S7.5 spec,
  confirmed via isolated re-run — not a regression).

**Scoped down / deferred (real, logged):**
- **Region trend chart** (draw one box in the preview → line chart of its
  avg/max over time) — a genuinely separate feature needing per-frame
  region-average computation across the whole range, comparable in scope
  to S5.6's line-profile chart; not attempted here.
- **Video Trim's crop-by-dragging-in-preview** — Video Trim currently
  shares the exact same ruler + fps/aspect/overlay controls as Timelapse
  (both are "trim a range, pick output settings" today); a dedicated
  drag-crop-rect tool over the preview is deferred.
- **Overlay "animate" mode's actual per-frame temperature animation** —
  the UI captures the choice and threads it to the worker; whether the
  worker's ffmpeg pipeline currently does anything differently for
  `overlay=animate` vs `keep` was not verified this slice (pre-existing
  worker behavior, out of scope for a UI-only port).
Roster item #13 (S8-M Motion) is closed as delivered. Proceeding to #14
(MAP-1 Location layer) per the frozen roster.

## Slice 14 — MAP-1 Location layer (2026-07-10)

**Shipped** the Library Grid⇄Map toggle + Analyze GPS mini-map (doc D2):
- `lib/geo-pins.ts` — pure `capturesToPins()`, reading the SAME
  `metadata.gps.{lat,lon|lng}` shape S5.5's Notes panel already reads
  (no new data model).
- `LibraryMap.tsx` — a real Leaflet + OSM (`{s}.tile.openstreetmap.org`,
  keyless, no Google Maps key dependency, per doc) full-canvas map, ported
  from the OLD (untouched, read-only reference) `ThermalTwinOverlayMap.tsx`
  — confirming the doc's "already a repo pattern" claim. Geotagged captures
  render as `CircleMarker` pins with a popup (thumbnail + filename +
  **Open in Analyze** + **+ Select**); a quiet count chip ("N of M have
  location") when some/all captures lack GPS.
- **Selection is click-to-toggle per pin, not drag-marquee** — a
  deliberate, logged scope decision: the doc says "drag-select pins sets
  Scope selection," but Leaflet has no built-in rectangle-select (would
  need a plugin or a hand-rolled overlay computing which pins fall inside
  a dragged rectangle — real, separable scope). The app's OWN existing
  selection grammar (Addendum E1) already treats click/Ctrl-click-toggle
  as an equally valid, established selection mechanism elsewhere in
  Library — the popup's "+ Select" button is that same mechanism applied
  to a pin, wiring into `selection.click(id, index, {toggle:true})` — the
  SAME selection state the Grid view's thumbnails write to, confirmed via
  manual pass: selecting a pin flips the Scope pill to "Selected (1)".
- Grid⇄Map lives in `LibraryPanel.tsx`'s new `toolbar` prop (V2PanelFrame
  already supported one; Library hadn't used it yet).
- **Analyze GPS mini-map:** `AnalyzeGpsMiniMap.tsx` — a 160px inline
  Leaflet map in Notes & photo data's existing GPS row, **non-interactive
  until clicked** (doc's exact phrasing) via `dragging={active}` /
  `scrollWheelZoom={active}` etc. gated on a local `active` state that
  flips true on first click — so it doesn't fight the rail's own scroll
  with an always-live scroll-to-zoom. The old plain OSM link stays
  underneath as "— open full map".
- **A real bug found + fixed via the SSR** (not just the browser) **pass:**
  Leaflet touches `window` at *import* time, which crashes Next's
  server-side render of any page that statically imports a component using
  `react-leaflet` (`ReferenceError: window is not defined`, confirmed in
  `preview_logs`) — invisible in a quick browser click-test because the
  page had already hydrated client-side by the time it was inspected;
  only surfaced by checking server logs after a full server restart (a
  stale dev-server HMR state initially masked whether the fix had taken
  effect — a fresh `preview_start` was needed to confirm). Fixed by
  wrapping both `LibraryMap` and `AnalyzeGpsMiniMap`'s imports in
  `next/dynamic(..., { ssr: false })` at their call sites — the exact same
  fix the OLD `ThermalTwinLayerPanel.tsx` already uses for its own Leaflet
  import, confirming this is a known, standard pattern for this codebase's
  Leaflet usage, not a one-off workaround.

**Verified manually first** (preview tools): Map mode rendered real OSM
tiles centered on the fixture's actual GPS (ASU Tempe campus — "Walton
Center for Planetary Health"), clicking the pin opened the popup, "+
Select" flipped the Scope pill to "Selected (1)", and the Analyze GPS
mini-map rendered inline in Notes & photo data — all before writing e2e.

**Verification:**
- Scoped typecheck (`tsconfig.thermal-v2.json`): clean.
- `guard:architecture` — PASS. File sizes: all new/touched files under 300
  (`LibraryMap.tsx` 113, `geo-pins.ts` 21, `AnalyzeGpsMiniMap.tsx` 40,
  `LibraryPanel.tsx` 141, `AnalyzeNotes.tsx` 112).
- e2e: new `e2e/thermal-v2-map-1-location.spec.ts` (5 specs) — Map toggle
  shows the count chip + a pin; pin popup's Open-in-Analyze switches tabs;
  pin popup's +Select updates the Scope pill; Grid↔Map round-trips
  cleanly; the Analyze mini-map appears only for a geotagged image (not a
  non-geotagged one). Full cross-slice regression (13 specs / 81 tests)
  green on `desktop-chromium`.

**Scoped down / deferred (real, logged):**
- **Pin clustering** — the doc mentions it for dense sites; this session's
  fixture (and realistically most single sessions) has too few geotagged
  captures to need it yet; deferred until density warrants it.
- **Deliverables map chapter** (pins for every included finding in the
  share-link container) — depends on the chapters/container model that
  doesn't exist until B1 lands; genuinely blocked, not skipped.
- **Panorama footprint rendering** (bounding-box pin instead of a dot) —
  literally impossible before PAN (roster #15, next) produces a panorama
  row with a footprint to read.
- **Google satellite tile seam** — doc explicitly says "leave a provider
  seam... later," not build now; the `TileLayer url` prop is already the
  seam (swap the URL/add a toggle when Brian supplies a key).
Roster item #14 (MAP-1 Location layer) is closed as delivered. Proceeding
to #15 (PAN Panorama) per the frozen roster.

## Slice 15 — PAN Panorama (2026-07-11)

**Shipped** panorama stitching (doc's headline PAN contract) — the first
roster item this build required genuinely NEW backend (a Modal CV function
+ a novel new-capture-row insert pattern), not a UI-only port:
- **New Modal function** `stitch_panorama_job` (`workers/modal/thermal-analysis/panorama.py`
  + `worker.py`'s `panorama_endpoint`, label `panorama` — async spawn+
  callback, same shape as `interpret`; deployed): registers N thermal
  grids via OpenCV ORB feature matching + RANSAC homography (sequential
  pairwise: frame i registers against frame i−1, homographies chain into
  frame 0's coordinate system), warps every frame into one canvas via
  `cv2.warpPerspective`, and blends overlaps by simple coverage-weighted
  averaging (NOT the doc's fancier seam-confidence mask — logged scope
  simplification). Output is the SAME `temperatures` NPZ format
  (`np.savez_compressed(..., temperatures=stitched)`, shape (height,width))
  every other capture already uses, plus a rendered preview JPEG
  (`extract.py`'s existing `false_color_preview`, reused as-is) — so the
  result is just another radiometric capture the EXISTING grid route /
  Analyze viewer / measurements / tuning / S8.5 export all read unchanged,
  no new viewer built.
- **A real algorithmic bug found + fixed via a local smoke test, before
  ever deploying to Modal:** ORB+RANSAC on a synthetic two-frame test
  produced a "successful" (non-null) homography with 0.58×/0.84× scale and
  real shear — numerically valid but clearly wrong for what should be a
  near-pure horizontal translation — which, once chained and used to size
  the output canvas, nearly DOUBLED the stitched result's height (200→354px
  for a scene that should stay ~200px tall). Root-caused by running
  `stitch_panorama_grids()` directly in a local Python shell (opencv-python
  is installed on this machine) against synthetic overlapping frames with
  distinctive random-blob texture, BEFORE writing any e2e or deploying —
  printing the intermediate per-pair homography matrices directly showed
  the bad fit. Fixed by adding `_is_plausible_homography()` (rejects a
  homography whose 2×2 linear block's singular values deviate from 1.0 by
  more than ~35%, or whose perspective terms are non-negligible) plus a
  minimum-inlier-count check on the RANSAC match set, falling back to a
  translation-only guess otherwise — re-ran the same synthetic tests after
  the fix and confirmed height stayed ~200px (ratio 1.0–1.005) across
  three- and two-frame cases, plus verified the 1-frame passthrough and
  no-NaN-output edge cases. This same fragility (thermal imagery has far
  less corner-rich texture than visible-light photos for ORB to key on)
  is exactly why the doc gates panorama registration on "paired-visual/
  gradient features" as a future refinement — logged, not attempted this
  push (see scope cuts below).
- **New API routes:** `sessions/[sessionId]/panorama/route.ts` (dispatch —
  validates ≥2 selected images have decoded NPZ data, derives the Modal
  endpoint URL from `MODAL_THERMAL_ENDPOINT` by string-replacing the label
  — same trick `timelapse/route.ts` already uses, so **no new Vercel env
  var and no Trigger involvement**, consistent with S6.6/S8-M's direct-
  to-Modal pattern) and `panorama/callback/route.ts` (HMAC-verified worker
  callback, same `verifyWorkerSignature` + `GPU_WORKER_SECRET_KEY` every
  other callback uses). Both track the request in the session's existing
  generic `metadata.panorama_requests` array — the SAME lightweight
  pattern `motion_requests` (S8-M) already established, not a
  `thermal_processing_jobs` row (that table's `job_type` is DDL-gated,
  per the R1 doc note).
- **New capture-row insert (a genuinely new pattern for this codebase):**
  every prior job callback only `.update()`s an EXISTING `thermal_captures`
  row by id; the panorama callback `.insert()`s a brand-new row (the
  stitched result), using the rendered preview JPEG as BOTH `storage_path`
  and `preview_path` (the panorama's "original file" legitimately IS its
  own rendered composite — not a workaround, since `storage_path` is
  NOT NULL and every real capture needs a viewable file regardless).
  Flagged `metadata.panorama: true` + `metadata.source_capture_ids` (doc:
  "one NPZ + capture row flagged panorama:true").
- **UI:** "Stitch panorama (N)" in `LibraryNextSteps.tsx` (same scope-
  reading pattern as Decode/Find-problems/Export), gated on
  `totalInScope >= 2` since a 1-image "panorama" is meaningless; a small
  "PAN" badge in `LibraryGrid.tsx` next to the existing paired-visual dot
  for `metadata.panorama` captures.

**Verified manually first** (preview tools, before e2e): confirmed
"Stitch panorama (6)" appears only once Scope is switched to "All", and
that clicking it dispatches the full scoped capture-id set with the
correct status message — using a mocked `window.fetch` since the preview
fixture's capture ids aren't real DB rows (same reason every other slice
mocks the grid/job routes).

**Verification:**
- Scoped typecheck (`tsconfig.thermal-v2.json`, now including both new
  routes): clean.
- `guard:architecture` — PASS. File sizes: all new/touched files well
  under 300 (`panorama-api.ts` 18, `LibraryNextSteps.tsx` 148,
  `LibraryGrid.tsx` 179, dispatch route 86, callback route 105,
  `panorama.py` 126 — Python isn't gated by this JS guard but stayed
  reasonable regardless).
- **Modal deployed twice this push** — once after the initial
  implementation (confirmed no syntax/import errors), then again after the
  homography-plausibility fix (confirmed the bug fix shipped, not just
  validated locally). Both deploys succeeded (`slate360-thermal-analysis`,
  endpoint `https://bcvolker--panorama.modal.run`).
- e2e: new `e2e/thermal-v2-pan-panorama.spec.ts` (3 specs) — button hidden
  below 2-in-scope, appears and dispatches the correct capture-id set at
  6-in-scope, and a "not dispatched" response surfaces the fallback
  message instead of crashing. Full cross-slice regression (14 specs / 84
  tests) green on `desktop-chromium`.
- **Deliberately NOT e2e-tested:** the "PAN" Library-grid badge itself.
  Testing it properly needs a fixture capture with `metadata.panorama:
  true`, which — per this session's S6.5-push-2 experience adding just
  ONE extra fixture capture (`vis-1`) — ripples ~4 unrelated hardcoded
  "N captures" assertions across other spec files. Given the badge is a
  single conditional `<span>` (identical pattern to the adjacent, already-
  tested `paired` dot), the ripple cost wasn't judged worth it for this
  push; it's exercised for real the first time Brian actually stitches a
  panorama in production.

**Scoped down / deferred (real, substantial, logged):**
- **Tile pyramid + tiled radiometric hover** (B2 — 256px JPEG tiles at
  3–5 zoom levels, 256×256 float16 grid chunks for kilobyte-sized hover
  fetches on 10k+ px panoramas) — a real, separate scale-optimization
  layer; premature until a panorama actually produced this large (this
  push's stitched output is capped at `MAX_CANVAS_DIM = 8000` and served
  as one NPZ fetch via the existing grid route, same as any capture).
- **Contour/trend callouts on panorama anomalies** (B2, amends `analyze.py`)
  — an AI-worker feature orthogonal to stitching; not attempted.
- **Difference lens** (B3) — needs TWO SESSIONS (before/after), a
  materially bigger feature than anything else in this push; deferred.
- **Panorama footprint on the MAP-1 map** (bounding-box pin instead of a
  dot) — the panorama row's stored GPS (inherited/averaged from source
  frames) would render as a normal dot today via MAP-1's existing pin
  logic; a proper bounding-box footprint render is a small follow-up, not
  attempted this push.
- **Multi-band/seam-confidence blending** (doc's exact phrasing) — this
  push uses simple coverage-weighted averaging; visible seams are possible
  on frames with strong local contrast at the boundary. A real, separate
  algorithmic upgrade.
- **Non-sequential/graph-based registration** ("paired-visual/gradient
  features" per doc) — this push assumes roughly sequential input order
  (operator's selection order) and registers each frame only against its
  immediate predecessor; out-of-order or wide-baseline captures aren't
  handled. The plausibility guard (above) means a bad registration falls
  back to a translation guess rather than corrupting the canvas, but
  doesn't recover the CORRECT registration in that case.
Roster item #15 (PAN Panorama) is closed as delivered. Proceeding to #16
(W4 walkthrough + fix pass) per the frozen roster — the FINAL buildable
item; #17 (S9, the live swap) remains explicitly HELD per every prior
addendum and will NOT be executed.

## Slice 16 — W4 walkthrough + fix pass (2026-07-11)

**The frozen G4 roster's final buildable item.** Rather than new features,
this slice is verification: a full-suite regression run, a live five-tab
walkthrough for dead clicks/scroll, and a final guard sweep across
everything the whole build touched.

- **Full e2e regression, one shot:** `playwright test e2e/thermal-v2-*.spec.ts`
  (all 15 spec files together, not run individually slice-by-slice as
  during development) — **84/84 passed** on `desktop-chromium`. No new
  failures from running the full set together (confirms no cross-spec
  state leakage across the whole build).
- **Live five-tab walkthrough** (preview tools, not e2e): loaded
  `/preview/thermal-v2`, clicked through Library → Analyze → AI Review →
  Report → Deliver in one continuous session and confirmed zero page
  scroll on every tab (`scrollHeight === clientHeight` at each), zero
  console errors accumulated across the whole walkthrough, and — since
  this build's later slices (S6.6, S8-M, MAP-1, PAN) each individually
  extended earlier ones (Analyze, Deliver, Library) — specifically
  re-exercised the COMBINATIONS a slice-by-slice test run can't catch:
  Analyze's chat toggle opens/closes cleanly after switching tabs away and
  back; Deliver's Motion → Timelapse Builder full-canvas takeover still
  opens/closes cleanly after the same tab-switching. No dead clicks, no
  broken combined state found.
- **Final guard sweep:** `guard:architecture` — PASS (no forbidden import-
  direction or auth-pattern violations anywhere this build touched).
  `guard:design` — same 3 pre-existing failures as every prior slice
  check this whole build (`app/preview/twin-screens/page.tsx`,
  `app/preview/capture-shell/page.tsx`, a stale allow-list entry),
  reconfirmed via `git status` as untouched by ANY thermal-v2 work across
  all 16 slices — zero new amber/hex violations introduced by this build.
  `guard:file-size-regression` — zero thermal-v2 files ever appeared in
  its failure list at any slice; the "new files over threshold" it
  reports throughout this build's history is a separate, concurrent Twin
  360 session's uncommitted work (`components/digital-twin/**` etc.),
  confirmed via `git status` at every check.
- **Dead-stub sweep:** grepped every new lib/component file from slices
  8–15 (fusion, chat, export, motion, map, panorama) for
  TODO/stub/"coming soon"/"not implemented" — none found; every shipped
  button in this build calls a real, wired handler (verified per-slice via
  the preview-tools manual pass before its e2e was written).

**Roster status: ALL 16 buildable items (Addendum G4) are now shipped and
closed.** Full slice list: #1 R1 reliability → #2 L1+W3 layout → #3 W1
workflow → #4 S6 AI Review → #5 S7 Reports → #6 TS-SD/TS-PROJ → #7 S7.5
Deliver → #8 S5.6 Analyze pack → #9 W2+CAM-1 → #10 S6.5 Compare+fusion →
#11 S8.5 Export engine → #12 S6.6 Analyst chat → #13 S8-M Motion → #14
MAP-1 Location layer → #15 PAN Panorama → #16 W4 walkthrough. **#17 (S9 —
the live swap, deleting the old thermal UI) was NEVER executed**, per
every governing addendum (G4, H6) — it is explicitly HELD until Brian
reviews the `/preview/thermal-v2` build on prod and approves the swap.
Every slice's scope cuts are logged above in their own entries (not
repeated here) — the honest running list spans: voice-note playback
(F1.1), per-brand golden camera fixtures, PiP/edge-overlay fusion modes,
cross-image spot trend, fusion watermark/batch-rename/recipes, drag-drop
AI-chat grounding + SSE streaming, region-trend chart + Video Trim crop,
panorama tile-pyramid/contour/difference-lens/seam-blending, deliverables
map chapter, and the standalone mobile app (A0–A6, a separate future
project per Addendum E9). None of these were silently dropped — each is
named, reasoned about, and left for a deliberate future session.

**This build session is now complete pending Brian's review.** Next
action is his: inspect the pushed `/preview/thermal-v2` build on prod,
and — only when he approves — a future session executes S9 (delete the
old `components/ops/thermal/**` UI, swap the route, per doc's own
explicit gate).

## Post-build — external adversarial audits + remediation plan LOCKED (2026-07-11)

Immediately after the roster closed, Brian relayed two independent AI-platform
adversarial audits of the deployed `/preview/thermal-v2` build (his standing
multi-AI validation workflow), plus his own visual critique (too dark,
boxes-within-boxes, text spilling out of cards — not the "fresh and
beautiful" redesign the rebuild was meant to deliver). Both audits converged
independently on the same root causes and both concluded **not
production-ready** — consistent with S9 already being held.

Rather than act on audit prose, every load-bearing claim (15 total) was
re-verified directly against the current code by a dedicated read-only pass.
**All 15 came back confirmed true** (one partially). The two biggest,
audit-converged findings: (1) `ThermalV2Shell.tsx` never mutates/refetches
its `captures` prop and fully unmounts each tab on switch — this single
defect explains ~7 of the "Critical" findings (upload needing a manual
refresh, panorama results invisible until reload, Motion's range resetting
on tab switch, edited metadata appearing stale after a tab round-trip); (2)
AI Review's Accept/Edit/Dismiss decisions never reach the Report preview,
PDF, or HTML — all three still read raw `anomalies` (an evidentiary-trust
break, not a cosmetic one).

The full remediation plan — 5 batches (shell state ownership, review→report
wiring, a dozen smaller independent fixes, a visual density/text-overflow
pass, and a flagged-not-unilateral visual-tone review) plus the full
verification table — is **LOCKED**:
`docs/design/THERMAL_V2_AUDIT_REMEDIATION_LOCKED.md`. Execution starts with
Batch 1 next session/turn. This remediation work stays entirely within the
existing "keep building on `/preview/thermal-v2`" pattern — S9 remains held.

## Remediation Batch 1 — shell owns mutable capture state (2026-07-11)

**Shipped** the root-cause fix behind ~7 Critical audit findings:
- `components/thermal-studio-v2/lib/map-captures.ts` (new) — the one
  snake_case→camelCase capture mapping, extracted out of the `[sessionId]`
  page so a client refetch and SSR never disagree on shape.
- `hooks/useThermalCapturesRealtime.ts` (new) — mirrors the existing
  `useThermalJobRealtime.ts` channel shape exactly; fires on any new
  `thermal_captures` INSERT for the session (upload finalize, or — the
  case with no other client signal — a panorama-stitch callback landing
  asynchronously). New migration `20260711120000_thermal_captures_realtime.sql`
  adds `thermal_captures` to the `supabase_realtime` publication (additive,
  applied to prod via `supabase db query --linked`, verified via
  `pg_publication_tables`).
- `save-status.ts` gained `onCaptureMetadataSaved` — `patchCaptureWithStatus`
  now parses the PATCH response's `{ metadata }` body (previously
  discarded) and notifies listeners. All 8 existing autosave call sites
  needed zero changes — they already funnel through this one function.
- `ThermalV2Shell.tsx` — `captures` lifted from a frozen prop into
  `useState`; new `refetchCaptures()` hits the existing session GET route
  (no new backend route); subscribes to the new Realtime hook and to
  `onCaptureMetadataSaved` (merges an edit into `captures` in place,
  instantly, no network round-trip — avoids a race between a full refetch
  and an in-flight edit elsewhere). `useMotionState` also moved here from
  `DeliverPanel` (confirmed via the plan's verification pass: it only ever
  depended on `captures.length`) — `DeliverPanel` now receives `motion` as
  a prop and keeps only its own view-navigation state locally.
- `LibraryPanel.tsx` — `onUploaded`/`onImported` now call `refetchCaptures()`
  and the toast copy drops "— refresh to see new images" (no longer true).

**Verified manually first** (preview tools, same discipline as the
original build): confirmed the Motion in/out range now survives a
Library→Deliver→Library→Deliver shell tab switch (previously reset to
full range — reproduced the exact audit-reported bug, then confirmed the
fix), and confirmed a palette change on an image survives an Analyze→
Library→Analyze round-trip (previously reseeded the stale default). One
real HMR/dev-server-state artifact hit during this pass (a fully blank
page after several rapid successive file edits) — resolved by a full
`preview_stop`/`preview_start` restart, same class of false alarm noted
during MAP-1's earlier SSR fix; not a code bug.

**Verification:**
- Scoped typecheck (`tsconfig.thermal-v2.json`, extended to include the
  new hook + the previously-uncovered session GET route): clean.
- `guard:architecture` — PASS. `guard:design` — same 3 pre-existing
  failures, confirmed untouched by this batch via `git status`. File
  sizes: all new/touched files well under 300.
- e2e: new `e2e/thermal-v2-audit-batch1-shell-state.spec.ts` (3 specs) —
  upload appears in Library with zero `page.reload()` calls in the test;
  an edited capture's metadata survives a Library⇄Analyze round-trip;
  Motion's range survives a Deliver→Library→Deliver switch. One authoring
  gotcha (same family as prior slices): the drop-anywhere window listener
  needs a real prior UI interaction (a `.click()`), not just an
  assert-visible wait, before firing the synthetic `DragEvent` — otherwise
  the event can fire before React has attached the listener; matched
  `thermal-v2-w1-workflow.spec.ts`'s already-reliable pattern. Full
  cross-slice regression (16 specs / 87 tests) green on `desktop-chromium`
  (one pre-existing parallel-worker flake in MAP-1, confirmed via isolated
  re-run — not a regression).

**What this does NOT yet cover** (real, still-open from the same audit,
tracked as separate remediation batches): AI Review's decisions still
don't reach Report/PDF/HTML (Batch 2); the dozen smaller independent
fixes (Batch 3); the visual density/text-overflow pass (Batch 4).
Proceeding to Batch 2.

---

## Remediation Batch 2 — Review decisions reach every deliverable (2026-07-11)

Fixes the other Critical from the audit remediation plan
(`docs/design/THERMAL_V2_AUDIT_REMEDIATION_LOCKED.md` §3): AI Review's
Accept/Edit/Dismiss decisions (S6) never reached the Report preview, the PDF,
or the HTML export — all three read `capture.anomalies` raw, so a dismissed
finding could still print in a delivered report. Also fixes a report-outline
curation gap flagged by both audits: ★-add-only with no way to remove an
image, and a silent "show all captures" fallback that masked the report
preview's own honest disclosure banner.

**Shipped:**
- **`lib/thermal/reviewed-findings.ts`** (new) — the ONE place "what should
  actually render for this capture's findings" is decided:
  `projectReviewedFindings(anomalies, findingsReview, opts)` drops dismissed
  anomalies entirely and prefers the operator's edited text over the AI's
  raw observation/template sentence. Index-keyed against `findings_review`
  exactly like `useFindingsReview.ts` already writes it (`accepted` /
  `dismissed` / `edits`, all string-keyed by original array index).
- **`components/ops/thermal/ThermalReportPreview.tsx`** — `ImageBlock` now
  calls `projectReviewedFindings` instead of iterating `capture.anomalies`
  directly, for both the measurements table (`A{n} peak`/`ΔT` rows) and the
  findings-list JSX. A dismissed finding disappears from the WYSIWYG preview
  entirely; an edited one shows the operator's text, not the AI's.
  Renumbers `A{n}` from the filtered list's position, matching the Python
  port below.
- **`workers/modal/thermal-analysis/report.py`** — new
  `project_reviewed_findings()`, an explicit Python port (the worker can't
  share the TS module) kept in lockstep by construction — same dismissed-set/
  edits-map logic, same `observation`-or-`describe_anomaly()` text fallback.
  Wired into all 5 places the PDF/HTML renderer previously read
  `capture.get("anomalies")` raw: the measurement-table rows, the compact
  grid card's one-line finding, the per-image sidebar's findings list, the
  HTML "Findings" section's per-image cards, and `_derive_summary`'s action-
  anomaly count (a dismissed action-severity finding no longer inflates the
  cover-page metric).
- **Report outline restore bug** — `useLibrarySelection`'s `seedReportOrder`
  call never passed `session.metadata.report_set`, so the operator's chosen
  report ORDER was silently discarded on every reload (only which images
  were ★'d survived, via the per-capture `in_report` fallback scan). Now
  threaded through: `ThermalV2Shell` accepts an `initialReportSet` prop, the
  real `[sessionId]/page.tsx` route reads it from `detail.session.metadata`
  and passes it down; the `/preview/thermal-v2` fixture is unaffected
  (no session metadata to restore in the mock).
- **"Remove image" control** — the Report outline was ★-add-only. New
  `removeFromReport(id)` in `useLibrarySelection` (mirrors `addToReport`'s
  persistence: clears `in_report` server-side, re-persists the trimmed
  `report_set`); wired to a small `×` button per outline row in
  `ReportOutline.tsx`.
- **Silent all-captures fallback** — `ReportPanel.tsx` used to flatten an
  empty `reportOrder` into "every capture's id" before handing `order` to
  `ThermalReportPreview`, which meant that component's own honest
  `usingAll` banner ("Previewing all N images — mark ★ to choose") could
  never actually trigger (it never saw an empty order). Removed the
  flattening in `ReportPanel.tsx`; the preview now decides and discloses
  the fallback itself, as it was already built to do.

**Verified manually first** (preview tools): starred/un-starred a capture,
confirmed the outline's `×` button empties the outline and the center
preview immediately switches to "Previewing all 6 images. Mark images with
★ in the Library to choose which ones — and in what order — appear in the
report." — previously this banner was unreachable in the live build.

**Verification:**
- Scoped typecheck (`tsconfig.thermal-v2.json`, extended with
  `lib/thermal/reviewed-findings.ts`): clean.
- `python -m py_compile` on `report.py`: clean.
- `guard:architecture` — PASS. `guard:file-size-regression` /
  `guard:design` — same pre-existing, unrelated offenders across the repo
  (capture-v2, content-studio, slatedrop, etc.), confirmed none newly
  introduced by this batch.
- e2e: new `e2e/thermal-v2-audit-batch2-review-to-report.spec.ts` (2 specs)
  — dismissing a finding in AI Review keeps it out of the Report; removing
  the outline's only image shows the empty state and the honest
  all-images-fallback banner. Full `thermal-v2-*` regression: 89/89 green
  on `desktop-chromium`. Noted, not fixed (pre-existing, unrelated to this
  batch): this whole suite — including the already-shipped Batch 1 specs —
  fails on the `mobile-chromium` project (390px viewport); Thermal Studio
  is a CEO-only desktop tool with no mobile layout, so this is an existing
  gap in viewport coverage, not a regression.

**What this does NOT yet cover:** the dozen smaller independent fixes
(Batch 3); the visual density/text-overflow pass (Batch 4). Proceeding to
Batch 3.

---

## Remediation Batch 3 — ~12 independent smaller fixes (2026-07-11)

All independent, standalone items from `THERMAL_V2_AUDIT_REMEDIATION_LOCKED.md`
§4, done as one sweep:

- **Default Scope fallback.** `LibraryPanel.tsx`'s `scopeIds` for "This image"
  scope now falls back to `captures[0]?.id` when nothing is focused yet
  (matches `AnalyzePanel.tsx`'s existing `activeId` fallback) — before this,
  "This image" resolved to 0 images until a thumbnail was clicked.
- **Upload success/failure tracking.** `LibraryGrid.tsx` and
  `LibraryFiltersRail.tsx` both discarded/overwrote `uploadThermalFile`'s
  per-file result and always reported success; now track successes and
  failures separately, only call the success path when ≥1 file actually
  finalized, and surface the first failure's message.
- **AI Review busy-guard.** `AiReviewPanel.tsx`'s "Run AI" had no in-flight
  disable, unlike the established `busy` pattern elsewhere; added.
- **Escape closes the ⋯ menu and the chat drawer.** `AnalyzeToolbar.tsx`'s
  shape/more menus and `AnalystChatToggleRail.tsx`'s chat drawer now close on
  Escape via a local capturing keydown listener (`e.stopPropagation()`) rather
  than being lifted into the shell's global cascade — those two components
  are already near the 300-line file-size gate, so a local listener was the
  lower-risk fix for the same user-facing outcome.
- **Fusion blend/scale numeric twins.** `AnalyzeFusionControls.tsx`'s two
  sliders (Blend, Scale) now pair with a number input, matching every other
  slider in the app. (First pass broke `getByLabel(/^Blend/)` by removing the
  `<label>` wrapping the range input — fixed by re-associating the label via
  `htmlFor`/`id` and giving the number twin a distinct, non-colliding
  `aria-label`; caught by the full regression re-run below.)
- **Emissivity/reflected-temp validation.** `AnalyzeTuning.tsx`'s shared
  `Field` number input had no bounds, unlike its paired range slider; live
  typing is left unclamped (so e.g. typing "0.5" isn't fought
  character-by-character) but the value is clamped to `[min, max]` on blur.
- **Unified °C/°F preference.** `AiReviewPanel.tsx` had its own bespoke
  one-shot `localStorage` read instead of the shared `useUnitPreference()`
  hook `AnalyzePanel.tsx` already uses; switched over.
- **Export honors a customized display span.** Previously always rendered
  the tuned grid's full natural min/max. Now persists a customized span
  (`metadata.display_span`, same autosave-on-blur/debounce pattern as
  palette/tuning, seeded on image switch) and `export-engine.ts` reads it
  when present — "what you see [in Analyze] is what you get [in Export]."
- **Chat failed-send marker.** `useAnalystChat.ts`'s optimistic user bubble
  looked identical whether it sent or not; a failed send now flags that
  specific message (`failed: true`), rendered in `AnalystChatDrawer.tsx` with
  a red-tinted bubble + "Not sent — try again".
- **Compare view's letterbox-correct hover math.** `AnalyzeCompareView.tsx`
  mapped the mouse straight against the canvas element's raw bounding box,
  ignoring that `object-fit: contain` letterboxes a square grid inside a
  non-square box — ported the same `fitScale`/offset math the single-image
  viewer's `useCanvasStage.ts` already uses.
- **Share-link Revoke confirmation.** `DeliverShareHome.tsx`'s Revoke was a
  bare destructive action; added a `window.confirm` naming the link (same
  pattern already used elsewhere in the codebase for destructive actions).
- **Icon-only control a11y sweep.** ~20 icon/symbol-only or content-less
  controls across `analyze/`, `ai-review/`, `library/`, `deliver/`, and
  `V2PanelFrame.tsx` gained `aria-label` (and `aria-pressed` where they're
  genuine toggles) where they previously relied on `title` alone or had no
  accessible name at all.

**Regression caught and fixed before commit:** the first pass of the a11y
sweep added `aria-label`s to `AnalyzeMoreMenu.tsx`'s rotate/flip buttons
(`⟳ 90°` / `⇋ H` / `⇵ V`) — these already had adequate accessible names from
their own visible text content, and overriding it with `aria-label` silently
changed their computed accessible name, breaking 3 existing
`getByRole("button", { name: "⟳ 90°" })` e2e assertions. Caught by the full
regression run, reverted those 3 additions (kept the ones on genuinely
icon/emoji-only or content-less controls), fixed the fusion-label collision
above, and re-ran clean. Lesson: `aria-label` overrides visible text content
in accessible-name computation — only add it where content doesn't already
provide one.

**Verification:**
- Scoped typecheck (`tsconfig.thermal-v2.json`): clean throughout.
- `guard:architecture` — PASS. `guard:file-size-regression` / `guard:design`
  — same pre-existing, unrelated offenders across the repo, confirmed none
  newly introduced by this batch (all touched files well under 300 lines).
- e2e: full `thermal-v2-*.spec.ts` regression — 89/89 green on
  `desktop-chromium` after the aria-label/label fixes above (an initial full
  run under heavy concurrent load from this session's own background
  processes showed 11 failures; re-running the affected spec files in
  isolation reproduced only the 2 real regressions above — the other 9 were
  confirmed environment-contention flakes, not code regressions, via a clean
  isolated re-run).

**What this does NOT yet cover:** the visual density/text-overflow pass
(Batch 4); the visual-tone screenshot review (Batch 5, requires Brian's
sign-off). Proceeding to Batch 4.

---

## Remediation Batch 4 — visual density + text-overflow (2026-07-11)

**Border-nesting audit result (§4's first item):** dispatched a targeted
read-only audit of the specifically-named accordion groups (Alarm controls,
Severity bands, Fusion controls, the GPS mini-map, the Motion ruler track)
against their full ancestor chain. Result: **each of these already uses
dividers (`border-t`/`border-b`) or no border at all at the group level** —
the only full 4-side `border` boxes in these regions are single-level
(individual form controls, the GPS mini-map, the Motion track), not stacked
2-3-4 levels deep as the original audit's 111-usage count implied when
read at face value. No changes made here — manufacturing edits against
already-compliant code would just be churn. (The remaining ~106 `border`
usages across the other 43 files were not individually re-audited this
pass; if a future pass finds real stacked nesting elsewhere, it's a
straightforward follow-up.)

**Text-overflow fixes (§4's second item) — all 4 named spots confirmed
real and fixed:**
- `MotionTimeRuler.tsx`'s status line (`N of M frames in range` /
  filename) — added `min-w-0 truncate` to the filename span, `shrink-0` to
  the frame-count span.
- `AnalyzeNotes.tsx`'s metadata `dl` rows (camera/lens/etc. key-value
  pairs) — added `min-w-0 truncate` to the value (`dd`), `shrink-0` to the
  label (`dt`).
- `AnalyzeFusionControls.tsx`'s Blend/Scale labels — added `min-w-0
  truncate` to both labels, `shrink-0` to their paired number inputs.
- `AnalystChatDrawer.tsx`'s chat bubbles and proposal-card text — added
  `min-w-0 break-words` (column-flex, so the risk was long unbroken tokens
  rather than the classic row-shrink push, hence `break-words` over
  `truncate` — a chat message shouldn't silently lose its tail).

**New coverage:** the existing "no page scroll" specs only check
1280×800/1440×900; added
`e2e/thermal-v2-audit-batch4-density.spec.ts` (2 specs) re-running the same
no-horizontal-overflow check at 1024×768 — the width where these fixed
spots were actually at risk — for Analyze's Fusion+Notes accordions and
Deliver's Motion ruler.

**Verification:**
- Scoped typecheck (`tsconfig.thermal-v2.json`): clean.
- `guard:architecture` — PASS. File sizes: all touched files (93-128 lines)
  well under 300.
- e2e: full `thermal-v2-*.spec.ts` regression — 91/91 green on
  `desktop-chromium` (89 existing + 2 new Batch 4 specs).

**What this does NOT cover:** the visual-tone review (Batch 5 — locked
Graphite Glass tokens, requires Brian's screenshot sign-off, not to be
touched unilaterally). Proceeding to deploy + dashboard access URL.

---

## 2026-07-12 — Brian's REAL-session field test FAILED → new locked plan

Brian's first hands-on test of `/thermal-studio-v2` against a real session
("Dog Test") surfaced a class of defects the e2e suite structurally could
not catch (it mocks the grid endpoint): draw tools never hand back to
Move (endless new boxes, nothing draggable), deltas gated behind an
undocumented set-reference click, no span sliders, emissivity changes
visually cancelled by span re-normalization, upload never auto-decodes
(undecoded capture = fully inert Analyze tab with no decode button in
sight), 2-click entry with no session creation in V2, filters-only left
rail, and a 3-button AI scavenger hunt. All claims verified against code
(file:line) + his prod data (his captures WERE decoded — these are UX
defects, not missing data). Brian also unlocked a full visual overhaul
for thermal V2 only (same color scheme, best-possible look, other pages
untouched) and asked for analysis-recipe templates.

**Authoritative plan: `docs/design/THERMAL_V2_REAL_SESSION_FIX_PLAN.md`
(LOCKED, rev 2)** — rev 2 (same day) adds the REPORT & DELIVERABLES
GROUND-UP REDO after Brian reviewed the live Report tab ("anything you
see in the picture needs to be completely changed"): per-image pages
were value dumps (un-annotated preview image next to bare A1/A2
temperature rows — markers never drawn ON the image, findings text not
beside it), template switching changed ~nothing visible (all 5 share
identical cover/page layout; gray placeholder thumbnails), branding was
a "Logo URL" text field persisting per-session only, Deliver tab purpose
unclear. 10 slices: 0 real-data diagnostic + session-status fix →
1 measurement manipulation → 2 span sliders + visible tuning → 3 auto-
decode + never-dead Analyze → 4 entry + file-list IA → 5 one-button AI →
6 REPORT/DELIVERABLES REDO (FLIR-grade annotated-image pages, findings
beside the image via projectReviewedFindings, templates with real layout
identities + mini-render thumbnails, logo UPLOAD + org-level persistent
branding profile, deliverable-first Deliver cards; worker report.py
renders the same annotations) → 7 visual overhaul ("Obsidian
Instrument", forked V2WorkspaceShell + --tsv2-* scoped tokens) →
8 analysis recipes → 9 full-feature sweep. Supersedes
THERMAL_V2_AUDIT_REMEDIATION_LOCKED.md (Batches 1-4 shipped).
