# Shared CaptureShell V1 Implementation

Date: 2026-05-14
Status: Implemented; Act 2 zone-ownership correction applied and validated locally
Rollback tag: `pre-shared-captureshell-v1-20260513-172442`

## What Changed

- `app/site-walk/(act-2-inputs)/capture/_components/SharedCaptureTaskHeader.tsx`: adds one shared active-task header for Quick Walk and Plan Walk with a primary left action, stop context, walk title, and secondary/destructive Exit flow.
- `app/site-walk/(act-2-inputs)/capture/_components/CaptureClientIsland.tsx`: wraps plan and camera modes in the same fixed task structure, shows `Stop N · From Plan` or `Stop N · Quick Capture`, and keeps Back to Plan as the Plan Walk primary action.
- `components/site-walk/capture/VisualCaptureView.tsx`: can suppress its legacy camera-only header when rendered inside the shared shell.
- `components/site-walk/capture/CaptureDataBottomSheet.tsx`: adds live Details, Attachments, and Markup tabs while preserving the existing details/save implementation.
- `components/site-walk/capture/CaptureSheetUtilityPanel.tsx`: wires the Attachments tab to the existing capture/upload callbacks and the Markup tab to the existing vector toolbar events.
- `docs/site-walk/SHARED_CAPTURESHELL_V1_AUDIT.md`: records the required pre-edit ownership audit.

## Shell Structure

- `CaptureShell.tsx` remains the full task viewport owner with fixed `100dvh` bounds and `overflow-hidden`.
- `CaptureClientIsland.tsx` now owns the shared task header for both Quick Walk and Plan Walk.
- `VisualCaptureView.tsx` owns the visual/photo stage, but no longer owns the task header when used in the shared capture flow.
- `CaptureDataBottomSheet.tsx` remains the details/save owner and now exposes the three active lower-sheet tabs.
- `PlanViewerLeaflet.tsx` and plan rasterized-image handling were not changed.

## Act 2 Zone-Ownership Correction

Rollback tag for the correction: `pre-act2-zone-ownership-20260514-010357`

- Zone 1 — Task Header: `SharedCaptureTaskHeader.tsx` is the only active task top owner. Plan/Camera, Home, Pan/Pin, and legacy capture headers are not stacked under it in shared task mode.
- Zone 2 — Canvas: Plan Walk keeps the Leaflet plan as the canvas; Quick Walk keeps the camera/photo as the canvas. Permanent large tool cards were removed from the canvas.
- Zone 3 — Bottom Drawer: `CaptureDataBottomSheet.tsx` owns Details / Attachments / Markup and the canonical save button. Markup controls appear only in the Markup tab.
- Zone 4 — Modal Layer: Exit confirmation and upload preview render above plan/capture controls and respect iOS safe areas.

Specific correction outcomes:

- `PlanToolbar.tsx` now renders one compact `Plans` pill with page context and visible pin count; full plan tools remain deferred.
- `PlanViewerLeaflet.tsx` no longer renders the floating Pan/Pin switch; pan/zoom and long-press draft-pin creation remain preserved.
- `CaptureDataBottomSheet.tsx` no longer renders a floating Details button or duplicate top Save button; it auto-opens to Details when an item becomes active.
- `VisualCaptureView.tsx` no longer renders the detached bottom markup rail in shared task mode.
- Saved linked pins open the loaded item when available; unresolved saved pins open the safe locked menu instead of doing nothing.

## Behavior Checklist

- Back to Plan exists as the primary Plan Walk header action.
- Exit Walk remains secondary/destructive and still requires confirmation.
- Header copy no longer uses `PLAN-LINKED` or `Plan-linked`; Plan Walk uses `From Plan`, Quick Walk uses `Quick Capture`.
- Plan Walk save copy is `Save Stop & Return to Plan`.
- Quick Walk save copy is `Save Stop & Continue`.
- Details tab uses the existing metadata/save surface.
- Attachments tab uses the existing capture/upload callback path.
- Markup tab uses the existing `UnifiedVectorToolbar` event path.
- The Stop Strip is intentionally not implemented beyond the current stop label in the header.
- The Act 2 correction intentionally does not implement Plan Tools Drawer, saved-pin Move/Delete, full Stop Strip navigation, Before/After/Ghost, or Deliverables.

## Codex-Style Review Checklist

- No Trigger.dev changes.
- No Supabase schema, migration, or database changes.
- No app-wide color migration.
- No fake data, demo content, filler panels, or dead tabs.
- No capture upload API contract changes.
- No `useCaptureUpload.ts` behavior changes.
- Plan pan/zoom behavior preserved.
- Empty-plan long-press draft pin creation preserved.
- Draft pin drag-before-save preserved.
- Saved-pin duplicate guard preserved.
- Quick Capture route still opens the shared shell.
- Plan Walk capture still opens the shared shell.

## Deferred Work

- Full saved-pin Move Pin mode.
- Full saved-pin Delete flow.
- Plan Tools Drawer.
- Full Stop Strip navigation.
- Before/After and Ghost V1.
- Deliverables V1 polish.
- Physical iPhone confirmation.

## Validation

- `npm run typecheck` — passed.
- `npm run build` — passed with existing Next/Sentry/webpack warnings.
- `npm run guard:architecture` — passed.
- `bash scripts/check-file-size.sh || true` — reports 13 pre-existing unrelated oversized files; no touched Shared CaptureShell or Act 2 correction file exceeds 300 lines.