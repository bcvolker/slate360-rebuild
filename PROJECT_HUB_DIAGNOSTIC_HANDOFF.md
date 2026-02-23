# Project Hub / SlateDrop Diagnostic Handoff (Feb 23, 2026)

## 1) Current User-Visible Failures

- Project Hub carousel projects and SlateDrop project tree do not always match.
- Some projects appear undeletable (Project Hub delete modal returns 500; SlateDrop project delete behaves inconsistently).
- Clicking a project card sometimes does not open expected Project Hub detail views.
- Project Hub appears mostly blank / missing modules in some sessions.
- Project folder substructure (canonical 15 folders) is missing for some projects.
- Historic reports indicated deployed changes appeared not to take effect.

---

## 2) Source-of-Truth Contract (Required Architecture)

To make Project Hub stable, all project surfaces MUST share one canonical source:

1. **Canonical entities**
   - `projects` (primary)
   - `project_members` (membership)
   - `project_folders` (canonical sandbox folders)

2. **Canonical project read path**
   - Shared helper: `lib/projects/access.ts`
   - Functions:
     - `resolveProjectScope(userId)`
     - `listScopedProjectsForUser(userId)`
     - `getScopedProjectForUser(userId, projectId, selectClause)`

3. **Canonical list APIs**
   - `GET /api/projects` (Project Hub carousel)
   - `GET /api/projects/sandbox` (SlateDrop project tree)

4. **Canonical delete path**
   - `DELETE /api/projects/[projectId]`
   - All project-node deletion in SlateDrop should call this endpoint.

5. **Canonical folder provisioning**
   - `lib/slatedrop/provisioning.ts`
   - Must insert into `project_folders.project_id` (NOT `parent_id`)

---

## 3) Root Causes Found So Far

### A. Schema/column mismatches
- Production `project_folders` links to projects via `project_id`.
- Prior code used `parent_id` for project linkage in multiple routes.
- Result: empty folder trees, failed delete cleanup, failed renames, broken sandbox parity.

### B. Membership insert mismatch on create
- Code inserted `project_members.role`; production schema uses `role_id`.
- Result: project create failed / rolled back.

### C. Delete 500 due to non-cascading FKs
- Some tables referencing `projects.id` have `NO ACTION` delete rules.
- Confirmed blockers include:
  - `unified_files.project_id`
  - `file_folders.project_id`
- Result: project delete returned 500 even when most dependencies cascade.

### D. Multiple project access paths with inconsistent scoping
- Some server pages queried `projects` directly with different scope behavior.
- Result: cards visible but detail pages not found (or blank states) for certain users/projects.

### E. Legacy/partial folder state
- Some projects had missing canonical folder structures.
- Result: mismatch between Hub and SlateDrop structures; undeletable perception when data incomplete.

### F. Project creation rollback edge case (fixed in this pass)
- For org-less users, rollback deletion used `eq("org_id", null)` and could fail to clean up.
- Result: potential orphan/ghost projects after create failure.

---

## 4) Attempted Solutions Timeline (What Has Been Tried)

Recent commits and intent:

- `ef65ec6` — Wizard/theme/maps updates and direct provisioning changes.
- `93f6de3` — Dependency install (`react-grid-layout`, `react-pdf`).
- `0676a3a` — Move provisioning helper, fix imports, middleware `/project-hub` auth guard.
- `ecaa819` — Added migration for `project_folders`, hardened routes, better logs.
- `9d494c3` — Critical `project_folders` column fix (`parent_id` -> `project_id`).
- `5a096dd` — Unblocked create + added project folder repair/backfill migration.
- `306b72f` — Unified project source, fixed open/delete flow, cleaned delete blockers.
- **Current working tree (not yet committed at time of this doc generation):**
  - Hardened create rollback logic for org-less users in `app/api/projects/create/route.ts`.
  - Migrated deprecated map APIs in `components/dashboard/LocationMap.tsx` (see section 8).

### Attempted Fix Matrix (include failures)

