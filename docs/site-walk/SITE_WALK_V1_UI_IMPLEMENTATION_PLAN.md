# Site Walk V1 UI Implementation Plan

Date: 2026-05-13
Status: Planning only — do not implement until a slice is approved
Depends on: `docs/site-walk/SITE_WALK_V1_MOBILE_UX_DECISION_RECORD.md`

## Core rule

Build one bounded slice at a time. Preserve the current partially working Plan Walk loop:

Plan opens → pan/zoom works → long press opens capture → plan-linked capture saves → saved pin can be opened.

Do not combine UI cleanup with backend persistence, rasterization, billing, Trigger.dev, or schema changes unless explicitly approved for that slice.

---

## Slice 1 — Site Walk Home command center cleanup

### Goal

Turn Site Walk Home into a native-app command center for active field work.

### Files likely involved

- `app/site-walk/page.tsx`
- `components/site-walk/*`
- `components/shared/MobileInstallStrip.tsx`
- `components/shared/MobileBottomNav.tsx`
- session/walk row components if present
- Site Walk session API routes only if a row action already exists and needs wiring

### Work

- Remove install banner inside authenticated app surfaces.
- Remove duplicate top Site Walk nav where it duplicates bottom nav.
- Create command-center layout.
- Add contained Recent Walks panel above bottom nav.
- Add walk row three-dot menu.
- Add second-confirm delete confirmation.
- Add rename, duplicate, link/change project, create deliverable, archive actions when supported by existing APIs.

### What not to touch

- Trigger.dev rasterization.
- Plan viewer internals.
- Capture upload path.
- Supabase migrations unless a separately approved row-action API gap requires one.
- App-wide navigation redesign outside Site Walk.

### Validation commands

- `npm run typecheck`
- `npm run build`
- `npm run guard:architecture`
- `bash scripts/check-file-size.sh` if app code is touched

### Manual iPhone test steps

1. Open Site Walk Home.
2. Confirm no install banner appears inside authenticated app surface.
3. Confirm the page itself does not scroll under bottom nav.
4. Confirm Recent Walks scroll inside its own panel.
5. Open walk row menu.
6. Test Rename flow if wired.
7. Test Delete opens a second confirmation before destructive action.
8. Resume an active walk and verify existing capture flow still opens.

### Rollback concern

Home navigation regressions can block access to active walks. Keep route-level fallback links to setup/capture during the slice.

---

## Slice 2 — Shared mobile CaptureShell

### Goal

Unify Quick Walk and Plan Walk capture under a shared mobile task shell.

### Files likely involved

- `app/site-walk/(act-2-inputs)/capture/_components/CaptureClientIsland.tsx`
- `components/site-walk/capture/VisualCaptureView.tsx`
- `components/site-walk/capture/CameraViewfinder.tsx`
- `components/site-walk/capture/CaptureDataBottomSheet.tsx`
- new `components/site-walk/capture/CaptureShell.tsx`
- new `components/site-walk/capture/StopStrip.tsx`

### Work

- Add unified header.
- Add Back to Plan for plan-linked capture.
- Keep Exit Walk secondary/destructive.
- Add compact stop strip.
- Make Quick Walk and Plan Walk header language consistent.
- Remove confusing `PLAN-LINKED` language.
- Use state-specific save labels:
  - Plan Walk: `Save Stop & Return to Plan`
  - Quick Walk: `Save Stop & Continue`

### What not to touch

- `useCaptureUpload` logic.
- Plan pin identity semantics.
- Direct trusted-tap native file picker flow.
- Offline queue behavior.
- Trigger.dev or plan rasterization.

### Validation commands

- `npm run typecheck`
- `npm run build`
- `npm run guard:architecture`
- `bash scripts/check-file-size.sh`

### Manual iPhone test steps

1. Start Quick Walk and capture a photo.
2. Confirm header says current stop context and save label is `Save Stop & Continue`.
3. Start Plan Walk, long-press the plan, and capture/upload.
4. Confirm header says `Stop N · From Plan` or `Stop N · Plan Location`.
5. Confirm Back to Plan is visible and Exit Walk is secondary.
6. Save stop and confirm plan return still works.

### Rollback concern

This slice touches the active capture shell and can break iOS trusted file-picker timing. Do not move file input `.click()` out of the user tap chain.

---

## Slice 3 — Plan viewer workspace cleanup

### Goal

Maximize the plan canvas and move plan controls into predictable compact surfaces.

### Files likely involved

