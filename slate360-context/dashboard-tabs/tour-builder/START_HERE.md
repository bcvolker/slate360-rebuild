# 360 Tour Builder — Start Here

Last Updated: 2026-03-22
Use this file first for any 360 Tour Builder task. Only open the longer docs if this file does not answer the question.

## What Matters First

- Route: `/(dashboard)/tours`
- Gate: `getEntitlements(tier).canAccessTours` (Creator+ tier: creator, model, business, enterprise)
- Page entry: `app/(dashboard)/tours/page.tsx` (~20 lines, server component)
- Shell: `components/dashboard/ToursShell.tsx` (~37 lines, "Coming Soon" placeholder)
- Sidebar registration: `components/dashboard/DashboardClient.tsx` (Compass icon, id: "tours")
- QuickNav: `components/shared/QuickNav.tsx` (listed as "360 Tours")
- System folder: `lib/slatedrop/folderTree.ts` (🔭 "360-tour-builder" folder auto-provisioned)
- Feature page: `app/features/360-tour-builder/page.tsx` (marketing, has Pannellum demo)

## Current Status — Scaffolded Only

- Route + shell + entitlement gate: **done**
- Sidebar + QuickNav wiring: **done**
- System folder provisioning: **done**
- Marketing/feature page: **done** (with live Pannellum 360 viewer demo)
- API routes: **none** (no `app/api/tours/`)
- Database tables: **none** (no `tours`, `scenes`, `hotspots`, etc.)
- Panorama upload/stitch pipeline: **none**
- Hotspot authoring system: **none**
- Tour sharing/embedding: **none**
- Functional UI: **none** (shell shows placeholder only)

## Build Prerequisites

Before any implementation:
1. **Choose panorama viewer** — Pannellum is already demoed on feature page (likely choice)
2. **Create database tables** — `tours`, `tour_scenes`, `tour_hotspots`, `tour_brand_presets`, `tour_share_policies`, `tour_events`
3. **Create API routes** — upload, scene/hotspot CRUD, publish, embed, analytics
4. **Decide panorama storage** — reuse S3 `slate360-storage` with `/tours/` prefix vs. dedicated bucket

## MVP Scope (from IMPLEMENTATION_PLAN.md)

1. Panorama ingest and scene sequencing
2. Hotspot authoring with media embeds
3. Tour publish/share controls (password, expiry, embed code)
4. Basic analytics handoff to Analytics & Reports tab

## Feature Extensions (post-MVP)

- AI hotspot suggestions
- Progression tours (before/after states)
- VR/web export variants
- Floor plan mapping integration

## Data Contracts (planned)

```typescript
interface Tour { id: string; projectId: string; title: string; brandPresetId?: string; published: boolean; ... }
interface TourScene { id: string; tourId: string; order: number; panoramaS3Key: string; title: string; ... }
interface TourHotspot { id: string; sceneId: string; targetSceneId?: string; position: { yaw: number; pitch: number }; type: 'navigate' | 'info' | 'media'; content: string; ... }
interface TourBrandPreset { id: string; orgId: string; logo?: string; colors: object; ... }
interface TourSharePolicy { id: string; tourId: string; password?: string; expiresAt?: string; allowEmbed: boolean; ... }
interface TourEvent { id: string; tourId: string; type: 'view' | 'hotspot_click' | 'share'; metadata: object; ... }
```

## Customization Requirements (mandatory per CUSTOMIZATION_SYSTEM.md)

- 70% center viewport by default
- Collapsible scene library panel (left)
- Collapsible settings panel (right)
- Movable top toolbar groups
- Expandable timeline and queue sections
- Persisted presets: `simple`, `standard`, `advanced`, `custom`

## Dependencies

- Pannellum (or similar 360 viewer — already in project for feature page demo)
- SlateDrop for panorama file ingest and artifact export
- GPU worker for panorama stitching (optional, for multi-image ingest)
- Share/embed system (public routes, access policies)

## What's Missing for Multi-Chat Build

This tab is buildable across multiple chats with this START_HERE + IMPLEMENTATION_PLAN. Each chat should:
1. Read this file first
2. Check the "Build Progress" section below
3. Work on the next incomplete step
4. Update "Build Progress" before session end

## Build Progress

| Step | Description | Status |
|------|-------------|--------|
| 1 | Panorama viewer decision (Pannellum?) | ⬜ Not started |
| 2 | Database tables + migration | ⬜ Not started |
| 3 | API routes (upload, CRUD, publish, analytics) | ⬜ Not started |
| 4 | Shell layout (viewport, scene panel, settings) | ⬜ Not started |
| 5 | Panorama upload + ingest | ⬜ Not started |
| 6 | Scene sequencing UI | ⬜ Not started |
| 7 | Hotspot authoring (navigate, info, media) | ⬜ Not started |
| 8 | Tour publish + share controls | ⬜ Not started |
| 9 | Embed code + public viewer route | ⬜ Not started |
| 10 | Brand presets + customization persistence | ⬜ Not started |
| 11 | Analytics event tracking | ⬜ Not started |
| 12 | Server-side entitlement enforcement | ⬜ Not started |

## Definition of Done

- User can build and publish a branded 360 tour end-to-end
- Hotspots work (navigate between scenes, show info/media)
- Share/embed with password/expiry is reliable
- Layout customization persists across sessions
- Tier gate enforced both client-side (sidebar filter) and server-side (route check)
- No file over 300 lines; one component per file
- All types in `lib/types/`
