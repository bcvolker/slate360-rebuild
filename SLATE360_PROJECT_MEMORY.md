# Slate360 — Project Memory

Last Updated: 2026-03-28
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

| File | Lines | Status |
|---|---|---|
| `components/dashboard/DashboardClient.tsx` | 264 | ✅ Under limit — 5 extractions + 6 sub-hooks |
| `lib/hooks/useDashboardState.ts` | 244 | ✅ Under limit — thin orchestrator (6 sub-hooks) |
| `components/slatedrop/SlateDropClient.tsx` | 282 | ✅ Under limit — 7 sub-hooks extracted |
| `components/dashboard/market/MarketClient.tsx` | 175 | ✅ Under limit |
| `components/shared/DashboardHeader.tsx` | 286 | ✅ Under limit |
| `app/page.tsx` | 775 | ⚠️ Over limit — Phase 6 (homepage decomposition) |
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

### Session Handoff — 2026-03-28 (Catch-Up: All TS Errors Fixed, Navy Purge Complete, UI Fixes Pushed)

#### What Changed (This Session)
- **Logo fix:** DashboardHeader logo now links to `/` (homepage) instead of `/dashboard`
- **Mobile Quick Access removed:** Removed orange `MobileQuickAccess` component from dashboard (redundant with header QuickNav)
- **Debug banner removed:** Removed blue runtime/branch/org debug banner from DashboardClient
- **SlateDropClient TS errors fixed:** `useSlateDropUiState` now imports `DbFile` from `@/lib/slatedrop/helpers` (was missing `type: "file"` discriminator)
- **MarketClient TS error fixed:** Added `chainId`, `onSwitchToPolygon`, `isSwitchingChain` to `WalletSnapshot` interface and `MarketLiveWalletTab` props
- **Navy purge complete:** Replaced `#1E3A8A` in last 3 files (contacts API, widgets API, AddContactModal) — zero remaining
- **Cleaned up unused state:** Removed `mobileNavOpen`/`setMobileNavOpen` from `useDashboardState`

#### Git State
- HEAD: `01bbdf8` — pushed to `origin/main`, clean working tree
- Vercel auto-deploying from this commit

#### TypeScript Status
- **0 errors** across entire codebase (`npx tsc --noEmit` passes clean)

#### What's NOT Broken
- Auth system: fully working (signup, login, forgot password, email confirmation)
- Dashboard: 264 lines, all extractions done, 6 sub-hooks working
- SlateDrop: 282 lines, 7 sub-hooks wired
- Market Robot: 175 lines, compiles clean (paused — needs wallet funding to test)
- Navy purge: 0 files with `#1E3A8A` remaining

#### Design & UI Overhaul Phase Tracker (see `DESIGN_UI_OVERHAUL_PLAN.md`)

| Phase | Description | Status |
|---|---|---|
| 0 | Fix remote (force-push) | ✅ Complete |
| 1 | CSS design tokens in globals.css | ✅ Complete |
| 2 | Navy `#1E3A8A` purge | ✅ Complete — 0 files remaining |
| 3 | Install shadcn UI primitives | ✅ Complete — 13 files in `components/ui/` |
| 3.5 | Guardrails (Husky, lint-staged, CI) | ✅ Complete |
| 4 | DashboardClient decomposition | ✅ Complete — 1,961 → 264 lines |
| 5 | Entitlements fix (creator `canAccessHub`) | ✅ Complete |
| 5B | useDashboardState sub-hook decomposition | ✅ Complete — 775 → 244 lines, 6 sub-hooks |
| 5.5 | Zod API validation (per-route) | ⬜ Not started — add incrementally as routes are touched |
| **6** | **Homepage decomposition (775 lines)** | **⬜ Next** |
| 7 | Visual polish | ⬜ Not started |
| 8 | New feature readiness | ⬜ Not started |

Also completed outside plan:
- SlateDropClient decomposition: 451 → 282 lines (7 sub-hooks)
- Logo, mobile quick-access, debug banner UI fixes
- All TS errors resolved (was 4, now 0)

#### Module Health Summary

| Module | Status | Main File | Lines | Notes |
|--------|--------|-----------|-------|-------|
| **Dashboard** | ✅ Done | `DashboardClient.tsx` | 264 | 5 extractions + 6 sub-hooks |
| **Dashboard State** | ✅ Done | `useDashboardState.ts` | 244 | Thin orchestrator |
| **DashboardMyAccount** | ✅ Done | `DashboardMyAccount.tsx` | 267 | Under limit |
| **DashboardHeader** | ✅ Done | `DashboardHeader.tsx` | 286 | Shared across all pages |
| **SlateDrop** | ✅ Done | `SlateDropClient.tsx` | 282 | 7 sub-hooks wired |
| **Market Robot** | ⏸️ Paused | `MarketClient.tsx` | 175 | Needs wallet funding to test |
| **Homepage** | ⚠️ Over limit | `app/page.tsx` | 775 | Phase 6 target |
| **Project Hub pages** | ⚠️ 9 files over limit | Various | 339-931 | Future extraction needed |

#### Sub-Hook Registry

**Dashboard (6 hooks):**
`useBillingState` (81), `useWidgetPrefsState` (155), `useAccountState` (154), `useWeatherState` (104), `useSuggestFeatureState` (40), `useNotificationsState` (38)

**SlateDrop (7 hooks):**
`useSlateDropUiState`, `useSlateDropFiles`, `useSlateDropPreviewUrl`, `useSlateDropUploadActions`, `useSlateDropInteractionHandlers`, `useSlateDropTransferActions`, `useSlateDropMutationActions`

#### Next Steps (Ordered)
1. **Phase 6 — Homepage decomposition** (`app/page.tsx` 775 → ~100 lines)
2. **Phase 7 — Visual polish** (card patterns, spacing, loading states)
3. **Phase 8 — New feature readiness** (DashboardTabShell wiring, UpgradeGate)
4. **Project Hub page extractions** (9 files over 300-line limit)

#### Accesses Confirmed Working
- **Supabase admin**: `createAdminClient()` via `SUPABASE_SERVICE_ROLE_KEY`
- **Resend API**: domain `slate360.ai` verified, sending works
- **Vercel CLI**: `vercel whoami` → `slate360ceo-8370`
- **Git**: push to `origin/main` triggers Vercel auto-deploy
- **AWS S3**: bucket `slate360-storage`, region `us-east-2`
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