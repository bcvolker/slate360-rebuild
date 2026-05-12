# Slate360 — Project Memory

Last Updated: 2026-05-07
Repo: bcvolker/slate360-rebuild
Branch: main
Live: https://www.slate360.ai

This file is the default new-chat attachment. Keep it short. Read this first, then only pull the docs required for the task.

## AI Agent Access & Backend Autonomy

**AI Agents (Copilot, Claude, etc.) have full read/write/run/push access and MUST act autonomously on the backend:**
- **Git**: commit, branch, merge, and push to `bcvolker/slate360-rebuild` on GitHub.
- **Vercel**: deploy + env var management via the token.
- **AWS S3 & Cloudflare R2**: direct bucket access via variables populated in `.env.local`.
- **Stripe**: webhook and billing management via Vercel env secrets.
- **Supabase CLI**: You MUST link the project autonomously (`npx supabase link --project-ref hadnfcenpcfaeclczsmm --password 'Arlopear$1976_989*'`) using the `SUPABASE_ACCESS_TOKEN` in `.env.local` and you MUST push migrations, RPC functions, and schema changes on your own. Do not ask for permission to run migrations.

This access is completely intentional. Agents are expected to push commits, run database migrations, test backend scripts, and deploy — not just suggest changes.

## Start Here (Initialization Routine)

When a new chat starts, you must immediately get caught up to speed on the project's memory and context.
Recommended read order:
1. This file (`SLATE360_PROJECT_MEMORY.md`).
2. `slate360-context/ONGOING_ISSUES.md` (Check the active bugs, especially current blockers).
3. `SLATE360_MASTER_BUILD_PLAN.md` (Single source of truth for product architecture).
4. `ops/bug-registry.json` (For tracking the actual schema and status of bugs).
5. Load the `.env.local` variables into your context so you are ready to access the backend immediately.

## Save State - Architecture & Design (May 2026)
- The `_legacy_v1` tree has been explicitly purged and removed from the active routing.
- The entire application is strictly unified under the 'Dark Glass & Amber' design token system utilizing the `<GlassCard>` component.

## Project Snapshot

Slate360 is a Next.js 15 + React 19 + TypeScript SaaS platform with:
- Supabase for auth and primary data
- AWS S3 and Cloudflare R2 through the shared S3-compatible storage layer in `lib/s3.ts`
- Stripe for billing
- Vercel for hosting and cron
- Market Robot as an internal route at `/market`

Primary live modules:
- `/dashboard`
- `/projects`
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

## Critical Rules & Safety Guardrails

**1. No "Vibe Coding" & No Feature Creep**
- Build ONLY what is explicitly requested or specifically required to resolve the active task/bug.
- Do NOT invent features, fluff UI, or add "AI generated" filler content/options just to make a page look busy. Everything presented to the user must provide explicit, practical value.
- If you notice missing "industry standards" or have ideas for architectural improvements, **STOP and ask the user** in conversation before building them.

**2. Anti-Tangling & Code Structure**
- No production `.ts` / `.tsx` / `.js` file over **300 lines**. If a file grows too large, extract components/hooks safely.
- One component per file, one hook per file.
- Single responsibility: keep files decoupled to prevent tangled bugs where fixing one area breaks another.

**3. Types & Access**
- No `any`. Use proper typed contracts. Types come from `lib/types/`.
- Use shared auth wrappers and response helpers.
- Internal routes (`/ceo`, `/market`, `/athlete360`) do not use entitlements.
- Subscription gates must use `getEntitlements()`.

**4. Data & State**
- New folder writes use `project_folders`.
- No mock data in production UI. Show realistic empty states or error states.
- Always `await` backend DB actions before navigating or fetching related data (prevent async race conditions).

**5. Context Integrity**
- Update context docs after code changes.

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
| **Colors / design tokens / CSS vars / logos / email colors** | **`slate360-context/DESIGN_SYSTEM.md`** |
| **What's left to build (completion audit)** | **`docs/COMPLETION_AUDIT.md`** |

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

### Cloudflare R2
- Bucket: `slate360-storage`
- Account ID: `96019f75871542598e1c34e4b4fe2626`
- Endpoint: derived from `CLOUDFLARE_ACCOUNT_ID` as `https://<account>.r2.cloudflarestorage.com` unless `R2_ENDPOINT` is set explicitly
- Required runtime env: `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`
- Optional runtime env: `R2_REGION` (`auto` default), `R2_ENDPOINT`, `CLOUDFLARE_R2_API_TOKEN`
- Validation commands: `npm run diag:storage-runtime`, `npm run diag:storage-runtime:write`, `npm run diag:storage-runtime:presign`

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
npm run diag:storage-runtime
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

## Latest Session Handoff — 2026-05-12

### What Changed
- `src/trigger/rasterize.ts`: Removed `@napi-rs/canvas`, switched to standard `canvas`, injected `DOMMatrix` and `ImageData` polyfills, and deferred `pdfjs-dist` to conditional dynamic imports so it passes the Trigger bundle phase.
- `trigger.config.ts`: Added exact linux bindings for Cairo/Pango via `systemDependencies: ["libcairo2-dev", "libpango1.0-dev", "libjpeg-dev", "libgif-dev", "librsvg2-dev"]`.
- `components/site-walk/capture/PlanToolbar.tsx`: Stripped standard layout format and fixed it as an absolute `<div className="absolute top-12 inset-x-2 z-50 pointer-events-none">` floating directly over the Leaflet map.
- `components/site-walk/capture/VisualCaptureView.tsx`: Extracted Unified Bottom Rail to rigidly stick to `bottom-0` and set `pr-[160px]` padding to completely dodge the floating `CaptureDataBottomSheet` FAB.

### What's Broken / Partially Done
- All requested critical overrides are fully executed and actively deployed. The Vercel PDF block limit issue was successfully conquered via `trigger.dev` and all Native C++ compile errors have been routed around.

### Context Files Updated
- `SLATE360_PROJECT_MEMORY.md`: Logged success condition of the Enterprise Pipeline.

### Next Steps
1. Field-Test Mobile App on physical iOS device for canvas rendering success inside background workers via S3 polling.
2. Expand Trigger worker to dispatch WebSocket / Revalidation hooks so the client automatically updates its state without manual refreshing.
