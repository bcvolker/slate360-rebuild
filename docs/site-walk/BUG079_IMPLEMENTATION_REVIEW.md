# BUG-079 Implementation Review — Pin/Capture Identity Lifecycle

Date: 2026-05-12
Branch: `chore/codex-workflow-and-sitewalk-pin-plan`

## Summary

BUG-079 was caused by optimistic plan pins using a local random ID as if it were the persisted `site_walk_pins.id`. The upload path only PATCHes UUID pin IDs, so a local temp ID caused a second server pin to be POSTed without a reliable UI reconciliation path.

This slice separates the two identities:

- `pinId`: persisted server UUID only.
- `clientPinId`: optimistic local identity, stored as `site_walk_pins.client_pin_id` on POST.

The server pin returned from POST/PATCH is now consumed and passed back through the capture save callback, and the plan viewer is refreshed after a plan-linked save so fetched server pins replace optimistic pins.

## Files Changed

### Product code

- `app/site-walk/(act-2-inputs)/capture/_components/CaptureClientIsland.tsx`
- `components/site-walk/capture/CameraViewfinder.tsx`
- `components/site-walk/capture/PlanPin.tsx`
- `components/site-walk/capture/PlanQuickActionMenu.tsx`
- `components/site-walk/capture/PlanViewerLeaflet.tsx`
- `components/site-walk/capture/PlanViewerPdf.tsx`
- `components/site-walk/capture/VisualCaptureView.tsx`
- `components/site-walk/capture/plan-capture-events.ts`
- `components/site-walk/capture/planViewerModel.ts`
- `components/site-walk/capture/useCaptureFileHandler.ts`
- `lib/hooks/useCaptureUpload.ts`
- `lib/site-walk/offline-capture.ts`

### Workflow / docs from the same branch

- `AGENTS.md`
- `docs/CODEX_PROMPTS.md`
- `docs/CODEX_WORKFLOW.md`
- `docs/CHATGPT_FACT_FINDING_FILE_LIST.txt`
- `docs/CHATGPT_FACT_FINDING_HANDOFF.md`
- `docs/site-walk/BUG079_PIN_CAPTURE_ROOT_CAUSE_PLAN.md`
- `scripts/audit-sitewalk-release-surface.mjs`
- `package.json`
- `SLATE360_PROJECT_MEMORY.md`

## Why Each Product-Code File Was Necessary

- `planViewerModel.ts`: defines shared quick-menu state with separate `pinId` and `clientPinId`, and creates optimistic pins with `client_pin_id`.
- `PlanViewerLeaflet.tsx`: mobile plan viewer now creates optimistic pins with `clientPinId` and passes UUID server pins only as `pinId`.
- `PlanViewerPdf.tsx`: desktop/PDF viewer mirrors the same identity split.
- `PlanQuickActionMenu.tsx`: constructs capture targets with guarded UUID-only `pinId` plus separate `clientPinId`.
- `useCaptureUpload.ts`: PATCHes existing UUID pins, POSTs new pins with `client_pin_id`, reads the returned `{ pin }`, and passes `planPin` through save context.
- `PlanPin.tsx`: maps `client_pin_id` and reconciles optimistic pins to fetched server pins by `client_pin_id` before coordinate fallback.
- `CaptureClientIsland.tsx`: increments `planRefreshKey` after plan-linked save to force the plan viewer to remount/refetch when returning to the plan.
- `useCaptureFileHandler.ts`, `CameraViewfinder.tsx`, `VisualCaptureView.tsx`: propagate the saved `SiteWalkPin | null` callback type through the capture stack.
- `plan-capture-events.ts`: preserves `clientPinId` in the legacy event fallback path.
- `offline-capture.ts`: preserves `client_pin_id` in queued offline plan-pin creation.

## Identity Lifecycle Confirmation

