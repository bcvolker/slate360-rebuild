# Site Walk Capture V2 — Build Readiness Report

**Last updated:** 2026-05-21 (Composer audit vs. Gemini 12-prompt playbook)  
**Remote project:** `hadnfcenpcfaeclczsmm`

## Executive summary

| Track | Readiness | Notes |
|-------|-----------|--------|
| **Your core loop (hub → capture → save → review → edit)** | **~70% on V1 today** | Works with `NEXT_PUBLIC_CAPTURE_V2=false` (default) |
| **Code preflight (types, routes, APIs, launch URLs)** | **~98%** | Prompt 0 assets verified |
| **Remote DB (Phase 1 + 2 + nearby RPC)** | **100%** | All 7 schema checks PASS (live probe) |
| **Capture V2 UI (`app/site-walk/capture-v2`)** | **0%** | Blocker for flipping the V2 flag |
| **Post-MVP (Ghost UI, maps scene, LiveKit, App Store polish)** | **0%** | Prompts 6–11; defer after MVP |
| **Deliverables page (your phase 2)** | **API exists; UI deferred** | Per your plan |

### Bottom line

**You can start building Capture V2 now.** Database and API foundations are in place. Do **not** set `NEXT_PUBLIC_CAPTURE_V2=true` until Prompt 1 creates `/site-walk/capture-v2` routes — otherwise every Quick Walk / Start Walk link 404s.

**For immediate PWA testing** while V2 is built: keep the flag `false` and exercise the existing V1 capture shell at `/site-walk/capture` plus walk review at `/site-walk/walks/[sessionId]`.

Verify anytime:

```bash
node scripts/ops/verify-capture-v2-schema.mjs
node scripts/ops/preflight-capture-v2-code.mjs
npm run typecheck
```

---

## Remote schema verification (live probe — 2026-05-21)

```
[PASS] site_walk_items.deleted_at
[PASS] site_walk_items.retry_count
[PASS] site_walk_sessions.capture_v2_version
[PASS] site_walk_deliverables.async_job_status
[PASS] site_walk_scene_contexts table
[PASS] site_walk_copilot_sessions table
[PASS] get_nearby_photos RPC (6-arg + soft-delete)
```

Apply migrations if a future environment fails:

```bash
node scripts/ops/run-capture-v2-migrations.mjs
```

**Authority:** use files under `supabase/migrations/` only — never embedded SQL from external plan docs.

---

## Gemini plan assessment

The 12-prompt playbook is **directionally correct** and aligns with repo conventions, but needs these corrections before copy-paste implementation:

