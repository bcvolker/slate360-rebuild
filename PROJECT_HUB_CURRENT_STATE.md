# PROJECT_HUB_CURRENT_STATE

Date: 2026-02-23  
Scope: Read-only repository audit for Project Hub rebuild preparation.

---

## 1) Database Schema (Projects & SlateDrop)

### 1.1 Table existence check (`projects`, `project_folders`, `project_members`)

### `projects`
- **Referenced in code** (indicates expected runtime existence):
  - `app/api/dashboard/widgets/route.ts`
  - `app/api/account/overview/route.ts`
  - `app/api/slatedrop/project-audit-export/route.ts`
- **Migration evidence in this repo:**
  - No local migration file found creating `projects` (only `supabase/migrations/20260222000000_market_bot_settings.sql` exists, which is legacy).
- **Conclusion:**
  - Table is **expected by application code**, but exact DDL is **not present in this repo’s migrations**.

### `project_folders`
- **Referenced in code**:
  - `app/api/slatedrop/provision/route.ts`
  - `app/api/slatedrop/project-folders/route.ts`
  - `app/api/slatedrop/project-audit-export/route.ts`
- **Migration evidence in this repo:**
  - No local migration file found creating `project_folders`.
- **Conclusion:**
  - Table is **expected by application code**, but exact DDL is **not present in this repo’s migrations**.

### `project_members`
- **Referenced in runtime API code:**
  - No `.from("project_members")` usage found in `app/api/**`.
- **Mentioned only in docs/context files:**
  - `slate360-context/REFACTOR_GUARDRAILS.md`
  - `slate360-context/projecthub4.txt` (commentary/planning text)
- **Conclusion:**
  - No executable evidence in this repo that currently reads/writes `project_members`.

---

### 1.2 Exact columns currently used by code (per table)

Because the DDL is not in local migrations, the list below is the **exact field usage observed in code**.

### `projects` (columns referenced)
- `id`
- `name`
- `project_name`
- `location`
- `city`
- `region`
- `thumbnail_url`
- `cover_image`
- `status`
- `updated_at`
- `created_at`
- `type`
- `project_type`
- `org_id`
- `created_by`

**Where used:**
- `app/api/dashboard/widgets/route.ts` (`select("*")` + field mapping above)
- `app/api/account/overview/route.ts` (`select("id", { count: "exact", head: true })`, filter by `org_id`)
- `app/api/slatedrop/project-audit-export/route.ts` (`select("name")`, filter by `id` + `org_id` or `created_by`)

### `project_folders` (columns referenced)
- `id`
- `name`
- `folder_path`
- `parent_id`
- `is_system`
- `folder_type`
- `is_public`
- `allow_upload`
- `org_id`
- `created_by`

**Where used:**
- `app/api/slatedrop/provision/route.ts` (insert rows with columns above; returns `select("id, name")`)
- `app/api/slatedrop/project-folders/route.ts` (`select("id, name, folder_path, parent_id")`, filters by `parent_id`, `org_id`/`created_by`)
- `app/api/slatedrop/project-audit-export/route.ts` (`select("id, name, folder_path")`, filters by `parent_id`, `org_id`/`created_by`)

### `project_members`
- No column usage found in executable app/API code in this repository.

---

### 1.3 Current 15-folder provisioning flow

**Route:** `app/api/slatedrop/provision/route.ts`  
**Export:** `export async function POST(req: NextRequest)`

**Current behavior:**
1. Authenticates with `createClient()` + `supabase.auth.getUser()`.
2. Reads payload `{ projectId, projectName }`.
3. Resolves `org_id` from `organization_members` (`select("org_id").eq("user_id", user.id).single()`).
4. Creates 15 rows in `project_folders` with:
   - `name`
   - `folder_path = Projects/${projectName}/${name}`
   - `parent_id = projectId`
   - `is_system = true`
   - `folder_type = lowercase_name_with_underscores`
   - `is_public = false`
   - `allow_upload = true`
   - `org_id`
   - `created_by = user.id`
5. Inserts all rows in one call and returns `id, name`.

**Canonical 15 names in code:**
- Documents
- Drawings
- Photos
- 3D Models
- 360 Tours
- RFIs
- Submittals
- Schedule
- Budget
- Reports
- Safety
- Correspondence
- Closeout
- Daily Logs
- Misc

---

## 2) Entitlements & Auth

### 2.1 Entitlements file location and Project Hub access check

