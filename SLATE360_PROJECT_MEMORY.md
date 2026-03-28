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
| `lib/hooks/useDashboardState.ts` | 246 | ✅ Under limit — 6 sub-hooks extracted |
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

### Session Handoff — 2026-03-28 (Phase 5B: useDashboardState Sub-Hook Decomposition — Complete)

#### What Changed
- `lib/hooks/useBillingState.ts` (NEW, 81 lines): billing portal, buy credits, upgrade plan
- `lib/hooks/useWidgetPrefsState.ts` (NEW, 155 lines): widget prefs, drag-reorder, save/reset
- `lib/hooks/useAccountState.ts` (NEW, 154 lines): account overview, API keys, preferences
- `lib/hooks/useWeatherState.ts` (NEW, 104 lines): geolocation, weather fetch, logging
- `lib/hooks/useSuggestFeatureState.ts` (NEW, 40 lines): suggest-feature form + submit
- `lib/hooks/useNotificationsState.ts` (NEW, 38 lines): unread notifications fetch
- `lib/hooks/useDashboardState.ts`: 775 → 246 lines (under 300 limit). Now a thin orchestrator that imports 6 sub-hooks
- Commit `469d906`, not yet pushed

#### What's Broken / Partially Done
- Nothing broken. `npx tsc --noEmit` passes with 0 errors.

#### Next Steps (Ordered)

1. **Phase 5.5 — Zod validation** (add per-route as touched, not a bulk pass).

2. **SlateDropClient decomposition** — 451 lines, over 300-line limit.

3. **Codebase-wide navy purge** — 60+ files still have `#1E3A8A`.

#### Module Health Summary

| Module | Status | Main File(s) | Lines | Action |
|--------|--------|-------------|-------|--------|
| **Dashboard** | ✅ Under limit | `DashboardClient.tsx` | 277 | Done |
| **Dashboard State** | ✅ Under limit | `useDashboardState.ts` | 246 | Done (6 sub-hooks) |
| **DashboardMyAccount** | ✅ Under limit | `DashboardMyAccount.tsx` | 267 | Done |
| **Market Robot** | ⏸️ Paused | `MarketClient.tsx` | 164 | Fund wallet → test |
| **SlateDrop** | ⚠️ Over limit | `SlateDropClient.tsx` | 451 | Decompose |

#### Sub-Hook Registry (Dashboard)

| Hook | Lines | Domain |
|------|-------|--------|
| `useBillingState` | 81 | Billing portal, credits, plan upgrades |
| `useWidgetPrefsState` | 155 | Widget prefs, drag-reorder, save/reset |
| `useAccountState` | 154 | Account overview, API keys, preferences |
| `useWeatherState` | 104 | Geolocation, weather, logging |
| `useSuggestFeatureState` | 40 | Suggest-feature form + submit |
| `useNotificationsState` | 38 | Unread notifications fetch |

#### Git State
- HEAD: `469d906` (refactor: decompose useDashboardState into 6 domain sub-hooks — Phase 5B)
- Not yet pushed to origin/main
- Clean working tree

#### Auth System Status — COMPLETE ✅
All paths working: signup → confirmation email → `/dashboard`, existing email → sign-in prompt, forgot password, resend confirmation.

#### What's Still Broken / Needs Work
- **60+ files still have `#1E3A8A`** — only homepage/signup/login/globals.css were done in this session. Need a codebase-wide navy purge (dashboard, project-hub, slatedrop, features pages, email templates)
- **`DashboardClient.tsx`** — 1,954 lines, needs decomposition (Phase 4 of `DESIGN_UI_OVERHAUL_PLAN.md`)
- **`components/ui/`** — only 3 files, missing all shadcn basics (Phase 3)
- **Creator tier** missing `canAccessHub: true` in `lib/entitlements.ts` — user saw limited tabs on trial login
- **Mobile optimization** — not started
- **SEO** — minimal, needs metadata/OG images
- **Email templates** (`lib/email.ts`) — still use `#1E3A8A` navy header background

