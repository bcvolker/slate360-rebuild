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
   - 🔄 Keep narrowing `SlateDropClient` to layout/orchestration shell

3. **Slice C**
   - Extract Project Hub Tier-1 sections in `ClientPage.tsx`
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

## Current ETA Snapshot
- **Remaining window:** ~1–2 focused prompts, approximately 0.1–0.3 weeks at current pace.
- **Critical path:** BUG-018 DrawingManager migration + final SlateDrop/Dashboard decomposition slices.
