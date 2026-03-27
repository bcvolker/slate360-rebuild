# SlateDrop — Refactor & UI Fix Guide

Last Updated: 2026-03-27
Status: Planning guide. Prioritized execution plan for safe incremental refactoring.

Read this file before touching ANY SlateDrop code in a refactor session.

---

## Why This Guide Exists

SlateDrop has three structural issues that must be addressed before significant new features can be safely added:

1. **`SlateDropClient.tsx` is 451 lines** — over the 300-line limit. This file owns UI layout, folder tree interaction, file upload coordination, context menu logic, share/preview modal triggers, and notification state. AI sessions cannot safely modify one area without seeing how state and handlers are used in other parts of the same file.

2. **`ProjectFileExplorer.tsx` is 363 lines** — the Project Hub file browser component is also over limit.

3. **`file_folders` → `project_folders` migration is incomplete** (BUG-001) — multiple files still reference the old table. Until this migration is complete, folder writes in Design Studio, export-zip, and the audit trail are using the wrong table.

There are also active UI bugs (BUG-019 widget extra-click, BUG-021 location inconsistency) and styling divergence between the standalone SlateDrop tab and the embedded widget versions.

---

## Verified Current State (as of 2026-03-27)

### File Sizes

| File | Lines | Status |
|---|---|---|
| `components/slatedrop/ProjectFileExplorer.tsx` | 363 | 🔴 Over limit |
| `components/slatedrop/SlateDropClient.tsx` | 451 | 🔴 Over limit |
| `components/slatedrop/SlateDropActionModals.tsx` | 283 | ✅ Under limit |
| `components/slatedrop/SlateDropFileArea.tsx` | 287 | ✅ Under limit |
| `components/slatedrop/SlateDropSharePreviewModals.tsx` | 268 | ✅ Under limit |
| `components/slatedrop/SlateDropContextMenu.tsx` | 218 | ✅ Under limit |
| `components/slatedrop/SlateDropSidebar.tsx` | 201 | ✅ Under limit |
| `components/slatedrop/SlateDropToolbar.tsx` | 117 | ✅ Under limit |
| `components/slatedrop/SlateDropTopBar.tsx` | 87 | ✅ Under limit |
| `components/slatedrop/SlateDropNotificationsOverlay.tsx` | 41 | ✅ Under limit |

### Active Bugs

| Bug ID | File | Description  | Priority |
|---|---|---|---|
| BUG-001 | Multiple | `file_folders` table still used in Design Studio, export-zip, audit trail | 🔴 High |
| BUG-019 | Dashboard + PH widget shells | Widget shows "Open SlateDrop" CTA button even after embedded client is visible | 🔴 Open |
| BUG-020 | `app/api/slatedrop/download/route.ts` | Fixed: PDF files now open inline with `mode=preview` | ✅ Fixed |

### What Is Already Decomposed

Good news: the component family is already partially extracted. Most of the key subcomponents (`SlateDropFileArea`, `SlateDropContextMenu`, `SlateDropSidebar`, `SlateDropToolbar`, `SlateDropTopBar`, `SlateDropActionModals`, `SlateDropSharePreviewModals`) already exist as separate files under 300 lines.

The main remaining structural problem is that `SlateDropClient.tsx` is still the coordination layer AND contains too much logic rather than delegating to those extracted components cleanly.

### Modes / Variants That Must All Keep Working

`SlateDropClient.tsx` renders in 3 distinct contexts:
1. **Standalone** (`/slatedrop` route) — full-page SlateDrop UI
2. **Dashboard widget** — embedded in floating widget popout
3. **Project Hub Tier 2 embedded** — in-project file browser context

The `embedded` prop was added to handle context 2 and 3. Any refactor must verify all 3 contexts still work.

---

## Safe Refactor Strategy

### Core Rule: Read Both State And JSX Before Editing Anything

`SlateDropClient.tsx` is the classic monolith pattern: state declared at the top, used hundreds of lines below. Before touching ANY line in this file, read the full file in a single session (or use `grep_search` to map every `useState` to its JSX usage).

### The Extraction Pattern

Same as the other modules:
1. Identify a self-contained concern.
2. Create a new hook or component file.
3. Import it back.
4. Verify behavior is identical.
5. Only then remove the old implementation.

### GitNexus Protocol