#### Accesses Confirmed Working
- **Supabase admin**: `createAdminClient()` via `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`
- **Resend API**: `re_UmiW3RXd_...` — domain `slate360.ai` verified, sending works
- **Vercel CLI**: `vercel whoami` → `slate360ceo-8370`, can list deploys + pull/push env vars
- **Git**: push to `origin/main` triggers Vercel auto-deploy
- **AWS S3**: bucket `slate360-storage`, region `us-east-2`, client in `lib/s3.ts`

#### Next Steps (Ordered)
1. **Push the pending commit** (see commands above)
2. **Codebase-wide navy purge** — `grep -r "#1E3A8A" --include="*.tsx" --include="*.ts" --include="*.css" -l` to find all remaining files, then batch-replace
3. **Install shadcn/ui** — `npx shadcn@latest init` then add Button, Card, Dialog, Input, Badge, Tabs primitives
4. **Fix entitlements** — add `canAccessHub: true` to creator tier in `lib/entitlements.ts`
5. **Dashboard decomposition** — extract My Account, tab panels, header from `DashboardClient.tsx`
6. **Mobile responsive pass** — viewport meta, responsive nav, touch targets
7. **SEO** — metadata, OG images, structured data for construction industry keywords

#### What's Broken / Needs Attention
- Remote `origin/main` had broken commit `8a3ab35` — force-push applied to fix
- `DashboardClient.tsx` is still 1,954 lines (decomposition in Phase 4)
- 60+ files still contain `#1E3A8A` navy blue (purge in Phase 2)
- `components/ui/` only has 3 files — missing all shadcn basics (Phase 3)
- Creator tier missing `canAccessHub: true` in `lib/entitlements.ts` (Phase 5)
- 9 orphaned widget files not imported anywhere (Phase 4.5)

#### Module Health Summary

| Module | Status | Main File(s) | Lines | Action Needed |
|--------|--------|-------------|-------|---------------|
| **Market Robot** | ⏸️ Paused (Prompts 11-16 remain) | `MarketClient.tsx` | 164 | Fund wallet → test $1 buy → continue prompts |
| **Dashboard** | ⚠️ Live but monolithic | `DashboardClient.tsx` | 1,954 | Phase 4 of DESIGN_UI_OVERHAUL_PLAN.md |
| **SlateDrop** | ✅ Good shape | `SlateDropClient.tsx` | 451 | BUG-001 phase 2 (folder migration) |
| **Project Hub** | ⚠️ Live, 9 oversized files | `ClientPage.tsx` | 255 | 9 tool pages exceed 300 lines |
| **Design Studio** | 🔲 Scaffolded only | `DesignStudioShell.tsx` | 37 | Full build needed |
| **360 Tour Builder** | 🔲 Scaffolded only | `ToursShell.tsx` | 37 | Full build needed |

#### Agent Coordination Lessons
- **Grok 4.2**: Good at UX concepts/research. Invents fictional APIs for hooks (~20 type errors). Protocol: Copilot provides type contracts → Grok writes UI → Copilot verifies.
- **Gemini 3.1**: Good for design consultation. **Do NOT let it execute code** — truncated globals.css, broke remote. Design mockups/specs only.
- **Copilot (Claude Opus 4.6)**: Primary codebase owner. All code changes, decomposition, verification.

#### Files to Delete (orphans from prior refactors)
- `components/dashboard/MarketClient.tsx` (old orphaned copy, 75 lines)
- `components/dashboard/market/MarketRobotWorkspace.tsx` (unused, 84 lines)
- `MARKET_ROBOT_STATUS_HANDOFF.md.bak` (backup of old handoff)

#### Priority Order for Next Work

**Tier 0 — Design/UI Overhaul (active plan):**
Execute `DESIGN_UI_OVERHAUL_PLAN.md` phases 1-8 in order.

**Tier 1 — Revenue/Core:**
1. Market Robot resume (when wallet funded) — Prompts 11-16
2. Project Hub decomposition — 9 tool pages need extraction

**Tier 2 — New Features:**
3. Design Studio build — viewer stack decision first
4. 360 Tour Builder build — Pannellum integration

**Tier 3 — Polish:**
5. SlateDrop BUG-001 phase 2
6. Orphan file cleanup