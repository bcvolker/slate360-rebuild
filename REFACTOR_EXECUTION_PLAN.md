# Slate360 Refactor Execution Plan (Living)

**Created:** 2026-03-04  
**Target Window:** 2–3 weeks (accelerated)  
**Current Estimate:** ~12–18 focused implementation prompts

## Goal
Stabilize core architecture so Slate360 is reliable for live testing and ready for rapid module buildout without recurring regression loops.

## Workstreams

### WS1 — Core Decomposition (High Priority)
- Split `SlateDropClient` into focused subcomponents/hooks
- Continue `DashboardClient` extraction into isolated hooks/view components
- Keep files under 300 lines where practical

### WS2 — Location Contract Unification (BUG-021)
- Use shared display component and shared normalization utility
- Standardize location label/lat-lng resolution across dashboard + Project Hub + wizard/map labels

### WS3 — Map Deprecation Removal (BUG-018)
- Remove Google DrawingManager dependency from `LocationMap.tsx`
- Implement native click-based drawing flows

### WS4 — Release Safety & Verification
- Keep `ops/*` registries in sync
- Run `typecheck` + release verification each step
- Treat CI as source of truth if local build exits with env-level code `143`

## Sprint-Style Sequence

1. **Slice A (in progress)**
   - ✅ `useSlateDropFiles` extracted
   - ✅ `useSlateDropUiState` extracted
   - ✅ Extracted `SlateDropContextMenu` into dedicated component
   - ✅ Added shared `resolveProjectLocation` helper and adopted in Project Hub + dashboard widgets API

2. **Slice B (in progress)**
   - ✅ Extracted SlateDrop action modals to `components/slatedrop/SlateDropActionModals.tsx`
   - ✅ Extracted SlateDrop share/preview modals to `components/slatedrop/SlateDropSharePreviewModals.tsx`
   - ✅ Extracted SlateDrop file grid/list/sandbox content surface to `components/slatedrop/SlateDropFileArea.tsx`
   - ✅ Extracted SlateDrop sidebar tree/storage/new-folder surface to `components/slatedrop/SlateDropSidebar.tsx`
   - ✅ Extracted SlateDrop top bar shell/user-menu surface to `components/slatedrop/SlateDropTopBar.tsx`
   - ✅ Extracted SlateDrop toolbar/breadcrumb/actions surface to `components/slatedrop/SlateDropToolbar.tsx`
   - ✅ Extracted SlateDrop pure helpers/tree utilities to `lib/slatedrop/client-utils.ts`
   - ✅ Extracted SlateDrop toast/upload-progress overlay to `components/slatedrop/SlateDropNotificationsOverlay.tsx`
   - ✅ Extracted SlateDrop transfer handlers hook to `lib/hooks/useSlateDropTransferActions.ts`
   - ✅ Extracted SlateDrop mutation handlers hook to `lib/hooks/useSlateDropMutationActions.ts`
   - ✅ Extracted SlateDrop interaction handlers hook to `lib/hooks/useSlateDropInteractionHandlers.ts`
   - ✅ Extracted SlateDrop upload pipeline hook to `lib/hooks/useSlateDropUploadActions.ts`
   - ✅ Extracted SlateDrop preview URL lifecycle hook to `lib/hooks/useSlateDropPreviewUrl.ts`
   - ✅ Optional shell polish: memoized upload/sidebar/subfolder/toolbar callbacks and derived banner/zip view state
   - ✅ Slice B complete for planned extraction scope

3. **Slice C (next)**
   - ✅ Extracted Project Hub Tier-1 portfolio/summary section, all-project carousel section, and delete confirmation modal from `ClientPage.tsx`
   - ✅ Extracted workspace tab strip/panel section + widget body renderer from `ClientPage.tsx`
   - ✅ Extracted remaining Tier-1 widget preference/drag orchestration seams into `lib/hooks/useProjectHubWidgets.ts`
   - ✅ `ClientPage.tsx` now below 300-line guardrail (249 lines)
   - ✅ Started Dashboard decomposition by extracting floating window orchestration to `lib/hooks/useDashboardFloatingWindows.ts`
   - ✅ Continued Dashboard decomposition by extracting widget preference/order/drag orchestration to `lib/hooks/useDashboardWidgetPrefs.ts`
   - ✅ Continued Dashboard decomposition by extracting widget grid and widget popout render shells to `components/dashboard/DashboardWidgetGrid.tsx` and `DashboardWidgetPopout.tsx`
   - ✅ Continued Dashboard decomposition by extracting `data-usage` and `processing` widget views to dedicated components
   - Continue DashboardClient decomposition

