# Content Studio — Build Guide

Last Updated: 2026-03-27
Status: Planning guide. All implementation steps not started.

Use this file as the working memory and safe-build guide for the Content Studio tab.
Read this before writing any code. Add research, UI requirements, and decisions to the Research Intake Template before implementation starts.

---

## Purpose

Content Studio is Slate360's media editing workspace for creators, realtors, and construction professionals.

Primary goal for MVP-lite:
- Import video and photo clips
- Arrange clips on a multi-layer timeline
- Add text and logo overlays
- Trim clips and apply simple transitions
- Export to a preset (16:9 MP4, social presets)
- Autosave timeline state

Design analogy: CapCut-level video editing inside the Slate360 dashboard, purpose-built for construction reels, property walkthroughs, and project milestone content.

---

## Source Docs To Trust First

Read in this order when starting a new chat for Content Studio work:

1. `SLATE360_PROJECT_MEMORY.md`
2. `slate360-context/dashboard-tabs/content-studio/START_HERE.md`
3. `slate360-context/dashboard-tabs/content-studio/BUILD_GUIDE.md` (this file)
4. `slate360-context/dashboard-tabs/content-studio/IMPLEMENTATION_PLAN.md`

Reference-only unless needed:
- `slate360-context/dashboard-tabs/content-studio/raw-upload.txt` (detailed spec with full feature list)
- `slate360-context/APP_ECOSYSTEM_EXECUTION_PLAN.md`
- `slate360-context/ONGOING_ISSUES.md`

---

## Verified Current State

Verified from project code as of 2026-03-27:

- Dashboard route: `app/(dashboard)/content-studio/page.tsx` (~22 lines, server component)
- Shell: `components/dashboard/ContentStudioShell.tsx` (36 lines, "Coming Soon" placeholder)
- Entitlement gate: `getEntitlements(tier).canAccessContent` — Creator+ (creator, model, business, enterprise)
- Sidebar registration: `DashboardClient.tsx` tab id `"content-studio"`, icon Layers, color `#EC4899`
- Shell accent: `#FF4D00`
- Shell status: `"coming-soon"`
- QuickNav wiring: done
- `TabWireframe.tsx`: content-studio renders "Create and manage visual content, renderings, and marketing assets."

What does NOT exist yet:
- No database tables (`content_projects`, `content_clips`, `content_timelines`, `render_jobs`, etc.)
- No API routes under `app/api/content-studio/`
- No timeline library installed (Remotion, Fabric.js, FFmpeg wasm not in package.json)
- No file processing pipeline or render queue wiring
- No functional UI beyond "Coming Soon" placeholder

---

## MVP-Lite Definition

MVP-lite is narrowed to a single usable workflow: import clips → arrange timeline → add overlay → export.

AI enhancements, 360 keyframe paths, audio waveform editing, and the LUT marketplace are real features from the spec — but they all depend on a working timeline first. Do not attempt them in the first build.

### Included in MVP-lite

1. Drag-and-drop clip import (video MP4, photo JPEG/PNG)
2. Multi-layer timeline: video track + overlay track + audio track
3. Magnetic snap clips to timeline positions
4. Trim clips (in/out points)
5. Add text overlay with position, size, opacity (Fabric.js)
6. Add PNG logo overlay with position preset, scale, opacity (Fabric.js)
7. Basic transitions: cut, fade
8. Preview playback in canvas
9. Export to 16:9 MP4 preset via FFmpeg wasm (client-side for MVP-lite)
10. Autosave timeline state to localStorage + S3 snapshot every 10s
11. Render job status tracking (queued → rendering → done/failed)

### Deferred From MVP-lite

Do NOT include in the first implementation pass:

- AI auto-cut (Whisper timestamp detection)
- Upscaling (Real-ESRGAN wasm)
- Timelapse interpolation (OpenCV)
- 360 keyframe path editing (Pannellum + Remotion)
- LUT marketplace and log color de-bayer
- Audio waveform editor
- FreeSound music library integration
- Batch social export (parallel queue)
- Speed ramp curve presets beyond simple slow/fast
- Clip analytics embed tracking
- Lambda FFmpeg for server-side rendering (use wasm for MVP-lite; add Lambda in a later prompt)
- Import from Tour Builder or Design Studio (add after those modules are built)
- Voiceover recording + beat match sync

