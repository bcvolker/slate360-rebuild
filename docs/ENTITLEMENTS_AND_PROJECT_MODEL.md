# Entitlements, Projects, and Field Projects

**Created:** 2026-05-02  
**Status:** LOCKED — This is the authoritative source for project model decisions and entitlement logic.

---

## 1. The Decision: One Table, Two Types

Field Projects and full Projects share the **same `projects` database table**.

This is the most important architecture decision in the platform. Here is why:

| Option | Pros | Cons |
|---|---|---|
| Separate `field_projects` table | Isolated schema, clean reads for each type | Two tables to query everywhere, complex upgrade path (copy rows + re-FK all child records), all queries need to union both |
| Same table + `project_type` enum | Single query pattern, trivial upgrade (UPDATE one column), all FK references stay in place, SlateDrop paths unified | Slightly more careful validation that lower-tier users can't create `'full'` records |

**Decision: Same table. `projects.project_type` column: `'field' | 'full'`.**

A Field Project is nothing more than a Project with `project_type = 'field'` and a tier gate that prevents lower-tier users from creating `project_type = 'full'`. Upgrading a Field Project to a full Project is a single `UPDATE projects SET project_type = 'full'`.

---

## 2. The Projects Table Model

### Required Column Additions (migration needed)

```sql
ALTER TABLE projects 
  ADD COLUMN IF NOT EXISTS project_type TEXT NOT NULL DEFAULT 'field'
    CHECK (project_type IN ('field', 'full')),
  ADD COLUMN IF NOT EXISTS converted_from_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS converted_at TIMESTAMPTZ;

-- Index for fast type-filtered queries
CREATE INDEX IF NOT EXISTS idx_projects_project_type ON projects(project_type);
CREATE INDEX IF NOT EXISTS idx_projects_org_id_type ON projects(org_id, project_type);
```

`converted_from_id` tracks the lineage when a Field Project is upgraded to a full Project. `converted_at` timestamps the conversion.

### What Field Projects Include

When `project_type = 'field'`:
- Name, location, scope, client/site info
- Contacts (from `org_contacts`, project-specific)
- Plans (from `site_walk_plan_sets` / `site_walk_plan_sheets`)
- Site Walk sessions (`site_walk_sessions.project_id`)
- Site Walk photos/videos/notes (`site_walk_items`)
- Site Walk deliverables (`site_walk_deliverables`)
- Collaborator submissions (limited seats)
- Basic assignments and comments
- SlateDrop: `Field Projects/{id}/Site Walk/` folder tree
- Org branding applied to deliverables

When `project_type = 'field'`, the following are NOT available (no DB rows, no routes, no UI):
- Formal schedule tables (Gantt, milestone tracker)
- Budget/cost management
- RFIs and submittals
- Formal closeout workflows
- Cross-app folder tree (`360 Tours/`, `Design Studio/`, etc.)
- Organization-wide reporting and executive dashboards

### What Full Projects Add

When `project_type = 'full'`:
- Everything in Field Projects, plus:
- Schedules, milestones, Gantt
- Budget/cost management
- RFIs and submittals
- Formal closeout folder and exports
- Full SlateDrop project folder tree (all app sub-folders)
- Cross-app integrations (360 Tours, Design Studio, Content Studio) where subscribed
- Broader collaborator permissions (Project Manager, Contributor roles)
- Organization-level reporting

---

## 3. Entitlement Gate for Project Type

The entitlement check for project creation lives in server-side code only, never client-side.

```typescript
// lib/project-access.ts (to be created)
export function canCreateFullProject(tier: Tier, isSlateCeo: boolean): boolean {
  if (isSlateCeo) return true;
  return tier === "business" || tier === "enterprise";
}

export function canCreateFieldProject(tier: Tier): boolean {
  // All tiers including trial can create field projects
  return true;
}
```

UI enforcement:
- Standard/Trial subscribers: "New Field Project" button; no "New Project" button visible
- Business/Enterprise subscribers: choice sheet shown: "Field Project" or "Full Project"
- Collaborators: no project creation; button hidden

API enforcement:
- `POST /api/projects` route: check `canCreateFullProject()` before allowing `project_type = 'full'`
- Return `403` with upgrade prompt if attempting to create `'full'` without entitlement

---

## 4. Field Project → Full Project Upgrade Path

Field Projects can be upgraded to full Projects without data loss.

### Upgrade Flow (UI)
1. User taps "Upgrade Project" on a Field Project card (shown to users when they reach Business tier)
2. Confirmation modal: "This will unlock full PM tools for [project name]. All existing walks, photos, plans, and deliverables are preserved."
3. Server: `UPDATE projects SET project_type = 'full', converted_from_id = id, converted_at = NOW()`
4. SlateDrop: auto-generate the additional project sub-folders (`360 Tours/`, `Design Studio/`, etc.) for the newly-full project
5. No data is moved or migrated — it was in the same table all along

