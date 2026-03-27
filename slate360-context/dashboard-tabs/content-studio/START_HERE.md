# Content Studio — Start Here

Last Updated: 2026-03-27
Use this file first for any Content Studio task. Only open the longer docs if this file doesn't answer the question.

---

## What Matters First

- Route: `/(dashboard)/content-studio`
- Gate: `getEntitlements(tier).canAccessContent` — Creator+ (creator, model, business, enterprise)
- Page entry: `app/(dashboard)/content-studio/page.tsx` (~22 lines, server component)
- Shell: `components/dashboard/ContentStudioShell.tsx` (36 lines, "Coming Soon" placeholder)
- Sidebar registration: `DashboardClient.tsx` (Layers icon, filtered by `ent.canAccessContent`, color `#EC4899`)
- QuickNav: `components/shared/QuickNav.tsx`
- Marketing page: `app/features/content-studio/page.tsx` (if it exists)

---

## Current Status — Scaffolded Only

- Route + shell + entitlement gate: **done**
- Sidebar + QuickNav wiring: **done**
- API routes: **none** (no `app/api/content-studio/`)
- Database tables: **none** (no `content_projects`, `timeline_clips`, `render_jobs`, etc.)
- Timeline/viewer library: **not installed** (Remotion, Fabric.js, FFmpeg wasm not in package.json)
- File processing pipeline: **none**
- Functional UI: **none** (shell shows "Coming Soon" only)

---

## Build Prerequisites

Before any implementation:

1. **Confirm MVP-lite scope** — timeline editing with drag/trim/export only; AI features deferred
2. **Choose render approach** — Lambda FFmpeg for server-side rendering vs local wasm for MVP-lite
3. **Create database tables** — `content_projects`, `content_clips`, `content_timelines`, `render_jobs`
4. **Install core packages** — Remotion, Fabric.js, react-dropzone, FFmpeg wasm (phase 1 only)
5. **Decide file storage strategy** — use existing S3 bucket with `content-studio/{org_id}/` prefix

---

## MVP Scope (from IMPLEMENTATION_PLAN.md and raw spec)

1. Import video/photo clips via drag-and-drop
2. Timeline: multi-layer clips, magnetic snap, trim
3. Add text overlay and PNG logo overlay (Fabric.js canvas)
4. Basic transitions (fade, cut)
5. Export to preset (16:9 MP4, social presets)
6. Autosave timeline state every 10 seconds

---

## Data Contracts (planned)

```typescript
interface ContentProject { id: string; orgId: string; title: string; status: 'draft' | 'exported'; }
interface ContentClip { id: string; projectId: string; type: 'video' | 'photo' | 'audio'; s3Key: string; duration: number; }
interface TimelineItem { id: string; clipId: string; trackIndex: number; startMs: number; endMs: number; effects: object; }
interface RenderJob { id: string; projectId: string; preset: string; status: 'queued' | 'rendering' | 'done' | 'failed'; outputS3Key: string | null; }
```

---

## Tech Stack For MVP-Lite

| Library | Purpose | Version |
|---|---|---|
| Remotion 4.0 | Timeline keyframing and server-side export | 4.0.0 |
| Fabric.js 5.3 | Canvas text/logo overlay, drag-and-drop element placement | 5.3.0 |
| react-dropzone | Clip import drag-and-drop | 14.2.3 |
| FFmpeg wasm | Client-side trim/ramp/transitions for MVP-lite; Lambda for production | 0.12.10 |
| Upstash (Redis) | Render job queue | existing config |

AI features (upscaling, auto-cut, Whisper, LUT marketplace) are **deferred** from MVP-lite.
360 keyframe path editing is **deferred** from MVP-lite.

---

## Build Progress

| Step | Description | Status |
|------|-------------|--------|
| 1 | Types + Schema + Migration | ⬜ Not started |
| 2 | Upload pipeline for clips | ⬜ Not started |
| 3 | Timeline state (Remotion/Zustand) | ⬜ Not started |
| 4 | Builder shell layout | ⬜ Not started |
| 5 | Clip library + drag to timeline | ⬜ Not started |
| 6 | Text + logo overlay (Fabric.js) | ⬜ Not started |
| 7 | Export preset + render queue | ⬜ Not started |
| 8 | Autosave + stabilization | ⬜ Not started |

---

## Definition of Done

- User can import clips, trim, add text/logo, and export an MP4
- Render job is observable (progress/cancel)
- Timeline autosaves every 10s
- No file over 300 lines; one component per file
- All types in `lib/types/content-studio.ts`
- Types compile, `npm run typecheck` passes

---

## What's Next

Read `slate360-context/dashboard-tabs/content-studio/BUILD_GUIDE.md` for the full implementation strategy, GitNexus protocol, cross-tab isolation rules, and prompt sequence.
