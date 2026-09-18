# Slate360 Phase 1 — Review and Approval Protocol

## Inputs required from Cursor after each slice
- branch/worktree
- commit SHA or dirty diff status
- exact files changed
- tests run
- routes affected
- screenshots
- **Interaction Coverage** (required for any slice that adds or changes a control)
- known limitations
- confirmation next slice was not started

## Standing interaction QA rule

A control is not complete because it renders.

Any slice that creates or modifies links, buttons, dropdowns, overflow menus, dialogs, drawers, tabs, toggles, forms, search, filters, viewer controls, contextual menus, or rename/edit/delete/copy/share/upload/save/publish actions must add or update automated tests in the same slice.

Canonical suite: `e2e/vnext/` and `lib/vnext/*.test.ts`. Command: `npm run test:vnext`.

Interaction Coverage must list:

- controls added/changed
- automated test covering each control
- routes tested
- auth roles tested where applicable
- console/page/request errors observed
- known untested behavior

Unexpected console errors, page errors, failed requests, and undocumented HTTP 4xx/5xx fail the slice.

## GitHub review
Check:
- only expected areas changed
- no reconstruction/trainer changes
- no accidental backend/schema drift
- no obsolete route resurrection
- no duplicated logic when existing backend could be reused
- no dead imports
- no hidden navigation entries
- no new unapproved tabs/cards/metrics
- permissions/auth retained
- useful behavior not silently dropped

## Visual review
For UI slices review:
- 1440 desktop
- laptop
- tablet
- phone

Check:
- image-first project presentation
- no giant blank areas
- no glassmorphism
- no dark SaaS shell outside immersive viewer
- no decorative icon tiles
- no nested-card clutter
- no fake stats
- no unnecessary badges
- no generic AI copy
- no tiny controls
- no duplicate nav
- no weird scroll traps
- no layout dead zones
- no cryptic labels
- project content remains the focus

## Interaction review
Check:
- browser back/forward
- refresh
- direct deep link
- loading
- no-data
- unauthorized
- network/error
- mobile touch
- keyboard/mouse where applicable
- fullscreen exit
- reset/recenter
- representation switching
- visit switching
- item/document deep links

## Approval states
### APPROVED
No blocking issues. Next slice may begin only after Brian explicitly sends approval.

### APPROVED WITH SMALL FIXES
Small corrections only; Cursor applies them and returns proof.

### REVISE BEFORE NEXT SLICE
Blocking architecture, UX, route, permission, bug, or visual-quality issue.

## Approval template
APPROVED FOR NEXT SLICE.

The current slice is accepted subject only to the notes below.

Do not revisit or redesign approved screens unless a later dependency requires it.
Do not begin any work beyond the next approved slice.
Continue to follow the canonical Phase 1 plan and UI rules.

At completion, provide:
- changed files
- tests
- screenshots
- known limitations
- confirmation you did not begin the subsequent slice.

[Specific notes]

## Revision template
REVISE CURRENT SLICE BEFORE PROCEEDING.

Do not begin the next slice.

Fix only:
1. ...
2. ...
3. ...

Return:
- exact changed files
- before/after screenshots
- tests run
- confirmation the next slice was not started.
