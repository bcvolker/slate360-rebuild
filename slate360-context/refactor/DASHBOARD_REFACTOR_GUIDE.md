# Dashboard — Refactor & UI Fix Guide

Last Updated: 2026-03-27
Status: Planning guide. Prioritized execution plan for safe incremental refactoring.

Read this file before touching ANY dashboard code in a refactor session.

---

## Why This Guide Exists

The dashboard has three structural problems that cause every fix to be fragile:

1. **`useDashboardState.ts` is 775 lines** — over the 300-line limit. A single hook owns all billing state, widget preferences, weather data, calendar state, account/API-key editing, notification state, and suggest-feature state. Any future session that touches one domain risks accidentally breaking another because they share a module boundary.

2. **`LocationMap.tsx` is 1,892 lines** — the largest file in the codebase. Contains the dashboard map widget with deprecated DrawingManager code (BUG-018). Has a hard removal deadline of May 2026 when Google removes the Drawing Library.

3. **`DashboardWidgetRenderer.tsx` is 513 lines** — over limit. Responsible for routing between all widget types. Easy to accidentally break unrelated widgets when touching a single widget renderer.

There are also active UI and behavior bugs documented in `ONGOING_ISSUES.md` that need fixing alongside the structural cleanup.

---

## Verified Current State (as of 2026-03-27)

### File Sizes

| File | Lines | Status |
|---|---|---|
| `lib/hooks/useDashboardState.ts` | 775 | 🔴 Over limit — Phase 5B needed |
| `components/dashboard/LocationMap.tsx` | 1,892 | 🔴 Over limit + BUG-018 |
| `components/dashboard/DashboardWidgetRenderer.tsx` | 513 | 🔴 Over limit |
| `components/dashboard/DashboardProjectCard.tsx` | 277 | ✅ Under limit |
| `components/dashboard/DashboardClient.tsx` | 277 | ✅ Under limit (was 1,089 — Phase 5 done) |
| `components/dashboard/DashboardOverview.tsx` | 271 | ✅ Under limit |
| `components/dashboard/DashboardMyAccount.tsx` | 267 | ✅ Under limit |
| `components/dashboard/AccountOverviewRow.tsx` | 255 | ✅ Under limit |
| `components/dashboard/DashboardCalendarWidget.tsx` | 218 | ✅ Under limit |
| `components/dashboard/DashboardWeatherWidget.tsx` | 176 | ✅ Under limit |

### Active Bugs Blocking Good UX

| Bug ID | File | Description | Priority |
|---|---|---|---|
| BUG-018 | `LocationMap.tsx` | DrawingManager deprecated — **May 2026 hard deadline** | 🔴 Critical |
| BUG-019 | Dashboard + ProjectHub widget shells | SlateDrop widget still shows "Open SlateDrop" CTA even when embedded client is visible | 🟡 Medium |
| BUG-021 | Multiple | Location data rendered inconsistently across 4 different views | 🟡 Medium |

### What Was Already Fixed

- `DashboardClient.tsx`: reduced from 2,800 → 277 lines (Phase 5, commit `5c81451`)
- Hydration BUG-017: `isClient` state + `useEffect` guard confirmed in place
- Duplicate header BUG-011: `DashboardHeader` extracted and shared
- `DashboardMyAccount.tsx`: extracted and working
- `TabWireframe.tsx`, `TabRedirectCard.tsx`: extracted

---

## Safe Refactor Strategy

### Core Rule: Additive Extraction Only

Never restructure a working module by rewriting it in place. Only extract pieces into new files. The file you're extracting FROM should only shrink — it should never grow or change behavior.

**The extraction pattern:**
1. Identify the self-contained domain inside the large file.
2. Create a new, focused file for that domain.
3. Import it back in the original file (the original now delegates, not implements).
4. Verify the behavior is identical with `get_errors` + `npm run typecheck`.
5. Only remove the old code from the original file AFTER the new file is confirmed working.

### Commit Granularity

Each phase below is ONE commit. Do not combine multiple extraction phases into a single commit. Small commits mean small rollbacks.

### GitNexus Protocol (mandatory)

Before touching `useDashboardState.ts`, `LocationMap.tsx`, or `DashboardWidgetRenderer.tsx`:

```
mcp_gitnexus_impact — file: <path>
```

These are high-fan-out files. The impact list will be long. Review it before proceeding.

After each phase:
```
mcp_gitnexus_detect_changes
```

Confirm only the intended files changed.

