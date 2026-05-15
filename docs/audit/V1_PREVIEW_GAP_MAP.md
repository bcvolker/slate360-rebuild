# V1 Preview Gap Map

Last Updated: 2026-05-14
Status: Step 1 wiring complete. V1 preview now shows real read-only data.

## Purpose

Compares each V1 preview screen against what already exists in production, identifying what needs wiring.

## Step 1 Completed — Real Data Wiring

The V1 preview at `/site-walk-v1-preview` is now wired to real read-only data:

1. **Data source:** Shared `loadSiteWalkHubData()` in `lib/site-walk/load-hub-data.ts` (extracted from production page, reused by both `/site-walk` and `/site-walk-v1-preview`).
2. **Home tab:** Real recent walks, active walks, summary counts (open items, needs review, draft deliverables). Shared/Review tabs show clean empty states.
3. **Worksites tab:** Real projects with walk counts and last activity. Row actions route to existing pages.
4. **SlateDrop tab:** Routes to existing `/slatedrop` and per-project `/projects/[id]/slatedrop`. Shows real project folder shortcuts.
5. **Coordination tab:** Routes to existing `/coordination/inbox`, `/coordination/contacts`, `/coordination/calendar`, `/site-walk/assigned-work`.
6. **Deliverables tab:** Shows real draft deliverable count. Routes to existing `/site-walk/deliverables`. Category chips route to deliverables page.
7. **Avatar/header:** Shows real user initial and org name.
8. **Production `/site-walk` untouched** in behavior — only refactored to use shared loader.
9. **All buttons route to existing pages** — no fake behavior, no mutations.
10. **Deferred:** Shared With Me real collaborator data, Needs Review real item list, saved pin move/delete, plan sheet picker, deliverable creation form.
11. **Home command center refined (2026-05-15):** Work panel uses Recent/Worksites/Shared/Needs Review tabs. Recent shows real walks. Worksites shows real projects with actions (Open/Walk from Worksite/Plans & Documents/SlateDrop/Collaborators/Deliverables). Contained scroll. Starred tab omitted (data field exists but unused).
12. **Action labels renamed (2026-05-15):** Create Worksite, Walk from Worksite, Quick Walk. Summary KPI strip removed. No-op row actions removed from walk rows. "Create Report" → "Create Deliverable."
13. **Visual/layout polish (2026-05-15):** Header h-14 with SlateLogo (sm) + "Site Walk" subtitle on Home tab. Full tool icon row: Search, Notifications, Share, Feedback, Avatar. Subpage headers show title text instead of branding. Primary actions use min-h-[56px] balanced cards. Core tools row uses rounded-xl tool-card styling. Work panel is a bordered rounded-xl container with "Work" label + amber underline tabs. Contained scroll with pb-4. mt-3/mb-3 breathing room above/below work panel. Desktop sidebar also uses SlateLogo.
14. **Header tool wiring status:** Search, Notifications, Share, Feedback icons are visible but not yet wired. Avatar menu is functional. Wiring deferred per V1_HEADER_TOOL_GAP_AUDIT.md.
15. **Home two-zone grid layout (2026-05-15):** Previous `content-start` left unused space below Work panel. Fixed with two-zone grid: `grid-rows-[1fr_minmax(285px,305px)]`. Zone 1 (command): `flex flex-col justify-center gap-y-4` — grows to fill space, centers label + actions + tools. Zone 2 (panel): clamped 285–305px, scrolls internally. No dead blank below panel. `gap-y-3` between zones.

## Home Tab

| What V1 Shows | What Production Has | Gap | Priority |
|---|---|---|---|
| Action grid (New Worksite, Start Walk, Quick Capture) | SiteWalkHub has same actions | Wire to real navigation (router.push) | High |
| Core access row (SlateDrop, Coordination, Deliverables) | More page has some links | Wire to tab switching | High |
| Work panel: Recent tab | loadHubData returns sessions sorted by updated_at | Wire real session data | High |
| Work panel: Active tab | loadHubData filters sessions by status=in_progress | Wire real session data | High |
| Work panel: Shared tab | listCollaboratorProjects() exists | Wire collaborator data | Medium |
| Work panel: Needs Review tab | /api/site-walk/inbox exists | Wire inbox data | Medium |
| Summary counts | loadHubData computes openItems, needsReview, draftDeliverables, unsyncedItems | Wire real counts | Medium |
| Header with avatar menu | MobileTopBar has avatar dropdown | Wire to real user data (name, initials) | High |
| Org name in header | resolveServerOrgContext provides orgName | Wire | Medium |
| Search icon | CommandPalette exists | Wire | Low |
| Notifications icon | NotificationsMenu exists with bell badge | Wire | Medium |

**Backend/API to connect:** loadHubData() from app/site-walk/page.tsx, /api/site-walk/inbox

## Worksites Tab