- `components/site-walk/capture/PlanViewer.tsx`
- `components/site-walk/capture/PlanViewerLeaflet.tsx`
- `components/site-walk/capture/PlanToolbar.tsx`
- new `components/site-walk/capture/PlanToolsDrawer.tsx`
- new `components/site-walk/capture/PlanSheetRail.tsx`
- new `components/site-walk/capture/PlanSearchPanel.tsx`
- new `components/site-walk/capture/PlanPinsPanel.tsx`
- `components/site-walk/capture/plan-layer-types.ts`

### Work

- Maximize plan canvas.
- Add compact top sheet bar.
- Add page forward/back.
- Add bottom tools drawer with tabs:
  - Sheets
  - Search
  - Pins
  - Layers
- Add thumbnail rail.
- Add search results drawer.
- Preserve layer/pin toggles.
- Add clean view toggle.
- Define portrait and landscape behavior.

### What not to touch

- Trigger.dev rasterization.
- `/api/site-walk/plan-sheets/[id]/image` behavior.
- Plan sheet database schema.
- Pin create/update APIs unless a later approved pin-edit slice requires it.

### Validation commands

- `npm run typecheck`
- `npm run build`
- `npm run guard:architecture`
- `bash scripts/check-file-size.sh`

### Manual iPhone test steps

1. Open plan mode on a real project plan.
2. Confirm plan fills the available workspace.
3. Pan and pinch zoom repeatedly.
4. Expand Sheets tab and switch sheets.
5. Search by page/sheet label.
6. Toggle pins off/on.
7. Toggle clean plan/show pins.
8. Rotate to landscape and verify controls do not cover the plan.

### Rollback concern

Plan viewer layout changes can block the core loop. Keep current `PlanToolbar` available until the drawer is wired and tested.

---

## Slice 4 — Markup and attachment compaction

### Goal

Make markup and attachments compact, contextual, and non-overlapping.

### Files likely involved

- `components/site-walk/capture/UnifiedVectorToolbar.tsx`
- `components/site-walk/capture/PhotoMarkupCanvas.tsx`
- `components/site-walk/capture/PhotoMarkupControls.tsx`
- `components/site-walk/capture/CaptureDataBottomSheet.tsx`
- `components/site-walk/capture/PendingUploadPreviewModal.tsx`
- attachment/pin preview components under `components/site-walk/capture/`

### Work

- Compact horizontal markup rail.
- Contextual colors/strokes/delete.
- Remove instruction paragraph.
- Move attachments into Details / Attachments / Markup sheet tabs.
- Prevent toolbar/action rail overlap.
- Keep touch targets at least 44px.

### What not to touch

- Upload API routes.
- SlateDrop storage routing.
- Existing attachment metadata shape unless separately approved.
- Plan pin identity logic.

### Validation commands

- `npm run typecheck`
- `npm run build`
- `npm run guard:architecture`
- `bash scripts/check-file-size.sh`

### Manual iPhone test steps

1. Capture or upload a photo.
2. Draw, select, undo, redo, change color, and change stroke.
3. Confirm delete appears only when relevant.
4. Add/open attachment sheet.
5. Preview a photo/document attachment.
6. Confirm no modal is covered by toolbar/action rail.

### Rollback concern

Markup/attachment regressions can make saved evidence look missing. Test persisted items and optimistic items.

---

## Slice 5 — Pins and stop preview

### Goal

Make draft and saved pin behavior explicit and safe.

### Files likely involved

- `components/site-walk/capture/PlanViewerLeaflet.tsx`
- `components/site-walk/capture/PlanPin.tsx`
- `components/site-walk/capture/PlanQuickActionMenu.tsx`
- `components/site-walk/capture/planViewerModel.ts`
- new `components/site-walk/capture/StopPreviewCard.tsx`
- `/api/site-walk/pins/[id]/route.ts` only if an approved Move Pin mode needs API support

### Work

- Keep draft pin dragging before save.
- Lock saved pins by default.
- Add explicit Edit Location / Move Pin mode for saved pins.
- Add consistent pin preview card.
- Add thumbnail preview for saved stop.
- Ensure plan pin and quick capture preview share the same design family.

### What not to touch

- Pin ID lifecycle model.
- `clientPinId` reconciliation semantics.
- Rasterization or plan image routes.
- Bulk data migrations.

### Validation commands

- `npm run typecheck`
- `npm run build`
- `npm run guard:architecture`

### Manual iPhone test steps

