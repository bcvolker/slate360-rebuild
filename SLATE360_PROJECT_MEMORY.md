# Slate360 — Project Memory

Last Updated: 2026-03-29
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

### Session Handoff — 2026-03-29 (Phase 2 + Integrity Check + Migrations Applied)

#### What Changed (This Session)

**Phase 2 Complete — org_feature_flags (commit `299a589`):**
- `supabase/migrations/20260329_org_feature_flags.sql` — table live in production
- `lib/entitlements.ts` — `OrgFeatureFlags` type, `getEntitlements()` accepts optional `featureFlags` param
- `lib/server/org-feature-flags.ts` — `loadOrgFeatureFlags(orgId)` server loader
- `app/api/stripe/webhook/route.ts` — `upsertAppFlag()` writes flags on standalone app sub create/update/delete
- `lib/server/api-auth.ts` — `withAppAuth(appId, req, handler)` wrapper
- `middleware.ts` — `/tour-builder`, `/punchwalk`, `/apps` in auth redirect + walled garden enforcer

**Integrity Check + Tour Builder Schema (commit `5b8ac5a`):**
- Applied 3 migrations to production DB:
  - `20260406000000_stripe_events_and_storage.sql` — `stripe_events` table + `increment_org_storage()` RPC
  - `20260406000001_project_tours_schema.sql` — `project_tours` + `tour_scenes` tables with RLS
  - `20260406000002_fix_tours_updated_at_trigger.sql` — generic `set_updated_at()` function, fixed triggers
- `app/api/stripe/webhook/route.ts` — Stripe event idempotency via `stripe_events` table + `storage_limit_bytes` sync
- `app/api/slatedrop/upload-url/route.ts` — storage quota check before presigned URL generation
- `components/dashboard/DashboardClient.tsx` — tours tab uses `canAccessStandaloneTourBuilder`
- `lib/types/tours.ts` — `ProjectTour` + `TourScene` types
- `middleware.ts` — fixed TS error in walled garden Supabase join type narrowing

**Earlier This Session:**
- Phase 1B Stripe products + billing-apps.ts + app-checkout route (commit `bc14583`)
- Plans page CTA fixes, trial access overhaul, email branding (commits `d4e8803`, `1f94a10`, `09e565a`)

#### Stripe + App Ecosystem File Map
| File | Purpose |
|---|---|
| `lib/stripe.ts` | `getStripeClient()`, `getRequestOrigin()` |
| `lib/billing.ts` | Tier plans, prices, `getTierFromPriceId()` |
| `lib/billing-apps.ts` | Standalone app plans, `getAppPriceId()`, `getAppFromPriceId()` |
| `lib/billing-server.ts` | `getAuthenticatedOrgContext()`, `findOrCreateStripeCustomer()` |
| `lib/entitlements.ts` | `getEntitlements()` with `OrgFeatureFlags` merge |
| `lib/server/org-feature-flags.ts` | `loadOrgFeatureFlags()` server loader |
| `lib/server/api-auth.ts` | `withAuth()`, `withProjectAuth()`, `withMarketAuth()`, `withAppAuth()` |
| `lib/types/tours.ts` | `ProjectTour`, `TourScene` types |
| `app/api/stripe/webhook/route.ts` | Webhook — tier updates + app flag upserts + idempotency |
| `app/api/billing/checkout/route.ts` | Tier subscription checkout |
| `app/api/billing/app-checkout/route.ts` | Standalone app checkout |

#### Database Tables Created This Session
| Table | Migration | Status |
|---|---|---|
| `org_feature_flags` | `20260329_org_feature_flags.sql` | ✅ Live — RLS, trigger, constraints |
| `stripe_events` | `20260406000000` | ✅ Live — webhook idempotency |
| `project_tours` | `20260406000001` | ✅ Live — RLS, indexes |
| `tour_scenes` | `20260406000001` | ✅ Live — RLS, cascade delete |

#### Codespace Tool Access
| Tool | Status | How |
|---|---|---|
| Supabase Management API | ✅ Working | `SUPABASE_ACCESS_TOKEN` Codespace secret (`sbp_4a52c0fd...`) |
| Supabase Data | ✅ Working | `SUPABASE_SERVICE_ROLE_KEY` in `.env.local` |
| Vercel CLI | ✅ Working | `VERCEL_TOKEN` Codespace secret |
| Stripe API + CLI | ✅ Working | `STRIPE_SECRET_KEY` in `.env.local`, CLI at `/usr/local/bin/stripe` |
| AWS CLI + S3 | ✅ Working | Keys in `.env.local`, CLI at `/usr/local/bin/aws`, bucket `slate360-storage` |
| Resend Email | ✅ Working | `RESEND_API_KEY` in `.env.local`, domain `slate360.ai` verified |
| Google Maps | ✅ Client-side only | Key has website referrer restrictions (correct security) |
| GitHub | ✅ Working | Codespace default auth |
| Postgres direct (psql) | ❌ No password | Use Management API for DDL instead |
| Supabase CLI | ⚠️ /tmp only | Binary at `/tmp/supabase` — lost on Codespace rebuild |

**Note:** Supabase CLI at `/tmp/supabase` v2.84.2 is ephemeral. For DDL, prefer Management API via curl (see `scripts/run-migration.mjs` pattern).

#### Google Maps API Key
- Key starts with `AIzaSyAHXWir...` — matches `.env.local` `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
- Application restrictions: **Websites** — `http://localhost:3000/*`, `https://slate360.ai/*`, `https://www.slate360.ai/*`
- API restrictions: **Restrict key** — Geocoding, Maps JS, Maps Static, Places, Street View Static
- Server-side calls fail by design (no referrer) — this is correct
- Address autocomplete (BUG-010) is NOT caused by API key restrictions — needs browser console debugging

#### Git State
- HEAD: `5b8ac5a` on `origin/main`
- Working tree: clean
- No stashes

#### What Still Needs Work
- **Tour Builder MVP** — DB schema is live, types exist, need UI build (8-prompt sequence in `BUILD_GUIDE.md`)
- **Manual checkout test** — test card purchase on live site not yet tested
- **Per-feature trial restrictions** — TrialBanner is cosmetic; data limits/watermarks/caps need per-feature enforcement
- **Address autocomplete** — BUG-010, not an API key issue, needs browser console test
- **Walled garden for standalone-only users** — middleware logic added but `/apps` route doesn't exist yet

#### Next Steps (Ordered)
1. **Tour Builder MVP** — begin 8-prompt build from `slate360-context/dashboard-tabs/tour-builder/BUILD_GUIDE.md`
2. **Create `/apps` route** — standalone app launcher page for walled garden users
3. **Manual checkout test** — test card purchase on live site
4. **Per-feature trial restrictions** — enforce actual limits
5. **Address autocomplete** — BUG-010, browser console debug
6. **Orphan file cleanup** — delete old `MarketClient.tsx`, `MarketRobotWorkspace.tsx`, `.bak` files
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