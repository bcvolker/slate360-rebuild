# Plan Walk Touch Capture Diagnosis

Date: 2026-05-12
Branch: `main`
Rollback tag: `pre-planwalk-touchfix-20260512-230759`

## Observed Live Behavior

On iPhone Safari at `https://www.slate360.ai/?v=81eecf0`:

- The rasterized WebP/Leaflet plan loads.
- Pan and zoom work.
- Pressing/long-pressing the plan does not open capture.
- A large floating plan toolbar/card covers a substantial part of the plan.

## Files Inspected

- `components/site-walk/capture/PlanViewerLeaflet.tsx`
- `components/site-walk/capture/PlanQuickActionMenu.tsx`
- `components/site-walk/capture/CaptureContext.tsx`
- `components/site-walk/capture/PlanToolbar.tsx`
- `components/site-walk/capture/PlanPin.tsx`
- `components/site-walk/capture/plan-capture-events.ts`
- `components/site-walk/capture/usePlanGestures.ts`
- `app/site-walk/(act-2-inputs)/capture/_components/CaptureClientIsland.tsx`
- `components/site-walk/capture/VisualCaptureView.tsx`

## Questions and Findings

### 1. Is `PlanViewerLeaflet` listening for long-press/contextmenu/tap events on the Leaflet map?

Before this fix: no reliable mobile long-press listener existed in `PlanViewerLeaflet.tsx`. The only pin creation path was a Leaflet `click` handler inside the nested `MapEventHandler`.

After this fix: `components/site-walk/capture/PlanViewerLeafletEvents.tsx` listens for:

- raw `pointerdown` / `pointermove` / `pointerup` / `pointercancel` on the Leaflet map container for mobile long press
- Leaflet `contextmenu` for long-press/right-click fallback
- Leaflet `click` only when explicit draw mode is active

### 2. Is the event disabled unless a hidden draw/pin mode is active?

Before this fix: yes. The existing Leaflet `click` path returned early unless `toolMode === "draw"`.

After this fix: explicit draw mode still supports tap-to-pin, but normal pan mode now supports long-press-to-create-plan-stop without disabling pan/zoom.

### 3. Does the giant toolbar/card sit above the map and intercept pointer/touch events?

Yes. `PlanToolbar.tsx` renders a high z-index `GlassCard` with `pointer-events-auto`. `PlanViewerLeaflet.tsx` also wrapped it in another absolute top container, which made the toolbar sit lower over the plan. The toolbar could cover a large part of the mobile plan and intercept touches in that area.

### 4. What component renders the giant floating toolbar/card?

`components/site-walk/capture/PlanToolbar.tsx` renders the floating card. It is used by both `PlanViewerLeaflet.tsx` and `PlanViewerPdf.tsx`.

### 5. Is there a quick action menu path from Leaflet plan press to `PlanQuickActionMenu`?

Before this fix: yes, but only through the draw-mode `click` path in `PlanViewerLeaflet.tsx`.

After this fix: long press, contextmenu, and draw-mode click all create an optimistic pin with `clientPinId`, then call `setQuickMenu({ clientPinId, xPct, yPct })`, which opens `PlanQuickActionMenu`.

### 6. Does `PlanQuickActionMenu` call `CaptureContext` in a way that opens camera/upload/note?

For camera/upload: yes. `PlanQuickActionMenu` sets the plan target on `CaptureContext`, then calls the `onCaptureRequest` callback supplied by `CaptureClientIsland`. `CaptureClientIsland.handlePlanCaptureRequest()` sets return-to-plan state, opens the native picker synchronously through local file inputs, and switches to camera mode.

For note-only: the existing button sets the plan target but does not yet open a full note-entry flow in visual capture mode. Keep this as a follow-up if live testing still exposes note-only as a primary path.

### 7. After save, does the app intentionally return to plan mode?

Yes. `CaptureClientIsland.handlePlanCaptureRequest()` sets `returnToPlanAfterSave` to `true`. `handlePlanCaptureSaved()` increments `planRefreshKey`. `saveNextStop()` sees the return-to-plan flag, switches `walkMode` back to `plan`, clears the flag, deselects the item, and returns without opening the next camera picker.

### 8. Are there CSS `pointer-events`, z-index, or overlay issues blocking the plan?

Yes, partially:

- `PlanToolbar` uses z-index `1000` and `pointer-events-auto` for the card.
- The previous default expanded toolbar could cover a substantial mobile plan area.
- `CaptureModeToggle` and `SiteWalkHomeButton` overlay the plan, but they are small and intentional.

This fix collapses the toolbar by default on mobile and removes the extra wrapper in `PlanViewerLeaflet.tsx`, reducing obstruction while preserving page/search/layer controls behind the expandable plan toolbar.

## Implemented Focused Fix

- Added `PlanViewerLeafletEvents.tsx` for reliable long-press/contextmenu/tap pin creation on Leaflet plans.
- Kept one-finger drag pan and pinch zoom intact.
- Kept explicit Pin mode as an optional tap-to-create path.
- Opened `PlanQuickActionMenu` after long press instead of attempting to directly open the camera from a non-tap gesture.
- Kept camera/upload native picker opening on the user’s trusted tap inside the action menu.
- Collapsed the large plan toolbar by default on mobile, with page/search/layer controls still available after expanding.

## Follow-Ups Not Included

- Rich map pin thumbnail/card previews.
- Full note-only plan stop flow in visual capture mode if live testing confirms it is needed.
- Final plan toolbar redesign.
- Any Trigger, schema, or release-surface cleanup.
