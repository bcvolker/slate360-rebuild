# Site Walk V1 UI Replacement Layer

Last Updated: 2026-05-14
Status: Preview prototype. Not wired to production routes.

## Purpose

This document tracks the new clean V1 UI layer for Site Walk. The new components live in `components/site-walk/v1/` alongside (not replacing) the existing production components. A non-production preview route at `/site-walk-v1-preview` demonstrates the new UI.

## New V1 Components

| Component | File | Purpose |
|---|---|---|
| SiteWalkV1Shell | `components/site-walk/v1/SiteWalkV1Shell.tsx` | Mobile-first shell with single header, content area, optional bottom nav |
| SiteWalkV1Header | `components/site-walk/v1/SiteWalkV1Header.tsx` | Single compact top bar with title, back, primary action, overflow menu |
| SiteWalkV1BottomNav | `components/site-walk/v1/SiteWalkV1BottomNav.tsx` | Four-tab bottom nav: Home, Worksites, Reports, Account |
| SiteWalkV1ActionGrid | `components/site-walk/v1/SiteWalkV1ActionGrid.tsx` | Compact 3-action grid: New Worksite, Start Walk, Quick Capture |
| SiteWalkV1ListPanel | `components/site-walk/v1/SiteWalkV1ListPanel.tsx` | Tabbed list area: Active, Recent, Worksites, Issues |
| SiteWalkV1RowMenu | `components/site-walk/v1/SiteWalkV1RowMenu.tsx` | Consistent three-dot row menu |
| WorksiteV1Row | `components/site-walk/v1/WorksiteV1Row.tsx` | Dense worksite row with actions |
| WalkV1Row | `components/site-walk/v1/WalkV1Row.tsx` | Dense walk row with status badge and actions |
| ReportV1Row | `components/site-walk/v1/ReportV1Row.tsx` | Report row with type badge and share/open |
| PlanWorkspaceV1Skeleton | `components/site-walk/v1/PlanWorkspaceV1Skeleton.tsx` | Static plan workspace layout skeleton |
| CaptureWorkspaceV1Skeleton | `components/site-walk/v1/CaptureWorkspaceV1Skeleton.tsx` | Static capture workspace layout skeleton |

## Old Components These Are Intended To Replace

| New V1 Component | Old Component(s) It Replaces |
|---|---|
| SiteWalkV1Shell | `SiteWalkShell.tsx`, `SiteWalkModuleNav.tsx` combined |
| SiteWalkV1Header | `SiteWalkModuleNav.tsx` header section, duplicate module header in `SiteWalkHub.tsx` |
| SiteWalkV1BottomNav | `SiteWalkModuleNav.tsx` bottom nav with different tab structure |
| SiteWalkV1ActionGrid | Giant action cards in `SiteWalkHub.tsx` command center |
| SiteWalkV1ListPanel | Tab/pill system in `SiteWalkHub.tsx` work panel |
| SiteWalkV1RowMenu | Scattered action menus across `WalkActionsMenu.tsx`, `DeleteWalkButton.tsx` |
| WorksiteV1Row | Project/worksite cards in walks page |
| WalkV1Row | Walk list items in `SiteWalkHub.tsx` and walks page |
| PlanWorkspaceV1Skeleton | `PlanViewerLeaflet.tsx` layout wrapper, `PlanToolbar.tsx` chrome |
| CaptureWorkspaceV1Skeleton | `CaptureShell.tsx`, `SharedCaptureTaskHeader.tsx`, `CaptureDataBottomSheet.tsx` layout |

## Production Routes Not Changed

- `app/site-walk/page.tsx` — unchanged
- `app/site-walk/layout.tsx` — unchanged
- `app/site-walk/(act-2-inputs)/walks/page.tsx` — unchanged
- `app/site-walk/(act-2-inputs)/capture/*` — unchanged
- All API routes — unchanged
- Trigger.dev tasks — unchanged
- Supabase schema — unchanged

## How This Stops Patching Broken UI

