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
| `components/walled-garden-dashboard.tsx` | 82 | ✅ Extracted — was 1472 lines, now thin orchestrator |
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

### Session Handoff — 2026-04-11 (Billing Sync + Cost-Optimized Tier Limits)

### What Changed

**Commit `dc60f2c` — 4-tier billing sync: Standard Stripe product, cost-optimized limits, webhook fix**

**1. Stripe Product/Price Changes**
- Created product `Slate360 Standard` (prod_UJZSXPauJW6Qmh) — $149/mo, $1,490/yr
- Monthly price: `price_1TKwK4JCrjGbeotHIM4i3QUH`
- Annual price: `price_1TKwK4JCrjGbeotHwlMNaHmM`
- Archived: `Slate360 Creator` (prod_TYfm7ee4iEJ9W5), `Slate360 Model` (prod_TYfpYsfCPrGT23)
- Active products now: Standard, Business, PunchWalk ($49/mo), Tour Builder ($49/mo)

**2. Vercel Env Vars Updated**
- Added: `STRIPE_PRICE_STANDARD_MONTHLY`, `STRIPE_PRICE_STANDARD_ANNUAL`
- Removed: `STRIPE_PRICE_CREATOR_MONTHLY`, `STRIPE_PRICE_CREATOR_ANNUAL`, `STRIPE_PRICE_MODEL_MONTHLY`, `STRIPE_PRICE_MODEL_ANNUAL`

**3. Critical Webhook Bug Fixed**
- `app/api/stripe/webhook/route.ts`: `updateOrganizationTier()` was checking for `"creator"`/`"model"` tier names
- The pipeline sends `"standard"` but the function had no match — fell through to 5GB trial default
- Fixed: now checks `"standard"` (25GB), `"business"` (100GB), `"enterprise"` (500GB)

**4. Cost-Optimized Tier Limits (approved for 93%+ margin at 2000 users)**
- `lib/entitlements.ts`: Trial: 2GB/250cr/1 seat, Standard: 25GB/5Kcr/3 seats, Business: 100GB/25Kcr/15 seats, Enterprise: 500GB/100Kcr/999 seats
- `lib/server/org-bootstrap.ts`: new orgs get `storage_limit_bytes = 2GB` on creation
- `components/dashboard/ceo/CeoSubscriberDirectory.tsx`: TIER_ORDER updated to 4-tier

**5. .env Updated**
- Replaced `STRIPE_PRICE_CREATOR_*` and `STRIPE_PRICE_MODEL_*` with `STRIPE_PRICE_STANDARD_MONTHLY` and `STRIPE_PRICE_STANDARD_ANNUAL`

### Infrastructure Status (verified this session)
- **Git**: ✅ push works (commit dc60f2c pushed)
- **Vercel**: ✅ 76 env vars, Stripe vars synced to 4-tier model
- **AWS S3**: ✅ bucket `slate360-storage`, 107 objects, 0.289 GB
- **Stripe**: ✅ Standard product created, Creator/Model archived, 3 active platform products
- **Supabase**: ✅ API access works, Free plan (recommend upgrade to Pro at scale)

### Cost Model Summary
- At 2,000 users (50% trial, 30% standard, 15% business, 3% enterprise): ~$301K/mo revenue
- Infrastructure cost: ~$19K/mo (S3 dominant at ~$10K, Stripe fees ~$9K)
- **Projected margin: 93.6%**

### Subscription Pipeline Audit Findings
- ✅ Full signup → email confirmation → org creation → Stripe checkout → webhook → tier update pipeline is wired
- ✅ Deduplication on webhook events, atomic credit adds, legacy tier mapping
- ⚠️ No dedicated `/plans` page (old one deprecated) — users upgrade from signup page or billing portal
- ⚠️ No seat enforcement — Trial org with maxSeats:1 can still have multiple members join
- ⚠️ No `past_due` handling — Stripe subscription goes through past_due → unpaid → canceled; org stays at paid tier until `deleted` event
- ⚠️ Enterprise is CEO-only or manual DB insert — no self-serve enterprise checkout

### What's Broken / Partially Done
- `SlateLogo` component created but NOT wired into consuming pages
- `marketing-homepage.tsx` is 1123 lines — needs extraction
- `market_scheduler_lock` table still has no RLS (pre-existing)
- Portal view_count race condition (atomic SQL not deployed, pre-existing)
- `fix/slatedrop-external-uploads` branch still needs merge (security patch, pre-existing)
- Supabase email templates still use purple gradients (pre-existing)
- No dedicated `/plans` pricing page for post-signup upgrade flow

### Context Files Updated
- `SLATE360_PROJECT_MEMORY.md`: this handoff

