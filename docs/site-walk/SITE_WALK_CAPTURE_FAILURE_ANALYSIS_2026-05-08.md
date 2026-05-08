# Site Walk Capture Failure Analysis — May 8, 2026

## Purpose

This report inventories the Site Walk capture fixes attempted over the last 3–4 days, explains why they did not resolve the user's observed failures, and gives a self-contained prompt for outside AI assistants to review the architecture without needing Codespace history.

The failures still reported after commit `0fe9c76` are:

1. Mobile **Save & Next** still does not advance to the next stop / camera.
2. Desktop capture layout still spills under/top header and off the bottom of the screen.
3. Desktop button after an upload is partially obstructed and opens File Explorer again.
4. Phone plan walks still crash.
5. Photo zoom works, but panning does not.

## Executive Findings

### Do not keep patching the same layer

The recent commits repeatedly patched visible symptoms in the drawer, grid, and pointer handlers. The recurring failures point to deeper architectural coupling:

- Capture intent is routed through React state/effects instead of a direct user-event call chain.
- Desktop and mobile share too much of the same bottom-sheet/capture UI contract.
- The active capture item, pending upload modal, and Save/Next state are not a single explicit state machine.
- Markup mode and navigation/pan mode are conflated.
- Plan viewing relies on client-side React-PDF rendering on phones, which is fragile for large PDFs.

### Most likely current root causes, by process of elimination

#### 1. Mobile Save & Next loses browser user activation before opening camera

Current flow:

`CaptureDataBottomSheet.handleSaveNextClick()` → `onSaveNextStop()` → `CaptureClientIsland.saveNextStop()` → `captureNow()` → `CaptureContext.requestCapture()` → React state update → `CameraViewfinder.useEffect()` → hidden input `.click()`.

This is the central problem. On iOS/Safari and many mobile browsers, `input[type=file].click()` must happen directly inside the trusted user tap handler. Moving the click through React state and `useEffect()` is no longer guaranteed to preserve user activation, even if the effect calls `.click()` synchronously once it runs. The previous fix removed a timeout race, but it still leaves the actual file-input click outside the original button handler.

Evidence:

- Desktop can open File Explorer from this path, but mobile still does nothing. Desktop browsers are more permissive; mobile browsers are stricter.
- Attempts to remove `await`, remove `setTimeout`, and force `walkMode="camera"` did not fix mobile.
- Therefore the remaining failure is probably not the draft flush or drawer click handler. It is the architectural distance between the Save & Next button and the actual hidden file input.

Required next design direction:

- Put the next capture file input behind the actual Save & Next button or expose a real imperative camera/input opener that is invoked directly in the same click handler.
- Do not rely on context state, window events, effects, or timers to open native camera/file picker on mobile.
- Separate “advance stop state” from “open next native picker.” The state can update asynchronously, but the picker click must be immediate.

#### 2. Desktop layout still spills because capture is not truly full-bleed task mode

Current route stack:

`app/site-walk/layout.tsx` wraps all Site Walk pages in `AuthedAppShell` and `SiteWalkShell`; `SiteWalkShell` always renders `SiteWalkModuleNav`; `SiteWalkModuleNav` is `sticky top-0 z-30`.

The capture screen then renders its own visual header and desktop aside inside that shell. Measuring section height from `getBoundingClientRect().top` is fragile because sticky module chrome still exists above the capture task, and visual controls have their own z-index/header rows.

Evidence:

- Several commits converted the drawer to a desktop aside and attempted height measurement, but the user still sees the right-side controls under/behind the header.
- The module nav was added as global Site Walk chrome on May 6 and has not been hidden for `/site-walk/capture`.

Required next design direction:

- Treat `/site-walk/capture` as a task-mode route that hides `SiteWalkModuleNav` and possibly global app shell chrome.
- Do not try to fit full-screen capture inside a page that still renders sticky module navigation above it.
- Build desktop capture as `height: 100dvh` inside its own route shell: left canvas, right inspector/sidebar, no sticky module nav.

#### 3. Desktop “Save/Next” opening File Explorer means the UI is not in a saved-item state

In `CaptureDataBottomSheet`, the primary action is conditional:

- If `item` exists: show Save & Next.
- If `item` is null: show Take Photo / Upload action.

If the user uploads a picture and then sees a half-obstructed orange button that opens File Explorer, the UI likely still thinks `activeItem` is null or the user is still on the pending-upload/initial-upload path. That can happen when:

