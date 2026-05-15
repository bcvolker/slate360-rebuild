# Site Walk V1 Current Build Context

Last Updated: 2026-05-14
Status: Current Site Walk source-of-truth map.

## Purpose

This file is the quick map for Site Walk V1 work. It identifies what is working, what must be preserved, what is unfinished, and which docs should guide future implementation.

## Current Working Baseline

- Site Walk is the only fully visible V1 app for app-store-facing authenticated surfaces.
- Plan Walk core loop works enough to protect it: plan opens, pan/zoom works, long press opens capture, plan-linked capture can be created, and saved plan pins can be opened.
- Shared CaptureShell V1 is implemented locally: Quick Walk and Plan Walk now share the active task header, state-specific save labels, and Details / Attachments / Markup lower-sheet tabs.
- Act 2 screen-zone ownership correction is implemented locally: Shared task header owns the top zone, plan/photo canvas owns the middle, the bottom drawer owns Details / Attachments / Markup plus save, and modal overlays sit above task controls.
- Trigger.dev plan rasterization is working. Do not disturb it unless the task proves it is directly involved.
- Mobile Site Walk must use server-generated plan imagery, not browser-side construction-PDF rendering.
- Home command center has compact primary actions and a flex-filling work panel.
- Worksites terminology is now the visible lower-tier Site Walk concept, while internal route/API/table names can still use project/session terms.

## Current Site Walk Docs

| Status | File | Use |
|---|---|---|
| Authoritative module blueprint | `docs/SITE_WALK_MASTER_ARCHITECTURE.md` | Module workflow, monetization guardrails, routing, deliverables |
| Current execution plan | `docs/site-walk/SITE_WALK_V1_UI_IMPLEMENTATION_PLAN.md` | Slice plan for mobile UX, capture shell, plan tools, deliverables |
| Current decision record | `docs/site-walk/SITE_WALK_V1_MOBILE_UX_DECISION_RECORD.md` | UX decisions for command center, CaptureShell, plan tools, save flow |
| Shared CaptureShell audit | `docs/site-walk/SHARED_CAPTURESHELL_V1_AUDIT.md` | Pre-edit ownership map and overlay risk notes |
| Shared CaptureShell implementation | `docs/site-walk/SHARED_CAPTURESHELL_V1_IMPLEMENTATION.md` | Implemented shell structure, checklist, deferred work |
| Act 2 zone correction | `docs/site-walk/ACT2_SCREEN_ZONE_OWNERSHIP_CORRECTION.md` | Current screen-zone ownership diagnosis, implemented cleanup, deferred work |
| Current taxonomy | `docs/site-walk/SITE_WALK_V1_TAXONOMY_AND_WORKFLOW.md` | Worksite/Project/Walk/Stop/Item/Deliverable language |
| Implementation notes | `docs/site-walk/SITE_WALK_HOME_COMMAND_CENTER_IMPLEMENTATION_NOTES.md` | Historical notes for Home command-center slices |
| Failure history | `docs/site-walk/SITE_WALK_CAPTURE_FAILURE_ANALYSIS_2026-05-08.md` | Capture failure context; read only when touching capture/save behavior |

## Current Code Map

| Area | File or folder | Notes |
|---|---|---|
| Site Walk layout wrapper | `app/site-walk/layout.tsx` | Wraps Site Walk in authenticated app shell plus module shell |
| Site Walk module shell | `components/site-walk/SiteWalkShell.tsx` | Owns non-task module viewport contract |
| Module nav | `components/site-walk/SiteWalkModuleNav.tsx` | Hidden on `/site-walk`; compact on non-home pages |
| Home data loader | `app/site-walk/page.tsx` | Server loader for projects, walks, summary |
| Home client UI | `app/site-walk/_components/SiteWalkHub.tsx` | Command center, tabs, actions, work panel |
| Walk row actions | `app/site-walk/_components/WalkActionsMenu.tsx` | Rename, worksite link, archive, delete modal |
| Worksites/Walks page | `app/site-walk/(act-2-inputs)/walks/page.tsx` | Visible Worksites page; route still legacy walks |
| Delete walk button | `components/site-walk/walks/DeleteWalkButton.tsx` | Still visible trash action on Worksites/Walks page |
| Capture task route | `app/site-walk/(act-2-inputs)/capture/*` | Full-viewport capture shell and client island |
| Shared capture task header | `app/site-walk/(act-2-inputs)/capture/_components/SharedCaptureTaskHeader.tsx` | Shared Quick Walk / Plan Walk active header with Back to Plan or Site Walk and secondary Exit |
| Capture/plan UI | `components/site-walk/capture/*` | Camera, plan viewer, bottom sheet, toolbar, pin menus, attachments |
| Plan compact pill | `components/site-walk/capture/PlanToolbar.tsx` | Compact plan context only; full Plan Tools Drawer remains deferred |

