"# Slate360 — Project Memory

Last Updated: 2026-04-12
Repo: bcvolker/slate360-rebuild
Branch: main
Live: https://www.slate360.ai

This file is the default new-chat attachment. Keep it short. Read this first, then only pull the docs required for the task.

## AI Agent Access

**AI Agents (Copilot, Claude, etc.) have read/write/run/push access to:**
- **Git**: commit, branch, merge, and push to `bcvolker/slate360-rebuild` on GitHub
- **Vercel**: deploy + env var management via `VERCEL_TOKEN` Codespace secret
- **AWS S3**: bucket `slate360-storage` (us-east-2) via stored credentials
- **Stripe**: webhook and billing management via Vercel env secrets
- **Supabase CLI**: migrations, RPC functions, schema changes to project `hadnfcenpcfaeclczsmm`

This access is intentional. Agents are expected to push commits, run migrations, and deploy — not just suggest changes.

## Start Here

Recommended read order:
1. This file
2. `SLATE360_MASTER_BUILD_PLAN.md` (single source of truth for product direction)
3. Only task-relevant docs from the read map below

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
- OLD tiers (`trial < creator < model < business < enterprise`) are OBSOLETE — removed in commit `b5d6224`
- NEW tiers: `trial < standard < business < enterprise` (per-app, not platform-wide)
- Backward-compat: legacy DB rows with "creator" or "model" auto-map to "standard"
- Users subscribe per-app with optional bundle discounts
- Enterprise gets ALL apps + admin + white-label
- `lib/entitlements.ts` rewritten to 4-tier model (standard: $149/mo, 5K credits, 25GB, 3 seats)
- subscription gates use `getEntitlements()`
- trial tier unlocks ALL tabs with tight limits (500 credits, 5GB, 1 seat) + TrialBanner
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
| Product direction / architecture | `SLATE360_MASTER_BUILD_PLAN.md` |
| Site Walk (any phase) | `SLATE360_MASTER_BUILD_PLAN.md` §3–§8 |
| Market Robot | `slate360-context/dashboard-tabs/market-robot/START_HERE.md` |
| Backend/auth/billing/storage | `slate360-context/BACKEND.md` |
| Dashboard UI/tabs | `slate360-context/DASHBOARD.md`, `slate360-context/dashboard-tabs/MODULE_REGISTRY.md` |
| SlateDrop | `slate360-context/SLATEDROP.md` |
| Widgets | `slate360-context/WIDGETS.md` |
| Active bugs | `slate360-context/ONGOING_ISSUES.md`, `ops/bug-registry.json` |
| Release readiness | `ops/module-manifest.json`, `ops/release-gates.json` |
| Codebase facts (DB, routes, deps) | `CODEBASE_AUDIT_2025.md` |

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
- CLI access via `VERCEL_TOKEN` Codespace secret (linked to `slate360/slate360-rebuild`)
- Env var dashboard: `https://vercel.com/slate360/slate360-rebuild/settings/environment-variables`

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

Most planning docs have been deleted (2026-04-11 cleanup). Only reference-only files remaining:
- `slate360-context/dashboard-tabs/market-robot/CURRENT_STATE_HANDOFF.md`
- `slate360-context/dashboard-tabs/market-robot/ONGOING_BUILD_TRACKER.md`
- `slate360-context/SUPABASE_EMAIL_TEMPLATES.md`

Use those files only for deep history or recovery work.

## Known Monolith Files (read state + JSX together)

| File | Lines | Status |
|---|---|---|
| `components/walled-garden-dashboard.tsx` | 82 | ✅ Extracted — was 1472 lines, now thin orchestrator |
| `components/dashboard/DashboardClient.tsx` | 264 | ✅ Under limit — 5 extractions + 6 sub-hooks |
| `lib/hooks/useDashboardState.ts` | 244 | ✅ Under limit — thin orchestrator (6 sub-hooks) |
| `components/slatedrop/ProjectFileExplorer.tsx` | 178 | ✅ Under limit — hook extracted to `useProjectFileExplorer.ts` (236 lines) |
| `components/dashboard/market/MarketClient.tsx` | 175 | ✅ Under limit |
| `components/shared/DashboardHeader.tsx` | 286 | ✅ Under limit |
| `app/page.tsx` | 63 | ✅ Under limit — Phase 6 complete (8 files in `components/home/`) |
| `app/(dashboard)/project-hub/[projectId]/management/page.tsx` | 931 | ⚠️ Over limit — needs extraction |
| `app/(dashboard)/project-hub/[projectId]/photos/page.tsx` | 599 | ⚠️ Over limit — needs extraction |
| `app/(dashboard)/project-hub/[projectId]/submittals/page.tsx` | 579 | ⚠️ Over limit — needs extraction |
| `app/(dashboard)/project-hub/[projectId]/schedule/page.tsx` | 465 | ⚠️ Over limit — needs extraction |
| `app/(dashboard)/project-hub/[projectId]/drawings/page.tsx` | 448 | ⚠️ Over limit — needs extraction |
| `app/(dashboard)/project-hub/[projectId]/budget/page.tsx` | 421 | ⚠️ Over limit — needs extraction |
| `app/(dashboard)/project-hub/[projectId]/punch-list/page.tsx` | 403 | ⚠️ Over limit — needs extraction |
| `app/(dashboard)/project-hub/[projectId]/daily-logs/page.tsx` | 358 | ⚠️ Over limit — needs extraction |
| `app/(dashboard)/project-hub/[projectId]/rfis/page.tsx` | 339 | ⚠️ Over limit — needs extraction |

