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

### Session Handoff — 2026-04-09 (Landing Page Integration + SlateDrop Security Patch)

### What Changed

**1. v0.dev Landing Page integrated → `feature/dashboard-integration` (pushed, NOT merged to main)**
- `app/page.tsx`: now renders `<LandingPage />` for unauthenticated users (redirects auth users to `/apps` unchanged)
- New landing page split into 10 files under `components/home/`:
  - `landing-data.ts` — all APPS/STATS/TESTIMONIALS/PRICING_PLANS/FOOTER_LINKS constants + types
  - `LandingHeader.tsx` — fixed header with nav, logo SVG, desktop/mobile menus
  - `HeroSection.tsx` — hero with stats grid, CTA buttons (replaces old 3D model hero)
  - `AppShowcaseSection.tsx` — iterates APPS with alternating layout
  - `AppDemos.tsx` — VideoDemo, PanoramaDemo, ThreeDDemo interactive components
  - `TestimonialsSection.tsx` — 3-column card grid
  - `PricingSection.tsx` — 3-tier pricing with popular badge (replaces old 4-tier billing-linked pricing)
  - `CTASection.tsx` — final CTA section (replaces old orange CTA)
  - `LandingFooter.tsx` — footer with logo + link columns + bottom bar
  - `LandingPage.tsx` — root assembler with useEffect scroll tracker
  - `LoginModal.tsx` — dialog that routes to `/login` (no fake auth simulation)
- All logo placeholders replaced with real SVG: `/uploads/SLATE 360-Color Reversed Lockup.svg`
- Design system: Dark Glass, Industrial Gold `hsl(45 82% 55%)`, glass card aesthetics throughout

**2. CSS Tailwind v4 utilities registered (`app/globals.css`)**
- Added `@utility bg-glass`, `bg-surface`, `border-glass`, `shadow-glass`, `shadow-gold-glow`
- Fixed missing closing `}` on `.animate-pan-360` (pre-existing bug)

**3. `tsconfig.json` exclude list updated**
- Added `v0-staging` and `app/_deprecated` to exclude (prevents TS errors from staging/legacy files)

**4. SlateDrop external upload security patch → `fix/slatedrop-external-uploads` (committed, NOT merged to main)**
- `lib/uploads/validate-upload-permissions.ts`: `GLOBALLY_BLOCKED_EXTENSIONS` (25 types) + `EXTERNAL_MAX_BYTES` 50MB cap
- `app/api/slatedrop/upload-url/route.ts`: validation moved post-token-resolution; `isExternal: !!publicToken`

### What's Broken / Partially Done
- **CRITICAL**: `market_scheduler_lock` table still has no RLS
- **CRITICAL**: Portal view_count race condition (atomic SQL not deployed yet)
- `fix/slatedrop-external-uploads` — needs merge to main (awaiting review)
- `feature/dashboard-integration` — needs merge to main (Vercel preview auto-deploys from branch)
- Duplicate `STRIPE_WEBHOOK_SECRET` line in `.env` — line 75 missing `whsec_` prefix
- Block Editor is UI-only (no backend persistence yet)
- Rate limiting only on ~5 of 40+ API routes
- Sentry + PostHog + `STRIPE_UPGRADE_LINK` env vars not yet set in Vercel

### Context Files Updated
- `SLATE360_PROJECT_MEMORY.md`: this handoff
- `app/globals.css`: @utility glass rules added + missing brace fixed
- `tsconfig.json`: v0-staging + _deprecated excluded

### Next Steps (ordered)
1. Merge `fix/slatedrop-external-uploads` → main
2. Merge `feature/dashboard-integration` → main
3. **CRITICAL** — Add RLS to `market_scheduler_lock` (deny all except service_role)
2. **CRITICAL** — Deploy atomic `claim_deliverable_view()` RPC to fix portal view_count race.
3. Set Sentry + PostHog + `STRIPE_UPGRADE_LINK` env vars in Vercel.
4. Enable JWT hook in Supabase Dashboard → Auth → Hooks.
5. Add Block Editor backend (save/load deliverables from Supabase).
6. Expand rate limiting to remaining API routes.
7. Add server-side MIME type allowlist to upload route.