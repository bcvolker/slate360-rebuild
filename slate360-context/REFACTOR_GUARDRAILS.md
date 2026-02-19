# Refactor Guardrails

> **Purpose:** Hard rules for any AI assistant, contractor, or developer performing refactors on Slate360.  
> Violating these rules leads to schema drift, duplicated logic, and broken production flows.  
> **This document is enforced — not advisory.**

---

## Rule 0 — Source of Truth

Before writing ANY code, read and cite from these canonical sources:

| What | Where |
|---|---|
| Full platform spec (all tabs, schemas, flows) | `Slate360History/MASTER_DOCUMENT.md` |
| Backend infrastructure (actual DB tables, S3 keys, env vars) | `Slate360History/BACKEND_INFRASTRUCTURE_REFERENCE.md` |
| Individual tab specs | `Slate360History/00_*.md` through `Slate360History/18_*.md` |
| UX/redesign guardrails | `docs/REDESIGN_GUARDRAILS_AND_MODULE_MAP.md` |
| SlateDrop canonical model | `docs/SLATEDROP_CANONICAL_MODEL.md` |
| Entitlements gap analysis | `docs/ENTITLEMENTS_GAP_ANALYSIS_20260116.md` |
| Subscription tiers reference | `docs/SUBSCRIPTION_TIERS_AND_ENTITLEMENTS.md` |

**Rule:** If you cannot find it documented above, **ask** — do not guess or invent.

---

## Rule 1 — Do Not Invent DB Columns or Tables

The authoritative list of tables lives in `Slate360History/15_Tech_Stack_Architecture.md` (§3 Key Tables) and `Slate360History/BACKEND_INFRASTRUCTURE_REFERENCE.md`.

### Known Tables (verified in Supabase)

**Core:** `profiles`, `organizations`, `org_members`  
**Projects:** `projects`, `project_members`, `rfis`, `submittals`, `change_orders`, `daily_logs`, `inspections`  
**SlateDrop:** `project_folders`, `unified_files`, `file_versions`, `file_shares`, `file_links`, `shared_links`, `folder_permissions`, `file_move_history`, `filing_rules`  
**Budget/Schedule:** `budget_versions`, `budget_line_items`, `budget_change_orders`, `budget_commitments`, `schedule_versions`, `schedule_tasks`, `schedule_milestones`  
**Credits:** `credits`, `credit_transactions`, `credit_packs`, `credit_purchases`, `org_usage`, `org_usage_events`, `tier_limits`  
**Integrations:** `organization_integrations`, `user_integrations`, `integration_oauth_states`, `integration_activity_log`, `integration_webhooks`  
**Platform:** `notifications`, `feature_suggestions`, `tours`, `ceo_access`, `audit_log`, `api_keys`, `feature_flags`, `beta_testers`

### Violations

- ❌ Adding a column to `organizations` without documenting it
- ❌ Creating a table like `user_settings_v2` alongside `profiles`
- ❌ Using raw SQL in an API route to CREATE TABLE
- ❌ Referencing a column name that doesn't exist in the table

### Correct Process

1. Check the tables listed above and in `BACKEND_INFRASTRUCTURE_REFERENCE.md`
2. If a new column or table is genuinely needed, document it in `Slate360History/` first
3. Create a Supabase migration file under `supabase/migrations/`
4. Update `BACKEND_INFRASTRUCTURE_REFERENCE.md` and regenerate the master doc

---

## Rule 2 — Do Not Create Parallel Supabase Clients

Slate360 has **exactly three** Supabase client factories. Use them. Do not create more.

| Client | File | When to Use |
|---|---|---|
| **Browser** | `src/lib/supabase/client.ts` | Client components (`'use client'`), hooks, event handlers |
| **Server SSR** | `src/lib/supabase/server.ts` | Server components, API routes (respects RLS via cookies) |
| **Admin** | `src/lib/supabase/admin.ts` | Webhooks, cron jobs, migrations (bypasses RLS with service role key) |

### Violations