When editing oversized files, always read both the state declarations AND the JSX sections.

## Latest Session Handoff

<!-- Each chat MUST overwrite this section at end of conversation. Next chat reads this first. -->

### Session Handoff — 2026-04-13 (Purchase-Based App Model + Stripe Completion)

### What Changed

**Commit 8f9c3e9 — Security Hardening (prior session)**
- Trial TIER_MAP fields set to `false`; all page/API/nav gates use `canAccessStandalone*`
- All 31 Site Walk API routes: `withAuth()` → `withAppAuth("punchwalk")`
- DashboardSidebar threaded with entitlements prop
- ProjectFileExplorer extracted (363→178 lines)

**Commit 2976bef — Purchase-Based App Model**
- `lib/entitlements.ts`: Removed tier fallbacks from `canAccessStandaloneTourBuilder`, `canAccessStandaloneDesignStudio`, `canAccessStandaloneContentStudio`. All 4 apps now consistently require standalone flag OR modular subscription — no tier auto-grant.
- Created Stripe products: Design Studio (`prod_UKR4p1NZfdXtkg`), Content Studio (`prod_UKR4RK9EixZlf0`)
- Created Stripe prices: DS monthly `price_1TLmCSJCrjGbeotHDwqs7bqn`, CS monthly `price_1TLmCaJCrjGbeotHe74bwSye` ($49/mo each)
- Updated local `.env` + all 4 Vercel env vars (DS + CS, prod + dev) with new price IDs
- Inserted `org_feature_flags` row for Slate360 org (`c5538bfd...`): all 4 standalone flags = `true`, 999 TB seat limit
- `slate360-context/BACKEND.md`: Rewrote "Tier And Entitlements Snapshot" section with current limits table + new App Access Model documentation

**Verified E2E Chains**
- All 6 gating traces pass (page gates, API gates, nav visibility, entitlement resolution, webhook→DB, checkout flow)
- SW purchase→entitlement→access chain fully traced and verified
- Stripe products/prices/envs audited — all 4 standalone apps have valid price IDs

### What's Broken / Partially Done
- **P1: 9 Project Hub monolith files** exceed 300-line limit (931, 599, 579, 465, 448, 421, 403, 358, 339)
- **P1: Tier-based visibility fields** (`canAccessDesignStudio`, `canAccessContent`, `canAccessTourBuilder`) still `true` for standard+ in TIER_MAP — these control dashboard card/nav visibility (MobileNavSheet, DashboardClient, folderTree). They no longer grant app page access. Review whether trial users should see locked app cards.
- **P1: 12 modular plan env vars** in `billing-apps.ts` have no Stripe products (basic/pro tiers for each app, bundles, storage/credit addons). Standalone purchase works; modular checkout will 400 until these are created.
- **P2: 14 files over 300 lines** per file-size checker (pre-existing, no regressions)
- **P2: MobileNavSheet.tsx** uses tier-based fields (`canAccessTourBuilder` etc.) for nav visibility, while MobileModuleBar/QuickNav/DashboardSidebar use standalone fields. Inconsistent — MobileNavSheet shows apps to users who can't access them.

### Context Files Updated
- `slate360-context/BACKEND.md`: Tier/entitlements section rewritten with current model
- `SLATE360_PROJECT_MEMORY.md`: this handoff

### Next Steps (ordered by priority)
1. Design Slate360 app layout (command center, what activates on subscription)
2. Design Site Walk app layout + features
3. Create Stripe products/prices for modular plans (basic/pro per app, bundles, addons)
4. Align MobileNavSheet.tsx with standalone gate model (or add "locked" state for unpurchased apps)
5. Extract Project Hub monoliths (9 files)
6. Rename `basic` → `standard` in modular entitlements if aligning terminology
7. Address remaining file-size violations (14 files)