1. Long-press plan and drag draft pin before capture.
2. Capture and save the stop.
3. Reopen saved pin and verify it is locked while panning.
4. Enter Move Pin mode.
5. Move saved pin deliberately and save.
6. Refresh plan and confirm location persists.

### Rollback concern

Accidental movement of saved pins damages trust. Saved pins must remain locked unless the explicit mode is active.

---

## Slice 6 — Before/After and Ghost V1

### Goal

Create the first guided before/after recapture loop and make Ghost contextual.

### Files likely involved

- `components/site-walk/capture/VisualCaptureView.tsx`
- `components/site-walk/capture/CameraViewfinder.tsx`
- `components/site-walk/capture/useCaptureItems.ts`
- item comparison routes/components if already present
- deliverable item selection/preview components

### Work

- Add After Photo flow.
- Open camera with guided ghost overlay of the original photo.
- Pair before/after records.
- Preserve deliverable-ready metadata.
- Hide Ghost control except during guided recapture.

### What not to touch

- Broad deliverable builder redesign.
- 360 Tours authoring.
- Schema without an approved data model review.
- Plan rasterization.

### Validation commands

- `npm run typecheck`
- `npm run build`
- `npm run guard:architecture`

### Manual iPhone test steps

1. Open a saved stop.
2. Tap Add After Photo.
3. Confirm camera opens with ghost overlay.
4. Capture aligned after photo.
5. Save as After.
6. Open comparison view and confirm before/after pairing.

### Rollback concern

Ghost overlay must not become permanent capture chrome. Keep it limited to guided recapture.

---

## Slice 7 — Design token foundation

### Goal

Prepare the design system for a premium graphite/slate direction without broad app-wide repainting.

### Files likely involved

- `app/globals.css`
- `components/shared/GlassCard.tsx`
- `scripts/` hardcoded color audit script
- Site Walk capture/plan components first
- `docs/design/SLATE360_V1_DESIGN_TOKEN_PLAN.md`

### Work

- Add CSS variable token plan.
- Add hardcoded color audit.
- Migrate Site Walk capture/plan tokens first.
- Defer shell/auth/homepage/email migration.

### What not to touch

- Public homepage redesign.
- Billing/auth flows.
- Hidden apps.
- App-wide class replacement.

### Validation commands

- `npm run typecheck`
- `npm run build`
- `npm run guard:architecture`
- hardcoded color audit command once created

### Manual iPhone test steps

1. Open Site Walk Home.
2. Open Plan Walk.
3. Open Quick Walk.
4. Verify contrast outdoors/bright mode by visual inspection.
5. Confirm plans/photos are easier to read than harsh black/orange surfaces.

### Rollback concern

Token migration can create invisible text if done broadly. Limit the first slice to Site Walk capture/plan.

---

## Slice 8 — App Store visible surface cleanup

### Goal

Make the visible app-store-facing authenticated surface clean, native, and Site-Walk-focused for V1.

### Files likely involved

- `components/shared/MobileBottomNav.tsx`
- `components/shared/CommandPalette.tsx`
- `components/dashboard/command-center/*`
- `lib/app-store-mode.ts`
- app shell routes under `app/`
- release audit script under `scripts/`

### Work

- Hide future apps.
- Remove Coming Soon.
- Remove waitlist/demo/beta/test language inside the app.
- Clean homepage/app shell/public surfaces after core Site Walk UI is stable.

### What not to touch

- Site Walk capture/pin behavior unless explicitly in scope.
- Stripe/billing implementation.
- Database schema.
- Trigger.dev.

### Validation commands

- `npm run typecheck`
- `npm run build`
- `npm run verify:release`
- `npm run audit:sitewalk-release` if available

### Manual iPhone test steps

1. Login as approved V1 Site Walk user.
2. Confirm only V1 surfaces are visible.
3. Confirm no Coming Soon/filler/demo/beta/test copy appears in authenticated shell.
4. Navigate Home, Projects, Site Walk, SlateDrop, Coordination, Account.
5. Confirm each visible page has real data, real action, or a clean functional empty state.

### Rollback concern

Over-hiding can remove needed navigation. Keep a route map of hidden vs visible surfaces and test all V1 entry paths.

---

## Recommended first slice

Start with Slice 1: Site Walk Home command center cleanup.

Reason:

- It does not touch the fragile capture/upload/plan identity path.
- It improves the first daily user workflow.
- It creates the correct command-center shell for the later capture and plan UI slices.
