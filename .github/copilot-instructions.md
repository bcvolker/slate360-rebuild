# Slate360 — Copilot Instructions

Last Updated: 2026-03-11
Repo: bcvolker/slate360-rebuild

Read order for any new task:
1. `SLATE360_PROJECT_MEMORY.md`
2. Only the docs needed for the current task

Do not read the whole context tree by default.

## Token Budget Rules

- Start every chat by reading ONLY `SLATE360_PROJECT_MEMORY.md`, then the single task-relevant doc from the Task Map. Never bulk-read context files.
- Use the Explore subagent for discovery that would require reading >3 files. It runs in isolation and returns only the answer.
- Do not re-read files already summarized in context docs. Trust the doc; verify only if something looks wrong.
- When reading code, read targeted line ranges (the function you're editing ± 30 lines), not entire files.
- Prefer `grep_search` with `includePattern` to locate a symbol in one file over reading the whole file.
- Do not echo back large blocks of code in responses. Summarize what changed; the diff is in the file.
- If answering requires reading >3 files or broad repo discovery, first produce a short "File Map + Findings + Plan" — only then proceed with edits.

## Task Map

| Task | Read Next |
|---|---|
| v0 design import / porting | `slate360-context/V0_WORKFLOW.md` |
| Market Robot | `slate360-context/dashboard-tabs/market-robot/START_HERE.md` |
| Backend/auth/billing/storage | `slate360-context/BACKEND.md` |
| Dashboard or shared tab UI | `slate360-context/DASHBOARD.md`, `slate360-context/dashboard-tabs/MODULE_REGISTRY.md`, `slate360-context/dashboard-tabs/CUSTOMIZATION_SYSTEM.md` |
| Project Hub | `slate360-context/PROJECT_HUB.md` |
| SlateDrop | `slate360-context/SLATEDROP.md` |
| Widgets | `slate360-context/WIDGETS.md` |
| Bugs / active risk review | `slate360-context/ONGOING_ISSUES.md`, `ops/bug-registry.json` |
| Release / deploy verification | `ops/module-manifest.json`, `ops/release-gates.json` |

Deep history files are reference-only unless the task needs them.

## Non-Negotiables

1. No production `.ts` / `.tsx` / `.js` file over 300 lines. Extract first.
2. No `any`. Use proper types or `unknown` plus narrowing.
3. Use `withAuth()` / `withProjectAuth()` from `@/lib/server/api-auth`.
4. Use response helpers from `@/lib/server/api-response`.
5. Import shared types from `lib/types/`; do not redefine them inline.
6. Server components first. Add `"use client"` only when required.
7. One component per file, one hook per file.
8. Imports flow downward: `lib/` -> `components/` -> `app/`.
9. Entitlements come only from `lib/entitlements.ts`.
10. Folder writes use `project_folders`, not `file_folders`.
11. No mock data in production UI; show real empty/error states.
12. After code changes, update the relevant context doc.

## Pre-Edit Checklist (mandatory before touching any file)

1. Check the file's line count (`wc -l <file>`). If ≥250 lines, plan an extraction before adding logic.
2. If the file is a known monolith (DashboardClient, SlateDropClient, ClientPage), read BOTH the state declarations AND the JSX section where they're used — never edit one without seeing the other.
3. Check `slate360-context/ONGOING_ISSUES.md` and `ops/bug-registry.json` for active bugs in the module you're touching. Do not re-introduce a fixed bug.

## No Phantom Fixes

- If you create a helper/wrapper/provider file, confirm it is actually IMPORTED and USED in the consuming file before marking the task done. The #1 recurring failure: "fix file created but never wired in."
- After any structural change (new provider, wrapper, shared component), grep for the import path across the codebase to confirm it's referenced.
- After applying a fix, trace the full call chain: where is the value set → where is it read → where is it displayed. A fix that sets a value without confirming it's read downstream is incomplete.
- If a fix involves a prop or callback, confirm both the sender AND receiver are wired.

## Async / Race Condition Guard

- When chaining multiple async calls (DB write → status update → scan/fetch), always `await` each step sequentially unless you can prove they are independent.
- After any DB write that a subsequent read depends on, re-fetch the value — never trust local state set before the write completes.
- Never navigate the user to a results view until the data fetch for that view has completed.

## Working Style

- Ship in small, testable increments (one feature slice at a time).
- Prefer additive changes (new components/routes/tables) over refactors unless necessary.
- If a change is risky, propose 2–3 options + tradeoffs; wait for decision.
- Every implementation must include: (1) files to touch (exact paths), (2) steps to apply, (3) smoke tests + expected results, (4) rollback plan.

## Safety Rules

- No breaking schema changes without migration + backfill + rollback.
- Keep UI consistent: reuse existing primitives (cards, buttons, table toolbars).
- Maintain auditability: log sends/shares/status changes when applicable.
- Keep feature flags/toggles for anything experimental.

## Auth And Access Rules

- `/ceo` uses `resolveServerOrgContext().canAccessCeo`
- `/market` uses `resolveServerOrgContext().canAccessMarket`
- `/athlete360` uses `resolveServerOrgContext().canAccessAthlete360`
- Tier order is `trial < creator < model < business < enterprise`; subscription gates use `getEntitlements()`
- Internal routes are not subscription-tier features
- Subscription features use `getEntitlements()` only

## Backend Quick Reference

### Supabase clients

```typescript
import { createClient } from "@/lib/supabase/client";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
```

### Services

- Supabase: project ref `hadnfcenpcfaeclczsmm`
- S3: bucket `slate360-storage`, region `us-east-2`
- Cloudflare R2: bucket `slate360-storage`, account `96019f75871542598e1c34e4b4fe2626`, S3-compatible endpoint derived from `CLOUDFLARE_ACCOUNT_ID` unless `R2_ENDPOINT` is set
- Vercel: auto-deploys from `main`
- Market cron: `/api/market/scheduler/tick` every 5 minutes via `vercel.json`

### Environment sources

- Local/dev secrets: `.env.local`
- R2 local/dev runtime: `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, optional `R2_REGION`, optional `R2_ENDPOINT` or `CLOUDFLARE_ACCOUNT_ID`
- Stripe secrets: Vercel env only
- Market live trading requires Polymarket envs plus `NEXT_PUBLIC_POLYMARKET_SPENDER`

## Core Commands

```bash
npm run dev
npm run typecheck
npm run build
npm run diag:market-runtime
npm run diag:storage-runtime
npm run verify:release
bash scripts/check-file-size.sh
```

## Market Robot Shortlist

Read `slate360-context/dashboard-tabs/market-robot/START_HERE.md` before touching Market.

Core Market paths:
- `app/market/page.tsx`
- `components/dashboard/MarketClient.tsx`
- `components/dashboard/market/`
- `lib/hooks/useMarket*`
- `lib/market/`
- `app/api/market/`

## Validation

After code changes:
1. Run `get_errors` on changed files.
2. Run `npm run typecheck` if TypeScript behavior could be affected.
3. Run `bash scripts/check-file-size.sh` if you touched app code.
4. Update the relevant context file.
5. Run the appropriate guard or `npm run verify:release` before pushing shared/backend changes.

## Acceptance Criteria (any feature)

- Works for at least one real user workflow end-to-end.
- No console errors, no failing routes, no broken navigation.
- Tests/smoke checks documented.

## Session Handoff (mandatory end of every chat)

Write a structured handoff to `SLATE360_PROJECT_MEMORY.md` (Latest Session Handoff section):

```
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
```

## Session Startup (mandatory start of every chat)

1. Read `SLATE360_PROJECT_MEMORY.md` — check the Latest Session Handoff section first.
2. If continuing previous work, read ONLY the handoff + the files listed in "What's Broken."
3. Do NOT re-discover the codebase from scratch. The handoff IS your starting context.

## Bug Registry Discipline

- When you fix a bug, update `ops/bug-registry.json` AND `ONGOING_ISSUES.md` immediately — not "later."
- When you discover a new bug during unrelated work, log it in `ops/bug-registry.json` with severity and affected file before continuing your current task.

## Archive Policy

Do not read large history files unless needed:
- `slate360-context/dashboard-tabs/market-robot/CURRENT_STATE_HANDOFF.md`
- `slate360-context/dashboard-tabs/market-robot/ONGOING_BUILD_TRACKER.md`
- `slate360-context/FUTURE_FEATURES.md`
- `slate360-context/APP_ECOSYSTEM_EXECUTION_PLAN.md`

Use them only for deep history, recovery, or roadmap work.