`SlateDropClient.tsx` is used in multiple contexts. Before touching it:
```
mcp_gitnexus_impact — file: components/slatedrop/SlateDropClient.tsx
```

The impact will show the dashboard widget, project hub widget, and standalone route. All of these MUST be tested after any change.

After every phase:
```
mcp_gitnexus_detect_changes
```

---

## Phase 1 — BUG-001: Complete `file_folders` → `project_folders` Migration

**This is the highest-priority fix.** It is a data integrity bug. New code adding folder writes to the wrong table silently creates orphaned records.

### Scope

Find every remaining reference to `file_folders` in these locations:
- `app/` (Design Studio page, export-zip route)
- `lib/` (audit trail service, cross-tab upload service)
- `components/` (any SlateDrop or Project Hub component using `file_folders` directly)

```bash
# Run this to find all remaining references
grep -rn "file_folders" app/ lib/ components/ --include="*.ts" --include="*.tsx"
```

### Migration Rule

For any write that creates a new folder or associates a file with a folder:
- Old: `supabase.from('file_folders').insert(...)`
- New: `supabase.from('project_folders').insert(...)`

For reads: update queries to use `project_folders` where applicable. Confirm the table schema matches what the code expects (column names, foreign keys).

### Pre-Phase 1 Checklist

- [ ] Run the grep above to get the full list of affected files.
- [ ] Read `lib/slatedrop/folderTree.ts` to confirm `project_folders` schema.
- [ ] Do NOT change any file that is currently working correctly — only update `file_folders` references that should be `project_folders`.

### Phase 1 Exit Criteria

- `grep -rn "file_folders" app/ lib/ components/` returns zero results (or only expected legacy references).
- `npm run typecheck` passes.
- SlateDrop folder creation still works in the standalone route and widget contexts.
- Design Studio system folder (`🎨 Design Studio`) auto-provisions correctly.

---

## Phase 2 — Fix BUG-019: SlateDrop Widget Extra Click

**Goal:** Remove the redundant "Open SlateDrop" CTA button from widget shells when the embedded client is already visible.

### Root Cause

The widget shell renders a CTA button ("Open SlateDrop") as a default state. The `embedded` prop tells `SlateDropClient` to skip its own outer shell layout — but the CTA button lives in the *widget shell*, not inside `SlateDropClient`. So even when the embedded client is already rendered below, the CTA button still appears above it.

### Fix

In the widget shells that render SlateDrop (dashboard widget and Project Hub Tier 2 widget), add a conditional:

```typescript
// In the widget shell render:
if (embedded) {
  // Render embedded SlateDropClient directly — no CTA button
  return <SlateDropClient embedded={true} ... />;
}
// Normal: render CTA first, SlateDropClient after user clicks
```

### Files To Touch

Run `mcp_gitnexus_impact` on `SlateDropClient.tsx` to find the exact widget shell files. Based on audit:
- `components/dashboard/DashboardSlateDropWindow.tsx`
- `components/project-hub/ProjectHubWidgetBody.tsx` (likely)

### Phase 2 Exit Criteria

- When a SlateDrop widget is opened/expanded in the dashboard, the file browser appears immediately without requiring an extra click.
- Same behavior in Project Hub Tier 2 widget.
- Standalone SlateDrop route (`/slatedrop`) is unaffected.

---

## Phase 3 — Extract State From `SlateDropClient.tsx`

**Goal:** Reduce `SlateDropClient.tsx` from 451 lines by extracting embedded state logic into a focused hook.

### Current Internal State (inferred)

`SlateDropClient.tsx` likely manages:
- Active folder selection state
- Upload progress state
- Search/filter state
- Selection state (selected files for bulk actions)
- Preview modal open/close state
- Notification overlay state

These can be extracted into:

```
lib/hooks/useSlateDropUIState.ts    ← folder selection, search, view mode
lib/hooks/useSlateDropSelection.ts  ← file selection, bulk action state
lib/hooks/useSlateDropUploadUI.ts   ← upload progress UI state (not the upload logic — that's already in useSlateDropMutationActions)
```

### Pre-Phase 3 Checklist

