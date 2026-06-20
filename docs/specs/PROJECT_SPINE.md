# Spec: Project Spine (shared project, carry-over across apps)

Status: **spec / planning** (no app code). The project is the shared backbone; apps are lenses.
Mostly **surfacing + consistency**, since the data model already enforces sharing. See
`PLATFORM_PRODUCT_PLAN.md` §0,§4.

## 1. What exists (already shared)
- Single `projects` table (`org_id`, `name`, `status`, `project_type` field|full, `metadata`).
- **Both apps require a project:** `site_walk_sessions.project_id` and
  `digital_twin_spaces.project_id` are **NOT NULL** → no orphan work.
- `project_members` (role_id), `project_folders` (tree + permissions), `unified_files`,
  `slatedrop_uploads`, `site_walk_plan_sets`. Creation provisions folders/members.

## 2. Canonical project header (the single source of identity)
Every app reads the same header; nothing is duplicated per app:
- **Identity:** name, client/owner, project number/job code, status, type (field|full), dates.
- **Branding:** logo + accent color → auto-applied to **deliverables/reports/share viewers**.
- **Location:** address + lat/lng + optional boundary → seeds **ghost-mode GPS**, maps, weather log.
- **Plans:** `site_walk_plan_sets` PDFs → available to walk-with-plans AND twin georef.
- **Team & permissions:** `project_members` + `folder_permissions` (external collaborators incl.).
- **Storage:** provisioned `project_folders` tree shared by SlateDrop / Site Walk / Twin.

Persist new fields (branding, location, project number) on `projects` (columns or `metadata`).

## 3. Carry-over rules (consistency is the work)
| Field | Flows into |
|---|---|
| logo / accent | report covers, share viewers (`SlatePlayer` chrome), PDF header/footer |
| location/geo | ghost-mode fallback, project map, weather, twin georef |
| plans | Site Walk plan canvas, Twin georef |
| team/permissions | who can capture/view/edit across both apps + folders |
| folders | one tree across SlateDrop, Site Walk captures, Twin assets |
A walk, a twin capture, plans, and files all reference one `project_id`, so these stay consistent
automatically — the task is **UI**, not new plumbing.

## 4. Project detail UI (mobile + desktop, unified kit)
Tabs: **Overview · Walks · Twins · Plans · Files · Team · Reports · Settings**.
- **Mobile**: header (logo/location/client) + prominent **Start Walk / Start Capture** CTA; light
  tabs; remembers last project (≤4 taps to camera).
- **Desktop**: full version — branding/permissions/plans management, analytics, settings.

## 5. Create-project flow
- **Mobile quick form** (inline during "Start Walk"): name + optional number → create → auto-select.
- **Desktop full wizard**: identity, branding (logo), location (map pin), plans upload, team invite,
  folder template.
- Entitlement gate stays: full vs field project by tier (existing `/api/projects/create`).

## 6. Merge "Worksite/Workspace" → "Project"
Per external + internal consensus: stop bifurcating. A "Workspace" is just a project without a
plan. **Ad-hoc/quick walks attach to a default system project** ("General / Unassigned") so routing
+ RLS have one entity. Retire the separate "Worksite" terminology in the UI.

## 7. Build order
1. Add header fields (branding, location, project number) + surface on `projects`.
2. Real **mobile project detail** + Start-Walk CTA + last-project memory.
3. Wire carry-over: branding→reports, location→ghost/maps, plans→apps.
4. Create flows (mobile quick / desktop wizard); default "General" project for quick walks.
5. Desktop full detail (permissions, analytics, settings).

## 8. Open items
- Exact storage: dedicated columns vs `metadata` jsonb for new header fields.
- Boundary capture UX (draw on map) — phase 2.
