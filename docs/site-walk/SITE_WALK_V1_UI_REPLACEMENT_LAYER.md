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
- Home tab with action grid and tabbed list panel
- Worksites tab with empty state
- Reports tab with empty state
- Account tab with real utility links only
- Plan workspace skeleton (accessible via navigation)
- Capture workspace skeleton (accessible via navigation)

## Next Steps After User Reviews Preview Route

1. User reviews preview route on mobile viewport and provides feedback.
2. Iterate V1 components based on feedback.
3. Wire real data from existing hooks/loaders into V1 components.
4. Create a feature-flagged swap of production route imports.
5. Physical device confirmation.
6. Replace production imports and remove old components.