- [ ] Read all 451 lines of `SlateDropClient.tsx` BEFORE writing any code.
- [ ] Map every `useState` declaration to which section of JSX uses it.
- [ ] Run `mcp_gitnexus_impact` on `SlateDropClient.tsx`.
- [ ] Check which hooks `SlateDropClient.tsx` already calls so new hooks don't duplicate existing ones.

### Known Existing Hooks To Not Duplicate

- `lib/hooks/useSlateDropMutationActions.ts` (287 lines) — file upload, move, delete, rename mutations
- Check for any other `useSlateD*` hooks that already exist

### Phase 3 Exit Criteria

- `SlateDropClient.tsx` under 300 lines.
- New hooks are under 150 lines each.
- All 3 render contexts (standalone, dashboard widget, project hub widget) work identically.
- `npm run typecheck` passes.

---

## Phase 4 — Extract `ProjectFileExplorer.tsx` (363 → ~200 lines)

`ProjectFileExplorer.tsx` is the file browser component used in Project Hub. It is over the 300-line limit.

### Identified Extraction Targets

| Component / Hook | Extract To | Est. Lines |
|---|---|---|
| File row with context menu | `ProjectFileRow.tsx` | ~100 |
| Folder breadcrumb bar | `ProjectFolderBreadcrumb.tsx` | ~60 |
| File upload trigger + progress | `ProjectFileUploadBar.tsx` | ~60 |
| `ProjectFileExplorer.tsx` after extraction | coordination + layout | ~150 |

### Phase 4 Exit Criteria

- `ProjectFileExplorer.tsx` under 200 lines.
- All extracted components under 150 lines.
- File browsing, upload, and context menu work in Project Hub.

---

## Phase 5 — Widget Styling Unification

**Goal:** Make the dashboard SlateDrop widget and the Project Hub SlateDrop widget visually consistent.

Currently the two widget contexts have diverged in styling (different padding, font sizes, button styles). This phase aligns them to a shared style system.

### Target

Create a shared `components/slatedrop/SlateDropWidgetLayout.tsx` that provides consistent padding, header, and scrollable file area for both widget contexts.

Both the dashboard widget and Project Hub widget import this layout.

### Phase 5 Exit Criteria

- Dashboard widget and Project Hub widget look visually identical (same padding, typography, action buttons).
- Standalone `/slatedrop` route is unaffected (it uses its own full-page layout).

---

## Phase 6 — UI Fix Queue

### UI-SD-001 — Upload Progress Visual

When uploading files, the progress indicator is not clearly visible in embedded widget mode. The upload progress bar overlaps content or is hidden below the scroll fold.

**Fix:** In embedded mode, always pin the upload progress bar to the top of the widget container, not at the bottom.

**Target:** `SlateDropClient.tsx` upload progress section (after Phase 3 extraction, will likely be in `useSlateDropUploadUI.ts`).

### UI-SD-002 — Share Link Expiry Badge

When a file has an active share link with an expiry date, no visual indicator appears on the file card. Users cannot tell which files are shared or when sharing expires.

**Fix:** Add a "Shared" badge to file cards when `share_expires_at` is in the future.

**Target:** File card rendering in `SlateDropFileArea.tsx`.

### UI-SD-003 — Empty Folder State

When a folder is empty, a blank white area renders. Should show an empty state with a drag-to-upload illustration and "Upload your first file" message.

**Target:** `SlateDropFileArea.tsx` empty branch.

### UI-SD-004 — Search Clear Button

The search input in `SlateDropToolbar.tsx` has no clear button. When a user types a search query, there is no way to quickly clear it without manually deleting text.

**Fix:** Add an `×` icon button inside the search input that clears the query and resets the filter.

**Target:** `SlateDropToolbar.tsx`.

### UI-SD-005 — Context Menu on Mobile

The right-click context menu (`SlateDropContextMenu.tsx`) does not appear on long-press on mobile/touch devices. Mobile users can't access file rename/move/delete actions.

**Fix:** Add a `onContextMenu` handler that works for both right-click and long-press (300ms `touchstart` + `touchend` timer pattern).

**Target:** `SlateDropContextMenu.tsx`.

### UI-SD-006 — Folder Create Confirmation

When a new folder is created via the "New Folder" dialog, success is silent (the dialog closes and the folder appears). There is no confirmation toast or visual feedback.

**Fix:** Show a brief success toast: "Folder '{{name}}' created."

**Target:** `SlateDropActionModals.tsx` folder create success handler.

