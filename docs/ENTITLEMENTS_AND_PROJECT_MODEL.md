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

### V1 Foundational Release Model

V1 is **invite-only and admin-approved**. Public paid subscriptions do **not** exist in V1. See [`APP_STORE_AND_OFFLINE_STRATEGY.md`](./APP_STORE_AND_OFFLINE_STRATEGY.md) §0.

**V1 access flow:**
1. User downloads free app from App Store / Play Store
2. User signs up in-app (email, password, optional org affiliation request)
3. Account created with `account_status = 'pending_approval'`
4. User sees Pending Foundational Verification screen — no app shell
5. Admin reviews in Operations Console
6. Admin approves: assigns `account_status = 'approved'`, role, `organization_id`, entitlements
7. User signs in next time → full app shell unlocks

### Required New Schema (V1 critical)

Add to `profiles` (or create `user_access` table if RLS isolation needed):

```sql
ALTER TABLE profiles ADD COLUMN account_status TEXT NOT NULL DEFAULT 'pending_approval'
  CHECK (account_status IN ('pending_approval', 'approved', 'rejected', 'suspended'));
ALTER TABLE profiles ADD COLUMN approved_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN approved_by UUID REFERENCES auth.users(id);
ALTER TABLE profiles ADD COLUMN rejection_reason TEXT;
ALTER TABLE profiles ADD COLUMN is_foundational_user BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN foundational_access_started_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN foundational_org_id UUID REFERENCES organizations(id);
ALTER TABLE profiles ADD COLUMN foundational_data_retention_until TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN v2_discount_eligible BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN v2_discount_type TEXT;  -- e.g. 'foundational_50_percent'
ALTER TABLE profiles ADD COLUMN signup_org_request TEXT;  -- free-text "I'm with ASU Capital Programs Management"

-- Reviewer bypass (App Store reviewer accounts must skip pending screen)
ALTER TABLE profiles ADD COLUMN is_app_reviewer BOOLEAN NOT NULL DEFAULT FALSE;
```

Add new role to `organization_members.role`:

```sql
ALTER TABLE organization_members
  DROP CONSTRAINT IF EXISTS organization_members_role_check;
ALTER TABLE organization_members
  ADD CONSTRAINT organization_members_role_check
  CHECK (role IN ('owner', 'admin', 'executive_viewer', 'project_manager', 'project_contributor', 'collaborator'));
```

### Current Tiers (from `lib/entitlements.ts`)
```
trial → standard → business → enterprise
```

In V1, tiers are admin-assigned at approval time. There is no public self-serve subscription path.  
Legacy tier names (`creator`, `model`) auto-map to `standard` at runtime.

### V1 vs V2 Entitlement Resolution

| Context | V1 | V2 |
|---|---|---|
| New user signup | Free in-app, default `pending_approval` | Free in-app, default `pending_approval` OR public free-trial path |
| Subscription source | Admin-assigned via Operations Console | Native iOS/Android IAP (RevenueCat or equivalent) |
| Web checkout | None visible | Marketing only, not primary purchase path |
| Stripe usage | Backend infrastructure only, no public flow | Optional alternative for enterprise/ASU custom invoicing |
| ASU $1 vendor txn | Handled outside the app via business invoicing | Same |

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

In V1, only `site_walk` and `slatedrop` columns are user-facing. Other apps are hidden in UI but tracked in DB.

### Resolving Entitlements for Any User

Always use `resolveModularEntitlements()` from `lib/entitlements.ts` for app-specific checks. Never check raw DB columns in UI components.

