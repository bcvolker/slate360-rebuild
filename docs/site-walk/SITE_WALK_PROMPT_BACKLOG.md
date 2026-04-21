# Site Walk — Prompt Backlog

Last Updated: 2026-04-21

## Priority Reset (2026-04-21)

Founder direction: capture → AI-formatted deliverable → multi-channel share is the spine.
**Plans are demoted to the More tab** (~20–30% adoption assumption).

### New PR Order (replaces previous PR #27a–f plan)

- **PR #27a** — Site Walk shell wrap: AppShell + cobalt platform icon top-left + 5-tab bottom nav (Home / Walks / Deliverables / Share / More) + 5 placeholder screens. Plans moved to More.
- **PR #27b** — Capture flow polish: Quick Start tiles (Camera / Upload Photo / Upload File / Voice Note), photo markup, always-on metadata stamping (time/GPS/weather/device EXIF + DB).
- **PR #27c** — Deliverable builder: template picker → AI cleanup (bullets, spell-check) → preview → branded edit → save to SlateDrop folder.
- **PR #27d** — Share channels: (A) PDF email with customizable company template, (B) inline image email, (C) hosted viewing page with per-item comments.
- **PR #27e** — Viewing page renderer: photos/notes/voice/video baseline; pluggable for 360 / 3D / thermal / time-lapse based on app entitlements.
- **PR #27f** — Project-bound mode (premium tier): walk → project link, photos auto-route to project SlateDrop folder, multi-walk progress aggregation.
- **PR #27g** — Leadership view + contacts: contact picker, view-only share, send via email/SMS/download bundle.
- **PR #27h** — Plans (deferred, lives under More): upload, pin-to-plan, plan markup. Lower priority.

### End-to-End Validation Gate (before beta open)

No deliverable path ships without virtual end-to-end test:
- PDF email arrives with rendered (non-blank) PDF
- Image email arrives with rendered image inline
- Viewing link loads real assets, comment thread works
- Bulk export downloads complete dataset
- Edit-before-send works on all 3 channels

## Do Now (Safe, No Dependencies)

### SW-P1: Harden Site Walk API Gating
- Migrate all `app/api/site-walk/` routes from `withAuth()` to `withAppAuth("punchwalk")`
- Verify each of the 31 endpoints
- Test: unauthenticated → 401, authenticated-no-subscription → 403, subscribed → 200
- **Why now:** P0 security gap — any authenticated user can call SW APIs without subscription

### SW-P2: Delete Dead Files
- Delete `app/site-walk/_page.tsx.bak`
- Verify no imports reference it
- **Why now:** Dead weight, zero risk

### SW-P3: Verify Offline Queue Integration
- Check if `lib/offline-queue.ts` is wired into any Site Walk capture flow
- If not, document the gap; do not implement yet
- **Why now:** PWA offline is claimed but may not work for Site Walk

## After Gating Hardening

### SW-P4: Unify Site Walk Layout
- `/site-walk` uses `(apps)` layout (AppSidebar)
- `/site-walk/board` and sub-routes use standalone layout (no sidebar)
- Decide: should all Site Walk routes use the same layout?
- **Scope:** Layout files only, no component changes

### SW-P5: Session Capture E2E Smoke Test
- Walk through: create session → capture items (photo, text, GPS) → save → review
- Verify S3 uploads work with current credentials
- Verify Supabase writes to `site_walk_sessions` and `site_walk_items`
- Document any failures

### SW-P6: Deliverable Generation E2E Test
- Create a deliverable from a session
- Test share link generation
- Test email delivery via Resend
- Test PDF export if implemented
- Document what works vs placeholder

## After Billing Fully Unified

### SW-P7: Plan/Pin/Template CRUD Verification
- Test all plan, pin, and template operations
- Verify the 7 API routes (plans × 2, pins × 2, templates × 3)
- These are newer features (migration `20260412000009`) — may be scaffolded only

### SW-P8: Assignment Workflow Test
- Test assignment creation, listing, and completion
- Verify comment threads work on items
- Test the `[id]/verify` and `[id]/resolve` endpoints

### SW-P9: Block Editor Integration
- Verify BlockEditor, BlockRenderer, BlockToolbar work together
- These are the rich-content editing components for deliverables
- Test: create block → edit → render in deliverable view

## After Dashboard Rewrite

### SW-P10: Site Walk Dashboard Widget
- Site Walk should have a dashboard widget showing recent sessions/items
- Check if `DashboardWidgetRenderer` supports a Site Walk widget type
- If not, scope the integration

### SW-P11: Project Hub Integration
- Verify Site Walk sessions link correctly to Project Hub projects
- Test: project-scoped session list, item counts, activity log entries

## Future / Roadmap

### SW-P12: Mobile Camera Optimization
- `CaptureCamera.tsx` needs testing on real mobile devices
- GPS accuracy, photo quality, orientation handling
- PWA camera permissions flow

### SW-P13: Branding / White-Label Deliverables
- `app/api/site-walk/branding/route.ts` exists
- Verify org branding applies to deliverables and share links
- Test: logo, colors, domain customization
