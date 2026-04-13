# 360 Tours — Build File

Last Updated: 2026-04-13
Module Status: **Active — early implementation, marked Coming Soon on marketing**

## Purpose

360 Tour Builder lets users create interactive 360° virtual tours with hotspots, floor plans, and shareable links. It's Slate360's second app module, intended to pair with Site Walk in the Field Pro Bundle.

## Current Real Implementation State

### What Works (Real)
- Tour list view (`TourListClient.tsx` — 141 lines)
- Tour editor with scene management (`TourEditorClient.tsx` — 284 lines)
- Scene upload flow (`SceneUploader.tsx` — 132 lines)
- 360 panorama viewer (`TourPanoViewer.tsx` — 59 lines)
- Public tour viewer for shared links (`PublicTourViewer.tsx` — 141 lines)
- Tour settings panel (`TourSettingsPanel.tsx` — 42 lines)
- CRUD queries in `lib/tours/queries.ts` (193 lines)
- 8 API routes for tours + scenes
- 3 database tables with migrations
- Public viewing route at `/tours/view/[slug]`

### What Is Partial
- Tour editor hotspot/annotation features (UI exists but depth of implementation unclear)
- Scene reordering (API at `/[tourId]/scenes/reorder` exists)
- Builder shell (`TourBuilderShell.tsx` — only 20 lines, likely scaffolded)

### What Is Missing
- Tour analytics/view tracking (no API routes for this)
- Floor plan integration
- Before/after comparisons
- White-label branding on tours
- Dedicated Tour Builder hooks (data fetching inline)
- Marketing page marked "Coming Soon" (correct — not fully ready)

## Routes / Pages

| Route | File | Purpose |
|-------|------|---------|
| `/tour-builder` | `app/(apps)/tour-builder/page.tsx` | App entry (gated) |
| `/tours` | `app/(dashboard)/tours/page.tsx` | Dashboard tours list |
| `/tours/view/[slug]` | `app/tours/view/[slug]/page.tsx` | Public tour viewer |

## API Routes (8 endpoints)

| Endpoint | Purpose |
|----------|---------|
| `POST /api/tours` | Create tour |
| `GET/PUT/DELETE /api/tours/[tourId]` | Tour CRUD |
| `POST /api/tours/[tourId]/scenes` | Add scene |
| `DELETE /api/tours/[tourId]/scenes/[sceneId]` | Remove scene |
| `POST /api/tours/[tourId]/scenes/reorder` | Reorder scenes |
| `POST /api/tours/[tourId]/scenes/complete` | Mark scene upload complete |
| `POST /api/tours/[tourId]/scenes/upload` | Scene file upload |
| `POST /api/apps/tour-builder/join` | Tour Builder waitlist/join |

## Database Tables

| Table | Migration | Purpose |
|-------|-----------|---------|
| `project_tours` | `20260406000001` | Tour metadata |
| `tour_scenes` | `20260406000001` | Individual 360 scenes |
| `project_tours_external_links` | `20260407000003` | Public share links |

## Key Components (7 files, 819 lines)

| Component | Lines | Purpose |
|-----------|-------|---------|
| `TourEditorClient.tsx` | 284 | Tour editor UI |
| `lib/tours/queries.ts` | 193 | Database queries |
| `TourListClient.tsx` | 141 | Tour list |
| `PublicTourViewer.tsx` | 141 | Public viewer |
| `SceneUploader.tsx` | 132 | Scene file upload |
| `TourPanoViewer.tsx` | 59 | 360 panorama rendering |
| `TourSettingsPanel.tsx` | 42 | Settings UI |
| `TourBuilderShell.tsx` | 20 | Shell wrapper (scaffolded) |

## Type Definitions

- `lib/types/tours.ts` (33 lines) — minimal tour + scene types

## Biggest Blockers

1. **Coming Soon gate needed** — page gate checks `canAccessStandaloneTourBuilder` which is correct, but marketing says "Coming Soon" — ensure early users can't accidentally purchase
2. **Builder shell is scaffolded** — only 20 lines, needs real implementation
3. **No dedicated hooks** — data fetching inline in components
4. **Type definitions minimal** — 33 lines may not cover all use cases

## Next Build Slices

1. Verify tour creation → scene upload → public view E2E flow
2. Flesh out `TourBuilderShell.tsx`
3. Add tour-specific hooks for data management
4. Expand type definitions
5. Test public tour viewer with real 360 images

## Verification Checklist

- [ ] Tour CRUD works via API
- [ ] Scene upload stores to S3
- [ ] Public viewer renders 360 panoramas
- [ ] Page gate blocks unsubscribed users
- [ ] "Coming Soon" badge visible on marketing homepage
- [ ] No console errors on tour pages

## Roadmap

- Interactive hotspots and annotations
- Floor plan integration
- Before/after comparisons
- Analytics and view tracking
- Integration with Site Walk items (cross-module linking)
- White-label branding
