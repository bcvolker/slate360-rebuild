# Site Walk — Field Platform Roadmap

**Last Updated:** 2026-05-06 (PDF stabilization pass)
**Status:** Planning / Pre-build
**Owner:** Product + Engineering

This document defines the complete vision for Site Walk evolving from a session-capture tool into a full **field project management platform**. It covers entitlement design, data models, UI flows, collaborator access, and a phased build plan.

---

## 0. Executive Summary

Current state: Site Walk lets a single user conduct mobile walks and generate deliverables tied to a project.

Target state: Site Walk becomes a **platform for field teams** — dispatched from a desktop coordinator, walked by assigned field workers (who may be external collaborators), deliverables reviewed by leadership, and archived against either a full Project or a lightweight Field Project.

The gating axis is the subscription tier:
- `trial / creator` → read-only history, limited to **1 active walk**
- `model` → up to **5 active walks**, field project creation, desktop setup
- `business` → unlimited walks, full project linking, collaborator seats, leadership viewer roles, reports
- `enterprise` → all `business` + custom org roles, white-label deliverables

---

## 1. Entitlement Changes

File: `lib/entitlements.ts`  
Function: `getEntitlements(tier, flags)`

### New entitlement flags to add

```ts
canCreateFieldProject: tier >= 'model',
canCreateFullProject:  tier >= 'business',
maxActiveWalks:        tier === 'trial' ? 1 : tier === 'creator' ? 1 : tier === 'model' ? 5 : Infinity,
maxCollaboratorSeats:  tier === 'model' ? 2 : tier === 'business' ? 10 : tier === 'enterprise' ? 100 : 0,
canViewOrgWalks:       tier >= 'business',      // leadership view
canAssignWalkToUser:   tier >= 'model',
canUploadPlans:        tier >= 'model',
canGenerateReports:    tier >= 'business',
canShareDeliverables:  tier >= 'creator',
```

### Upsell triggers (match to tier gate)
- `trial` tries to start a second walk → prompt to upgrade to `model`
- `model` tries to create a full project → prompt to upgrade to `business`
- Anyone tries to add a 3rd collaborator on `model` → prompt to upgrade to `business`

---

## 2. Data Model Changes

### 2a. Field Projects (new concept)

A **Field Project** is a lightweight project with no full ConstructionProject overhead. It exists so `model`-tier users can organize walks without paying for a full project.

**Option A (preferred):** Extend the existing `projects` table with a `project_type` column:
```sql
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS project_type text NOT NULL DEFAULT 'full'
  CHECK (project_type IN ('full', 'field'));
```

Field projects skip: bid management, budget, schedule, and sub-modules.  
They include: address, site info, walk sessions, SlateDrop file folder, collaborators.

**Option B (alternative):** New `field_projects` table (avoids touching `projects`) — higher migration risk, complicates shared joins.

**Decision:** Use Option A.

### 2b. Walk Sessions — No schema change needed

`site_walk_sessions.project_id` already exists. Field projects are just projects with `project_type = 'field'`.  
Walk session cards just resolve the project name via the existing FK.

### 2c. Walk Assignments (new)

Track which user is expected to walk a session:

```sql
CREATE TABLE public.site_walk_assignments (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id    uuid NOT NULL REFERENCES public.site_walk_sessions(id) ON DELETE CASCADE,
  assigned_to   uuid NOT NULL REFERENCES auth.users(id),
  assigned_by   uuid NOT NULL REFERENCES auth.users(id),
  assigned_at   timestamptz NOT NULL DEFAULT now(),
  note          text,
  status        text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','declined','completed'))
);
CREATE INDEX ON public.site_walk_assignments(session_id);
CREATE INDEX ON public.site_walk_assignments(assigned_to);
```

### 2d. Collaborator Seats (new)

Slate360 subscribers (any tier ≥ creator) can be invited as **field collaborators** on an org. They conduct walks but don't have full org-level access.

