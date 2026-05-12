# BUG-079 Metadata and UI Parity Audit

Date: 2026-05-12
Branch: `chore/codex-workflow-and-sitewalk-pin-plan`

## Scope

Focused read-only audit of the current BUG-079 plan-pin capture implementation. No UI redesign or broad cleanup was performed.

Reviewed files:

- `lib/site-walk/metadata.ts`
- `lib/site-walk/capture-item-client.ts`
- `lib/hooks/useCaptureUpload.ts`
- `components/site-walk/capture/useCaptureFileHandler.ts`
- `components/site-walk/capture/CameraViewfinder.tsx`
- `components/site-walk/capture/CaptureDataBottomSheet.tsx`
- `lib/site-walk/offline-capture.ts`
- `components/site-walk/capture/PlanQuickActionMenu.tsx`
- `components/site-walk/capture/PlanViewerLeaflet.tsx`
- `components/site-walk/capture/PlanPin.tsx`
- `lib/hooks/useSiteWalkRealtime.ts`

## 1. Quick Capture Metadata Path

### Timestamp

`captureMetadata()` creates `captured_at` with `new Date().toISOString()` in `lib/site-walk/metadata.ts`.

`useCaptureUpload()` calls `captureMetadata()` for both `savePhoto()` and `saveTextNote()` before the item is saved or queued.

### Geolocation

`getGps()` in `lib/site-walk/metadata.ts` uses browser geolocation with high accuracy, timeout, and graceful fallback to `null` when denied/unavailable.

If GPS exists, `buildCreateCaptureItemBody()` in `lib/site-walk/capture-item-client.ts` flattens GPS into top-level `latitude` and `longitude`, while preserving the full `gps` object in `metadata`.

### Weather

`getWeather()` in `lib/site-walk/metadata.ts` fetches Open-Meteo weather only when GPS exists. It caches by approximate grid and returns an `unavailable` source stub if the weather request fails.

`buildCreateCaptureItemBody()` stores weather at top-level `weather` and inside the full `metadata` payload.

### Device / Context Metadata

`captureMetadata()` stores:

- `device.user_agent`
- `device.platform`
- `device.screen.width`
- `device.screen.height`

`buildCreateCaptureItemBody()` also adds file context to metadata when a file exists:

- `file_size`
- `mime_type`

### Attachment to Saved Item

Quick photo saves flow through:

1. `CameraViewfinder`
2. `useCaptureFileHandler.prepareCaptureFile()`
3. `useCaptureUpload.savePhoto()`
4. `presignCaptureUpload()` / storage upload
5. `createCaptureItem()`
6. `/api/site-walk/items`

Quick notes flow through:

1. `CaptureQuickNotePanel` / `CameraViewfinder`
2. `useCaptureFileHandler.saveTextNote`
3. `useCaptureUpload.saveTextNote()`
4. `createCaptureItem()`
5. `/api/site-walk/items`

Both paths use the same `captureMetadata()` helper.

### Offline Preservation

`queueOfflineCapture()` receives the same metadata object and passes it through `buildCreateCaptureItemBody()` before enqueueing `/api/site-walk/items`.

Photo/file captures also save the file blob through `saveOfflineBlob()` with filename, content type, and size metadata.

## 2. Plan Pin Capture Metadata Path

### Same Upload / Save Path

Plan-pin captures call the same `CameraViewfinder`, `useCaptureFileHandler`, and `useCaptureUpload` save paths as Quick Capture.

The plan flow does not bypass `captureMetadata()`.

### Same Metadata Collection

Yes. Plan-pin photo and note captures collect the same timestamp, GPS, weather, device, and file metadata where permissions/network allow.

### Plan-Specific Metadata / Context

Plan target context is represented as `PlanCaptureTarget`:

- `planSheetId`
- `xPct`
- `yPct`
- `pinId` for persisted server UUID pins
- `clientPinId` for optimistic pins

The attachment step also adds:

- `session_id`
- `item_id`
- `pin_status`
- `pin_color`
- `client_pin_id` on new pin POST

Current storage model:

- Photo item metadata does not embed `planTarget`; the plan relationship is stored in `site_walk_pins.item_id` with plan sheet and coordinates on the pin row.
- Text/voice note metadata includes `plan_target` in the note metadata object in addition to the pin relationship.

This is acceptable for the BUG-079 identity fix because the flow still uses the shared metadata helper and stores authoritative plan context in `site_walk_pins`. A future deliverables/reporting slice can decide whether to duplicate a plan reference snapshot into item metadata for resilience.

### Metadata Loss Risk

No existing capture metadata is lost by the BUG-079 change.

Known limitation:

- If item creation succeeds but pin attach/create fails, the item row still has normal capture metadata but may not have an item-level metadata hint that it was intended for a plan point, especially for photo captures.
- This should be handled as a follow-up resiliency task, not inside this identity lifecycle commit.

## 3. UI Consistency Audit

### Shared Capture Preview Pattern

