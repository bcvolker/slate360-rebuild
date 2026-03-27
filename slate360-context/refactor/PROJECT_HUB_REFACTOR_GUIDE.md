# Project Hub — Refactor & UI Fix Guide

Last Updated: 2026-03-27
Status: Planning guide. Prioritized execution plan for safe incremental refactoring.

Read this file before touching ANY Project Hub code in a refactor session.

---

## Why This Guide Exists

The Project Hub has the single largest collection of oversized files in the codebase. Almost every tool-level page exceeds the 300-line limit — several by 2–3x. Combined with active bugs and missing features, the module is both technically risky to edit AND incomplete in user-facing functionality.

The refactoring strategy here is exclusively additive extraction. No rewrites. No behavior changes alongside structure changes.

---

## Verified Current State (as of 2026-03-27)

### File Sizes — Route Pages

| File | Lines | Status |
|---|---|---|
| `app/(dashboard)/project-hub/[projectId]/management/page.tsx` | 931 | 🔴 3× over limit |
| `app/(dashboard)/project-hub/[projectId]/photos/page.tsx` | 599 | 🔴 2× over limit |
| `app/(dashboard)/project-hub/[projectId]/submittals/page.tsx` | 579 | 🔴 Almost 2× over limit |
| `app/(dashboard)/project-hub/[projectId]/schedule/page.tsx` | 465 | 🔴 Over limit |
| `app/(dashboard)/project-hub/[projectId]/drawings/page.tsx` | 448 | 🔴 Over limit |
| `app/(dashboard)/project-hub/[projectId]/budget/page.tsx` | 421 | 🔴 Over limit |
| `app/(dashboard)/project-hub/[projectId]/punch-list/page.tsx` | 403 | 🔴 Over limit |
| `app/(dashboard)/project-hub/[projectId]/rfis/page.tsx` | 339 | 🔴 Over limit |
| `app/(dashboard)/project-hub/[projectId]/daily-logs/page.tsx` | 358 | 🔴 Over limit |
| `app/(dashboard)/project-hub/ClientPage.tsx` | 255 | ✅ Under limit |

### File Sizes — Component Files

| File | Lines | Status |
|---|---|---|
| `components/project-hub/ProjectDashboardGrid.tsx` | 560 | 🔴 Almost 2× over limit |
| `components/project-hub/WizardLocationPicker.tsx` | 412 | 🔴 Over limit |
| `components/project-hub/ObservationsClient.tsx` | 334 | 🔴 Over limit |
| `components/project-hub/CreateProjectWizard.tsx` | 231 | ✅ Under limit |
| `components/project-hub/ProjectHubPortfolioOverview.tsx` | 251 | ✅ Under limit |
| `components/project-hub/ViewCustomizer.tsx` | 171 | ✅ Under limit |

### Active Bugs

| Bug ID | File | Description | Priority |
|---|---|---|---|
| BUG-010 | `WizardLocationPicker.tsx` | Places API 403 fallback active — confirm 403s resolved in production | 🟡 Monitor |
| BUG-013 | `ClientPage.tsx` + missing API | High-level analytics snapshot missing from Tier 1 all-projects view | 🔴 Open |
| BUG-021 | Multiple | Location rendering inconsistent across 4 views | 🟡 Open |

### Tech Debt

| Item | File(s) | Priority |
|---|---|---|
| `file_folders` → `project_folders` migration | Design Studio page, export-zip route, audit trail | High |
| No `project_activity_log` table | `ChangeHistory.tsx` derives history from timestamps only | Medium |
| 300-line limit violations | 9 route pages + 2 component files | High |
| Daily log CSV not auto-saved to SlateDrop | `daily-logs/page.tsx` | Low |
| Contracts saved to `/Submittals/` folder | `management/page.tsx` | Low |

---

## Safe Refactor Strategy

### The Only Permitted Extraction Pattern

Every refactor in this module must follow this exact pattern:

