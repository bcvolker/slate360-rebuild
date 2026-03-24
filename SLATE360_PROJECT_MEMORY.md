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

### Session Handoff — 2026-03-24 (Design/UI Overhaul Planning + Remote Fix)

#### Session Summary
Assessed Gemini 3.1's damage (truncated globals.css pushed as broken commit `8a3ab35` to remote), evaluated its 8-prompt design plan, built a comprehensive 8-phase safe execution plan for the full UI overhaul, and created `DESIGN_UI_OVERHAUL_PLAN.md` as the implementation guide. Local build is healthy at `1c09352`. Remote was force-pushed to match.

#### What Changed This Session
- Created `DESIGN_UI_OVERHAUL_PLAN.md` — full 8-phase execution plan with rollback paths, design tokens, decomposition steps, and platform recommendations
- Updated `SLATE360_PROJECT_MEMORY.md` — this handoff
- Force-pushed `main` to fix broken remote (commit `8a3ab35` → `1c09352`)

#### CRITICAL: Start Next Session Here
1. Read `DESIGN_UI_OVERHAUL_PLAN.md` — the complete execution plan
2. Verify remote is healthy: `git log --oneline origin/main -3`
3. Start at Phase 1 (CSS tokens) unless Phase 0 force-push failed

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