1. Optimistic pin creation generates a `clientPinId` and stores it on the local pin as `client_pin_id`.
2. Quick-action capture passes only a valid server UUID as `pinId`; temp/local IDs are passed as `clientPinId`.
3. Upload attach logic PATCHes a saved UUID pin or POSTs a new pin with `client_pin_id`.
4. The POST/PATCH response is parsed as a persisted `SiteWalkPin` and propagated via `planPin`.
5. Returning to plan increments `planRefreshKey`, forcing the plan viewer to fetch current server pins.
6. Fetched pins reconcile optimistic pins by `client_pin_id`, preventing duplicate pin display and preserving numbering from the server.

## Scope Review

Confirmed not touched:

- Trigger rasterization
- Supabase migrations/schema files
- Stripe/billing/auth/approval gates
- App-wide theme/global CSS
- Hidden future app implementations
- App Store mode behavior

No new TypeScript `any` usage was added.

## Validation

- `git diff --check`: passed for tracked diff; no whitespace/conflict-marker output.
- `npm run typecheck`: passed.
- `npm run build`: passed with existing warnings.
- `npm run guard:architecture`: passed.
- `npm run audit:sitewalk-release`: ran and failed with 984 existing release-surface findings. This is expected from the newly added audit script and is out of scope for BUG-079.

## Remaining Risks

- Physical-device verification is still required before marking BUG-079 fully fixed.
- `CaptureClientIsland.tsx` remains over the 300-line guardrail; this was pre-existing and the BUG-079 change was intentionally minimal.
- The release-surface audit still reports app-wide existing findings unrelated to BUG-079.

## Manual Test Plan

### iPhone Safari / installed PWA

1. Open a real Site Walk session with an already-rasterized plan sheet.
2. Long-press a plan location.
3. Choose camera capture.
4. Capture/upload an image.
5. Save details.
6. Confirm the app returns to the same plan.
7. Confirm one numbered pin appears at the chosen location.
8. Tap the pin and confirm it opens the saved finding/item.
9. Refresh/reopen the session and confirm the same pin persists without duplicate optimistic pins.

### Android Chrome / installed PWA

Repeat the iPhone flow with camera and upload actions.

### Desktop

Repeat the flow on the desktop/PDF viewer and confirm the same pin identity behavior.

### Offline Queue Smoke

1. Queue a plan-linked capture while offline.
2. Restore connectivity and sync.
3. Confirm the POST includes `client_pin_id` and the returned server pin reconciles to the original plan location.

## Targeted Commit Command

Do not use `git add .`. If approved, stage only these paths:

```bash
git add AGENTS.md \
  SLATE360_PROJECT_MEMORY.md \
  package.json \
  scripts/audit-sitewalk-release-surface.mjs \
  docs/CODEX_WORKFLOW.md \
  docs/CODEX_PROMPTS.md \
  docs/CHATGPT_FACT_FINDING_HANDOFF.md \
  docs/CHATGPT_FACT_FINDING_FILE_LIST.txt \
  docs/site-walk/BUG079_PIN_CAPTURE_ROOT_CAUSE_PLAN.md \
  docs/site-walk/BUG079_IMPLEMENTATION_REVIEW.md \
  'app/site-walk/(act-2-inputs)/capture/_components/CaptureClientIsland.tsx' \
  components/site-walk/capture/CameraViewfinder.tsx \
  components/site-walk/capture/PlanPin.tsx \
  components/site-walk/capture/PlanQuickActionMenu.tsx \
  components/site-walk/capture/PlanViewerLeaflet.tsx \
  components/site-walk/capture/PlanViewerPdf.tsx \
  components/site-walk/capture/VisualCaptureView.tsx \
  components/site-walk/capture/plan-capture-events.ts \
  components/site-walk/capture/planViewerModel.ts \
  components/site-walk/capture/useCaptureFileHandler.ts \
  lib/hooks/useCaptureUpload.ts \
  lib/site-walk/offline-capture.ts
```
