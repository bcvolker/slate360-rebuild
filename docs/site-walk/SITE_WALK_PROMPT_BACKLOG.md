# Site Walk — Prompt Backlog

Last Updated: 2026-04-21

## Priority Reset (2026-04-21)

Founder direction: capture → AI-formatted deliverable → multi-channel share is the spine.
**Plans are demoted to the More tab** (~20–30% adoption assumption).

### PR Status

- ✅ **PR #27a** — Site Walk shell wrap (AppShell + cobalt logo + 5-tab nav + placeholder screens). Shipped commit `8aa4c44`.
- 🟢 **PR #27b** — Capture flow MVP: Quick Start tiles (Camera / Upload Photo / Voice Note / Text Note), GPS + weather metadata stamping, presigned upload via existing `/api/site-walk/upload`, items via `/api/site-walk/items`. **In progress (parallel track)** — photo upload + metadata working; camera/voice/markup follow in #27b.2.
- 🟢 **PR #27c** — Deliverable builder MVP: list page, "New deliverable" picker (session + type + title), detail editor with title autosave, share link mint via `/api/site-walk/deliverables/[id]/share`, copy + native-share + revoke. Public media resolver `/api/view/[token]/media/[itemId]` so shared photos load in the viewer. **In progress** — block-editor + AI cleanup land in #27c.2.
- ⏳ **PR #27d** — Share channels: (A) PDF email, (B) inline image email, (C) hosted viewing page (page rendering shipped in #27e — channels remain).
- ✅ **PR #27e** — Viewing page renderer: slideshow + comments + 9 item types + native share. Shipped commit `9f1e338`.
- ⏳ **PR #27f** — Project-bound mode (premium tier).
- ⏳ **PR #27g** — Leadership view + contacts.
- 🟢 **PR #27h** — Plans + pin-to-plan (under More): upload + view pins. **In progress (parallel track)**.
- ✅ **PR #28a** — Signup referral capture (`?ref=CODE`). Shipped commit `0173984`.

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