4. **Slice D**
   - Execute BUG-018 map migration in controlled sub-steps

## Risk/Reward
- **Reward:** Faster future fixes, lower regression risk, higher confidence for live test readiness
- **Primary Risk:** UI behavior drift during extraction
- **Mitigation:** Small slices, immediate typecheck, doc/registry sync, per-slice push

## Progress Log
- 2026-03-04: Plan file created; starting Slice A next step (context-menu extraction + location normalization helper).
- 2026-03-04: Completed context-menu extraction (`components/slatedrop/SlateDropContextMenu.tsx`) and location normalization helper (`lib/projects/location.ts`) with integrations in Project Hub card/map derivation and dashboard widgets data shaping.
- 2026-03-04: Completed modal extraction slice for new folder/rename/delete/move flows into `components/slatedrop/SlateDropActionModals.tsx`; `SlateDropClient` now delegates those UI blocks to extracted component.
- 2026-03-04: Completed share/preview modal extraction into `components/slatedrop/SlateDropSharePreviewModals.tsx`; `SlateDropClient` now delegates all modal surfaces except top-level shell orchestration.
- 2026-03-04: Completed file-area extraction into `components/slatedrop/SlateDropFileArea.tsx`; `SlateDropClient` now delegates subfolders/files grid/list/empty-state rendering.
- 2026-03-04: Completed sidebar extraction into `components/slatedrop/SlateDropSidebar.tsx`; `SlateDropClient` now delegates mobile overlay/sidebar storage/new-folder/tree rendering.
- 2026-03-04: Completed top-bar extraction into `components/slatedrop/SlateDropTopBar.tsx`; `SlateDropClient` now delegates the header/logo/nav/user-menu shell.
- 2026-03-04: Completed toolbar extraction into `components/slatedrop/SlateDropToolbar.tsx`; `SlateDropClient` now delegates breadcrumb/search/sort/view/upload/zip controls.
- 2026-03-04: Completed helper extraction into `lib/slatedrop/client-utils.ts`; `SlateDropClient` now imports shared formatting/icon/tree/path utilities and dropped duplicated inline helper blocks.
- 2026-03-04: Completed notifications overlay extraction into `components/slatedrop/SlateDropNotificationsOverlay.tsx`; `SlateDropClient` now delegates toast and upload-progress UI.
- 2026-03-04: Completed transfer-actions hook extraction into `lib/hooks/useSlateDropTransferActions.ts`; `SlateDropClient` now delegates download/zip/clipboard/secure-send handlers.
- 2026-03-04: Completed mutation-actions hook extraction into `lib/hooks/useSlateDropMutationActions.ts`; `SlateDropClient` now delegates create/rename/delete/move handlers for folders/files/projects.
- 2026-03-04: Completed interaction-handlers hook extraction into `lib/hooks/useSlateDropInteractionHandlers.ts`; `SlateDropClient` now delegates drag/drop/sort/select/context-menu/sign-out interaction callbacks.
- 2026-03-04: Completed upload-actions hook extraction into `lib/hooks/useSlateDropUploadActions.ts`; `SlateDropClient` now delegates the S3 upload reservation/PUT/finalize workflow.
- 2026-03-04: Completed preview-url hook extraction into `lib/hooks/useSlateDropPreviewUrl.ts`; `SlateDropClient` now delegates preview loading/error/url lifecycle.
- 2026-03-04: Completed optional Slice B polish on `SlateDropClient` render wiring (memoized callbacks/derived view state) to reduce inline JSX complexity before moving to Slice C.
- 2026-03-04: Started Slice C by extracting Tier-1 Project Hub sections from `app/(dashboard)/project-hub/ClientPage.tsx` into `components/project-hub/ProjectHubPortfolioOverview.tsx`, `ProjectHubAllProjectsTab.tsx`, and `ProjectHubDeleteModal.tsx`; reduced `ClientPage.tsx` from 817 → 541 lines.
- 2026-03-04: Continued Slice C by extracting workspace tabs/panels (`components/project-hub/ProjectHubWorkspaceTabs.tsx`) and widget body render logic (`components/project-hub/ProjectHubWidgetBody.tsx`); reduced `ClientPage.tsx` from 541 → 381 lines.
- 2026-03-04: Completed Slice C Project Hub decomposition target by extracting widget orchestration/data-loading logic into `lib/hooks/useProjectHubWidgets.ts`; reduced `ClientPage.tsx` from 381 → 249 lines.
- 2026-03-04: Started Dashboard decomposition tranche by extracting SlateDrop/window popout drag-resize state and handlers from `DashboardClient.tsx` into `lib/hooks/useDashboardFloatingWindows.ts`; reduced `DashboardClient.tsx` from 2640 → 2569 lines.
- 2026-03-04: Continued Dashboard decomposition tranche by extracting widget visibility/size/order persistence and drag-reorder handlers from `DashboardClient.tsx` into `lib/hooks/useDashboardWidgetPrefs.ts`; reduced `DashboardClient.tsx` from 2569 → 2501 lines.
- 2026-03-04: Continued Dashboard decomposition tranche by extracting widget-grid and widget-popout render shells from `DashboardClient.tsx` into `components/dashboard/DashboardWidgetGrid.tsx` and `DashboardWidgetPopout.tsx`; reduced `DashboardClient.tsx` from 2501 → 2455 lines.
- 2026-03-04: Continued Dashboard decomposition tranche by extracting `data-usage` and `processing` widget render cases into `components/dashboard/DashboardDataUsageWidget.tsx` and `DashboardProcessingWidget.tsx`; reduced `DashboardClient.tsx` from 2455 → 2380 lines.

