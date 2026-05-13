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

## Phone Review After First Slice

User iPhone review after commit `a377e73` found the first command-center pass still too large and not native enough:

- The top `Field command center` card is vague and wastes vertical space.
- Resume Active Walk, Start New Walk, and Quick Walk are oversized; Resume is too visually dominant as a large orange card.
- Start New Walk and Quick Walk are not clearly differentiated. New Walk should communicate setup/project/plan flow, while Quick Walk should mean camera-only/ad-hoc capture.
- Passive metric cards take too much prime screen space and do not read as actionable command chips.
- Recent Walks and Field Projects collide in a split layout on the phone; Recent Walks is squeezed instead of being one obvious contained testable panel.
- Field Projects is unclear/missing because it competes with Recent Walks instead of living as a tab in the main work panel.
- The walk row three-dot menu is not obvious enough to the user.
- Delete should remain inside the menu and should not appear as a primary visible trash action.
- The full Site Walk module nav still appears on non-home Site Walk pages and wastes space.
- Returning to Site Walk Home from other Site Walk pages still feels awkward.
- Setup still has duplicate nav and AI-generated layout issues; this correction only addresses shell/module chrome, not a setup-page rebuild.
- Saved plan pins cannot be moved/deleted, and attempted movement appears to create duplicate pins on top of old pins. This is deferred to the Pins / Stop Preview slice and must not be fixed in this Site Walk Home correction.

## Compact Correction Implementation Notes

- Replaced the large hero with a compact Site Walk / workspace context row.
- Changed primary actions to compact controls: Resume Walk, Setup Walk, Quick Capture, and From Project.
- Renamed Quick Walk to Quick Capture with Camera-only context.
- Converted large status cards into compact chips for Open Items, Needs Review, Unsynced, and Draft Reports.
- Replaced the split Recent Walks / Field Projects layout with one tabbed contained work panel: Recent, Projects, Issues, Drafts.
- Moved Field Projects into the Projects tab with Start Walk, Plan Room, and More actions.
- Made the row action menu more visible and added Resume / Open as the first menu action.
- Replaced the large subpage Site Walk module nav with a compact context bar and Home affordance on non-home pages.

## Compact Correction Codex-style review

- No Trigger/rasterization changes: passed.
- No capture upload changes: passed.
- No plan viewer/pin logic changes: passed; pin move/delete duplication was documented only.
- No migrations: passed.
- No fake data: passed.
- No dead buttons: passed; unsupported Duplicate Walk remains hidden.
- No page scroll under bottom nav: preserved.
- Main work panel scrolls internally: preserved via `flex-1 min-h-0 overflow-y-auto`.
- Recent walk rows no longer overlap Field Projects: fixed by moving Projects into a tab.
- Three-dot menu is visible: improved with an amber-accented More trigger.
- Passive metrics are compact: fixed as small chips.

## Compact Correction Validation

- `get_errors` on changed correction files: passed.
- `npm run typecheck`: passed.
- `npm run build`: passed with existing warnings only: Sentry config deprecation, webpack cache large-string warnings, `instrumentation.ts` async target warning, and Next ESLint plugin warning.
- `npm run guard:architecture`: passed.
- `bash scripts/check-file-size.sh || true`: still reports 13 pre-existing unrelated oversized files; none of the correction files exceed 300 lines.

## Phone Review After Compact Pass

User iPhone review after commit `ba35719` found the compact pass closer, but still not compressed enough for prime mobile space:

- The top Slate360/workspace context row remains low-value and hard to read.
- The separate top All Walks button is unclear and should move into the main tabbed work panel instead of consuming header space.
- Resume Walk is useful but should not be a primary hero/action card; active/resumable walks belong in an Active tab or compact list.
- Action buttons should be self-explanatory without subtitles.
- From Project reads as ambiguous; use Project Walk only when it clearly means starting from a field project.
- The Open Items / Needs Review / Unsynced / Draft Reports chip strip feels visually mismatched and should be removed or converted to tab badges.
- Passive metrics should not consume space unless they directly navigate to useful work.
- Typed DELETE/title confirmation is too cumbersome for mobile; use a two-click confirmation modal instead.
- The main contained tabbed panel should own most of the value and start higher on the screen.
- V1 will not implement a customizable Site Walk Home layout yet; that belongs to future settings/preferences work.

## Final Compression Implementation Notes

- Removed the boxed top context row and separate All Walks button.
- Kept only a tiny Site Walk label above the actions.
- Compressed primary actions to Setup Walk, Quick Capture, and Project Walk when projects exist.
- Removed subtitles from the primary action buttons.
- Moved resumable walks into an Active tab instead of a prominent Resume card.
- Removed the horizontal metric chip strip and converted useful counts to tab badges.
- Made the tabbed work panel the main flex-1 scroll area: Active, Recent, Projects, Issues, Drafts.
- Kept walk rows compact with title, project/source, status, item count, date, and visible three-dot menu.
- Changed hard delete from typed confirmation to a two-click destructive confirmation modal.

## Final Compression Codex-style review

- No Trigger/rasterization changes: passed.
- No schema/migration changes: passed.
- No capture upload or plan viewer logic changes: passed.
- No fake data: passed; empty states remain honest.
- No hidden future apps exposed: passed.
- No page-level scroll under bottom nav: preserved.
- Main tabbed panel is the primary scroll area: implemented with `flex-1 min-h-0 overflow-y-auto`.
- Delete is now a two-click confirmation: menu Delete, then modal Delete Walk.
- Row three-dot menu remains visible.
- Passive metrics were removed from the separate strip and converted to tab badges where useful.

## Final Compression Validation

- `get_errors` on changed focused-correction files: passed.
- `npm run typecheck`: passed.
- `npm run build`: passed with existing warnings only: Sentry config deprecation, webpack cache large-string warnings, `instrumentation.ts` async target warning, and Next ESLint plugin warning.
- `npm run guard:architecture`: passed.
- `bash scripts/check-file-size.sh || true`: still reports 13 pre-existing unrelated oversized files; none of the final-compression changed production files exceed 300 lines.

## Slice 1.2 Balance + Taxonomy Refinement

Phone review after commit `645fe3a` found the scroll panel became too dominant and too walk-list-heavy for both existing and new users. The refinement keeps the page non-scrolling, but reduces the mobile panel height and gives the primary command area more breathing room.

- Site Walk Home now uses Worksite language in the compact panel where safe.
- `Projects` tab became `Worksites`; `Drafts` became `Reports`.
- Primary actions are now `New Worksite`, `Start Walk`, and `Quick Capture` with no subtitles.
- `Start Walk` opens Worksites when real worksites exist; otherwise it routes to setup.
- The tab row no longer horizontally scrolls; it wraps as compact folder-style buttons.
- The main panel is capped on mobile with a responsive height instead of owning all remaining vertical space.
- Existing walk open/resume, quick capture, setup, deliverables, and bottom nav behavior are preserved.
- No SlateDrop folder automation was implemented in this slice.

## Slice 1.2 Validation

- `get_errors` on changed focused files: passed.
- `npm run typecheck`: passed.
- `npm run build`: passed with existing warnings only: Sentry config deprecation, webpack cache large-string warnings, `instrumentation.ts` async target warning, and Next ESLint plugin warning.
- `npm run guard:architecture`: passed.
- `bash scripts/check-file-size.sh || true`: still reports 13 pre-existing unrelated oversized files; none of the Slice 1.2 changed production files exceed 300 lines.