```sql
CREATE TABLE public.org_collaborators (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id         uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  invited_by     uuid NOT NULL REFERENCES auth.users(id),
  user_id        uuid REFERENCES auth.users(id),          -- null until accepted
  email          text NOT NULL,
  role           text NOT NULL DEFAULT 'field_walker'
                 CHECK (role IN ('field_walker','field_lead','viewer')),
  status         text NOT NULL DEFAULT 'invited'
                 CHECK (status IN ('invited','active','suspended','removed')),
  invited_at     timestamptz NOT NULL DEFAULT now(),
  accepted_at    timestamptz,
  seat_billing_id text                                     -- Stripe sub item for purchased seat
);
CREATE UNIQUE INDEX ON public.org_collaborators(org_id, email);
```

### 2e. Walk Plan Sets (already partially implemented)

Table `site_walk_plan_sets` already exists. Missing:
- Upload path from desktop walk setup wizard
- Pin stop creation via long-press on `PlanViewer`
- Association of plan items to walk stop IDs

**Needed addition:**
```sql
-- Pins on plan pages created from walk stops
CREATE TABLE public.site_walk_plan_pins (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_set_id   uuid NOT NULL REFERENCES public.site_walk_plan_sets(id) ON DELETE CASCADE,
  session_id    uuid NOT NULL REFERENCES public.site_walk_sessions(id),
  stop_id       uuid REFERENCES public.site_walk_stops(id),
  page_index    integer NOT NULL DEFAULT 0,
  x_pct         numeric(6,4) NOT NULL,  -- 0.0–1.0 relative to page width
  y_pct         numeric(6,4) NOT NULL,  -- 0.0–1.0 relative to page height
  label         text,
  created_at    timestamptz NOT NULL DEFAULT now()
);
```

### 2f. Org Viewers (leadership access)

Different from collaborators — viewers can see all walks and deliverables owned by the org but cannot capture.

Add `role = 'viewer'` to `org_collaborators` (already in the CHECK above). Viewer-specific policies:
- Can see all sessions where `session.org_id = org_id` (RLS policy)
- Cannot create sessions, stops, items
- Can download deliverables

---

## 3. UI Flows

### 3a. Workspace / Org Switcher Dropdown

**Where:** `DashboardTopBar` (desktop) + `MobileTopBar` — replace or augment the existing org name display.

**What it shows:**
- Current org name + tier badge
- List of orgs the user belongs to (as owner, collaborator, or viewer)
- "Create new org" CTA (gated: business+)
- Current project context (if inside a project-scoped view)

**Implementation path:**
1. `GET /api/org/list` — return orgs where user has any role in `organization_members` OR `org_collaborators`
2. Dropdown rendered in `DashboardTopBar`.tsx using existing `DropdownMenu` from `ui/dropdown-menu`
3. Selecting an org calls `POST /api/org/switch` which sets `active_org_id` on the user session cookie and redirects to `/dashboard`

### 3b. Field Project Creation Wizard

**Trigger:** "New Project" button on `/projects` when `canCreateFieldProject && !canCreateFullProject`, or a dedicated "New Field Project" shortcut.

**Steps (mobile-friendly stepper):**
1. **Type** — "Field Project" (lightweight) vs "Full Project" (gated to business)
2. **Name + Address** — required for field; minimal form
3. **Plans (optional)** — upload 1–10 PDFs as plan set for this project; stored in `site_walk_plan_sets`
4. **Assign workers** — pick from org collaborators or invite by email; auto-creates `site_walk_assignments`
5. **Create** — creates `projects` row with `project_type = 'field'`, creates default SlateDrop folder tree

**Component:** `components/projects/FieldProjectWizard.tsx` (new, client, <300 lines)  
**API:** POST `/api/projects` — extend with `project_type` param

### 3c. Desktop Walk Setup

**Where:** `/projects/[id]/walks/new` (new route) OR modal launched from walk list.

**Fields:**
- Walk title / description
- Scheduled date + time
- Assign to (collaborator picker — searches `org_collaborators`)
- Plan set selection (if plans uploaded) OR upload plans now
- Stop template (optional — pre-load an item checklist template)
- Notes for field worker

