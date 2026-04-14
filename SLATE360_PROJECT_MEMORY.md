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

### Session Handoff — 2026-04-14 (Site Walk → SlateDrop Bridge + Phase 2 Route Blocking)

### What Changed

**Blocked: Phase 2 project sub-routes**
- `middleware.ts`: Added `PHASE_1_HIDDEN_PROJECT_SEGMENTS` array blocking 8 sub-routes: budget, schedule, daily-logs, observations, drawings, rfis, submittals, management. Regex matches `/project-hub/[id]/[segment]` and redirects to project overview.

**Renamed: "Files" tab → "SlateDrop"**
- `app/(dashboard)/project-hub/[projectId]/layout.tsx`: Tab label changed from "Files" to "SlateDrop".

**Created: Site Walk → SlateDrop bridge**
- `lib/site-walk/slatedrop-bridge.ts` (100 lines): New utility that bridges Site Walk photo captures to SlateDrop by:
  1. Resolving the project's "Photos" folder in `project_folders`
  2. Creating a `slatedrop_uploads` record (status: active, linked to folder)
  3. Linking `site_walk_items.file_id` → `slatedrop_uploads.id`
  4. Tracking storage usage via `trackStorageUsed()`
- `app/api/site-walk/items/route.ts` (116 lines): POST handler now:
  - Fetches `project_id` from session (was only fetching `id`)
  - After item creation, calls `bridgePhotoToSlateDrop()` for photo/video items
  - Non-blocking — bridge failures are logged but don't prevent item creation
  - Passes `file_size` from metadata for accurate storage tracking

**Fixed: Pre-existing field name bug (photo_s3_key → s3_key)**
- `components/site-walk/CaptureCamera.tsx`: Changed `photo_s3_key: s3Key` → `s3_key: s3Key` (was sending wrong field name — S3 key was NEVER being stored in DB). Added `file_size: result.blob.size` to metadata.
- `lib/server/quota-check.ts`: Changed `.not("photo_s3_key", "is", null)` → `.not("s3_key", "is", null)` (was querying non-existent column).

**Market/Athlete360 DB debris identified (NOT cleaned — report only)**
Found 11 orphaned tables in Supabase: `market_directives`, `market_trades`, `market_bot_runtime`, `market_bot_runtime_state`, `market_watchlist`, `market_tab_prefs`, `market_activity_log`, `market_scheduler_lock`, `market_plans`, `market_bot_settings__legacy_backup`, `market_bot_state__legacy_backup`. Plus 1 trigger function (`set_market_plans_updated_at`), ~8 indices, ~30 RLS policies. All user-isolated via `auth.users(id)` FK — no cross-table dependencies. Also `slate360_staff.access_scope` defaults to `'{market}'` but code no longer reads it. 0 Athlete360 tables exist. All safe to drop in a dedicated cleanup session.

### What's Broken / Partially Done
1. Site Walk → SlateDrop bridge requires project folders to be provisioned (via `/api/slatedrop/provision`). If a project's "Photos" folder doesn't exist, bridge silently skips + logs warning.
2. Deliverable PDFs (from `/api/site-walk/deliverables/[id]/export`) are NOT yet bridged to SlateDrop "Reports" folder. Only photo/video captures are bridged.
3. Text notes, voice notes, annotations don't have S3 files → no SlateDrop bridging (correct behavior).
4. Market/Athlete360 DB tables are orphaned debris — harmless but should be cleaned.
5. `lib/wagmi-config.ts` + `components/Web3Providers.tsx` are dead code.
6. Site Walk → SlateDrop bridge missing: offline capture queue not wired, layout unification pending.

### Context Files Updated
- `SLATE360_PROJECT_MEMORY.md`: This handoff

### Context Files to Update (next session)
- `docs/site-walk/SITE_WALK_BUILD_FILE.md`: Mark "SlateDrop integration" as partially done
- `slate360-context/SLATEDROP.md`: Add bridge documentation
- `slate360-context/DASHBOARD.md`: Market tab references are stale (from prior session)
- `ops/bug-registry.json`: Log the photo_s3_key field name bug as fixed

### Next Steps (ordered)
1. Verify end-to-end: create project → provision folders → Site Walk capture → confirm photo in SlateDrop
2. Bridge deliverable PDF exports to SlateDrop "Reports" folder
3. Clean Market/Athlete360 DB debris (dedicated session with migration)
4. Wire offline capture queue to Site Walk components
5. Unify Site Walk layout with Slate360 shell
6. Update stale context docs

