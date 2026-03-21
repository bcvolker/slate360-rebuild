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

### Session Handoff — 2026-03-21 (Market Robot V2 — All 6 Tabs Complete)

#### What Changed
- **UX Fixes (commit a7f8e63)**: 5 corrections across 9 files
  - Background: slate-950 → zinc-950 across MarketRouteShell, MarketClient, tab components
  - Default tab: start-here → direct-buy
  - Tab order: Markets first, Guide last (layout-presets.ts)
  - Custom scrollbar CSS in globals.css
  - Search synonym guards (weather/esports) in API route
  - Buy panel: removed 1.2s auto-close on confirmation
- **MarketLiveWalletTab.tsx (commit 756f9d6)**: V2 rewrite — 187 lines, typed props (no `any`), wallet status card, USDC/MATIC balances, 5-step live readiness checklist with progress bar, system status card, quick action buttons
- **MarketSavedTab.tsx (commit 756f9d6)**: V2 rewrite — 106 lines, wired to `useMarketWatchlist()`, grid cards with prices/category/dates, remove button, empty state CTA, refresh button

#### V2 Tab Status (all 6 complete)
| Tab | File | Lines | Status |
|---|---|---|---|
| Markets (Direct Buy) | MarketDirectBuyTab.tsx | 237 | ✅ V2 |
| Portfolio (Results) | MarketResultsTab.tsx | ~180 | ✅ V2 |
| Automation | MarketAutomationTab.tsx | 85 | ✅ V2 |
| Saved | MarketSavedTab.tsx | 106 | ✅ V2 |
| Wallet | MarketLiveWalletTab.tsx | 187 | ✅ V2 |
| Guide (Start Here) | MarketStartHereTab.tsx | 105 | ✅ V2 |
| Orchestrator | MarketClient.tsx | 147 | ✅ V2, 5 hooks wired |

#### What's Broken / Partially Done
- **Orphan files still exist**: `components/dashboard/MarketClient.tsx` (old 75-line orphan), `MarketRobotWorkspace.tsx` (unused), `MARKET_ROBOT_STATUS_HANDOFF.md.bak`
- **Sub-components still use slate-950**: Cards/inputs in MarketAutomationBuilder, MarketActivityFeed, MarketSharedUi, etc. use `bg-slate-950/80` for element backgrounds — these are intentional contrast against zinc-950 page bg, but may want review
- **Start Here tab is static** — user wants landing to show wallet/performance metrics, trending opportunities, real-time data instead of static welcome text
- **Column sorting** in DirectBuyResults — no visual sort indicators
- **Result detail click-through** — MarketListingDetailDrawer exists but UX needs polish
- **Practice/Live mode toggle** — bot.config.paperMode is wired but no toggle UI in the nav or orchestrator

#### Context Files Updated
- `SLATE360_PROJECT_MEMORY.md`: This handoff

#### Next Steps (ordered)
1. **Cleanup**: Delete orphan files (old MarketClient.tsx, MarketRobotWorkspace.tsx, .bak)
2. **Landing redesign**: Convert Start Here into a compact dashboard with wallet stats, P&L chart, trending markets, quick actions — or remove as tab and integrate into Direct Buy header
3. **Practice/Live mode toggle**: Add toggle UI to nav or orchestrator area
4. **UI polish**: Sort indicators on columns, detail drawer improvements, reduce pills/cards
5. **Polymarket category alignment**: Verify search categories match actual Polymarket taxonomy
6. **Context doc updates**: Update MARKET_ROBOT_STATUS_HANDOFF.md with V2 completion status

#### Commits This Session
- `a7f8e63` — 5 UX corrections (bg, default tab, scrollbar, search, buy confirmation)
- `756f9d6` — V2 LiveWalletTab + SavedTab
```