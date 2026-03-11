# Slate360 — Copilot Instructions

Last Updated: 2026-03-11
Repo: bcvolker/slate360-rebuild

Read order for any new task:
1. `SLATE360_PROJECT_MEMORY.md`
2. Only the docs needed for the current task

Do not read the whole context tree by default.

## Task Map

| Task | Read Next |
|---|---|
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
- Vercel: auto-deploys from `main`
- Market cron: `/api/market/scheduler/tick` every 5 minutes via `vercel.json`

### Environment sources

- Local/dev secrets: `.env.local`
- Stripe secrets: Vercel env only
- Market live trading requires Polymarket envs plus `NEXT_PUBLIC_POLYMARKET_SPENDER`

## Core Commands

```bash
npm run dev
npm run typecheck
npm run build
npm run diag:market-runtime
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

## Archive Policy

Do not read large history files unless needed:
- `slate360-context/dashboard-tabs/market-robot/CURRENT_STATE_HANDOFF.md`
- `slate360-context/dashboard-tabs/market-robot/ONGOING_BUILD_TRACKER.md`
- `slate360-context/FUTURE_FEATURES.md`
- `slate360-context/APP_ECOSYSTEM_EXECUTION_PLAN.md`

Use them only for deep history, recovery, or roadmap work.