- **Requested path:** `src/lib/entitlements.ts`
- **Actual path in this repo:** `lib/entitlements.ts`
- **Key exports:**
  - `export type Tier = ...`
  - `export interface Entitlements`
  - `export function getEntitlements(rawTier?: string | null): Entitlements`

**Project Hub gate pattern:**
- Entitlements model contains `canAccessHub: boolean`.
- `getEntitlements()` returns tier-mapped values from `TIER_MAP`.
- Dashboard tab gating checks `ent.canAccessHub` for `project-hub`.

**Where checked in UI:**
- `components/dashboard/DashboardClient.tsx`:
  - `const ent = getEntitlements(tier);`
  - switch case: `case "project-hub": return ent.canAccessHub;`

---

### 2.2 Server-side `org_id` resolution pattern

**Most common pattern in API routes:**
1. `const supabase = await createClient()` and `user` from `supabase.auth.getUser()`.
2. `const admin = createAdminClient()` (for cross-row access / admin reads).
3. Resolve org membership:
   - `admin.from("organization_members").select("org_id").eq("user_id", user.id).single()`
4. Branch query scope:
   - If `orgId`: filter with `.eq("org_id", orgId)`
   - Else fallback for solo users with `.eq("created_by", user.id)` or `.eq("uploaded_by", user.id)`

**Representative files implementing this pattern:**
- `app/api/slatedrop/project-folders/route.ts`
- `app/api/slatedrop/project-audit-export/route.ts`
- `app/api/slatedrop/files/route.ts`
- `app/api/slatedrop/zip/route.ts`
- `app/api/dashboard/widgets/route.ts`

---

## 3) Existing UI Components & Layouts

### 3.1 Current Project Hub directory

**App route reality in this repo:**
- There is **no** current app route directory like `app/project-hub` or `app/(dashboard)/project-hub`.
- Existing file:
  - `app/features/project-hub/page.tsx` (marketing/feature page)

**Routing alias found:**
- `next.config.ts` redirects `/project-hub` -> `/features/project-hub`.

**Implication for rebuild:**
- True in-app Project Hub route tree still needs to be created.

---

### 3.2 Reusable UI primitives for Modals/Sheets/Forms/Dropdowns

**`components/ui/` inventory:**
- `components/ui/tooltip.tsx`

**Current pattern observed:**
- No centralized `Dialog/Sheet/Select/Form` component set in `components/ui/`.
- Existing modal implementations are mostly local/custom (example: `ModalBackdrop` in `components/slatedrop/SlateDropClient.tsx`).
- Dropdowns/forms are mostly native `select/input` in feature components.

**Conclusion:**
- Reusable modal/sheet/form/dropdown primitives are **minimal** at present.

---

### 3.3 Grid / drag-and-drop libraries for customizable widgets

Checked `package.json` dependencies.

- **Not installed:**
  - `react-grid-layout`
  - `@dnd-kit/*`
  - `react-beautiful-dnd`

**Current widget customization behavior:**
- Dashboard widget ordering/visibility/expand is custom state logic in `components/dashboard/DashboardClient.tsx`.
- No external drag-and-drop/grid layout package currently used.

---

## 4) Storage Pipeline (`lib/slatedrop/storage.ts`)

**Requested path:** `src/lib/slatedrop/storage.ts`  
**Actual path:** `lib/slatedrop/storage.ts`

Confirmed exports exist exactly as follows:
- `export function resolveNamespace(orgId: string | null, userId: string): string`
- `export function buildCanonicalS3Key(namespace: string, folderId: string, filename: string): string`

Current key pattern returned by `buildCanonicalS3Key`:
- `orgs/${namespace}/${folderId}/${Date.now()}_${safeName}`

---

## Bottom Line / Rebuild Readiness Notes

1. Project Hub runtime route tree does not exist yet (only marketing page + redirect alias).
2. `projects` and `project_folders` are actively used by APIs, but DDL is not present in local migrations.
3. `project_members` is not currently used by executable API/UI code.
4. Entitlement gate for Hub is centralized at `lib/entitlements.ts` via `canAccessHub`.
5. Org scoping pattern is consistent across server routes via `organization_members` lookup.

---

## MISSING Dependencies (explicit)

For a robust Project Hub rebuild with modern customizable widget/layout UX, these are currently missing:

- **Drag-and-drop / grid layout library** (none installed):
  - `@dnd-kit/core` + `@dnd-kit/sortable` (recommended), **or**
  - `react-grid-layout`

Potentially useful (optional, not currently present as reusable system):
- Dedicated reusable dialog/sheet/form primitives under `components/ui/` (currently minimal).
