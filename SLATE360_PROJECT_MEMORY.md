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
| Design Studio | `slate360-context/dashboard-tabs/design-studio/START_HERE.md` |
| 360 Tour Builder | `slate360-context/dashboard-tabs/tour-builder/START_HERE.md` |
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
| `components/dashboard/DashboardClient.tsx` | 1,961 | State at top, JSX at bottom — can't edit one without seeing the other |
| `components/slatedrop/SlateDropClient.tsx` | 451 | Decomposed but still large; multi-phase upload + preview logic |
| `app/(dashboard)/project-hub/[projectId]/management/page.tsx` | 931 | Oversized — needs extraction |
| `app/(dashboard)/project-hub/[projectId]/photos/page.tsx` | 599 | Oversized — needs extraction |
| `app/(dashboard)/project-hub/[projectId]/submittals/page.tsx` | 579 | Oversized — needs extraction |
| `app/(dashboard)/project-hub/[projectId]/schedule/page.tsx` | 465 | Oversized — needs extraction |
| `app/(dashboard)/project-hub/[projectId]/drawings/page.tsx` | 448 | Oversized — needs extraction |
| `app/(dashboard)/project-hub/[projectId]/budget/page.tsx` | 421 | Oversized — needs extraction |
| `app/(dashboard)/project-hub/[projectId]/punch-list/page.tsx` | 403 | Oversized — needs extraction |
| `app/(dashboard)/project-hub/[projectId]/daily-logs/page.tsx` | 358 | Oversized — needs extraction |
| `app/(dashboard)/project-hub/[projectId]/rfis/page.tsx` | 339 | Oversized — needs extraction |

When editing these, always read both the state declarations AND the JSX sections.

## Latest Session Handoff

<!-- Each chat MUST overwrite this section at end of conversation. Next chat reads this first. -->

### Session Handoff — 2026-03-22 (Multi-Module Prep + Market Robot Pause)

#### Session Summary
Market Robot V3 is paused at Prompts 10/16 complete — waiting for wallet USDC funding to test live CLOB buys. This session prepared the project for multi-module work across chats/computers by creating START_HERE.md files for Design Studio and 360 Tour Builder, updating all context docs, and auditing readiness of dashboard/slatedrop/project-hub.

#### What Changed This Session
- Created `slate360-context/dashboard-tabs/design-studio/START_HERE.md` — full build guide with 10-step progress tracker
- Created `slate360-context/dashboard-tabs/tour-builder/START_HERE.md` — full build guide with 12-step progress tracker
- Updated `slate360-context/dashboard-tabs/market-robot/START_HERE.md` — marked PAUSED, added CLOB status, remaining prompts, resume instructions
- Updated `SLATE360_PROJECT_MEMORY.md` — added Design Studio + Tour Builder to task map, updated monolith table with accurate line counts, comprehensive handoff
- No code changes this session (context/docs only)

#### Module Health Summary

| Module | Status | Main File(s) | Lines | Action Needed |
|--------|--------|-------------|-------|---------------|
| **Market Robot** | ⏸️ Paused (Prompts 11-16 remain) | `MarketClient.tsx` | 164 | Fund wallet → test $1 buy → continue prompts |
| **Dashboard** | ⚠️ Live but monolithic | `DashboardClient.tsx` | 1,961 | Needs decomposition into ~10 smaller components |
| **SlateDrop** | ✅ Good shape | `SlateDropClient.tsx` | 451 | BUG-001 phase 2 (folder migration), edge cases |
| **Project Hub** | ⚠️ Live, 9 oversized files | `ClientPage.tsx` | 255 | 9 Tier-3 tool pages exceed 300 lines — need extraction |
| **Design Studio** | 🔲 Scaffolded only | `DesignStudioShell.tsx` | 37 | Full build needed (viewer, DB, API, UI) |
| **360 Tour Builder** | 🔲 Scaffolded only | `ToursShell.tsx` | 37 | Full build needed (panorama, DB, API, UI) |