- The desktop upload confirmation modal was not completed.
- `savePhoto()` failed and queued offline without focusing a stable item.
- The optimistic local item was created but active item reconciliation was lost.
- The button the user is pressing is not Save & Next; it is the fallback Upload button because no `item` exists.

Required next design direction:

- Make active states explicit: `empty`, `pending_upload_preview`, `saving_upload`, `active_item_ready`, `saving_details`, `requesting_next_capture`, `error`.
- Show a clear desktop-specific “Confirm upload” and “Next stop” state, not the same orange button for both upload and advance.
- Log/report the current state visibly in dev builds until the flow is stable.

#### 4. Photo panning is disabled whenever markup mode is on

`CaptureClientIsland` initializes `markupOn` to `true`. `VisualCaptureView` passes that into `CameraViewfinder`, then `PhotoMarkupCanvas` / `useMarkupCanvasState` receives `markupEnabled=true`.

In `useMarkupCanvasState`, pinch zoom runs regardless, but pan only runs in this branch:

```ts
if (!markupEnabled) {
  if (panRef.current && transformRef.current.scale !== 1) {
    updateTransform(...)
  }
  return;
}
```

So when markup is on by default, zoom can work while panning does not. This exactly matches the user report.

Required next design direction:

- Add an explicit navigation tool / hand-pan mode separate from markup enabled.
- Default captured photos to navigation mode on mobile after capture, not markup mode.
- If markup mode remains visible, pan should still work with one/two-finger gestures when not actively drawing a shape.

#### 5. Phone plan crashes are probably not only a centering bug

Recent commits fixed PDF worker setup, render-success gating, fixed-width PDF surfaces, and GPU transforms. If phone plan walks still crash, the remaining issue is likely client-side PDF rendering/memory pressure or a React-PDF/gesture interaction, not the previously patched centering race alone.

Required next design direction:

- Stop rendering large PDFs directly on mobile capture if crashes persist.
- Use pre-rendered plan page images/tiles or a lightweight image endpoint for mobile plan walk mode.
- Keep React-PDF in the plan room/desktop path only until mobile stability is proven.

## Attempt Timeline — May 4 to May 8

This table is built from `git log --since '2026-05-04'` and changed-file stats for `app/site-walk`, `components/site-walk`, `lib/hooks/useDeviceContext.ts`, `lib/hooks/useVirtualKeyboardOffset.ts`, and `lib/hooks/useCaptureUpload.ts`.