**API:** POST `/api/site-walk/sessions` — already exists, extend with `assigned_to`, `plan_set_id`, `scheduled_at` params.

**Worker notification:** On assignment, trigger email via existing email service to the assigned collaborator with a deep link to the walk session on mobile.

### 3d. Walk List (enhanced)

**Current:** Basic list at `/site-walk/walks`, shows in_progress + completed.

**Enhanced walk card:**
- Thumbnail (first photo from session — already implemented)
- Status badge (pending / in_progress / completed / cancelled)
- Assigned-to avatar + name (if set)
- Project + field project name link
- Item count + elapsed time
- Actions: **Delete** (already implemented) | **Link to Project** (modal picker) | **Assign / Reassign** (collaborator picker) | **Share** (generates share link using existing share mechanism)

**Filters + sort bar:**
```
[All | Pending | In Progress | Completed]   Sort: [Newest | Oldest | Name | Project]
Search: ________________
```

**Implementation:** Extend `app/site-walk/(act-2-inputs)/walks/page.tsx` — add filter params as `searchParams`, pass to existing `getServerSideWalkList()` fetch helper.

### 3e. Plans Integration — Long-Press to Pin Stop

**Where:** `PlanViewer.tsx` (components/site-walk/plans/)

**Flow:**
1. User is in a walk session and has a plan set loaded.
2. Long-press on any point on the plan page → creates a `site_walk_plan_pin` at the normalized (x_pct, y_pct) coordinate.
3. The pin is immediately shown as a numbered dot overlay.
4. User can tap the dot to assign it to an existing stop or navigate to that stop.
5. In deliverables/report view, pin dots appear on the plan page with stop numbers, rendered as vector overlays on the PDF.

**Tech:** Pointer events API — `onPointerDown` → timer → `onPointerMove` to cancel if moved > 5px → create pin on 500ms hold.

### 3f. Collaborator Access System

**Invitation flow:**
1. Org admin goes to `/more/organization` or the future team-management panel inside `/settings`
2. Clicks "Add Field Worker" → enters email
3. System checks: is that email a Slate360 user? If yes, send invite. If no, send invite + signup link.
4. Invited user sees a notification on their dashboard → accepts → appears in `org_collaborators` as `active`
5. Field walker can now see all sessions **assigned to them** in their `/site-walk/walks` view

**RLS implications:**
- `site_walk_sessions` policy: `owner_id = auth.uid() OR exists(select 1 from site_walk_assignments where session_id = id and assigned_to = auth.uid())`
- `org_collaborators` policy: `invited_by = auth.uid() OR user_id = auth.uid()`

**Seat billing:** Each collaborator seat = additional Stripe subscription item. `seat_billing_id` on `org_collaborators`. Managing seats goes through Stripe Customer Portal or a custom `/api/billing/seats` endpoint.

### 3g. Org-Level Leadership Viewing

**Role:** `viewer` in `org_collaborators`
**Access:** All org sessions, all deliverables — read-only
**UI:** Separate "Leadership View" at `/site-walk/overview` showing:
- KPI cards: total walks this month, open items, completion rate, top walkers
- Walk list (all org walks, not just own) with filter by project/worker/date
- Deliverables list with download links

### 3h. Deliverables & Reports

**Current:** Deliverables generated as PDF from walk stops, stored via `slatedrop-bridge`.

**Enhanced:**
- **Report builder** at `/site-walk/reports/new` — select sessions, choose report type (inspection, punch list, progress), apply brand settings, preview, generate
- **Report types:**
  - Walk Summary (current deliverable)
  - Consolidated Inspection Report (multi-session, deduplicated items)
  - Punch List Export (CSV + PDF — open items only)
  - Progress Photo Package (zip of all photos with captions)
- **Delivery methods:**
  - Download PDF
  - Share link (existing mechanism)
  - Email to client contact (from `brand_settings.contact_email`)
  - Save to project SlateDrop folder

**Component:** `components/site-walk/reports/ReportBuilder.tsx` (new, client)  
**API:** POST `/api/site-walk/reports/generate` (new)