#### Market Robot Pause State
- **Prompts 1-10**: ✅ Complete (commits 965eec3, 88dba10, f3c346f)
- **Prompts 11-16**: ⬜ Not started (column sort, buy flow, positions, automation, scalper, layout)
- **CLOB code**: Built but unverified (`clob-api.ts` HMAC signing, `buy/route.ts` live path with 4 fallbacks)
- **API keys**: All present in `.env.local` + Vercel
- **Builder key**: Created, signed via MetaMask on Polygon (chain 137)
- **Blocker**: No USDC in wallet → can't test live buy → can't verify CLOB format
- **Resume**: Fund wallet → add `NEXT_PUBLIC_POLYMARKET_SPENDER` to `.env.local` → test $1 buy → continue Prompt 11

#### New Tab Build Readiness

**Design Studio** (`/(dashboard)/design-studio`):
- Gate: `getEntitlements(tier).canAccessDesignStudio` (Model+ tier)
- Has: route scaffold, shell, sidebar, QuickNav, system folder provisioning, feature marketing page
- Missing: viewer stack (Three.js/PDF.js/IFC), database tables, API routes, functional UI
- Context: `slate360-context/dashboard-tabs/design-studio/START_HERE.md` ← read this first
- Dependencies: viewer stack decision needed before building

**360 Tour Builder** (`/(dashboard)/tours`):
- Gate: `getEntitlements(tier).canAccessTours` (Creator+ tier)
- Has: route scaffold, shell, sidebar, QuickNav, system folder, feature page with Pannellum demo
- Missing: panorama pipeline, database tables, API routes, hotspot system, sharing, functional UI
- Context: `slate360-context/dashboard-tabs/tour-builder/START_HERE.md` ← read this first
- Dependencies: Pannellum likely viewer (already in feature page demo)

#### Dashboard Decomposition Needs
- `DashboardClient.tsx` is 1,961 lines — 6.5× the 300-line limit
- Already partially decomposed: DashboardHeader, DashboardTabShell, 12 widget components extracted
- Remaining work: extract tab rendering logic, sidebar, state management into smaller files
- Start with `slate360-context/DASHBOARD.md` for full blueprint

#### Project Hub Decomposition Needs
- 9 of 14 Tier-3 tool pages exceed 300 lines (management: 931, photos: 599, submittals: 579, etc.)
- Each needs component extraction (table, form, toolbar → separate files)
- Start with `slate360-context/PROJECT_HUB.md` for full blueprint

#### Files to Delete (orphans from prior refactors)
- `components/dashboard/MarketClient.tsx` (old orphaned copy, 75 lines)
- `components/dashboard/market/MarketRobotWorkspace.tsx` (unused, 84 lines)
- `MARKET_ROBOT_STATUS_HANDOFF.md.bak` (backup of old handoff)

#### Context Files Updated This Session
- `slate360-context/dashboard-tabs/design-studio/START_HERE.md` — CREATED
- `slate360-context/dashboard-tabs/tour-builder/START_HERE.md` — CREATED
- `slate360-context/dashboard-tabs/market-robot/START_HERE.md` — UPDATED (pause state + resume guide)
- `SLATE360_PROJECT_MEMORY.md` — UPDATED (task map, monolith table, handoff)

#### Priority Order for Next Work

**Tier 1 — Revenue/Core (choose based on what you're ready for):**
1. Market Robot resume (when wallet funded) — Prompts 11-16 → live CLOB → WebSocket
2. Dashboard decomposition — DashboardClient.tsx from 1,961 → ~10 files under 300 each
3. Project Hub decomposition — 9 tool pages need extraction

**Tier 2 — New Features:**
4. Design Studio build — viewer stack decision first, then 10-step build
5. 360 Tour Builder build — Pannellum integration, then 12-step build

**Tier 3 — Polish:**
6. SlateDrop BUG-001 phase 2 (folder migration)
7. Orphan file cleanup