| Commit | Date | Attempted Fix / Change | Files/Areas | Outcome Inferred From User Report |
|---|---:|---|---|---|
| `3fefe97` | 2026-05-04 | Global chrome/amber theme and planning-first Site Walk launch changes | Site Walk launch grid/page | Not related to core capture failure. |
| `8e983bb` | 2026-05-04 | Amber brand system applied through Site Walk setup/workflow pages | Setup/workflow pages | Visual polish; not capture mechanics. |
| `fb7fe32` | 2026-05-04 | Cobalt-to-amber color purge across Site Walk capture components | Many capture files | Visual polish; did not address state machine. |
| `1edd016` | 2026-05-05 | Dark theme root cause + Site Walk thumbnails/delete | Walk list/live components | Not core capture advance path. |
| `bb0e98b` | 2026-05-06 | Added Site Walk module nav and darkened deep Site Walk surfaces | `SiteWalkModuleNav`, shell, capture components | Introduced/solidified sticky module nav that later conflicts with full-screen capture task mode. |
| `3819d3a` | 2026-05-06 | Unified account navigation and Site Walk back affordances | `CaptureClientIsland`, `VisualCaptureView`, `SiteWalkModuleNav` | Added back/home affordances; did not solve full-screen capture chrome isolation. |
| `7727894` | 2026-05-06 | Hardened plan upload/capture UX; introduced `CaptureDataBottomSheet` | `CaptureClientIsland`, `CaptureDataBottomSheet`, `PlanViewer`, `VisualCaptureView` | Added drawer architecture now implicated in mobile/desktop layout complexity. |
| `a0360f8` | 2026-05-06 | Render Site Walk plan PDFs | Plan upload, `PlanPdfPage`, `PlanViewer`, capture shell | Enabled PDF plan rendering but increased mobile plan complexity. |
| `9b69a29` | 2026-05-06 | Bundled PDF worker and page controls | `PlanPdfPage`, `PlanViewer` | Solved worker issue, not mobile crash fully. |
| `6837f63` | 2026-05-06 | Stabilized plan PDFs and pin uploads | `PlanPdfPage`, `useCaptureUpload` | Plan upload stability attempt; crash still reported. |
| `66619a2` | 2026-05-07 | Stabilized PDF viewport | `PlanViewer`, `PlanPdfPage` | Viewport/centering attempt; crash persists. |
| `d9312e7` | 2026-05-07 | Wired capture workflow fields and device context | `CaptureDataBottomSheet`, `capture-draft-save`, `useDeviceContext` | Added workflow fields; did not solve next-stop. |
| `2a9d55b` | 2026-05-07 | Hardened native interactions | Bottom sheet, PDF, plan viewer | Gesture/pointer attempt; pan still broken. |
| `71b258c` | 2026-05-07 | Return plan-pin captures to plan mode | `CaptureClientIsland` | Fixed one plan-pin return path, but Quick Capture next-stop remains broken. |
| `99857a1` | 2026-05-07 | Stabilized desktop image upload preview | `CameraViewfinder`, `PendingUploadPreviewModal`, markup/pin files | Added confirm-preview path; desktop still confusing because upload vs active-item states are not explicit. |
| `7ab2f4f` | 2026-05-07 | Center plan view and desktop pin actions | Bottom sheet, quick menu, geometry | Plan UX attempt; does not solve capture state machine. |
| `ebbb7ca` | 2026-05-07 | Wired plan capture upload loop | `CaptureClientIsland`, `CameraViewfinder`, pending modal, upload hook | Tried to connect plan pin capture and upload/save callbacks. User still reports plan crash/next-stop failure. |
| `6026129` | 2026-05-07 | Restored markup and multi-angle capture | `CameraViewfinder`, `VisualCaptureView`, angle save files | Added more capture features, increasing state complexity. |
| `c297ace` | 2026-05-07 | Introduced `CaptureContext` + grid layout | `CaptureContext`, `CameraViewfinder`, `VisualCaptureView` | Replaced window event bus with context. This likely caused mobile user-activation loss because file input click moved into a React effect. |
| `d39e39b` | 2026-05-07 | Unified plan toolbar | `PlanToolbar`, `PlanViewer` | Toolbar consolidation; not capture advance. |
| `1fd83b5` | 2026-05-07 | Per-project trade options | Bottom sheet, manage trades | Feature addition during instability. |
| `115d186` | 2026-05-07 | Before/after + progression timeline; removed legacy tree | Hub, reports, compare, bottom sheet | Large structural change; not targeted at current failure. |
| `f383ac1` | 2026-05-07 | Plan upload simplification | Plan room/uploader/start walk | Plan setup UX; not current next-stop. |
| `50f0260` | 2026-05-07 | Responsive sweep and cleanup | Plan toolbar/viewer, hub | Broad cleanup, not state-machine verification. |
| `13c0997` | 2026-05-07 | Hardened device context and capture grid | `useDeviceContext`, viewfinder, drawer, visual view | Device detection/grid attempt; not direct file-input user activation. |
| `0af3148` | 2026-05-07 | Deferred plan centering until PDF render | `PlanPdfPage`, `PlanViewer` | Good fix for centering race; crash still indicates deeper PDF/mobile issue. |
| `1f7ae8a` | 2026-05-07 | Hardened Confirm & Attach failures; added trace logging | `CameraViewfinder`, `CaptureContext`, `useCaptureUpload`, modal | Improved error visibility but not the Quick Capture Save & Next direct mobile picker path. |
| `a66393f` | 2026-05-07 | Auto-generate plan sheet rows | Plan uploader | Fixes sheet IDs; not current UI/next-stop. |
| `b7e82be` | 2026-05-07 | Recovered core UX flow | Hub, bottom sheet, plan pins, visual view, upload hook | Large recovery pass. User still reports core flow broken. |
| `1ddf32e` | 2026-05-07 | Unified plan pin thumbnails with quick capture modal behavior | Plan pins/viewer/hub | Plan pin UX; not Quick Capture mobile Save & Next. |
| `4629081` | 2026-05-07 | Mobile UX overhaul for capture views | Hub, bottom sheet, plan viewer, visual view | Moved controls/adjusted drawer. Did not fix next-stop. |
| `f406eca` | 2026-05-07 | Enforced instant plan return and cleaned drawer UI | `CaptureClientIsland`, drawer | Patched plan return behavior; Quick Capture still broken. |
| `0fbaeaf` | 2026-05-07 | GPU zoom pivot and capture UX updates | Hub, drawer, PDF, toolbar, visual view | GPU/render attempt; phone plan crash persists. |
| `cac863f` | 2026-05-08 | Stabilized mobile plan capture flow | Plan viewer/PDF, drawer, visual view, keyboard offset, capture items | Broad mobile plan/drawer attempt. User says all problems persisted. |
| `9d7a9b8` | 2026-05-08 | Repaired data drawer Save & Next | Drawer and capture client | Excluded buttons from blur and awaited parent transition. User still reports button fails. |
| `a80e5ef` | 2026-05-08 | Responsive split pane for desktop capture and Safari input race | Drawer and capture client | Desktop still obstructed; mobile still does not advance. |
| `b52a7c8` | 2026-05-08 | Repaired next-stop click race, desktop layout, post-pinch pan | Capture client, viewfinder, drawer, markup state | Removed timeout cleanup race and added desktop aside. User confirms all core problems still persist. |
| `0fe9c76` | 2026-05-08 | Removed stray script | Deleted accidental `update_bug.js` | Cleanup only. |

