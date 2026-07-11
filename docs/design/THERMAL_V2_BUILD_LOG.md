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

**Not started yet:** Slices #3–#16 of the frozen roster.

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
