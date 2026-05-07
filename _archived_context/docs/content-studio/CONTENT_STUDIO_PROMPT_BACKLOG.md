# Content Studio — Prompt Backlog

Last Updated: 2026-04-13

## Do Now (Safe, No Dependencies)

### CS-P1: Fix Page Gate
- Change page gate from `canAccessContent` to standalone flag (e.g., `canAccessStandaloneContent`)
- Add the flag to entitlements resolver if missing
- **Why now:** P0 security gap — any trial user can access Content Studio

### CS-P2: Add to Marketing Homepage
- Add Content Studio to `APP_SHOWCASE` array in `marketing-homepage.tsx`
- Add `comingSoon: true` and "Join Waitlist" CTA
- **Why now:** Module exists but has no marketing visibility

### CS-P3: Verify Asset Upload E2E
- Test: upload image/video → stored in S3 → viewable in asset editor
- Document what works vs scaffolded
- **Why now:** Core feature verification

## After Gating Hardening

### CS-P4: Migrate API Routes to withAppAuth
- Check current auth wrappers on 4 CS API routes
- Migrate to `withAppAuth("content_studio")`

## After Billing Fully Unified

### CS-P5: Collection Management
- Test collection CRUD
- Verify assets can be grouped into collections
- Test collection-scoped views

### CS-P6: Expand Type Definitions
- Current types are 35 lines — needs expansion for metadata, tags, sharing

## Future / Roadmap

### CS-P7: Media Processing Pipeline
- Server-side image resize and thumbnail generation
- Video transcoding for web playback
- Metadata extraction (EXIF, dimensions, duration)

### CS-P8: CDN Integration
- Configure CloudFront or similar for fast asset delivery
- Cache invalidation on updates

### CS-P9: Client Asset Galleries
- Shareable gallery links
- Download permissions per asset/collection
- Watermarking support

### CS-P10: Bulk Operations
- Bulk upload with progress tracking
- Bulk tag/categorize
- Bulk move between collections