## Repeated Failed Assumptions

1. **Assumption:** If the file picker works on desktop, the mobile camera should also open.  
   **False.** Mobile Safari/browser user-activation rules are stricter. React effect-driven `.click()` is suspect.

2. **Assumption:** The button did not work because pointer-down blur swallowed click.  
   **Partially plausible, but not sufficient.** It was patched and the issue remained.

3. **Assumption:** The button did not work because draft flush was awaited.  
   **Partially plausible, but not sufficient.** It was changed to fire-and-forget and the issue remained.

4. **Assumption:** The button did not work because `walkMode` was not forced to camera.  
   **Partially plausible, but not sufficient.** It was forced and the issue remained.

5. **Assumption:** Desktop just needed the drawer converted to a sidebar.  
   **Incomplete.** The route still renders inside sticky Site Walk module chrome; the capture task itself needs an isolated shell.

6. **Assumption:** Pan failed because post-pinch `panRef` was cleared.  
   **Incomplete.** The more direct current issue is that panning is disabled whenever `markupEnabled` is true, and markup is true by default.

7. **Assumption:** Plan mobile crashes were caused by PDF centering before render.  
   **Incomplete.** Multiple PDF/render/viewport fixes landed, but crashes persist, indicating mobile memory/rendering architecture is likely the deeper issue.

## Current Code Facts for Reviewers

### Capture state and Save & Next flow

- `app/site-walk/(act-2-inputs)/capture/_components/CaptureClientIsland.tsx`
  - Holds `walkMode`, `currentLocation`, `returnToPlanAfterSave`, `markupOn`.
  - `markupOn` defaults to `true`.
  - `saveNextStop()` fire-and-forgets `flushCurrentDraft()`, updates location, then calls `captureNow()` unless returning to plan.
  - `captureNow()` sets `walkMode="camera"` and calls `requestCapture(input, "next_item")`.

- `components/site-walk/capture/CaptureDataBottomSheet.tsx`
  - Renders mobile fixed bottom sheet and desktop aside.
  - `handleSaveNextClick()` sets spinner, calls `onSaveNextStop()` through `Promise.resolve(...)`, collapses mobile sheet, clears spinner after 2 seconds.
  - Primary button is Save & Next only when `item` is truthy; otherwise it is an upload/capture button.

- `components/site-walk/capture/CaptureContext.tsx`
  - Stores `pendingCapture` in React state.
  - `requestCapture(input, source)` only sets state.

- `components/site-walk/capture/CameraViewfinder.tsx`
  - Watches `pendingCapture` in `useEffect`.
  - Calls the hidden input `.click()` from that effect, then calls `consumePendingCapture()`.
  - This may be too late for mobile user activation even without timeout.

### Desktop layout flow

- `app/site-walk/layout.tsx` always wraps Site Walk in `AuthedAppShell` and `SiteWalkShell`.
- `components/site-walk/SiteWalkShell.tsx` always renders `SiteWalkModuleNav` before `{children}`.
- `components/site-walk/SiteWalkModuleNav.tsx` uses `sticky top-0 z-30` and remains visible on `/site-walk/capture`.
- `CaptureClientIsland` tries to measure its top offset and set section height, but that still means capture is nested under module chrome.

### Photo pan/zoom flow