---

## Phase 5B — Split `useDashboardState.ts` Into Sub-Hooks

**Goal:** Reduce `useDashboardState.ts` from 775 lines to under 200 lines by extracting 5 domain-specific sub-hooks.

**Why this is safe:** `useDashboardState.ts` is only called in one place — `DashboardClient.tsx`. The extraction is pure reorganization with no behavior change.

### Sub-Hook Extraction Plan

| New Hook | Responsibility | Est. Lines |
|---|---|---|
| `lib/hooks/useBillingState.ts` | Stripe subscription state, billing portal open, plan change, usage quota display | ~80 |
| `lib/hooks/useWidgetPrefs.ts` | Widget visibility prefs from localStorage, widget layout save/load, widget reorder | ~120 |
| `lib/hooks/useWeatherState.ts` | Weather API fetch, location detection, unit conversion (°F/°C), refresh interval | ~80 |
| `lib/hooks/useAccountEditState.ts` | Display name, avatar, email change, API key display/copy/regenerate | ~100 |
| `lib/hooks/useNotificationsState.ts` | Notification list fetch, mark-read, dismiss, notification count badge | ~80 |
| `lib/hooks/useSuggestFeatureState.ts` | Feature suggestion form state, submit handler | ~40 |

After extraction, `useDashboardState.ts` becomes a composition hook:
```typescript
// useDashboardState.ts — after Phase 5B (~80 lines)
export function useDashboardState(props) {
  const billing = useBillingState(props);
  const widgets = useWidgetPrefs(props);
  const weather = useWeatherState(props);
  const account = useAccountEditState(props);
  const notifications = useNotificationsState(props);
  const suggestFeature = useSuggestFeatureState(props);
  return { ...billing, ...widgets, ...weather, ...account, ...notifications, ...suggestFeature };
}
```

### Pre-Phase 5B Checklist

- [ ] Run `mcp_gitnexus_impact` on `lib/hooks/useDashboardState.ts` — review all consumers.
- [ ] Read all 775 lines of `useDashboardState.ts` and identify the exact state variable groupings.
- [ ] Confirm `useDashboardState` is ONLY called in `DashboardClient.tsx` (if it's called elsewhere, do NOT use the spread return pattern — you'll need explicit named returns).
- [ ] Run `npm run typecheck` before starting to establish a clean baseline.

### Phase 5B Exit Criteria

- `useDashboardState.ts` is under 200 lines.
- All new sub-hook files are under 150 lines.
- `get_errors` on all changed files: 0 errors.
- `npm run typecheck`: 0 errors.
- Dashboard loads, widgets render, billing state works.

---

## Phase 6 — Extract `DashboardWidgetRenderer.tsx` (513 → 5 focused files)

**Goal:** Break the widget renderer into one file per widget family.

**Why now:** At 513 lines, this file is already over limit and will grow as new widgets are added. Extracting now means every new widget addition is isolated.

### Proposed Extraction

```
components/dashboard/widgets/
  WeatherWidgetRenderer.tsx       ← weather widget rendering logic
  CalendarWidgetRenderer.tsx      ← calendar widget rendering logic
  ProjectWidgetRenderer.tsx       ← project card widget rendering
  MapWidgetRenderer.tsx           ← location map widget rendering
  SlateDropWidgetRenderer.tsx     ← SlateDrop embedded widget rendering (also fixes BUG-019)
  WidgetRendererIndex.ts          ← re-exports for DashboardWidgetRenderer.tsx
```

`DashboardWidgetRenderer.tsx` becomes a thin router:
```typescript
// routes widgetType → extracted renderer component
// ~80 lines after extraction
```

### BUG-019 Fix — Embedded in This Phase

When extracting `SlateDropWidgetRenderer.tsx`, apply the BUG-019 fix:
- If `embedded={true}`, render `SlateDropClient` directly without the "Open SlateDrop" CTA button.
- Remove the redundant shell-level CTA when the client is already embedded and visible.

### Phase 6 Exit Criteria

- `DashboardWidgetRenderer.tsx` under 100 lines.
- Each renderer file under 200 lines.
- BUG-019 resolved: no extra click needed to open embedded SlateDrop widget.
- All widget types still render correctly (smoke-test each one).

---

## Phase 7 — BUG-018: LocationMap DrawingManager Migration

**Hard deadline: May 2026** — Google removes the Drawing Library.

