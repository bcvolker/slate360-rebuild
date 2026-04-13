# Content Studio — Build File

Last Updated: 2026-04-13
Module Status: **Active — early scaffolding, NOT marketed as Coming Soon on homepage**

## Purpose

Content Studio is a digital asset management (DAM) module for organizing, editing, and sharing media assets (images, videos, documents) across projects. Pairs with Design Studio in the Studio Bundle.

## Current Real Implementation State

### What Works (Real)
- Asset list view (`AssetListClient.tsx` — 236 lines)
- Asset editor (`AssetEditorClient.tsx` — 197 lines)
- Asset settings panel (`AssetSettingsPanel.tsx` — 103 lines)
- Shell wrapper (`ContentStudioShell.tsx` — 59 lines)
- CRUD queries (`lib/content-studio/queries.ts` — 242 lines)
- 4 API routes for assets + collections
- 2 database tables with migrations

### What Is Partial
- Collection management (API exists, UI integration depth unclear)
- Asset editing tools (component exists but feature depth unknown)

### What Is Missing
- Media processing pipeline (resize, transcode, thumbnail generation)
- Bulk upload/import
- CDN integration for fast asset delivery
- Metadata tagging/search
- Client-shareable asset galleries
- **Page gate checks `canAccessContent` (tier-level boolean, always true for ALL tiers) — effectively ungated (P0)**
- **Not on marketing homepage** — no "Coming Soon" badge, no waitlist

## Routes / Pages

| Route | File | Purpose |
|-------|------|---------|
| `/content-studio` | `app/(apps)/content-studio/page.tsx` | App entry |

## API Routes (4 endpoints)

| Endpoint | Purpose |
|----------|---------|
| `GET/POST /api/content-studio/assets` | List/create assets |
| `GET/PUT/DELETE /api/content-studio/assets/[assetId]` | Asset CRUD |
| `GET/POST /api/content-studio/collections` | List/create collections |
| `GET/PUT/DELETE /api/content-studio/collections/[collectionId]` | Collection CRUD |

## Database Tables

| Table | Migration | Purpose |
|-------|-----------|---------|
| `media_assets` | `20260412000012` | Digital assets |
| `media_collections` | `20260412000012` | Organizational collections |

## Key Components (4 files + queries, 872 lines total)

| Component | Lines | Purpose |
|-----------|-------|---------|
| `lib/content-studio/queries.ts` | 242 | DB queries |
| `AssetListClient.tsx` | 236 | Asset list UI |
| `AssetEditorClient.tsx` | 197 | Asset editor |
| `AssetSettingsPanel.tsx` | 103 | Settings |
| `ContentStudioShell.tsx` | 59 | Shell wrapper |

## Type Definitions

- `lib/types/content-studio.ts` (35 lines) — minimal asset + collection types

## Biggest Blockers

1. **P0: Page gate uses tier-level boolean** — `canAccessContent` is true for ALL tiers. Must change to standalone flag
2. **Not on marketing homepage** — should be listed with "Coming Soon" like Tour Builder and Design Studio
3. **No media pipeline** — no processing, thumbnailing, or CDN
4. **No sharing infrastructure** — unlike SlateDrop, no external access system

## Next Build Slices

1. Fix page gate to use standalone entitlement flag
2. Add Content Studio to marketing homepage with "Coming Soon" badge
3. Verify asset upload → view → edit E2E flow
4. Test collection grouping

## Verification Checklist

- [ ] Page correctly blocked for unsubscribed users (after gate fix)
- [ ] Asset CRUD works via API
- [ ] File upload stores to S3
- [ ] Collection grouping works
- [ ] No console errors
