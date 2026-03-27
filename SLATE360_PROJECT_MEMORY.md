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
| Design Studio | `slate360-context/dashboard-tabs/design-studio/START_HERE.md`, then `BUILD_GUIDE.md` |
| Content Studio | `slate360-context/dashboard-tabs/content-studio/START_HERE.md`, then `BUILD_GUIDE.md` |
| 360 Tour Builder | `slate360-context/dashboard-tabs/tour-builder/START_HERE.md`, then `BUILD_GUIDE.md` |
| Backend/auth/billing/storage | `slate360-context/BACKEND.md` |
| Shared dashboard/tab behavior | `slate360-context/DASHBOARD.md`, `slate360-context/dashboard-tabs/MODULE_REGISTRY.md`, `slate360-context/dashboard-tabs/CUSTOMIZATION_SYSTEM.md` |
| Project Hub | `slate360-context/PROJECT_HUB.md` |
| SlateDrop | `slate360-context/SLATEDROP.md` |
| Widgets | `slate360-context/WIDGETS.md` |
| Active bugs | `slate360-context/ONGOING_ISSUES.md`, `ops/bug-registry.json` |
| Release readiness | `ops/module-manifest.json`, `ops/release-gates.json` |
| Dashboard/Project Hub/SlateDrop refactoring | `slate360-context/refactor/DASHBOARD_REFACTOR_GUIDE.md`, `slate360-context/refactor/PROJECT_HUB_REFACTOR_GUIDE.md`, `slate360-context/refactor/SLATEDROP_REFACTOR_GUIDE.md` |

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
| `lib/hooks/useDashboardState.ts` | 775 | State hook — cohesive but large; split sub-hooks in future phase |
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

### Session Handoff — 2026-03-27 (Refactor Guides: Dashboard, Project Hub, SlateDrop)

#### What Changed
- `slate360-context/refactor/DASHBOARD_REFACTOR_GUIDE.md` (NEW): Safe extraction plan for `useDashboardState.ts` (775 lines → sub-hooks), `DashboardWidgetRenderer.tsx` (513 lines), `LocationMap.tsx` (1,892 lines, BUG-018 DrawingManager migration May 2026 deadline). Includes Phases 5B–9, UI fix queue UI-001–UI-005, safe-build checklist, phase tracker.
- `slate360-context/refactor/PROJECT_HUB_REFACTOR_GUIDE.md` (NEW): Safe extraction plan for all 9 tool pages over 300 lines (management=931, photos=599, submittals=579, etc.) and component files (ProjectDashboardGrid=560, WizardLocationPicker=412, ObservationsClient=334). Includes BUG-013 fix plan, Phases 1–9, UI fix queue UI-PH-001–UI-PH-005, safe-build checklist.
- `slate360-context/refactor/SLATEDROP_REFACTOR_GUIDE.md` (NEW): Safe extraction plan for `SlateDropClient.tsx` (451 lines) and `ProjectFileExplorer.tsx` (363 lines). Includes BUG-019 fix plan, BUG-001 `file_folders` migration plan, widget styling unification, Phases 1–5, UI fix queue UI-SD-001–UI-SD-006, safe-build checklist.
- `SLATE360_PROJECT_MEMORY.md` Task-Based Read Map: added refactor guides row.
- All pushed to `origin/main` in commit `f7cbf77`.

#### What's Broken / Partially Done
- Nothing newly broken. All files above are planning docs only — no code changed.
- BUG-018 (`LocationMap.tsx` DrawingManager): **May 2026 hard deadline**, no implementation started. Roadmap is in DASHBOARD_REFACTOR_GUIDE.md Phase 7.
- BUG-019 (SlateDrop widget extra click): plan in SLATEDROP_REFACTOR_GUIDE.md Phase 2, not yet implemented.
- BUG-001 (`file_folders` → `project_folders`): plan in SLATEDROP_REFACTOR_GUIDE.md Phase 1, not yet implemented.
- `useDashboardState.ts` still at 775 lines — over limit. Phase 5B plan in DASHBOARD_REFACTOR_GUIDE.md.
- Design Studio + Content Studio BUILD_GUIDEs created last session but not yet implemented. Research Intake Template sections waiting for user to fill in.

#### Context Files Updated
- `slate360-context/refactor/DASHBOARD_REFACTOR_GUIDE.md`: created
- `slate360-context/refactor/PROJECT_HUB_REFACTOR_GUIDE.md`: created
- `slate360-context/refactor/SLATEDROP_REFACTOR_GUIDE.md`: created
- `SLATE360_PROJECT_MEMORY.md`: task map + this handoff

#### Next Steps (Ordered)
1. **BUG-018 priority** — DrawingManager migration in `LocationMap.tsx`. May 2026 deadline. Read DASHBOARD_REFACTOR_GUIDE.md Phase 7 before starting.
2. **Phase 5B** — Split `useDashboardState.ts` (775 lines) into domain-scoped sub-hooks. Read DASHBOARD_REFACTOR_GUIDE.md Phase 5B section.
3. **BUG-001** — Complete `file_folders` → `project_folders` migration. Read SLATEDROP_REFACTOR_GUIDE.md Phase 1.
4. **BUG-019** — Fix SlateDrop widget extra click. Read SLATEDROP_REFACTOR_GUIDE.md Phase 2.
5. **Market Robot V2** — Wire orchestrator to real hooks. Read `MARKET_ROBOT_STATUS_HANDOFF.md`.
6. **Design Studio / Content Studio / Tour Builder** — implementations not started. Read respective `START_HERE.md` + `BUILD_GUIDE.md` before starting.

#### What Changed
- `lib/hooks/useDashboardState.ts` (NEW, 775 lines): extracted ALL ~48 useState declarations, useEffect side-effects, useCallback handlers, useMemo computations from DashboardClient
- `components/dashboard/DashboardClient.tsx`: 1,089 → 277 lines (under 300 limit). Now a thin render shell that calls `useDashboardState()` and passes data to child components
- `slate360-context/dashboard-tabs/tour-builder/BUILD_GUIDE.md` (NEW): Tour Builder planning guide with GitNexus protocol, cross-tab safety rules, 8-prompt sequence.
- `slate360-context/dashboard-tabs/design-studio/BUILD_GUIDE.md` (NEW): Design Studio planning guide.
- `slate360-context/dashboard-tabs/content-studio/BUILD_GUIDE.md` (NEW): Content Studio planning guide.

*[Full prior session history archived — current handoff is the one above.]*