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

### Session Handoff — 2026-03-12

#### What Changed
- Completed Market Robot Rescue Batch 4.5 — operator console visual replacement pass (local only).
- Converted 14 Market presentation components from white/light card styling to dark operator console vocabulary.
- Files changed:
	- MarketAutomationTab.tsx — action feedback, plans header, explanation box, ActivePlanSummary
	- MarketResultsTab.tsx — header gradient, StatCard, trade history, filters, PnL panels
	- MarketStartHereTab.tsx — inactive card, stats, templates, nav shortcuts, explainer
	- MarketSystemStatusCard.tsx — outer container, stat cards, blocker tones
	- MarketResultsVerificationConsole.tsx — post-action context box
	- MarketResultsInsights.tsx — all 3 insight cards
	- MarketOpenPositionsPanel.tsx — container, PnL colors, trade buttons, badges
	- MarketActivityFeed.tsx — all panels and log entries
	- MarketAutomationBuilder.tsx — container, presets, settings panel, inputs, BasicControls
	- MarketPlanList.tsx — header, empty state, PlanCard, badges, action buttons
	- MarketListingDetailDrawer.tsx — main panel, category/mode badges, pricing card, wallet card, outcome panels, preview cards
	- MarketAutomationDetailControls.tsx — labels, borders, toggle
	- MarketPlanInsights.tsx — health tones, stat cards, warnings
	- MarketNumericInput.tsx — input styling
- No API routes, hooks, utilities, or backend contracts changed. CSS-only.
- Editor diagnostics: zero errors across all 14 files.

#### What's Broken / Partially Done
- Terminal command execution remains blocked by `ENOPRO`; `npm run typecheck` and git push could not be performed.
- Batches 1–4.5 local changes have never been pushed due to persistent terminal blocker.

#### Context Files Updated
- `docs/market-robot/MARKET_ROBOT_BUILD_FILE.md`: added Batch 4.5 outcome with file list and validation
- `docs/market-robot/MARKET_ROBOT_PROMPT_BACKLOG.md`: added Batch 4.5 section with status
- `docs/market-robot/MARKET_ROBOT_CHAT_RESUME_PROTOCOL.md`: updated current batch and latest rescue state
- `slate360-context/dashboard-tabs/market-robot/ONGOING_BUILD_TRACKER.md`: updated active batch and added Batch 4.5 summary
- `SLATE360_PROJECT_MEMORY.md`: Latest Session Handoff overwritten for Batch 4.5

#### Next Steps (ordered)
1. Restore terminal provider and commit/push all local changes (Batches 1–4.5)
2. Visually verify Market Robot in browser — every surface should be dark/cohesive
3. Start Batch 5 only if needed for a narrowly-scoped backend truth patch (no contract redesign)