### Session Handoff — 2026-04-14 (Phase 1 Surface Integrity — Market/Athlete Deletion + Projects Nav + Tab Trim)

### What Changed

**Deleted: Market Robot and Athlete360 — full removal (~100+ files)**

All market/athlete360 routes, components, hooks, lib, and API routes deleted:
- `app/market/` (2 files), `app/athlete360/page.tsx`, `app/api/market/` (20 API routes)
- `components/dashboard/market/` (37 components), `components/dashboard/MarketClient.tsx`
- `lib/hooks/useMarket*.ts` (12 hooks), `lib/market/` (27 lib files), `lib/market-bot.ts`

**Cleaned: All references to market/athlete access flags**

- `lib/server/org-context.ts`: Removed `InternalTabId` type, `canAccessMarket`/`canAccessAthlete360` fields, `internalAccessScopes`, `StaffAccessRow` type. `resolveInternalAccess()` now returns only `{ canAccessOperationsConsole, hasInternalAccess }`.
- `lib/hooks/useDashboardState.ts`: Removed `canAccessMarket`/`canAccessAthlete360` from `DashboardProps`.
- `components/dashboard/DashboardClient.tsx`: Removed `MarketClient` import, market tab rendering, simplified `useVisibleTabs()`.
- 6 server pages (project-hub, integrations, tours, operations-console, analytics, my-account): Simplified `internalAccess` props to `{ operationsConsole: canAccessOperationsConsole }`.
- `project-hub/[projectId]/layout.tsx`: Same simplification.
- 12 component type definitions: `internalAccess` type changed from `{ operationsConsole?; market?; athlete360? }` to `{ operationsConsole?: boolean }`.
- `middleware.ts`: Removed `/market` and `/athlete360` from `PHASE_1_BLOCKED_PATHS` (routes deleted, blocking unnecessary).
- `vercel.json`: Removed market scheduler cron entirely.
- `lib/server/api-auth.ts`: Removed `withMarketAuth()` function.

**Added: Projects as first-class nav destination**

- `components/shared/QuickNav.tsx`: Added Projects (`/project-hub`, FolderKanban icon), removed Market/Athlete items.
- `components/shared/MobileNavSheet.tsx`: Same.
- `components/shared/MobileModuleBar.tsx`: Same.
- `components/dashboard/command-center/DashboardSidebar.tsx`: Added Projects nav item below Apps.

**Trimmed: Project detail tabs to Phase 1 only**

- `app/(dashboard)/project-hub/[projectId]/layout.tsx`: TABS reduced from 12 to 4: Overview, Files, Photos, Punch List. Hidden tabs (RFIs, Submittals, Daily Logs, Observations, Drawings, Budget, Schedule, Management) page files still build — just not linked in tab nav.

**Verified: Hardening intact**

- Beta gate: `(dashboard)/layout.tsx` checks `isBetaApproved`, redirects to `/beta-pending`.
- Operations Console: requires `canAccessOperationsConsole`, 404 otherwise.
- Middleware: 7 blocked paths remain (tours, design-studio, content-studio, geospatial, virtual-studio, analytics, tour-builder).
- Build + typecheck: clean (zero errors after `.next/types` cache clear).

**Dead code identified (not deleted — harmless):**
- `lib/wagmi-config.ts` and `components/Web3Providers.tsx` — were only imported by deleted MarketProviders.
- `scripts/ops/` may reference deleted market files — ops scripts, not build-affecting.

### What's Broken / Partially Done
1. Site Walk → SlateDrop bridge missing
2. Item statuses don't match spec
3. No collaborator system
4. Dead code: `wagmi-config.ts` + `Web3Providers.tsx` (can clean later)

### Context Files to Update
- `slate360-context/DASHBOARD.md`: Market tab references are stale
- `slate360-context/dashboard-tabs/market-robot/START_HERE.md`: Entire market-robot context tree is now archive-only
- `slate360-context/BACKEND.md`: Market cron/API entries are stale
- `ops/module-manifest.json`: Market module entry should be marked removed

### Next Steps (ordered)
1. Update context docs listed above to reflect market/athlete deletion
2. Clean dead code (`wagmi-config.ts`, `Web3Providers.tsx`) if desired
3. Build Site Walk → SlateDrop bridge
4. Implement item status system per spec
5. Begin collaborator system

### Session Handoff — 2026-04-14 (Projects Route Fix + Legacy Route Containment)

### What Changed