---

## Tech Stack For MVP-Lite

Install only what is needed for the first build:

| Library | Purpose | Notes |
|---|---|---|
| `remotion` | Timeline structure, keyframing, sequence primitives | Lightweight use for timeline state/render orchestration |
| `fabric` | Canvas text/logo overlay with drag/resize/opacity | Version 5.3 — confirm compat with React 19 |
| `react-dropzone` | Clip import drag-and-drop | Already used in SlateDrop — reuse pattern, do NOT import SlateDropClient |
| `@ffmpeg/ffmpeg` | Client-side trim/export for MVP-lite | Lazy-load; confirm memory limits for clips <100MB |
| `@upstash/redis` | Render job queue | Already configured in project |
| `zustand` | Timeline state persistence | Already in project |

Do NOT install in MVP-lite:
- `@google/generative-ai` — AI features deferred
- `opencv.js` — AI/analysis features deferred
- `pannellum-react` — 360 path editing deferred
- `whisper-js` — auto-cut deferred

---

## Proposed Data Model For MVP-Lite

Keep the first schema small and additive.

### `content_projects`

- `id`
- `org_id`
- `project_id` (nullable for MVP-lite)
- `created_by`
- `title`
- `thumbnail_s3_key` (nullable)
- `status` (`draft` | `exported`)
- `aspect_ratio` (`16:9` | `9:16` | `1:1`)
- `created_at`
- `updated_at`

### `content_clips`

- `id`
- `project_id`
- `org_id`
- `type` (`video` | `photo` | `audio`)
- `s3_key`
- `thumbnail_s3_key` (nullable)
- `duration_ms` (nullable for photos)
- `file_name`
- `file_size_bytes`
- `created_at`

### `content_timeline_items`

- `id`
- `project_id`
- `clip_id`
- `track_index` (integer: 0 = video, 1 = overlay, 2 = audio)
- `start_ms`
- `end_ms`
- `clip_start_ms` (in-point trim)
- `clip_end_ms` (out-point trim)
- `effects` (JSON: opacity, zoom, transition)
- `keyframes` (JSON array, nullable for MVP-lite)
- `sort_order`
- `created_at`
- `updated_at`

### `render_jobs`

- `id`
- `project_id`
- `org_id`
- `created_by`
- `preset` (`16:9` | `social-vertical` | `social-square`)
- `status` (`queued` | `rendering` | `done` | `failed`)
- `output_s3_key` (nullable)
- `error_message` (nullable)
- `created_at`
- `updated_at`

### `content_overlays`

- `id`
- `project_id`
- `type` (`text` | `logo`)
- `start_ms`
- `end_ms`
- `canvas_state` (JSON: Fabric.js object state)
- `created_at`
- `updated_at`

### Deferred Tables

Not required for MVP-lite:
- `content_luts`
- `content_audio_tracks`
- `content_analytics_events`
- `content_collaborators`
- `content_presets` (user-saved export bundles)

---

## Proposed File Structure

```text
app/
  (dashboard)/content-studio/page.tsx         ← existing server entry
  api/content-studio/
    projects/route.ts                          ← list/create projects
    projects/[projectId]/route.ts              ← get/update/delete project
    projects/[projectId]/timeline/route.ts     ← save/load timeline state
    clips/upload/route.ts                      ← presigned S3 upload
    clips/route.ts                             ← list/delete clips
    render/route.ts                            ← create render job
    render/[jobId]/route.ts                    ← poll job status / cancel

components/dashboard/content-studio/
  ContentStudioClient.tsx                      ← orchestrator (layout + state)
  ContentStudioToolbar.tsx                     ← top bar: play, export, save
  ContentClipLibrary.tsx                       ← left panel: project clips
  ContentCanvas.tsx                            ← center: playback preview + overlay
  ContentFabricLayer.tsx                       ← Fabric.js overlay canvas
  ContentTimeline.tsx                          ← bottom: multi-track timeline
  ContentTimelineTrack.tsx                     ← individual track row
  ContentTimelineClip.tsx                      ← individual clip in timeline
  ContentInspectorPanel.tsx                    ← right: clip settings/effects
  ContentExportPanel.tsx                       ← export preset selection + render queue
  ContentUploadDropzone.tsx                    ← drag-and-drop import
  ContentOverlayControls.tsx                   ← text/logo overlay UI
  ContentEmptyState.tsx                        ← empty states

lib/types/
  content-studio.ts                            ← all Content Studio types

lib/content-studio/
  constants.ts                                 ← presets, track config, defaults
  mappers.ts                                   ← DB row → typed object
  queries.ts                                   ← Supabase read helpers
  validators.ts                                ← upload/timeline validators
  autosave.ts                                  ← autosave logic (10s interval, S3 snapshot)

lib/hooks/
  useContentProject.ts                         ← active project state
  useContentClips.ts                           ← clip library state/upload
  useContentTimeline.ts                        ← timeline items CRUD + autosave
  useContentOverlays.ts                        ← Fabric.js overlay state
  useContentRender.ts                          ← render job submission/polling
```

