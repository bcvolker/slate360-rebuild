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

Current reality (2026-03-20):
- Tab routing works (6 tabs), 0 TS errors, deploys cleanly
- **Data wiring is completely disconnected** — orchestrator passes dummy data to all tabs
- Backend is production-grade: 8 real hooks, 17 API routes, 25 lib utilities, typed contracts
- V2 rebuild approved — wire orchestrator to hooks first, then rebuild tabs one at a time
- See `MARKET_ROBOT_STATUS_HANDOFF.md` for full critique, V2 plan, and prompt templates

Most important Market files:
- `app/market/page.tsx` — route entry (server component, auth gate)
- `components/dashboard/market/MarketClient.tsx` — orchestrator (needs rewiring)
- `components/dashboard/market/` — all tab components
- `lib/hooks/useMarket*` — 8 working hooks (the entire data layer)
- `lib/market/` — 25 utility files (contracts, mappers, bot engine, scheduler)
- `app/api/market/` — 17 API routes

Files to delete:
- `components/dashboard/MarketClient.tsx` (old, orphaned, 75 lines)
- `components/dashboard/market/MarketRobotWorkspace.tsx` (unused, 84 lines)
- `MARKET_ROBOT_STATUS_HANDOFF.md.bak` (backup of old handoff)

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

### Session Handoff — 2026-03-20 (Market Robot UX Audit + V2 Decision)

#### What Changed (across 2 sub-sessions)
- `app/market/page.tsx`: Fixed import — now imports from `@/components/dashboard/market/MarketClient` (was importing old gutted `@/components/dashboard/MarketClient`)
- `components/dashboard/market/MarketAutomationTab.tsx`: Fixed 6 TS errors (removed missing LiveChecklist import, removed useMarketBot() call, fixed MarketSystemStatusCard and MarketPlanInsights props)
- `components/dashboard/market/MarketResultsTab.tsx`: Fixed MarketResultsInsights to receive proper analytics object
- `components/dashboard/market/MarketLiveWalletTab.tsx`: Fixed MarketSystemStatusCard props
- `components/dashboard/market/MarketClient.tsx`: Fixed liveChecklist type
- `~/.continue/config.yaml`: Fixed Grok model `grok-beta` → `grok-3` (deprecated). Provider: `openai`, apiBase: `https://api.x.ai/v1`
- `MARKET_ROBOT_STATUS_HANDOFF.md`: Complete rewrite with UX critique, file grades, problem list, hook table, fix plan, prompt templates, AND V2 feasibility assessment

#### Key Decision: Clean V2 Rebuild Approved
The entire backend/hook/API layer was audited and confirmed **production-grade** (8 working hooks, 17 API routes, 25 lib utilities, typed contracts). The problem is exclusively that Grok's UI scaffolding never connected to any of it. A V2 rebuild is straightforward — wire the orchestrator to hooks, then rebuild tabs one at a time. See `MARKET_ROBOT_STATUS_HANDOFF.md` "V2 Feasibility Assessment" section for full details.

#### What's Broken / Partially Done
- **MarketClient.tsx data wiring** — all hooks disconnected, all callbacks are console.log stubs. #1 blocker.
- **4 of 6 tabs are placeholder UI** — Results (F), Live Wallet (F), Saved Markets (F), Automation (D-)
- **No Practice/Live toggle** anywhere in the UI
- **Dead buttons**: Connect Wallet (LiveWallet), Save Plan (Automation)
- **Developer jargon** in user-facing text (edge, scan, runtime status)
- `components/dashboard/MarketClient.tsx` (old, 75 lines) — orphaned, delete it
- `MARKET_ROBOT_STATUS_HANDOFF.md.bak` — can be deleted after confirming new file

#### Context Files Updated
- `MARKET_ROBOT_STATUS_HANDOFF.md`: Full rewrite + V2 feasibility assessment + hook dependency map
- `SLATE360_PROJECT_MEMORY.md`: This handoff

#### Next Steps (ordered) — READ MARKET_ROBOT_STATUS_HANDOFF.md FIRST
1. Read `MARKET_ROBOT_STATUS_HANDOFF.md` — has the complete critique, V2 plan, hook dependency map, and 8 copy-paste prompt templates
2. **Step 1: Wire MarketClient.tsx** — import useMarketTradeData first (bot hook depends on its outputs), then useMarketBot, useMarketWalletState, useMarketServerStatus, useMarketSystemStatus. Replace all console.log stubs. This single change unblocks every tab.
3. **Step 2: Kill placeholder text** — replace all "(Placeholder)" / "after implementation" with empty states + CTAs
4. **Steps 3-8: Tab rebuilds** — one at a time, each as a single commit. Direct Buy first (closest to working), then Start Here, Automation, Results, Live Wallet, Saved Markets. Copy-paste prompt templates are in the handoff doc.
5. **Cleanup**: Delete orphaned `components/dashboard/MarketClient.tsx` (old 75-line file), `MarketRobotWorkspace.tsx` (unused), `.bak` file

#### Hook Dependency Order (critical for wiring)
```
useMarketTradeData → provides { trades, fetchTrades, fetchSummary, fetchSchedulerHealth, fetchMarketLogs }
  ↓ (pass as deps)
useMarketBot(deps) → provides { config, runScan, handleStartBot, setPaperMode, ... }
  ↓ (read config.paperMode, wallet.liveChecklist)
useMarketWalletState → provides { address, isConnected, usdcBalance, liveChecklist, handleConnectWallet }
useMarketServerStatus → provides { status, health, isConfirmed }
useMarketSystemStatus → provides { system, loading, error }
```