1. Identify a self-contained form, table, row, or panel within the oversized page.
2. Create a new component file in `components/project-hub/` for that subcomponent.
3. Import the new component back into the page file.
4. Verify behavior is identical: `get_errors` + `npm run typecheck` + smoke test.
5. Only then remove the inlined version from the page file.

**Never combine a structural extraction with a behavior or UI change in the same commit.** Extract first, then fix.

### File Location Rules

All extracted components stay in `components/project-hub/`. Do not create deep nested folders for the first extraction pass. If a component is used only by one tool page, it still goes in `components/project-hub/` — not inside a subfolder like `components/project-hub/management/`.

Use subfolder nesting only if 3+ components share a specific domain (e.g., if 3 management-related components are extracted, then `components/project-hub/management/` makes sense).

### GitNexus Protocol

Before touching any Project Hub file:
```
mcp_gitnexus_impact — file: <path>
```

After each phase:
```
mcp_gitnexus_detect_changes
```

If `ProjectDashboardGrid.tsx` is being modified, `WizardLocationPicker.tsx` is being modified, or any file in `app/(dashboard)/project-hub/` is being modified — run the impact check first. These files are used across multiple project views.

---

## Phase 1 — Fix BUG-013: Analytics Snapshot on Tier 1 View

**Goal:** Restore the missing high-level analytics section at the top of the all-projects view (ClientPage).

This is a feature addition, not a refactor. Do it first because it delivers user value without structural risk.

### What to Add

A summary card row at the top of `app/(dashboard)/project-hub/ClientPage.tsx` showing:
- Total projects (all statuses)
- Active projects
- Open RFIs count
- Open observations count
- Budget total (sum of all project budgets where available)

### New API Route Required

`GET /api/projects/summary` — returns:
```typescript
interface ProjectSummary {
  totalProjects: number;
  activeProjects: number;
  openRfis: number;
  openObservations: number;
  totalBudget: number | null;
}
```

### Files to Touch

- `app/api/projects/summary/route.ts` — NEW, server-only summary aggregation
- `app/(dashboard)/project-hub/ClientPage.tsx` — add summary row component
- `components/project-hub/ProjectHubSummaryBar.tsx` — NEW, renders the summary cards
- `lib/types/project-hub.ts` or `lib/types/projects.ts` — add `ProjectSummary` type if not present

### Phase 1 Exit Criteria

- Summary bar is visible at the top of the all-projects view.
- Numbers are accurate from the DB.
- No layout regressions on list or grid view.

---

## Phase 2 — Extract `management/page.tsx` (931 → ~250 lines)

**This is the highest-priority extraction.** At 931 lines it is a 3x violation and the riskiest file to touch.

### Identified Extraction Targets

| Component | Extract To | Est. Lines |
|---|---|---|
| Contract management form + list | `ProjectContractPanel.tsx` | ~200 |
| Daily log management | `ProjectDailyLogPanel.tsx` | ~150 |
| Team member management | `ProjectTeamPanel.tsx` | ~150 |
| Budget overview section | `ProjectBudgetSummary.tsx` | ~100 |
| Settings section | `ProjectSettingsPanel.tsx` | ~100 |
| `management/page.tsx` after extraction | coordination shell | ~200 |

### Phase 2 Exit Criteria

- `management/page.tsx` under 250 lines.
- All extracted files under 200 lines.
- Management page UI and all save/edit flows work identically.
- `npm run typecheck` passes.

---

## Phase 3 — Extract `photos/page.tsx` (599 → ~200 lines)

### Identified Extraction Targets

| Component | Extract To | Est. Lines |
|---|---|---|
| Photo upload dropzone | `PhotoUploadDropzone.tsx` | ~100 |
| Photo grid/card display | `PhotoGridView.tsx` | ~120 |
| Photo detail/lightbox modal | `PhotoDetailModal.tsx` | ~150 |
| Photo annotation/comment | `PhotoAnnotationPanel.tsx` | ~80 |
| `photos/page.tsx` after extraction | coordination shell | ~150 |

### Phase 3 Exit Criteria