---

## 4. Phased Build Plan

### Phase 1 — Foundation (High Priority, no new tables)
1. **Entitlement flags** — add new keys to `lib/entitlements.ts` ← start here
2. **Org switcher dropdown** — `DashboardTopBar` + `MobileTopBar` org list
3. **Walk list filters + sort** — extend `/site-walk/walks/page.tsx` with `searchParams`
4. **Walk card actions** — Link to Project + Assign (client-side modals, call existing APIs)
5. **`project_type` column** — migration + Field Project option in project creation

### Phase 2 — Assignment + Collaboration
6. **`site_walk_assignments` table** — migration + API routes
7. **Desktop walk setup wizard** — `/projects/[id]/walks/new`
8. **Collaborator invite flow** — `org_collaborators` table + invite email
9. **Team tab in MyAccountShell** — manage invites + seats
10. **Assigned-to RLS policy** — extend session access to `assigned_to`

### Phase 3 — Plans + Reports
11. **Plans upload in walk setup** — connect to existing `site_walk_plan_sets`
12. **`site_walk_plan_pins` table** + PlanViewer long-press gestures
13. **Plan pin overlay in deliverables** — render pin dots on PDF export
14. **Report builder** — multi-session consolidated reporting

### Phase 4 — Org Viewing + Billing
15. **Leadership viewer role** — RLS policies + `/site-walk/overview`
16. **Seat billing** — Stripe subscription items + management UI

---

## 5. External AI Prompt for Architecture Review

Use the following prompt when asking an external AI (ChatGPT, Claude, Gemini) for architecture decisions before implementing Phase 2+:

---

```
I'm building a field project management extension for a Next.js 15 app called Slate360. 
The app uses Supabase (PostgreSQL + RLS), Stripe, Tailwind CSS v4, and is deployed on Vercel.

Current state:
- Users can create "projects" (projects table, project_id uuid PK)
- "Site Walk" sessions are captured in site_walk_sessions (project_id FK NOT NULL, owner_id FK)
- Sessions have stops (site_walk_stops) and items (site_walk_items) with photos/audio
- Deliverables (PDFs) are generated from sessions and stored in slatedrop_uploads

New requirements:
1. FIELD PROJECTS: A lightweight project variant (project_type = 'field') for users who don't 
   need full project management. Same table, new column.

2. WALK ASSIGNMENTS: A coordinator should be able to set up a walk from desktop (choose date, 
   write a plan, attach PDF plans, assign to a specific user) and the assigned user gets a 
   notification to conduct the walk on mobile.

3. COLLABORATOR SEATS: External Slate360 users (they have their own accounts) can be invited 
   as "field walkers" for an org. They can only see sessions assigned to them. Seats are 
   billed per-user via Stripe subscription items.

4. LEADERSHIP VIEWERS: Org-level read-only access for leadership to see all walks, stats, 
   deliverables — without the ability to capture anything.

5. PLAN PINS: PDF plan sets are uploaded per project. Users can long-press on a plan page at 
   a coordinate to create a "pin" tied to a walk stop. The pin appears on the deliverable.

Questions I need answered:
A. For collaborator seats, should their billing be a Stripe subscription with metered items 
   (per seat add-on), or a fixed-price upgrade on the org's main subscription? 
   Trade-offs: metered = granular + complex; fixed tiers = simpler UX.

B. For the assignment notification, is Supabase Realtime (pg_notify subscription) the right 
   approach over a Supabase Edge Function that emails + creates an in-app notification?
   Field workers may not have the app open when assigned.

C. For RLS on site_walk_sessions: current policy is owner_id = auth.uid(). 
   If I add a collaborator table (org_collaborators) AND an assignment table 
   (site_walk_assignments), what is the most performant RLS policy that covers:
   - org owner sees all org sessions
   - field walker sees only assigned sessions
   - viewer sees all org sessions (read-only)
   Without causing N+1 in policy evaluation for list queries?

D. For the plan pin coordinate system: I'm storing x_pct / y_pct (0.0–1.0 relative to 
   rendered page dimensions). Is this stable across different viewport sizes and zoom levels? 
   Is there a more robust approach?

E. Should the "leadership view" (/site-walk/overview) be a Supabase view (materialized) 
   for KPI aggregates, or compute on demand in an API route? 
   Expected query volume: < 100 orgs with ≤ 500 sessions each.

Please answer each question with a concrete recommendation and 1-2 sentence rationale.
```