- ❌ `import { createClient } from '@supabase/supabase-js'` — raw client creation anywhere outside the three files above
- ❌ `createServerClient(...)` called inline in an API route instead of importing from `server.ts`
- ❌ Creating `src/lib/supabase-new.ts`, `src/utils/db.ts`, or any new Supabase wrapper
- ❌ Hardcoding `SUPABASE_URL` or `SUPABASE_ANON_KEY` in a component file

### Known Violations to Consolidate (do NOT add more)

| File | Violation | Should Use |
|---|---|---|
| `src/app/api/projects/[projectId]/submittals/[submittalId]/route.ts` | Direct `createClient` from `@supabase/supabase-js` | `@/lib/supabase/server` |
| `src/app/api/projects/[projectId]/observations/route.ts` | Direct `createClient` from `@supabase/supabase-js` | `@/lib/supabase/server` |
| `src/app/api/projects/[projectId]/tracking/route.ts` | Direct `createClient` from `@supabase/supabase-js` | `@/lib/supabase/server` |
| `src/app/auth/confirm/route.ts` | Own `getSupabaseAdmin()` inline | `@/lib/supabase/admin` |
| `src/lib/supabase/server.ts` | Duplicate `createAdminClient()` | Remove — use `admin.ts` only |
| `src/app/api/upload/complete/route.ts` | Inline `requireAuth()` + `verifyOrgMembership()` | `@/lib/auth/requestAuth` |

### Auth Helpers

| Helper | Import | Purpose |
|---|---|---|
| `requireAuth()` | `@/lib/auth/requireAuth` | Verify JWT, return user — 401 if unauthenticated |
| `verifyOrgMembership()` | `@/lib/auth/verifyOrgMembership` | Confirm org access, return org with tier — 403 if unauthorized |

**Every API route** must call `requireAuth()` then `verifyOrgMembership()` before any business logic. No exceptions.

---

## Rule 3 — No New Folder Creation Code Paths

SlateDrop folder provisioning **must** go through one consolidated path:

### Canonical Flow

```
Project Creation Wizard (UI)
  → POST /api/projects          (creates project row)
  → Folder provisioning logic   (creates S3 keys + slatedrop_folders rows)
```

### S3 Key Pattern

```
uploads/{orgId}/{projectId}/{folderPath}/{uuid}-{fileName}
```

### Standard Subfolders (per project type)

```
RFIs/  Submittals/  Change-Orders/  Daily-Logs/  Photos/  Photos/Aerial/
Photos/360-Tours/  Plans-Drawings/  Specifications/  Contracts/
Correspondence/  Closeout/  Videos/Raw/  Videos/Exports/
```

### Violations

- ❌ Writing a second function that creates S3 folder keys (e.g., in a Design Studio route)
- ❌ Hardcoding folder paths like `uploads/${orgId}/my-new-folder/` in an API route
- ❌ Creating folders in S3 without corresponding `slatedrop_folders` table rows
- ❌ Using a different key pattern (e.g., `files/` instead of `uploads/`)

### Known Duplication to Consolidate (do NOT add more)

| Location | What It Does | Consolidate To |
|---|---|---|
| `src/app/api/auth/complete-signup/route.ts` | Inline folder INSERT loop during signup | `ensureOrgSystemFolders()` from `folders.server.ts` |
| `src/app/api/projects/create/route.ts` (1243 lines) | `createSlateDropFolders()` inline | `ensureProjectFolderTree()` from `folders.server.ts` |
| `src/app/api/slatedrop/provision-system-folders/route.ts` | Parallel provisioning route | Should defer to `ensureOrgSystemFolders()` |
| `src/lib/entitlements/tiers.ts` | **Duplicate** `getOrgSystemFolderSpecs()` + `getDefaultProjectSubfolderNames()` | Remove — use `src/lib/slatedrop/folder-specs.ts` only |
| `src/app/(dashboard)/dashboard/page.tsx` | "Safety net" client-side folder trigger | Should call `/api/slatedrop/ensure-system-folders` once |
| `src/lib/slatedrop-folders.ts` (642 lines) | Client-side `TAB_FOLDERS`, `PROJECT_TEMPLATE_FOLDERS` | Should reference `folder-specs.ts` constants |

### Correct Process

- If a new subfolder is needed, add it to the **existing** provisioning function
- Document the new subfolder in `Slate360History/06_SlateDrop_File_System.md`
- Regenerate the master doc: `npm run docs:master`

