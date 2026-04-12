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

### Session Handoff — 2026-04-12 (Phase 6: Site Walk Operations Completeness)

### What Changed

**Gemini feedback (4th round):** Same pattern — all commits verified on disk (0c9d8e5, aa4b64b in git log), migration 000007 exists (4827 bytes), zero `any` in app-checkout (exit code 1). Gemini's claimed "corrective" files (20240325000000, 20240326000000) do not exist on disk. Gemini is reading a stale snapshot.

**Phase 6 — Site Walk Operations Completeness** (commit a6c556d, pushed)

Migrations (both applied to Supabase):
- `20260412000008_item_workflows_signatures.sql`: Added to site_walk_items: workflow_type (general/punch/inspection/proposal), item_status (open/in_progress/resolved/verified/closed/na), priority, assigned_to, due_date, resolved_by/at, verified_by/at, cost_estimate, manpower_hours, before_item_id. Added to site_walk_sessions: client_signature_s3_key, inspector_signature_s3_key, signed_at, signed_by.
- `20260412000009_plans_pins_templates.sql`: Created site_walk_plans (floor plan images), site_walk_pins (x/y% positioned pins on plans), site_walk_templates (reusable checklists with typed entries). All with RLS.

New API routes (12):
- `items/[id]` PATCH extended with all workflow fields
- `items/[id]/resolve/route.ts`, `items/[id]/verify/route.ts` — status lifecycle
- `items/bulk/route.ts` — bulk update up to 100 items
- `sessions/[id]/sign/route.ts` — capture signatures
- `plans/route.ts` (GET/POST), `plans/[id]/route.ts` (DELETE)
- `pins/route.ts` (GET/POST), `pins/[id]/route.ts` (DELETE)
- `templates/route.ts` (GET/POST), `templates/[id]/route.ts` (PATCH/DELETE)
- `templates/[id]/apply/route.ts` — apply template to session (creates items)

New UI components (3):
- `WorkflowItemCard.tsx` (190 lines) — status/priority dropdowns, resolve/verify buttons, cost/assignee/due-date metadata
- `PlanViewer.tsx` (159 lines) — image overlay with status-colored pins, click-to-place, pin tooltips
- `TemplateManager.tsx` (196 lines) — create/list/apply/delete templates with checklist builder

Types extracted: `lib/types/site-walk-ops.ts` (97 lines) for Plan/Pin/Template types, re-exported from `site-walk.ts` (250 lines)

Migration `20260412000007_site_walk_comments_assignments.sql` — applied to Supabase:
- `site_walk_comments` table: threaded (parent_id), session/item-level, `is_field` flag, `read_by uuid[]` for read receipts, `is_escalation`, org RLS
- `site_walk_assignments` table: assigned_by/to, priority (low/medium/high/critical), status workflow (pending→acknowledged→in_progress→done|rejected), auto-timestamps, org RLS

New API routes (6):
- `app/api/site-walk/comments/route.ts` — GET (filter by session_id + item_id), POST
- `app/api/site-walk/comments/[id]/route.ts` — DELETE (author only)
- `app/api/site-walk/comments/[id]/read/route.ts` — POST (mark as read, appends to read_by array)
- `app/api/site-walk/assignments/route.ts` — GET (filter by session_id + assigned_to), POST
- `app/api/site-walk/assignments/[id]/route.ts` — GET, PATCH (auto-timestamps on acknowledge/done), DELETE (assigner only)
- `app/api/site-walk/board/route.ts` — GET enriched sessions (item_count, open_assignments, escalation_count)

New components (3):
- `CommentThread.tsx` (148 lines) — threaded comments with field/office badges, escalation highlight, read receipts, send/escalate buttons
- `AssignmentPanel.tsx` (221 lines) — assignment list with create form, priority badges, status pills, action buttons (Ack/Start/Done), split by "Assigned to You" vs others
- `SessionBoardClient.tsx` (96 lines) — leadership board showing active sessions with item counts, open assignments, escalation badges

Modified files (3):
- `SessionReviewClient.tsx` — added tabbed coordination section (Comments | Assignments) integrated with CommentThread + AssignmentPanel
- `review/page.tsx` — now passes userId + orgMembers (fetched from profiles table) to SessionReviewClient
- `lib/types/site-walk.ts` — added SiteWalkComment, SiteWalkAssignment, CreateCommentPayload, CreateAssignmentPayload, UpdateAssignmentPayload, AssignmentPriority, AssignmentStatus

New route: `/site-walk/board` — board page for leadership overview

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
1. Phase 7: Deliverable generation — report templates, PDF export, branding, sharing
2. Phase 4b: wire CaptureCamera → SlateDrop upload (photos to S3)
3. Phase 4b: voice note capture + browser speech-to-text
4. Generate PWA icons (192x192 + 512x512 PNG) and place in public/uploads/
5. Create Stripe products/prices for all modular plans
6. Verify `subscription_status` column on organizations table
4. Verify `subscription_status` column exists on organizations table (add migration if not)
5. Migrate legacy `project_punch_items` → `site_walk_items` (data migration)