**Goal:** Migrate `LocationMap.tsx` from deprecated `DrawingManager` to native `google.maps` click-based drawing. This touches ~400 lines within the 1,892-line file.

**Do NOT attempt to shrink `LocationMap.tsx` at the same time as fixing BUG-018.** These are separate concerns. Fix the bug first, then extract.

### Context

- File: `components/dashboard/LocationMap.tsx`
- Deprecated at: line 194 (`useMapsLibrary("drawing")`) and line 1479 (`<APIProvider libraries={["places","drawing","geometry"]}>`)
- Deprecated code at: line 459 (`new drawingLib.DrawingManager(...)`)
- Reference pattern: `components/project-hub/WizardLocationPicker.tsx` — uses native `google.maps` click-based polygon/marker drawing without the Drawing Library

### Migration Approach

1. Remove `"drawing"` from the `APIProvider libraries` array at line 1479.
2. Remove `useMapsLibrary("drawing")` at line 194.
3. Remove all `DrawingManager` instantiation and event listener setup (~40 lines around line 459).
4. Replace each drawing tool with a native `google.maps` click handler implementation:
   - **Marker placement**: `map.addListener("click", handler)` — single click places marker
   - **Polyline drawing**: click to add points, double-click to close
   - **Polygon drawing**: click to add vertices, double-click to close
   - **Rectangle/circle**: click + drag via `mousedown` + `mousemove` + `mouseup` listeners
5. Keep the same visual drawing UI — the user experience should be identical.

### Pre-Phase 7 Checklist

- [ ] Run `mcp_gitnexus_impact` on `LocationMap.tsx` before touching it.
- [ ] Read the full `DrawingManager` setup block and all event handlers in the file before replacing.
- [ ] Read `WizardLocationPicker.tsx` (412 lines) to understand the target drawing pattern.
- [ ] Test DrawingManager tools in the current app to document the exact expected behavior before replacing.
- [ ] Confirm the file will remain under 1,892 lines after migration (it should shrink slightly).

### Phase 7 Exit Criteria

- `"drawing"` library no longer referenced anywhere in `LocationMap.tsx`.
- All drawing tools (marker, polyline, polygon) work correctly with click-based replacements.
- No console errors about DrawingManager deprecation.
- `get_errors` + `npm run typecheck` pass.

---

## Phase 8 — LocationMap Extraction (Post-BUG-018)

**Goal:** Extract `LocationMap.tsx` from 1,892 lines down towards the 300-line limit.

**Wait for Phase 7 to be complete before starting Phase 8.**

### Proposed Extraction Targets

| Component | Extract To | Est. Lines |
|---|---|---|
| Drawing tool state and event handlers | `components/dashboard/map/DrawingToolHandler.tsx` | ~300 |
| Route display and distance calculation | `components/dashboard/map/RouteRenderer.tsx` | ~200 |
| Location search and geocoding | `components/dashboard/map/LocationSearchPanel.tsx` | ~150 |
| Map controls and overlays | `components/dashboard/map/MapControlPanel.tsx` | ~200 |
| Marker cluster management | `components/dashboard/map/MarkerClusterManager.tsx` | ~150 |
| LocationMap core | `components/dashboard/LocationMap.tsx` | ~300 (coordination layer) |

### Phase 8 Exit Criteria

- `LocationMap.tsx` under 300 lines.
- All extracted components under 300 lines.
- All existing map functionality works identically.

---

## Phase 9 — BUG-021: Shared Location Display Component

**Goal:** Extract consistent location display into a shared component used across all 4 contexts.

### Contexts That Render Location Data Inconsistently

1. `WizardLocationPicker` (project creation, step 3) — map + address selector
2. `LocationMap` (dashboard widget) — full map view
3. Project card views (list/grid in Project Hub) — address text only
4. Project Hub Tier 2 project home — address + small map

### Solution

Create `components/shared/LocationDisplay.tsx` with:
- `variant="full"` — full map with controls (for dedicated views)
- `variant="card"` — text address + optional mini map (for project cards)
- `variant="chip"` — one-line address with pin icon (for list views)

### Phase 9 Exit Criteria

- `LocationDisplay` is used in all 4 address-display contexts.
- Visual consistency: same font, icon, and layout style across all views.
- Data contract is shared: all contexts pass the same `{ lat, lng, address }` shape.

---

## UI Fix Queue

These are UI/UX issues to address after or alongside the structural refactoring. Each is a small, focused change that should not require large structural changes.

### UI-001 — Dashboard Widget Empty States

