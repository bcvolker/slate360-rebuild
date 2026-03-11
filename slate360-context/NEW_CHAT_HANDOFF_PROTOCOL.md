# Slate360 — New Chat Handoff Protocol

Last Updated: 2026-03-11
Purpose: keep startup context small, targeted, and current.

## Start Of Chat

Read in this order:
1. `SLATE360_PROJECT_MEMORY.md`
2. This file
3. Only the docs required for the current task

Default task routing:
- Market Robot: `dashboard-tabs/market-robot/START_HERE.md`
- Backend/auth/billing/storage: `BACKEND.md`
- Shared dashboard/tab work: `DASHBOARD.md`, `dashboard-tabs/MODULE_REGISTRY.md`, `dashboard-tabs/CUSTOMIZATION_SYSTEM.md`
- Bug triage: `ONGOING_ISSUES.md`, `ops/bug-registry.json`

Do not read large history docs unless the task explicitly needs them.

## Pre-Flight

Before editing code:
1. Confirm route and access gate.
2. Confirm entitlement or internal-access rule.
3. Check the file size of any app code file you will touch.
4. If the file is already over 300 lines, extract before adding logic.

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

## End Of Chat Handoff

Use this structure:

```md
## Session Handoff — YYYY-MM-DD

### What Changed
- file: outcome

### Context Files Updated
- file: reason

### Open Risks / Blockers
- item

### Next Steps
1. step
2. step
3. step
```

## Reference-Only Files

Avoid these unless needed for deep history:
- `dashboard-tabs/market-robot/CURRENT_STATE_HANDOFF.md`
- `dashboard-tabs/market-robot/ONGOING_BUILD_TRACKER.md`
- `FUTURE_FEATURES.md`
- `APP_ECOSYSTEM_EXECUTION_PLAN.md`