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

### Session Handoff — 2026-03-21 (Market Robot UX Audit + Fixes)

#### What Changed
- `app/market/page.tsx`: Fixed import path — now imports `MarketClient` from `@/components/dashboard/market/MarketClient` (was incorrectly importing from `@/components/dashboard/MarketClient`, the old gutted orchestrator)
- `components/dashboard/market/MarketAutomationTab.tsx`: Fixed 6 TS errors — removed missing `LiveChecklist` import, removed `useMarketBot()` call, fixed `MarketSystemStatusCard` and `MarketPlanInsights` prop interfaces
- `components/dashboard/market/MarketResultsTab.tsx`: Fixed `MarketResultsInsights` — now receives proper `analytics` object instead of bare `trades` array
- `components/dashboard/market/MarketLiveWalletTab.tsx`: Fixed `MarketSystemStatusCard` props (removed mode/paperMode/liveChecklist/serverStatus, added system/loading/error/title)
- `components/dashboard/market/MarketClient.tsx`: Fixed liveChecklist type to match actual component expectations
- `~/.continue/config.yaml`: Fixed Grok model name `grok-beta` → `grok-3` (old model deprecated). Provider stays `openai` with apiBase `https://api.x.ai/v1`.
- `MARKET_ROBOT_STATUS_HANDOFF.md`: Complete rewrite — replaced stale Grok phase tracking with comprehensive UX critique, file inventory with grades, problem list ordered by priority, hook reference table, fix execution order, and copy-paste prompt templates for each fix

#### What's Broken / Partially Done
- **MarketClient.tsx data wiring** — all hooks disconnected, all callbacks are console.log stubs. This is the #1 blocker.
- **4 of 6 tabs are placeholder UI** — Results (F), Live Wallet (F), Saved Markets (F), Automation (D-)
- **No Practice/Live toggle** anywhere in the UI
- **Developer jargon** throughout user-facing text (edge, scan, runtime status)
- **Dead buttons**: Connect Wallet (LiveWallet), Save Plan (Automation)
- **Automation form inputs** have no onChange/useState — typing does nothing
- `components/dashboard/MarketClient.tsx` (old, 75 lines) — orphaned, should be deleted
- Full UX critique and fix plan documented in `MARKET_ROBOT_STATUS_HANDOFF.md`

#### Context Files Updated
- `MARKET_ROBOT_STATUS_HANDOFF.md`: Full rewrite with UX critique, grades, fix plan, prompt templates
- `SLATE360_PROJECT_MEMORY.md`: Session handoff (this section)

#### Next Steps (ordered)
1. Read `MARKET_ROBOT_STATUS_HANDOFF.md` — it has the complete critique and 8 copy-paste prompt templates
2. **Fix 1: Wire MarketClient.tsx** — import useMarketBot, useMarketTradeData, useMarketWalletState, useMarketServerStatus, useMarketSystemStatus. Replace console.log stubs with real hook methods. This unblocks all tabs.
3. **Fix 2: Kill placeholder text** — replace all "(Placeholder)" / "after implementation" divs with empty states + CTAs
4. **Fix 3-8: Tab-by-tab rebuilds** — Start Here, Direct Buy, Automation, Results, Live Wallet, Saved Markets (see prompt templates in MARKET_ROBOT_STATUS_HANDOFF.md)
5. Delete orphaned `components/dashboard/MarketClient.tsx` (old 75-line file)
6. Delete `MARKET_ROBOT_STATUS_HANDOFF.md.bak` after confirming new file is correct

#### Next Steps (ordered)
1. Run Batch 4.6B: CSS-only dark theme conversion of the 3 remaining files (MarketLiveWalletTab, MarketCustomizeDrawer, MarketTradeReplayDrawer)
2. Verify the 2-column layout in browser at xl breakpoint
3. Verify esports titles don't appear in Weather/Science filtered views
4. Verify "Open Results → View Positions" button works after successful paper buy
5. Then proceed to Batch 5 backend truth patch if still needed
4. Consider adding a bulk-resolve / auto-close path for accumulated old paper trades