# Slate360 — Concurrent Development Tracks

**Created:** 2026-05-15
**Status:** ACTIVE — Read before any implementation session
**Repo:** bcvolker/slate360-rebuild

> Both tracks must read `SLATE360_PROJECT_MEMORY.md` before starting any session.
> Both tracks must report touched files and confirm they did not touch the other track's owned files at session end.

---

## Overview

Two AI development tracks are active simultaneously on the Slate360 repo. This document defines ownership boundaries, forbidden cross-track edits, branch strategy, and current state so the two chats do not overwrite each other.

---

## Track A — Slate360 AppShell + Site Walk UI System

**Branch:** `main` (current production branch)
**Active as of:** 2026-05-15

### Owned Areas

| Area | Key Files / Paths |
|---|---|
| Global Slate360 AppShell | `components/dashboard/AppShell.tsx`, `components/dashboard/MobileTopBar.tsx`, `components/dashboard/MobileBottomNav.tsx` |
| AppShell visual migration (Graphite Glass + restrained amber) | All files in `components/dashboard/` for visual/nav changes |
| Site Walk V1 Home | `components/site-walk/SiteWalkHomeClient.tsx`, `components/site-walk/v1/views/HomeView.tsx` |
| Site Walk V1 shell primitives | `components/site-walk/v1/` (all files) |
| Site Walk Worksites, Deliverables, SlateDrop, Coordination views | `components/site-walk/v1/views/` |
| Site Walk capture idle screen (V1 replacement) | `components/site-walk/capture/CameraViewfinder.tsx` (idle branch only) |
| Site Walk capture shell visual wrapper | `components/site-walk/capture/VisualCaptureView.tsx`, `components/site-walk/capture/CaptureDataBottomSheet.tsx` |
| Site Walk Plan Walk V1 shell | `app/site-walk/(act-2-inputs)/capture/_components/CaptureClientIsland.tsx`, `SharedCaptureTaskHeader.tsx`, `CaptureShell.tsx` |
| Shared V1 UI primitives | `components/ui/`, `components/shared/` (visual/design-system changes) |
| App-wide navigation styling | MobileTopBar, MobileBottomNav, Sidebar, AppShell chrome |
| Visual consistency across all Slate360 apps | Any file touched for design-system alignment |
| Site Walk Home page | `app/site-walk/page.tsx`, `app/site-walk/layout.tsx` |
| Site Walk sub-route layouts | `app/site-walk/(act-1-setup)/layout.tsx`, `(act-2-inputs)/layout.tsx`, `(act-3-outputs)/layout.tsx` |

### Track A Forbidden Zones (do NOT touch)

- Digital Twin routes, components, APIs, or workers
- `app/(apps)/ceo/` digital twin viewer or upload routes  
- Any Trigger.dev task related to drone/GPU processing
- Supabase tables or migrations for `drone_jobs`, `digital_twin_*`, or GPU worker tables
- `lib/twin/`, `components/twin/`, `app/api/twin/` (if created by Track B)
- Multipart upload endpoints for large drone files

---

## Track B — Slate360 Twin / Digital Twin Lite

**Branch:** `feature/digital-twin-lite` (separate branch — do NOT work on `main`)
**Status:** Not yet started as of 2026-05-15

### Owned Areas

| Area | Key Files / Paths |
|---|---|
| Digital Twin app (CEO-gated) | `app/(apps)/ceo/twin/` (to be created) |
| Digital Twin components | `components/twin/` (to be created) |
| Digital Twin APIs | `app/api/twin/` (to be created) |
| Drone processing Trigger.dev jobs | `src/trigger/twin-*.ts` (to be created) |
| Multipart upload for large drone files | `app/api/twin/upload/` (to be created) |
| Digital Twin viewers | `components/twin/TwinViewer.tsx` (to be created) |
| Digital Twin share routes | `app/share/twin/` (to be created) |
| GPU worker integration | worker scripts and env config |
| Digital Twin database tables | Supabase migrations for twin-specific tables |

### Track B Forbidden Zones (do NOT touch)

- **Site Walk UI** — `components/site-walk/`, `app/site-walk/`
- **Site Walk capture** — `components/site-walk/capture/`, `app/site-walk/(act-2-inputs)/capture/`
- **Site Walk Plan Viewer** — `components/site-walk/capture/PlanViewer*.tsx`, `PlanViewerLeaflet.tsx`, any plan pin logic
- **Global AppShell styling** — `components/dashboard/AppShell.tsx`, MobileTopBar, MobileBottomNav (Track B may **request** integration but must not edit shared shell files directly)
- Existing SlateDrop upload flows not related to drone/twin multipart
- `lib/entitlements.ts` — do not add digital twin tiers without Track A review
- `app/site-walk/` (any file)
- `middleware.ts` routing rules without joint approval

