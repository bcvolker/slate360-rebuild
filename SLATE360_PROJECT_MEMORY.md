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

### Session Handoff — 2026-03-29 (Phase 2 Complete: org_feature_flags)

#### What Changed (This Session)

**Phase 2A — Migration Executed (commit `299a589`):**
- `supabase/migrations/20260329_org_feature_flags.sql` — table live in production
- Columns: `org_id` (PK/FK), `standalone_tour_builder`, `standalone_punchwalk`, `tour_builder_seat_limit/seats_used`, timestamps
- RLS enabled, SELECT policy for org members, service-role-only mutations
- `trg_org_feature_flags_updated_at` trigger active
- Executed via Supabase Management API (`SUPABASE_ACCESS_TOKEN` env var)

**Phase 2B — Entitlement Merge (commit `299a589`):**
- `lib/entitlements.ts` — `OrgFeatureFlags` type, `getEntitlements()` accepts optional `featureFlags` param
- `lib/entitlements.ts` — `Entitlements` interface now includes `canAccessStandaloneTourBuilder`, `canAccessStandalonePunchwalk`, `tourBuilderSeatLimit`, `tourBuilderSeatsUsed`
- `lib/server/org-feature-flags.ts` — NEW. `loadOrgFeatureFlags(orgId)` server loader (admin client)

**Phase 2C — Webhook Writes (commit `299a589`):**
- `app/api/stripe/webhook/route.ts` — `upsertAppFlag()` writes to `org_feature_flags` on standalone app sub create/update/delete
- Replaces Phase 2 TODO comments with actual upsert logic

**Phase 2D — Route Protection (commit `299a589`):**
- `lib/server/api-auth.ts` — NEW `withAppAuth(appId, req, handler)` wrapper checks `org_feature_flags`
- `middleware.ts` — `/tour-builder` and `/punchwalk` added to unauthenticated redirect list

**Previous Session Work (still in this session):**
- Phase 1B Stripe products, billing-apps.ts, app-checkout route, webhook standalone support (commit `bc14583`)
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
| `app/api/stripe/webhook/route.ts` | Webhook — tier updates + standalone app flag upserts |
| `app/api/billing/checkout/route.ts` | Tier subscription checkout |
| `app/api/billing/app-checkout/route.ts` | Standalone app checkout |
| `app/api/billing/portal/route.ts` | Stripe billing portal session |
| `supabase/migrations/20260329_org_feature_flags.sql` | Migration (already applied) |

#### DB Note
- `SUPABASE_ACCESS_TOKEN` in Codespace secrets is valid (`sbp_4a52c0fd...`). Updated `.env.local` to match.
- Old token (`sbp_bae1d29d...`) was expired. 
- Supabase CLI binary at `/tmp/supabase` (v2.84.2) — works for `db query --linked`
- `POSTGRES_PASSWORD` is still empty — use Management API or CLI for DDL, not psql

#### Git State
- HEAD: `299a589` on `origin/main`
- Working tree: clean

#### What Still Needs Work
- **Per-feature trial restrictions** — TrialBanner is cosmetic; actual data limits, watermarks, deliverable caps need per-feature enforcement
- **Address autocomplete** — still broken (BUG-010)
- **Manual checkout test** — test card purchase on live site not yet tested

#### Next Steps (Ordered)
1. **Unfreeze Tour Builder MVP** — begin 8-prompt build sequence from `BUILD_GUIDE.md`
2. **Manual checkout test** — test card purchase on live site, verify webhook → DB tier update + flag upsert
3. **Per-feature trial restrictions** — enforce data limits, watermarks, deliverable caps
4. **Address autocomplete debugging** — BUG-010, needs runtime browser console test
- Logo, mobile quick-access, debug banner UI fixes
- All TS errors resolved (was 4, now 0)

#### Module Health Summary

| Module | Status | Main File | Lines | Notes |
|--------|--------|-----------|-------|-------|
| **Dashboard** | ✅ Done | `DashboardClient.tsx` | 264 | 5 extractions + 6 sub-hooks |
| **Dashboard State** | ✅ Done | `useDashboardState.ts` | 244 | Thin orchestrator |
| **DashboardMyAccount** | ✅ Done | `DashboardMyAccount.tsx` | 267 | Under limit |
| **DashboardHeader** | ✅ Done | `DashboardHeader.tsx` | 292 | Shared across all pages + MobileModuleBar |
| **SlateDrop** | ✅ Done | `SlateDropClient.tsx` | 282 | 7 sub-hooks wired |
| **Market Robot** | ⏸️ Paused | `MarketClient.tsx` | 175 | Needs wallet funding to test |
| **Homepage** | ✅ Done | `app/page.tsx` | 63 | 8 files in `components/home/` |
| **Project Hub pages** | ✅ Done | 9 pages | 111-240 | All extracted + dark mode (42 files total) |

#### Sub-Hook Registry

**Dashboard (6 hooks):**
`useBillingState` (81), `useWidgetPrefsState` (155), `useAccountState` (154), `useWeatherState` (104), `useSuggestFeatureState` (40), `useNotificationsState` (38)

**SlateDrop (7 hooks):**
`useSlateDropUiState`, `useSlateDropFiles`, `useSlateDropPreviewUrl`, `useSlateDropUploadActions`, `useSlateDropInteractionHandlers`, `useSlateDropTransferActions`, `useSlateDropMutationActions`

#### Next Steps (Ordered)
1. **Phase 1A manual checkout test** — test card purchase on live site, verify webhook → DB tier update
2. **Phase 2A** — Create `org_feature_flags` Supabase table + migration
3. **Phase 2B** — Entitlement merge: `getEntitlements(tier, featureFlags)` reads flags
4. **Phase 2C** — Webhook writes to `org_feature_flags`
5. **Phase 2D** — Middleware route protection for standalone app routes
6. **Unfreeze Tour Builder MVP** — begin 8-prompt build sequence
7. **Per-feature trial restrictions** — enforce data limits, watermarks, deliverable caps
8. **Address autocomplete debugging** — BUG-010, needs runtime browser console test
9. **DashboardWidgetRenderer extraction** (513 lines)
10. **Orphan file cleanup** (old MarketClient.tsx, MarketRobotWorkspace.tsx, .bak files)

#### Accesses Confirmed Working
- **Supabase admin**: `createAdminClient()` via `SUPABASE_SERVICE_ROLE_KEY`
- **Resend API**: domain `slate360.ai` verified, sending works
- **Vercel CLI**: `vercel link` connected, `VERCEL_TOKEN` Codespace secret working — can read/write env vars
- **Git**: push to `origin/main` triggers Vercel auto-deploy
- **AWS S3**: bucket `slate360-storage`, region `us-east-2`
- **Stripe**: test mode (`sk_test_*`), all 6 tier price IDs + 2 app price IDs resolve, webhook endpoint responds

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