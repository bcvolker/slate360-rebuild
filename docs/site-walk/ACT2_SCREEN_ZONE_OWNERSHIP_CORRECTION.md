# Act 2 Screen Zone Ownership Correction

Date: 2026-05-14
Status: Implemented and validated locally
Rollback tag: `pre-act2-zone-ownership-20260514-010357`

## Purpose

Physical iPhone testing showed that Shared CaptureShell V1 improved the structure but did not fully establish screen-zone ownership. This correction defines the Act 2 task zones and records the overlap fixes.

## Current Zone Diagnosis

### Components Rendering Top Controls

- `SharedCaptureTaskHeader.tsx`: renders Back to Plan or Site Walk, stop context, walk title, and Exit.
- `CaptureClientIsland.tsx`: still overlays `CaptureModeToggle` and `SiteWalkHomeButton` on top of the plan/camera canvas.
- `CaptureModeControls.tsx`: renders the floating Plan/Camera switch and Home button.
- `PlanViewerLeaflet.tsx`: renders the floating Pan/Pin switch at the top of the plan canvas.
- `PlanToolbar.tsx`: renders an absolute top toolbar card with plan navigation, search, pin layer controls, and zoom.
- `VisualCaptureView.tsx`: still contains legacy top header and exit modal for non-shared usage; it is suppressed in the shared shell.

### Components Rendering Floating Buttons

- `CaptureDataBottomSheet.tsx`: renders a fixed mobile Details/Start button over the canvas when the sheet is minimized.
- `CaptureModeControls.tsx`: renders floating Plan/Camera and Home controls.
- `PlanViewerLeaflet.tsx`: renders floating Pan/Pin controls.
- `PlanToolbar.tsx`: renders an absolute toolbar/card over the plan canvas.
- `PlanQuickActionMenu.tsx`: renders a fixed bottom action menu for draft or saved pins.

### Components Rendering Bottom Controls

- `CaptureDataBottomSheet.tsx`: owns the canonical Details / Attachments / Markup sheet and primary save button.
- `VisualCaptureView.tsx`: still renders a separate bottom rail with thumbnails, Drawing/Navigate, Undo/Redo, Ghost, and `UnifiedVectorToolbar`.
- `CaptureSheetUtilityPanel.tsx`: renders attachment and markup controls inside the drawer tabs.
- `PlanQuickActionMenu.tsx`: renders pin capture actions in a fixed bottom menu.

### Components Rendering Modals / Dialogs

- `SharedCaptureTaskHeader.tsx`: renders Exit confirmation, currently inside the header stacking context.
- `VisualCaptureView.tsx`: renders a legacy Exit confirmation when its legacy header is enabled.
- `PendingUploadPreviewModal.tsx`: renders upload preview at `z-[2100]`.
- `PlanQuickActionMenu.tsx`: renders pin quick actions at `z-[2000]`.
- `ManageTradesModal.tsx`: can be opened from the details sheet.

## Overlap Findings

### Plan Walk

- Task header, floating Plan/Camera mode toggle, Home button, Pan/Pin switch, and `PlanToolbar` all compete for the top zone.
- `PlanToolbar` expands into a large card that covers valuable plan canvas.
- Pan/Pin appears below the task header and can visually conflict with `PlanToolbar`.
- The Home button duplicates the task header's Site Walk/Back ownership.
- Exit confirmation is rendered from inside the header, which can visually inherit header positioning and appear cut off or behind high plan controls.

### Quick Capture

- `CaptureDataBottomSheet` still shows a floating Details/Start FAB over the photo/camera canvas.
- The expanded details page has both a top-right `Save` button and the canonical bottom `Save Stop & Continue` / `Save Stop & Return to Plan` button.
- `VisualCaptureView` still shows a separate always-visible markup/action rail, detached from the bottom drawer tabs.

## Canonical Save

The canonical primary save is the bottom drawer footer button in `CaptureDataBottomSheet.tsx`:

- Quick Walk: `Save Stop & Continue`
- Plan Walk: `Save Stop & Return to Plan`

The top-right mobile sheet `Save` button should be removed for V1 to avoid duplicate primary actions.

## Details Button To Remove

The fixed mobile Details/Start FAB in `CaptureDataBottomSheet.tsx` should be removed or replaced by automatic sheet opening after capture. The bottom drawer owns Details / Attachments / Markup.

## Why Saved Pin Tap Still Can Do Nothing

`PlanViewerLeaflet.tsx` calls `onSelectItem?.(pin.item_id)` when a saved pin has an `item_id`. `CaptureClientIsland.tsx` then looks for the item in the current `items` array and only opens camera/details if it finds a matching record. If the saved pin is linked to an item that is not in the current loaded items list, or if identity does not match the local item list, the tap has no fallback and appears to do nothing. Saved pins without `item_id` already open the safe locked menu.

## Target Zone Contract

1. Zone 1 — Task Header: only `SharedCaptureTaskHeader` owns Back/Site Walk, stop context, and Exit/More.
2. Zone 2 — Canvas: Plan Walk owns Leaflet plan; Quick Walk owns camera/photo. Permanent tool cards do not sit on top of the canvas.
3. Zone 3 — Bottom Drawer: owns Details / Attachments / Markup, primary save, and markup tools only when Markup is active.
4. Zone 4 — Modal Layer: owns Exit confirmation, upload preview, delete confirmation, and other blocking dialogs above all task chrome.

## Implemented Correction

- Removed the Plan/Camera floating switch from active task mode.
- Removed the floating Home button from the plan canvas.
- Removed the floating Pan/Pin switch from `PlanViewerLeaflet.tsx`; pan/zoom remains the default plan behavior and empty-area long press still creates draft pins.
- Replaced the expanded `PlanToolbar` card with a compact non-expanding `Plans` pill showing current page/sheet context and visible pin count.
- Removed the floating Details/Start button from the capture canvas.
- Auto-opens the mobile bottom drawer to Details when a captured/selected item becomes active.
- Removed the top-right mobile sheet Save button so the bottom drawer footer is the only primary save action.
- Removed the detached `VisualCaptureView` bottom markup rail; Markup tools now appear only inside the Markup tab.
- Moved the shared Exit confirmation to a higher modal layer, centered with safe-area padding, and updated the copy to warn about unsaved changes.
- Raised upload preview to the same modal layer family above task controls.
- Added saved-pin fallback behavior: linked saved pins open the item when the item exists in the current loaded walk items; otherwise they open the safe locked menu instead of doing nothing.

## Validation

- `npm run typecheck` — passed.
- `npm run build` — passed with existing Sentry/webpack/instrumentation warnings.
- `npm run guard:architecture` — passed.
- `bash scripts/check-file-size.sh || true` — reports 13 pre-existing unrelated oversized files; no touched Act 2 correction file exceeds 300 lines.

## Deferred

- Plan Tools Drawer.
- Full saved-pin Move/Delete.
- Full Stop Strip navigation.
- Before/After/Ghost V1.
- Deliverables V1.