- `photos/page.tsx` under 200 lines.
- Photo upload, grid view, and modal all work identically.

---

## Phase 4 — Extract `submittals/page.tsx` (579 → ~200 lines)

### Identified Extraction Targets

| Component | Extract To | Est. Lines |
|---|---|---|
| Submittal form (create/edit) | `SubmittalForm.tsx` | ~150 |
| Submittal table/list rows | `SubmittalRow.tsx` | ~80 |
| Submittal status filter bar | `SubmittalFilterBar.tsx` | ~60 |
| Submittal detail drawer | `SubmittalDetailDrawer.tsx` | ~150 |
| `submittals/page.tsx` after extraction | coordination shell | ~150 |

### Phase 4 Exit Criteria

- `submittals/page.tsx` under 200 lines.
- Submittal create/edit/filter all work identically.

---

## Phase 5 — Extract `schedule/page.tsx`, `drawings/page.tsx`, `budget/page.tsx`

Handle three over-limit pages in one focused session. These are simpler than management and photos.

### `schedule/page.tsx` (465 lines)

| Component | Extract To | Est. Lines |
|---|---|---|
| Schedule event form | `ScheduleEventForm.tsx` | ~120 |
| Schedule timeline row | `ScheduleTimelineRow.tsx` | ~80 |
| Milestone panel | `ScheduleMilestonePanel.tsx` | ~100 |
| `schedule/page.tsx` after extraction | coordination shell | ~150 |

### `drawings/page.tsx` (448 lines)

| Component | Extract To | Est. Lines |
|---|---|---|
| Drawing upload panel | `DrawingUploadPanel.tsx` | ~100 |
| Drawing version row | `DrawingVersionRow.tsx` | ~80 |
| Drawing viewer wrapper | `DrawingViewerWrapper.tsx` | ~120 |
| `drawings/page.tsx` after extraction | coordination shell | ~150 |

### `budget/page.tsx` (421 lines)

| Component | Extract To | Est. Lines |
|---|---|---|
| Budget line item form | `BudgetLineItemForm.tsx` | ~100 |
| Budget summary cards | `BudgetSummaryCards.tsx` | ~80 |
| Budget line item row | `BudgetLineRow.tsx` | ~80 |
| `budget/page.tsx` after extraction | coordination shell | ~150 |

### Phase 5 Exit Criteria

- All three pages under 200 lines.
- All form/view/edit behaviors identical.

---

## Phase 6 — Extract `punch-list/page.tsx`, `rfis/page.tsx`, `daily-logs/page.tsx`

### `punch-list/page.tsx` (403 lines)

| Component | Extract To | Est. Lines |
|---|---|---|
| Punch list item form | `PunchListItemForm.tsx` | ~100 |
| Punch list item row | `PunchListRow.tsx` | ~80 |
| Punch list filter bar | `PunchListFilterBar.tsx` | ~60 |
| `punch-list/page.tsx` after extraction | coordination shell | ~150 |

### `rfis/page.tsx` (339 lines)

| Component | Extract To | Est. Lines |
|---|---|---|
| RFI form | `RfiForm.tsx` | ~120 |
| RFI status row | `RfiRow.tsx` | ~80 |
| `rfis/page.tsx` after extraction | coordination shell | ~130 |

### `daily-logs/page.tsx` (358 lines)

| Component | Extract To | Est. Lines |
|---|---|---|
| Daily log entry form | `DailyLogEntryForm.tsx` | ~120 |
| Daily log entry row | `DailyLogRow.tsx` | ~80 |
| `daily-logs/page.tsx` after extraction | coordination shell | ~140 |

### Phase 6 Exit Criteria

- All three pages under 200 lines.
- CSV export still works from daily-logs.
- RFI and punch-list status changes persist.

---

## Phase 7 — Extract `ProjectDashboardGrid.tsx` (560 → ~250 lines)

`ProjectDashboardGrid.tsx` is the project-level dashboard home (Tier 2 first tab). At 560 lines it is the largest component file in the module.

### Identified Extraction Targets

