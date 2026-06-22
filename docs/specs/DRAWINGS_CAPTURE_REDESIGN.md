# Walks with Drawings — Capture Redesign Spec

Status: in progress. Brian's field review (2026-06-21) found the capture-on-drawings
surface broken/unbranded and "needs to be completely rethought." This file is the
source of truth for that rework so it survives across sessions.

## Live component map (verified, not assumed)

The capture flow page renders `CaptureFlowClient` → `CaptureV2Orchestrator`, which
branches:
- `isDesktop` → `CaptureV2DesktopStudio` (desktop only; has the "Drop photos here" dropzone)
- no plans → `NoPlansCaptureCanvas`
- **plans + `useWithPlansCanvas` → `WithPlansCaptureCanvas`  ← the walks-with-drawings screen**

`WithPlansCaptureCanvas` composes:
- `PlanViewerLeaflet` (the map; `hideToolbar`, `allowPinPlacement`, `useSourcePickerFlow`)
  - pins drawn by `createPlanPinMarkerIcon` (shared, type-aware as of P1)
  - tap captured pin → `onSessionPinTap` → `CapturePlanPinDetailSheet` (type-aware as of P2)
- `CapturePlanTopBar` → opens `CapturePlanSheetPickerSheet` (bottom sheet to pick/search sheets)
- `CapturePlanBottomRail` (prev/next **sheet**, NOT stop-to-stop)
- `CaptureV2SourcePickerSheet` (long-press → choose camera / upload / 360)
- `CaptureV2Orchestrator` also owns the camera viewfinder + note flow (reused from quick walks)

`CaptureCanvasShell` is DEAD CODE (nothing renders it) — ignore it.

## Field review issues (Brian, 2026-06-21)

| # | Issue | Root cause (confirmed) | Status |
|---|-------|------------------------|--------|
| 1 | Landscape shows amber "Drop photos here" | `detectDeviceKind()` required width ≤767px for "mobile"; landscape phone is wider ⇒ flips to DESKTOP studio | FIXED — touch signal OR narrow ⇒ mobile |
| 2 | Top-left "+/-" unbranded, "1990s" | Leaflet native `zoomControl` was never disabled | FIXED — `zoomControl={false}` (pinch still zooms) |
| 4 | Long-press "Upload from" sheet cut off | source picker capped at 45dvh; landscape clips rows | FIXED — cap raised to `min(80dvh,24rem)`, list scrolls |
| 3 | Sheet-search panel is useful but hidden | `CapturePlanTopBar` chevron is the only entry; not obvious | FIXED — top-bar sheet control is now a branded green chip w/ Layers glyph; picker has a search-icon field |
| 5 | 360 sources wrong (Photo library breaks 360; phone isn't a 360 cam) | source picker rows were device-only; no project-folder source | FIXED — "Add 360 from project folder" (SlateDrop) is PRIMARY; device file secondary |
| 6 | No way to delete pins (new or old) | no delete affordance wired; `DELETE /api/site-walk/pins/[id]` exists | FIXED — "Remove pin" in the pin sheet |
| 7 | Tapping a placed (empty) pin does nothing | `onSessionPinTap` only fired when `pin.item_id` set; empty long-press pins have none | FIXED — empty pin tap → "Add capture" (camera/upload/360) + remove |
| 8 | Top banner unbranded black/white | `PlanToolbar`/topbar styling is legacy slate/amber | FIXED — Graphite Glass + brand-green (#00E699) accents on the sheet chip, back/filmstrip buttons |
| 9 | Plans don't sit perfectly on screen | leaflet fit padding / bounds | REVIEWED — `fitPlanLeafletMap` is correct (asymmetric padding already accounts for top bar + filmstrip). Remaining "doesn't sit perfectly" is subjective polish that needs on-device tuning; not changed blind (must preserve working pan/zoom). |
| 10 | Stop-to-stop nav missing in drawings walk | bottom rail only pages sheets | DONE (same-sheet) — selecting a stop (filmstrip/pin) now pans the map to its pin via an additive `focusItemId`/`focusTick` prop on `PlanViewerLeaflet` (`map.panTo` only — fit/zoom untouched). Bottom rail branded + shows "Sheet N/M". Cross-sheet auto-switch (needs a session-wide pin→sheet query) is the remaining on-device follow-up. |

### Header consistency (field review 2026-06-22, screenshots)
All three capture headers unified to one branded pattern (each in its app accent —
Site Walk green, Twin blue): Back = filled accent pill w/ label; secondary icons
(stop/clips toggle, maximize, home) = bordered glass + accent-tinted icon (were plain
white); End/Done = filled accent pill. Files: `CaptureCanvasTopBar`, `CapturePlanTopBar`,
`TwinCaptureTopBar`. Bottom rail (`CapturePlanBottomRail`) icons branded to match.
| 11 | Project list origin unclear; scroll unclear | walks/projects list provenance + container | TODO — clarify source + ensure scroll container |

## 360-from-project-folder (the important new requirement)

Easiest field workflow: a user dumps all 360 photos from their 360 camera/drone into
**SlateDrop → <project> → 360 photos folder**, then pins them on the drawing. So the
"Add 360 photo" source picker must offer:
1. **PRIMARY: This project's 360 folder** (SlateDrop) — browse + pick an already-uploaded 360.
2. SECONDARY: device file (`Choose file`) — for 360s transferred onto the phone.
Remove/avoid: "Photo library" and "Take Photo" for 360 (they break/aren't 360-capable).

## Rebuild sequence (proposed)

1. ✅ P1 type-aware pins (color + glyph) — shipped
2. ✅ P2 capture-side type-aware pin tap (360 → interactive panorama) — shipped
3. ✅ Quick fixes: landscape desktop-leak (#1), Leaflet zoom control (#2), source picker height (#4)
4. ✅ Empty-pin tap → capture menu + delete (#6, #7) — shipped
5. ✅ 360 source = project SlateDrop folder picker (#5) — shipped
6. ✅ Branding pass on topbar + sheet picker, make sheet search discoverable (#2/#3/#8) — shipped
7. Stop-to-stop stepper (#10) + plan fit tuning (#9)
8. ◐ Project entry point — overview now leads with "Upload a drawing" + "Start walk with drawings" tiles (ProjectOverviewTab); deeper mobile project screen still TODO
9. Deliverable/recipient-side interactive pins

## Testing notes

- Sandbox can't run the live capture (needs signed-in user + device camera). Verify by
  code-read + esbuild parse + `npm run guard:design`; Brian reviews on phone per deploy.
- Clear old test walks: `node scripts/ops/cleanup-test-walks.mjs` (dry-run) then `--execute`.
  Keeps walks whose project has a plan set; deletes the rest.
