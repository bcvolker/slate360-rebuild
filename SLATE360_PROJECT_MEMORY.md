# Slate360 — Project Memory

Last Updated: 2026-03-30
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

### Session Handoff — 2026-03-30 (Tour Builder WIP + All Accesses Verified)

#### What Changed (This Session — extends previous session)

**Tour Builder API Routes — WIP (commit `fd6fe85`):**
- 6 API routes created in `app/api/tours/` — CRUD tours, scenes, upload, complete
- `components/dashboard/tours/SceneUploader.tsx` — scene upload UI component (132 lines)
- `lib/tours/queries.ts` — server-side tour query helpers (182 lines)
- `lib/s3-utils.ts` — S3 utility helpers (62 lines)
- `lib/types/tours.ts` — added `fileSizeBytes` to `TourScene`
- **25 TS ERRORS** — routes use incorrect `ServerOrgContext.supabase` / `.org` pattern. Must be rewritten to use `withAuth()` / `createAdminClient()` from `lib/server/api-auth.ts`
- Webhook fix: standalone app sub checks `subscription.status` instead of event type

**Migrations Applied to Production (commit `fd6fe85`):**
- `20260406000003`: `org_role` enum + `role` column on `organization_members`
- `20260406000004`: `file_size_bytes` column on `tour_scenes`

**All Prior Session Work (already committed):**
- Phase 2 complete: `org_feature_flags` table, entitlement merge, webhook writes, route protection (commit `299a589`)
- Integrity check: 3 migrations applied, middleware TS fix (commit `5b8ac5a`)
- Phase 1B: Stripe products + billing-apps + checkout route (commit `bc14583`)
- Plans CTA fixes, trial access overhaul, email branding (earlier commits)

#### CRITICAL: Tour Builder API Routes Need Rewrite

The 6 files in `app/api/tours/` have 25 TypeScript errors. They were written by another agent using an incorrect auth pattern. Every route must be rewritten to use:
```typescript
import { withAuth } from "@/lib/server/api-auth";
import { createAdminClient } from "@/lib/supabase/admin";
// NOT: resolveServerOrgContext().supabase or .org (these don't exist)
```

Files to fix:
- `app/api/tours/route.ts` (list + create tours)
- `app/api/tours/[tourId]/route.ts` (get + patch + delete tour)
- `app/api/tours/[tourId]/scenes/route.ts` (list scenes)
- `app/api/tours/[tourId]/scenes/upload/route.ts` (presigned URL for upload)
- `app/api/tours/[tourId]/scenes/complete/route.ts` (confirm upload done)
- `app/api/tours/[tourId]/scenes/[sceneId]/route.ts` (delete scene)

Also: routes reference `TourScene.panorama_path` (snake_case) but the TS type uses `panoramaPath` (camelCase). The DB columns are snake_case — the Supabase response will be snake_case. Either use raw DB types or map in queries.

#### Tour Builder File Map
| File | Lines | Purpose | Status |
|---|---|---|---|
| `lib/types/tours.ts` | 33 | `ProjectTour`, `TourScene` types | ✅ Clean |
| `lib/tours/queries.ts` | 182 | Server-side tour query helpers | ✅ Clean |
| `lib/s3-utils.ts` | 62 | S3 presigned URL + delete helpers | ✅ Clean |
| `components/dashboard/tours/SceneUploader.tsx` | 132 | Drag-drop scene upload UI | ✅ Clean |
| `app/api/tours/route.ts` | 47 | List + create tours | ❌ 25 TS errors |
| `app/api/tours/[tourId]/route.ts` | 85 | Get + patch + delete tour | ❌ across all routes |
| `app/api/tours/[tourId]/scenes/*.ts` | 4 files | Scene CRUD + upload | ❌ across all routes |

#### Database State (All Applied to Production)
| Table/Column | Migration | Status |
|---|---|---|
| `org_feature_flags` | `20260329` | ✅ Live |
| `stripe_events` | `20260406000000` | ✅ Live |
| `project_tours` | `20260406000001` | ✅ Live |
| `tour_scenes` | `20260406000001` | ✅ Live |
| `set_updated_at()` trigger fix | `20260406000002` | ✅ Live |
| `organization_members.role` | `20260406000003` | ✅ Live |
| `tour_scenes.file_size_bytes` | `20260406000004` | ✅ Live |

#### Codespace Tool Access (All Verified)
| Tool | Status | Notes |
|---|---|---|
| Supabase Management API | ✅ | `SUPABASE_ACCESS_TOKEN` Codespace secret |
| Supabase Data | ✅ | `SUPABASE_SERVICE_ROLE_KEY` in `.env.local` |
| Vercel CLI | ✅ | `VERCEL_TOKEN` Codespace secret |
| Stripe API + CLI | ✅ | CLI at `/usr/local/bin/stripe` (v1.23.8) |
| AWS CLI + S3 | ✅ | CLI at `/usr/local/bin/aws`, bucket `slate360-storage` verified |
| Resend Email | ✅ | domain `slate360.ai` verified |
| Google Maps | ✅ | Client-only; referrer restrictions set correctly |
| GitHub | ✅ | Codespace default auth |
| Postgres (psql) | ❌ | Password in `.env.local` but Codespace can't reach Supabase Postgres (IPv6 network issue). Use Management API for DDL. |

**DDL pattern:** `source .env.local && curl -s -X POST "https://api.supabase.com/v1/projects/hadnfcenpcfaeclczsmm/database/query" -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" -H "Content-Type: application/json" -d "$(jq -Rs '{query: .}' < migration.sql)"`

#### Google Maps API Key
- Starts with `AIzaSyAHXWir...`, matches `.env.local`
- Referrer restrictions: `http://localhost:3000/*`, `https://slate360.ai/*`, `https://www.slate360.ai/*`
- 5 APIs enabled: Geocoding, Maps JS, Maps Static, Places, Street View Static
- Address autocomplete (BUG-010): NOT an API key issue — needs browser console debugging

#### Two Open Investigation Items
1. **Address autocomplete (BUG-010)** — Google API key is correctly configured. The bug is in the client-side integration. Need to check browser console on the live site for errors. May be a library version issue or missing Places New API migration.
2. **Weather widget** — needs to auto-detect user location via browser geolocation API. Currently requires manual city entry. Check `useWeatherState.ts` for how location is resolved.

#### Git State
- HEAD: `fd6fe85` on `origin/main`
- Working tree: clean
- All migrations applied to production

#### Next Steps (Ordered)
1. **Fix Tour Builder API routes** — rewrite 6 files to use `withAuth()` pattern (kills 25 TS errors)
2. **Tour Builder UI** — continue BUILD_GUIDE.md prompts (tour list, editor, scene management)
3. **Address autocomplete** — BUG-010, browser console debug on live site
4. **Weather auto-location** — add geolocation to `useWeatherState.ts`
5. **Create `/apps` route** — standalone app launcher for walled garden users
6. **Manual checkout test** — test card purchase on live site
7. **Per-feature trial restrictions** — enforce actual data limits/watermarks
8. **Orphan file cleanup** — delete old `MarketClient.tsx`, `MarketRobotWorkspace.tsx`, `.bak` files

**Tier 3 — Polish:**
5. SlateDrop BUG-001 phase 2
6. Orphan file cleanup