### What Stays the Same
- All `site_walk_sessions` referencing this `project_id` — unchanged
- All `site_walk_items` referencing sessions — unchanged
- All `site_walk_deliverables` — unchanged
- All SlateDrop files at `Field Projects/{id}/` — still there (optionally move to `Projects/{id}/`)
- All contacts, collaborators, plans — unchanged

### SlateDrop Path on Upgrade (optional migration)
The SlateDrop path can be optionally updated from `Field Projects/{id}/` to `Projects/{id}/` on upgrade, with redirects for existing share links. This is not required for data integrity — it is a cosmetic organization improvement.

---

## 5. Entitlements Architecture

### Current Tiers (from `lib/entitlements.ts`)
```
trial → standard → business → enterprise
```

Legacy tier names (`creator`, `model`) auto-map to `standard` at runtime.

### Per-App Entitlement Model

Beyond the platform tier, users can subscribe to specific apps via `org_app_subscriptions`:

```typescript
// org_app_subscriptions columns
site_walk: 'none' | 'standard' | 'pro'
tours: 'none' | 'standard' | 'pro'
slatedrop: 'none' | 'standard' | 'pro'
design_studio: 'none' | 'standard'
content_studio: 'none' | 'standard'
bundle: 'none' | 'all_apps' | 'enterprise'
storage_addon_gb: number
credit_addon_balance: number
```

### Resolving Entitlements for Any User

Always use `resolveModularEntitlements()` from `lib/entitlements.ts` for app-specific checks. Never check raw DB columns in UI components.

```typescript
const entitlements = getEntitlements(tier, { isSlateCeo });
const modular = resolveModularEntitlements(orgAppSubscriptions);

// Check project creation permission
if (!canCreateFullProject(entitlements.tier, isSlateCeo)) {
  redirect to upgrade prompt;
}

// Check Site Walk access
if (modular.apps.site_walk.tier === 'none') {
  redirect to subscribe;
}
```

---

## 6. SlateDrop Folder Generation Based on Entitlements

When a user's subscriptions change, SlateDrop must update accordingly.

### Folder Generation Triggers

| Event | Action |
|---|---|
| New subscription (Site Walk) | Create `App Folders/Site Walk/` if not exists |
| New Field Project created | Create `Field Projects/{name}/Site Walk/` tree |
| Full Project created | Create `Projects/{name}/` full tree |
| 360 Tours subscription added | Create `App Folders/360 Tours/`; add `360 Tours/` to all existing projects |
| Subscription cancelled | Mark tree as read-only; do NOT delete folders or files |
| Project archived | Move folder to `Archive/{name}/`; maintain all files |

Folder creation logic must be called from the API route that creates projects/subscriptions, NOT from the UI. The UI shows what exists; the server creates what should exist.

### Implementation Location
```
lib/slatedrop/folder-generator.ts  (to be created)
  - generateFieldProjectFolders(orgId, projectId, projectName)
  - generateFullProjectFolders(orgId, projectId, projectName, apps[])
  - addAppFolderToAllProjects(orgId, app: 'tours' | 'design' | 'content')
  - markFolderTreeReadOnly(orgId, projectId)
```

---

## 7. Organization / User Branding Profile

Branding data is a platform feature stored in `organizations.brand_settings` (JSONB).

### Schema (JSONB keys inside `brand_settings`)
```typescript
interface OrgBrandSettings {
  company_name?: string;
  logo_r2_path?: string;        // R2/SlateDrop path to logo file
  primary_color?: string;       // Hex color
  secondary_color?: string;     // Hex color
  phone?: string;
  email?: string;
  address?: string;
  license_number?: string;
  report_disclaimer?: string;   // Footer text on reports/proposals
  proposal_footer?: string;
  signature_name?: string;
  signature_title?: string;
  website?: string;
}
```

### Rules
- Stored once at the org level via Account → Organization Settings
- Read by all deliverable-generation routes automatically
- Users are never prompted to enter this again when generating a deliverable
- If `brand_settings` is incomplete, deliverable uses graceful fallbacks (org name from Supabase org row)
- White-label (Enterprise): overrides Slate360 logo with org logo on share pages and PDF covers

---

## 8. Prioritized Gap List

