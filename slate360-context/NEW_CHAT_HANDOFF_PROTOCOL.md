# Slate360 — New Chat Handoff Protocol

Last Updated: 2026-03-11
Purpose: keep startup context small, targeted, and current.

## Start Of Chat

Read in this order — STOP after step 2 unless the task requires more:
1. `SLATE360_PROJECT_MEMORY.md` — check the **Latest Session Handoff** section FIRST.
2. If continuing previous work, read ONLY the handoff + the files listed in "What's Broken." Do NOT re-discover the codebase.
3. Only the single task-relevant doc from the Task Map below.

Default task routing:
- Market Robot: `dashboard-tabs/market-robot/START_HERE.md`
- Backend/auth/billing/storage: `BACKEND.md`
- Shared dashboard/tab work: `DASHBOARD.md`, `dashboard-tabs/MODULE_REGISTRY.md`, `dashboard-tabs/CUSTOMIZATION_SYSTEM.md`
- Bug triage: `ONGOING_ISSUES.md`, `ops/bug-registry.json`

Do not read large history docs unless the task explicitly needs them.

## Token Budget

- Never bulk-read context files. Read one doc at a time, only as needed.
- Use the Explore subagent for discovery that spans >3 files.
- When reading code, read targeted line ranges (function ± 30 lines), not whole files.
- Prefer `grep_search` with `includePattern` to locate a symbol over reading the whole file.
- Do not echo large code blocks back in responses. Summarize; the diff is in the file.
- If answering requires reading >3 files, produce a short "File Map + Findings + Plan" first, then proceed.

## Pre-Flight

Before editing code:
1. Confirm route and access gate.
2. Confirm entitlement or internal-access rule.
3. Check the file size of any app code file you will touch (`wc -l <file>`).
4. If the file is already over 250 lines, plan an extraction before adding logic.
5. If the file is a known monolith (DashboardClient, SlateDropClient, ClientPage), read BOTH the state declarations AND the JSX where they're used.
6. Check `ONGOING_ISSUES.md` and `ops/bug-registry.json` for active bugs in the module you're touching.

Useful commands:

```bash
npm run typecheck
bash scripts/check-file-size.sh
```

## During Work

Keep these rules in force:
- Use `withAuth()` / `withProjectAuth()` for API routes.
- Use `ok()`, `badRequest()`, `serverError()`, and related response helpers.
- Use the correct Supabase client for browser, server, or admin work.
- Never gate `/ceo`, `/market`, or `/athlete360` through entitlements.
- Never use `file_folders` for new work.
- Do not duplicate types or auth logic.

### Async / Race Condition Guard
- When chaining async calls (DB write → status update → scan/fetch), `await` each step sequentially unless provably independent.
- After any DB write that a subsequent read depends on, re-fetch — never trust local state set before the write completes.
- Never navigate to a results view until the data fetch for that view has completed.

### No Phantom Fixes
- If you create a helper/wrapper/provider file, confirm it is IMPORTED and USED before marking done.
- After any structural change, grep for the import path to confirm it's referenced.
- Trace the full call chain: set → read → display. A fix that sets a value without confirming it's read downstream is incomplete.
- If a fix involves a prop or callback, confirm both sender AND receiver are wired.

## Validation

After changes:
1. Run `get_errors` on changed files.
2. Run `npm run typecheck` when code behavior changed.
3. Run `bash scripts/check-file-size.sh` if you touched app code.
4. Update the relevant context file.

Use `npm run verify:release` before final handoff when the task changes release-critical behavior.

## Context Maintenance

Update at least one relevant doc after meaningful code changes:
- Route/module changes: module blueprint or `MODULE_REGISTRY.md`
- Backend/auth/billing/storage changes: `BACKEND.md`
- Bug fixes: `ONGOING_ISSUES.md`, `ops/bug-registry.json`, `PROJECT_RUNTIME_ISSUE_LEDGER.md`
- Market changes: `dashboard-tabs/market-robot/START_HERE.md` or deeper Market doc if needed

## Bug Registry Discipline

- When you fix a bug, update `ops/bug-registry.json` AND `ONGOING_ISSUES.md` immediately — not "later."
- When you discover a new bug during unrelated work, log it before continuing your current task.

## End Of Chat Handoff (mandatory)

Write this to the **Latest Session Handoff** section of `SLATE360_PROJECT_MEMORY.md`:

```md
## Session Handoff — YYYY-MM-DD

### What Changed
- file: outcome

### What's Broken / Partially Done
- item (include file + line if known)

### Context Files Updated
- file: reason

### Next Steps (ordered)
1. step
2. step
3. step
```

This is not optional. The next chat's starting context depends entirely on this handoff.

## Reference-Only Files

Avoid these unless needed for deep history:
- `dashboard-tabs/market-robot/CURRENT_STATE_HANDOFF.md`
- `dashboard-tabs/market-robot/ONGOING_BUILD_TRACKER.md`
- `FUTURE_FEATURES.md`
- `APP_ECOSYSTEM_EXECUTION_PLAN.md`