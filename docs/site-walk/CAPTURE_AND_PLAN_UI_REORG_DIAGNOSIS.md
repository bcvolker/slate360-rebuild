# Capture and Plan UI Reorganization Diagnosis

Date: 2026-05-13
Scope: active Site Walk mobile capture and Plan Walk workspace only.
Rollback tag: `pre-capture-ui-reorg-20260513-004912`

## Current working behavior to preserve

- Plan sheets load as server-rasterized WebP imagery in Leaflet.
- Mobile pan/zoom remains native through Leaflet.
- Long-press creates a draft plan pin and opens the plan capture action sheet.
- Camera/upload requests still use the trusted-tap direct picker path in `CaptureClientIsland`.
- Plan-linked captures still save through the shared `CameraViewfinder` → `useCaptureFileHandler` → `useCaptureUpload` path.
- `pinId` remains server UUID only; `clientPinId` remains optimistic draft identity.

## Structure findings

1. Top capture header
   - Renderer: `VisualCaptureView`.
   - Current issue: the red Exit Walk action is the first/primary control, while returning to the plan is not visible.

2. Exit Walk
   - Renderer: `VisualCaptureView` confirmation modal.
   - Current issue: exit is styled as the dominant action in the active work surface.

3. Return-to-plan state owner
   - Owner: `CaptureClientIsland` via `walkMode` and `returnToPlanAfterSave`.
   - Current issue: only the save path uses this state; the capture screen has no explicit Back to Plan affordance.

4. Details & Save renderer
   - Renderer: `CaptureDataBottomSheet`.
   - Current issue: the minimized mobile FAB is bottom-floating and can compete with capture/markup controls.

5. Markup block renderer
   - Renderer: `VisualCaptureView` bottom rail plus `UnifiedVectorToolbar`.
   - Current issue: the vector toolbar is always visible and uses a tall card with explanatory copy, reducing the photo workspace.

6. Attach/upload preview renderer
   - Renderer: `PendingUploadPreviewModal` from `CameraViewfinder`.
   - Current issue: modal z-index is above the normal sheet but below the recent plan action sheet layer; mobile height safety can be improved.

7. Plan toolbar renderer
   - Renderer: `PlanToolbar`, inside `PlanViewerLeaflet`.
   - Current issue: mobile toolbar starts collapsed but still uses a large card footprint; expanded max height is high for phone plan use.

8. Fixed/absolute positioning
   - `VisualCaptureView` uses fixed top and bottom bars plus an absolute capture stage with duplicated padding.
   - `CaptureDataBottomSheet` uses a separate fixed mobile button.
   - This creates independent overlays instead of a single task shell.

## Minimum safe reorganization

- Convert the mobile capture screen into a flex task shell: header, large `flex-1 min-h-0` visual region, compact bottom action rail.
- Add a Back to Plan button wired to the existing `CaptureClientIsland` `walkMode` owner.
- Make Exit Walk secondary/destructive instead of the primary header action.
- Move the minimized Details & Save launcher away from the bottom rail and hide it while the plan is already open.
- Show the tall vector toolbar only when Drawing mode is active and make its controls compact.
- Increase upload-preview modal stacking and constrain its mobile height.
- Reduce the plan toolbar collapsed/expanded footprint without removing page navigation, search, layer toggles, or zoom.

## Non-goals

- No rasterization, Trigger.dev, schema, auth, billing, or public marketing changes.
- No replacement of the shared capture/upload/offline pipeline.
- No changes to plan pin identity semantics.
