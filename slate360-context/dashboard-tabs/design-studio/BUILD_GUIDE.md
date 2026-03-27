# Design Studio — Build Guide

Last Updated: 2026-03-27
Status: Planning guide. All implementation steps not started.

Use this file as the working memory and safe-build guide for the Design Studio tab.
Read this before writing any code. Add research, UI requirements, and decisions before implementation starts.

---

## Purpose

Design Studio is Slate360's 3D and 2D workspace for architecture, BIM, and construction professionals.

Primary goal for MVP-lite:
- Upload 3D models and 2D PDFs
- View assets in a web 3D/2D viewer
- Annotate and mark up scenes
- Export screenshots and GLB artifacts
- Connect to SlateDrop and Project Hub

---

## Source Docs To Trust First

Read in this order when starting a new chat for Design Studio work:

1. `SLATE360_PROJECT_MEMORY.md`
2. `slate360-context/dashboard-tabs/design-studio/START_HERE.md`
3. `slate360-context/dashboard-tabs/design-studio/BUILD_GUIDE.md` (this file)
4. `slate360-context/dashboard-tabs/design-studio/IMPLEMENTATION_PLAN.md`

Reference-only unless needed:
- `slate360-context/dashboard-tabs/design-studio/raw-upload.txt`
- `slate360-context/APP_ECOSYSTEM_EXECUTION_PLAN.md`
- `slate360-context/ONGOING_ISSUES.md`

---

## Verified Current State

Verified from project code as of 2026-03-27:

- Dashboard route exists at `app/(dashboard)/design-studio/page.tsx` (~22 lines, server component)
- Shell exists at `components/dashboard/DesignStudioShell.tsx` (36 lines, "Under Development" placeholder)
- Marketing page exists at `app/features/design-studio/page.tsx`
- Entitlement gate: `getEntitlements(tier).canAccessDesignStudio` — Model+ tier (model, business, enterprise)
- Sidebar registration: `DashboardClient.tsx` tab id `"design-studio"`, icon Palette, color `#7C3AED`
- Shell accent: `#FF4D00`
- Shell status: `"under-development"` (already shows the "actively being built" message)
- QuickNav wiring: done
- System folder: `🎨 Design Studio` auto-provisioned in `lib/slatedrop/folderTree.ts`
- Content Studio has separate entitlement (`canAccessContent`, Creator+)

What does NOT exist yet:

- No database tables (`design_assets`, `design_scenes`, `annotations`, `review_pins`, `export_artifacts`)
- No API routes under `app/api/design-studio/`
- No viewer stack installed (Three.js, PDF.js, IFC.js not in package.json)
- No file processing pipeline or conversion queue
- No functional UI beyond the "Under Development" placeholder
- No export workflow

---

## MVP-Lite Definition

MVP-lite is intentionally scoped to the workflow that gets a user from file to reviewed output without requiring GPU infrastructure or advanced BIM tooling.

### Included in MVP-lite

1. Upload 3D models (GLB primary; OBJ, STL conversion to GLB via background job)
2. Upload 2D PDFs
3. Three.js viewer for 3D assets
4. PDF.js viewer for 2D PDFs
5. Viewer controls: orbit, pan, zoom, section planes (X/Y/Z)
6. Simple annotations: 3D marker pins, text labels, comments with author/date
7. Review mode: hide tools, show annotations, snapshot export
8. Screenshot export (PNG/JPEG)
9. GLB download of current asset
10. Attach scene snapshot to a Project Hub record
11. Simple/Advanced mode toggle (controls panel visibility)

### Deferred From MVP-lite

Do NOT include in the first implementation pass:

- IFC/BIM layer controls and category filtering
- Point cloud rendering
- 3D Print mode (STL slicer, infill controls, print queue)
- Thermal/flatness analysis overlays
- Multi-user real-time collaboration
- "Send to Virtual Studio" shortcut (add later)
- Parametric editing tools
- Model comparison / ghost overlay
- GPU worker for heavy mesh processing (use background async job for upload conversion only)

---

## Viewer Technology Decisions (Pre-Build Decision Required)

### 3D Viewer: Three.js

Rationale:
- Open source, widely documented, large community
- Supports GLB natively via GLTFLoader
- Works well in Next.js with dynamic imports
- Already referenced as the canonical choice in IMPLEMENTATION_PLAN.md and raw spec