```typescript
const entitlements = getEntitlements(tier, { isSlateCeo });
const modular = resolveModularEntitlements(orgAppSubscriptions);

// V1 — check approval first (middleware)
if (profile.account_status !== 'approved' && !profile.is_app_reviewer) {
  redirect('/pending-verification');
}

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

**Step 2 — Approval Gate (V1 CRITICAL — must come before any user-facing flow)**
- Migration: add `account_status`, `is_foundational_user`, `foundational_org_id`, `foundational_data_retention_until`, `v2_discount_eligible`, `is_app_reviewer`, `signup_org_request` columns to `profiles`
- Migration: extend `organization_members.role` to include `executive_viewer`, `project_manager`, `project_contributor`
- Update middleware: redirect `pending_approval` users to `/pending-verification` (except `is_app_reviewer = true`)
- Build `/pending-verification` page (polished, branded, no shell, no nav)
- Build Operations Console approval queue (admin-only): list pending users, approve/reject UI, assign role + org + entitlements
- Seed App Store reviewer accounts: pre-approved, demo org, sample data
- Verify: new signup → pending screen → admin approves → user gets full shell on next sign-in

**Step 3 — V1 UI Scrub (remove ghost apps)**
- Audit DashboardClient `ALL_TABS`: remove any reference to 360 Tours, Design Studio, Content Studio, Tour Builder
- Audit Command Palette: remove non-V1 app commands
- Audit `/apps/` route: hide non-V1 app tiles entirely (do not show "Coming Soon")
- Audit Quick Actions: only show actions for V1-entitled apps
- Audit App Store listing copy draft: no mention of future apps
- Audit any "beta" / "test" / "coming soon" text in UI; replace with neutral language or remove
- Verify: cold-start app as new approved Site-Walk-only user → only Site Walk concepts visible

**Step 4 — Project Type Migration**
- Migration: add `project_type` to `projects`; default `'field'`; add `converted_from_id`, `converted_at`
- Create `lib/project-access.ts` with `canCreateFullProject()` / `canCreateFieldProject()`
- Update project creation API route to enforce tier gate
- Update `SiteWalkSetupClient` to use `project_type` when creating sessions

**Step 5 — SlateDrop Folder Generator**
- Create `lib/slatedrop/folder-generator.ts`
- Wire to project creation API (call after project row insert)
- Write unit tests for folder path generation

**Step 6 — Site Walk Act 1 Complete**
- Walk-type selection step in setup
- Contacts + collaborator step
- Template selection (UI only, no backend logic yet)
- "Start Walk" CTA → creates `site_walk_sessions` row → routes to `/site-walk/capture`

**Step 7 — Site Walk Act 2 — Offline Capture (Local-First)**
- IndexedDB queue for capture items + media
- Background sync when network detected
- Sync status badge in capture shell
- Verify: airplane mode capture → reconnect → all items synced

**Step 8 — Site Walk Act 3 — Deliverable Builder**
- Step 1: Type (Punch / Progress / Inspection / Proposal / Custom)
- Step 2: Item selection from sessions in project
- Step 3: Branding (reads from `org.brand_settings`)
- Step 4: Summary (manual text + optional AI if credited)
- Step 5: Preview (PDF mock first, then real)
- Step 6: Recipients (from org contacts)
- Step 7: Send + save to SlateDrop

**Step 9 — Walks Tab Full**
- Segmented control: All / In Progress / Review / Complete / Drafts
- Filter query by `status` in `loadWalks()`
- New Walk CTA → `/site-walk/setup`

**Step 10 — Executive Viewer Role (V1 Required for ASU)**
- RLS policies: `executive_viewer` can SELECT all org-scoped Site Walk tables, blocked from INSERT/UPDATE/DELETE
- Build `/exec` route or org-overview view in Home tab for executive viewers
- Read-only org dashboard: all Field Projects, recent walks, open items, deliverables
- Filters by user, project, date range

**Step 11 — Collaborator Shell Rewrite**
- Dark Glass + `h-[100dvh]` fixed shell
- Bottom nav: Assigned Work / My Walks / Plans / Messages / Account
- No sidebar, no full subscriber shell

**Step 12 — Account Deletion UI**
- Surface the delete button in Account → Security tab
- It already calls the API route — just need the UI

**Step 13 — Capacitor Installation + Native Plugins**
- Install core + CLI + plugins (camera, filesystem, geolocation, network)
- Evaluate static export vs server approach
- Configure platforms (iOS + Android)
- Test on real device: camera, offline capture, sync

**Step 14 — Permission Pre-Prompts + App Icon**
- Camera pre-prompt modal (before first capture)
- Microphone pre-prompt modal (before first voice note)
- Location pre-prompt modal (in walk setup)
- 1024×1024 app icon added to manifest + Capacitor
- Splash screen configured

**Step 15 — Field High Contrast Mode UI**
- Add toggle in Account → Preferences
- Save to `profiles.preferences.field_contrast_mode`
- Apply `.field-contrast` class to shell root on load

**Step 16 — App Store Submission**
- Decide distribution track (public-gated vs Apple School Manager Custom App)
- Prepare iOS screenshots (6.9" + 6.1")
- Prepare Android screenshots
- Write App Store / Play Store listing copy (no banned terms)
- Provide pre-approved reviewer credentials in submission
- Submit iOS via Xcode → App Store Connect
- Submit Android via Android Studio → Play Console
- Respond to reviewer feedback
- Approval → ASU foundational user program begins