Widgets that show no data (no projects, no weather location set, no recent files) should show inviting empty-state cards with an action button, not blank space.

**Target files:** `DashboardWeatherWidget.tsx`, `DashboardCalendarWidget.tsx`, `DashboardWidgetRenderer.tsx`

### UI-002 — Consistent Accent Color in Dashboard

Design Studio uses `#7C3AED` in DashboardClient but `#FF4D00` in DesignStudioShell. All scaffolded tabs should use `#FF4D00` as the global accent unless they have a tab-specific color.

**Audit:** Check `DashboardClient.tsx` `TABS` array and each Shell file for color consistency.

### UI-003 — Project Card Status Badges

Project cards should show a status badge (Active / On Hold / Archived) with consistent color coding. Currently the status field exists in data but is not consistently displayed.

**Target file:** `DashboardProjectCard.tsx`

### UI-004 — Mobile: Widget Overflow

On mobile viewport, some dashboard widgets overflow their container horizontally. Audit widget containers for `overflow-x-hidden` and proper responsive padding.

### UI-005 — Calendar Widget Month Navigation

The calendar widget's month navigation arrows lack sufficient touch target size on mobile. Increase hit area to 44×44px minimum.

**Target file:** `DashboardCalendarWidget.tsx`

---

## Safe-Build Checklist For Every Refactor Prompt

### Before Writing Code

1. Read `SLATE360_PROJECT_MEMORY.md` latest handoff first.
2. Check `ops/bug-registry.json` and `ONGOING_ISSUES.md` for bugs in the files you're touching.
3. Run `wc -l <file>` on every file you plan to edit.
4. Run `mcp_gitnexus_impact` on any file you plan to modify.
5. Read BOTH the full state hook AND the JSX that uses it before editing either.

### While Extracting

6. Extract → import → verify before deleting old code. Never delete first.
7. After creating a new file, immediately confirm it is imported in the consuming file.
8. Do not change behavior during extraction — extraction is shape change only.
9. TypeScript: extracted sub-hooks must have explicit return types, not `typeof` inference.

### After Extracting

10. Run `get_errors` on ALL changed files.
11. Run `npm run typecheck`.
12. Run `mcp_gitnexus_detect_changes` — confirm no unintended drift.
13. Run `bash scripts/check-file-size.sh`.
14. Smoke-test: load the dashboard, switch tabs, open widgets, verify all visible data.
15. Update `SLATE360_PROJECT_MEMORY.md` session handoff.
16. Update this `REFACTOR_GUIDE.md` with completed phases.

---

## Phase Completion Tracker

| Phase | Description | Status |
|---|---|---|
| Phase 5 | DashboardClient extraction (2,800 → 277 lines) | ✅ Complete |
| Phase 5B | Split `useDashboardState.ts` into sub-hooks | ⬜ Not started |
| Phase 6 | Extract `DashboardWidgetRenderer.tsx` + BUG-019 fix | ⬜ Not started |
| Phase 7 | BUG-018: LocationMap DrawingManager migration | ⬜ Not started |
| Phase 8 | LocationMap extraction (1,892 → ~300 lines) | ⬜ Not started |
| Phase 9 | BUG-021: Shared `LocationDisplay` component | ⬜ Not started |
| UI-001 | Widget empty states | ⬜ Not started |
| UI-002 | Accent color audit | ⬜ Not started |
| UI-003 | Project card status badges | ⬜ Not started |
| UI-004 | Mobile widget overflow | ⬜ Not started |
| UI-005 | Calendar touch target | ⬜ Not started |

---

## Known Risks

### Risk: Phase 5B introduces a prop signature change

If `useDashboardState` returns a new shape, `DashboardClient.tsx` destructuring breaks.

Mitigation: Use the spread-merge return pattern. `DashboardClient.tsx` should not need to change its destructuring at all.

### Risk: LocationMap is too large to read in one context window

Mitigation: Use `grep_search` to locate the exact DrawingManager block before reading the file. Read only the 400-line relevant section (lines 150-600), not the whole file. Use `mcp_gitnexus_query` to confirm what depends on the drawing features.

### Risk: Widget renderer extraction breaks an obscure widget type

Mitigation: Before extraction, list ALL widget types rendered by `DashboardWidgetRenderer.tsx`. Test each one after Phase 6 completes.

### Risk: Sub-hook extraction changes the import path for types

Mitigation: Keep all types in `lib/types/dashboard.ts`. Hooks import types — they do not declare types locally.
