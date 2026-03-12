# Slate360 — Project Memory

Last Updated: 2026-03-11
Repo: bcvolker/slate360-rebuild
Branch: main
Live: https://www.slate360.ai

This file is the default new-chat attachment. Keep it short. Read this first, then only pull the docs required for the task.

## Start Here

Recommended read order:
1. This file
2. `slate360-context/NEW_CHAT_HANDOFF_PROTOCOL.md`
3. Only task-relevant docs

Do not read all context files by default.

## Project Snapshot

Slate360 is a Next.js 15 + React 19 + TypeScript SaaS platform with:
- Supabase for auth and primary data
- AWS S3 for file storage
- Stripe for billing
- Vercel for hosting and cron
- Market Robot as an internal route at `/market`

Primary live modules:
- `/dashboard`
- `/project-hub`
- `/slatedrop`
- `/market`

Tier note:
- subscription tiers are `trial < creator < model < business < enterprise`
- subscription gates use `getEntitlements()`
- `/ceo`, `/market`, and `/athlete360` are internal access routes, not subscription features

## Critical Rules

1. No production `.ts` / `.tsx` / `.js` file over 300 lines.
2. No `any`.
3. Use shared auth wrappers and response helpers.
4. Types come from `lib/types/`.
5. Server components first.
6. Internal routes (`/ceo`, `/market`, `/athlete360`) do not use entitlements.
7. Subscription gates must use `getEntitlements()`.
8. New folder writes use `project_folders`.
9. No mock data in production UI.
10. Update context docs after code changes.

## Task-Based Read Map

| If you are working on | Read |
|---|---|
| Market Robot | `slate360-context/dashboard-tabs/market-robot/START_HERE.md` |
| Backend/auth/billing/storage | `slate360-context/BACKEND.md` |
| Shared dashboard/tab behavior | `slate360-context/DASHBOARD.md`, `slate360-context/dashboard-tabs/MODULE_REGISTRY.md`, `slate360-context/dashboard-tabs/CUSTOMIZATION_SYSTEM.md` |
| Project Hub | `slate360-context/PROJECT_HUB.md` |
| SlateDrop | `slate360-context/SLATEDROP.md` |
| Widgets | `slate360-context/WIDGETS.md` |
| Active bugs | `slate360-context/ONGOING_ISSUES.md`, `ops/bug-registry.json` |
| Release readiness | `ops/module-manifest.json`, `ops/release-gates.json` |

## Backend Quick Access

### Supabase
- URL: `https://hadnfcenpcfaeclczsmm.supabase.co`
- Dashboard: `https://supabase.com/dashboard/project/hadnfcenpcfaeclczsmm`
- Local secrets: `.env.local`
- Clients:

```typescript
import { createClient } from "@/lib/supabase/client";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
```

### AWS S3
- Bucket: `slate360-storage`
- Region: `us-east-2`
- Client: `lib/s3.ts`

### Vercel
- Auto-deploy from `main`
- Cron source: `vercel.json`
- Stripe secrets live in Vercel envs

### Git
- Default branch: `main`
- Standard flow: local edit -> typecheck / verify -> commit -> push
- Do not assume unrelated dirty changes are yours

## Core Commands

```bash
npm run dev
npm run typecheck
npm run build
npm run diag:market-runtime
npm run verify:release
bash scripts/check-file-size.sh
```

During build/release work, also run the relevant guards before pushing shared or backend changes.

## Market Robot Focus

Route and gate:
- Route: `/market`
- Gate: `resolveServerOrgContext().canAccessMarket`

Current reality:
- Paper-mode flow is partly working
- Live mode still needs real Polymarket credentials and spender config
- Background automation still depends on Vercel cron and scheduler health
- Runtime state is improved but not fully unified yet

Most important Market files:
- `app/market/page.tsx`
- `components/dashboard/MarketClient.tsx`
- `components/dashboard/market/`
- `lib/hooks/useMarket*`
- `lib/market/`
- `app/api/market/`

## Archive And Token Policy