---

## GitNexus Impact Analysis Protocol

Run GitNexus before touching any shared file.

### When To Run

Always run an impact check when:
- Modifying anything in `lib/` (types, hooks, queries)
- Adding a new entry to DashboardClient or shared navigation
- Changing any shared export or provider
- Touching auth/entitlements/org context chains

### How To Use

Start of any prompt that could touch shared files:
```
mcp_gitnexus_impact — file: <path to the file you plan to edit>
```

End of every session:
```
mcp_gitnexus_detect_changes
```

To find who uses a symbol:
```
mcp_gitnexus_query — what imports or uses <SymbolName>
```

Before a large multi-file change:
```
mcp_gitnexus_context
```

### GitNexus Ground Rules

1. If impact shows a shared component needs modification, document why in a comment before editing.
2. If the impact result returns >5 files outside the content-studio domain, escalate to the user before proceeding.
3. Never skip the impact check for "small changes."
4. Run `mcp_gitnexus_detect_changes` at end of every prompt to confirm only content-studio domain changed.

---

## Cross-Tab Isolation Rules

### Hard Do-Not-Touch List

Do not edit these files unless a verified wiring requirement forces it:

| File | Why It Is Risky |
|---|---|
| `components/dashboard/DashboardClient.tsx` | 2,800+ lines; all-tab orchestrator |
| `components/slatedrop/SlateDropClient.tsx` | 2,030+ lines; contains react-dropzone patterns — read but never modify |
| `components/project-hub/ClientPage.tsx` | 834 lines; project hub orchestration |
| `lib/entitlements.ts` | Breaks gating for all modules |
| `middleware.ts` | Auth middleware — breaks all protected routes |
| `lib/server/api-auth.ts` | Shared auth wrapper |
| `lib/server/api-response.ts` | Shared response helpers |
| `app/layout.tsx` | Root layout |
| `components/dashboard/Sidebar.tsx` | Already wired — do not re-edit |
| `components/dashboard/QuickNav.tsx` | Already wired — do not re-edit |

### SlateDrop Pattern Borrowing Rule

Content Studio uses `react-dropzone` — the same library as SlateDrop. The correct approach:
- Read `components/slatedrop/SlateDropClient.tsx` as a reference for dropzone patterns.
- Do NOT import from it or modify it.
- Create a new `ContentUploadDropzone.tsx` component from scratch using the same patterns.

### Explicit Wiring Points

The ONLY shared files Content Studio requires (all already done):
1. `DashboardClient.tsx` — tab `"content-studio"` already registered
2. `Sidebar.tsx` — already wired
3. `QuickNav.tsx` — already wired
4. `lib/entitlements.ts` — `canAccessContent` already added

### Integration Points With Other Tabs

Permitted integrations (read-only from other tabs — write only to well-defined endpoints):
- **SlateDrop**: Content Studio may read SlateDrop file list to allow importing clips from SlateDrop folders. Use the existing SlateDrop query API — do NOT modify SlateDrop client code.
- **Project Hub**: Exported videos may be attached to hub records (same pattern as Design Studio exports — write `hub_record_id` to render job record only).
- **Tour Builder** (future): After Tour Builder ships, Content Studio can import 360 panorama sequences as keyframed clips. Design the import as a pull-from-S3 operation, not a direct component dependency.
- **Design Studio** (future): Design Studio may produce animation exports that Content Studio imports as clips. Same S3 artifact pull pattern.