### P0 — Foundational Architecture Gaps (blocking everything)
1. `projects.project_type` column does not exist — migration needed
2. Platform bottom nav still has wrong tabs (`Work` / `More` instead of `Projects` / `Coordination` / `Account`)
3. Setup page (`/site-walk/setup`) uses light background — violates app-shell doctrine
4. `lib/project-access.ts` helper doesn't exist — `canCreateFullProject()` / `canCreateFieldProject()`
5. `lib/slatedrop/folder-generator.ts` doesn't exist — SlateDrop folder auto-generation not wired
6. Capacitor is not installed — native binary not possible

### P1 — Site Walk Gaps
1. Act 1: No walk-type selection step; no "Start Walk" CTA that creates a session and routes to capture
2. Act 2: Offline queue (IndexedDB) not implemented in new Act 2 routes
3. Act 3: Deliverable builder (`/deliverables/new`) is a redirect stub; no step-by-step flow
4. Walks tab: Only shows `in_progress`; no segmented control for All / Review / Complete / Drafts
5. Platform nav: `Coordination` not a primary bottom tab

### P2 — SlateDrop / Ecosystem Gaps
1. SlateDrop folder auto-generation not wired to project creation
2. Deliverable generation does not write output to SlateDrop path
3. Share link creation for deliverables not wired to `slate_drop_links` table
4. No org branding data flowing into deliverable templates automatically
5. App folder structure for 360 Tours / Design Studio / Content Studio not created on subscription add

### P3 — App Store Readiness Gaps
1. Capacitor not installed → cannot compile native binary
2. App icon 1024×1024 missing
3. Camera / microphone / location pre-prompt UI not built
4. Field High Contrast mode tokens defined but not wired to toggle
5. Account deletion not surfaced in app Account settings UI
6. Store screenshots not prepared
7. Privacy policy not accessible from within the app

---

## 9. Safe Implementation Sequence (V1 → App Store)

### Sequence enforced: do not start a step before the prior step's tests pass.

**Step 1 — Shell Correction** (no DB; fast)
- Fix platform nav: `Projects | Coordination | Account` tabs
- Fix setup page: Dark Glass + `100dvh`
- Add field contrast CSS token stubs
- Verify typecheck + guards pass

**Step 2 — Project Type Migration**
- Migration: add `project_type` to `projects`; default `'field'`; add `converted_from_id`, `converted_at`
- Create `lib/project-access.ts` with `canCreateFullProject()` / `canCreateFieldProject()`
- Update project creation API route to enforce tier gate
- Update `SiteWalkSetupClient` to use `project_type` when creating sessions

**Step 3 — SlateDrop Folder Generator**
- Create `lib/slatedrop/folder-generator.ts`
- Wire to project creation API (call after project row insert)
- Write unit tests for folder path generation

**Step 4 — Site Walk Act 1 Complete**
- Walk-type selection step in setup
- Contacts + collaborator step
- Template selection (UI only, no backend logic yet)
- "Start Walk" CTA → creates `site_walk_sessions` row → routes to `/site-walk/capture`
- Fix setup page background + `100dvh`

**Step 5 — Walks Tab Full**
- Segmented control: All / In Progress / Review / Complete / Drafts
- Filter query by `status` in `loadWalks()`
- New Walk CTA → `/site-walk/setup`

**Step 6 — Deliverable Builder**
- Step 1: Type (Punch / Progress / Inspection / Proposal / Custom)
- Step 2: Item selection from sessions in project
- Step 3: Branding (reads from `org.brand_settings`)
- Step 4: Summary (manual text + optional AI if credited)
- Step 5: Preview (PDF mock first, then real)
- Step 6: Recipients (from org contacts)
- Step 7: Send + save to SlateDrop

**Step 7 — Collaborator Shell Rewrite**
- Dark Glass + `h-[100dvh]` fixed shell
- Bottom nav: Assigned Work / My Walks / Plans / Messages / Account
- No sidebar, no full subscriber shell

**Step 8 — Account Deletion UI**
- Surface the delete button in Account → Security tab
- It already calls the API route — just need the UI

**Step 9 — App Icon 1024×1024**
- Create/export icon at 1024×1024
- Add to public/uploads and update manifest + Capacitor config

**Step 10 — Capacitor Installation**
- Install core + CLI + plugins
- Evaluate static export vs server approach
- Configure platforms
- Test on real device

**Step 11 — Permission Pre-Prompts**
- Camera pre-prompt modal (before first capture)
- Microphone pre-prompt modal (before first voice note)
- Location pre-prompt modal (in walk setup)

**Step 12 — Field High Contrast Mode UI**
- Add toggle in Account → Preferences
- Save to `profiles.preferences.field_contrast_mode`
- Apply `.field-contrast` class to shell root on load

**Step 13 — App Store Submission**
- Prepare screenshots
- Write App Store listing
- Submit for review
