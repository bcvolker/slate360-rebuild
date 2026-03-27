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
| App ecosystem strategy / Stripe / PWA / app stores | `slate360-context/apps/APP_ECOSYSTEM_GUIDE.md` |
| PunchWalk app | `slate360-context/apps/PUNCHWAIK_BUILD_GUIDE.md` |
| **Full ordered build sequence (start here for any new work)** | `slate360-context/MASTER_BUILD_SEQUENCE.md` |
| Revenue math, pricing, timeline, agent collaboration, app store strategy | `slate360-context/REVENUE_ROADMAP.md` |

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

### Session Handoff — 2026-03-28 (Enterprise tier + devcontainer + Stripe CLI + branding features)

#### What Changed
- `.devcontainer/devcontainer.json` (NEW): Devcontainer config for GitHub Codespaces. Uses `mcr.microsoft.com/devcontainers/javascript-node:1-22-bookworm` + `ghcr.io/devcontainers-contrib/features/stripe-cli:1` feature. Forwards port 3000. Runs `post-create.sh` automatically.
- `.devcontainer/post-create.sh` (NEW): Installs Stripe CLI if feature fails, initializes Husky hooks, warns if `.env.local` is missing.
- `.env.example` (NEW): Template for all environment variables. Copy to `.env.local` for local dev.
- `package.json`: Added `stripe:listen` and `stripe:trigger:sub` npm scripts for local webhook testing.
- `slate360-context/dashboard-tabs/tour-builder/BUILD_GUIDE.md`: Major additions — (1) "Logo/Branding Scope" expanded with Phase 2 branding features: nadir/tripod cover (sharp.js server-side compositing), text overlays (scene-level hotspots), default viewing angle (`initial_yaw/pitch/fov` columns), keyframe/intro animation (`intro_animation_json JSONB`), effects (Phase 3). (2) NEW "Enterprise Tier" section with full spec: Meeting Mode (Supabase Realtime sync for coordination meetings), desktop Portal layout, team seat management, white-label, Enterprise prompt sequence J1–J5, go-to-market plan for capital programs / realtor offices.
- `slate360-context/REVENUE_ROADMAP.md`: Added Enterprise pricing tiers (Standalone $49 → Team $149 → Enterprise $499), revised blended scenario showing 51 contracts reaching $7k faster than 68 standalone subscribers, Enterprise math and sales strategy.
- `slate360-context/MASTER_BUILD_SEQUENCE.md`: Added Group J (Enterprise) with J1–J5 prompts, updated total prompt count to ~67, added fastest paths table ("19 prompts to first revenue", "24 prompts to $7k path").

#### Stripe CLI — How to Use in New Codespace
1. Open the Codespace — `post-create.sh` installs Stripe CLI automatically
2. Run `stripe login` once (opens browser for OAuth — required per Codespace)
3. Terminal 1: `npm run dev`
4. Terminal 2: `npm run stripe:listen` (starts webhook forwarding to localhost:3000)
5. Terminal 3: `npm run stripe:trigger:sub` (sends test subscription.created event)
6. Verify in DB that `org_tier` updated correctly → C1 complete

#### Owner Decisions Still Needed
- Confirm scope reduction: pause Geospatial & Robotics / Virtual Studio? archive Athlete360?
- Start beta outreach? Create `BETA50` Stripe coupon (50% off for first 20 subscribers)?
- Confirm Enterprise pricing tiers (Team $149/mo, Enterprise $499/mo recommended)?
- Which enterprise prospect to approach first — capital program dept, realtor office, or GC company?

#### Next Execution Steps (Code — Revenue-First Order)
1. **C1** — `stripe login` + `npm run stripe:listen` + test card `4242 4242 4242 4242` → verify DB tier update
2. **C2** — Create Tour Builder + PunchWalk products in Stripe Dashboard (UI, no code)
3. **C3, C4, C5** — `org_feature_flags` table + entitlement merge + webhook writes flag
4. **Tour Builder D1** — Schema: `project_tours`, `tour_scenes`, `org_storage_usage`, entitlement columns
5. **Tour Builder D2–D8** — CRUD API → upload + validation → builder UI → viewer → branding → publish + embed
6. **Tour Builder E1–E3** — Standalone landing page + Stripe checkout + entitlement gate
7. **Tour Builder J1–J5** — Enterprise: Meeting Mode + Portal + Team seats (run concurrent with outreach)

