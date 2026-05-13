# Plan Pin Safety Before Shared CaptureShell

Last Updated: 2026-05-13
Status: Tiny saved-pin safety guard implemented; Move Pin, Delete Pin, and Shared CaptureShell remain future slices.

## Purpose

This plan documents the smallest pin-safety guard to consider before the full Shared CaptureShell work. It is based only on the requested pin viewer and pin API files.

## Files Inspected

- `components/site-walk/capture/PlanViewerLeaflet.tsx`
- `components/site-walk/capture/PlanPin.tsx`
- `components/site-walk/capture/PlanQuickActionMenu.tsx`
- `components/site-walk/capture/planViewerModel.ts`
- `components/site-walk/capture/PlanViewerLeafletEvents.tsx`
- `app/api/site-walk/pins/route.ts`
- `app/api/site-walk/pins/[id]/route.ts`

## 1. Where Saved Pins Are Rendered

In `PlanViewerLeaflet.tsx`, saved pins are fetched from `/api/site-walk/pins?plan_sheet_id=...` and mapped into local `PlanViewerPin` objects. Visible pins are rendered as Leaflet `<Marker>` components inside the `<MapContainer>`.

The older `PlanPin.tsx` button renderer still defines the shared `PlanViewerPin` type and helper functions, but `PlanViewerLeaflet.tsx` currently renders pins through Leaflet markers rather than the `PlanPin` React button component.

## 2. Whether Saved Pins Are Draggable Or Appear Draggable

Leaflet markers are currently draggable only when `isDraftPin(pin)` returns true.

Current draft logic in `PlanViewerLeaflet.tsx`:

- a draft pin has no `item_id`
- and its `id` is not a saved UUID

That means saved pins with UUID ids are not draggable by default. However, saved pins without `item_id` can still open `PlanQuickActionMenu`, and that menu currently labels the state as `Draft pin` with copy telling the user to drag the pin. This makes saved unlinked pins appear movable even though the marker itself is locked.

## 3. Whether Saved-Pin Pointer Events Can Trigger Map Long-Press Behind The Pin

`PlanViewerLeafletEvents.tsx` attaches pointer listeners to the Leaflet map container. Its `handlePointerDown` ignores events whose target is inside `.leaflet-marker-icon`, which should protect direct marker presses from creating a long-press draft pin.

Remaining risk:

- Map `click` and `contextmenu` handlers still create pins in draw mode without checking whether the original target was a marker.
- Touch/long-press behavior on mobile can be mediated by Leaflet and browser context-menu events.
- If the user presses just outside a saved marker while trying to move it, the map long-press handler can create a new draft pin.
- The saved-pin menu copy currently encourages drag behavior, increasing the chance of a user attempting gestures that create nearby duplicate draft pins.

## 4. Why Trying To Move Or Tap A Saved Pin May Create Duplicate Pins

The likely duplicate path is behavioral and event-boundary related:

1. Saved pins are locked by UUID and do not drag.
2. Some saved unlinked pins can still show a `Draft pin` action sheet that says to drag the pin.
3. A user tries to drag or long-press the saved pin area.
4. If the event is interpreted as map press/click/contextmenu instead of a protected marker event, `createPinAtLatLng` creates a new draft pin.
5. The new draft pin uses a new `clientPinId`, so it looks like an additional pin instead of a move of the saved pin.

The APIs already support saved UUID pin PATCH and DELETE, but the UI does not yet provide a fully explicit Move Pin or confirmed Delete flow for saved pins.

## 5. Smallest Safety Fix

The smallest implementation slice should be a guard, not the full pin editor:

1. Keep saved pins locked by default.
2. Keep saved pin drag disabled unless an explicit Move Pin mode exists.
3. Stop pointer/touch/click/contextmenu propagation from saved pin markers to map long-press and draw handlers.
4. Make the saved-pin menu say Open Details, not Draft pin.
5. Hide or defer Move Pin and Delete unless they are fully wired.
6. If Move Pin is shown later, it must enter an explicit mode before enabling saved-marker drag.
7. If Delete is shown later, it must require confirmation and call the saved UUID DELETE route.

## 6. What Not To Touch

- Trigger.dev rasterization.
- Plan rasterization routes or plan image loading.
- Capture upload.
- Supabase schema or migrations.
- `clientPinId` and server UUID reconciliation semantics.
- Existing long-press draft-pin creation except for event propagation guards around saved pins.

## Recommended Next Slice

The tiny pin-safety guard before Shared CaptureShell has been implemented:

- saved Leaflet marker pointer, touch, click, and contextmenu events are isolated so they do not bubble into map-level pin creation
- draw-mode map click and contextmenu creation now ignore events that originated from marker icons
- saved/unlinked pin menu copy now says `Saved Stop` and `Location locked` instead of `Draft pin` drag instructions
- draft pin dragging before save is preserved
- existing `clientPinId` behavior is unchanged

## Implemented Files

- `components/site-walk/capture/PlanViewerLeaflet.tsx`: added saved-marker DOM/Leaflet event isolation and passes saved-pin state to the quick action menu.
- `components/site-walk/capture/PlanViewerLeafletEvents.tsx`: guards draw-mode click/contextmenu creation when the source event came from a marker icon.
- `components/site-walk/capture/PlanQuickActionMenu.tsx`: changes saved-pin copy to `Saved Stop`, `Location locked`, and `Open Details` language without enabling Move Pin or Delete.
- `components/site-walk/capture/planViewerModel.ts`: extends quick-menu state with saved-pin context only.

## Still Deferred

- Full saved-pin Move Pin mode.
- Full saved-pin Delete flow and confirmation.
- Shared CaptureShell.
- Plan navigation, search, layers, and thumbnails.
- Any Trigger, rasterization, capture upload, schema, migration, or `clientPinId` reconciliation changes.
