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

**Not started yet:** Slices #2–#16 of the frozen roster.
