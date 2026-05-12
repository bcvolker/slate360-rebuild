# BUG-079 — Plan Pin / Capture Root-Cause Plan

Date: 2026-05-12
Branch: `chore/codex-workflow-and-sitewalk-pin-plan`
Scope: no product-code implementation in this document. This is a root-cause confirmation and proposed first implementation slice.

## Summary

The audit confirms the likely root cause from the fact-finding handoff: Site Walk plan viewers create optimistic local pins with random non-UUID IDs, then pass those IDs into the capture workflow as `pinId`. `useCaptureUpload()` only treats a `pinId` as authoritative when it is a saved UUID. For random local IDs, it creates a separate server pin with `POST /api/site-walk/pins`. The created server pin is not returned through the upload hook to the plan viewer, so the UI can keep a local optimistic pin while the database has a separate persisted pin.

This creates a credible path to duplicate pins, missing pins after return, unstable numbering, and user-visible “it did not save” behavior.

## Implementation Slice Applied — 2026-05-12

This branch now implements the selected `client_pin_id` reconciliation slice, but physical-device testing is still required before BUG-079 should be marked fixed.

- Optimistic plan pins now carry a temporary `clientPinId` / `client_pin_id` distinct from persisted server `pinId` UUIDs.
- `PlanQuickActionMenu` now builds `planTarget` with `pinId` only when it is already a saved UUID, and with `clientPinId` for optimistic pins.
- `useCaptureUpload()` now sends `client_pin_id` when POSTing a new pin, parses the POST/PATCH response, and returns the persisted `SiteWalkPin` row through the save callback context.
- The camera flow avoids the prior double picker-open path when `onCaptureRequest` is available.
- Returning to the plan increments the plan viewer key after a plan-linked save so the next plan view fetches authoritative persisted pins.
- No Trigger rasterization files, migrations, or app-wide release-surface findings were changed.

## 1. Where is the optimistic pin created?

### Mobile WebP + Leaflet path

`components/site-walk/capture/PlanViewerLeaflet.tsx` creates an optimistic pin inside `MapEventHandler` when the map is clicked in draw mode.

Relevant flow:

1. User toggles to `Pin` / draw mode.
2. Leaflet `useMapEvents({ click(e) { ... } })` runs.
3. `newPin` is created locally.
4. `setPins((current) => [...current, newPin])` adds it to client state.
5. `setQuickMenu({ pinId: newPin.id, xPct, yPct })` opens the quick action menu.

### PDF/fallback path

`components/site-walk/capture/PlanViewerPdf.tsx` creates an optimistic pin in `handleLongPress()` by calling `buildPlanPin()` from `components/site-walk/capture/planViewerModel.ts`.

`buildPlanPin()` also creates a local random ID.

## 2. What ID is used?

Both current paths use a random base-36 string, not a UUID.

Leaflet path:

```ts
id: Math.random().toString(36).slice(2),
```

PDF/fallback helper:

```ts
return { id: Math.random().toString(36).slice(2), ... };
```

This value is safe only as a local/client temporary identifier. It is not safe as an authoritative `site_walk_pins.id`.

## 3. Where is `pinId` passed to `PlanQuickActionMenu`?

### Leaflet path

`components/site-walk/capture/PlanViewerLeaflet.tsx` stores the quick menu state with the local pin ID:

```ts
setQuickMenu({ pinId: newPin.id, xPct, yPct });
```

It later renders:

```tsx
<PlanQuickActionMenu
  pinId={quickMenu.pinId}
  planSheetId={activePage?.sheetId ?? ""}
  xPct={quickMenu.xPct}
  yPct={quickMenu.yPct}
  ...
/>
```

### PDF/fallback path

`components/site-walk/capture/PlanViewerPdf.tsx` uses:

```ts
setQuickMenu({ pinId: nextPin.id, xPct: nextPin.x_pct, yPct: nextPin.y_pct });
```

and passes `quickMenu.pinId` into `PlanQuickActionMenu`.