### Next Steps (ordered by priority)
1. **Create `/plans` pricing page** — users need a way to upgrade post-signup
2. **Add seat enforcement** — block org member invites when at maxSeats
3. **Handle `past_due` subscription status** in webhook (grace period or immediate downgrade)
4. **Wire `<SlateLogo />` into all pages** still using direct `<img>` logo tags
5. **Extract `marketing-homepage.tsx`** into sub-300-line components
6. **Begin Site Walk Phase 1** — create migrations, session CRUD APIs
7. **Merge `fix/slatedrop-external-uploads`** → main (security patch)
8. **Upgrade Supabase to Pro plan** before user growth (Free: 500MB DB, 1GB file storage)
- `lib/types/command-center.ts` (45 lines): shared types

**2. ALL Mock Data Removed from Dashboard**
- ❌ DELIVERABLES array with `/api/placeholder/` URLs — GONE
- ❌ SLATEDROP_FILES/FOLDERS mock data — GONE
- ❌ APPS array with hardcoded storage ("4.1 GB", "9.2 GB") — GONE
- ❌ STORAGE_BREAKDOWN with fake data — GONE
- ❌ ENTERPRISE_USERS empty array — GONE
- ❌ Notification bell hardcoded "3" count — GONE (now links to /my-account?tab=notifications)

**3. Entitlements 4-Tier Rewrite**
- `lib/entitlements.ts`: removed `creator`/`model`, added `standard` ($149/mo, 10K credits, 100GB, 3 seats)
- New `LEGACY_TIER_MAP`: auto-maps DB rows with "creator"/"model" → "standard"
- `TIER_ORDER`: `["trial", "standard", "business", "enterprise"]`
- Updated 13 consumer files: 5 shell components, DashboardClient, billing.ts, UpgradeGate, SlateDropClient, useBillingState, useDashboardState, org-context.ts
- `lib/billing.ts`: SUBSCRIPTION_PLANS now has `standard` + `business` (needs STRIPE_PRICE_STANDARD_* env vars in Vercel)

**4. Dashboard Page Updated**
- `app/(dashboard)/dashboard/page.tsx`: now passes `storageLimitGb` from `getEntitlements(tier)`

### Codebase Health Report
- TypeScript: **0 errors** (`npx tsc --noEmit` clean)
- Oversized files: **16 files** (down from 17 — removed walled-garden-dashboard from list)
- Biggest remaining: `LocationMap.tsx` (1892), `marketing-homepage.tsx` (1123)

### Placeholder Data Audit (Updated)
| Category | Location | What |
|---|---|---|
| ~~CRITICAL~~ | ~~`walled-garden-dashboard.tsx`~~ | ~~ALL mock data~~ **RESOLVED** |
| CRITICAL | `marketing-homepage.tsx` L223-243 | Testimonials with fake names (Sarah Chen, Marcus Johnson) |
| CRITICAL | `home/landing-data.ts` L121-147 | Duplicate testimonials with different fake names |
| CRITICAL | `CeoCommandCenterClient.tsx` L38-43 | MOCK_METRICS (MRR, churn, margin — hardcoded) |
| CRITICAL | `lib/dashboard/demo-data.ts` L18-87 | DEMO_PROJECTS, DEMO_EVENTS, DEMO_JOBS, DEMO_WEATHER |
| MEDIUM | 6 shell components | `status="coming-soon"` or `status="under-development"` |
| MEDIUM | PunchListForm, ObservationForm | "Photo upload coming soon" text |
| MEDIUM | MarketClient, MarketRobotWorkspace | "Placeholder for {tab} (under construction)" |

### What's Broken / Partially Done
- `billing.ts` uses env vars `STRIPE_PRICE_STANDARD_MONTHLY`/`STRIPE_PRICE_STANDARD_ANNUAL` — need to create these Stripe prices and add to Vercel env
- `SlateLogo` component created but NOT wired into consuming pages
- `marketing-homepage.tsx` is 1123 lines — needs extraction
- `market_scheduler_lock` table still has no RLS (pre-existing)
- Portal view_count race condition (atomic SQL not deployed, pre-existing)
- `fix/slatedrop-external-uploads` branch still needs merge (security patch, pre-existing)
- Supabase email templates still use purple gradients (pre-existing)

### Context Files Updated
- `SLATE360_PROJECT_MEMORY.md`: this handoff + tier note updated + monolith table updated

### Next Steps (ordered by priority)
1. **Create Stripe "Standard" price IDs** — add `STRIPE_PRICE_STANDARD_MONTHLY` and `STRIPE_PRICE_STANDARD_ANNUAL` to Vercel env vars
2. **Wire `<SlateLogo />` into all pages** still using direct `<img>` logo tags
3. **Extract `marketing-homepage.tsx`** into sub-300-line components
4. **Begin Site Walk Phase 1** — create `site_walk_items` + `site_walk_deliverables` migrations, session CRUD APIs
5. **Merge `fix/slatedrop-external-uploads`** → main (security patch)
6. **Add RLS to `market_scheduler_lock`**
7. **Deploy atomic `claim_deliverable_view()` RPC**
8. **Add real notifications system** — API route + DB table + real bell count
9. **Replace CEO mock metrics** with real Stripe MRR / org analytics