### Isolated Domain Paths

All new code must live within these paths:

```
app/(dashboard)/content-studio/               ← existing server entry only
app/api/content-studio/                       ← all API routes
components/dashboard/content-studio/          ← all builder UI
lib/types/content-studio.ts                   ← all types
lib/content-studio/                           ← all business logic
lib/hooks/useContent*.ts                      ← all hooks
```

---

## Intra-Module Safety Rules

### Component Discipline

- One component per file, one hook per file. No exceptions.
- Max 300 lines per file. At 250 lines, plan extraction before adding.
- `ContentStudioClient.tsx` is an orchestrator only — state and side effects live in hooks.
- `ContentFabricLayer.tsx` (Fabric.js canvas) must be dynamically imported with `{ ssr: false }`.
- FFmpeg wasm must be dynamically imported and lazy-loaded — do NOT put it in the module-level import.
- `ContentTimeline.tsx` is a layout component only. Clip drag/drop logic lives in `useContentTimeline.ts`.
- `ContentCanvas.tsx` handles playback preview only — it does not contain Fabric.js overlay logic.

### FFmpeg Wasm Safety Rules

- FFmpeg wasm loads ~31MB — only load it on demand (when user triggers export).
- Clip size limit for FFmpeg wasm: enforce <100MB per clip, queue larger clips as server jobs.
- Do not use FFmpeg wasm for any operation that can be done with HTML5 `<video>` trim.
- Always show progress indicator during FFmpeg operations — never block the UI silently.
- FFmpeg operations run in a web worker or shared worker — do NOT run them on the main thread.

### Autosave Safety Rules

- Autosave writes to `localStorage` first (immediate), then to S3 snapshot (10s debounce).
- S3 snapshot is fire-and-forget with a toast notification on failure.
- On project load, always fetch from DB first — localStorage is a recovery fallback only.
- If S3 snapshot fails 3 times in a row, show a persistent "Autosave failed" banner.

### State And Data Flow Rules