Required implementation pattern:
- `import * as THREE from 'three'` with `dynamic(() => import(...), { ssr: false })`
- Encapsulate viewer in a single wrapper component with a narrow interface
- Expose only: `assetUrl`, `onReady`, `onSnapshot`, `annotations` as props
- GLTFLoader and OrbitControls loaded as Three.js add-ons

### 2D Viewer: PDF.js

Rationale:
- Standard choice for PDF rendering in browsers
- Renders page-by-page with canvas; easy to overlay annotations
- Free and maintained by Mozilla

### BIM: IFC.js (Deferred)

Keep IFC import support behind a separate upload mode. Do not include in MVP-lite.
Mark as "future extension" so the upload pipeline can accommodate IFC files without processing them initially.

---

## Proposed Data Model For MVP-Lite

Keep the first schema minimal and additive.

### `design_assets`

- `id`
- `org_id`
- `project_id` (nullable for MVP-lite)
- `created_by`
- `title`
- `file_type` (`glb` | `obj` | `stl` | `pdf` | `ifc`)
- `s3_key`
- `thumbnail_s3_key` (nullable)
- `conversion_status` (`pending` | `ready` | `failed`)
- `file_size_bytes`
- `created_at`
- `updated_at`

### `design_scenes`

- `id`
- `asset_id`
- `org_id`
- `title`
- `camera_state` (JSON: position, target, zoom)
- `created_at`
- `updated_at`

### `design_annotations`

- `id`
- `scene_id`
- `org_id`
- `created_by`
- `position` (JSON: x, y, z or page/x/y for 2D)
- `text`
- `status` (`open` | `resolved`)
- `created_at`
- `updated_at`

### `design_exports`

- `id`
- `scene_id`
- `org_id`
- `created_by`
- `format` (`png` | `glb`)
- `s3_key`
- `hub_record_id` (nullable — for Project Hub attachment)
- `created_at`

### Deferred Tables

Not required for MVP-lite:
- `review_pins` (more granular than annotations)
- `design_print_jobs`
- `design_analysis_reports`
- `design_collaborators`

---

## Proposed File Structure

Keep the module decomposed to avoid monolith creep.

