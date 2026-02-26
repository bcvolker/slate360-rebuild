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
| W-006 | Dashboard/Hub parity regression | Dashboard location widget defaults differ from Project Hub and expanded map can collapse to a small sliver while UI dominates | Runtime behavior divergence in control-panel/layout state and widget sizing defaults | Fixed in code (re-verify live) | `components/dashboard/LocationMap.tsx`, `components/project-hub/ProjectDashboardGrid.tsx`, `app/(dashboard)/project-hub/page.tsx` |
| W-007 | Google Maps API deprecation | Browser console shows deprecations for `DirectionsService` and `DirectionsRenderer` and map styling/tilt warnings | Legacy routes API usage and mapId + raster/tilt limitations in current implementation | In progress | `components/dashboard/LocationMap.tsx` |
| W-008 | Widget state masking new UI | New widget behavior appears unchanged despite deploys | Persisted widget prefs (localStorage / user metadata) can replay stale layout/visibility/order state across routes | Fixed in code (schema reset) | `components/widgets/widget-prefs-storage.ts`, `components/dashboard/DashboardClient.tsx`, `app/(dashboard)/project-hub/page.tsx`, `components/project-hub/ProjectDashboardGrid.tsx` |

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

### 2026-02-26 — Session C
- New user-observed conflict: Project Hub location widget defaults differ from Dashboard, and expanded map can render as a narrow sliver while controls consume most of the widget.
- Updated strategy to map-first expanded behavior:
  - Controls collapsed by default when expanded.
  - Compact/unexpanded widget always exposes toolbar/search path.
  - Expanded control panel gets strict max-height with overflow.
  - Project-level widget defaults normalized to uniform size until explicitly expanded.

### 2026-02-26 — Session D
- Added runtime diagnostics mode to `LocationMap` behind `?widgetDiag=1`.
- Added structural block-isolation test runner: `scripts/widget-block-isolation-test.mjs`.
- Executed test runner + lint + build:
  - Structural checks passed: `8/8`.
  - Lint passed.
  - Build passed (existing unrelated wallet connector warnings remain).
- Captured that Google Maps console warnings are real deprecations/behavior notices and should be migrated, but they are not direct proof of the route-level parity mismatch.

## Validation Notes

- Manual validation checklist (pending full QA):
  - [ ] Dashboard unexpanded location widget shows interactive map + address search/autocomplete.
  - [ ] Dashboard expanded location widget shows map-dominant layout (~80–85% map area) with top controls section.
  - [ ] Project Hub location widget matches Dashboard behavior for compact/expanded states.
  - [ ] Satellite is default for both Dashboard and Project Hub location widgets.
  - [ ] Deploy marker endpoint matches newest commit in dev and Vercel.

  ## Block Isolation Test Strategy (Revised)

  1. Runtime state audit (same browser session):
    - Open `/dashboard` and `/project-hub` in separate tabs.
    - For each location widget, capture: `compact`, `isExpanded`, `controlsExpanded`, map mode button state, and effective map viewport height.

  2. Persisted widget-state audit:
    - Inspect localStorage keys and payloads:
      - `slate360-dashboard-widgets`
      - `slate360-hub-widgets`
      - `slate360-project-widgets-<projectId>`
    - Verify no stale expanded/span state is forcing divergent layout.

  3. Rendered-layout parity check:
    - Measure computed heights of:
      - controls container
      - map canvas container
    - Target in expanded mode: map receives ~80–85% of widget/modal height.

  4. Build/version fingerprint check (conflict detection):
    - Compare active commit SHA + marker from `/api/deploy-info` with UI behavior in each route.
    - If SHA matches but behavior differs, block is in route-specific runtime state, not deploy caching.

  ## Test Execution (2026-02-26)

  - Structural path test:
    - Command: `node scripts/widget-block-isolation-test.mjs`
    - Result: `8/8 PASS`
    - Confirms all active route paths import shared `LocationMap` and expected map-first defaults exist in source.

  - Validation test:
    - Command: `npm run lint -- --max-warnings=0 && npm run build`
    - Result: Pass
    - Note: Existing market connector dependency warnings remain unchanged.

  - Runtime/manual diagnostic mode:
    - Append `?widgetDiag=1` to dashboard or project hub URL.
    - Widget prints route/state/layout snapshot (map % height, control state, storage key presence) in-widget and to console.

  ### 2026-02-26 — Session E
  - Verified git lineage and remote sync:
    - `HEAD` == `origin/main` at commit `a351af2` during test run.
  - Verified deployment linkage:
    - GitHub commit status for `main` shows Vercel success and latest deployment URL.
  - Probed deployment endpoints via curl:
    - `/api/deploy-info`, `/deploy-check`, and `/project-hub` return `401 Authentication Required` due Vercel deployment protection.
    - This blocks unauthenticated external verification of live page payloads from automation.
  - Route conflict scan:
    - Normalized route collision scan reports `0` duplicate routes.
    - Redirect audit shows only `app/features/project-hub/page.tsx` redirecting to `/project-hub`.
  - Build artifact validation:
    - Compiled server/client chunks include latest `LocationMap` strings and behavior markers (`Satellite`, `Map-first mode`, diagnostics labels), proving changes are present in build output.

  ## Additional Blocking Constraint

  - Vercel deployment protection currently prevents anonymous endpoint probing from automation.
  - To fully verify live production behavior from tooling, one of these is required:
    1. Vercel protection bypass token,
    2. Temporary disabling of deployment protection,
    3. Running authenticated `vercel curl` with project access.