| Component | Extract To | Est. Lines |
|---|---|---|
| Widget grid layout | `ProjectWidgetGrid.tsx` | ~100 |
| Budget summary widget | `ProjectBudgetWidget.tsx` | ~100 |
| RFI overview widget | `ProjectRfiWidget.tsx` | ~80 |
| Recent activity widget | `ProjectActivityWidget.tsx` | ~100 |
| Location map widget | `ProjectLocationWidget.tsx` | ~80 |
| `ProjectDashboardGrid.tsx` after extraction | coordination shell | ~100 |

### Phase 7 Exit Criteria

- `ProjectDashboardGrid.tsx` under 150 lines.
- All widget panels render correctly.
- Project dashboard home loads without errors.

---

## Phase 8 — Extract `ObservationsClient.tsx` + `WizardLocationPicker.tsx`

### `ObservationsClient.tsx` (334 lines)

| Component | Extract To | Est. Lines |
|---|---|---|
| Observation entry form | `ObservationEntryForm.tsx` | ~100 |
| Observation list row | `ObservationRow.tsx` | ~80 |
| `ObservationsClient.tsx` after extraction | coordination shell | ~150 |

### `WizardLocationPicker.tsx` (412 lines)

This file uses click-based drawing (the correct pattern). It does NOT need DrawingManager migration. However, it is over the 300-line limit.

| Component | Extract To | Est. Lines |
|---|---|---|
| Map click-drawing state and logic | `WizardDrawingManager.ts` (hook, not component) | ~150 |
| Geocoding and address search | `WizardAddressSearch.tsx` | ~100 |
| `WizardLocationPicker.tsx` after extraction | map + coordination | ~160 |

### Phase 8 Exit Criteria

- `ObservationsClient.tsx` under 200 lines.
- `WizardLocationPicker.tsx` under 200 lines.
- Project creation wizard step 3 (location) works identically.
- Observation create/view/resolve works identically.

---

## Phase 9 — BUG-021: Shared LocationDisplay Component

Cross-module extraction. After Phase 8 completes, create a shared `components/shared/LocationDisplay.tsx` component with `variant="full"`, `variant="card"`, and `variant="chip"` modes.

Replace all locations where address data is rendered inconsistently across Project Hub and Dashboard.

See `slate360-context/refactor/DASHBOARD_REFACTOR_GUIDE.md` Phase 9 for the shared component specification — this phase for both modules is the same work.

---

## UI Fix Queue

### UI-PH-001 — Project Card Address Display

Project cards in the all-projects grid do not show address information consistently. Some show full address, some show city only, some show nothing.

**Target files:** `components/project-hub/ProjectHubPortfolioOverview.tsx`, project card subcomponents.

**Fix:** Use a consistent `LocationDisplay` chip variant (Phase 9 dependency, but can be simplified now).

### UI-PH-002 — Project Status Badge Styling

Open/On Hold/Archived status badges on project cards are unstyled or use plain text. Need color-coded badges:
- Active → green
- On Hold → yellow
- Archived → gray

**Target files:** `components/project-hub/ProjectHubPortfolioOverview.tsx`, `components/project-hub/ProjectHubAllProjectsTab.tsx`

### UI-PH-003 — Tool Page Empty States

RFI, Punch List, Submittals, and Observations pages show blank content when there are no items, instead of an inviting empty-state card with a "Create your first ___" CTA.

**Target:** Each tool page's empty-list branch. Extract a shared `ToolEmptyState.tsx` component.

### UI-PH-004 — Consistent Page Header Across Tools

Each tool page renders its own header inconsistently. Some have a large title, some have a breadcrumb, some have nothing above the content.

**Target:** Extract a reusable `ProjectToolHeader.tsx` that all tool pages use.

### UI-PH-005 — Mobile Responsive: Workspace Tabs

On mobile, the `ProjectHubWorkspaceTabs.tsx` tab list overflows without scrolling, cutting off tabs that don't fit.

**Fix:** Add `overflow-x-auto whitespace-nowrap` to the tab strip container. Confirm touch scrolling works.