- `CaptureClientIsland` defaults `markupOn=true`.
- `VisualCaptureView` passes `markupEnabled={markupOn}` into `CameraViewfinder`/`PhotoMarkupCanvas`.
- `useMarkupCanvasState.processPointerMove()` only performs pan when `!markupEnabled`.
- Pinch zoom path runs with two pointers regardless of markup mode.
- This explains “zoom works, pan does not.”

### Plan mobile flow

- `PlanViewer` renders a fixed `PLAN_PDF_BASE_WIDTH` / `PLAN_PDF_BASE_HEIGHT` surface and transforms it with CSS.
- `PlanPdfPage` uses `react-pdf` with `width={PLAN_PDF_BASE_WIDTH}` and worker `/pdf.worker.min.js`.
- Multiple recent fixes addressed worker setup, PDF render callbacks, and centering. Persistent phone crashes now point toward mobile PDF rendering/memory or multi-touch/render interactions.

## Current File Size Risk

The project rule says no production `.ts/.tsx/.js` file over 300 lines. Current relevant line counts:

| File | Lines | Risk |
|---|---:|---|
| `components/site-walk/capture/CameraViewfinder.tsx` | 304 | Over limit; should be extracted before more edits. |
| `components/site-walk/capture/useMarkupCanvasState.ts` | 305 | Over limit; should be extracted before more edits. |
| `components/site-walk/capture/PlanViewer.tsx` | 282 | Near limit. |
| `app/site-walk/(act-2-inputs)/capture/_components/CaptureClientIsland.tsx` | 273 | Near limit. |
| `components/site-walk/capture/CaptureDataBottomSheet.tsx` | 269 | Near limit. |

This matters because the last two days of fixes concentrated complexity in files already at/near the project limit.

## Recommended Investigation Protocol Before Any More Fixes

1. **Freeze patches.** Do not modify the capture code again until the state machine is documented and instrumented.
2. **Create a capture state diagram.** Include states: `empty`, `file_picker_opening`, `pending_upload_preview`, `uploading`, `active_item_ready`, `draft_dirty`, `advancing_stop`, `opening_next_picker`, `plan_return`, `error`.
3. **Add visible debug state in development only.** Show active item id, pending capture source/input, pending upload status, save state, walk mode, and last native picker request timestamp.
4. **Prove mobile user activation.** Build a minimal test route with two buttons:
   - Button A directly calls `inputRef.current.click()` in the click handler.
   - Button B sets React state and an effect calls `input.click()`.
   Test on the same phone. If A works and B fails, the current architecture is confirmed invalid for Save & Next.
5. **Separate mobile and desktop capture shells.** Mobile can keep a bottom sheet; desktop should be a task-mode layout with no module nav and a stable right inspector.
6. **Separate navigation and markup modes.** Default mobile photo view to pan/zoom navigation mode; make drawing/markup an explicit selected tool.
7. **Replace mobile React-PDF plan rendering if crashes persist.** Use server-generated page images/tiles for phone plan mode.
8. **Run real-device smoke tests before declaring fixed.** Typecheck is not enough for this category of bug.

## External AI Prompt

Use the following prompt with Claude, ChatGPT, Gemini, or another code-review assistant:

```text
You are reviewing a Next.js 15 / React 19 / TypeScript app called Slate360. The failing module is Site Walk capture. The repository is bcvolker/slate360-rebuild. Current date: May 8, 2026. The user reports that after many commits, these issues still persist:

1. Mobile Save & Next in Quick Capture shows a spinner but does not advance to the next camera capture.
2. Desktop Site Walk capture layout still spills behind the top header and off the bottom of the screen.
3. On desktop, after uploading a picture, the partially obstructed orange button just opens File Explorer again.
4. Phone plan walks still crash.
5. Photo zoom works on phone, but panning does not.

Important architecture/code facts:

- Site Walk route layout: app/site-walk/layout.tsx wraps all pages in AuthedAppShell and SiteWalkShell.
- SiteWalkShell always renders SiteWalkModuleNav above children.
- SiteWalkModuleNav is sticky top-0 z-30 and remains visible on /site-walk/capture.
- Capture screen is app/site-walk/(act-2-inputs)/capture/_components/CaptureClientIsland.tsx.
- CaptureClientIsland holds walkMode, currentLocation, returnToPlanAfterSave, markupOn=true by default.
- CaptureClientIsland.saveNextStop(): remember carry-forward fields, fire-and-forget flushCurrentDraft(), update location label, return to plan if plan-pin flow, otherwise calls captureNow().
- captureNow(): setWalkMode("camera"), requestCapture(input, "next_item").
- requestCapture lives in components/site-walk/capture/CaptureContext.tsx and only sets React state pendingCapture.
- CameraViewfinder watches captureCtx.pendingCapture in useEffect and then calls hidden inputRef.current.click(), then consumePendingCapture().
- This means mobile Save & Next does not directly click the file input in the original button tap handler. It routes through React state/effect.
- CaptureDataBottomSheet renders Save & Next only if active item exists; if item is null it renders upload/capture primary action. Desktop repeated File Explorer likely means activeItem is null or the UI is on fallback upload action, not true Save & Next.
- CameraViewfinder desktop upload uses PendingUploadPreviewModal. User must Confirm & Attach before savePhoto creates/focuses an item.
- useCaptureItems receives optimistic item focus events and reconciles activeItem by id/client_item_id.
- VisualCaptureView passes markupEnabled={markupOn} into CameraViewfinder/PhotoMarkupCanvas; markupOn defaults true.
- useMarkupCanvasState.processPointerMove() only pans when !markupEnabled. Pinch zoom works regardless. This likely explains zoom works but pan does not.
- PlanViewer uses React-PDF through PlanPdfPage, fixed base width/height surface, CSS translate3d/scale, and render-success token gating. Recent fixes already addressed PDF worker, render token, centering, and fixed surface size; phone crashes persist, so suspect mobile PDF memory/rendering architecture.

Recent commits tried:

- 2026-05-06 7727894: introduced CaptureDataBottomSheet and hardened plan upload/capture UX.
- 2026-05-06 a0360f8 / 9b69a29 / 6837f63: render plan PDFs, bundle worker, stabilize PDFs/pin uploads.
- 2026-05-07 c297ace: introduced CaptureContext and grid layout, replacing window event bus with pendingCapture state/effect.
- 2026-05-07 13c0997: hardened device context and capture grid.
- 2026-05-07 0af3148: deferred plan centering until React-PDF render success.
- 2026-05-07 1f7ae8a: hardened Confirm & Attach failures and added capture trace logging.
- 2026-05-07 b7e82be: recovered core Site Walk UX flow.
- 2026-05-07 4629081 / f406eca / 0fbaeaf: mobile UX/drawer/GPU pivot fixes.
- 2026-05-08 cac863f: stabilized mobile plan capture flow with memoized PlanPdfPage/fixed 1200px surface/keyboard offset.
- 2026-05-08 9d7a9b8: fixed drawer pointer-down blur and forced camera mode before requestCapture.
- 2026-05-08 a80e5ef: tried desktop responsive split-pane and removed await before camera request.
- 2026-05-08 b52a7c8: changed CameraViewfinder from timeout click to synchronous effect click, made desktop aside, re-anchored panRef after pinch.

Despite those fixes, user says all problems persist.

Please analyze without assuming the last patch is correct. Focus on process-of-elimination and architecture. Specific questions:

1. Is routing native camera/file input through React state + useEffect invalid on mobile due to browser user-activation rules? If yes, what architecture should replace it?
2. Should /site-walk/capture hide SiteWalkModuleNav and use a dedicated task-mode layout instead of measuring height under sticky chrome?
3. Why would the desktop UI show an Upload/File Explorer button after the user thinks they uploaded a picture? Trace activeItem and PendingUploadPreviewModal Confirm & Attach.
4. Why does zoom work but pan not work? Evaluate markupOn default true and useMarkupCanvasState pan path.
5. Are phone plan crashes likely caused by React-PDF mobile memory/rendering despite previous worker/centering fixes? Would server-rendered plan page images/tiles be safer?
6. What minimal verification tests should be required before declaring the next fix successful?

Please return: root-cause ranking, concrete architecture recommendation, and a safe step-by-step remediation plan. Do not suggest another superficial patch unless it directly addresses the user-activation/state-machine/layout-shell issues.
```

## Bottom Line

The next fix should not be another tweak to spinner timing, drawer placement, or pointer cleanup. The critical path likely needs a small architectural reset:

- Direct same-handler native picker open for mobile Save & Next.
- Dedicated full-screen capture task route without Site Walk module nav.
- Explicit capture state machine.
- Separate pan/zoom navigation mode from markup mode.
- Mobile plan rendering that avoids React-PDF if crashes persist.