## 4. Where does `PlanQuickActionMenu` set `planTarget`?

`components/site-walk/capture/PlanQuickActionMenu.tsx` creates a target and writes it into `CaptureContext`:

```ts
const target = { pinId, planSheetId, xPct, yPct };
captureCtx.setPlanTarget(target);
if (input) captureCtx.requestCapture(input, "plan_pin");
```

If the context is unavailable, it falls back to the legacy window event path:

```ts
publishPlanCaptureTarget({ ...target, action });
if (input) requestCameraCapture(input, "plan_pin");
```

## 5. Does camera/upload open synchronously from the user tap?

There are two paths.

### Intended direct path

`app/site-walk/(act-2-inputs)/capture/_components/CaptureClientIsland.tsx` registers `captureCtx.openPickerRef.current` and exposes `openPickerDirect()` so native file/camera input `.click()` can happen in the same user-tap frame.

`handlePlanCaptureRequest()` does call `openPickerDirect(input, "plan_pin")` and then switches to camera mode:

```ts
setReturnToPlanAfterSave(true);
openPickerDirect(input, "plan_pin");
setWalkMode("camera");
```

`PlanQuickActionMenu` also calls `onCaptureRequest(input)` after `requestCapture()`.

### Fallback / risk path

`PlanQuickActionMenu` still calls `captureCtx.requestCapture(input, "plan_pin")` before `onCaptureRequest(input)`.

`CaptureContext.requestCapture()` tries `openPickerRefInternal.current` first, but can fall back to `setPendingCapture({ input, source })` if the ref is missing:

```ts
if (openPickerRefInternal.current) {
  openPickerRefInternal.current(input, source);
  return;
}
setPendingCapture({ input, source });
```

Therefore, camera/upload usually opens synchronously when `CaptureClientIsland` has registered the ref, but the current code still has an effect/deferred fallback risk. It may also double-call picker-opening logic because `PlanQuickActionMenu` calls both `requestCapture()` and `onCaptureRequest(input)`.

Additional note: the `Attach next note` button calls `choose("note")` without an input. It sets `planTarget` and closes the menu, but it does not obviously open a note entry flow from the audited files.

## 6. Where does `useCaptureUpload` decide PATCH vs POST?

`lib/hooks/useCaptureUpload.ts` decides inside `attachItemToPlanPin()`:

```ts
const savedPinId = target.pinId && isUuid(target.pinId) ? target.pinId : null;
```

If `savedPinId` exists, it patches:

```ts
PATCH /api/site-walk/pins/{savedPinId}
```

If `savedPinId` does not exist, it posts a new pin:

```ts
POST /api/site-walk/pins
```

## 7. What happens when `target.pinId` is not a UUID?

When `target.pinId` is the random local ID from `PlanViewerLeaflet` or `buildPlanPin()`, `isUuid(target.pinId)` returns false.

The hook then:

1. Ignores the passed `pinId` as an authoritative saved pin ID.
2. Requires `target.planSheetId` to be a UUID.
3. Creates a new persisted pin via `POST /api/site-walk/pins` with:
   - `plan_sheet_id`
   - `item_id`
   - `session_id`
   - `x_pct`
   - `y_pct`
   - `pin_status: "active"`
   - `pin_color: "blue"`
   - `label: "Plan-linked capture"`

It does not currently send the local ID as `client_pin_id`.

## 8. What server rows are created?

For a normal photo capture attached to a plan point, the current path can create these server rows/updates:

1. A reserved upload through `presignCaptureUpload()` / storage upload path.
2. A `site_walk_items` row through `createCaptureItem()` / `POST /api/site-walk/items`.
3. A `slatedrop_uploads` row or activation/update path when the item is file-backed, through the Site Walk items route and SlateDrop bridge logic.
4. A `site_walk_pins` row through `POST /api/site-walk/pins` when `target.pinId` is not a UUID.

If `target.pinId` is a saved UUID, then `site_walk_pins` is updated via `PATCH /api/site-walk/pins/[id]` instead.

## 9. What data is returned to the UI?