| Topic | Gemini says | Repo reality / fix |
|-------|-------------|-------------------|
| **Session provider (Prompt 1)** | `components/site-walk/SiteWalkSessionProvider.tsx` | Correct for **offline queue + sync pill**. V1 capture uses a **different** lightweight provider at `app/site-walk/(act-2-inputs)/capture/_components/SiteWalkSessionProvider.tsx` (exit modal only). V2 should use the **components/** provider outermost, then `CaptureProvider`, then shell. |
| **Save pipeline** | Implied in Prompt 2 | Must wire `CaptureProvider` + `useCaptureItems` + `capture-draft-save.ts` — same as V1. Do not reimplement POST logic. |
| **Prompt 7 deliverables loader** | “progress loader bar” | **Conflict with AGENTS.md** — use honest blocking “Compiling…” UI; no fake 0–100% unless tied to real `async_job_progress`. |
| **Prompt 0 schema** | “7 checks PASS” | Was stale in an earlier draft; **now PASS** on remote. |
| **Realtime desktop co-pilot** | “under 100ms” | Aspirational; Supabase Realtime exists in `components/site-walk/SiteWalkSessionProvider` but V1 capture path does not mount it. Treat as Phase 2 (Prompt 11). |
| **Walk portal / LiveKit** | Prompts 10–11 | **No routes** under `app/walk-portal/` or `app/api/site-walk/co-pilot/`. Optional env vars in `.env.example` only. |
| **App Store support route** | `app/site-walk/support/page.tsx` | **Does not exist** — Prompt 8 must create it. |
| **V2 visual layout** | Rebuild UX | `capture-v2-rules.md` forbids reusing **broken** old layouts; **must** reuse hooks (`useCaptureItems`, `useCaptureFileHandler`, `PhotoMarkupCanvas`, etc.). |

---

## What is complete (ready for V2 UI build)

### App shell & navigation

- Site Walk V1 hub (`SiteWalkHomeClient`) with Quick Walk, Worksites, walk list
- Platform app shell opens Site Walk from `/app`
- `buildCaptureLaunchUrl` / `buildWalkResumeUrl` / `buildCaptureSummaryUrl` flag-gated in `lib/site-walk/capture-v2-config.ts`
- Full-bleed shell policy: `isSiteWalkCaptureV2Path` in `AppShell`, `MobileBottomNav` prefix match
- Mobile route policy: capture-v2 **not** quarantined on mobile

### Session & walk lifecycle

- POST `/api/site-walk/sessions` — Quick Walk (no project) and project walks from setup
- Walk list `/site-walk/walks` — active vs completed
- Walk review `/site-walk/walks/[sessionId]` — scroll stops, tap to edit (routes to capture with `item` query)
- `SessionExitModal` + end-walk flow in V1 capture header

### V1 capture (production fallback — use until V2 ships)

- `/site-walk/capture` server loader + `CaptureNoSsrBoundary` + `CaptureShell`
- Camera / file upload, markup, bottom sheet, plan canvas (`PlanViewer` / Leaflet path)
- `useCaptureItems` — idempotent `client_item_id` / `client_mutation_id`, offline queue via `offline-capture.ts`
- Pins API: `/api/site-walk/pins`, `/api/site-walk/pins/[id]` + `pin-mutations.ts`

### API & data (V2-ready)

- `excludeDeletedSiteWalkItems` on all major item read/write routes
- `/api/site-walk/nearby` — GPS RPC + scoped fallback
- `/api/site-walk/items/timeline` — Ghost Mode history feed
- `/api/projects/[projectId]/site-walk/assignees` — real assignee dropdown data
- Deliverables API tree under `/api/site-walk/deliverables/*` (defer UI)

### Capture V2 scaffolding (no UI yet)

- `components/capture-v2/types.ts`, `layers.ts`, `index.ts`
- `lib/utils/trigger-haptic.ts`
- Ops: `verify-capture-v2-schema.mjs`, `run-capture-v2-migrations.mjs`, `preflight-capture-v2-code.mjs`

### Validation

- `npm run typecheck` — passes

---

## Gaps (cannot close without implementation)

| Gap | Owner | Prompt |
|-----|-------|--------|
| **`app/site-walk/capture-v2/**` pages & components** | Composer build | 1–7 |
| **Enable `NEXT_PUBLIC_CAPTURE_V2=true`** | Human, after Prompt 1+7 | — |
| **V2-specific UX:** PiP keyboard, filmstrip, desktop split, Ghost overlay UI | Composer | 3–6 |
| **`/site-walk/capture-v2/summary`** with assignees + cinematic preview | Composer | 7 |
| **Co-Pilot / walk-portal / LiveKit** | Composer / infra | 10–11 |
| **`LocationSceneSetter` + polygon_boundaries** | Composer | 9 |
| **App Store:** hide Coming Soon, account deletion, support page | Composer + human | 8 |
| **Capacitor native wrapper, reviewer account** | Human | parallel |
| **Deliverables product UI** | You (explicitly deferred) | post-MVP |

---

## Ideal build plan (Composer recommendation)

### Phase A — Prove core loop on device (optional, 1–2 days)

With `NEXT_PUBLIC_CAPTURE_V2=false`:

1. PWA: `/app` → Site Walk → Quick Walk → capture → Save
2. Complete walk → `/site-walk/walks` → open completed → review → tap stop → edit
3. Project walk with plan from `/site-walk/setup`
4. Airplane-mode capture → confirm no duplicate rows on sync (V1 offline path)

This validates backend + V1 before investing in V2 chrome.

### Phase B — MVP Capture V2 (Prompts 0–7)

One Composer session per prompt. After **each**:

```bash
npm run typecheck && npm run build
```

Then one mobility checklist item on a physical phone.

**Order:** 0 → 1 → 2 → 3 → 4 → 5 → 2+3 retest keyboard → 6 → 7 → flip `NEXT_PUBLIC_CAPTURE_V2=true` → full checklist.

### Phase C — Post-MVP

Prompts 8–11 only after offline + plan pin + summary assignee tests pass.

### Phase D — Your deliverables & other app shells

Separate track; APIs already exist.

---

## Corrected prompt sequence (handoff to Gemini / Composer)

### Prompt 0 — Preflight (read-only)

```bash
node scripts/ops/verify-capture-v2-schema.mjs
node scripts/ops/preflight-capture-v2-code.mjs
npm run typecheck
```

Do not build UI. Return status table.

### Prompt 1 — Shell (critical path)

Create:

- `app/site-walk/capture-v2/layout.tsx` — `fixed inset-0 z-50`, no platform bottom nav
- `app/site-walk/capture-v2/page.tsx` — copy server session loader from `capture/page.tsx`; `CaptureNoSsrBoundary` import from act-2 capture (do not duplicate)
- Provider stack: `components/site-walk/SiteWalkSessionProvider` → `CaptureProvider` → `CaptureV2Shell`
- Header: extend `SharedCaptureTaskHeader`; sync pill from `useSiteWalkOfflineSync`
- Mobile: `CaptureV2Orchestrator` phases `hub|viewfinder|drawer|plan|summary`
- Desktop: 60/40 split placeholder
- End Walk → `SessionExitModal` → `buildCaptureSummaryUrl(sessionId)`

### Prompt 2 — Action hub + viewfinder + fast track

Reuse: `useCaptureFileHandler`, `PhotoMarkupCanvas`, `UnifiedVectorToolbar`, `PhotoAngleStrip`, `capture-draft-save.ts`, `triggerHapticSuccess`.

### Prompt 3 — LogEntryDrawer + visualViewport + PiP

Reuse: `CaptureDataBottomSheet` field logic; `CAPTURE_V2_SMART_CHIPS` from `types.ts`.

### Prompt 4 — Filmstrip + multi-angle + idempotent offline

Reuse: `photo-angles.ts`, `offline-capture.ts`, `useSiteWalkOfflineSync`.

### Prompt 5 — Plan Leaflet + pin edit mode

Dynamic import `PlanViewerLeaflet`; `PlanToolbar`; crosshair drop; `pin-mutations.ts` PATCH only.

### Prompt 6 — Ghost Mode UI

Wire to `/api/site-walk/nearby` + `/api/site-walk/items/timeline`; set `before_item_id` on save.

### Prompt 7 — Summary page

`app/site-walk/capture-v2/summary/page.tsx`; assignees API; honest compile modal (no fake progress).

### Prompts 8–11 — Defer

App Store quarantine, maps scene, LiveKit co-pilot.

---

## Mobility checklist (after each Prompt 1–7 slice)

With `NEXT_PUBLIC_CAPTURE_V2=true` on device:

1. [ ] Virtual keyboard + PiP + Save & Next visible  
2. [ ] Swipe-down gesture lock while typing in drawer  
3. [ ] Plan pin edit → single PATCH, no duplicate rows  
4. [ ] Ghost mode GPS denied → project/session/plan fallback  
5. [ ] Airplane mode capture → sync pill → no duplicate rows on reconnect  
6. [ ] (Post-MVP) Co-pilot vector sync  

---

## Flag safety

| `NEXT_PUBLIC_CAPTURE_V2` | Capture URL | Summary URL |
|--------------------------|-------------|-------------|
| `false` (default) | `/site-walk/capture` | `/site-walk/walks/[id]` |
| `true` | `/site-walk/capture-v2` | `/site-walk/capture-v2/summary` |

**Rule:** Only enable `true` after Prompt 1 (capture route) and Prompt 7 (summary route) exist.

---

## Files changed in readiness pass

- `docs/CAPTURE_V2_BUILD_READINESS.md` — this report  
- `scripts/ops/preflight-capture-v2-code.mjs` — Prompt 0 automation  