**Fixed: `/project-hub` route was completely broken (404)**

All project-hub route files used the `_page.tsx` / `_layout.tsx` naming convention (underscore prefix), which Next.js App Router does not recognize as route convention files. This meant `/project-hub` and all sub-routes returned 404. Renamed 13 `_page.tsx` → `page.tsx` and 1 `_layout.tsx` → `layout.tsx`:

- `app/(dashboard)/project-hub/page.tsx` (was `_page.tsx`)
- `app/(dashboard)/project-hub/[projectId]/page.tsx` (was `_page.tsx`)
- `app/(dashboard)/project-hub/[projectId]/layout.tsx` (was `_layout.tsx`)
- `app/(dashboard)/project-hub/[projectId]/rfis/page.tsx`
- `app/(dashboard)/project-hub/[projectId]/submittals/page.tsx`
- `app/(dashboard)/project-hub/[projectId]/budget/page.tsx`
- `app/(dashboard)/project-hub/[projectId]/schedule/page.tsx`
- `app/(dashboard)/project-hub/[projectId]/punch-list/page.tsx`
- `app/(dashboard)/project-hub/[projectId]/daily-logs/page.tsx`
- `app/(dashboard)/project-hub/[projectId]/observations/page.tsx`
- `app/(dashboard)/project-hub/[projectId]/drawings/page.tsx`
- `app/(dashboard)/project-hub/[projectId]/photos/page.tsx`
- `app/(dashboard)/project-hub/[projectId]/slatedrop/page.tsx`
- `app/(dashboard)/project-hub/[projectId]/management/page.tsx`

Build now shows `/project-hub` + all 11 sub-routes in route list (previously absent).

**Contained: `/market` and `/athlete360` blocked for Phase 1 beta**

