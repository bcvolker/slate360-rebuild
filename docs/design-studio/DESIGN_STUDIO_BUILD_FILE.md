# Design Studio — Build File

Last Updated: 2026-04-13
Module Status: **Active — early scaffolding, marked Coming Soon on marketing**

## Purpose

Design Studio lets users upload, view, annotate, and share 3D models (GLB/glTF) with clients. It's intended for the Studio Bundle alongside Content Studio.

## Current Real Implementation State

### What Works (Real)
- Model list view (`ModelListClient.tsx` — 130 lines)
- Model editor with 3D viewer (`ModelEditorClient.tsx` — 232 lines)
- Model settings panel (`ModelSettingsPanel.tsx` — 55 lines)
- Shell wrapper (`DesignStudioShell.tsx` — 57 lines)
- CRUD queries (`lib/design-studio/queries.ts` — 189 lines)
- 5 API routes for models + files
- 2 database tables with migrations
- Homepage panorama demo uses `ModelViewerClient.tsx` for 3D preview

### What Is Partial
- File upload flow (API exists at `/models/[modelId]/files` and `/files/complete`)
- 3D model rendering (component exists but depth of Three.js/Babylon integration unclear)

### What Is Missing
- Annotation/markup tools (listed in marketing, not implemented)
- Material/texture editing
- Measurement overlays
- Version history
- Client-shareable model links (no share/external-link infrastructure)
- **Page gate checks `canAccessDesignStudio` (tier-level boolean, always true for ALL tiers including trial) — effectively ungated (P0)**

## Routes / Pages

| Route | File | Purpose |
|-------|------|---------|
| `/design-studio` | `app/(apps)/design-studio/page.tsx` | App entry |

## API Routes (5 endpoints)

| Endpoint | Purpose |
|----------|---------|
| `GET/POST /api/design-studio/models` | List/create models |
| `GET/PUT/DELETE /api/design-studio/models/[modelId]` | Model CRUD |
| `GET/POST /api/design-studio/models/[modelId]/files` | List/upload files |
| `DELETE /api/design-studio/models/[modelId]/files/[fileId]` | Delete file |
| `POST /api/design-studio/models/[modelId]/files/complete` | Mark upload complete |

## Database Tables

| Table | Migration | Purpose |
|-------|-----------|---------|
| `design_models` | `20260412000011` | Model metadata |
| `design_model_files` | `20260412000011` | Uploaded model files |

## Key Components (4 files + queries, 694 lines total)

| Component | Lines | Purpose |
|-----------|-------|---------|
| `ModelEditorClient.tsx` | 232 | 3D model editor |
| `lib/design-studio/queries.ts` | 189 | DB queries |
| `ModelListClient.tsx` | 130 | Model list |
| `DesignStudioShell.tsx` | 57 | Shell wrapper |
| `ModelSettingsPanel.tsx` | 55 | Settings |

## Type Definitions

- `lib/types/design-studio.ts` (31 lines) — minimal model + file types

## Biggest Blockers

1. **P0: Page gate uses tier-level boolean** — `canAccessDesignStudio` is true for ALL tiers. Must change to `canAccessStandaloneDesignStudio`
2. **Coming Soon but accessible** — marketing says "Coming Soon" but page is reachable by any authenticated user
3. **Feature gap** — annotations, sharing, versioning all missing
4. **3D rendering depth unclear** — `ModelEditorClient.tsx` may be scaffolded

## Next Build Slices

1. Fix page gate to use standalone entitlement flag
2. Verify model upload → 3D view E2E flow
3. Test API routes with `withAppAuth`
4. Add client-shareable model links

## Verification Checklist

- [ ] Page correctly blocked for unsubscribed users (after gate fix)
- [ ] Model CRUD works via API
- [ ] File upload stores to S3
- [ ] 3D viewer renders GLB models
- [ ] "Coming Soon" badge visible on marketing page
- [ ] No console errors