---

## 6. High-Value Feature Backlog

These are the highest-value field workflow features to preserve for future build phases. They should be implemented only after the core workspace navigation, project setup, plan upload, capture, and reporting routes are stable.

| Feature | Product Requirement | Build Notes |
|---|---|---|
| Swipe-Up Capture Drawer | Data entry for notes, trades, priority, tags, and cost impact must live in a mobile-native swipe-up bottom sheet over the camera. No page navigations during capture. | Implement inside `/site-walk/capture` after the camera shell is stable. Use a contained bottom sheet with keyboard-safe scrolling. |
| Plan Layer Management | Plans must support a Layer Toggle to hide/show pins from older walks, trades, sessions, and status groups so the blueprint stays clean. | Backed by `site_walk_plan_pins`; UI belongs in `/site-walk/plans`. |
| Voice-to-Text Dictation | Implement native browser Web Speech API in the capture drawer for hands-free note-taking. | Progressive enhancement only; show a normal text area when the API is unavailable. |
| Quick-Clone Stops | Add a button to duplicate the previous stop's tags, trades, category, and checklist values for repetitive inspections. | Store as client action inside capture first; persist only when the new stop is saved. |
| Offline Sync Queue | Add a header icon showing how many items are stored in IndexedDB waiting for network sync. | Must read from the existing offline capture queue and never block capture. |
| Walk Templates | Save a walk's stops, trades, tags, and checklist setup as a reusable template for similar future walks. | Belongs in Office Prep; do not surface inside live capture until templates are selected. |
| Daily Leadership Summary | Auto-email a daily summary of open issues, completed walks, blocked items, and weather delays to org leadership. | Requires leadership viewer roles and org email preferences. |
| Dynamic Deliverable Builder | Build a modular block-builder for reports, including drag-and-drop photos, plans, pins, sections, and issue tables instead of rigid PDFs. | Target route: `/site-walk/reports`. Start with saved block JSON before PDF export. |

**Implementation note — 2026-05-06:** `/site-walk/capture` now uses a strict layered Z-index architecture: full-bleed camera/plan background, floating Dark Glass tools, panning/zooming plan viewer with long-press pins, Ghost Mode camera toggle, and a draggable swipe-up data-entry bottom sheet.

**Implementation note — 2026-05-06:** Plan Room PDF uploads now return an array-compatible `planSets` payload, avoid PDF.js parsing during upload, force phone-picked PDFs to `application/pdf`, render uploaded PDFs directly in Plan Room and capture through `/api/site-walk/plan-sets/[id]/file` as a same-origin `application/pdf` stream, hardcode PDF.js to `/pdf.worker.min.js` copied into `public/`, expose exact amber source/load/render errors, expose a direct **Start walk with plans** action that opens capture in plan mode, and provide compact previous/next page arrows plus a searchable expandable Pages panel.

**Implementation note — 2026-05-06:** PDF stabilization pass now fits and centers the plan surface on load/page/resize from actual viewport dimensions, owns mouse-wheel zoom with a native `{ passive: false }` listener, keeps the React-PDF `Document` mounted while switching only `Page.pageNumber`, caps PDF canvas render width at 1200px, and hides the Plan Sheet grid until a user completes an upload.

**Implementation note — 2026-05-06:** Plan long-press attachment uploads now tolerate live project folder provisioning failures: `/api/site-walk/upload` logs `Site Walk Files / Photos` provisioning errors and falls back to a session-scoped upload key instead of returning a raw 500, while plan-pin attachment skips unsaved local draft pin IDs and creates the persisted pin after the capture item saves.

---

## 7. Strict Site Walk Internal Routing