## Preserve Before Editing

- Plan image loading and existing rasterized image flow.
- Pan/zoom interaction.
- Long press to create a plan-linked capture.
- Long press/open behavior for saved pins.
- Quick Capture and Plan Walk routes.
- Existing API payload contracts for session deletion, even where visible UI has been simplified.
- Current Worksite wording on lower-tier Site Walk surfaces.

## Known Gaps

- Physical iPhone confirmation is still pending for the latest Home/Worksites layout.
- Saved pins still need move/delete polish.
- Plan navigation, search, layers, thumbnails, and sheet selection remain incomplete.
- Shared CaptureShell still needs physical iPhone confirmation.
- Act 2 zone ownership still needs physical iPhone confirmation after the correction.
- Full Stop Strip navigation is not implemented yet; the shared header only shows the current stop label.
- Deliverables V1 still needs product polish.
- App Store visible-surface cleanup is not complete.

## Highest-Risk UI Debt In Site Walk

- Multiple fixed and absolute overlays compete in capture/plan surfaces.
- Act 2 correction removes the main top-zone stack from Plan Walk, but future Plan Tools Drawer work must keep one owner for plan controls.
- Z-index values range from shell-level values to very high modal values like `z-[2000]` and `z-[2100]`.
- Bottom action zones are split across capture sheets, quick action menus, toolbar hints, mobile nav avoidance, and safe-area padding.
- Hardcoded black/slate/amber/cyan classes are common in capture files.
- `app/site-walk/(act-2-inputs)/capture/layout.tsx` warns that child layouts should not use fixed positioning above z-50 except modal overlays, but several capture components still require careful review against that contract.

## Safe Next Implementation Slices

Only after explicit approval:

1. Move/delete saved pins without changing plan rasterization.
2. Plan tools drawer and sheet navigation/search/layers.
3. Full Stop Strip navigation and saved-stop preview polish.
4. Token pilot limited to Site Walk capture/plan surfaces.
5. Deliverables V1 polish.

## Backend Audit Findings (2026-05-14)

A full backend audit was completed. Key findings for future V1 work:

- Use "Deliverables" not "Reports." Backend defines 22 deliverable types.
- Worksites map to `projects` with `project_type = 'field'`. No separate Worksite table.
- Plan sets are project-scoped. "Plan Room" label is banned; use "Plans & Documents."
- SlateDrop auto-provisions 17 system folders per project.
- Collaborator model is fully built: invites, seats, limits, per-project.
- Coordination (assignments, comments, inbox, board) APIs exist but no dedicated page.
- V1 preview components exist at `components/site-walk/v1/` with preview route `/site-walk-v1-preview`.
- Audit docs: `docs/audit/BACKEND_ENTITLEMENT_AND_DATA_MODEL_AUDIT.md` and related.
- Coordination is the correct nav label (not "Coordinate"). Needs Review is the correct work-panel tab label (not "Review").
- Worksites/Projects label is controlled by `useProjectLabel` prop in V1 preview. It still needs to be wired to `canCreateFullProject()` from `lib/project-access.ts` before production swap.
- V1 preview is now wired to real read-only data via shared `loadSiteWalkHubData()` in `lib/site-walk/load-hub-data.ts`. Production `/site-walk` also uses this shared loader (same behavior, code deduplicated).
- Home shows real walks, worksites, and summary counts. Worksites shows real projects. SlateDrop/Coordination/Deliverables tabs route to existing production pages.
- All V1 preview buttons route to existing pages — no mutations, no fake behavior.
- Home command center refined: work panel uses Recent/Worksites/Shared/Needs Review tabs with real data. Contained scroll. Starred tab deferred.
- Primary actions: Create Worksite, Walk from Worksite, Quick Walk. Summary KPI strip removed. No passive metrics on Home. Counts only in row metadata. No-op row actions removed from preview.

## Smoke Tests For Future Site Walk Work

- Open `/site-walk` on mobile viewport and confirm no dead blank space below the Home work panel.
- Open Worksites/Walks and confirm no giant passive metric cards return.
- Open a plan, pan/zoom, long press to start capture, save, and return to plan.
- Open a saved pin and confirm the pin context is preserved.
- Start Quick Capture and confirm it still works without a plan.
- Run `npm run typecheck`, `npm run build`, and the relevant guardrail for the touched area.