#### Context Files Updated
- `.devcontainer/devcontainer.json`: created
- `.devcontainer/post-create.sh`: created
- `.env.example`: created
- `package.json`: stripe scripts added
- `slate360-context/dashboard-tabs/tour-builder/BUILD_GUIDE.md`: enterprise + branding
- `slate360-context/REVENUE_ROADMAP.md`: enterprise pricing + blended scenario
- `slate360-context/MASTER_BUILD_SEQUENCE.md`: Group J + updated totals
- `SLATE360_PROJECT_MEMORY.md`: this handoff

### Session Handoff — 2026-03-28 (Tour Builder BUILD_GUIDE expanded + REVENUE_ROADMAP startup pricing + scope reduction)

#### What Changed
- `slate360-context/dashboard-tabs/tour-builder/BUILD_GUIDE.md`: Major expansion — camera/drone format compatibility table (Ricoh Theta, Insta360, GoPro MAX, DJI Osmo 360, DJI drone sphere mode; DJI .DNG rejected); upload validation logic (2:1 aspect ratio + XMP check); mobile upload flow; file size limits per tier (5 GB standalone, 20 GB business); Prompt 7 now includes embed code; embed iframe decisions filled in; "Explicit Non-Goals" recategorized (Google Street View + embed code builder moved from Never to Phase 2); Prompt 3 updated with format validation + quota check + mobile input; Research Intake Template fully filled with competitive landscape (Matterport vs Kuula vs Roundme vs CloudPano), camera format notes, storage tier decisions, UI/UX requirements, embed decisions, and Phase 2 Google Maps notes. Definition of Done and Build Readiness Criteria updated.
- `slate360-context/REVENUE_ROADMAP.md`: Added "Startup Pricing Reality" section — beta pricing ($24/$19 with 50% coupon for first 20 subscribers), free marketing channel playbook (Facebook groups, Capterra, local outreach, Google Maps as growth hack), scope reduction table (Geospatial/Virtual Studio/Athlete360 = pause/archive), 12-month bridge-to-$7k timeline by month.
- `slate360-context/MASTER_BUILD_SEQUENCE.md`: Added "Scope Reduction Consideration" table (Geospatial = pause, Virtual Studio = pause, Athlete360 = archive) with instructions for hiding tabs without deleting files. Owner decision required before acting.

#### Owner Decisions Still Needed
- Confirm scope reduction: pause Geospatial & Robotics tab? pause Virtual Studio tab? archive Athlete360 route?
- Confirm storage tier limits (5 GB standalone is recommended — see BUILD_GUIDE Research Intake)
- Confirm embed code approach (same-origin `/v/[tourSlug]?embed=1` recommended)
- Start beta outreach? Create `BETA50` Stripe coupon?

#### Next Execution Steps (Code — Revenue-First Order)
1. **C1** — Stripe smoke test (test card `4242 4242 4242 4242`, verify webhook updates org tier in DB)
2. **A1** — BUG-018 DrawingManager migration (May 2026 deadline, 3 prompts)
3. **A2 + A3** — BUG-019 + BUG-001 quick fixes
4. **C2–C7** — App foundation (entitlements, `org_feature_flags` table, app pages, checkout funnel)
5. **Tour Builder Prompt 1** — DB schema (`project_tours`, `tour_scenes`, `org_storage_usage` tables)
6. **Tour Builder Prompt 2** — Tour CRUD API
7. **Tour Builder Prompt 3** — Upload pipeline with camera format validation + quota check
8. **Tour Builder Prompts 4–7** — Scene reorder, Pannellum viewer, branding, publish + embed
9. **Tour Builder standalone** — entitlement gating, landing page, Stripe checkout

#### Context Files Updated
- `slate360-context/dashboard-tabs/tour-builder/BUILD_GUIDE.md`: camera formats, embeds, quotas, Research Intake
- `slate360-context/REVENUE_ROADMAP.md`: startup pricing strategy + scope reduction
- `slate360-context/MASTER_BUILD_SEQUENCE.md`: scope reduction table
- `SLATE360_PROJECT_MEMORY.md`: this handoff

#### Commits
- `e62c822` — docs: Tour Builder BUILD_GUIDE camera/drone formats, embed code, quota data model, Research Intake filled; REVENUE_ROADMAP startup pricing strategy + scope reduction; MASTER_BUILD_SEQUENCE scope reduction table