### 2026-02-26 — Session F
- New clue confirmed from live probing + user observation:
  - `/dashboard` and `/project-hub` are app-auth gated (redirect to `/login`), so bypass token alone cannot validate post-login UI.
  - Project Hub location widget remained non-interactive/sliver in collapsed mode on `/project-hub` route.
- Root-cause fix applied in route-specific widget wrapper:
  - Set collapsed location widget minimum height to `min-h-[200px]` in `app/(dashboard)/project-hub/page.tsx` to avoid sliver collapse.
  - Disabled drag on the location widget card (`draggable={!w.expanded && w.id !== "location"}`) so map pan/drag gestures are not hijacked by HTML5 card drag.
- Post-fix structural validation:
  - `node scripts/widget-block-isolation-test.mjs` => `8/8 PASS`.

### 2026-02-26 — Session G
- Unified widget preference persistence under a shared, schema-versioned storage path:
  - Added `components/widgets/widget-prefs-storage.ts`.
  - Standardized load/save/merge behavior for dashboard, project hub, and project-level hub widgets.
- Added schema guard for Supabase user metadata widget prefs in dashboard:
  - Dashboard now only hydrates saved metadata prefs when `dashboardWidgetsVersion` matches current schema.
  - Save path now writes both `dashboardWidgets` and `dashboardWidgetsVersion`.
- Expected impact:
  - Prevents stale persisted widget state from masking route-level UI changes after deploy.
  - Forces deterministic defaults for this schema version while keeping future saves consistent.

### 2026-02-26 — Session H
- Identified remaining drag-interception blocker on Dashboard route:
  - The dashboard widget grid wrapper itself remained draggable for collapsed widgets, including `location`.
  - This can hijack pointer drag gestures before Google Maps pan receives them.
- Applied final parity patch:
  - `components/dashboard/DashboardClient.tsx`: `draggable={!p.expanded && p.id !== "location"}` at grid wrapper level.
- Result:
  - Location map pan/drag is now excluded from card/grid drag interception on Dashboard, `/project-hub`, and `/project-hub/[projectId]` paths.

## Next Actions

1. Run the revised block-isolation test strategy and log concrete measurements/screenshots for both routes.
2. Add a lightweight widget system regression checklist and run it before each deploy.
3. Add deploy diagnostics to release flow (marker + commit SHA verification post-deploy).