### Track B Integration Protocol (AppShell)

When Track B needs a new navigation link or app-shell integration (e.g. "Digital Twin" in the CEO-gated apps launcher):
1. Document the requested change in `docs/CONCURRENT_DEVELOPMENT_TRACKS.md` under "Pending AppShell Integration Requests."
2. Track A applies the AppShell change on `main`.
3. Track B merges `main` into `feature/digital-twin-lite` before continuing.

---

## Branch Strategy

| Track | Branch | Push Rule |
|---|---|---|
| Track A | `main` | Normal PR or direct push per repo git rules |
| Track B | `feature/digital-twin-lite` | Branch from `main`; PR to merge back |

**Merge discipline:**
- Track B must rebase or merge `main` regularly to stay current with AppShell changes.
- Track B must NOT merge `feature/digital-twin-lite` into `main` without owner approval.
- Track A must NOT push changes that break the `feature/digital-twin-lite` branch without notifying Track B context.

---

## Current State (as of 2026-05-15)

### Track A — Completed

| Item | Status |
|---|---|
| V1 Home production swap (`/site-walk`) | ✅ Live on `main` (commit `99f3fa5`) |
| SiteWalkHomeClient + 5 view files | ✅ Created |
| Quick Walk creates session → enters capture | ✅ Working (navigates to `/site-walk/capture?session=<id>&quick=camera`) |
| AppShell fullBleed for `/site-walk` home | ✅ Fixed — MobileTopBar/BottomNav suppressed |
| Architecture guard: hub types moved to `lib/types/site-walk.ts` | ✅ Fixed |
| Shared CaptureShell (SharedCaptureTaskHeader, CaptureDataBottomSheet tabs) | ✅ On `main` |
| Act 2 screen-zone ownership correction | ✅ On `main` |

### Track A — Pending

| Item | Priority |
|---|---|
| Quick Walk capture idle screen: replace "Capture field proof" with V1 prompt | High |
| Global Slate360 AppShell V1 design migration (Graphite Glass + amber) | High |
| Site Walk capture review shell (V1 redesign) | Medium |
| Plan Walk viewer V1 shell | Medium |
| Stop Strip navigation | Medium |
| Worksites list page V1 route | Medium |
| Walk detail / session page V1 | Medium |
| Before/After guided recapture | Low |
| Physical iPhone device testing | Blocking for ship |

### Track B — Pending (not started)

- Digital Twin Lite: drone upload → processing → viewer → share flow
- CEO-gated app entry in app launcher
- GPU worker integration

---

## Audit / Cross-Track Safety Check (required at session end)

Both tracks must append the following to each session handoff in `SLATE360_PROJECT_MEMORY.md`:

```
### Cross-Track Safety Check
- Track: [A or B]
- Branch: [branch name]
- Files touched: [list]
- Did NOT touch: [confirm the other track's forbidden zones]
```

---

## Pending AppShell Integration Requests

_Track B will add integration requests here. Track A resolves them._

| Requested By | What | Status |
|---|---|---|
| _(none yet)_ | — | — |

---

## Quick Reference: Who Owns What

| File / Area | Owner |
|---|---|
| `components/dashboard/AppShell.tsx` | Track A |
| `components/dashboard/MobileTopBar.tsx` | Track A |
| `components/dashboard/MobileBottomNav.tsx` | Track A |
| `components/site-walk/**` | Track A |
| `app/site-walk/**` | Track A |
| `components/site-walk/capture/PlanViewer*.tsx` | Track A (do not disturb) |
| `components/site-walk/capture/PlanViewerLeaflet.tsx` | Track A (do not disturb) |
| `components/twin/**` (to be created) | Track B |
| `app/(apps)/ceo/twin/**` (to be created) | Track B |
| `app/api/twin/**` (to be created) | Track B |
| `src/trigger/twin-*.ts` (to be created) | Track B |
| `lib/entitlements.ts` | Joint (no unilateral changes) |
| `middleware.ts` | Joint (no unilateral changes) |
| `supabase/migrations/` | Joint (coordinate; no schema changes without the owning track's approval) |
