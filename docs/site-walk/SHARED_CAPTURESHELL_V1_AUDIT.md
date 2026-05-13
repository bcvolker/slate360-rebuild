# Shared CaptureShell V1 Audit

Date: 2026-05-13
Status: No-edit audit completed before implementation
Rollback tag: `pre-shared-captureshell-v1-20260513-172442`

## Files Inspected

- `app/site-walk/(act-2-inputs)/capture/_components/CaptureShell.tsx` — 27 lines
- `app/site-walk/(act-2-inputs)/capture/_components/CaptureClientIsland.tsx` — 279 lines
- `app/site-walk/(act-2-inputs)/capture/_components/CaptureModeControls.tsx` — 31 lines
- `components/site-walk/capture/VisualCaptureView.tsx` — 173 lines
- `components/site-walk/capture/CameraViewfinder.tsx` — 182 lines
- `components/site-walk/capture/CaptureDataBottomSheet.tsx` — 284 lines
- `components/site-walk/capture/UnifiedVectorToolbar.tsx` — 68 lines
- `components/site-walk/capture/PendingUploadPreviewModal.tsx` — 29 lines
- `components/site-walk/capture/PlanQuickActionMenu.tsx` — 89 lines
- `components/site-walk/capture/PlanViewerLeaflet.tsx` — 269 lines
- `components/site-walk/capture/useCaptureFileHandler.ts` — 137 lines
- `lib/hooks/useCaptureUpload.ts` — 202 lines

## Ownership Map

1. Full task viewport owner: `CaptureShell.tsx` already owns the fixed `h-[100dvh]` task viewport and hides platform scrolling through `overflow-hidden`.
2. Capture header owner: `VisualCaptureView.tsx` owns the current camera-only task header. Plan mode does not share this header, so Quick and Plan diverge.
3. Back to Plan owner: `VisualCaptureView.tsx` conditionally renders a Plan button when `onBackToPlan` exists. It is unavailable while the user is on the plan canvas because the header is not shared.
4. Exit Walk owner: `VisualCaptureView.tsx` owns the current exit button and confirmation modal. It should move to the shared task header so it behaves consistently.
5. Details/Save owner: `CaptureDataBottomSheet.tsx` owns details fields, AI note formatting, finish/review link, and save-next/save-return behavior.
6. Attachments/upload preview owner: `CameraViewfinder.tsx` and `useCaptureFileHandler.ts` own the trusted file input path, pending upload preview, compression, upload/offline queue, and plan-pin attach handoff. `PendingUploadPreviewModal.tsx` owns the confirm/cancel preview surface.
7. Markup tools owner: `VisualCaptureView.tsx` currently renders the markup rail and `UnifiedVectorToolbar.tsx` dispatches markup tool events to `PhotoMarkupCanvas`.
8. Fixed/absolute/z-index/bottom positioning: `CaptureShell.tsx`, `CaptureClientIsland.tsx`, `VisualCaptureView.tsx`, `CaptureDataBottomSheet.tsx`, `PlanViewerLeaflet.tsx`, `PlanQuickActionMenu.tsx`, and `PendingUploadPreviewModal.tsx` all use fixed or absolute layers. The highest-risk overlaps are the camera header versus plan-mode chrome, the details FAB over the visual stage, the markup rail over the sheet, and the plan quick action menu at `z-[2000]`.
9. Quick Walk vs Plan Walk divergence: Quick Walk opens camera mode with a camera-only header and save label. Plan Walk starts or returns to the plan canvas and only gains Back to Plan after entering camera mode. The mode copy currently includes `Plan-linked`, and save labels are vague (`Save & Return to Plan`, `Save & Next Camera`).
10. Smallest safe shared structure: keep `CaptureShell.tsx` as the viewport owner, add one shared task header in `CaptureClientIsland.tsx`, suppress the old `VisualCaptureView` header when used inside that shared shell, and add live Details/Attachments/Markup tabs to the existing save sheet without moving the trusted picker `.click()` chain.

## No-Go Findings

- Do not edit `useCaptureUpload.ts` for this slice.
- Do not alter `useCaptureFileHandler.ts` trusted direct picker flow.
- Do not change `PlanViewerLeaflet.tsx` pin identity, drag, pan/zoom, or rasterized image behavior.
- Do not implement saved-pin Move/Delete, Plan Tools Drawer, full Stop Strip navigation, Before/After/Ghost V1, Deliverables, migrations, Trigger.dev changes, or schema changes.