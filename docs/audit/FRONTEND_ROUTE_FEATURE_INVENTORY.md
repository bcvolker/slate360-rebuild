# Frontend Route Feature Inventory

Last Updated: 2026-05-14
Status: Read-only audit. No code changes.

## Site Walk Routes

| Route | Purpose | Status | Features | Action for V1 |
|---|---|---|---|---|
| `/site-walk` | Home command center | Production | Loads projects, sessions, items, deliverables; shows SiteWalkHub | Replace UI, keep data loading |
| `/site-walk/setup` | Walk setup wizard | Production | Project selection, walk type, plan upload, contacts, branding | Replace UI, keep behavior |
| `/site-walk/walks` | Worksites/walks list | Production | Active/completed cards with thumbnails, item counts | Replace UI, keep data loading |
| `/site-walk/walks/[sessionId]` | Walk review | Production | Session items list, deliverable creation link | Replace UI, keep behavior |
| `/site-walk/capture` | Capture workspace | Production | Plan canvas, camera, items, pins, offline sync | Keep behavior, replace chrome only |
| `/site-walk/progression` | Before/after progression | Production | Item comparison by location over time | Keep as-is |
| `/site-walk/assigned-work` | Assigned items | Production | User's assignments from site_walk_assignments | Migrate into Coordination |
| `/site-walk/deliverables` | Deliverables list | Production | Draft/review/approved cards with share links | Replace UI, rename from Reports |
| `/site-walk/deliverables/new` | Create deliverable | Redirect stub | Redirects to list with session param | Build real creation form |
| `/site-walk/reports` | Reports hub | Legacy | Static landing with report type cards | Replace with Deliverables |
| `/site-walk/reports/new` | Report builder | Partial | ReportBuilderClient wireframe | Replace with Deliverable builder |
| `/site-walk/items/[id]/compare` | Item comparison | Production | Before/after photo pair | Keep as-is |
| `/site-walk/more` | More menu | Legacy/filler | Links to SlateDrop, Templates, Contacts | Delete — features moved to proper tabs |
| `/site-walk/slatedrop` | SW file browser | Production | Links to project SlateDrop folders | Migrate into SlateDrop tab |

## Platform Routes

| Route | Purpose | Status | Action for V1 |
|---|---|---|---|
| `/dashboard` | Main command center | Production | Keep as Slate360 Home |
| `/projects` | Project list | Production | Keep, accessible from dashboard |
| `/project-hub/[projectId]/*` | Full PM hub | Production (business+) | Hide for app-store V1 |
| `/operations-console` | User approval | Production (admin-only) | Keep admin-only |
| `/operations-console/feedback` | Feedback inbox | Production (admin-only) | Keep admin-only |
| `/analytics` | Analytics | Production (business+) | Hide for app-store V1 |
| `/plans` | Pricing page | Production | Keep |
| `/settings` | Account settings | Production | Keep |

## SlateDrop Routes

| Route | Purpose | Status | Action for V1 |
|---|---|---|---|
| `/slatedrop` | SlateDrop hub | Production | Link from V1 SlateDrop tab |
| `/slatedrop/[...section]` | Folder browser | Production | Link from V1 SlateDrop tab |

## Coordination Routes

| Route | Purpose | Status | Action for V1 |
|---|---|---|---|
| `/coordination` | Redirects to inbox | Production | Link from V1 Coordination tab |
| `/coordination/inbox` | Inbox with tabs | Production | Link from V1 Coordination tab |
| `/coordination/contacts` | Contacts manager | Production | Link from V1 Coordination tab |
| `/coordination/calendar` | Calendar view | Production | Link from V1 Coordination tab |

## Collaborator Routes

| Route | Purpose | Status | Action for V1 |
|---|---|---|---|
| `/collaborator` | Collaborator home | Production | Keep for collaborator-only users |

## Auth Routes

| Route | Purpose | Status | Action for V1 |
|---|---|---|---|
| `/login` | Login | Production | Keep |
| `/signup` | Signup with Turnstile | Production | Keep |
| `/forgot-password` | Password recovery | Production | Keep |
| `/reset-password` | Password reset | Production | Keep |
| `/pending-verification` | Email verification | Production | Keep |
| `/beta-pending` | Beta approval pending | Production | Keep |

## Public/Share Routes

| Route | Purpose | Status | Action for V1 |
|---|---|---|---|
| `/share/[token]` | File share viewer | Production | Keep |
| `/share/deliverable/[token]` | Deliverable viewer | Production | Keep |
| `/view/[token]` | Deliverable viewer | Production | Keep |
| `/upload/[token]` | External upload portal | Production | Keep |
| `/external/respond/[token]` | RFI/submittal response | Production | Keep |
| `/portal/[token]` | Branded public viewer | Production | Keep |
| `/tours/view/[slug]` | 360 tour viewer | Production | Keep |

## Routes to Hide/Delete

| Route | Reason |
|---|---|
| `/site-walk/more` | Filler — all features moved to proper tabs |
| `/site-walk/reports` | Legacy — replaced by Deliverables |
| `/site-walk/reports/new` | Legacy — replaced by Deliverable creation |
| `/virtual-studio` | Unfinished — ComingSoonEmptyState |
| `/geospatial` | Unfinished — ComingSoonEmptyState |
| `/preview/*` | Dev-only design previews |