## Current ETA Snapshot
- **Remaining window:** ~2–8 focused prompts, approximately 1–2 weeks at current pace.
- **Estimated remaining prompts:** ~2–8 to reach broad “code optimized” state across Dashboard decomposition + BUG-018 migration.
- **Critical path:** BUG-018 DrawingManager migration + final SlateDrop/Dashboard decomposition slices.

## New-Chat Continuation Protocol (Canonical Resume Block)

If a new chat starts, use this exact sequence and keep this file as source of truth.

### Prompt-by-Prompt Execution Map (next 8–19 prompts)

1. **Prompt 1–2: Slice C kickoff (Project Hub shell split)**
   - Extract first Tier-1 section(s) from `app/(dashboard)/project-hub/ClientPage.tsx` into dedicated components/hooks.
   - Run `get_errors` on touched files + typecheck.
   - Update context files + commit/push.

2. **Prompt 3–5: Continue Project Hub decomposition**
   - Extract remaining high-churn sections in `ClientPage.tsx` (filters/toolbar/list behaviors before low-risk static sections).
   - Keep each extracted file focused and <300 lines.
   - Validate + update docs + commit/push per slice.

3. **Prompt 6–10: Dashboard decomposition tranche**
   - Begin with the largest repeated render/handler clusters in `DashboardClient.tsx`.
   - Favor seam-first extraction (pure view blocks first, then handler hooks).
   - Validate + update docs + commit/push each completed seam.

4. **Prompt 11–15: BUG-018 migration tranche 1 (`LocationMap.tsx`)**
   - Remove `drawing` library dependency wiring.
   - Implement native click-based marker/polyline/polygon flows first.
   - Validate map interactions + typecheck; document behavior parity gaps if any remain.

5. **Prompt 16–19: BUG-018 migration tranche 2 + closure checks**
   - Finish rectangle/circle/arrow parity and cleanup.
   - Re-run release verification, update issue ledger/context docs, and log residual debt.

### Definition of “Refactor Complete” for this plan

This refactor window is considered complete when all are true:
- `SlateDropClient` remains an orchestration shell (already achieved in Slice B scope).
- `ClientPage.tsx` and `DashboardClient.tsx` each have their next planned extraction tranche completed and validated.
- BUG-018 no longer relies on `DrawingManager` / `drawing` library.
- Plan + context docs are updated so the next chat can resume from a single canonical state.

### What may still remain after the next 8–19 prompts

If execution stays within current scope, the **core refactor program should be functionally complete**. Remaining items would be post-refactor backlog, not blockers to call the refactor done:
- Secondary optimization passes (micro-cleanups, optional memoization, naming consistency).
- Non-refactor roadmap work (Phase 1+ feature expansion in `FUTURE_FEATURES.md`).
- Any unrelated tech-debt tasks outside Slice C / Dashboard decomposition / BUG-018.
