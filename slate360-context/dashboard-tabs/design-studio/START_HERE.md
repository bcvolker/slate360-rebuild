# Design Studio — Start Here

Last Updated: 2026-03-22
Use this file first for any Design Studio task. Only open the longer docs if this file does not answer the question.

## What Matters First

- Route: `/(dashboard)/design-studio`
- Gate: `getEntitlements(tier).canAccessDesignStudio` (Model+ tier: model, business, enterprise)
- Page entry: `app/(dashboard)/design-studio/page.tsx` (~22 lines, server component)
- Shell: `components/dashboard/DesignStudioShell.tsx` (~37 lines, "Under Development" placeholder)
- Sidebar registration: `components/dashboard/DashboardClient.tsx` (Palette icon, filtered by `ent.canAccessDesignStudio`)
- QuickNav: `components/shared/QuickNav.tsx`
- System folder: `lib/slatedrop/folderTree.ts` (🎨 "Design Studio" folder auto-provisioned)
- Feature page: `app/features/design-studio/page.tsx` (marketing, live)

## Current Status — Scaffolded Only

- Route + shell + entitlement gate: **done**
- Sidebar + QuickNav wiring: **done**
- System folder provisioning: **done**
- API routes: **none** (no `app/api/design-studio/`)
- Database tables: **none** (no `design_assets`, `design_scenes`, `annotations`, etc.)
- Viewer stack: **not chosen** (candidates: Three.js for 3D, PDF.js for 2D, IFC.js for BIM)
- File processing pipeline: **none** (no queue for model/PDF conversion)
- Functional UI: **none** (shell shows placeholder only)

## Build Prerequisites

Before any implementation:
1. **Choose viewer stack** — Three.js + PDF.js baseline, IFC optional
2. **Create database tables** — `design_assets`, `design_scenes`, `annotations`, `review_pins`, `export_artifacts`
3. **Create API routes** — upload, workspace state save/load, export
4. **Decide file storage strategy** — reuse `slatedrop_uploads` with origin metadata vs. new bucket path

## MVP Scope (from IMPLEMENTATION_PLAN.md)

1. Shell layout: top actions, left library, center canvas, right inspector
2. File ingest + viewer (2D PDF + 3D model)
3. Annotation/review + export to SlateDrop
4. Mode presets: upload, model, review, print, analysis

## Data Contracts (planned)

```typescript
interface DesignAsset { id: string; projectId: string; fileName: string; fileType: string; s3Key: string; ... }
interface DesignScene { id: string; assetId: string; cameraState: object; annotations: Annotation[]; ... }
interface Annotation { id: string; sceneId: string; position: [number, number, number]; text: string; author: string; ... }
interface ReviewPin { id: string; sceneId: string; status: 'open' | 'resolved'; ... }
interface ExportArtifact { id: string; sceneId: string; format: string; s3Key: string; ... }
```

## Customization Requirements (mandatory per CUSTOMIZATION_SYSTEM.md)

- Resizable left/right panels
- Movable toolbar groups
- Expandable libraries and inspector sections
- Mode presets with per-user custom layouts
- Persisted presets: `simple`, `standard`, `advanced`, `custom`

## Dependencies

- Three.js / PDF.js / optional IFC.js (must be chosen before build)
- GPU worker for heavy asset conversion (see `GPU_WORKER_DEPLOYMENT.md`)
- SlateDrop for artifact export integration

## What's Missing for Multi-Chat Build

This tab is buildable across multiple chats with this START_HERE + IMPLEMENTATION_PLAN. Each chat should:
1. Read this file first
2. Check the "Build Progress" section below
3. Work on the next incomplete step
4. Update "Build Progress" before session end

## Build Progress

| Step | Description | Status |
|------|-------------|--------|
| 1 | Viewer stack decision | ⬜ Not started |
| 2 | Database tables + migration | ⬜ Not started |
| 3 | API routes (upload, save/load, export) | ⬜ Not started |
| 4 | Shell layout (panels, toolbar, canvas) | ⬜ Not started |
| 5 | File ingest + 2D viewer (PDF.js) | ⬜ Not started |
| 6 | File ingest + 3D viewer (Three.js) | ⬜ Not started |
| 7 | Annotation/review system | ⬜ Not started |
| 8 | Export to SlateDrop | ⬜ Not started |
| 9 | Mode presets + customization persistence | ⬜ Not started |
| 10 | Server-side entitlement enforcement | ⬜ Not started |

## Definition of Done

- User can ingest files, view 2D/3D, annotate, review, and export
- Workspace layout customizations persist and restore
- Tier gate enforced both client-side (sidebar filter) and server-side (route check)
- No file over 300 lines; one component per file
- All types in `lib/types/`
