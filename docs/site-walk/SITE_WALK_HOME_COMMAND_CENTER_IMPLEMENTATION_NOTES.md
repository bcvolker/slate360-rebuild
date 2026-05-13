# Site Walk Home Command Center Implementation Notes

Date: 2026-05-13
Slice: Site Walk V1 Slice 1 — Home command center cleanup
Status: Implemented locally; validation passed
Rollback tag: `pre-sitewalk-home-command-center-20260513-044125`

## Safety snapshot

- Branch: `main`
- `git pull origin main`: already up to date
- HEAD before Slice 1 edits: `889c2dff06c276c7e9c994fd1fdc88c05bca06c2`
- Rollback tag: `pre-sitewalk-home-command-center-20260513-044125`
- Existing uncommitted planning docs from the prior planning pass remain in the working tree and must not be confused with Slice 1 implementation files during staging.

## No-edit audit answers

### 1. Which component renders the install banner?

`components/dashboard/AppShell.tsx` imports and renders `MobileInstallStrip` inside the authenticated shell `<main>`. The strip itself is implemented in `components/shared/MobileInstallStrip.tsx`. Because `AppShell` wraps Site Walk through `app/site-walk/layout.tsx`, the banner appears on authenticated Site Walk surfaces.

### 2. Which component renders the duplicate Site Walk top tabs?

`components/site-walk/SiteWalkShell.tsx` always renders `SiteWalkModuleNav`, and `components/site-walk/SiteWalkModuleNav.tsx` renders the top Site Walk tab strip for Workspace, Walks, Capture, and Deliverables. On mobile this duplicates `components/shared/MobileBottomNav.tsx`, which switches to a Site Walk bottom nav for `/site-walk` routes.

### 3. Which element currently controls page-level scroll?

`components/dashboard/AppShell.tsx` wraps children in a `div` with `overflow-y-auto`. `components/site-walk/SiteWalkShell.tsx` then creates another fixed-height flex shell. `app/site-walk/page.tsx` and `SiteWalkHub` already use `overflow-hidden`/`overflow-y-auto`, but the global authenticated shell scroll wrapper and the persistent module nav still contribute to web-page-like scroll/space usage.

### 4. Which element should become the contained scroll panel?

The Site Walk Home command list inside `app/site-walk/_components/SiteWalkHub.tsx` should own the contained scroll. The intended scroll region is the command/recent-walks panel inside the Site Walk Home card, not the page root and not the whole authenticated shell.

### 5. Where are recent walks loaded from?

`app/site-walk/page.tsx` loads recent walks through `loadHubData()`, using the admin Supabase client against `site_walk_sessions`, filtered by `org_id`, excluding `status = archived`, ordered by `updated_at` descending, and enriched with item counts from `site_walk_items`.

### 6. What row actions already exist?

Existing API support:

- Rename: `PATCH /api/site-walk/sessions/[id]` with `title`.
- Link / Change Project: `PATCH /api/site-walk/sessions/[id]` with `project_id`.
- Archive: `DELETE /api/site-walk/sessions/[id]` without `permanent: true` soft-archives the session.
- Delete: `DELETE /api/site-walk/sessions/[id]` with `permanent: true`, `confirmText: "DELETE"`, and `confirmName` matching the session title hard-deletes with server-side double confirmation.
- Create Deliverable: `app/site-walk/(act-3-outputs)/deliverables/new/page.tsx` accepts `?session=` and redirects into the deliverables area; `POST /api/site-walk/deliverables` also exists for deliverable creation.

### 7. Which row actions require only UI wiring?

- Rename
- Link / Change Project
- Archive
- Delete with confirmation
- Create Deliverable route link

### 8. Which row actions are not supported by APIs yet and should be disabled/hidden for now?

- Duplicate Walk should be hidden for this slice. A simple `POST /api/site-walk/sessions` can create a new blank session, but there is no safe API contract for duplicating a walk with its items, attachments, plans, metadata, and deliverable state.

### 9. What is the smallest safe implementation for Slice 1?

- Remove `MobileInstallStrip` from the authenticated `AppShell` path without deleting the shared component or preview usage.
- Hide the full `SiteWalkModuleNav` on the `/site-walk` home route and replace it with compact context only if needed.
- Keep all existing navigation paths to setup, capture, walks, plans, deliverables, and bottom nav destinations.
- Rework `SiteWalkHub` into a bounded command center with one internal scroll panel.
- Use real loaded counts for open items, needs-review signals, draft deliverables, unsynced items, recent walks, and field projects where available; otherwise show honest empty states.
- Add a per-walk three-dot menu with only supported actions: Rename, Link / Change Project, Create Deliverable, Archive, and Delete. Hide Duplicate Walk until a safe duplicate API exists.

## Implementation summary

Applied the smallest safe Slice 1 cleanup:

- Removed `MobileInstallStrip` from authenticated `AppShell` rendering while leaving the shared component in place for preview/non-auth usage.
- Hid the full `SiteWalkModuleNav` on `/site-walk` only, so the Site Walk Home page no longer duplicates the mobile bottom nav.
- Changed `SiteWalkShell` to fill the parent app-shell viewport with `h-full min-h-0` instead of forcing another `100dvh` layer inside the authenticated shell.
- Rebuilt `SiteWalkHub` as a bounded command center with compact context, Resume Active Walk, Start New Walk, Quick Walk, status panels, contained Recent Walks, and Field Project shortcuts.
- Added real summary counts from `site_walk_items`, `site_walk_sessions`, and `site_walk_deliverables` where available.
- Added a row menu with supported actions only: Rename, Link / Change Project, Create Deliverable, Archive, and Delete.
- Kept Duplicate Walk hidden because a safe duplicate-with-items/attachments API does not exist yet.

## Codex-style review checklist

- No changes to Trigger/rasterization: passed.
- No changes to capture upload or PlanViewer internals: passed.
- No migrations or Supabase schema changes: passed.
- No fake data: passed; counts come from existing tables and empty states are honest.
- No Coming Soon/demo/filler: passed.
- No broad color migration: passed; existing local classes only.
- No hidden future apps exposed: passed.
- No page-level scroll under bottom nav: implemented by bounding Site Walk Home and moving scroll to command panels.
- Recent Walks panel scrolls internally: implemented.
- Touch targets are reasonable: action cards, row menu trigger, and modal controls use `min-h-11` or larger.
- Delete requires second confirmation: implemented with DELETE text plus walk-title confirmation before hard delete.

## Validation

- `get_errors` on changed production files: passed.
- `npm run typecheck`: passed.
- `npm run build`: passed with existing warnings only: Sentry config deprecation, webpack cache large-string warnings, `instrumentation.ts` async target warning, and Next ESLint plugin warning.
- `npm run guard:architecture`: passed.
- `bash scripts/check-file-size.sh || true`: still reports 13 pre-existing oversized files; none of the Slice 1 changed production files exceed 300 lines.
