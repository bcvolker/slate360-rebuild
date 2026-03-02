# Project Hub — Complete System Blueprint

**Last Updated:** 2026-03-02
**Purpose:** Single source of truth for the Project Hub module. Authoritative enough to rebuild the entire Project Hub (routes, components, tools, backend, RBAC) from scratch.

**Competitive target:** Lighter/simpler than Procore but handles real construction workflows. Must be usable by non-technical users (small contractors, drone pilots, realtors, students).

---

## Table of Contents

1. [What Project Hub Is](#1-what-project-hub-is)
2. [3-Tier Structure](#2-3-tier-structure)
3. [Project Cards — Entry Points](#3-project-cards--entry-points)
4. [Project Creation Wizard](#4-project-creation-wizard)
5. [Tier 1 — All Projects](#5-tier-1--all-projects)
6. [Tier 2 — Project Home](#6-tier-2--project-home)
7. [Tier 3 — Tool Views](#7-tier-3--tool-views)
8. [Roles & Permissions (RBAC)](#8-roles--permissions-rbac)
9. [SlateDrop Integration](#9-slatedrop-integration)
10. [Inbound Documents & Notifications](#10-inbound-documents--notifications)
11. [2-Step Project Deletion](#11-2-step-project-deletion)
12. [Profile / Complexity Levels](#12-profile--complexity-levels)
13. [AI Assist Helpers](#13-ai-assist-helpers)
14. [Tier & Entitlement Gating](#14-tier--entitlement-gating)
15. [Backend — Database Tables](#15-backend--database-tables)
16. [Backend — API Routes](#16-backend--api-routes)
17. [Frontend — Key Files](#17-frontend--key-files)
18. [Design & Consistency Rules](#18-design--consistency-rules)
19. [Build Status & Known Issues](#19-build-status--known-issues)
20. [Reconstruction Checklist](#20-reconstruction-checklist)

---

## 1. What Project Hub Is

Project Hub is the **central place to manage projects, tasks, documents, and field issues**. A user (project manager, contractor, PM, drone pilot, realtor, etc.) can:
- Create and track projects with location, team, budget, and schedule.
- Manage RFIs, submittals, daily logs, and field issues.
- Share project status with external stakeholders without exposing the whole system.
- Tie all project files together with SlateDrop (single file system).

**Access:** `canAccessHub: true` — business, enterprise, and trial tiers.
**Route:** `/project-hub` and `/project-hub/[projectId]/*`

---

## 2. 3-Tier Structure

```
Tier 1  /project-hub              All Projects grid + My Work + Activity
Tier 2  /project-hub/[id]         Project Home (overview cards)
Tier 3  /project-hub/[id]/*       Individual tool views (RFIs, documents, map...)
```

### URL convention for Tier 3

```
/project-hub/[projectId]/documents
/project-hub/[projectId]/rfis
/project-hub/[projectId]/submittals
/project-hub/[projectId]/schedule
/project-hub/[projectId]/budget
/project-hub/[projectId]/map
/project-hub/[projectId]/photos
/project-hub/[projectId]/records
/project-hub/[projectId]/team
/project-hub/[projectId]/settings
```

---

## 3. Project Cards — Entry Points

Project cards appear in **three** places — all showing the same data:

### 3a. Dashboard widget (project-cards)

- Rendered by `DashboardProjectCard.tsx`.
- Top section: satellite map (Google Static Maps), project name, status pill.
- Bottom section: open RFIs, open submittals, next milestone.
- Click → `/project-hub/[projectId]`.

### 3b. Project Hub Tier 1 grid

- Route: `app/(dashboard)/project-hub/page.tsx`.
- Same satellite map rendering approach as `DashboardProjectCard`.
- Horizontal scrolling row of cards, or a full responsive grid.
- "New Project" button (top-right) — opens project creation wizard.
- Click → `/project-hub/[projectId]`.

### 3c. SlateDrop sidebar project nodes

- Project nodes appear under `Projects/` in the SlateDrop sidebar.
- 3-dot button (hover) → context menu with "Open in Project Hub" (`ArrowUpRight` icon, accent color).
- Context menu also has "Delete" (2-step).
- Project info banner appears in the SlateDrop content pane when the project root is active — shows project name, subfolder count, link button ("Project Hub →"), and delete button.

### Satellite map rendering pattern (canonical — same in all three places)

```tsx
// Safe lat/lng extraction from metadata (never cast directly)
const meta = (project.metadata ?? {}) as Record<string, unknown>;
const locData = (meta.location ?? {}) as Record<string, unknown>;
const lat = typeof locData.lat === "number" ? locData.lat : null;
const lng = typeof locData.lng === "number" ? locData.lng : null;
const mapsKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

const staticMapUrl = lat && lng && mapsKey
  ? `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=17&size=600x256&maptype=satellite&key=${mapsKey}`
  : null;

// Rendering: separate absolute div for background (never mix backgroundImage + background shorthand)
<div className="h-32 w-full relative overflow-hidden rounded-t-xl">
  {staticMapUrl
    ? <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${staticMapUrl})` }} />
    : <div className="absolute inset-0 bg-gradient-to-br from-[#1E3A8A] to-[#1e293b]" />
  }
  {staticMapUrl && <div className="absolute inset-0 bg-black/45" />}
  <div className="absolute inset-0 p-4 flex flex-col justify-between z-10">
    {/* Project name, status pill, etc. */}
  </div>
</div>
```

---

## 4. Project Creation Wizard

### Access

- Business + enterprise users: "New Project" button in Project Hub Tier 1 and on Dashboard sidebar.
- Trial users: can see the wizard but are limited to 1 project and cannot create final deliverables.

### Steps

**Step 1 — Basics**
- Project name (required)
- Project number (optional)
- Client name
- Status: Active / On Hold / Closed
- Description

**Step 2 — Timeline**
- Start date
- Estimated end date
- Phase structure (optional): Pre-construction, Construction, Close-out

**Step 3 — Location**
- Component: `components/project-hub/WizardLocationPicker.tsx`
- Address search using `google.maps.places.AutocompleteSuggestion.fetchAutocompleteSuggestions()` (new API — replaces deprecated `AutocompleteService`)
- Interactive Google Map with click-to-place marker (lat/lng stored in `metadata.location`)
- Optional boundary polygon drawn by clicking vertices on the map (replaces deprecated DrawingManager — now uses custom `google.maps.Polyline` preview + `google.maps.Polygon` for finished boundary)
- Drawing flow: click polygon tool → click vertices on map → ≥3 points → click "Finish" → saves `metadata.location.boundary`
- `APIProvider` libraries: `["places", "geocoding"]` (NOT `"drawing"` — DrawingManager removed May 2026)

**Step 4 — Team**
- Invite org members by email
- Set initial roles: Project Manager, Project Member
- External stakeholders can be added later via share links

**On submit:**
```
POST /api/projects/create
Body: { name, number, client, status, startDate, endDate, description, metadata: { location, phases } }
```
Server creates:
1. `projects` row
2. SlateDrop subfolder tree at `/Projects/{projectId}/` (8 subfolders, all `is_system = true`)
3. Default project member records

---

## 5. Tier 1 — All Projects

### Layout

```
/project-hub

┌─────────────────────────────────────────────┐
│  "Project Hub"  header    [+ New Project]   │
├─────────────────────────────────────────────┤
│  Tabs: [All Projects] [My Work] [Activity]  │
├─────────────────────────────────────────────┤
│  Search + Filter (status, date range)       │
├─────────────────────────────────────────────┤
│  Project card grid                          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐    │
│  │ Sat Map  │ │ Sat Map  │ │ Sat Map  │    │
│  │ Name     │ │ Name     │ │ Name     │    │
│  │ Status   │ │ Status   │ │ Status   │    │
│  │ 3 RFIs   │ │ 1 RFI    │ │ ...      │    │
│  └──────────┘ └──────────┘ └──────────┘    │
└─────────────────────────────────────────────┘
```

### My Work tab

Unified list of items assigned to the current user **across all projects**:
- Source tables: `project_rfis`, `project_submittals`, `project_tasks`
- Filter: `assignee_id = auth.uid()` AND `status NOT IN ('closed', 'approved')`
- Columns: Type | Project | Title | Status | Due Date

### Activity tab

High-level activity feed across all projects:
- Source: `project_history_events` table
- Types: new RFI created, submittal approved, file uploaded, milestone reached, team member added
- Shows: icon, description, project name, timestamp ("2 hours ago")

---

## 6. Tier 2 — Project Home

### Layout

```
/project-hub/[projectId]

┌─────────────────────────────────────────────┐
│  ← Back to All Projects                     │
│  Project Name          Status pill          │
│  Client | Phase | Budget summary            │
├──────────┬──────────┬──────────┬────────────┤
│ Open     │ Schedule │ Recent   │ Field      │
│ Items    │ Snapshot │ Files    │ Notes      │
│ 3 RFIs  │ Next:    │ drawing  │ (optional) │
│ 2 Sub.  │ 2026-04  │ spec pdf │            │
│ 5 Tasks │ milestone│ photo    │            │
└──────────┴──────────┴──────────┴────────────┘
│  Quick navigation bar to Tier 3 tools       │
│  [Documents] [RFIs] [Submittals] [Schedule] │
│  [Budget] [Map] [Photos] [Records] [Team]   │
└─────────────────────────────────────────────┘
```

### Overview cards

| Card | Source | Link |
|---|---|---|
| Open Items | `project_rfis` (open) + `project_submittals` (pending) + `project_tasks` | → `/rfis` and `/submittals` |
| Schedule Snapshot | `project_milestones` (next 1–3) | → `/schedule` |
| Recent Files | `unified_files` WHERE `project_id = X` ORDER BY `created_at DESC` LIMIT 5 | → `/documents` |
| Field Notes | `project_daily_logs` latest | → `/records` |

---

## 7. Tier 3 — Tool Views

All Tier 3 views share the same layout pattern:

```
┌────────────────────────────────────┬────────────┐
│  Tool header: title + [+ New] btn  │ Context    │
│                                    │ Panel      │
│  Main table / canvas               │            │
│  (filtered, sortable)              │ [Details]  │
│                                    │ [Comments] │
│                                    │ [Share]    │
│                                    │ [History]  │
└────────────────────────────────────┴────────────┘
```

### 7.1 Documents (`/documents`)

- Folder tree (mirrors SlateDrop subfolders: Contracts, Specs, Drawings, Correspondence).
- File list with drag-and-drop upload.
- Actions: rename, move, download, share via secure link.
- Future: "Summarize Spec" AI button on PDF files.

### 7.2 RFIs (`/rfis`)

**Table columns:** RFI #, Title, Status, Due Date, Assignee, From

**Status flow:** `draft → open → in_review → responded → closed`

**New RFI form fields:**
- Title (required)
- Description / Question
- Due date
- Assignee (org member)
- To: (recipient — can be external)
- Attachments (→ saved to `/Projects/{id}/RFIs/` in SlateDrop)

**Context panel tabs:** Details, Comments (@mentions), Share (copy link / email), History (status changes)

**External response:** When a sub/consultant responds via external link, file lands in `/Projects/{id}/RFIs/` automatically and a notification fires.

### 7.3 Submittals (`/submittals`)

**Table columns:** Submittal #, Title, Status, Spec Section, Due Date, Submitter

**Status flow:** `draft → submitted → under_review → approved → approved_as_noted → rejected → resubmitted`

**New Submittal form fields:**
- Title, Spec Section, Description
- Submitter (external or internal)
- Due Date
- Attachments (→ `/Projects/{id}/Submittals/`)

**Reviewer stamp:** When reviewer marks approved/rejected, their stamp PDF is attached and saved to `/Projects/{id}/Submittals/`.

### 7.4 Schedule (`/schedule`)

**MVP:** Simple table with task name, start date, finish date, status, % complete.

**Future (V2):** Gantt chart view (horizontal bar timeline), critical path highlighting.

**Data model:** `project_tasks` table with `task_name, start_date, end_date, status, percent_complete, project_id, parent_task_id`.

Milestone records can be flagged with `is_milestone = true` — displayed in the Tier 2 Schedule Snapshot card.

### 7.5 Budget (`/budget`)

**MVP:** Budget line items table: Category, Description, Budgeted Amount, Actual Cost, Variance.

**Display:** 
- Total budget vs. total actual (top summary).
- Per-category progress bars.
- Export to PDF/CSV.

**Files:** Budget spreadsheet uploads → `/Projects/{id}/Budget/`.

### 7.6 Map (`/map`)

- Full-screen Google Map (satellite view by default).
- Pins represent: RFIs, issues, submittals, generic location notes.
- Clicking a pin opens the item's context panel inline.
- Photos can be geotagged and shown as pins.

### 7.7 Photos (`/photos`)

- Grid of images with lazy loading.
- Filters: date picker, tag, project area.
- Upload: drag-and-drop → `/Projects/{id}/Photos/` in SlateDrop.
- Click photo → opens full-screen viewer with metadata (date, uploader, GPS).
- 360° photos linked to 360 Tour Builder tab.

### 7.8 Records (`/records`)

Closeout and long-term records:
- Contracts, warranties, O&M manuals
- Punch list items
- Certificate of substantial completion
- Archived project files

Maps to `/Projects/{id}/Records/` in SlateDrop.

### 7.9 Team (`/team`)

- List of all members with role, email, status (active / invited / removed).
- Invite new member: `POST /api/projects/[projectId]/members` sends email via Resend.
- Remove member: soft-delete `project_members` row.
- External viewer links (read-only share).

### 7.10 Settings (`/settings`)

- Edit project name, number, client, status.
- Change dates and phases.
- Update location (re-open WizardLocationPicker).
- Archive project (soft sets `status = 'on_hold'`).
- **Delete project** — 2-step flow (see Section 11).

---

## 8. Roles & Permissions (RBAC)

Roles stored in `project_members.role` (per-project) and `organization_members.role` (org-wide).

| Role | Create Project | Edit Items | Invite Members | Delete Items | View Only |
|---|---|---|---|---|---|
| Owner / Admin | ✅ | ✅ | ✅ | ✅ | — |
| Project Manager | ✅ | ✅ | Project Members only | ✅ | — |
| Project Member | ❌ | Own items | ❌ | Own items | — |
| External Viewer | ❌ | ❌ | ❌ | ❌ | ✅ |

### External stakeholder access

External viewers (clients, subs, consultants) are NOT org members. They access project data via:
1. Scoped share links (SlateDrop `external_response_links`).
2. Response links for RFIs/submittals that allow external upload.
3. A future "stakeholder portal" page at `/external/project/[token]`.

All external access is time-limited (`expires_at` on share tokens) and scoped to specific folders/items.

---

## 9. SlateDrop Integration

Project Hub and SlateDrop are the **same data**. Every action in Project Hub writes to the corresponding SlateDrop subfolder.

| Project Hub action | SlateDrop effect |
|---|---|
| Upload document in Documents tool | File in `/Projects/{id}/Documents/` |
| Attach file to RFI | File in `/Projects/{id}/RFIs/` |
| Upload submittal package | File in `/Projects/{id}/Submittals/` |
| Save Design Studio version for this project | File in `/Projects/{id}/Drawings/` |
| Upload site photo | File in `/Projects/{id}/Photos/` |
| Export budget report | File in `/Projects/{id}/Budget/` |
| Export schedule PDF/Gantt | File in `/Projects/{id}/Schedule/` |
| Upload closeout doc | File in `/Projects/{id}/Records/` |

Users can navigate to the project's SlateDrop folder any time by:
- Clicking "Project Hub →" in the SlateDrop project info banner.
- Clicking the SlateDrop icon in the Project Home header.
- Using the SlateDrop sidebar — project nodes appear under `Projects/`.

---

## 10. Inbound Documents & Notifications

See SlateDrop Blueprint Section 7 for full flow.

**Summary for Project Hub context:**

When an RFI response or submittal comes in from an external party:
1. File lands in `/Projects/{id}/RFIs/` or `/Projects/{id}/Submittals/`.
2. `notifications` table row created: `{ type: "document_received", project_id, file_name, subfolder }`.
3. Notification bell icon (header) shows unread count badge.
4. Clicking the notification deeplinks to the specific tool view (e.g., `/project-hub/[id]/rfis`).

**Rule:** The user never has to go digging for received documents — the notification takes them directly there.

---

## 11. 2-Step Project Deletion

### Where deletion is initiated

1. **SlateDrop sidebar** — 3-dot on project node → "Delete" (danger).
2. **SlateDrop project info banner** — "Delete Project" button.
3. **Project Hub → Settings** — "Delete Project" at bottom of settings page.
4. **Project Hub Tier 1** — future 3-dot on project card.

### Confirmation modal

```
┌──────────────────────────────────────────────────┐
│  Delete "Highway 45 Bridge Rehab"?               │
│                                                  │
│  ⚠️  This will permanently delete:               │
│  • All project files (documents, photos, RFIs)   │
│  • All RFIs, submittals, schedule, budget records│
│  • All team assignments for this project         │
│                                                  │
│  Type the project name to confirm:               │
│  [ __________________________ ]                  │
│                                                  │
│  [Cancel]          [Delete Project — red button] │
└──────────────────────────────────────────────────┘
```

The "Delete Project" button is disabled until the user types the exact project name.

### Server-side delete

```
DELETE /api/projects/[projectId]
```
Uses `withProjectAuth()` wrapper, requires role `owner` or `admin`.

1. Soft-delete: `projects` → `status = 'deleted'`, `unified_files` and `project_folders` → `deleted_at = now()`.
2. Enqueue cleanup job (nightly cron at T+30 days will hard-delete S3 objects).
3. Respond `200 ok`.
4. Client navigates to `/project-hub`.

---

## 12. Profile / Complexity Levels

Users can select a "Profile" in My Account settings that adjusts complexity:

| Profile | Tools Shown | Purpose |
|---|---|---|
| Basic | Documents, Photos, Map | Small contractors, simple projects |
| Standard | All tools (RFIs, Submittals, Schedule, Budget, Map, Photos, Documents, Records, Team) | Default for Business/Enterprise |
| Advanced | Standard + analytics widgets, advanced filters, AI suggestions | Power users |

Profile is stored in `profiles.project_hub_profile` and respected by the Project Hub layout.

---

## 13. AI Assist Helpers

All AI helpers are **optional, non-blocking buttons** — never auto-triggered. All show a disclaimer: *"AI-generated — please review before using."*

| Helper | Location | Action |
|---|---|---|
| Suggest clearer subject | RFI / Submittal new form | Rewrites title/description for clarity |
| Suggest assignee | RFI / Task assignment field | Suggests based on previous assignments |
| Summarize document | Documents tool, PDF files | One-paragraph summary |
| Generate daily log | Records → Daily Logs | Pre-fills from today's activity (RFIs opened, submittals reviewed, files uploaded) |

AI buttons use the org's credit balance. Each call costs N credits (configurable). Credit check before call; no credits → show upgrade prompt.

---

## 14. Tier & Entitlement Gating

`canAccessHub` must be `true`. Checked via `getEntitlements(tier).canAccessHub`.

| Tier | canAccessHub | Project limit | Notes |
|---|---|---|---|
| trial | true | 1 project | Can explore all tools, cannot create final deliverables |
| creator | false | 0 | Redirected to upgrade page |
| model | false | 0 | Redirected to upgrade page |
| business | true | 25 projects per org | Full access |
| enterprise | true | Unlimited | Full access |

When `canAccessHub = false`, route `/project-hub` renders an upgrade page (not a 404).

---

## 15. Backend — Database Tables

### Core project tables

```sql
-- projects (already has RLS policy: org_members_access)
projects:
  id uuid PK, org_id uuid FK, name text, number text, client text,
  status text ('active'|'on_hold'|'closed'|'deleted'),
  description text,
  metadata jsonb,  -- { location: { address, lat, lng, boundary }, startDate, endDate, phases }
  created_by uuid FK(auth.users), created_at, updated_at, deleted_at

-- project_members (per-project RBAC)
project_members:
  id uuid PK, project_id uuid FK, user_id uuid FK,
  role text ('owner'|'project_manager'|'project_member'|'external_viewer'),
  status text ('active'|'invited'|'removed'),
  created_at

-- project_rfis
project_rfis:
  id uuid PK, project_id uuid FK, rfi_number int,
  title text, description text, status text,
  assignee_id uuid FK, due_date date,
  created_by uuid, created_at, updated_at

-- project_submittals
project_submittals:
  id uuid PK, project_id uuid FK, submittal_number int,
  title text, spec_section text, status text,
  submitter text, assignee_id uuid FK, due_date date,
  created_by uuid, created_at, updated_at

-- project_tasks (also used for schedule)
project_tasks:
  id uuid PK, project_id uuid FK,
  task_name text, start_date date, end_date date,
  status text, percent_complete int,
  is_milestone boolean, parent_task_id uuid,
  assignee_id uuid FK, created_at

-- project_milestones
project_milestones:
  id uuid PK, project_id uuid FK,
  name text, date date, status text, created_at

-- project_budget_items
project_budget_items:
  id uuid PK, project_id uuid FK,
  category text, description text,
  budgeted numeric, actual numeric,
  created_at

-- project_history_events
project_history_events:
  id uuid PK, project_id uuid FK, org_id uuid FK,
  event_type text, description text,
  user_id uuid, metadata jsonb, created_at

-- notifications
notifications:
  id uuid PK, user_id uuid FK, org_id uuid FK,
  type text, payload jsonb, read_at timestamptz, created_at
```

---

## 16. Backend — API Routes

### Auth wrappers

```typescript
import { withAuth, withProjectAuth } from "@/lib/server/api-auth";
// withProjectAuth gives: { admin, projectId, userId, orgId }
```

### Project CRUD

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `GET` | `/api/projects` | `withAuth` | List org projects |
| `POST` | `/api/projects/create` | `withAuth` | Create project + provision SlateDrop |
| `GET` | `/api/projects/[projectId]` | `withProjectAuth` | Get project |
| `PATCH` | `/api/projects/[projectId]` | `withProjectAuth` | Update project |
| `DELETE` | `/api/projects/[projectId]` | `withProjectAuth` (owner/admin only) | 2-step soft-delete |
| `GET` | `/api/projects/[projectId]/folders` | `withProjectAuth` | Get SlateDrop folder tree |
| `GET` | `/api/projects/sandbox` | `withAuth` | Sandbox projects for SlateDrop sidebar |

### Tool-level routes

| Method | Path | Purpose |
|---|---|---|
| `GET/POST/PATCH` | `/api/projects/[id]/rfis` | RFI CRUD |
| `GET/POST/PATCH` | `/api/projects/[id]/submittals` | Submittal CRUD |
| `GET/POST/PATCH` | `/api/projects/[id]/tasks` | Task/schedule CRUD |
| `GET/POST/PATCH` | `/api/projects/[id]/budget` | Budget line items |
| `GET/POST` | `/api/projects/[id]/members` | Team management |
| `GET` | `/api/projects/[id]/activity` | Activity feed |

---

## 17. Frontend — Key Files

| File | Purpose |
|---|---|
| `app/(dashboard)/project-hub/page.tsx` | Tier 1 — All projects grid (~828 lines) |
| `app/(dashboard)/project-hub/[projectId]/page.tsx` | Tier 2 — Project Home |
| `app/(dashboard)/project-hub/[projectId]/*/page.tsx` | Tier 3 — Tool views |
| `components/project-hub/WizardLocationPicker.tsx` | Location step in creation wizard |
| `components/dashboard/DashboardProjectCard.tsx` | Project card (~275 lines) |
| `lib/projects/access.ts` | `listScopedProjectsForUser()`, `getScopedProjectForUser()` |
| `lib/types/api.ts` | `ProjectRouteContext`, `ApiErrorPayload` |
| `lib/server/api-auth.ts` | `withAuth()`, `withProjectAuth()` |
| `lib/server/api-response.ts` | `ok()`, `badRequest()`, `serverError()` |

### Key lib patterns

```typescript
// lib/projects/access.ts
export async function listScopedProjectsForUser(admin: SupabaseClient, userId: string, orgId: string) {
  return admin
    .from("projects")
    .select("id, name, status, metadata, created_at")
    .eq("org_id", orgId)
    .neq("status", "deleted")
    .order("created_at", { ascending: false });
}
```

---

## 18. Design & Consistency Rules

- Background: `bg-gray-50` main content, `bg-white` cards.
- Primary button: `bg-blue-600 text-white rounded-lg px-4 py-2 min-h-[44px]`.
- Cards: `rounded-xl shadow-sm border border-gray-100`.
- Context panel: right side, fixed `w-80`, tabs (Details / Comments / Share / History).
- Same top header and spacing as Dashboard.
- Command palette (`Cmd/Ctrl+K`): search projects by name, RFIs by ID, submittals, actions ("New RFI", "Upload document").
- All tables: sortable columns, filter bar above, row click opens context panel.
- Status pills:
  - Active → `bg-green-100 text-green-700`
  - On Hold → `bg-yellow-100 text-yellow-700`
  - Closed → `bg-gray-100 text-gray-500`
  - Open (RFI) → `bg-blue-100 text-blue-700`
  - In Review → `bg-purple-100 text-purple-700`
  - Approved → `bg-green-100 text-green-700`
  - Rejected → `bg-red-100 text-red-700`

---

## 19. Build Status & Known Issues

### Current state (2026-03-02)

- ✅ Tier 1 project grid with satellite map cards (both Dashboard and Project Hub use identical rendering after commit `38f8bb7`).
- ✅ Project creation wizard with WizardLocationPicker (new Google Places API, custom polygon drawing).
- ✅ SlateDrop integration — sidebar 3-dot, context menu "Open in Project Hub", project info banner with delete button.
- ⚠️ Tier 3 tool views (RFIs, Submittals, Schedule, Budget, etc.) — route stubs exist, full implementation pending.
- ⚠️ Tier 2 Project Home overview cards — partial implementation.
- ❌ External stakeholder portal (`/external/project/[token]`) — not yet built.
- ❌ AI Assist helpers — not yet built.

### Prioritized build order

1. Tier 2 Project Home overview cards (quick wins, pulls from existing APIs).
2. Tier 3 Documents tool (SlateDrop folder tree view inside project — most used).
3. Tier 3 RFIs (most complex workflow, highest value).
4. Tier 3 Submittals.
5. Tier 3 Photos.
6. Tier 3 Schedule (MVP table first, Gantt later).
7. Tier 3 Budget.
8. Tier 3 Team management.
9. Tier 3 Records / Settings.
10. External stakeholder portal.
11. AI helpers.

---

## 20. Reconstruction Checklist

- [ ] `app/(dashboard)/project-hub/page.tsx` — Tier 1 grid: project cards, My Work tab, Activity tab, New Project button
- [ ] `app/(dashboard)/project-hub/[projectId]/page.tsx` — Tier 2: overview cards pulling from API
- [ ] `app/(dashboard)/project-hub/[projectId]/[tool]/page.tsx` — Tier 3 shell with context panel
- [ ] `components/project-hub/WizardLocationPicker.tsx` — creation wizard Step 3 (AutocompleteSuggestion + custom polygon)
- [ ] `POST /api/projects/create` — creates `projects` row + provisions 8 SlateDrop subfolders
- [ ] `DELETE /api/projects/[projectId]` — soft-delete with 30-day grace period
- [ ] `GET /api/projects/[projectId]/rfis` + `POST` + `PATCH` — RFI CRUD
- [ ] `GET /api/projects/[projectId]/submittals` + `POST` + `PATCH` — Submittal CRUD
- [ ] `GET /api/projects/[projectId]/tasks` — Schedule/task CRUD
- [ ] Notification bell — `GET /api/notifications` + mark-read
- [ ] Project deletion 2-step modal — name confirmation input, disabled button until match
- [ ] Satellite map card — consistent rendering (separate absolute div, safe lat/lng extraction)
- [ ] RBAC — `project_members` table, `withProjectAuth` checks role for destructive operations
- [ ] External viewer links — `external_response_links` table, `/external/[token]` upload page