- `middleware.ts` (167→169 lines): Added `/market` and `/athlete360` to `PHASE_1_BLOCKED_PATHS` array. These routes now redirect to `/dashboard` on direct URL access.
- `components/shared/QuickNav.tsx`: Added `phase1Hidden: true` to Market Robot and Athlete360 nav items.
- `components/shared/MobileNavSheet.tsx`: Same.
- `components/shared/MobileModuleBar.tsx`: Same.
- Route files (`app/market/`, `app/athlete360/`) are **preserved** — not deleted. Page-level auth guards remain intact as defense-in-depth. Routes can be un-blocked by removing from `PHASE_1_BLOCKED_PATHS` and removing `phase1Hidden`.
- **CEO-only inline dashboard tabs** for Market Robot still render inside `DashboardClient.tsx` (they're inline components, not route links). These are only visible when `canAccessMarket` is true (CEO only).

### What's Broken / Partially Done
1. **Migration still needed** — `20260414000001_add_beta_approved_to_profiles.sql` must run on Supabase
2. **`CEO_EMAIL` env var required** — if missing, owner access is disabled + warning logged
3. **Project Hub not in main nav** — accessible via MobileQuickAccess, DashboardProjectCard, and QuickActionsCard links, but NOT in QuickNav/MobileNavSheet primary nav items
4. Site Walk → SlateDrop bridge missing
5. Item statuses don't match spec
6. No collaborator system
7. Offline infrastructure not wired to Site Walk
8. Operations Console content is mock data
9. Redundant env vars (`PRIMARY_CEO_EMAIL`, `PLATFORM_ADMIN_EMAILS`, `SLATE360_PLATFORM_ADMINS`) unused

### Context Files Updated
- `SLATE360_PROJECT_MEMORY.md`: this handoff

### Next Steps (ordered)
1. **Run migration** `20260414000001_add_beta_approved_to_profiles.sql` on Supabase
2. **Verify `CEO_EMAIL` is set** in Vercel production environment variables
3. **Set `is_beta_approved = true`** for CEO + known beta testers
4. Site Walk → SlateDrop bridge implementation
5. Owner decides on status reconciliation (spec statuses vs current code statuses)
6. Consider adding Project Hub to main nav (QuickNav/MobileNavSheet) if desired

### Session Handoff — 2026-04-14 (Route Cleanup + Legacy Name Elimination)

### What Changed

**Route rename: `/ceo` → `/operations-console` + legacy `canAccessCeo` naming purged**

- **`app/(dashboard)/operations-console/page.tsx`** (NEW location, 35 lines): Moved from `app/(dashboard)/ceo/`. Page renamed to `OperationsConsolePage`. Metadata title updated. Destructures `canAccessOperationsConsole` (was `canAccessCeo`). Still renders `CeoCommandCenterClient` (legacy component name, contained — no external reference).
- **`middleware.ts`** (160→167 lines): Added `/ceo` → `/operations-console` redirect for bookmarks/history safety. Redirect runs before all other checks.
- **`lib/server/org-context.ts`** (224 lines): `canAccessCeo` → `canAccessOperationsConsole` in `ServerOrgContext` type, `resolveInternalAccess()` return, and all spread sites. `hasOperationsConsoleAccess` alias now references `canAccessOperationsConsole`.
- **Nav components** (4 files): Updated `internalKey: "ceo"` → `"operationsConsole"`, `href: "/ceo"` → `"/operations-console"`, `internalAccess` type `{ ceo?: boolean }` → `{ operationsConsole?: boolean }`.
  - `components/shared/QuickNav.tsx`
  - `components/shared/MobileNavSheet.tsx`
  - `components/shared/MobileModuleBar.tsx`
  - `components/dashboard/command-center/DashboardSidebar.tsx`
- **Server pages** (7 files): All destructuring changed `canAccessCeo` → `canAccessOperationsConsole`, all `internalAccess` objects changed `{ ceo: ... }` → `{ operationsConsole: ... }`:
  - `app/market/page.tsx`, `app/(dashboard)/integrations/page.tsx`, `app/(dashboard)/tours/page.tsx`, `app/(dashboard)/project-hub/_page.tsx`, `app/(dashboard)/project-hub/[projectId]/_layout.tsx`, `app/(dashboard)/my-account/page.tsx`, `app/(dashboard)/analytics/page.tsx`
- **Client components** (11 files): Updated `internalAccess` type + prop names:
  - `lib/hooks/useDashboardState.ts`, `components/dashboard/DashboardClient.tsx`, `components/dashboard/TabRedirectCard.tsx`, `components/dashboard/DashboardOverview.tsx`
  - Shell components: `CeoCommandCenterClient.tsx`, `VirtualStudioShell.tsx`, `ContentStudioShell.tsx`, `GeospatialShell.tsx`, `DesignStudioShell.tsx`, `ToursShell.tsx`, `MarketRouteShell.tsx`, `MyAccountShell.tsx`, `AnalyticsReportsClient.tsx`
  - ClientPage types: `integrations/ClientPage.tsx`, `project-hub/ClientPage.tsx`
- **Shared types** (2 files): `DashboardTabShell.tsx`, `DashboardHeader.tsx` — `internalAccess` type updated.
- **`lib/entitlements.ts`**: Comment updated from `canAccessCeo` to `canAccessOperationsConsole`.

**Route verification results:**
- **`/market`**: EXISTS. `app/market/page.tsx` + `app/market/MarketProviders.tsx`. Internal-staff-only route gated by `canAccessMarket` from `resolveServerOrgContext()`. Shows in QuickNav/MobileNavSheet/MobileModuleBar when `internalAccess.market` is true. NOT beta-gated (intentional — internal route, not consumer feature). NOT in middleware auth checks — relies on page-level auth only.
- **`/athlete360`**: EXISTS. `app/athlete360/page.tsx` only. Internal-staff-only route gated by `canAccessAthlete360`. Minimal placeholder page. Same nav/auth pattern as `/market`.
- Both are NOT Phase 1 blocked and NOT exposed to regular beta users (internal access scopes required).

**Contained legacy naming:**
- `CeoCommandCenterClient.tsx` (component filename + name) — still uses "Ceo" naming internally. This is contained: only imported by `operations-console/page.tsx`. No external consumer code references "Ceo" anymore. Renaming the client component is deferred until the Operations Console UI work.
- `isSlateCeo` field in `ServerOrgContext` — this is a role identity flag ("is this user the CEO?"), not a route name. Kept as-is.
- `isCEOOnly` property on DashTab type in `DashboardClient.tsx` — visual indicator, not a route. Contained.

### What's Broken / Partially Done
1. **Migration still needed** — `20260414000001_add_beta_approved_to_profiles.sql` must run on Supabase
2. **`CEO_EMAIL` env var required** — if missing, owner access is disabled + warning logged
3. Site Walk → SlateDrop bridge missing
4. Item statuses don't match spec
5. No collaborator system
6. Offline infrastructure not wired to Site Walk
7. Operations Console content is mock data
8. `project-hub/_page.tsx` is underscore-prefixed — not routable
9. Redundant env vars (`PRIMARY_CEO_EMAIL`, `PLATFORM_ADMIN_EMAILS`, `SLATE360_PLATFORM_ADMINS`) unused

### Context Files Updated
- `SLATE360_PROJECT_MEMORY.md`: this handoff
- Context docs (GUARDRAILS.md, BACKEND.md, MODULE_REGISTRY.md, etc.) still reference `/ceo` and `canAccessCeo` — these are reference-only docs, not code. Update on next doc pass.

### Next Steps (ordered)
1. **Run migration** `20260414000001_add_beta_approved_to_profiles.sql` on Supabase
2. **Verify `CEO_EMAIL` is set** in Vercel production environment variables
3. **Set `is_beta_approved = true`** for the CEO account and any known beta testers
4. Site Walk → SlateDrop bridge implementation
5. Owner decides on status reconciliation (spec statuses vs current code statuses)
6. Update context docs to reflect `/operations-console` naming (low priority, reference-only)

### Session Handoff — 2026-04-14 (Beta Gate Hardening Pass 2)

- **`lib/server/beta-access.ts`** (75→82 lines): `isOwnerEmail()` no longer has hardcoded fallback — returns `false` + logs warning when `CEO_EMAIL` env var is missing. `checkBetaApproved()` now wrapped in React `cache()` — deduplicates the profiles query when both a layout and a page call it in the same request.
- **`lib/server/org-context.ts`** (218→224 lines): Added `import { cache } from "react"`. `resolveServerOrgContext` now wrapped in `cache()` — when `(dashboard)/layout.tsx` calls it and then a nested page calls it again, the second call is a zero-cost cache hit.
- **`app/(dashboard)/layout.tsx`** (26→29 lines): Refactored to use cached `resolveServerOrgContext()` instead of separate `createClient() → getUser()` + `requireBetaAccess()`. Checks `isBetaApproved` directly from context. Eliminates 2 duplicate DB calls per dashboard request (auth + profiles).
- **`app/slatedrop/page.tsx`** (27→26 lines): Removed separate `requireBetaAccess()` import/call. Now checks `isBetaApproved` from cached `resolveServerOrgContext()`.
- **`app/(dashboard)/ceo/page.tsx`** (33→35 lines): Added explicit comment documenting the two-layer protection chain (layout beta gate → page owner-only gate).
- **`app/beta-pending/page.tsx`** (43→61 lines): Now a server component that checks auth + approval status on render. If user is now approved, redirects to `/dashboard` automatically. New `BetaPendingRecheck` client component provides a "Check my status" button (calls `router.refresh()` to re-run server check).
- **`components/shared/BetaPendingRecheck.tsx`** (NEW, 33 lines): Client component with `useTransition`-wrapped `router.refresh()`. Shows spinner during check, updates label after first check.

**Architecture decisions:**
- React `cache()` on `resolveServerOrgContext` eliminates N+1 DB queries — layout + page share the same resolved context per request
- React `cache()` on `checkBetaApproved` deduplicates the profiles query even when called from different code paths (e.g., `requireBetaAccess` in `(apps)/layout.tsx`)
- `isOwnerEmail()` fails safely (returns `false`) when `CEO_EMAIL` is unset — no silent privilege escalation from hardcoded fallback
- Beta-pending recheck uses `router.refresh()` which re-renders the server component, checking approval server-side — no client-side API needed
- `(apps)/layout.tsx` still uses `requireBetaAccess()` since it doesn't call `resolveServerOrgContext()` — the cached `checkBetaApproved` inside handles dedup
- Operations Console (`/ceo`) is protected by two layers: layout-level beta gate + page-level `canAccessCeo` (owner-only) check

**Duplicate query analysis (before → after):**
- `/dashboard` request: 4 DB calls (layout getUser + layout checkBeta + page getUser + page checkBeta + org queries) → 2 DB calls (cached context resolves once, layout + page share it)
- `/ceo` request: same improvement
- `/slatedrop`: 3 DB calls → 2 (one context resolution, no separate beta check)
- `(apps)/*`: `checkBetaApproved` cached, so layout + any page that calls it share the result

### What's Broken / Partially Done
1. **Migration still needed** — `20260414000001_add_beta_approved_to_profiles.sql` must run on Supabase
2. Site Walk → SlateDrop bridge missing
3. Item statuses don't match spec
4. No collaborator system
5. Offline infrastructure not wired to Site Walk
6. Operations Console is mock data (route exists, content is placeholders)
7. `project-hub/_page.tsx` is underscore-prefixed — not routable (pre-existing issue)
8. **`CEO_EMAIL` env var is now required** — if missing, owner access is disabled and a warning is logged. Verify it's set in Vercel production env.
9. Redundant env vars (`PRIMARY_CEO_EMAIL`, `PLATFORM_ADMIN_EMAILS`, `SLATE360_PLATFORM_ADMINS`) still in `.env` — unused

### Context Files Updated
- `SLATE360_PROJECT_MEMORY.md`: this handoff

### Next Steps (ordered)
1. **Run migration** `20260414000001_add_beta_approved_to_profiles.sql` on Supabase
2. **Verify `CEO_EMAIL` is set** in Vercel production environment variables
3. **Set `is_beta_approved = true`** for the CEO account and any known beta testers
4. Site Walk → SlateDrop bridge implementation
5. Owner decides on status reconciliation (spec statuses vs current code statuses)
6. Offline wiring: connect existing queue/banner/sync to Site Walk capture
7. Operations Console minimum viable shell
8. Clean up redundant CEO email env vars from `.env`

### Session Handoff — 2026-04-14 (Beta Gate Hardening)

### What Changed

**Beta gate hardened — fail-closed enforcement, no more middleware DB query**

- **`lib/server/beta-access.ts`** (NEW, 75 lines): Centralized helper with `isOwnerEmail(email)` (uses `process.env.CEO_EMAIL`, fallback to hardcoded), `checkBetaApproved(userId)` (fail-closed DB query), `requireBetaAccess(user)` (redirects to `/beta-pending` on failure).
- **`app/beta-pending/page.tsx`**: Moved from `app/(dashboard)/dashboard/beta-pending/` to top-level `app/beta-pending/` to avoid redirect loops when `(dashboard)/layout.tsx` enforces beta access.
- **`middleware.ts`** (175→160 lines): Removed the entire beta gate DB query block (was fail-open). Added Phase 1 blocked-paths check (pathname-only, no DB) that redirects `/tours`, `/design-studio`, `/content-studio`, `/geospatial`, `/virtual-studio`, `/analytics`, `/tour-builder` → `/dashboard`.
- **`app/(dashboard)/layout.tsx`** (22→26 lines): Converted to async server component. Added `requireBetaAccess()` call — protects ALL `(dashboard)` routes including dashboard, ceo, tours, analytics, settings, etc.
- **`app/(apps)/layout.tsx`** (38→40 lines): Added `requireBetaAccess()` call after existing auth check — protects all `(apps)` routes.
- **`app/slatedrop/page.tsx`**: Added `requireBetaAccess()` call after auth check.
- **`lib/server/org-context.ts`** (200→218 lines): Replaced hardcoded `"slate360ceo@gmail.com"` with `isOwnerEmail()` from beta-access helper. Added `isBetaApproved` field (resolved via `checkBetaApproved()`). Added `hasOperationsConsoleAccess` convenience alias (= `canAccessCeo`).
- **`app/(dashboard)/dashboard/page.tsx`**: Now destructures `hasOperationsConsoleAccess` directly from context instead of aliasing `canAccessCeo`.

**Architecture decisions:**
- Beta DB query moved from middleware to server layouts/pages — middleware stays lightweight (pathname checks only)
- Three enforcement points: `(dashboard)/layout.tsx`, `(apps)/layout.tsx`, `app/slatedrop/page.tsx` — covers all protected route groups
- Owner email resolved from `CEO_EMAIL` env var (already set in `.env`), with fallback to hardcoded address for backward compat
- Phase 1 blocked paths in middleware are a simple pathname array — easy to remove when modules ship

### What's Broken / Partially Done
1. **Migration still needed** — `20260414000001_add_beta_approved_to_profiles.sql` must run on Supabase before beta gate actually blocks users
2. Site Walk → SlateDrop bridge missing
3. Item statuses don't match spec
4. No collaborator system
5. Offline infrastructure not wired to Site Walk
6. Operations Console is mock data (route exists, content is placeholders)
7. `project-hub/_page.tsx` is underscore-prefixed — not routable (pre-existing issue)
8. 4 redundant CEO email env vars in `.env` (`CEO_EMAIL`, `PRIMARY_CEO_EMAIL`, `PLATFORM_ADMIN_EMAILS`, `SLATE360_PLATFORM_ADMINS`) — only `CEO_EMAIL` is used in code

### Context Files Updated
- `SLATE360_PROJECT_MEMORY.md`: this handoff

### Next Steps (ordered)
1. **Run migration** `20260414000001_add_beta_approved_to_profiles.sql` on Supabase
2. **Set `is_beta_approved = true`** for the CEO account and any known beta testers
3. Site Walk → SlateDrop bridge implementation
4. Owner decides on status reconciliation (spec statuses vs current code statuses)
5. Offline wiring: connect existing queue/banner/sync to Site Walk capture
6. Unified bug/feature reporting form
7. Operations Console minimum viable shell (replace mock metrics with real beta user list + approval toggle)
8. Clean up redundant CEO email env vars

### Session Handoff — 2026-04-14 (Beta-Surface Honesty + Beta Gate Implementation)

### What Changed

**First code changes — beta-surface honesty + beta-access foundation**

- **DashboardSidebar.tsx**: Removed 360 Tours and Design Studio from APP_LINKS. Added Operations Console link (gated by `hasOperationsConsoleAccess` prop). Added `Shield` icon import.
- **QuickNav.tsx**: Added `phase1Hidden: true` to 360 Tours, Design Studio, Content Studio, Geospatial, Virtual Studio, Analytics. Renamed "CEO" to "Operations Console" in nav label. Filter logic skips `phase1Hidden` items.
- **MobileNavSheet.tsx**: Same `phase1Hidden` treatment. Renamed "CEO" to "Operations Console".
- **MobileModuleBar.tsx**: Same `phase1Hidden` treatment. Renamed "CEO" to "Ops Console" (short label).
- **walled-garden-dashboard.tsx**: Added `hasOperationsConsoleAccess` prop, passed through to both DashboardSidebar instances.
- **app/(dashboard)/dashboard/page.tsx**: Destructures `canAccessCeo` from `resolveServerOrgContext()`, passes as `hasOperationsConsoleAccess` to WalledGardenDashboard.
- **middleware.ts**: Added Phase 1 beta gate after auth check. Queries `profiles.is_beta_approved`. CEO email bypasses. Unapproved users redirect to `/dashboard/beta-pending`. Fails open if query errors (graceful degradation until migration runs).
- **app/(dashboard)/dashboard/beta-pending/page.tsx**: New page — clean "Beta Access Pending" UI with explanation and back link.
- **supabase/migrations/20260414000001_add_beta_approved_to_profiles.sql**: Adds `is_beta_approved boolean NOT NULL DEFAULT false` to `profiles` table.

**Architecture decisions:**
- Beta gate in middleware (not layout) — enforces at earliest server boundary, unapproved users never reach dashboard shell
- `profiles.is_beta_approved` as source of truth — app-owned, easily managed from Operations Console later
- CEO email hardcode bypass in middleware — matches existing `isSlateCeo` pattern in `org-context.ts`
- `phase1Hidden` flag on nav items — declarative, easy to remove when modules are ready, preserves gate keys for future
- Legacy `canAccessCeo` naming contained — used only in destructuring from existing `resolveServerOrgContext()`. New UI labels say "Operations Console." No new code expands the CEO naming.

### What's Broken / Partially Done
1. ~~360 Tours + Design Studio visible in sidebar nav~~ **FIXED**
2. Site Walk → SlateDrop bridge missing
3. Item statuses don't match spec
4. ~~No beta access gate~~ **FIXED** (migration must be run on Supabase)
5. No collaborator system
6. Offline infrastructure not wired to Site Walk
7. Operations Console is mock data (route exists, content is placeholders)
8. **Migration not yet applied** — `20260414000001_add_beta_approved_to_profiles.sql` must run before beta gate actually blocks users

### Context Files Updated
- `SLATE360_PROJECT_MEMORY.md`: this handoff

### Next Steps (ordered)
1. **Run migration** `20260414000001_add_beta_approved_to_profiles.sql` on Supabase
2. **Set `is_beta_approved = true`** for the CEO account and any known beta testers
3. Site Walk → SlateDrop bridge implementation
4. Owner decides on status reconciliation (spec statuses vs current code statuses)
5. Offline wiring: connect existing queue/banner/sync to Site Walk capture
6. Unified bug/feature reporting form
7. Operations Console minimum viable shell (replace mock metrics with real beta user list + approval toggle)

### Session Handoff — 2026-04-13 (Phase 1 Beta Doctrine Alignment)

### What Changed

**Doctrine + Planning Alignment (no code changes)**
- Rewrote `docs/SLATE360_MASTER_BUILD_PLAN.md` — now the canonical Phase 1 Beta Doctrine document
  - Fixed Doctrine: one app, individual-first licensing, project-centric data, owner-approved design
  - Defined Phase 1 scope: Slate360 shell + Projects + SlateDrop + Site Walk only
  - Documented all 10 codebase conflicts with doctrine (see Section 13)
  - Documented 10 owner decisions needed before design generation (see Section 14)
  - Defined build sequence: Phase A (pre-design code) → B (owner decisions) → C (design) → D (hardening)
- Rewrote `docs/platform/SLATE360_PLATFORM_BUILD_FILE.md` — aligned with Phase 1 doctrine
  - Added Phase 1 user experience section (what testers see, how they reach things)
  - Added conflict table and pre-design implementation requirements
- Rewrote `docs/site-walk/SITE_WALK_BUILD_FILE.md` — clarified Site Walk is a MODULE, not a separate app
  - Corrected API auth status: all 31 routes use withAppAuth("punchwalk") (was incorrectly listed as withAuth)
  - Documented SlateDrop integration gap as CRITICAL
  - Condensed 3200 lines to focused build file + product vision reference appendix
- Rewrote `docs/slatedrop/SLATEDROP_BUILD_FILE.md` — added Site Walk integration as CRITICAL gap
- Rewrote `docs/billing/BILLING_BUILD_FILE.md` — scoped to Phase 1 (Site Walk checkout only)
- Rewrote all prompt backlogs to Phase A/B/C/D phasing:
  - `docs/platform/SLATE360_PLATFORM_PROMPT_BACKLOG.md`
  - `docs/billing/BILLING_PROMPT_BACKLOG.md`
  - `docs/slatedrop/SLATEDROP_PROMPT_BACKLOG.md`
- Created `docs/PROMPT_BACKLOG.md` — master index with canonical Phase 1 ordered sequence

### What's Broken / Partially Done
- **CRITICAL: No beta access gate** — signup is open to anyone (app/signup/page.tsx, middleware.ts)
- **CRITICAL: Site Walk uploads are disconnected S3 silo** — no SlateDrop integration
- **HIGH: Nav shows Tours/DS/CS/Geo/Virtual** — must be hidden from beta testers
- **HIGH: MobileNavSheet gate inconsistency** — uses tier gates, not standalone
- **HIGH: Site Walk has own layout tree** — feels like separate app
- **MODERATE: Org bootstrap creates "Bob's Organization"** — conflicts with individual-first model
- **MODERATE: No bug reporting UI** — only feature suggestion widget
- **P2: 9 Project Hub monolith files** exceed 300-line limit
- **P2: 14 total files over 300 lines**

### Context Files Updated
- `docs/SLATE360_MASTER_BUILD_PLAN.md`: full rewrite — Phase 1 Beta Doctrine
- `docs/platform/SLATE360_PLATFORM_BUILD_FILE.md`: full rewrite
- `docs/site-walk/SITE_WALK_BUILD_FILE.md`: full rewrite
- `docs/slatedrop/SLATEDROP_BUILD_FILE.md`: full rewrite
- `docs/billing/BILLING_BUILD_FILE.md`: full rewrite
- `docs/platform/SLATE360_PLATFORM_PROMPT_BACKLOG.md`: full rewrite
- `docs/billing/BILLING_PROMPT_BACKLOG.md`: full rewrite
- `docs/slatedrop/SLATEDROP_PROMPT_BACKLOG.md`: full rewrite
- `docs/PROMPT_BACKLOG.md`: created (was empty)
- `SLATE360_PROJECT_MEMORY.md`: this handoff

### Owner Decisions Needed (Before Next Code Work)
1. Org model: Option A (rename to "workspace") or Option B (user-scoped entitlements)?
2. Beta gate mechanism: invite code? flag? approval queue?
3. Should beta testers pay or get free access?
4. Command center layout approval
5. Site Walk capture UX approval
6. Mobile navigation approval

### Next Steps (ordered)
1. Owner makes decisions on items 1-3 above
2. P-A1: Hide placeholder modules from nav (~30 min, no owner decision needed)
3. P-A2: Fix MobileNavSheet gates (~15 min, no owner decision needed)
4. P-A3: Beta access gate (needs decision #2)
5. SD-A1: Wire Site Walk → SlateDrop (needs decision #1 only if schema changes)
6. P-A5: Bug reporting form
7. P-A6: Rename org language
8. Then: Phase B owner design decisions → Phase C implementation → Phase D hardening