Current behavior from audited files:

- `POST /api/site-walk/items` returns `{ item: data, warnings? }`.
- `POST /api/site-walk/pins` returns `{ pin: data }`.
- `PATCH /api/site-walk/pins/[id]` returns `{ pin: data }`.
- `attachItemToPlanPin()` does not return the created/updated pin to `savePhoto()` or `saveTextNote()`.
- `savePhoto()` calls `onSaved?.({ ...item, local_preview_url: previewUrl }, { planTarget })`, but that context does not include the persisted pin row.
- `useCaptureFileHandler()` publishes focus for the captured item and calls `onPlanCaptureSaved?.()` when `context.planTarget` exists.
- `CaptureClientIsland.handlePlanCaptureSaved()` only sets `returnToPlanAfterSave` true.

Therefore, the server pin UUID exists after POST/PATCH, but the audited UI path does not receive or reconcile that pin row immediately.

## 10. Why pins may duplicate or disappear after returning to the plan?

Pins can duplicate or disappear because there are two identities for the same user action:

1. Local optimistic pin ID from the plan viewer.
2. Server UUID created later by `POST /api/site-walk/pins`.

The local optimistic pin is shown immediately, but the server pin is created separately and not returned into plan viewer state. On return to plan:

- If the plan viewer local state survives, the user may see the original local pin plus a server-fetched pin later, causing duplication.
- If the plan viewer remounts/refetches, the local pin disappears and only the server pin may appear, possibly with a different label/color.
- The server POST fallback uses `label: "Plan-linked capture"` and no `pin_number`, while the optimistic UI used `String(pins.length + 1).padStart(2, "0")`; this can create wrong or unstable numbering.
- Since `attachItemToPlanPin()` ignores the POST/PATCH response, downstream UI cannot replace the local temp ID with the server UUID.
- If realtime or fetch timing lags, success can be assumed before the plan has reloaded the authoritative pin state.

## 11. Safest Fix Strategy

Options reviewed:

### A. Persist draft pin immediately on plan press and use real server UUID before capture begins.

Pros:

- Cleanest authoritative ID lifecycle.
- `pinId` is a real UUID before capture starts.
- Later attach can PATCH the exact pin.

Cons:

- Requires async network work before or during camera/upload opening.
- Waiting for persistence before opening the native picker can break iOS user activation.
- Needs rollback/cleanup for abandoned draft pins.
- More moving pieces for first slice.

### B. Do not create/display a local pin until item+pin POST succeeds.

Pros:

- Avoids duplicate local/server identity.
- Simplest authoritative lifecycle.
- Avoids draft-pin cleanup.

Cons:

- Removes immediate visual feedback at the selected plan point unless replaced with a non-pin marker/menu-only affordance.
- Still needs return/refetch after save.
- May feel worse in the field if capture starts without visible selected pin confirmation.

### C. Add `client_pin_id` reconciliation so optimistic pin maps to server UUID.

Pros:

- Preserves immediate field feedback.
- Uses existing API support: `POST /api/site-walk/pins` already accepts `client_pin_id` and stores it.
- Does not require delaying camera/upload behind a network call.
- Allows server UUID to become authoritative after save.
- Best fit for mobile/iOS user activation constraints.

Cons:

- Requires careful return of created/updated pin data from `attachItemToPlanPin()` to the upload hook/UI.
- Needs a clear naming distinction between a saved `pinId` and temporary `clientPinId`.
- Reconciliation/refetch still needs to be explicit.

Recommendation: Strategy C is the safest first implementation direction, with a strict rule that random IDs are never treated as authoritative `pinId`. They may only be used as `client_pin_id` / `clientPinId` for reconciliation. The persisted server UUID must become the displayed pin ID after save/refetch.

Strategy A may be a later hardening step if draft-pin workflows are needed. Strategy B is viable as a fallback if reconciliation becomes too risky, but it gives a weaker field UX.

## 12. Recommended Smallest Safe Implementation Slice

### Goal

