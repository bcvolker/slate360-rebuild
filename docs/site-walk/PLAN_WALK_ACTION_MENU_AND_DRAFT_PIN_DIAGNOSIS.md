# Plan Walk Action Menu and Draft Pin Diagnosis

Date: 2026-05-13
Branch: `main`
Rollback tag: `pre-planwalk-action-menu-20260513-002047`

## Observed Live Behavior

After commit `06f287b`, iPhone Safari showed:

- WebP/Leaflet plan loads.
- Pan/zoom works.
- Long-press creates a visible optimistic draft marker labeled `01`.
- Capture/action UI does not appear visibly.

## Files Inspected

- `components/site-walk/capture/PlanViewerLeaflet.tsx`
- `components/site-walk/capture/PlanViewerLeafletEvents.tsx`
- `components/site-walk/capture/PlanQuickActionMenu.tsx`
- `components/site-walk/capture/PlanPin.tsx`
- `components/site-walk/capture/CaptureContext.tsx`
- `components/site-walk/capture/useCaptureFileHandler.ts`
- `components/site-walk/capture/CameraViewfinder.tsx`
- `app/site-walk/(act-2-inputs)/capture/_components/CaptureClientIsland.tsx`
- `components/site-walk/capture/VisualCaptureView.tsx`

## Diagnosis Questions

### 1. After long press, is `quickMenu` state actually being set?

Yes. `PlanViewerLeafletEvents.createPinAtLatLng()` created the optimistic pin and called `setQuickMenu({ clientPinId, xPct, yPct })`.

The live symptom proves `setPins()` ran because the draft marker appeared. The same function also set `quickMenu`, so the likely failure was visibility/stacking, not missing state.

### 2. Is `PlanQuickActionMenu` rendered in the Leaflet path?

Yes. `PlanViewerLeaflet.tsx` renders `PlanQuickActionMenu` when `quickMenu` is truthy, below the `MapContainer` and `PlanToolbar` in the component tree.

### 3. Is it hidden behind the map, toolbar, or another z-index layer?

Likely yes. Before this fix, `PlanQuickActionMenu` used `z-50`, while Leaflet panes/markers and the plan toolbar use much higher stacking (`PlanToolbar` uses `z-[1000]`; Leaflet panes commonly use z-indexes in the hundreds). On mobile this can leave the menu behind the plan/map layers.

This fix moves the action sheet to `z-[2000]`.

### 4. Is it positioned off-screen on mobile?

The previous menu was centered full-screen. It was not intentionally off-screen, but because it was a fixed overlay with low z-index relative to Leaflet/toolbar, it could be visually hidden behind the map surface.

This fix changes it to a bottom mobile action sheet with safe-area padding and a desktop centered layout.

### 5. Does it require a mode or condition that is false?

No. `PlanQuickActionMenu` only requires `quickMenu` to be truthy. Capture buttons can be disabled only when `captureDisabledReason` is present.

### 6. Are pointer events being blocked by Leaflet/map/container overlays?

Before this fix, full-screen overlay behavior and low z-index made the action menu unreliable. Leaflet still owned much of the interaction surface.

This fix uses a `pointer-events-none` outer action-sheet wrapper and `pointer-events-auto` only on the sheet. That keeps the sheet clickable and still allows plan/marker interaction outside the sheet.

### 7. Does the menu render but immediately close?

No direct evidence of immediate close. The old menu closed on outer overlay click, but the observed behavior was no visible UI after long press. The stronger cause is stacking/visibility.

This fix removes click-to-close on a full-screen backdrop and provides an explicit Cancel button.

### 8. Are Take Photo / Upload buttons wired to `CaptureContext` correctly?

Yes. `PlanQuickActionMenu.choose()` builds a `PlanCaptureTarget`, calls `captureCtx.setPlanTarget(target)`, then calls the `onCaptureRequest` callback passed from `CaptureClientIsland`.

This fix adds limited diagnostics for:

- `[PLAN_WALK] Take Photo tapped`
- `[PLAN_WALK] Upload tapped`
- `[PLAN_WALK] capture context target set`

### 9. Does `CaptureContext` request reach `CameraViewfinder` / `useCaptureFileHandler`?

Yes. `CaptureClientIsland.handlePlanCaptureRequest()` opens the colocated direct file input synchronously and dispatches `site-walk:direct-capture-file`. `CameraViewfinder` listens for that event and calls `useCaptureFileHandler.handleFile()` with the current `planTarget`.

### 10. Is the direct/synchronous picker path available from the menu button tap?

Yes. The menu button click calls `onCaptureRequest`, which calls `CaptureClientIsland.openPickerDirect()` in the same tap handler frame. This preserves iOS trusted user activation for camera/upload pickers.

## Implemented Fix

### Action Sheet Visibility

`PlanQuickActionMenu` is now a high-z-index bottom action sheet:

- `z-[2000]`
- safe-area bottom padding
- mobile bottom-sheet layout
- explicit Cancel button
- no full-screen backdrop that can close unexpectedly

Buttons:

- Take photo at this pin
- Upload existing photo
- Add Note after photo/upload — disabled for now to avoid a dead note-only path
- Cancel

### Draft Pin Dragging

`PlanViewerLeaflet.tsx` now makes unsaved optimistic pins draggable:

- only pins with no `item_id` and non-UUID IDs are draggable
- drag starts disable map dragging
- drag updates `x_pct` / `y_pct`
- drag updates active `quickMenu` coordinates when it targets the moving draft pin
- drag end re-enables map dragging

Diagnostics:

- `[PLAN_WALK] draft pin moved`

### Metadata / Offline Compatibility

The action sheet still uses the existing plan capture path:

1. `PlanQuickActionMenu` sets `PlanCaptureTarget` in `CaptureContext`.
2. `CaptureClientIsland` opens camera/upload through the trusted tap.
3. `CameraViewfinder` and `useCaptureFileHandler` process the file.
4. `useCaptureUpload` collects timestamp, GPS, weather, device metadata, file details, offline queue state, and plan target coordinates.
5. `useCaptureUpload` creates/updates `site_walk_items` and `site_walk_pins` with `client_pin_id` reconciliation.

No separate plan-only capture save path was introduced.

## Remaining UI Parity Gaps

Not included in this focused fix:

- draft marker style still uses the numbered plan-pin look, not a rich Quick Capture card
- rich thumbnail preview is not yet shown directly on the plan
- attachment/photo/360-file preview on plan pins needs a later polish slice
- note-only plan stops are disabled in the action sheet until the visual note-entry UX is wired reliably

## Expected Live Test Result

- Long-press creates the draft marker and immediately shows the action sheet.
- Draft marker can be dragged before save.
- Take Photo / Upload opens the native picker from a trusted button tap.
- Save returns to the same plan.
- Refresh shows exactly one persisted pin, not a duplicate draft.