| Attempt | Intent | Outcome | Why it did not fully resolve |
|---|---|---|---|
| Provisioning helper relocation/import fixes | Ensure folder provisioning runs | Partial | Did not address DB schema mismatch (`parent_id` vs `project_id`) |
| Added `/project-hub` middleware guard | Ensure auth/session on route | Partial | Auth routing fixed, but CRUD still broken by DB/data issues |
| Added `project_folders` migration | Ensure table exists | Partial | Production already had divergent schema; migration assumptions were wrong |
| Route try/catch hardening | Prevent hard crashes | Partial | Masked failures but did not repair underlying data model mismatch |
| `parent_id` -> `project_id` code sweep | Align with production schema | Major improvement | Existing missing-folder projects still needed backfill |
| Project folder repair/backfill SQL | Restore folder structures | Partial | Some UI paths still read projects via inconsistent sources |
| Unified scoped project helper (`lib/projects/access.ts`) | Single source for Hub/SlateDrop | Major improvement | Secondary sources (dashboard widgets, demo local client state) could still confuse visibility |
| Delete cleanup for NO ACTION FK tables | Stop delete 500 | Major improvement | Additional hidden constraints/data can still fail deletes without detailed error traces |
| Create flow `role` -> `role_id` fix | Stop membership insert failure | Major improvement | Rollback path for org-less users still had edge case until later fix |
| Create rollback hardening (org-less) | Prevent orphan/ghost projects | Improvement | Needs production validation under failure injection |
| Maps deprecation migration in dashboard map | Remove warning noise and unstable APIs | Improvement | Not a root cause for Project Hub CRUD mismatch |
| SlateDrop demo fallback removal (in progress) | Prevent local/demo state from masking backend truth | Improvement | Full backend folder CRUD parity still pending (create/rename/delete folder APIs) |

---

## 5) Verified Files That Control Project Hub Behavior

### Core API surface
- `app/api/projects/route.ts`
- `app/api/projects/create/route.ts`
- `app/api/projects/sandbox/route.ts`
- `app/api/projects/[projectId]/route.ts`
- `app/api/projects/[projectId]/recent-files/route.ts`

### Project Hub UI and details
- `app/(dashboard)/project-hub/page.tsx`
- `app/(dashboard)/project-hub/[projectId]/layout.tsx`
- `app/(dashboard)/project-hub/[projectId]/page.tsx`
- `app/(dashboard)/project-hub/[projectId]/{files,photos,drawings,budget,schedule,daily-logs,punch-list}/page.tsx`
- `components/project-hub/{CreateProjectWizard,ProjectDashboardGrid,PhotoLogClient,DrawingsViewerClient}.tsx`

### SlateDrop project tree
- `components/slatedrop/SlateDropClient.tsx`
- `app/slatedrop/page.tsx`
- `app/api/slatedrop/project-folders/route.ts`
- `app/api/slatedrop/project-audit-export/route.ts`

### Shared source-of-truth helper
- `lib/projects/access.ts`
- `lib/slatedrop/provisioning.ts`

---

## 6) Conflict Scan Results (Potential Remaining Conflicts)

### Confirmed no duplicate Project Hub route implementations
- Only one route-group implementation exists at `app/(dashboard)/project-hub/**`.
- No shadow `app/project-hub` duplicate route found.

### Confirmed possible *secondary* project source outside Hub/SlateDrop
- `components/dashboard/LocationMap.tsx` loads projects from `GET /api/dashboard/widgets`.
- `app/api/dashboard/widgets/route.ts` uses its own scope/filter path and formatting.
- This can create **perception mismatch** (dashboard widgets vs hub/slatedrop), even if Hub itself is correct.

### SlateDrop still includes demo-only local UX data
- Historical issue: `components/slatedrop/SlateDropClient.tsx` included demo file arrays and local folder tree mutation utilities.
- This could obscure debugging if mixed with live API state.
- Current direction is to remove fallback demo file state and disable local-only folder mutations until backend folder CRUD is fully unified.

---

## 7) Data/DB Checks Another Assistant Should Run Immediately