Fix the identity lifecycle without redesigning the UI and without touching Trigger rasterization or migrations.

### Proposed behavior

1. Plan viewer creates a local `clientPinId` for optimistic display only.
2. `PlanQuickActionMenu` receives both:
   - `pinId` only when the pin is already a saved UUID.
   - `clientPinId` for local optimistic pins.
3. `PlanCaptureTarget` distinguishes saved vs temporary identity.
4. `attachItemToPlanPin()`:
   - PATCHes only when `pinId` is a UUID.
   - POSTs with `client_pin_id` when only `clientPinId` exists.
   - returns the created/updated server pin row.
5. `savePhoto()` / `saveTextNote()` include the persisted pin in their saved callback context.
6. Return-to-plan path must refetch pins or rely on realtime before assuming the plan state is authoritative.
7. Server-created pin UUID becomes the authoritative ID. Random local IDs must not remain as `pin.id` after reconciliation/refetch.
8. Pin numbering:
   - If the existing API/table already has a reliable `pin_number` default/trigger, use it in UI labels.
   - If not, document that `pin_number` is currently nullable and use a minimal fallback label based on server fetch order only until a backend numbering slice is approved.

### Exact first-slice file list

Preferred implementation files:

1. `components/site-walk/capture/PlanViewerLeaflet.tsx`
   - Stop treating random local ID as authoritative `pinId`.
   - Track it as `clientPinId` or equivalent temporary field.
   - Pass temporary identity explicitly to `PlanQuickActionMenu`.

2. `components/site-walk/capture/planViewerModel.ts`
   - Adjust PDF/fallback optimistic pin helper so its random ID is clearly a client/temp ID, not a saved pin ID.

3. `components/site-walk/capture/PlanViewerPdf.tsx`
   - Mirror identity handling if desktop/PDF fallback remains active.

4. `components/site-walk/capture/PlanQuickActionMenu.tsx`
   - Build `planTarget` with saved `pinId` only for saved UUIDs and `clientPinId` for optimistic local pins.
   - Prefer direct synchronous picker path and avoid double-opening where possible.

5. `lib/hooks/useCaptureUpload.ts`
   - Extend `PlanCaptureTarget` with `clientPinId`.
   - Send `client_pin_id` on POST.
   - Return created/updated pin data from `attachItemToPlanPin()`.
   - Include persisted pin in `CaptureSavedContext`.

6. `components/site-walk/capture/useCaptureFileHandler.ts`
   - Receive saved context with persisted pin and trigger plan-saved reconciliation/refetch callback if needed.

7. `app/site-walk/(act-2-inputs)/capture/_components/CaptureClientIsland.tsx`
   - Because this file is already over 300 lines, make the smallest possible change or extract a tiny helper first if logic grows.
   - Ensure return-to-plan waits for or triggers authoritative pin refresh/realtime path.

Possible API file if needed:

8. `app/api/site-walk/pins/route.ts`
   - Only touch if server-side `pin_number` assignment is already supported by schema/query and can be implemented without migration.
   - Do not edit migrations in this task.

### Validation for implementation slice

Required commands after implementation approval:

1. `npm run typecheck`
2. `npm run build`
3. `npm run audit:sitewalk-release`
4. `npm run guard:architecture`
5. `npm run guard:file-size-regression`

Expected manual smoke test on physical devices:

1. Open Vercel Preview on iPhone Safari/PWA and Android Chrome.
2. Open a project walk with a rasterized plan.
3. Switch to Pin mode.
4. Tap/long-press a plan point.
5. Choose camera.
6. Capture/upload photo.
7. Add note/category/status/assignee details.
8. Save and return to plan.
9. Confirm exactly one pin appears at the selected plan point.
10. Confirm pin label/number is stable after refresh.
11. Confirm tapping the pin opens/selects the saved item.
12. Repeat with upload existing photo.
13. Repeat note-only path or hide/fix the note-only affordance if not implemented.

## Do Not Implement Yet

This document prepares the first implementation plan only. Product code should not be changed until explicit approval is given.