Instead of incrementally fixing pill-shaped controls, stacked headers, crowded layouts, and bloated drawers in the existing component tree, this layer creates a parallel clean implementation. The old components stay untouched so production continues working. The new V1 components can be reviewed, iterated, and eventually swapped in by updating production route imports.

## Design Rules Applied

1. No `rounded-full` except avatars/circular icon buttons.
2. `rounded-lg` or `rounded-xl` for cards, buttons, and containers.
3. Restrained amber only for primary actions; no saturated orange.
4. One header per screen — no duplicate module headers.
5. No passive metrics unless clickable.
6. No filler descriptions under labels.
7. Dense but readable rows.
8. Drawers/tabs for complex features.
9. Every visible element has a real purpose.

## Preview Route

`/site-walk-v1-preview` — non-production preview showing:
- Home tab with primary actions, core access row, and work panel (Recent/Active/Shared/Review)
- Worksites tab with New Worksite action and empty state
- SlateDrop tab with section links, auto-folder concept, and empty state
- Coordination tab with Assignments/Comments/Inbox/Shared/Invitations/Contacts
- Deliverables tab with Create Deliverable, 9 category chips, status sections
- Plan workspace skeleton (accessible via navigation)
- Capture workspace skeleton (accessible via navigation)
- Desktop sidebar layout at lg+ breakpoint
- Avatar/profile menu in header (Account, Settings, Billing, Organization, Feedback, Help, Sign Out)

## Applied Corrections (2026-05-14 revision)

These corrections have been applied to the V1 preview:

1. **Bottom nav is Home | Worksites/Projects | SlateDrop | Coordination | Deliverables.** Account removed from bottom nav.
2. **Account is in the avatar/profile dropdown** in the header (Account, Settings, Billing, Organization, Feedback, Help, Sign Out).
3. **"Reports" replaced with "Deliverables" everywhere.** Deliverable types include Visual Walk Summary, Punch/Issue Package, Proposal, Before & After, Progress Timeline, 360 Tour, 3D Model Review, Closeout Record, PDF Export.
4. **"Plan Room" banned.** WorksiteV1Row now uses "Plans & Documents." Plans belong under Worksite/Project.
5. **Worksites/Projects label follows entitlement model.** `useProjectLabel` prop on BottomNav and Shell switches between "Worksites" (default) and "Projects" (when full PM tier detected).
6. **SlateDrop is a core nav surface** with Worksite Folders, Recent Uploads, Shared Drops, File Requests, and auto-folder concept display.
7. **Coordination is a core nav surface** with Assignments, Comments, Inbox, Shared With Me, Invitations, Contacts.
8. **Desktop sidebar layout** renders at lg+ breakpoint with full nav; mobile bottom nav hidden at lg+.
9. **Preview remains non-production.** No production routes changed.
10. **Coordination is the correct label** (not "Coordinate"). Fixed in bottom nav, sidebar, and Home core access row.
11. **"Needs Review" is the correct work-panel tab label** (not "Review"). Fixed in SiteWalkV1ListPanel.
12. **Worksites/Projects label** is currently controlled by `useProjectLabel` prop in the preview. It still needs to be wired to the real entitlement/project-access helper (`canCreateFullProject()` from `lib/project-access.ts`) before production swap.
6. **Coordination must be core nav.** Assignments, comments, inbox, and board APIs exist. They need a visible surface.
7. **Account belongs in avatar/profile menu, not primary bottom nav.** Account/Settings is a secondary utility. Use the avatar dropdown for account access; give the primary nav slot to Deliverables, SlateDrop, or Coordination.
8. **Desktop and landscape must be considered from the start.** Current V1 skeleton is phone-portrait only. Must plan for tablet portrait, tablet landscape, and desktop sidebar layout.

## Next Steps After User Reviews Preview Route

1. Revise V1 bottom nav: Home, Worksites, Deliverables, SlateDrop (or Coordination). Account via avatar.
2. User reviews revised preview route on mobile viewport and provides feedback.
3. Iterate V1 components based on feedback.
4. Wire real data from existing hooks/loaders into V1 components.
5. Create a feature-flagged swap of production route imports.
6. Physical device confirmation.
7. Replace production imports and remove old components.