### Check project consistency and folder existence
```sql
-- Projects visible by org
select id, org_id, created_by, name, created_at
from public.projects
order by created_at desc
limit 100;

-- Folder counts by project
select p.id, p.name, count(f.id) as folder_count
from public.projects p
left join public.project_folders f on f.project_id = p.id
group by p.id, p.name
order by p.created_at desc;
```

### Check delete blockers still present
```sql
select tc.table_name, kcu.column_name, rc.delete_rule
from information_schema.table_constraints tc
join information_schema.key_column_usage kcu
  on tc.constraint_name = kcu.constraint_name and tc.table_schema = kcu.table_schema
join information_schema.referential_constraints rc
  on tc.constraint_name = rc.constraint_name and tc.table_schema = rc.constraint_schema
where tc.table_schema = 'public'
  and tc.constraint_type = 'FOREIGN KEY'
  and rc.unique_constraint_name in (
    select constraint_name
    from information_schema.table_constraints
    where table_schema = 'public' and table_name = 'projects' and constraint_type = 'PRIMARY KEY'
  )
order by tc.table_name;
```

### Check project membership insertion compatibility
```sql
select column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'public' and table_name = 'project_members'
order by ordinal_position;
```

---

## 8) Maps Deprecation Migration Done In This Pass

File changed: `components/dashboard/LocationMap.tsx`

- Replaced deprecated marker usage with `AdvancedMarker`.
- Removed deprecated drawing library load from `APIProvider`.
- Removed `AutocompleteService` usage (deprecated for new customers).
- Replaced autocomplete suggestions with Geocoding API suggestions.

Notes:
- Drawing tool UI currently depends on Google DrawingManager behavior; with drawing library no longer loaded, drawing actions no-op safely instead of using deprecated API.
- If full markup tooling is still required, re-implement drawing via custom overlays (Polyline/Polygon/Rectangle/Circle components) rather than Drawing library.

---

## 9) Highest-Value Next Debug Steps (for another AI assistant)

1. Add an automated integration test matrix for:
   - create project
   - auto-provision 15 folders
   - open project detail pages
   - delete project from hub and slatedrop
2. Normalize every project read in dashboard widgets to `lib/projects/access.ts`.
3. Remove or clearly gate demo data in `SlateDropClient` to avoid mixed-state confusion.
4. Add explicit structured logging payloads for all project CRUD errors (`projectId`, `userId`, `orgId`, DB error code/message).
5. Add an idempotent maintenance endpoint or job that backfills missing canonical folders for any project with `folder_count = 0`.

---

## 10) Summary for Handoff

The dominant pattern behind the failures has been **schema drift + inconsistent source paths**. Project Hub and SlateDrop must continue to be pinned to the same scoped project APIs and helper (`lib/projects/access.ts`), and delete/create must stay aligned with production DB constraints (`project_id`, `role_id`, NO ACTION cleanup). The remaining risk is secondary views (dashboard widgets/demo paths) surfacing a different project subset and creating the appearance that "nothing matches".

---

## 11) Direct Request For Other AI Assistants

If you are another AI assistant reading this, please help with root-cause isolation, not just surface patches.

1. **Verify DB truth first**
  - Confirm `projects`, `project_members`, `project_folders` schema and FK delete rules in the active environment.
  - Confirm row-level data integrity for each failing project ID.

2. **Trace one failing project end-to-end**
  - Project appears in Hub carousel?
  - Project appears in SlateDrop sandbox tree?
  - Project detail route opens?
  - Project delete API response/error detail?
  - Folder count for that project and folder path quality?

3. **Assume prior fixes may be partially correct but incomplete**
  - Do not revert to older assumptions (`parent_id` as project FK, `role` vs `role_id`).
  - Validate with live schema before changing code.

4. **Prioritize these remaining unknowns**
  - Any secondary project sources still bypassing `lib/projects/access.ts`
  - Any local/demo client state still overriding API-backed state
  - Any hidden FK/trigger/policy side-effects causing delete/create divergence

5. **Report back with evidence**
  - Exact failing query/constraint/policy, affected file(s), and minimal reproducible path.
  - Avoid generic “works locally” conclusions; include environment-specific proof.