---

## Rule 4 — No New Entitlement System

The entitlement/tier-gating system is already built. Do not create a parallel one.

### Canonical Files

| File | Lines | Purpose |
|---|---|---|
| `src/lib/entitlements.ts` | ~624 | Feature → tier mapping, `canAccess(tier, feature)` |
| `src/lib/entitlements/tiers.ts` | ~207 | Tier definitions, hierarchy, limits |
| `src/components/guards/TierGuard.tsx` | ~190 | React gate component |

### Usage Pattern

```tsx
import { TierGuard } from '@/components/guards/TierGuard';

<TierGuard
  feature="projectHub.schedule.gantt"
  fallback={<UpgradePrompt feature="Gantt Scheduling" requiredTier="model" />}
>
  <GanttChart project={project} />
</TierGuard>
```

### Server-Side Check

```typescript
import { canAccess } from '@/lib/entitlements';

const org = await verifyOrgMembership(user);
if (!canAccess(org.tier, 'projectHub.schedule.gantt')) {
  return NextResponse.json({ error: 'Upgrade required' }, { status: 403 });
}
```

### Tier Resolution

- **Always** from `organizations.tier` column via `verifyOrgMembership()`
- **Never** from request body, localStorage, cookies, or URL params
- Normalize: `tier === 'free' || !tier ? 'trial' : tier`

### Violations

- ❌ Creating `src/lib/permissions.ts` or `src/lib/access-control.ts`
- ❌ Inline tier checks like `if (user.tier === 'business')` without using `canAccess()`
- ❌ Defining feature flags in a component file instead of `entitlements.ts`
- ❌ Reading tier from `req.body.tier` or `searchParams.get('tier')`

---

## Rule 5 — No Orphan API Routes

### Route Pattern

All API routes live under `src/app/api/` and follow this structure:

```typescript
export async function POST(req: NextRequest) {
  // 1. Auth
  const user = await requireAuth(req);
  const org = await verifyOrgMembership(user);

  // 2. Input validation (Zod)
  const body = schema.parse(await req.json());

  // 3. Entitlement check (if gated)
  if (!canAccess(org.tier, 'feature.name')) {
    return NextResponse.json({ error: 'Upgrade required' }, { status: 403 });
  }

  // 4. Business logic
  // ...

  // 5. Return
  return NextResponse.json({ data });
}
```

### Violations

- ❌ API route without `requireAuth()` (unless it's a public endpoint like webhooks)
- ❌ API route without input validation
- ❌ Catching errors silently (`catch (e) { return NextResponse.json({}) }`)
- ❌ Creating routes outside `src/app/api/`

---

## Enforcement Checklist (for PR Reviews)

Before merging any refactor PR, verify:

- [ ] No new Supabase client files created
- [ ] No new tables or columns without migration + docs update
- [ ] No new `createClient()` calls outside the three canonical files
- [ ] No hardcoded tier checks — uses `canAccess()` or `TierGuard`
- [ ] No new folder creation logic — uses existing provisioning
- [ ] All API routes have `requireAuth()` + `verifyOrgMembership()`
- [ ] `MASTER_DOCUMENT.md` regenerated if any `Slate360History/` file changed
- [ ] No `console.log` left in production code (use structured logging)

---

## Related Documents

- [REDESIGN_GUARDRAILS_AND_MODULE_MAP.md](REDESIGN_GUARDRAILS_AND_MODULE_MAP.md) — UX/redesign rules
- [SLATEDROP_CANONICAL_MODEL.md](SLATEDROP_CANONICAL_MODEL.md) — SlateDrop data model
- [SUBSCRIPTION_TIERS_AND_ENTITLEMENTS.md](SUBSCRIPTION_TIERS_AND_ENTITLEMENTS.md) — Tier definitions
- [ENTITLEMENTS_GAP_ANALYSIS_20260116.md](ENTITLEMENTS_GAP_ANALYSIS_20260116.md) — Known gaps

---

*Last updated: 2026-02-12. Cite `Slate360History/MASTER_DOCUMENT.md` and `Slate360History/BACKEND_INFRASTRUCTURE_REFERENCE.md` as your primary references.*