| What V1 Shows | What Production Has | Gap | Priority |
|---|---|---|---|
| Empty state with "New Worksite" button | Projects list with create | Wire real project list (filtered by project_type=field) | High |
| Worksite rows | Walk card UI in walks page | Wire WorksiteV1Row to real project data | High |
| Row actions: Open, Start Walk, Plans & Documents, SlateDrop, Collaborators, Deliverables | WalkActionsMenu has Open, Rename, Archive, Delete | Add Plans & Documents, SlateDrop, Collaborators, Deliverables actions | High |
| Worksite → walk count | Session counts per project exist in loadHubData | Wire | Medium |
| Worksite → last activity | Session updated_at available | Wire | Medium |
| useProjectLabel prop | canCreateFullProject() exists in lib/project-access.ts | Wire prop to entitlement check | Medium |

**Backend/API to connect:** /api/projects (GET), /api/projects/create (POST), canCreateFullProject()

## SlateDrop Tab

| What V1 Shows | What Production Has | Gap | Priority |
|---|---|---|---|
| Section links (Worksite Folders, Recent Uploads, Shared Drops, File Requests) | Full SlateDrop client at /slatedrop | Link V1 tab to /slatedrop or embed SlateDropClient | High |
| Auto-folder concept (Plans, Photos, etc.) | provisionProjectFolders creates 17 folders | Show real folder list from API | Medium |
| Empty state | SlateDropClient shows full file browser | Replace empty state with real data or link | High |

**Backend/API to connect:** /api/slatedrop/files, /api/slatedrop/folders, /api/slatedrop/project-folders

## Coordination Tab

| What V1 Shows | What Production Has | Gap | Priority |
|---|---|---|---|
| Assignments section | AssignmentPanel + /api/site-walk/assignments | Link to assignments list | High |
| Comments section | CommentThread + /api/site-walk/comments | Link to comments | High |
| Inbox section | /coordination/inbox route + InboxTabs component | Link to coordination inbox | High |
| Shared with Me | listCollaboratorProjects() | Wire | Medium |
| Invitations | project_collaborator_invites + invite flow | Wire | Medium |
| Contacts | /coordination/contacts + ContactsClient | Link | High |
| Calendar | /coordination/calendar + CalendarClient | Link | Medium |

**Backend/API to connect:** /api/site-walk/assignments, /api/site-walk/comments, /api/site-walk/inbox, /coordination/* routes

**Key insight:** Coordination routes (/coordination/inbox, /coordination/contacts, /coordination/calendar) already exist and are functional. The V1 tab should link to or embed these, not rebuild them.

## Deliverables Tab

| What V1 Shows | What Production Has | Gap | Priority |
|---|---|---|---|
| Create Deliverable button | /site-walk/deliverables/new is a redirect stub | Build real creation form | High |
| Category chips (9 types) | 22 deliverable types defined in backend | Show actionable type selection | High |
| Draft/Published/Shared sections | Deliverables list page shows status cards | Wire real deliverable data grouped by status | High |
| Empty state | Deliverables list page with real data | Replace with real data | High |
| Share/export buttons per row | Share/export API routes exist | Wire to API | Medium |

**Backend/API to connect:** /api/site-walk/deliverables (GET, POST), deliverables/[id]/share, deliverables/[id]/export

## Plan Workspace Skeleton

| What V1 Shows | What Production Has | Gap | Priority |
|---|---|---|---|
| Header with worksite/walk name | SharedCaptureTaskHeader has walk context | Wire to real session data | High |
| Canvas placeholder | PlanViewerLeaflet renders real plan | Replace placeholder with PlanViewerLeaflet | High |
| Sheet rail placeholder | Plan sheets data model exists | Build sheet picker UI | High |
| Bottom tools bar (Sheets/Search/Pins/Layers) | PlanToolbar has compact pill | Replace placeholder with real tools | Medium |
| Capture button | Plan-linked capture exists | Wire | High |

**Key insight:** The skeleton must be replaced with the real PlanViewerLeaflet + capture routing. The skeleton layout (header/canvas/tools) is the right structure; fill it with real components.

## Capture Workspace Skeleton

| What V1 Shows | What Production Has | Gap | Priority |
|---|---|---|---|
| Header with Back/Stop/Exit | SharedCaptureTaskHeader is functional | Replace skeleton header with real header | High |
| Camera stage placeholder | CameraViewfinder + VisualCaptureView are functional | Replace with real camera | High |
| Details/Attachments/Markup tabs | CaptureDataBottomSheet has these tabs | Replace with real bottom sheet | High |
| Save button | Save flow is functional | Wire to real save | High |

**Key insight:** The capture skeleton should be entirely replaced by the existing capture components wrapped in V1 chrome. CaptureContext, SessionCaptureClient, CameraViewfinder, CaptureDataBottomSheet, and all capture logic should be reused directly.
