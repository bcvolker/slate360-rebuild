# Widget System Issue Tracker

Last updated: 2026-02-26
Owner: Platform UI / Dashboard + Project Hub

## Goal
Unify Dashboard and Project Hub widgets so they share the same behavior, sizing, customization controls, drag interactions, and visual system.

## Active Issues

| ID | Area | Symptom | Root Cause (Current) | Status | Evidence |
|---|---|---|---|---|---|
| W-001 | Location widget | Search/autocomplete missing in unexpanded widget | `LocationMap` compact mode hid toolbar/search controls | Fixed in code | `components/dashboard/LocationMap.tsx` |
| W-002 | Location widget | Expanded state does not keep map as primary visual focus | Controls and map layout were not constrained for modal density | Fixed in code | `components/dashboard/LocationMap.tsx` |
| W-003 | Location widget | Default view did not open in satellite | `isThreeD` initialized to false | Fixed in code | `components/dashboard/LocationMap.tsx` |
| W-004 | Widget platform parity | Project Hub project-level dashboard differs from shared widget system | `ProjectDashboardGrid` still uses separate `react-grid-layout` implementation | Fixed in code | `components/project-hub/ProjectDashboardGrid.tsx` |
| W-005 | Deploy visibility | New changes not visible consistently across environments | Suspected stale CDN/browser/server cache + deploy propagation timing | Monitoring | `next.config.ts`, `app/deploy-check/page.tsx`, `app/api/deploy-info/route.ts` |

## Change Log

### 2026-02-26 — Session A
- Committed routing correction for Project Hub feature links.
- Updated Location widget UX in shared component:
  - Satellite is now default.
  - Compact (unexpanded) widget now supports controls/search toggle path.
  - Expanded modal now supports top control package with collapsible controls and map-first layout.
- Confirmed backend environment variables exist for Supabase and AWS in local environment.
- Confirmed CLI tooling (`supabase`, `aws`, `psql`) is not installed in container yet.

### 2026-02-26 — Session B
- Replaced `ProjectDashboardGrid` legacy `react-grid-layout` implementation with shared widget primitives.
- Added project-level widget customization drawer, reorder drag/drop, visibility toggles, and expand behavior parity.
- Wired project-level location widget to shared `LocationMap` so compact/expanded controls and satellite default are consistent.

## Validation Notes

- Manual validation checklist (pending full QA):
  - [ ] Dashboard unexpanded location widget shows interactive map + address search/autocomplete.
  - [ ] Dashboard expanded location widget shows map-dominant layout (~80–85% map area) with top controls section.
  - [ ] Project Hub location widget matches Dashboard behavior for compact/expanded states.
  - [ ] Satellite is default for both Dashboard and Project Hub location widgets.
  - [ ] Deploy marker endpoint matches newest commit in dev and Vercel.

## Next Actions

1. Add a lightweight widget system regression checklist and run it before each deploy.
2. Add deploy diagnostics to release flow (marker + commit SHA verification post-deploy).
3. Consider merging project-specific widget metadata into a shared typed registry to remove duplicated per-page definitions.