Site Walk must use a small, predictable workspace map. Do not bury active work behind marketing pages or generic descriptions.

| Route | Purpose | UX Rule |
|---|---|---|
| `/site-walk` | Landing: setup wizard, plan upload entry, and Plan & Start Walk path. | Planning-first. Quick Capture is a smaller emergency escape hatch. |
| `/site-walk/walks` | Filterable list of all active and past walks. | Show real walk records only; no fake metrics. |
| `/site-walk/plans` | Plan Viewer and Layer Manager. | Manage plan sets, sheets, and future pin layers. |
| `/site-walk/capture` | High-performance field execution view. | Mobile-first, no marketing, no navigation away during capture. |
| `/site-walk/reports` | Dynamic Deliverable Builder. | Report workspace for deliverables, sections, exports, and share links. |

Current compatibility aliases:
- `/site-walk/setup` remains the existing setup route behind the Landing action.
- `/site-walk/deliverables` remains available for legacy deliverable links until `/site-walk/reports` fully replaces it.

Navigation affordance rule:
- Every non-root Site Walk workspace must expose an explicit `Site Walk Home` / `Back to Workspace` affordance in addition to tab navigation.
- Full-bleed capture modes cannot rely on the global app shell; camera-only, plan mode, and start-choice screens must each provide a visible route back to `/site-walk`.

---

## 8. Root Cause Report — Dark Theme Failures

History of why the dark theme fixes kept failing:

### Root Cause 1: `<html>` element has no `dark` class
`app/layout.tsx` sets `<html className="scroll-smooth">`. The entire `.dark {}` CSS block in `globals.css` sets `--background`, `--card`, and every semantic token. Since there was never a `.dark` ancestor, `var(--background)` always resolved to the `:root` light values (`#F8FAFC`, `#FFFFFF`). Using `bg-background` anywhere in the app was rendering white.

**Fix applied:** Added `class="dark"` to AppShell's outer `<div>` (not `<html>`) — this creates the dark CSS context for all authenticated content.

### Root Cause 2: SlateDrop sub-components bypass the token system
`SlateDropActionModals`, `SlateDropContextMenu`, `SlateDropSharePreviewModals`, `ProjectFileExplorer`, `SlateDropNotificationsOverlay` used literal Tailwind classes `bg-white`, `bg-gray-50`, `border-gray-200`, `text-gray-600`. These classes reference concrete CSS colors, **not CSS variables**. Adding `.dark` to any ancestor has zero effect on them.

**Fix applied:** Sed sweep replacing all `bg-white` with `bg-[#151A23]`, all `bg-gray-*` with `bg-white/[0.03-0.08]` (semi-transparent overlays), all `border-gray-*` with `border-white/10`, all `text-gray-*` with `text-slate-*` equivalents.

### Root Cause 3: Multiple independent layout trees
`/slatedrop`, `/site-walk`, `/(apps)`, `/coordination` are NOT inside `/(dashboard)/`. Each has its own `layout.tsx`. All use `AuthedAppShell` → `AppShell`. Since AppShell now has `dark` class, all routes now cascade correctly.

### Root Cause 4: All `#3B82F6` hardcoded blue (brand color)
~90 files had `bg-[#3B82F6]`, `text-[#3B82F6]`, `border-[#3B82F6]` from the original design. No Tailwind variant of `.dark` can change a hardcoded hex. Required explicit sed sweep across all component files.

### Why fixes "didn't stick" across sessions
Each session found ONE layer of the problem. The CSS cascade has 5 layers where the fix needs to be applied:
1. CSS custom property definition (`.dark { --background: ... }`)
2. The `.dark` class must exist in the DOM ancestor chain
3. Components must use `var(--background)` / semantic tokens (not `bg-white`)
4. Interactive states (hover, active) must also avoid hardcoded colors
5. Dynamic inline styles (`style={{ backgroundColor: "#3B82F6" }}`) are not covered by any CSS rule

All 5 layers must be fixed simultaneously. Partial fixes (e.g., fixing layer 2 when layers 3+4+5 are still broken) produce no visible improvement.
