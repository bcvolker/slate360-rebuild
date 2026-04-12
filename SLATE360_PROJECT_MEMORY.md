"# Slate360 — Project Memory

Last Updated: 2026-04-11
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

### Session Handoff — 2026-04-12 (Phase 4: Site Walk Field Capture Engine)

### What Changed

**1. Gemini false claims verified AGAIN** — commits 378f1e3, 22d3fa2, 2c99824 all exist in git log. Migrations 000005/000006 both on disk. `grep -n "any" app-checkout` returns exit code 1 (zero matches). Gemini reading stale repo snapshot.

**2. Phase 4 — Site Walk Field Capture Engine** (commit c01938f, pushed)

PWA fixes:
- `app/manifest.ts`: theme_color → #18181b, added 192/512 PNG icon entries, Site Walk shortcut
- `next.config.ts`: Permissions-Policy now `camera=(self), microphone=(self), geolocation=(self)` (was blocking camera/mic)

New routes (5):
- `/site-walk` → project selector with search
- `/site-walk/[projectId]/sessions` → session list + create dialog
- `/site-walk/[projectId]/sessions/[sessionId]` → capture screen (3-tab: Photo/Note/Timeline)
- `/site-walk/[projectId]/sessions/[sessionId]/review` → session review + stats + deliverable creation
- `/site-walk/[projectId]/deliverables/new` → (existing) block editor

New components (8):
- `SiteWalkNav.tsx` (59 lines) — sticky header + bottom nav
- `ProjectSelectorClient.tsx` (64) — project cards with search
- `SessionListClient.tsx` (129) — session list + create dialog, wired to POST /api/site-walk/sessions
- `SessionCaptureClient.tsx` (122) — tab-based capture controller, auto-status draft→in_progress
- `CaptureCamera.tsx` (122) — getUserMedia viewfinder, JPEG capture, GPS overlay badge
- `CaptureTextNote.tsx` (97) — text note with title/description/location, GPS auto-attach
- `ItemTimeline.tsx` (114) — numbered item list with type icons, delete via API
- `SessionReviewClient.tsx` (186) — stats grid, item summary, deliverable list + create button

New hooks (2):
- `useCamera.ts` (81) — getUserMedia, environment-facing, JPEG capture from canvas
- `useGeolocation.ts` (52) — high-accuracy GPS with auto-start

All UI wired to Phase 3 CRUD APIs. Zero any types. All files under 200 lines.

### What's Broken / Partially Done
- PWA icons: manifest references `/uploads/icon-192.png` and `/uploads/icon-512.png` — files need to be generated and placed in `public/uploads/`
- Service worker: NOT implemented yet (Phase 8 per build plan)
- IndexedDB offline queue: NOT implemented yet (Phase 8)
- Speech-to-text / voice notes: NOT implemented yet (Phase 4b)
- Photo blobs created in CaptureCamera are NOT uploaded to S3 — only metadata is saved to items table. Need SlateDrop upload integration to persist actual image files.
- `STRIPE_PRICE_*` env vars for modular plans need to be created in Stripe Dashboard + set in Vercel
- `subscription_status` column on organizations table may not exist — webhook writes it but no migration
- `marketing-homepage.tsx` is 1123 lines — needs extraction
- `market_scheduler_lock` table still has no RLS
- BUG-018: DrawingManager deprecation in LocationMap.tsx (May 2026 deadline)
- Legacy `project_punch_items` table exists with old PunchWalk naming — not migrated yet

### Context Files Updated
- `SLATE360_PROJECT_MEMORY.md`: this handoff

### Next Steps (ordered by priority)
1. Phase 4b: wire CaptureCamera → SlateDrop upload (so photos are persisted to S3, not just metadata)
2. Phase 4b: voice note capture + browser speech-to-text
3. Generate PWA icons (192x192 + 512x512 PNG) and place in public/uploads/
4. Phase 5: Field ↔ Office coordination (assignments, comments, notifications)
5. Create Stripe products/prices for all modular plans
6. Verify `subscription_status` column on organizations table
1. Phase 4 (per master build plan) — next major phase
2. Wire Site Walk UI to new CRUD APIs (components/site-walk/ already has BlockEditor, BlockRenderer, BlockToolbar)
3. Create Stripe products/prices for all modular plans + set `STRIPE_PRICE_*` env vars in Vercel
4. Verify `subscription_status` column exists on organizations table (add migration if not)
5. Migrate legacy `project_punch_items` → `site_walk_items` (data migration)