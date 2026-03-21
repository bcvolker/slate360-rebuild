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

### Session Handoff — 2026-03-21 (Market Robot V3 — Foundation + Command Center)

#### What Changed This Session
- **Prompt 9 (commit 965eec3)**: Cross-cutting sweep across 32 market files
  - Color: All `bg-slate-950/900` → `bg-zinc-950/900`, all `border-slate-700/800` → `border-zinc-800`
  - Navy: All `#1E3A8A` hex, `rgba(15,23,42)`, `rgba(2,6,23)`, `rgba(8,15,31)` gradients replaced with zinc-neutral equivalents
  - Pills: All decorative `rounded-full` badges/chips → `rounded-lg` (preserved status dots, spinners, toggles, progress bars)
  - Jargon: edge→opportunity, whale→removed, signal→removed, robot→auto-buy, liquidity→depth, spread→price gap, slippage→removed, fill policy→removed
- **Prompt 10 (in progress via Grok)**: MarketCommandCenter — replacing static Start Here with real-time dashboard landing
- **Bot Engine Upgrade (commit 88dba10)**: 4 trading improvements
  - Arbitrage detection: `isArbitrage` flag on `MarketOpportunity` when YES+NO < $1, bypasses min-edge filter, +20 confidence, sorts first
  - Kelly position sizing: half-Kelly replaces flat `floor(amount/price)` — sizes bets proportional to edge strength
  - Fee-threshold guard: `checkFeeThreshold()` blocks trades where edge < estimated fees (default 2%), except arbitrage
  - Position monitor: new `position-monitor.ts` checks open trades each tick, auto-closes on TP/SL hit
  - Extraction: `decideTrades` + `simulatePaperTrade` moved to `lib/market/trade-decisions.ts` (file size compliance)

#### V3 Issue Tracker (user-reported — verify & close when resolved)
| # | Issue | Status | Prompt |
|---|-------|--------|--------|
| I1 | First page is "Markets" not a real-time dashboard | 🔧 In progress (Prompt 10) | 10 |
| I2 | UI still has navy/blue-tinted colors | ✅ Fixed (Prompt 9) | 9 |
| I3 | Pill/card-heavy UI looks archaic | ✅ Fixed (Prompt 9) | 9 |
| I4 | AI jargon that first-time users won't understand | ✅ Fixed (Prompt 9) | 9 |
| I5 | Unnecessary scrollbars — layout should fit viewport | ⬜ Not started | 16 |
| I6 | Search results not sortable by clicking columns | ⬜ Not started | 11 |
| I7 | Search results don't mirror Polymarket categories | ⬜ Not started | 11 |
| I8 | Open positions not clickable/drillable | ⬜ Not started | 13 |
| I9 | Placeholder data instead of real empty states | ⬜ Not started | 13 |
| I10 | Buy panel pills still had navy color | ✅ Fixed (Prompt 9) | 9 |
| I11 | After buy, no inline position tracker on same page | ⬜ Not started | 12 |
| I12 | Automation inputs not user-friendly / too much jargon | ✅ Partially fixed (Prompt 9 labels), needs Prompt 14 | 14 |
| I13 | Automation not optimized for high-volume 24/7 micro-buys | ⬜ Not started | 15 |
| I14 | No Volume Scalper mode (goal: $7K/mo from micro-buys) | ⬜ Not started | 15 |
| I15 | Orphan files still exist | ⬜ Not started | cleanup |

#### Prompt Tracker
| # | Prompt | Status |
|---|--------|--------|
| 1–8 | V2 tabs + UX fixes | ✅ Complete |
| 9 | Color + pill + jargon purge | ✅ Complete (965eec3) |
| 10 | Command Center landing | 🔧 In progress (Grok) |
| 11 | Search: clickable column sort + Polymarket mirror | ⬜ |
| 12 | Buy flow + inline position tracker | ⬜ |
| 13 | Open position drill-down | ⬜ |
| 14 | Automation: plain language rewrite | ⬜ |
| 15 | Volume Scalper mode (high-freq micro-buys) | ⬜ |
| 16 | Layout & scroll fix pass | ⬜ |

#### Commits This Session
- `965eec3` — Prompt 9: color purge, pill reduction, jargon cleanup, navy removal (32 files)
- `88dba10` — Bot engine: arbitrage detection, Kelly sizing, fee guard, position monitor (6 files)

#### Next Steps
1. Get Grok CLOB research (WebSocket endpoint, fee numbers, arb reality check)
2. Review Grok's Prompt 10 (Command Center) output → verify + wire
3. Prompt 11: Clickable column sort + Polymarket search alignment
4. Prompt 12: Inline position tracker after buy
5. Wire live CLOB execution (needs API credentials + Grok research)
6. Continue through Prompt 16