```text
app/
  (dashboard)/design-studio/page.tsx          ← existing server entry
  api/design-studio/
    assets/route.ts                           ← list/create assets
    assets/[assetId]/route.ts                 ← get/update/delete asset
    assets/[assetId]/convert/route.ts         ← trigger/poll conversion
    scenes/route.ts                           ← list/create scenes
    scenes/[sceneId]/route.ts                 ← get/update scene
    scenes/[sceneId]/annotations/route.ts     ← CRUD annotations
    scenes/[sceneId]/export/route.ts          ← create export
    upload/route.ts                           ← presigned S3 upload

components/dashboard/design-studio/
  DesignStudioClient.tsx                      ← orchestrator (state + layout)
  DesignStudioToolbar.tsx                     ← top action bar
  DesignAssetLibrary.tsx                      ← left panel: asset list
  DesignCanvas.tsx                            ← center: viewer switcher (3D/2D)
  DesignThreeViewer.tsx                       ← Three.js 3D viewer wrapper
  DesignPdfViewer.tsx                         ← PDF.js 2D viewer wrapper
  DesignAnnotationLayer.tsx                   ← annotation pins overlay
  DesignInspectorPanel.tsx                    ← right panel: tools/info
  DesignUploadDropzone.tsx                    ← upload UI
  DesignExportPanel.tsx                       ← export controls
  DesignModeToggle.tsx                        ← Simple/Advanced toggle
  DesignEmptyState.tsx                        ← empty states

lib/types/
  design-studio.ts                            ← all Design Studio types

lib/design-studio/
  constants.ts                                ← modes, file types, defaults
  mappers.ts                                  ← DB row → typed object
  queries.ts                                  ← Supabase read helpers
  validators.ts                               ← upload/input validators

lib/hooks/
  useDesignAssets.ts                          ← asset list/upload state
  useDesignScene.ts                           ← active scene + camera state
  useDesignAnnotations.ts                     ← annotation CRUD
  useDesignUpload.ts                          ← S3 upload flow
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

### GitNexus Ground Rules

1. If impact shows a shared component needs modification, document why in a comment before editing.
2. If the result returns >5 files outside design-studio domain, escalate to the user before proceeding.
3. Never skip the impact check for "small changes." Most regressions in this repo came from small touching of shared files.
4. Run `mcp_gitnexus_detect_changes` at end of every prompt to confirm only design-studio domain changed.

---

## Cross-Tab Isolation Rules

### Hard Do-Not-Touch List

Do not edit these files unless a verified wiring requirement forces it:

| File | Why It Is Risky |
|---|---|
| `components/dashboard/DashboardClient.tsx` | 2,800+ lines; all-tab orchestrator |
| `components/slatedrop/SlateDropClient.tsx` | 2,030+ lines; shared state monolith |
| `components/project-hub/ClientPage.tsx` | 834 lines; project hub orchestration |
| `lib/entitlements.ts` | Breaks gating for all modules if wrong |
| `middleware.ts` | Auth middleware — breaks all protected routes |
| `lib/server/api-auth.ts` | Shared auth wrapper for all API routes |
| `lib/server/api-response.ts` | Shared response helpers for all API routes |
| `app/layout.tsx` | Root layout — breaks all pages |
| `components/dashboard/Sidebar.tsx` | Already wired — do not re-edit |
| `components/dashboard/QuickNav.tsx` | Already wired — do not re-edit |

### Explicit Wiring Points

The ONLY shared files Design Studio requires (already done — no further edits needed):

1. `DashboardClient.tsx` — tab entry `"design-studio"` already registered
2. `Sidebar.tsx` — wiring already done
3. `QuickNav.tsx` — wiring already done
4. `lib/entitlements.ts` — `canAccessDesignStudio` already added

### Integration Points With Other Tabs

Permitted integrations (read-only or write-to-well-defined endpoints only):

- **SlateDrop**: Design Studio may write export artifacts to the SlateDrop folder `🎨 Design Studio`. Use existing SlateDrop file infrastructure — do NOT modify SlateDrop client code.
- **Project Hub**: Expose a route/callback that allows attaching an export to a hub record by ID. Do NOT modify Project Hub client code.
- **Content Studio** (future): Design Studio may produce animation exports that Content Studio imports. Design those as S3 artifacts with metadata only — no direct component coupling.

### Isolated Domain Paths

All new code must live within these paths:

```
app/(dashboard)/design-studio/                ← existing server entry only
app/api/design-studio/                        ← all API routes
components/dashboard/design-studio/           ← all builder UI
lib/types/design-studio.ts                    ← all types
lib/design-studio/                            ← all business logic
lib/hooks/useDesign*.ts                       ← all hooks
```

---

## Intra-Module Safety Rules

### Component Discipline

- One component per file, one hook per file. No exceptions.
- Max 300 lines per file. At 250 lines, plan extraction before adding.
- `DesignStudioClient.tsx` is an orchestrator only. State and side effects live in hooks.
- Three.js viewer wrapper (`DesignThreeViewer.tsx`) exposes a narrow interface — no scene logic inside it.
- PDF.js viewer wrapper (`DesignPdfViewer.tsx`) is separate from the Three.js wrapper.
- Annotation layer is its own component — never embed annotation logic in the viewer wrappers.

### Viewer Loading Strategy

Three.js and PDF.js must be loaded with `dynamic(() => import(...), { ssr: false })`.

Reasons:
- These are browser-only libraries — SSR will break the build.
- Dynamic import with `{ ssr: false }` isolates them from the Next.js server rendering path.
- This is mandatory, not optional.

### Async / Upload Safety

- Launch conversion job → poll status → render only when `conversion_status === 'ready'`.
- Do not render loader state as "asset ready" — always re-fetch from server before showing the viewer.
- Presigned S3 URL upload must complete and be confirmed before writing the `design_assets` record.
- After any DB write that a subsequent read depends on, re-fetch — never trust local optimistic state.

### State And Data Flow Rules

- `useDesignAssets` manages asset list state — separate from scene state.
- `useDesignScene` manages the active scene, camera, and mode — separate from annotation state.
- `useDesignAnnotations` manages annotation CRUD — separate from scene state.
- Do not merge hooks. Each hook has one responsibility.
- Viewer selection (3D vs 2D) is derived from `asset.file_type` — not stored in a separate state field.

### Adding New Prompts Mid-Build

1. Re-read `BUILD_GUIDE.md` before starting.
2. Check `ops/bug-registry.json` and `ONGOING_ISSUES.md`.
3. Plan new file boundaries before writing code.
4. Do not expand existing hooks — add focused new hooks.
5. Update `START_HERE.md` and `BUILD_GUIDE.md` if the prompt sequence changes.

---

## Suggested Prompt Sequence

### Prompt 1 — Types + Schema + Migration Plan

Deliver:
- `lib/types/design-studio.ts`
- Supabase migration for `design_assets`, `design_scenes`, `design_annotations`, `design_exports`
- Additive and reversible schema only

Exit criteria: types compile, migration is additive and reversible.

### Prompt 2 — Upload API + S3 Flow

Deliver:
- Presigned upload route
- Asset create route
- S3 path convention for design assets (`design-studio/{org_id}/{assetId}/`)
- Basic conversion status stub (mark as `pending` on upload, `ready` after manual confirm for MVP)

Exit criteria: user can upload a GLB and have the asset record created.

### Prompt 3 — Asset Library + Three.js Viewer

Deliver:
- `DesignAssetLibrary.tsx` — asset list with clickable items
- `DesignThreeViewer.tsx` — Three.js GLB viewer with orbit/pan/zoom
- `DesignCanvas.tsx` — viewer switcher routing 3D vs 2D
- `useDesignAssets.ts` hook

Exit criteria: upload a GLB, select it, see it in Three.js viewer.

### Prompt 4 — PDF.js Viewer + Shell Layout

Deliver:
- `DesignPdfViewer.tsx` — PDF.js page viewer
- Full builder shell: top toolbar, left library, center canvas, right inspector
- Simple/Advanced mode toggle wiring

Exit criteria: browse assets, view GLB and PDF in correct viewers, toggle mode.

### Prompt 5 — Annotation System

Deliver:
- `DesignAnnotationLayer.tsx` — 3D pins + text overlay
- `useDesignAnnotations.ts` hook
- Annotation API routes (create/list/resolve)

Exit criteria: place a pin on a 3D model, add text, see it persist on reload.

### Prompt 6 — Export + Project Hub Attachment

Deliver:
- Screenshot export (PNG) from viewer
- GLB download
- Attach export to Project Hub record by ID
- `design_exports` table writes

Exit criteria: export a screenshot, attach it to a hub record.

### Prompt 7 — Review Mode + Stabilization

Deliver:
- Review mode: hide tools, show annotation list, fullscreen
- Empty states and error states
- Typecheck fixes

Exit criteria: end-to-end flow works from upload to review to export.

### Prompt 8 — Guardrails + Context Doc Update

Deliver:
- Smoke-test checklist
- Typecheck clean
- File size check
- Updated `START_HERE.md` build progress table
- Updated `BUILD_GUIDE.md`

---

## Pre-Build Checklist

Before implementation starts, decide:

1. Exact table names (`design_assets` or alternative)
2. S3 path convention for assets
3. Conversion pipeline depth: for MVP-lite, should OBJ/STL → GLB conversion be done synchronously on upload or deferred to a background job?
4. Whether scenes are project-bound from day one or can exist without project attachment
5. Three.js dynamic import pattern (confirm no SSR issues in current Next.js 15 config)
6. Project Hub attachment mechanism (how to reference a hub record from an export)
7. Which existing shared components to reuse for cards, panels, buttons, file upload UI

## Safe-Build Checklist For Every Prompt

### Before Writing Code

1. Read `SLATE360_PROJECT_MEMORY.md` latest handoff and this `BUILD_GUIDE.md` first.
2. Check `ops/bug-registry.json` and `ONGOING_ISSUES.md` if ANY shared behavior is touched.
3. Check line counts (`wc -l <file>`) before editing any existing file — extract if ≥250 lines.
4. Run `mcp_gitnexus_impact` on every shared file you plan to modify.
5. Confirm planned changes stay within the design-studio domain (or are on the explicit wiring list above).

### While Writing Code

6. New file created → immediately confirm it is imported in the consuming file.
7. New hook created → immediately confirm it is called in the component that needs it.
8. Three.js/PDF.js imports → confirm `dynamic(() => import(...), { ssr: false })` is used.
9. Async chain (upload → convert → fetch → display) → confirm each step is `await`ed sequentially.

### After Writing Code

10. Run `get_errors` on ALL changed files.
11. Run `npm run typecheck` when TypeScript behavior could be affected.
12. Run `mcp_gitnexus_detect_changes` — confirm only design-studio domain changed.
13. If any non-design-studio file changed, verify it is on the explicit wiring list.
14. Trace: asset uploaded → S3 confirmed → DB record created → re-fetched → displayed in viewer.
15. Run `bash scripts/check-file-size.sh` if you touched app code.
16. Update `SLATE360_PROJECT_MEMORY.md` session handoff.
17. Update `START_HERE.md` build progress table.
18. Update this `BUILD_GUIDE.md` if scope or sequence changed.

---

## Known Risks

### Risk 1: Viewer becomes a monolith

Mitigation:
- Three.js wrapper, PDF.js wrapper, annotation layer are three separate components.
- `DesignCanvas.tsx` routes between them; it does not contain viewer logic.

### Risk 2: Three.js SSR crashes the build

Mitigation:
- All viewer components must use `dynamic(() => import(...), { ssr: false })`.
- Test with `npm run build` after Prompt 3 before proceeding.

### Risk 3: Upload pipeline confuses design assets with SlateDrop files

Mitigation:
- Use a distinct S3 prefix: `design-studio/{org_id}/{assetId}/`.
- Write all records to `design_assets`, not to `slatedrop_uploads` or any shared file table.
- Design Studio upload route is under `app/api/design-studio/upload/` — separate from SlateDrop routes.

### Risk 4: Project Hub attachment causes shared code edits

Mitigation:
- Attachment is a write to `design_exports.hub_record_id` only.
- Project Hub reads design exports via its own API — Design Studio does not modify any Project Hub component.

### Risk 5: Heavy mesh rendering hurts non-design-studio users

Mitigation:
- Three.js is dynamically imported and only mounted when Design Studio is active.
- WebGL context is destroyed when the viewer unmounts.
- Test that switching away from Design Studio does not leave zombie WebGL contexts.

### Risk 6: Conversion job status creates a stale-read race

Mitigation:
- Poll conversion status server-side.
- Only render the viewer when `conversion_status === 'ready'` (re-fetched from DB, not from local state).

---

## Research Intake Template

Fill this section with external reference material before implementation starts.

### Reference Platforms

- Platform name:
- Link or screenshot source:
- What is worth copying:
- What should be avoided:

### UI Requirements

- Required mode tabs:
- Required viewer controls:
- Required annotation behavior:
- Panel layout constraints:
- Mobile expectations:

### Workflow Requirements

- Upload flow (drag-and-drop behavior):
- Asset lifecycle (draft → converted → viewed → exported):
- Annotation flow:
- Review flow:
- Export and attachment flow:

### Backend Decisions

- Table names (confirm or change):
- S3 path convention:
- Conversion pipeline for non-GLB files:
- Hub attachment mechanism:

### Viewer Decisions

- Three.js extras needed beyond GLTFLoader + OrbitControls:
- PDF.js page rendering approach (canvas per page vs virtual scroll):
- Annotation hit-testing approach (raycasting vs 2D overlay on canvas):

### Branding / White-Label Decisions

- Any Design Studio-specific color or accent beyond the global `#FF4D00`:
- Logo or watermark behavior on exports:

---

## Build Readiness Criteria

Start implementation only when these are decided:

1. MVP-lite scope is frozen
2. Viewer technology decisions are confirmed
3. Data model is approved
4. S3 path convention is approved
5. Conversion pipeline depth for MVP-lite is decided

---

## Definition Of Done For MVP-Lite

The first implementation is done when:

- A user can upload a GLB model and a PDF
- A user can view the model in Three.js with orbit/pan/zoom
- A user can view the PDF in PDF.js
- A user can place annotation pins on a 3D model
- A user can export a screenshot
- A user can attach an export to a Project Hub record
- A user can enter Review mode (tools hidden, annotations visible)
- The implementation stays modular — no file over 300 lines, no shared system regressions
- Types compile cleanly, `npm run typecheck` passes