- `useContentProject` manages the active project metadata — separate from clip and timeline state.
- `useContentClips` manages the clip library (uploaded clips) — separate from timeline state.
- `useContentTimeline` manages timeline items (what's on the tracks) — the most complex hook; keep it focused.
- `useContentOverlays` manages Fabric.js overlay objects — separate from timeline items.
- `useContentRender` manages job submission and status polling — never inline render logic in UI components.
- Do not merge hooks. Each hook has one responsibility.

### Adding New Prompts Mid-Build

1. Re-read `BUILD_GUIDE.md` before starting.
2. Check `ops/bug-registry.json` and `ONGOING_ISSUES.md`.
3. Plan new file boundaries before writing code.
4. Do not expand existing hooks — add new focused ones.
5. Update `START_HERE.md` and `BUILD_GUIDE.md` if the prompt sequence changes.

---

## Suggested Prompt Sequence

### Prompt 1 — Types + Schema + Migration Plan

Deliver:
- `lib/types/content-studio.ts`
- Supabase migrations for `content_projects`, `content_clips`, `content_timeline_items`, `render_jobs`, `content_overlays`
- Additive and reversible schema only

Exit criteria: types compile, migration can be run and rolled back.

### Prompt 2 — Upload Pipeline For Clips

Deliver:
- Presigned S3 upload route for video/photo clips
- `content_clips` record creation
- S3 path convention: `content-studio/{org_id}/{projectId}/{clipId}/`
- Basic upload progress tracking

Exit criteria: user can upload a video clip and see it appear in the clip library.

### Prompt 3 — Project State + Timeline Shell

Deliver:
- `useContentProject.ts` hook
- `useContentTimeline.ts` hook (basic timeline item CRUD)
- Timeline save/load API route
- Autosave (localStorage + S3 snapshot)

Exit criteria: create a project, save timeline state, reload and see it restored.

### Prompt 4 — Builder Shell Layout + Clip Library

Deliver:
- `ContentStudioClient.tsx` orchestrator (replace placeholder shell)
- `ContentClipLibrary.tsx` left panel
- `ContentTimeline.tsx` bottom timeline with tracks
- `ContentTimelineClip.tsx` draggable clip component
- Empty states

Exit criteria: clips appear in the library, can be dragged to the timeline.

### Prompt 5 — Canvas Preview + Fabric.js Overlay

Deliver:
- `ContentCanvas.tsx` playback preview (HTML5 video)
- `ContentFabricLayer.tsx` Fabric.js overlay (text + logo)
- `useContentOverlays.ts` hook
- `ContentOverlayControls.tsx` right panel controls

Exit criteria: add text/logo overlay on a clip, see it in canvas preview.

### Prompt 6 — Trim + Transitions + FFmpeg Export

Deliver:
- Trim controls (in/out point on timeline clip)
- Fade transition between clips
- FFmpeg wasm export for 16:9 MP4 preset
- `useContentRender.ts` hook
- `ContentExportPanel.tsx`
- Render job status polling

Exit criteria: trim a clip, add a fade, export an MP4.

### Prompt 7 — Toolbar + Social Presets

Deliver:
- `ContentStudioToolbar.tsx` (play, stop, export, save)
- Export preset options (16:9, 9:16, 1:1)
- Progress indicator during render
- Error states

Exit criteria: select a social preset and export successfully.

### Prompt 8 — Stabilization + Guardrails

Deliver:
- Typecheck fixes
- Empty/error states for all panels
- Smoke-test checklist
- `START_HERE.md` build progress update
- `BUILD_GUIDE.md` update
- `SLATE360_PROJECT_MEMORY.md` handoff

Exit criteria: end-to-end flow import → trim → overlay → export works reliably.

---

## Pre-Build Checklist

Before implementation starts, decide:

1. Exact table names (`content_projects` or alternatives)
2. S3 path convention for clips and snapshots
3. FFmpeg wasm vs Lambda for MVP-lite export (wasm is simpler but has 100MB clip limit)
4. Whether projects are project-hub bound from day one or independent
5. Autosave: localStorage only vs S3 snapshot for MVP-lite
6. Remotion: timeline orchestration only vs full server-side Remotion render (Remotion SSR adds complexity — confirm scope)
7. Fabric.js React compat: confirm integration pattern for React 19 + Next.js 15 App Router
8. Which existing shared components to reuse for panels, buttons, file upload UI

---

## Safe-Build Checklist For Every Prompt

### Before Writing Code

1. Read `SLATE360_PROJECT_MEMORY.md` latest handoff and this `BUILD_GUIDE.md` first.
2. Check `ops/bug-registry.json` and `ONGOING_ISSUES.md` if ANY shared behavior is touched.
3. Check line counts (`wc -l <file>`) before editing any existing file — extract if ≥250 lines.
4. Run `mcp_gitnexus_impact` on every shared file you plan to modify.
5. Confirm planned changes stay within content-studio domain (or are on the explicit wiring list).

### While Writing Code

6. New file created → immediately confirm it is imported in the consuming file.
7. New hook created → immediately confirm it is called in the component that needs it.
8. FFmpeg wasm and Fabric.js → confirm they are dynamically imported with `{ ssr: false }`.
9. Async chain (upload → DB write → timeline restore → render → poll) → confirm each step is `await`ed.
10. FFmpeg web worker usage → confirm it does NOT run on the main thread.

### After Writing Code

11. Run `get_errors` on ALL changed files.
12. Run `npm run typecheck` when TypeScript behavior could be affected.
13. Run `mcp_gitnexus_detect_changes` — confirm only content-studio domain changed.
14. If any non-content-studio file changed, verify it is on the explicit wiring list.
15. Trace: clip uploaded → S3 confirmed → DB record created → re-fetched → appears in clip library.
16. Trace: timeline saved → autosave fires → reload → timeline state restored from DB.
17. Run `bash scripts/check-file-size.sh` if you touched app code.
18. Update `SLATE360_PROJECT_MEMORY.md` session handoff.
19. Update `START_HERE.md` build progress table.
20. Update this `BUILD_GUIDE.md` if scope or sequence changed.

---

## Known Risks

### Risk 1: Timeline becomes a monolith

Mitigation:
- `ContentTimeline.tsx` = layout only.
- `ContentTimelineTrack.tsx` = single-track layout.
- `ContentTimelineClip.tsx` = single-clip in a track.
- `useContentTimeline.ts` = all data operations.
- Never put drag logic or FFmpeg calls in the layout components.

### Risk 2: FFmpeg wasm causes SSR build crash

Mitigation:
- FFmpeg wasm is browser-only. Must be loaded with `dynamic(() => import(...), { ssr: false })` OR in a `useEffect`.
- Test `npm run build` after Prompt 6 before proceeding.

### Risk 3: Fabric.js conflicts with React 19

Mitigation:
- Fabric.js uses direct canvas DOM manipulation. Wrap it in a single `ContentFabricLayer.tsx` ref-based component.
- Never let Fabric.js state leak into React state. Keep a Fabric.js canvas instance in a ref only.
- Confirm Fabric.js 5.3 compat with React 19 before installing. If there are issues, downgrade to 5.2.4 or evaluate `fabric@6.x` (beta).

### Risk 4: Autosave creates race condition with server reads

Mitigation:
- Autosave writes to localStorage immediately (synchronous, safe).
- S3 snapshot is debounced and async.
- On project load: always fetch from DB (server truth). localStorage is recovery-only.
- If localStorage and DB state conflict on load, prefer DB state and discard localStorage silently.

### Risk 5: react-dropzone pattern copied from SlateDropClient causes tight coupling

Mitigation:
- Do NOT import from SlateDropClient.
- Create `ContentUploadDropzone.tsx` from scratch. Read SlateDropClient as a reference pattern only.
- Use `react-dropzone` directly in the new component following the same configuration pattern.

### Risk 6: Remotion server-side render adds too much complexity for MVP-lite

Mitigation:
- For MVP-lite, use FFmpeg wasm (client-side) to compose and export.
- Use Remotion for timeline state representation and keyframe math only.
- Defer Remotion SSR rendering (Lambda) to a later prompt after the basic pipeline works.
- If Remotion adds too much overhead even for state representation, Zustand + custom timeline math is an acceptable substitute.

### Risk 7: FFmpeg wasm 100MB clip limit

Mitigation:
- Enforce <100MB per clip on the upload route (return 413 with a clear message if exceeded).
- Show a UI hint: "For clips over 100MB, use server-side export (coming soon)."
- Log the clip size at upload time for future Lambda routing logic.

---

## Research Intake Template

Fill this section with external reference material before implementation starts.

### Reference Platforms

- Platform name:
- Link or screenshot source:
- What is worth copying:
- What should be avoided:

### UI Requirements

- Required timeline controls:
- Required overlay controls:
- Canvas/preview behavior:
- Panel layout constraints:
- Mobile behavior (MVP: trim/upload only, no timeline):

### Workflow Requirements

- Import flow (drag-and-drop behavior):
- Clip arrangement and trim flow:
- Overlay add/edit flow:
- Export flow (preset selection → render → download):
- Autosave and recovery flow:

### Backend Decisions

- Table names (confirm or change):
- S3 path convention:
- FFmpeg wasm vs Lambda for MVP-lite:
- Render job queue depth (Upstash vs simple DB polling):

### Remotion Decisions

- Timeline state structure (Composition, Sequence, Series):
- Whether Remotion is used for server-side render in MVP-lite or deferred:

### Audio Decisions

- Basic volume/fade controls: needed in MVP-lite or deferred?
- Music library (FreeSound): MVP-lite or deferred?

### Branding / Overlay Decisions

- Text overlay presets (font, size, color options for MVP-lite):
- Logo overlay source (from SlateDrop folder or dedicated upload):
- Position presets for logo (same 4-corner system as Tour Builder):

---

## Build Readiness Criteria

Start implementation only when these are decided:

1. MVP-lite scope is frozen
2. FFmpeg wasm vs Lambda decision is made for first export
3. Remotion scope for MVP-lite is confirmed
4. Data model is approved
5. S3 path convention is approved
6. Fabric.js React 19 compat is confirmed

---

## Definition Of Done For MVP-Lite

The first implementation is done when:

- A user can import video and photo clips via drag-and-drop
- A user can arrange clips on a multi-layer timeline
- A user can trim clips (in/out points)
- A user can add a text overlay and a PNG logo overlay
- A user can export an MP4 to a 16:9 preset
- The render job has observable status (queued/rendering/done/failed)
- Timeline autosaves and restores correctly on reload
- The implementation stays modular — no file over 300 lines, no shared system regressions
- Types compile cleanly, `npm run typecheck` passes