---

## Safe-Build Checklist For Every Refactor Prompt

### Before Writing Code

1. Read `SLATE360_PROJECT_MEMORY.md` latest handoff first.
2. Check `ops/bug-registry.json` and `ONGOING_ISSUES.md` for active bugs in target files.
3. Run `wc -l <file>` on every file you plan to edit.
4. Run `mcp_gitnexus_impact` on every file you plan to modify.
5. Identify the exact extraction target (form, row, panel) and its lines in the file.

### While Extracting

6. Extract → import → verify → delete inline version.
7. New component created → immediately confirm it is imported in the page file.
8. Do not change props, handler signatures, or behavior during extraction.
9. Server components (page.tsx files) must remain server components — extracted components may be `"use client"` only if they were already calling client hooks.

### After Extracting

10. Run `get_errors` on ALL changed files.
11. Run `npm run typecheck`.
12. Run `mcp_gitnexus_detect_changes` — confirm no unintended drift.
13. Run `bash scripts/check-file-size.sh`.
14. Smoke-test: load the project hub, navigate to the tool page you modified, perform a create/edit/delete flow.
15. Update `SLATE360_PROJECT_MEMORY.md` session handoff.
16. Update this `REFACTOR_GUIDE.md` tracker with completed phases.

---

## Phase Completion Tracker

| Phase | Description | Status |
|---|---|---|
| 1 | BUG-013: Analytics snapshot on Tier 1 view | ⬜ Not started |
| 2 | Extract `management/page.tsx` (931 → 250) | ⬜ Not started |
| 3 | Extract `photos/page.tsx` (599 → 200) | ⬜ Not started |
| 4 | Extract `submittals/page.tsx` (579 → 200) | ⬜ Not started |
| 5 | Extract `schedule`, `drawings`, `budget` pages | ⬜ Not started |
| 6 | Extract `punch-list`, `rfis`, `daily-logs` pages | ⬜ Not started |
| 7 | Extract `ProjectDashboardGrid.tsx` (560 → 150) | ⬜ Not started |
| 8 | Extract `ObservationsClient.tsx` + `WizardLocationPicker.tsx` | ⬜ Not started |
| 9 | BUG-021: Shared `LocationDisplay` component | ⬜ Not started |
| UI-PH-001 | Project card address display | ⬜ Not started |
| UI-PH-002 | Project status badge styling | ⬜ Not started |
| UI-PH-003 | Tool page empty states | ⬜ Not started |
| UI-PH-004 | Consistent tool page headers | ⬜ Not started |
| UI-PH-005 | Mobile: workspace tabs overflow | ⬜ Not started |

---

## Known Risks

### Risk: `management/page.tsx` has tightly coupled contract + team + settings state

At 931 lines, all state may be declared at the top and shared across multiple sections.

Mitigation: Read the FULL file before extracting. Identify ALL `useState` declarations and which section uses each variable. Map the data flow before writing any new component.

### Risk: Extracting a form component changes how validation errors bubble up

Mitigation: Keep the form submit handler and validation logic in the page file during the first extraction pass. Extract the UI shell (fields + labels + layout) only. Move the handler in a second, separate pass.

### Risk: `ProjectDashboardGrid.tsx` widget data is fetched inside the component

Mitigation: Run `mcp_gitnexus_query` to find what data is fetched and where. If data is fetched in the parent `ProjectDashboardGrid.tsx`, keep the fetch there and pass data as props to extracted widget components.

### Risk: Tool page route files have `"use client"` that cannot be changed

Page route files (`page.tsx`) under the App Router can be either server or client components. Most of these are probably already `"use client"`. When extracting, the new component inherits the same client/server constraint, so this is not usually a problem — but confirm before extracting.

### Risk: `daily-logs/page.tsx` CSV export logic is tightly coupled to render

Mitigation: Keep the CSV export function in `daily-logs/page.tsx` until a dedicated `DailyLogExportButton.tsx` is extracted. The export function is a side effect, not a rendering concern.
