"# Slate360 — Project Memory

Last Updated: 2026-04-08
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
- OLD tiers (`trial < creator < model < business < enterprise`) are OBSOLETE
- NEW app-centric tiers: `trial < standard < business < enterprise` (per-app, not platform-wide)
- Users subscribe per-app with optional bundle discounts
- Enterprise gets ALL apps + admin + white-label
- `lib/entitlements.ts` still has old 5-tier model — needs update to new 4-tier per-app model
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
| Platform architecture / pipeline | `slate360-context/PLATFORM_ARCHITECTURE_PLAN.md` |
| Site Walk build plan | `slate360-context/SITE_WALK_BUILD_PLAN.md` |

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

### Session Handoff — 2026-04-10 (My Account + Dark Theme + Codebase Review)

### What Changed

**Commit `e7748f4` — My Account (5 tabs), dark theme, dashboard toolbar, real storage data**

**1. My Account Page (BUILT)**
- `components/dashboard/MyAccountShell.tsx` (134 lines): tabbed UI with 5 tabs, URL param support (?tab=billing), data from `/api/account/overview`
- `components/dashboard/my-account/AccountProfileTab.tsx` (115 lines): name edit, avatar, email, org, role, theme pref
- `components/dashboard/my-account/AccountBillingTab.tsx` (196 lines): plan status, payment methods (Stripe portal), credit packs (Starter/Growth/Pro → Stripe checkout), invoices, admin-only
- `components/dashboard/my-account/AccountDataTrackerTab.tsx` (157 lines): credits + storage bars, color-coded warnings, asset counts, buy-more CTA
- `components/dashboard/my-account/AccountSecurityTab.tsx` (121 lines): password reset, 2FA placeholder, sessions, data export/deletion
- `components/dashboard/my-account/AccountNotificationsTab.tsx` (71 lines): email + push notification toggles
- `app/(dashboard)/my-account/page.tsx`: passes orgName, role, isAdmin, entitlements

**2. Dashboard Toolbar Fix (walled-garden-dashboard.tsx)**
- Removed `/api/placeholder/36/36` avatar, "JD" fallback → real user initial from `userName` prop
- Dropdown: "My Account" → `/my-account`, "Billing" → `/my-account?tab=billing`, "Sign Out" → `supabase.auth.signOut()`
- Welcome message uses `userName.split(" ")[0]` with fallback to `orgName`

**3. Dark Theme Default**
- `components/providers/ThemeProvider.tsx`: changed default from 'system' to 'dark' in 6 places
- 15+ files fixed from white/light backgrounds to `bg-zinc-950`: not-found, deploy-check, loading, integrations, analytics, athlete360, project error, SlateDropClient, ProjectToolLayout, privacy, terms, share pages

**4. Real Storage Data**
- `app/api/account/overview/route.ts`: replaced hardcoded storage values with real `org_storage_used_bytes` from organizations table

**5. Enterprise Privacy Controls**
- Billing tab hidden from non-admin enterprise members
- Non-admins see "managed by administrator" notice

**6. Docs + Ops Updates (this session)**
- `ops/module-manifest.json`: added my-account + site-walk modules, updated date
- `slate360-context/SITE_WALK_BUILD_PLAN.md`: rewritten from 240 → 500+ lines with comprehensive design spec for external AI assistant (features, flows, API routes, schema, UX requirements, competitive landscape, design questions)

### Codebase Health Report
- TypeScript: **0 errors** (`npx tsc --noEmit` clean)
- Oversized files: **17 files** over 300-line limit (known tech debt, see file-size report)
- Biggest offenders: `LocationMap.tsx` (1892), `walled-garden-dashboard.tsx` (1472), `marketing-homepage.tsx` (1123)

### Placeholder Data Audit (CRITICAL — Must Remove Before Beta)
| Category | Location | What |
|---|---|---|
| CRITICAL | `walled-garden-dashboard.tsx` L231-254 | DELIVERABLES array with `/api/placeholder/320/180` URLs |
| CRITICAL | `walled-garden-dashboard.tsx` L259-280 | SLATEDROP_FILES/FOLDERS mock data |
| CRITICAL | `walled-garden-dashboard.tsx` L191-228 | APPS array with fake storage ("4.1 GB", "9.2 GB") |
| CRITICAL | `marketing-homepage.tsx` L223-243 | Testimonials with fake names (Sarah Chen, Marcus Johnson) |
| CRITICAL | `home/landing-data.ts` L121-147 | Duplicate testimonials with different fake names |
| CRITICAL | `CeoCommandCenterClient.tsx` L38-43 | MOCK_METRICS (MRR, churn, margin — hardcoded) |
| CRITICAL | `lib/dashboard/demo-data.ts` L18-87 | DEMO_PROJECTS, DEMO_EVENTS, DEMO_JOBS, DEMO_WEATHER |
| HIGH | `walled-garden-dashboard.tsx` L282 | ENTERPRISE_USERS empty array placeholder |
| HIGH | `walled-garden-dashboard.tsx` | Notification bell hardcoded "3" count |
| MEDIUM | 6 shell components | `status="coming-soon"` or `status="under-development"` |
| MEDIUM | PunchListForm, ObservationForm | "Photo upload coming soon" text |
| MEDIUM | MarketClient, MarketRobotWorkspace | "Placeholder for {tab} (under construction)" |

### What's Broken / Partially Done
- `lib/entitlements.ts` still uses old 5-tier model (creator/model) — needs rewrite to 4-tier (trial/standard/business/enterprise)
- `walled-garden-dashboard.tsx` is 1472 lines — CRITICAL monolith, needs extraction BEFORE adding features
- Dashboard is App Launcher, not Command Center — needs redesign with project overview, activity feed, quick actions, real-time notifications
- `SlateLogo` component created but NOT wired into consuming pages
- `marketing-homepage.tsx` is 1123 lines — needs extraction
- `market_scheduler_lock` table still has no RLS (pre-existing)
- Portal view_count race condition (atomic SQL not deployed, pre-existing)
- `fix/slatedrop-external-uploads` branch still needs merge (security patch, pre-existing)
- Supabase email templates still use purple gradients (pre-existing)

### Context Files Updated
- `SLATE360_PROJECT_MEMORY.md`: this handoff
- `slate360-context/SITE_WALK_BUILD_PLAN.md`: comprehensive rewrite with full design spec
- `ops/module-manifest.json`: added my-account + site-walk modules

### Next Steps (ordered by priority)
1. **Remove walled-garden-dashboard mock data** — replace DELIVERABLES, SLATEDROP, APPS arrays with real data or empty states
2. **Extract walled-garden-dashboard.tsx** — split 1472-line monolith into sub-components before adding features
3. **Redesign dashboard as Command Center** — project overview, activity feed, pending items, team activity, quick actions, smart notifications
4. **Update `lib/entitlements.ts`** — rewrite from 5-tier to 4-tier per-app model
5. **Wire `<SlateLogo />` into all pages** still using direct `<img>` logo tags
6. **Extract `marketing-homepage.tsx`** into sub-300-line components
7. **Begin Site Walk Phase 1** — create `site_walk_items` + `site_walk_deliverables` migrations, session CRUD APIs
8. **Merge `fix/slatedrop-external-uploads`** → main (security patch)
9. **Add RLS to `market_scheduler_lock`**
10. **Deploy atomic `claim_deliverable_view()` RPC**