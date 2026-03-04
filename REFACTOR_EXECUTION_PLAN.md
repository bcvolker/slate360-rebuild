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

## Current ETA Snapshot
- **Remaining window:** ~8–13 focused prompts, approximately 1.25–2.25 weeks at current pace.
- **Critical path:** BUG-018 DrawingManager migration + final SlateDrop/Dashboard decomposition slices.