---

## Safe-Build Checklist For Every Refactor Prompt

### Before Writing Code

1. Read `SLATE360_PROJECT_MEMORY.md` latest handoff first.
2. Check `ops/bug-registry.json` and `ONGOING_ISSUES.md` for active SlateDrop bugs.
3. Run `wc -l <file>` on every file you plan to edit.
4. Run `mcp_gitnexus_impact` on `SlateDropClient.tsx` if you are touching it.
5. Identify which of the 3 contexts (standalone, dashboard widget, project hub widget) will be affected.

### The Monolith Guard

Before touching `SlateDropClient.tsx`:
- Read ALL 451 lines (or the full current line count after any prior extraction).
- Map every `useState` declaration to its JSX usage location.
- Do NOT edit state variables without reading how they are used 200+ lines below the declaration.

### While Extracting

6. Extract → import → verify → delete inline version.
7. New hook created → immediately confirm the component calls it.
8. If a state variable is shared across multiple extracted concerns, keep it in `SlateDropClient.tsx` until a clean boundary is identified.
9. Never break the `embedded` prop contract — all 3 contexts depend on it.

### After Extracting

10. Run `get_errors` on ALL changed files.
11. Run `npm run typecheck`.
12. Run `mcp_gitnexus_detect_changes` — confirm no unintended drift.
13. Run `bash scripts/check-file-size.sh`.
14. Smoke-test ALL THREE contexts: standalone SlateDrop, dashboard widget, and Project Hub embedded widget.
15. Update `SLATE360_PROJECT_MEMORY.md` session handoff.
16. Update this `REFACTOR_GUIDE.md` tracker.

---

## Phase Completion Tracker

| Phase | Description | Status |
|---|---|---|
| 1 | BUG-001: Complete `file_folders` → `project_folders` migration | ⬜ Not started |
| 2 | BUG-019: Fix SlateDrop widget extra click | ⬜ Not started |
| 3 | Extract state from `SlateDropClient.tsx` (451 → 250) | ⬜ Not started |
| 4 | Extract `ProjectFileExplorer.tsx` (363 → 200) | ⬜ Not started |
| 5 | Widget styling unification | ⬜ Not started |
| UI-SD-001 | Upload progress pin in widget mode | ⬜ Not started |
| UI-SD-002 | Share link expiry badge on file cards | ⬜ Not started |
| UI-SD-003 | Empty folder state | ⬜ Not started |
| UI-SD-004 | Search clear button | ⬜ Not started |
| UI-SD-005 | Context menu on mobile (long-press) | ⬜ Not started |
| UI-SD-006 | Folder create confirmation toast | ⬜ Not started |

---

## Known Risks

### Risk: Extracting state from `SlateDropClient.tsx` breaks one of the 3 widget contexts

Mitigation: After Phase 3, test ALL THREE contexts before marking the phase complete. The dashboard widget and project hub widget are easy to miss in testing because they require specific navigation paths.

### Risk: `file_folders` migration touches API routes shared with non-SlateDrop code

Mitigation: Before Phase 1, grep the entire codebase to map every `file_folders` reference. Categorize: (1) SlateDrop-owned code safe to migrate now, (2) shared code that needs a separate ticket, (3) legacy code that is unreachable. Only migrate category 1 in this phase.

### Risk: BUG-019 fix breaks the standalone SlateDrop route

Mitigation: The BUG-019 fix is ONLY in the widget shell files — not in `SlateDropClient.tsx` itself. The standalone route does not use a widget shell, so it is not affected. Confirm with `mcp_gitnexus_impact` that the widget shell files are not imported in the standalone route.

### Risk: `ProjectFileExplorer.tsx` extractions break Project Hub file browsing

Mitigation: `ProjectFileExplorer.tsx` is only used in Project Hub. The impact list will be short. After Phase 4, specifically test the Project Hub file tab to confirm upload, browse, and context menu all work.

### Risk: Upload progress tracking breaks after hook extraction (Phase 3)

Mitigation: The upload mutation logic already lives in `useSlateDropMutationActions.ts`. Only UI state (progress percentage, visible/hidden) should move to the new hook. The actual upload function stays in `useSlateDropMutationActions.ts`. Keep the data flow clear: mutation hook writes progress, UI state hook reads it.