Quick captures and plan captures use the same `CameraViewfinder` and `useCaptureFileHandler.activePreview` pattern.

Both photo paths show the same immediate image preview through `PhotoMarkupCanvas`, with `CaptureUploadBadge` in visual mode.

### Attached Photo Thumbnail Behavior

Plan captures use the same file preparation, object URL preview, compression, upload, and saved item focus event path as Quick Capture.

No separate thumbnail implementation was introduced by BUG-079.

### Plan Pin Preview Pattern

Plan pins render as numbered plan markers through `PlanPin` / Leaflet markers. A pin with `item_id` calls `onSelectItem?.(pin.item_id)`, which routes back into the existing item selection/preview flow.

### Inconsistencies / Follow-Up UI Polish

Not fixed in this commit:

- Plan pins themselves do not yet show the same rich card/thumbnail preview pattern directly on the map.
- Plan capture confirmation is functional but less explicit than Quick Capture because the main feedback is the selected-plan-target banner and return-to-plan behavior.
- Pin card/thumbnail parity should be a future UI polish slice using the same saved item preview/card pattern as Quick Capture.

No UI change is required in this commit to preserve BUG-079 correctness.

## 4. Offline Audit

### Preserved Offline

When offline during a plan-pin capture, `queueOfflineCapture()` preserves:

- item create body
- `session_id`
- item type/title/description
- capture mode
- client item/mutation IDs
- full capture metadata object
- `latitude` / `longitude` derived from GPS when available
- `weather` when available before offline queueing
- photo/file blob via `saveOfflineBlob()`
- plan target in a separate queued pin mutation
- `clientPinId` as `client_pin_id` for new pins

### Sync Attachment

The queued item mutation targets `/api/site-walk/items`.

The queued plan mutation targets either:

- `PATCH /api/site-walk/pins/:id` for existing UUID pins, or
- `POST /api/site-walk/pins` for new optimistic pins, including `client_pin_id`.

The pin mutation uses `item_id: __client:<clientItemId>` so sync can resolve the local item reference when processing queued mutations.

### Offline Limitations

Known follow-up:

- Item creation and pin attach/create are separate offline mutations, so they are not transactionally guaranteed as one unit.
- If the item sync succeeds but the pin mutation fails permanently, the item can be orphaned from the plan. This pre-existing offline-resiliency risk is not introduced by BUG-079 and should be addressed separately.

## 5. Realtime / Collaboration Audit

### Realtime Observability

`useSiteWalkRealtime()` subscribes to:

- `site_walk_items` changes filtered by `session_id`
- `site_walk_pins` changes, protected by org-scoped RLS
- cursor and pin-drag broadcast events

The BUG-079 flow writes normal server rows:

- `site_walk_items` from `createCaptureItem()`
- `site_walk_pins` from `attachItemToPlanPin()` POST/PATCH

These writes are compatible with Supabase Realtime observation.

### Future Collaboration Context

The current flow preserves key future collaboration anchors:

- session context through `session_id`
- project/organization context through the plan sheet and RLS-backed server APIs
- item relationship through `site_walk_pins.item_id`
- optimistic reconciliation through `client_pin_id`

### Follow-Up Requirements

Not implemented in this commit:

- full cross-org/collaborator workflow behavior
- collaborator permission UX around plan pins
- richer realtime reconciliation directly in the plan viewer
- collaborator-specific preview/card permissions

The BUG-079 changes do not block those future requirements because they keep server rows authoritative and avoid client-only pin identity.

## 6. Deliverable Readiness Audit

### Available for Future Deliverables

Item fields available from the capture path:

- timestamp: `metadata.captured_at`
- GPS: top-level `latitude` / `longitude` and full `metadata.gps`
- weather: top-level `weather` and `metadata.weather`
- device: `metadata.device`
- file context: `metadata.file_size`, `metadata.mime_type`
- capture mode
- item title/description/category/priority/status/assignee/due date
- client item/mutation IDs and sync state

Plan fields available from the pin path:

- `site_walk_pins.id`
- `client_pin_id`
- `plan_sheet_id`
- `x_pct`
- `y_pct`
- `pin_number`
- `pin_status`
- `pin_color`
- `item_id`
- `session_id`

### Include / Exclude Controls Future Deliverables Should Support

Future deliverables should be able to include or exclude:

- timestamp
- GPS coordinates
- weather
- device details
- uploaded file details
- plan sheet reference
- plan coordinates
- pin number
- pin thumbnail / attachment preview
- assignee/status/category/priority
- collaborator/org attribution where authorized

## Conclusion

The BUG-079 implementation preserves the existing Quick Capture metadata path for plan-pin captures. Plan-based photo and note captures still collect timestamp, GPS, weather, device/context metadata, and offline queue data through the same shared helpers.

The identity lifecycle fix is metadata-safe. Remaining issues are UI parity polish and offline transaction resilience, both of which should be follow-up slices rather than part of this narrow commit.
