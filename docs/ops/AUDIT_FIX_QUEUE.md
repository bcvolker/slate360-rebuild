# Consolidated audit fix queue (Grok + Composer, June 11 2026)

Status legend: [x] fixed · [ ] queued · [defer] later slice

## BROKEN
- [x] B1 TwinCaptureScreen handleFinish: await onFinish, stop camera only after success
- [x] B2 TwinCaptureFlow handleCaptureFinish: try/catch persist, continue to review (in-memory session intact)
- [x] B3 Twin review Create CTA no longer dead when estimate API fails (fallback copy + enabled)
- [x] B4 saveAndNextStop returns false when flushDetails fails (flushDetails now returns boolean)
- [x] B5 Note-review overlay renders saveError above the pinned bars
- [x] B6 Canvas error banner dismiss clears externalError AND detailSaveError
- [x] B7 Voice memo upload failure rolls back the created item row (DELETE)
- [x] B8 Dead plan Layers button removed (returns with the Layers slice)
- [x] B9 Quick Walk + scoped walk: in-flight guard (startingWalk) prevents double-submit; sheet closes only on success
- [x] B10 Delete-stop failures surface via canvas error banner (deleteStop sets externalError)

## FRAGILE / CONFUSING
- [x] F1 Twin HUD toast dismiss stopPropagation
- [x] F2 Walk target sheet closes only after session create succeeds
- [ ] F3 Source picker close: clear planTarget for plan_pin source
- [x] F4 REC chip relabeled "· target 1:30" (no hard-stop implication)
- [x] F5 Camera permission-denied no longer auto-cleared
- [x] F6 Twin review back: blocked during submit/upload; goes to My Twins after job queued
- [ ] F7 Promote angle preview-only (needs server persist API — slice work)
- [x] F8 Pin popover check/X: accepted as save + close pair
- [x] F9 Plan pin detail sheet: scrim tap-to-close
- [defer] F10 Pending-persist partial restore messaging
- [defer] F11 TwinCaptureFlow orphan "upload" step removal (needs step type refactor)
- [x] F12 Plan-pin shutter awaits saveAndNextStop and stays on failure
- [x] F13 Desktop save&next only advances phase on success
- [ ] F14 Angle shutter busy gate during compress+save
- [x] F15 Transcript PATCH ok-check with row error
- [ ] F16 Voice memo delete busy flag
- [ ] F17 Long-press place pin error surfacing (partially covered by banner)
- [ ] F18 Markup/pin autosave repeated-failure toast (partially covered by banner)
- [x] F19 WithPlans hidden file inputs: iOS re-pick value reset
- [x] F20 Dock project rows deep-link to /project-hub/{id}
- [ ] F21 InviteShareModal close on route change
- [ ] F22 Bottom-nav active tab on module roots (documented as intentional pending design)
- [x] F23 Inbox notification fallback no longer builds /projects/undefined
- [ ] F24 MobileProjectsClient fetch/create error surfacing
- [ ] F25 Angle mode soft cancel (re-tap +Angle exits)
- [x] F26 Main angle thumb no-op hold handlers removed

## DESIGN (next batch)
- [ ] D1 /app shell bottom gap layout (flexible for future apps)
- [ ] D2 Site Walk hub redesign to match /app shell
- [ ] D3 Twin 360 hub redesign to match /app shell