Do not pull large history docs unless the task needs them. Default reference-only files:
- `slate360-context/dashboard-tabs/market-robot/CURRENT_STATE_HANDOFF.md`
- `slate360-context/dashboard-tabs/market-robot/ONGOING_BUILD_TRACKER.md`
- `slate360-context/FUTURE_FEATURES.md`
- `slate360-context/APP_ECOSYSTEM_EXECUTION_PLAN.md`
- `slate360-context/SUPABASE_EMAIL_TEMPLATES.md`

Use those files only for deep history, roadmap, or recovery work.

## Known Monolith Files (read state + JSX together)

| File | Lines | Risk |
|---|---|---|
| `components/dashboard/DashboardClient.tsx` | 2,800+ | State at top, JSX at bottom — can't edit one without seeing the other |
| `components/slatedrop/SlateDropClient.tsx` | 2,030 | Multi-phase upload + preview logic |
| `components/project-hub/ClientPage.tsx` | 834 | Mutation + display interleaved |

When editing these, always read both the state declarations AND the JSX sections.

## Latest Session Handoff

<!-- Each chat MUST overwrite this section at end of conversation. Next chat reads this first. -->

### Session Handoff — 2026-03-12

#### What Changed
- Executed Rescue Batch 3 automation rescue pass in one chat flow with required read order and preflight attempts
- `components/dashboard/market/MarketAutomationTab.tsx`: added explicit runtime/save-state distinction, config-source truth block with fallback warnings, action-meaning copy, and honest post-action feedback banners
- `components/dashboard/market/MarketAutomationBuilder.tsx`: added three beginner preset entry paths (Conservative/Balanced/Aggressive), visible preset match text, Save Draft / Save + Start Robot labels, and advanced disclosure toggle
- `components/dashboard/market/MarketPlanList.tsx`: surfaced matched preset per saved plan and clarified start action copy as Save + Start Robot
- `lib/hooks/useMarketAutomationState.ts`: save now returns server-persisted vs local-fallback metadata for truthful UI feedback
- `lib/market/automation-presets.ts`: new shared preset mapping/detection helper used by builder and plan list
- `docs/market-robot/MARKET_ROBOT_BUILD_FILE.md`: added full Batch 3 outcome record, intentional non-changes, verification points, and blockers
- `docs/market-robot/MARKET_ROBOT_PROMPT_BACKLOG.md`: marked Batch 3 implemented with actual landed behavior
- `docs/market-robot/MARKET_ROBOT_CHAT_RESUME_PROTOCOL.md`: advanced current batch guidance to post-Batch-3 state
- `slate360-context/dashboard-tabs/market-robot/ONGOING_BUILD_TRACKER.md`: updated active batch and added Batch 3 session-log entry
- `SLATE360_PROJECT_MEMORY.md`: overwrote Latest Session Handoff for Batch 3

#### What's Broken / Partially Done
- Terminal command execution remains blocked by `ENOPRO` in this workspace session, preventing terminal runs of `npm run typecheck` and `npx tsc --noEmit`
- Commit/push from this session is blocked because terminal/git command execution is unavailable (`ENOPRO`)
- Market runtime truth is still split between canonical plans and fallback layers (directives/metadata); Batch 3 only made that visible and honest in UI
- `NEXT_PUBLIC_POLYMARKET_SPENDER` remains a live-readiness blocker
- `app/api/market/scan/route.ts` remains paper-only execution behavior; no live automation claim is valid

#### Context Files Updated
- `docs/market-robot/MARKET_ROBOT_BUILD_FILE.md`: Batch 3 implementation status and verification checklist
- `docs/market-robot/MARKET_ROBOT_PROMPT_BACKLOG.md`: Batch 3 status update
- `docs/market-robot/MARKET_ROBOT_CHAT_RESUME_PROTOCOL.md`: next-batch resume state
- `slate360-context/dashboard-tabs/market-robot/ONGOING_BUILD_TRACKER.md`: active batch/session log update
- `SLATE360_PROJECT_MEMORY.md`: session handoff update

#### Next Steps (ordered)
1. Run Rescue Batch 4 for Results and wallet/readiness unification using the same truth-first UI language
2. Re-run terminal validations and git push once `ENOPRO` is resolved
3. Keep backend truth unification and any `/api/market/summary` contract changes in a separate later batch