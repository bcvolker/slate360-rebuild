"# Slate360 — Project Memory

Last Updated: 2026-04-30
Repo: bcvolker/slate360-rebuild
Branch: main
Live: https://www.slate360.ai

This file is the default new-chat attachment. Keep it short. Read this first, then only pull the docs required for the task.

## AI Agent Access

**AI Agents (Copilot, Claude, etc.) have read/write/run/push access to:**
- **Git**: commit, branch, merge, and push to `bcvolker/slate360-rebuild` on GitHub
- **Vercel**: deploy + env var management via `VERCEL_TOKEN` Codespace secret
- **AWS S3**: bucket `slate360-storage` (us-east-2) via stored credentials
- **Cloudflare R2**: bucket `slate360-storage` via stored S3-compatible credentials and account-scoped R2 access
- **Stripe**: webhook and billing management via Vercel env secrets
- **Supabase CLI**: migrations, RPC functions, schema changes to project `hadnfcenpcfaeclczsmm`

This access is intentional. Agents are expected to push commits, run migrations, and deploy — not just suggest changes.

## Start Here

Recommended read order:
1. This file
2. `SLATE360_MASTER_BUILD_PLAN.md` (single source of truth for product direction)
3. Only task-relevant docs from the read map below

Do not read all context files by default.

## Project Snapshot

Slate360 is a Next.js 15 + React 19 + TypeScript SaaS platform with:
- Supabase for auth and primary data
- AWS S3 and Cloudflare R2 through the shared S3-compatible storage layer in `lib/s3.ts`
- Stripe for billing
- Vercel for hosting and cron
- Market Robot as an internal route at `/market`

Primary live modules:
- `/dashboard`
- `/projects`
- `/slatedrop`
- `/market`

Tier note:
- OLD tiers (`trial < creator < model < business < enterprise`) are OBSOLETE — removed in commit `b5d6224`
- NEW tiers: `trial < standard < business < enterprise` (per-app, not platform-wide)
- Backward-compat: legacy DB rows with "creator" or "model" auto-map to "standard"
- Users subscribe per-app with optional bundle discounts
- Enterprise gets ALL apps + admin + white-label
- `lib/entitlements.ts` rewritten to 4-tier model (standard: $149/mo, 5K credits, 25GB, 3 seats)
- subscription gates use `getEntitlements()`
- trial tier unlocks ALL tabs with tight limits (500 credits, 5GB, 1 seat) + TrialBanner
- `/ceo`, `/market`, and `/athlete360` are internal access routes, not subscription features

## Critical Rules

1. No production `.ts` / `.tsx` / `.js` file over 300 lines.
2. No `any`.
3. Use shared auth wrappers and response helpers.
4. Types come from `lib/types/`.
5. Server components first.
6. Internal routes (`/ceo`, `/market`, `/athlete360`) do not use entitlements.
7. Subscription gates must use `getEntitlements()`.
8. New folder writes use `project_folders`.
9. No mock data in production UI.
10. Update context docs after code changes.

## Task-Based Read Map

| If you are working on | Read |
|---|---|
| Product direction / architecture | `SLATE360_MASTER_BUILD_PLAN.md` |
| Site Walk (any phase) | `SLATE360_MASTER_BUILD_PLAN.md` §3–§8 |
| Market Robot | `slate360-context/dashboard-tabs/market-robot/START_HERE.md` |
| Backend/auth/billing/storage | `slate360-context/BACKEND.md` |
| Dashboard UI/tabs | `slate360-context/DASHBOARD.md`, `slate360-context/dashboard-tabs/MODULE_REGISTRY.md` |
| SlateDrop | `slate360-context/SLATEDROP.md` |
| Widgets | `slate360-context/WIDGETS.md` |
| Active bugs | `slate360-context/ONGOING_ISSUES.md`, `ops/bug-registry.json` |
| Release readiness | `ops/module-manifest.json`, `ops/release-gates.json` |
| Codebase facts (DB, routes, deps) | `CODEBASE_AUDIT_2025.md` |

## Backend Quick Access

### Supabase
- URL: `https://hadnfcenpcfaeclczsmm.supabase.co`
- Dashboard: `https://supabase.com/dashboard/project/hadnfcenpcfaeclczsmm`
- Local secrets: `.env.local`
- Clients:

```typescript
import { createClient } from "@/lib/supabase/client";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
```

### AWS S3
- Bucket: `slate360-storage`
- Region: `us-east-2`
- Client: `lib/s3.ts`

### Cloudflare R2
- Bucket: `slate360-storage`
- Account ID: `96019f75871542598e1c34e4b4fe2626`
- Endpoint: derived from `CLOUDFLARE_ACCOUNT_ID` as `https://<account>.r2.cloudflarestorage.com` unless `R2_ENDPOINT` is set explicitly
- Required runtime env: `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`
- Optional runtime env: `R2_REGION` (`auto` default), `R2_ENDPOINT`, `CLOUDFLARE_R2_API_TOKEN`
- Validation commands: `npm run diag:storage-runtime`, `npm run diag:storage-runtime:write`, `npm run diag:storage-runtime:presign`

### Vercel
- Auto-deploy from `main`
- Cron source: `vercel.json`
- Stripe secrets live in Vercel envs
- CLI access via `VERCEL_TOKEN` Codespace secret (linked to `slate360/slate360-rebuild`)
- Env var dashboard: `https://vercel.com/slate360/slate360-rebuild/settings/environment-variables`

### Git
- Default branch: `main`
- Standard flow: local edit -> typecheck / verify -> commit -> push
- Do not assume unrelated dirty changes are yours

## Core Commands

```bash
npm run dev
npm run typecheck
npm run build
npm run diag:market-runtime
npm run diag:storage-runtime
npm run verify:release
bash scripts/check-file-size.sh
```

During build/release work, also run the relevant guards before pushing shared or backend changes.

## Market Robot Focus

Route and gate:
- Route: `/market`
- Gate: `resolveServerOrgContext().canAccessMarket`

Current reality (2026-03-20):
- Tab routing works (6 tabs), 0 TS errors, deploys cleanly
- **Data wiring is completely disconnected** — orchestrator passes dummy data to all tabs
- Backend is production-grade: 8 real hooks, 17 API routes, 25 lib utilities, typed contracts
- V2 rebuild approved — wire orchestrator to hooks first, then rebuild tabs one at a time
- See `MARKET_ROBOT_STATUS_HANDOFF.md` for full critique, V2 plan, and prompt templates

Most important Market files:
- `app/market/page.tsx` — route entry (server component, auth gate)
- `components/dashboard/market/MarketClient.tsx` — orchestrator (needs rewiring)
- `components/dashboard/market/` — all tab components
- `lib/hooks/useMarket*` — 8 working hooks (the entire data layer)
- `lib/market/` — 25 utility files (contracts, mappers, bot engine, scheduler)
- `app/api/market/` — 17 API routes

Files to delete:
- `components/dashboard/MarketClient.tsx` (old, orphaned, 75 lines)
- `components/dashboard/market/MarketRobotWorkspace.tsx` (unused, 84 lines)

## Archive And Token Policy

Most planning docs have been deleted (2026-04-11 cleanup). Only reference-only files remaining:
- `slate360-context/dashboard-tabs/market-robot/CURRENT_STATE_HANDOFF.md`
- `slate360-context/dashboard-tabs/market-robot/ONGOING_BUILD_TRACKER.md`
- `slate360-context/SUPABASE_EMAIL_TEMPLATES.md`

Use those files only for deep history or recovery work.

## Known Monolith Files (read state + JSX together)

| File | Lines | Status |
|---|---|---|
| `components/walled-garden-dashboard.tsx` | 82 | ✅ Extracted — was 1472 lines, now thin orchestrator |
| `components/dashboard/DashboardClient.tsx` | 264 | ✅ Under limit — 5 extractions + 6 sub-hooks |
| `lib/hooks/useDashboardState.ts` | 244 | ✅ Under limit — thin orchestrator (6 sub-hooks) |
| `components/slatedrop/ProjectFileExplorer.tsx` | 178 | ✅ Under limit — hook extracted to `useProjectFileExplorer.ts` (236 lines) |
| `components/dashboard/market/MarketClient.tsx` | 175 | ✅ Under limit |
| `components/shared/DashboardHeader.tsx` | 286 | ✅ Under limit |
| `app/page.tsx` | 63 | ✅ Under limit — Phase 6 complete (8 files in `components/home/`) |
| `app/(dashboard)/project-hub/[projectId]/management/page.tsx` | 931 | ⚠️ Over limit — needs extraction |
| `app/(dashboard)/project-hub/[projectId]/photos/page.tsx` | 599 | ⚠️ Over limit — needs extraction |
| `app/(dashboard)/project-hub/[projectId]/submittals/page.tsx` | 579 | ⚠️ Over limit — needs extraction |
| `app/(dashboard)/project-hub/[projectId]/schedule/page.tsx` | 465 | ⚠️ Over limit — needs extraction |
| `app/(dashboard)/project-hub/[projectId]/drawings/page.tsx` | 448 | ⚠️ Over limit — needs extraction |
| `app/(dashboard)/project-hub/[projectId]/budget/page.tsx` | 421 | ⚠️ Over limit — needs extraction |
| `app/(dashboard)/project-hub/[projectId]/punch-list/page.tsx` | 403 | ⚠️ Over limit — needs extraction |
| `app/(dashboard)/project-hub/[projectId]/daily-logs/page.tsx` | 358 | ⚠️ Over limit — needs extraction |
| `app/(dashboard)/project-hub/[projectId]/rfis/page.tsx` | 339 | ⚠️ Over limit — needs extraction |

When editing oversized files, always read both the state declarations AND the JSX sections.

## Latest Session Handoff

<!-- Each chat MUST overwrite this section at end of conversation. Next chat reads this first. -->

### Session Handoff — 2026-04-30 (Capture Flow Review + Slate Polish)

#### What Changed
- `components/site-walk/capture/CameraViewfinder.tsx` + `lib/site-walk/capture-image-url.ts` — preserved local capture preview URLs across Visual/Data navigation and added a shared local-first/server-fallback image URL helper so Back no longer reuses a revoked blob URL while the server image is not ready.
- `components/site-walk/capture/VisualCaptureView.tsx` — changed the capture surface toward Slate360 dark/cobalt glass styling, replaced the side chevron with a clearer `Add Details` CTA, and added pinned-file preview chips/modal in the attachments sheet.
- `components/site-walk/capture/DataContextView.tsx` — redesigned Data Entry as a Slate360 dark photo-details panel with a reference thumbnail, construction classifications, `Save & Next Location`, secondary `Add Angle`, and `Save & Finish Walk` actions.
- `app/site-walk/(act-2-inputs)/walks/[sessionId]/page.tsx` — replaced the prior live command-center page with a contained mobile-first Walk Summary list; each capture card links back into `/site-walk/capture?session=...&item=...` for editing.
- `app/site-walk/(act-3-outputs)/deliverables/new/page.tsx` — added a compatibility route that redirects to the existing deliverables surface with the session query.
- `ops/bug-registry.json` and `slate360-context/ONGOING_ISSUES.md` — logged and resolved BUG-039 (image disappears on Back) and BUG-040 (pin previews unavailable).
- `docs/site-walk/SITE_WALK_V1_3_ACT_WORKFLOW_PLAN.md` — added Prompt 10N implementation row for capture flow review and polish.

#### What's Broken / Partially Done
- Needs real-device smoke test on iPhone/Android: capture photo → Add Details → Back → verify image remains, add file pin → Files → preview pinned image/PDF → Data → Save & Next Location → choose location → capture next photo.
- `Save & Finish Walk` waits briefly for existing autosave when `saveState` is dirty/saving, but a true explicit `flushDraft()` API in `useCaptureItems` would be stronger once that hook is extracted below 250 lines.
- `bash scripts/check-file-size.sh` still exits 1 due to known pre-existing oversized files; all touched production files are under 300 lines.
- The user-uploaded reference image `public/uploads/marked up.jpg` and `ts-prune-output.txtcat` remain untracked and intentionally not committed.

#### Context Files Updated
- `SLATE360_PROJECT_MEMORY.md` — this handoff.
- `docs/site-walk/SITE_WALK_V1_3_ACT_WORKFLOW_PLAN.md` — Prompt 10N row.
- `slate360-context/ONGOING_ISSUES.md` and `ops/bug-registry.json` — BUG-039/BUG-040.

#### Next Steps (ordered)
1. Mobile-test the full capture/data/review flow on iPhone and Android and verify pin preview file types.
2. Extract `useCaptureItems.ts` below 250 lines and add an explicit `flushDraft()` that `Save & Finish Walk` can await before routing.
3. Continue visual polish on the Visual capture rails/buttons if the new Slate/cobalt pass still feels too dense in hand.

### Session Handoff — 2026-04-30 (Canvas Extraction + Throttling)

#### What Changed
- `components/site-walk/capture/PhotoMarkupCanvas.tsx` — reduced from 299 lines to 82 lines; now focuses on rendering the image, SVG shapes, pins, text editor, and selection controls.
- `components/site-walk/capture/useMarkupCanvasState.ts` — added extracted canvas state/hook for tools, selected/editing state, pan/zoom, pointer handlers, undo/redo, draft pins, shape edits, and markup emission.
- `components/site-walk/capture/markupCanvasGeometry.ts` — added shared geometry helpers/constants for markup coordinate space, shape construction, movement, resizing, clamping, and distance math.
- `useMarkupCanvasState.ts` — coalesces pointer movement through `requestAnimationFrame`; active draw/drag/pan gestures update visual state at frame cadence and parent `onMarkupChange` only flushes at gesture end or discrete edits.
- `docs/PERFORMANCE_AUDIT_2026-04-29.md` — marked canvas extraction, pointer throttling, and gesture-end save flushing as implemented.

#### What's Broken / Partially Done
- Needs real-device smoke test on iPhone/Android: capture a photo, draw freehand, draw box/circle/arrow/text, drag a saved shape, resize/delete, undo/redo, long-press a file pin, then Next/Back.
- `bash scripts/check-file-size.sh` still exits 1 due to known pre-existing oversized files, but the touched canvas files are all under 300 lines (`PhotoMarkupCanvas.tsx` 82, `useMarkupCanvasState.ts` 279, `markupCanvasGeometry.ts` 50).
- The user-uploaded reference image `public/uploads/marked up.jpg` and `ts-prune-output.txtcat` remain untracked and intentionally not committed.

#### Context Files Updated
- `SLATE360_PROJECT_MEMORY.md` — this handoff.
- `docs/PERFORMANCE_AUDIT_2026-04-29.md` — implementation status for canvas extraction/throttling.

#### Next Steps (ordered)
1. Mobile-test the full Site Walk capture/markup/pin/Next/Back workflow on iPhone and Android.
2. If mobile markup still feels heavy, replace freehand point arrays with mutable SVG path rendering during drag and commit the final point array only on pointer up.
3. Continue P1 performance work: split/lazy-load heavy widgets, split `LocationMap`, lazy-load 360/model viewers, and add route bundle budgets.

### Session Handoff — 2026-04-30 (Capture Compression + Lazy Shell)

#### What Changed
- `lib/site-walk/image-compression.ts` — added fail-safe client-side capture downscaling/compression with `createImageBitmap` orientation support, canvas JPEG output, and original-file fallback when decode/compression is unsupported or not smaller.
- `components/site-walk/capture/CameraViewfinder.tsx` — now compresses/downscales selected camera/gallery images before creating the object URL, optimistic item, and `savePhoto` upload/offline queue payload.
- `components/dashboard/AppShell.tsx` — lazy-loads `CommandPalette` only after Cmd/Ctrl+K/search opens it and lazy-loads `InviteShareModal` only while invite/share is open.
- `docs/PERFORMANCE_AUDIT_2026-04-29.md` — marked the Site Walk image compression and app-shell modal/palette lazy-loading quick wins as implemented.

#### What's Broken / Partially Done
- Gemini Prompt 2 (`PhotoMarkupCanvas` extraction/throttling/debounced persistence) is still pending; `components/site-walk/capture/PhotoMarkupCanvas.tsx` remains at 299 lines and should be extracted before any new logic is added.
- `bash scripts/check-file-size.sh` still exits 1 because of 12 known pre-existing oversized files; touched files are under the 300-line limit (`image-compression.ts` 50, `CameraViewfinder.tsx` 246, `AppShell.tsx` 192).
- Needs real-device smoke test on iPhone/Android: capture a large camera photo, confirm preview appears, markup/pins work, upload completes, and Files still lists pinned uploads.
- The user-uploaded reference image `public/uploads/marked up.jpg` and `ts-prune-output.txtcat` remain untracked and intentionally not committed.

#### Context Files Updated
- `SLATE360_PROJECT_MEMORY.md` — this handoff.
- `docs/PERFORMANCE_AUDIT_2026-04-29.md` — implementation status for image compression and lazy shell quick wins.

#### Next Steps (ordered)
1. Mobile-test capture compression on real iPhone/Android camera images and verify no HEIC/WebView decode regressions; fallback should preserve capture if compression is unsupported.
2. Implement Gemini Prompt 2 as a separate extraction: create `useMarkupCanvas.ts`, move gesture/save logic out of `PhotoMarkupCanvas`, throttle pointer updates with `requestAnimationFrame`, and debounce/flush markup persistence.
3. Continue P1 performance work: split/lazy-load heavy widgets, split `LocationMap`, lazy-load 360/model viewers, and add route bundle budgets.

### Session Handoff — 2026-04-29 (Performance Audit + Telemetry Throttle)

#### What Changed
- `docs/PERFORMANCE_AUDIT_2026-04-29.md` — added a paranoid performance audit covering App Shell, Site Walk capture, Design Studio, 360 Tours, Content Studio, PWA/App Store wrapper reality, ranked risks, quick wins, and a second-opinion prompt for another AI assistant.
- `components/providers/PostHogProvider.tsx` — disabled PostHog `autocapture` by default and disabled page-leave capture; autocapture is now opt-in through `NEXT_PUBLIC_POSTHOG_AUTOCAPTURE=true`.
- `sentry.client.config.ts`, `sentry.server.config.ts`, and `sentry.edge.config.ts` — lowered default Sentry trace sample rate from 1.0 to 0.1 with env overrides; client replay-on-error default also lowered to 0.1.
- Static audit found 372 client components and large active performance hotspots: `LocationMap.tsx` 1892 lines, `DashboardWidgetRenderer.tsx` 547, `PhotoMarkupCanvas.tsx` 299, plus heavy 360/model/media modules that need lazy-loading and throttling before App Store packaging.
- Build stability guard was started and reached production build/type validation; it emitted known Sentry instrumentation and webpack large-string warnings. Re-check terminal output before relying on final status.
- `components/site-walk/capture/useCaptureItems.ts` — initial server item load now merges into the current local optimistic list instead of replacing it, preventing a just-captured active photo from disappearing while upload/reconciliation is in flight.
- `components/site-walk/capture/PhotoAttachmentPins.tsx` — file upload now auto-saves the pin, updates visible local pins immediately, uses a larger blue paperclip marker, and keeps markers aligned with the zoom/pan transform.
- `components/site-walk/capture/PhotoMarkupCanvas.tsx` — passes the current canvas transform to pinned-file markers.
- `components/site-walk/capture/DataContextView.tsx` — changed the fallback copy from angle-first to photo-first and added a `Done with this photo` primary action so users are not forced into another angle/photo.
- `ops/bug-registry.json` and `slate360-context/ONGOING_ISSUES.md` — logged/fixed BUG-038 for missing pinned files and forced angle flow.
- `docs/site-walk/SITE_WALK_V1_3_ACT_WORKFLOW_PLAN.md` — added Prompt 10M audit row for pinned files and optional next-photo flow.
- `components/site-walk/capture/VisualCaptureView.tsx` — removed the dedicated black right-side notes/swipe bar from the capture canvas and changed the chevron into a small translucent overlay button on top of the photo area.
- `components/site-walk/capture/PhotoMarkupCanvas.tsx` — stopped markup autosave from re-firing on parent rerenders and stopped local canvas state from resetting when optimistic item metadata changes; it now emits on local shape changes and resets only when the displayed image changes.
- `components/site-walk/capture/CameraViewfinder.tsx` — preserves the active blob preview when upload reconciliation swaps the optimistic local item to the saved server item, avoiding revoked-preview flicker/blanking.
- `components/shared/paged-workspace/PagedWorkspace.tsx` and `app/site-walk/(act-2-inputs)/capture/_components/CaptureClientIsland.tsx` — added `swipeEnabled` and disabled swipe paging in capture task mode so Visual/Data navigation uses explicit Next/Back controls.
- `ops/bug-registry.json` and `slate360-context/ONGOING_ISSUES.md` — logged/fixed BUG-037 for mobile capture canvas resets.
- `docs/site-walk/SITE_WALK_V1_3_ACT_WORKFLOW_PLAN.md` — added Prompt 10K/10L audit rows for mobile stability and capture overlay cleanup.

#### What's Broken / Partially Done
- App Store/native wrapper performance is not solved by packaging alone. If the app remains a WebView wrapper, it still needs image compression, lazy-loaded heavy modules, telemetry throttling, background upload design, and mobile performance tests.
- High-priority performance follow-ups: dynamic import command palette/invite modal, lazy-load heavy widgets, split `LocationMap`, compress Site Walk capture previews, throttle canvas pointer updates, disable model auto-rotate by default, and add route bundle budgets.
- Needs real-device smoke test: long-press photo, upload a file, confirm the blue paperclip appears immediately, then open Files and confirm the pin/file is listed.
- Needs real-device smoke test on iPhone/Android: capture a photo, draw markup, move/resize/delete markup, long-press a pin, save a pin, press Next, then Back.
- Existing mobile HTTP smoke script failed on stale homepage hero-copy expectation, not on the Site Walk capture changes.
- Progress still derives from current same-location session items, not historical cross-walk media.
- The user-uploaded reference image `public/uploads/marked up.jpg` remains untracked and intentionally not committed unless requested.
- `components/site-walk/capture/PhotoMarkupCanvas.tsx` is 299 lines; future changes should extract before adding more logic.

#### Context Files Updated
- `SLATE360_PROJECT_MEMORY.md` — this handoff.
- `docs/PERFORMANCE_AUDIT_2026-04-29.md` — performance audit and second-opinion prompt.
- `docs/site-walk/SITE_WALK_V1_3_ACT_WORKFLOW_PLAN.md` — Prompt 10M audit row.
- `ops/bug-registry.json` and `slate360-context/ONGOING_ISSUES.md` — BUG-038.

#### Next Steps (ordered)
1. Re-check the background build guard terminal and record whether it passed or failed.
2. Mobile-test pinned-file flow and `Done with this photo` flow with a real camera image on a phone.
3. Start P0 performance fixes: Site Walk image compression + `PhotoMarkupCanvas` extraction/throttling, then App Shell lazy-loading.

### Session Handoff — 2026-04-29 (Angular Capture Rails)

#### What Changed
- `components/site-walk/capture/VisualCaptureView.tsx` — made Stops, Angles, and Progress rails full-width, square/angular, black translucent (`bg-black/75`) sections with stronger `border-y-2 border-white/25` outlines.
- `components/site-walk/capture/VisualCaptureView.tsx` — changed thumbnail tiles to square/angular buttons and removed all visible thumbnail names by default; first tap reveals the label, second tap opens/selects the item.
- `components/site-walk/capture/VisualCaptureView.tsx` — removed `Next` placeholder tiles from all three rails; rails now contain thumbnails plus Add actions only where applicable.
- `docs/site-walk/SITE_WALK_V1_3_ACT_WORKFLOW_PLAN.md` — added Prompt 10H audit row for angular full-width rails.

#### What's Broken / Partially Done
- The Add stop action still uses the same camera capture path as adding another capture item; true stop modeling remains pending.
- Progress still derives from current same-location session items, not historical cross-walk media.
- The user-uploaded reference image `public/uploads/marked up.jpg` remains untracked and intentionally not committed unless requested.

#### Context Files Updated
- `SLATE360_PROJECT_MEMORY.md` — this handoff.
- `docs/site-walk/SITE_WALK_V1_3_ACT_WORKFLOW_PLAN.md` — Prompt 10H audit row.

#### Next Steps (ordered)
1. Mobile-test thumbnail behavior: first tap reveals the name; second tap opens/selects the photo/stop.
2. Tune rail heights if the full-width angular sections crowd the bounded capture canvas on shorter phones.
3. Wire real Stops and historical Progress data sources.

### Session Handoff — 2026-04-29 (Capture Carousel Semantics + Markup Editing)

#### What Changed
- `components/site-walk/capture/VisualCaptureView.tsx` — changed Last Location, Angles, and Progress from button-like pills inside each carousel into plain labels above each black horizontal thumbnail scroll bar.
- `components/site-walk/capture/VisualCaptureView.tsx` — removed the redundant plus button between Markup and Files; only Angles/Progress keep plus actions for adding angle/progress captures.
- `components/site-walk/capture/VisualCaptureView.tsx` — changed the top center Photos-only control into a dropdown for future project attachment, and changed the top-right current-location control into a Next button for moving to data entry.
- `components/site-walk/capture/PhotoMarkupCanvas.tsx` — newly drawn shapes and text now immediately switch into Select mode and become selected so users can move, resize, edit text, or delete after drawing.
- `docs/site-walk/SITE_WALK_V1_3_ACT_WORKFLOW_PLAN.md` — added Prompt 10G audit row for this correction.

#### What's Broken / Partially Done
- The Photos-only dropdown is visual/semantic only for now; actual attach-to-field-project behavior still needs data wiring.
- Progress thumbnails still derive from current same-location session items; true historical progress/before-after fetch remains pending.
- The user-uploaded reference image `public/uploads/marked up.jpg` remains untracked and intentionally not committed unless requested.

#### Context Files Updated
- `SLATE360_PROJECT_MEMORY.md` — this handoff.
- `docs/site-walk/SITE_WALK_V1_3_ACT_WORKFLOW_PLAN.md` — Prompt 10G audit row.

#### Next Steps (ordered)
1. Mobile-test creating a box/circle/arrow/text shape, then confirm it is immediately selected and can be moved/resized/deleted.
2. Wire the Photos-only dropdown to attach an ad-hoc walk to a real field project.
3. Wire true Stops and historical Progress data sources instead of deriving both from current photo items only.

### Session Handoff — 2026-04-29 (VisualCaptureView Sketch Alignment)

#### What Changed
- `components/site-walk/capture/VisualCaptureView.tsx` — revised the mobile visual capture layout to match the clarified marked-up JPEG: top controls are non-overlay buttons/dropdowns, Stops/Angles/Progress are three separate black rectangular horizontal carousels with thumbnails, and the capture/photo area is a bounded middle region between the top carousel and bottom carousel stack.
- `components/site-walk/capture/VisualCaptureView.tsx` — moved attachments and markup into a dedicated non-overlay action row, kept the notes chevron as a bounded side rail, and preserved ghost alignment, markup, attachment sheet, camera/upload, and item selection callbacks.
- `docs/site-walk/SITE_WALK_V1_3_ACT_WORKFLOW_PLAN.md` — added Prompt 10F audit row for the sketch-alignment pass.

#### What's Broken / Partially Done
- The user-uploaded reference image `public/uploads/marked up.jpg` is untracked and intentionally not committed unless requested.
- File-size guard still fails on unrelated pre-existing oversized files; `VisualCaptureView.tsx` is 175 lines and under the limit.

#### Context Files Updated
- `SLATE360_PROJECT_MEMORY.md` — this handoff.
- `docs/site-walk/SITE_WALK_V1_3_ACT_WORKFLOW_PLAN.md` — Prompt 10F audit row.

#### Next Steps (ordered)
1. Visually verify `/site-walk/capture?session=...` on a real phone/mobile viewport against the marked-up JPEG.
2. If the bounded capture area is too short/tall, tune the fixed carousel/action-row heights while keeping all controls non-overlay.
3. Wire true Stops/Progress data sources when the backend stop/history model is ready.

### Session Handoff — 2026-04-29 (VisualCaptureView Verification)

#### What Changed
- No production code changed. Verified commit `0785724` is on `main` and `origin/main`, Vercel lists the latest production deployment as Ready, and `components/site-walk/capture/VisualCaptureView.tsx` remains 194 lines with the locked-in visual capture layout.

#### What's Broken / Partially Done
- If the UI appears unchanged, likely causes are cached browser/PWA bundle, viewing a non-Act-2/legacy capture route, or testing before an active photo exists. Most new controls appear after `activeItem` is present.
- Existing repo file-size guard still fails on unrelated pre-existing oversized files; `VisualCaptureView.tsx` is under the 300-line limit.

#### Context Files Updated
- `SLATE360_PROJECT_MEMORY.md` — verification handoff only.

#### Next Steps (ordered)
1. User should hard-refresh/clear PWA site data and confirm they are on `/site-walk/capture?session=...` with an active captured photo.
2. If a marked-up screenshot is provided, visually inspect it and translate the sketch into exact component/Tailwind layout changes.
3. If needed, add a visible build/version marker or temporary debug label to confirm the deployed bundle being viewed.

### Session Handoff — 2026-04-29 (VisualCaptureView Lock-in)

#### What Changed
- `components/site-walk/capture/VisualCaptureView.tsx` — locked the screen to a strict zero-scroll layout: outer container is `flex h-[100dvh] w-full flex-col overflow-hidden`, the photo canvas `<main>` uses `flex-1 min-h-0 overflow-hidden`, and the three horizontal carousels (Locations top, Angles bottom 1, Progress bottom 2) all use `overflow-x-auto whitespace-nowrap no-scrollbar`.
- `components/site-walk/capture/VisualCaptureView.tsx` — added a floating bottom-left `📎 Attachments ({count})` button overlaid on the image canvas. It opens an in-canvas bottom-sheet (`AttachmentsSheet`) listing every pinned attachment with a trash icon to remove it from state via `onAttachmentPinsChange`. Removed the legacy inline `PinnedFileStrip` chips.
- Pinch/zoom, pan, and long-press → drop pin + open file picker continue to be handled inside the existing `PhotoMarkupCanvas` + `PhotoAttachmentPins` modal, so the React state and visual layout requested by the prompt are now in place without backend wiring changes.

#### What's Broken / Partially Done
- The Attachments bottom sheet is read-only summary plus removal; opening it does not yet jump-scroll the canvas to the pin's coordinates.
- No Locations data source yet — the top Locations carousel still derives from `photoItems`; a true session "stops" model is pending.
- Progress carousel still derives from items in the current session; cross-walk historical media at the same location is still pending a backend fetch.

#### Context Files Updated
- `SLATE360_PROJECT_MEMORY.md` — this handoff.

#### Next Steps (ordered)
1. Visually verify the screen on a real mobile viewport: no document scroll, photo canvas fills, carousels swipe horizontally, attachments sheet opens above the canvas.
2. Wire the Locations carousel to a real `walk_stops` model and the Progress carousel to historical media at the same location.
3. Add jump-to-pin behavior so tapping an entry in the Attachments sheet pans/zooms the canvas to that pin.

### Session Handoff — 2026-04-28 (Compact 2x2 App Launcher)

#### What Changed
- `components/dashboard/command-center/CommandCenterContent.tsx` — reduced the top app launcher row from a large half-screen allocation to a compact fixed-ratio section so the home screen no longer has excessive whitespace above Quick Resume.
- `components/dashboard/command-center/AppsGrid.tsx` — changed the launcher to a compact 2×2 grid with all four planned apps represented in order: Site Walk, 360 Tours, Design Studio, Content Studio. Site Walk is now always clickable during development instead of being disabled by standalone subscription flags; future apps remain visible as coming-soon/available tiles.
- `slate360-context/DASHBOARD.md` — documented the compact 2×2 app launcher rule.

#### What's Broken / Partially Done
- The launcher still uses coming-soon/available labels for apps that are not fully launched or not enabled; the product copy can be refined later.
- Quick Resume still uses static navigation cards rather than real recent-files/drafts/project data.

#### Context Files Updated
- `slate360-context/DASHBOARD.md` — recorded compact 2×2 launcher behavior.
- `SLATE360_PROJECT_MEMORY.md` — this handoff.

#### Next Steps (ordered)
1. Review `/dashboard` on mobile and desktop to confirm the 2×2 launcher is the right height and Site Walk opens correctly.
2. Decide whether future app tiles should say `Soon`, `Available`, or `Locked` based on subscription/product state.
3. Wire Quick Resume to real recent activity data when ready.

### Session Handoff — 2026-04-28 (Slate360 Zero-Scroll App Shell)

#### What Changed
- `components/dashboard/AppShell.tsx` — kept the existing top headers unchanged, converted the authenticated shell frame to fixed `100dvh` with hidden page overflow, and wrapped shell children in a `min-h-0 flex-1 overflow-hidden` content pane so the PWA behaves more like a native app viewport.
- `components/walled-garden-dashboard.tsx` — changed the Command Center page wrapper to fill the shell viewport instead of adding normal document/page scroll padding.
- `components/dashboard/command-center/CommandCenterContent.tsx` — replaced the vertically stacked dashboard sections with a zero-scroll two-row layout: app launcher on top and horizontal Quick Resume carousel below.
- `components/dashboard/command-center/AppsGrid.tsx` — changed app cards into centered, thumb-friendly square tiles using flex wrap so odd app counts center naturally.
- `components/shared/MobileBottomNav.tsx` — aligned platform mobile tabs to the requested blueprint: Home, Projects, SlateDrop, More; the top header was not modified.
- `slate360-context/DASHBOARD.md` — documented the zero-scroll shell rule, Command Center layout, and updated bottom-nav direction.

#### What's Broken / Partially Done
- The shell now hides document-level vertical overflow for authenticated pages; long-form pages that still assume body scrolling may need follow-up internal pane/tab/horizontal-rail work.
- The Command Center Quick Resume carousel currently uses truthful navigation cards/empty-state entry points, not real populated recent files/draft deliverables data yet.
- Build passes with pre-existing warnings only: Sentry client config rename warning, webpack cache large-string warnings, and Next ESLint plugin warning.

#### Context Files Updated
- `slate360-context/DASHBOARD.md` — recorded the zero-scroll native-app shell blueprint and bottom-nav changes.
- `SLATE360_PROJECT_MEMORY.md` — this handoff.

#### Next Steps (ordered)
1. Smoke test `/dashboard` on mobile PWA viewport: confirm no vertical body scroll, top header unchanged, app tiles fit top half, Quick Resume swipes horizontally, and bottom nav stays fixed.
2. Audit `/projects`, `/slatedrop`, `/more`, and `/settings` under the fixed shell and convert any clipped long pages to internal panes or horizontal workspaces.
3. Wire Quick Resume carousel to real recent files, draft deliverables, active projects, and active work when the data contracts are ready.
4. Apply a similar zero-scroll blueprint to the Site Walk app home when the Site Walk-specific blueprint is provided.

### Session Handoff — 2026-04-28 (Capture Rail Optimization + Cobalt Palette)

#### What Changed
- `components/site-walk/capture/VisualCaptureView.tsx` — removed the separate top header/title/Notes button so the first visible control is the horizontal Stops rail; moved Back, undo, and redo into that rail; added blank outlined next-stop placeholder, scroll-edge arrows, backend-backed thumbnails for saved photos, cobalt active states, and a matching compact Progress rail with Ghost Align hidden until progress content exists.
- `components/site-walk/capture/CameraViewfinder.tsx` — removed the visual-mode upload/status message below the photo and replaced it with a compact over-photo spinner/check upload badge; retained normal status messaging for non-visual/full capture mode.
- `components/site-walk/capture/PhotoMarkupCanvas.tsx` and `PhotoMarkupControls.tsx` — improved pre-markup pinch/wheel zoom and pan, moved undo/redo control wiring out to the top rail via canvas events, changed selected markup glow/text editor to cobalt, and extracted overlay controls so the active canvas file stays under 300 lines.
- `components/site-walk/capture/PhotoAttachmentPins.tsx`, `UnifiedVectorToolbar.tsx`, `CaptureItemForm.tsx`, `SyncQueueIndicator.tsx`, and `PlanViewer.tsx` — removed remaining active capture yellow/gold/amber/green styling in favor of cobalt/slate/rose semantics; plan markup pins now default to blue.
- `DESIGN.md`, `docs/site-walk/SITE_WALK_MASTER_ARCHITECTURE.md`, and `docs/site-walk/SITE_WALK_V1_3_ACT_WORKFLOW_PLAN.md` — corrected stale Industrial Gold guidance to the current cobalt app-shell palette and recorded Prompt 10E (`fe6fc8a`).

#### What's Broken / Partially Done
- The Progress rail is still inferred from same-location photo items; no first-class `progress_parent_item_id` / timeline schema yet.
- The top Stops rail now has backend-backed thumbnails, but if `/api/site-walk/items/[id]/image` fails for an old/missing file it will still fall back to the icon placeholder.
- No authenticated mobile browser smoke was run because the session had no logged-in browser context; validation was code/build/storage focused.

#### Context Files Updated
- `DESIGN.md` — corrected Slate360 primary accent from stale Industrial Gold to cobalt.
- `docs/site-walk/SITE_WALK_MASTER_ARCHITECTURE.md` — recorded compact rails, cobalt capture controls, and upload badge.
- `docs/site-walk/SITE_WALK_V1_3_ACT_WORKFLOW_PLAN.md` — added Prompt 10E with commit `fe6fc8a`.
- `SLATE360_PROJECT_MEMORY.md` — this handoff.

#### Next Steps (ordered)
1. Phone smoke test `/site-walk/capture`: capture a photo, verify pinch/zoom before Start Markup, long-press attachment pin modal, upload badge spinner/check, and saved-stop thumbnail reopening.
2. Verify Progress rail UX with at least two same-location captures and confirm Ghost Align only appears after timeline content exists.
3. Add first-class stop/angle/progress timeline relationships in schema instead of same-location inference.
4. Render progress timeline groups and photo attachment pins in deliverables and `/site-walk/walks/[sessionId]`.

### Session Handoff — 2026-04-28 (Branded Capture Controls + Timeline)

#### What Changed
- `components/site-walk/capture/VisualCaptureView.tsx` — changed the top post-photo rail to `Location Stops`, removed green/emerald primary controls, moved the UI to Slate360 dark glass with Industrial Gold accents, added an over-photo right chevron for Notes, added explicit `Start markup` gating, and added a horizontal `Progress timeline` strip with `Add progress` plus ghost alignment.
- `components/site-walk/capture/CameraViewfinder.tsx` — passed the markup-enabled state into the photo canvas, defaulted new photos to select/navigation mode, removed the visual-mode `Ready to capture` status strip unless there is an active status, and rethemed capture controls to gold/dark glass.
- `components/site-walk/capture/PhotoMarkupCanvas.tsx` — added pinch/zoom/pan navigation mode, kept long-press attachments, added undo/redo above the photo, preserved selectable/movable/resizable markup when markup mode is enabled, and rethemed selected markup glow/text editor to Industrial Gold.
- `components/site-walk/capture/UnifiedVectorToolbar.tsx`, `PhotoAttachmentPins.tsx`, `DataContextView.tsx`, `lib/types/site-walk-capture.ts`, and `useCaptureItems.ts` — rethemed markup/attachment controls, added progress-oriented classifications, and added an auto-filled captured timestamp on the notes/data step.

#### What's Broken / Partially Done
- `Progress timeline` is currently inferred from same-location photo items; it does not yet persist a first-class timeline relationship like `progress_parent_item_id`.
- `Add progress` opens the camera and enables ghost alignment, but the saved progress photo still lands as a regular photo item until the timeline relationship/schema is added.
- Deliverables and the office live board still need to render progress timeline groups and photo attachment pins.

#### Context Files Updated
- `docs/site-walk/SITE_WALK_MASTER_ARCHITECTURE.md` — recorded branded capture controls and progress timeline.
- `docs/site-walk/SITE_WALK_V1_3_ACT_WORKFLOW_PLAN.md` — added Prompt 10D completion row.
- `SLATE360_PROJECT_MEMORY.md` — this handoff.

#### Next Steps (ordered)
1. Smoke test phone capture: take one photo, pinch/zoom without drawing, tap Start markup, draw/select/move/undo/redo, then tap the right chevron to Notes without adding another angle.
2. Test Add progress with Ghost Align on a same-location item and verify the new photo appears in the timeline/angle rail.
3. Add a real progress/timeline DB relationship and deliverable renderer support.
4. Render attachment pins and progress timelines in `/site-walk/walks/[sessionId]`.

---

### Session Handoff — 2026-04-28 (Field Capture Visual Polish)

#### What Changed
- `components/site-walk/capture/VisualCaptureView.tsx` — removed the bulky post-photo chrome, added a dark/glassy high-contrast field UI, added a top stop thumbnail strip with title overlays, kept a lower current-location angle strip, added a swipe/right-to-notes CTA, and added removable pinned-file chips below the angle strip.
- `components/site-walk/capture/PhotoMarkupCanvas.tsx` — changed photo rendering to fill the available frame with portrait/landscape detection, added selectable markup objects, move/resize/delete controls, inline editable text, and long-press photo pin creation.
- `components/site-walk/capture/PhotoAttachmentPins.tsx` and `lib/site-walk/photo-attachments.ts` — added photo attachment pin metadata helpers and a pin modal that uploads/finalizes up to four 25MB files per pin with label/note metadata.
- `components/site-walk/capture/CameraViewfinder.tsx`, `CaptureClientIsland.tsx`, `useCaptureItems.ts`, and `lib/types/site-walk-capture.ts` — wired selected saved photos back into the markup surface, persisted attachment pins through item `metadata`, and kept markup persistence intact.
- `components/site-walk/capture/UnifiedVectorToolbar.tsx` and `app/api/site-walk/upload/route.ts` — moved capture controls away from navy/blue styling and expanded Site Walk uploads to common document types with a 25MB cap.

#### What's Broken / Partially Done
- The top strip distinguishes stops and the lower strip scopes angles by current location, but there is still no first-class `angle_of_item_id` relationship in the database; true multi-angle grouping should be added later.
- Attachment pins store metadata on the Site Walk item and upload files to SlateDrop, but deliverable rendering and office live preview do not yet render those pin attachments.
- Shape editing is lightweight SVG editing, not a full Fabric/Konva editor; rotation handles and per-corner resize handles remain future polish.

#### Context Files Updated
- `docs/site-walk/SITE_WALK_MASTER_ARCHITECTURE.md` — recorded visual capture polish and photo attachment pins.
- `docs/site-walk/SITE_WALK_V1_3_ACT_WORKFLOW_PLAN.md` — added Prompt 10C completion row.
- `SLATE360_PROJECT_MEMORY.md` — this handoff.

#### Next Steps (ordered)
1. Smoke test `/site-walk/capture` on phone: take photo, verify no wasted top text, mark up, select/move/delete/edit text, and swipe/tap to notes.
2. Long-press a photo, upload up to four files, save a pin, remove a pinned chip, and verify metadata survives reload.
3. Add a real `angle_of_item_id` / stop-vs-angle data relationship so same-location stops and same-item angles are not inferred from title/location.
4. Render photo attachment pins in office live view and deliverables.

---

### Session Handoff — 2026-04-28 (Prompt 10 Realtime Office Board)

#### What Changed
- `app/site-walk/(act-2-inputs)/walks/page.tsx` — replaced the placeholder with a server-loaded Active Walks dashboard showing in-progress walks, project, person walking, elapsed time, item counts, and office drill-down links.
- `app/site-walk/(act-2-inputs)/walks/[sessionId]/page.tsx` — added a live command center route with server-authenticated session/item loading.
- `components/site-walk/live/LiveWalkView.tsx`, `MarkupImagePreview.tsx`, `live-walk-utils.ts`, and `live-walk-types.ts` — added the desktop split-pane live view grouped by Location → Item, item detail rendering, photo preview URL loading, and persisted `markup_data` SVG replay over photos.
- `components/site-walk/live/useRealtimeWalk.ts` — added scoped Supabase Realtime subscriptions for `site_walk_items` with `session_id=eq.${sessionId}` and `site_walk_sessions` with `id=eq.${sessionId}`; no org-wide realtime firehose.

#### What's Broken / Partially Done
- Active Walks board is server-loaded on navigation; the live drill-down route is realtime, but the board itself does not yet update counts live without refresh.
- Photo previews rely on `file_id` and `/api/slatedrop/download?mode=preview`; local-only/offline items appear in realtime only after they sync to the database.
- Comments, assignments, sync health rollups, and office-side support actions are not yet included in the first Prompt 10 slice.
- Higher-tier schedule/budget/RFI/submittal links remain future Prompt work.

#### Context Files Updated
- `docs/site-walk/SITE_WALK_MASTER_ARCHITECTURE.md` — recorded the office live command center.
- `docs/site-walk/SITE_WALK_V1_3_ACT_WORKFLOW_PLAN.md` — marked Prompt 10 complete with realtime scope notes.
- `SLATE360_PROJECT_MEMORY.md` — this handoff.

#### Next Steps (ordered)
1. Smoke test multiplayer: desktop `/site-walk/walks/[sessionId]` open while phone captures a photo/note; verify the item animates into the left feed.
2. Add live count/status updates to `/site-walk/walks` itself if office users keep the dashboard open.
3. Add office support actions: comment, assign, request more photos, mark blocker, and close/verify.
4. Add planned walk assignment and Project Controls links after the realtime board is verified.

---

### Session Handoff — 2026-04-28 (Prompt 10B Capture Polish)

#### What Changed
- `components/site-walk/capture/LocationPickerModal.tsx` and `CaptureClientIsland.tsx` — replaced the temporary `Move to New Location` browser prompt with a zero-scroll in-app location picker, typed location entry, and recent session locations from `sessionStorage`.
- `PhotoMarkupCanvas.tsx`, `CameraViewfinder.tsx`, `useCaptureItems.ts`, `app/api/site-walk/items/[id]/route.ts`, and Site Walk item types — serialized photo markup as `MarkupData v1` and saved it through the existing autosave/offline item patch path into `site_walk_items.markup_data`.
- `VisualCaptureView.tsx` — added a `Ghost Overlay` toggle that displays a previous same-location photo at 30% opacity for progress-photo alignment when a local preview exists.
- `app/api/site-walk/notes/format/route.ts` and `useCaptureItems.ts` — upgraded AI formatting to return/apply structured smart tags: cleaned notes, suggested classification, and suggested priority, while preserving `formattedText` for older callers.

#### What's Broken / Partially Done
- Ghost Overlay currently uses local preview URLs only; older synced photos still need a server thumbnail/read URL bridge before they can appear after reload.
- Location picker recent locations are session-local; plan-derived labels and org/project-level location history remain future polish.
- Markup persistence stores vector JSON; deliverable rendering still needs to consume that JSON and flatten/replay it into client outputs.
- Office-to-field planned walk assignment, schedule/budget/RFI/submittal links, and materialized Notes/Data SlateDrop exports remain future work after Prompt 10B.

#### Context Files Updated
- `docs/site-walk/SITE_WALK_MASTER_ARCHITECTURE.md` — recorded location picker, markup persistence, ghost overlay, and AI smart tags.
- `docs/site-walk/SITE_WALK_V1_3_ACT_WORKFLOW_PLAN.md` — added Prompt 10B completion row.
- `SLATE360_PROJECT_MEMORY.md` — this handoff.

#### Next Steps (ordered)
1. Smoke test `/site-walk/capture`: location picker, recent locations, photo markup save while offline, Ghost Overlay toggle, and AI smart-tag dropdown updates.
2. Add server-backed thumbnail/read URLs for synced photo angles so Ghost Overlay and the carousel survive reloads.
3. Render persisted `markup_data` in deliverables and any item review surfaces.
4. Resume Prompt 10: realtime office board and field-office support view.

---

### Session Handoff — 2026-04-28 (Prompt 10A Site Walk UI Foundation)

#### What Changed
- `components/shared/paged-workspace/` and `components/dashboard/AppShell.tsx` — added reusable paged workspace primitives and made `/site-walk/capture` a full-bleed task route with global mobile bottom nav/app chrome hidden.
- `app/site-walk/(act-2-inputs)/capture/_components/CaptureShell.tsx`, `CaptureClientIsland.tsx`, `components/site-walk/capture/VisualCaptureView.tsx`, `DataContextView.tsx`, and `CameraViewfinder.tsx` — replaced the primary capture composition with a zero-scroll Visual/Data two-step flow while preserving object URL previews, native file/camera input, upload/offline queue, autosave, and AI note formatting.
- `CaptureClientIsland.tsx` and `DataContextView.tsx` — added Location-first workflow: current location persistence, auto-title preview, item detail field, carry-forward classification/priority/status/assignee, `Save & New Item Same Location`, and `Move to New Location`; notes are not carried forward.
- `app/site-walk/(act-1-setup)/setup/_components/SiteWalkSetupClient.tsx` and `BrandSettingsForm.tsx` — converted setup to a paged workbook with Project, Company/Branding, Plans & Docs, Team, Deliverables, and Project Controls pages; company branding now supports logo/signature file uploads.

#### What's Broken / Partially Done
- `PhotoMarkupCanvas` shapes are still local-only and are not yet persisted into `site_walk_items.markup_data`.
- The angle carousel shows local thumbnails when available; server-loaded photo thumbnails need a later file URL bridge if older synced items must preview after reload.
- `Move to New Location` currently uses a simple browser prompt as the first fast workflow version; a polished location picker/recent locations sheet should replace it.
- Office-to-field planned walk assignment, schedule/budget/RFI/submittal links, and materialized Notes/Data SlateDrop exports remain future work after Prompt 10A.
- `bash scripts/check-file-size.sh` still fails on known pre-existing oversized files.

#### Context Files Updated
- `docs/site-walk/SITE_WALK_MASTER_ARCHITECTURE.md` — recorded the full-bleed two-step Location-first capture and setup workbook direction.
- `docs/site-walk/SITE_WALK_V1_3_ACT_WORKFLOW_PLAN.md` — added Prompt 10A completion row and commit list.
- `SLATE360_PROJECT_MEMORY.md` — this handoff.

#### Next Steps (ordered)
1. Smoke test `/site-walk/capture` on mobile: camera handoff, Visual → Data swipe/button, textarea keyboard behavior, AI format, and offline queue status.
2. Replace the temporary `Move to New Location` prompt with a proper Location picker including recent locations and plan-derived labels.
3. Persist markup shapes into `site_walk_items.markup_data` before deliverable generation depends on marked-up images.
4. Resume Prompt 10: field-office board/realtime support and office-to-field assignment planning on top of the new Location → Item → Angle model.

---

### Session Handoff — 2026-04-28 (Site Walk Duplicate Module Navigation Removal)

#### What Changed
- `components/site-walk/SiteWalkShell.tsx` — removed the remaining Site Walk segmented module nav from all active Site Walk routes; the shell now only wraps children and relies on the global authenticated app shell for header/share/settings/navigation.
- `components/site-walk/SiteWalkTopBar.tsx` and `components/site-walk/SiteWalkSegmentedNav.tsx` — deleted the unused duplicate module chrome sources so `Back to dashboard`, duplicate Site Walk Share/user icons, and `My Dashboard / Deliverables / Active Walks / Plan Room / Setup & Branding` cannot be rendered by the active shell.
- `docs/site-walk/SITE_WALK_MASTER_ARCHITECTURE.md` — documented that Site Walk must not render a second module topbar or segmented page nav above route content.

#### What's Broken / Partially Done
- If the live site still shows `Field-tested workspace`, it is not present in active `app/` or `components/` source after this fix; likely causes are an old Vercel deployment, stale browser/PWA cache, or a route outside the active Site Walk app path.
- Photo markup strokes are currently local-only in `PhotoMarkupCanvas.tsx`; persisting them into `site_walk_items.markup_data` remains a follow-up.
- Deliverable metadata display checkbox is documented/required but the Prompt 12 deliverable builder has not been implemented yet.
- Notes/Data folder exports are defined in the folder convention but not yet materialized as generated text/JSON files in SlateDrop; capture records are still stored in `site_walk_items`.
- `bash scripts/check-file-size.sh` still fails on the same 12 known pre-existing oversized files.

#### Context Files Updated
- `docs/site-walk/SITE_WALK_MASTER_ARCHITECTURE.md` — recorded the no-duplicate-module-chrome rule.
- `SLATE360_PROJECT_MEMORY.md` — this handoff.

#### Next Steps (ordered)
1. Commit and push the duplicate module navigation deletion.
2. Smoke test `/site-walk` and `/site-walk/slatedrop`: only one global header should appear; no `Back to dashboard` module topbar and no segmented Site Walk tabs should appear.
3. If production still shows `Field-tested workspace`, verify the Vercel deployment SHA and clear stale PWA/browser cache before changing more source.
4. Implement materialized Notes/Data text/JSON exports into Site Walk SlateDrop folders when file-level browsing is needed.

---

### Session Handoff — 2026-04-28 (Site Walk App Home Chrome Removal — Pushed)

#### What Changed
- `components/site-walk/SiteWalkShell.tsx` — removed the redundant Site Walk module topbar from non-full-bleed routes; `/site-walk` now relies on the global Slate360 app shell only and no longer shows the extra back/feedback/user header.
- `app/site-walk/page.tsx` and `app/site-walk/_components/SiteWalkLaunchGrid.tsx` — the Site Walk app home is now a contained, non-scrolling launcher with only three app actions: Quick Capture, Project, and SlateDrop. Removed the Field Project dropdown, Project dropdown, Plans, Photos Only, Resume, and secondary section links from the home screen.
- `app/site-walk/slatedrop/page.tsx` — added a Site Walk-specific SlateDrop picker that lists Field Projects and routes users to the project file browser for Site Walk files.
- `lib/site-walk/slatedrop-folders.ts` and `docs/site-walk/SITE_WALK_MASTER_ARCHITECTURE.md` — defined Site Walk project folder expectations: `Site Walk Files / Photos`, `Notes`, `Data`, `Plans`, and `Deliverables`.

#### Previous Session Context
- `app/site-walk/page.tsx` and `components/site-walk/SiteWalkShell.tsx` — removed the marketing/description card from the Site Walk home screen and hid the section nav on `/site-walk` so the app opens directly to action buttons.
- `app/site-walk/_components/SiteWalkLaunchGrid.tsx` — compressed the phone layout into an above-the-fold app launcher: Field Project selector, Project tools menu, Quick Capture/desktop Upload, Plans, Photos Only, and Resume. Plan Room, Deliverables, and Setup are folded into the Project menu.
- `lib/site-walk/quick-capture-launch.ts` and `components/site-walk/capture/CameraViewfinder.tsx` — quick-capture handoff now keeps an in-memory copy plus IndexedDB copy of the selected file before routing, improving phone reliability. Captures no longer default title to the file name; last non-empty title is reused for subsequent photos in the same session.
- `components/site-walk/capture/UnifiedVectorToolbar.tsx`, `PhotoMarkupCanvas.tsx`, and `PlanViewer.tsx` — added arrow markup and color choices for photo/plan markup.
- Metadata verification: `lib/site-walk/metadata.ts` collects `captured_at` on every capture, GPS when permission is granted, weather when GPS exists, and device info; `lib/site-walk/capture-item-client.ts` writes latitude/longitude/weather plus file size and MIME into the item payload. Future deliverable builders must expose an Include photo metadata checkbox for subtle timestamp/location/weather display under photos.

#### Previous Session Context
- `app/site-walk/page.tsx`, `app/site-walk/_components/SiteWalkLaunchGrid.tsx`, and deleted `app/site-walk/_components/StartWalkActions.tsx` — replaced the duplicate scroll-heavy Site Walk landing UI with one app-shell-style button grid above the fold: Field Project selector, New Field Project, Quick Capture / desktop Upload Pictures, Walk With Plans, Photos Only Walk, and Active Walks.
- `lib/site-walk/quick-capture-launch.ts`, `app/site-walk/(act-2-inputs)/capture/page.tsx`, capture shell/island props, and `components/site-walk/capture/CameraViewfinder.tsx` — Quick Capture now opens the mobile camera or desktop file picker from the original tap, stores the selected file in IndexedDB, creates the Site Walk session, routes with `launch=<id>`, consumes the file on capture load, renders the image immediately, opens the drawer, and starts background upload/offline sync.
- `app/site-walk/(act-2-inputs)/capture/_components/CaptureShell.tsx` — removed the non-interactive Camera/Plan selector that made the capture route feel like an extra step.
- `docs/site-walk/SITE_WALK_MASTER_ARCHITECTURE.md` and `docs/site-walk/SITE_WALK_V1_3_ACT_WORKFLOW_PLAN.md` — updated the blueprint/audit notes to reflect the first-tap camera/file-picker handoff and commit `c52bdb2`.

#### Previous Session Context
- `docs/site-walk/SITE_WALK_MASTER_ARCHITECTURE.md` — added the authoritative Site Walk master blueprint covering one-tap capture, Field Projects, plan rooms, tier guardrails, field-tested design, Act 1/2/3, offline queue, deliverables, and follow-ups.
- `app/site-walk/_components/StartWalkActions.tsx` and `app/site-walk/(act-2-inputs)/capture/page.tsx` — added a direct Quick Capture path that creates a session and routes to capture with camera auto-open intent.
- `components/site-walk/capture/CameraViewfinder.tsx` and `components/site-walk/capture/capture-camera-events.ts` — camera/upload can now be triggered from route intent, the active photo preview, or a plan-pin action; the active preview includes Capture Next Item / Upload Next Image controls.
- `components/site-walk/capture/PlanQuickActionMenu.tsx` — plan long-press photo action now requests the camera immediately after setting the plan target.
- `components/site-walk/capture/CaptureItemForm.tsx`, `components/site-walk/capture/useCaptureItems.ts`, `lib/types/site-walk-capture.ts`, and `lib/site-walk/offline-capture.ts` — added due date to the autosaving drawer and a dedicated dictation button using Web Speech where available with native-keyboard fallback messaging.
- `app/site-walk/layout.tsx`, `components/site-walk/SiteWalkShell.tsx`, `components/site-walk/SiteWalkTopBar.tsx`, `components/site-walk/SiteWalkSegmentedNav.tsx`, and `app/globals.css` — updated Site Walk shell toward the unified field-tested header/nav: initials/settings, Report a Bug modal, Share action, requested nav labels, and high-contrast form defaults.

#### What's Broken / Partially Done
- Photo markup strokes are currently local-only in `PhotoMarkupCanvas.tsx`; persisting them into `site_walk_items.markup_data` remains a follow-up.
- True native-app permission prompts still depend on the deployment wrapper. In the current web/PWA surface, camera/photo-library access is requested through the native file input (`capture="environment"` on mobile, normal file picker on desktop).
- Deliverable metadata display checkbox is documented/required but the Prompt 12 deliverable builder has not been implemented yet.
- Notes/Data folder exports are defined in the folder convention but not yet materialized as generated text/JSON files in SlateDrop; capture records are still stored in `site_walk_items`.
- Voice notes still use typed/native-dictated text for this drawer; raw audio backup/transcription remains a later layer.
- No service-worker HTML/CSS/JS caching was added; Prompt 9 remains strictly IndexedDB data persistence plus local object URL previews.
- `bash scripts/check-file-size.sh` still fails on the same 12 known pre-existing oversized files outside Prompt 9.

#### Context Files Updated
- `docs/site-walk/SITE_WALK_MASTER_ARCHITECTURE.md` — new master strategy blueprint from the provided prompt.
- `docs/site-walk/SITE_WALK_V1_3_ACT_WORKFLOW_PLAN.md` — recorded the Prompt 9 frictionless capture UX hotfix commit `5788313`.
- `SLATE360_PROJECT_MEMORY.md` — this handoff.

#### Next Steps (ordered)
1. Smoke test `/site-walk` on a phone viewport: only the global header plus three buttons should be visible, with no redundant Site Walk header and no page scrolling.
2. Smoke test Site Walk SlateDrop: tap SlateDrop, pick a Field Project, confirm the project file browser opens.
3. Implement materialized Notes/Data text/JSON exports into the new Site Walk folders when capture item data needs file-level browsing outside the database.
4. Persist `PhotoMarkupCanvas` shapes into item `markup_data` if saved photo markups are required before Prompt 10.
5. Add Include photo metadata checkbox when Prompt 12 deliverable builder is implemented.

---

### Session Handoff — 2026-04-27 (Site Walk Prompt 0 Reconciliation — Pushed)

#### What Changed
- `lib/types/site-walk.ts` — converted to a small barrel export so the prior 258-line contract file does not grow past the 300-line cap.
- `lib/types/site-walk-constants.ts` — added live-schema constants for session statuses/types, sync states, item/capture/upload states, deliverable types/statuses/output modes, and pin states.
- `lib/types/site-walk-core.ts`, `lib/types/site-walk-deliverables.ts`, `lib/types/site-walk-collaboration.ts`, and `lib/types/site-walk-ops.ts` — reconciled shared contracts with the live migrations: nullable `site_walk_sessions.project_id`, `is_ad_hoc`, `client_session_id`, `session_type`, `sync_state`, item offline/upload/vector fields, expanded deliverable fields, Master Plan Room sheet types, and draft pins.
- `app/api/site-walk/sessions/*` — supports ad-hoc session creation and updates for nullable project, client session ID, session type, sync state, and last sync time.
- `app/api/site-walk/deliverables/*` — accepts expanded deliverable types/statuses/output modes and writes project/output config fields; revoke now sets status `revoked`.
- `app/api/site-walk/items/*` — writes project context plus offline capture/upload/vector/tag fields.
- `app/api/site-walk/pins/*` — accepts `plan_sheet_id`, nullable `item_id`, draft pin state, label, client pin ID, and created-by fields.

#### What's Broken / Partially Done
- Prompt 2 metering guard is still next and should happen before expanding expensive upload/AI/export/realtime flows.
- `app/api/site-walk/deliverables/send/route.ts` still needs send-log rows in `site_walk_deliverable_sends` and future `email_snapshot` support when the UI produces snapshots.
- `lib/site-walk/load-deliverable.ts` still loads legacy `site_walk_deliverables.content`; normalized asset/scene/thread/response loading remains for Act 3.
- `bash scripts/check-file-size.sh` still fails on pre-existing oversized files outside this Prompt 0 change.

#### Context Files Updated
- `docs/site-walk/SITE_WALK_V1_3_ACT_WORKFLOW_PLAN.md` — marked Prompt 0 complete with implementation commit `1c3d77c` and updated stale-code notes.
- `SLATE360_PROJECT_MEMORY.md` — this handoff.

#### Next Steps (ordered)
1. Start Prompt 2: profit-margin metering guard using the modular/per-app entitlement model.
2. Wire the guard before new Site Walk upload, AI, export, send, or realtime-cost code paths expand.
3. Keep active UI isolated from `app/site-walk/_legacy_v1/`; use legacy files as reference only.

---

### Session Handoff — 2026-04-27 (Site Walk Prompt 1 Scaffold — Pushed)

#### What Changed
- `app/site-walk/layout.tsx` — added the active Site Walk module layout inside the authenticated Slate360 app shell.
- `app/site-walk/page.tsx` — added a functional high-contrast Site Walk landing page with Start Walk, setup, plans, active walks, deliverables, and assigned-work actions plus App Store mode filtering.
- `app/site-walk/(act-1-setup)/*`, `app/site-walk/(act-2-inputs)/*`, and `app/site-walk/(act-3-outputs)/*` — added Prompt 1 route-group scaffold for setup, plans, capture, walks, assigned work, and deliverables.
- `components/site-walk/capture/*` — added required modular Act 2 placeholders: `DualModeToggle`, `CameraViewfinder`, `PlanViewer`, `UnifiedVectorToolbar`, `CaptureBottomSheet`, and `SyncQueueIndicator`.
- `components/site-walk/SiteWalkSegmentedNav.tsx` — pointed module navigation at the new active routes and hid web-only tabs when `NEXT_PUBLIC_APP_STORE_MODE=true`.
- `app/(apps)/site-walk/page.tsx` — removed stale duplicate `/site-walk` route that redirected to legacy `/site-walk/home` and blocked production build.

#### What's Broken / Partially Done
- Prompt 0 was intentionally skipped by the user's green-light to start Prompt 1; stale Site Walk type/API reconciliation still remains before deeper data wiring.
- `bash scripts/check-file-size.sh` still fails on pre-existing oversized files outside the Prompt 1 scaffold; all new Prompt 1 files are under 300 lines.
- Prompt 2 must implement the profit-margin metering guard before broad upload, AI, export, messaging, or realtime-cost workflows expand.

#### Context Files Updated
- `docs/site-walk/SITE_WALK_V1_3_ACT_WORKFLOW_PLAN.md` — marked Prompt 1 complete with implementation commit `c52d2f2` and validation summary.
- `SLATE360_PROJECT_MEMORY.md` — this handoff.

#### Next Steps (ordered)
1. Run Prompt 0 reconciliation or explicitly accept deferring it before adding backend-bound UI logic.
2. Start Prompt 2 metering guard before expanding expensive Site Walk upload/AI/export/realtime paths.
3. Keep `/site-walk/capture` as a thin composition route and add future logic inside the new modular capture components.

---

### Session Handoff — 2026-04-27 (Site Walk Critical Review Corrections)

#### What Changed
- `docs/site-walk/SITE_WALK_V1_3_ACT_WORKFLOW_PLAN.md` — addressed the outside-AI critical review by adding strict mandates for modular Act 2 scaffolding, a dedicated profit-margin metering prompt, and explicit global shell vs Site Walk module shell separation.
- `docs/site-walk/SITE_WALK_V1_3_ACT_WORKFLOW_PLAN.md` — expanded the build sequence to 18 prompt waves total and added a prompt execution/audit ledger with status, commit, executable prompt, and completion-summary columns.
- `docs/site-walk/SITE_WALK_V1_3_ACT_WORKFLOW_PLAN.md` — updated Prompt 1 to require placeholder capture components before logic: `DualModeToggle.tsx`, `CameraViewfinder.tsx`, `PlanViewer.tsx`, `UnifiedVectorToolbar.tsx`, `CaptureBottomSheet.tsx`, and `SyncQueueIndicator.tsx`.
- `docs/site-walk/SITE_WALK_V1_3_ACT_WORKFLOW_PLAN.md` — added Prompt 2 for a server-side metering guard that checks entitlements, blocks over-cap uploads/AI, and records usage through Site Walk usage tables.
- `SLATE360_MASTER_BUILD_PLAN.md` — added Site Walk execution-ledger mandate, global-vs-module shell separation, required V1 metering engine, and capture scaffolding rule.

#### What's Broken / Partially Done
- This was a planning/doc correction pass only. No Site Walk implementation code was changed.
- Prompt 0 remains the first implementation step: reconcile shared types/enums and stale API route validation against the current backend.
- Prompt 1 must create the modular route/component scaffold before any heavy capture/canvas logic.
- Prompt 2 must add the metering engine before broad upload/AI workflows are expanded.

#### Context Files Updated
- `docs/site-walk/SITE_WALK_V1_3_ACT_WORKFLOW_PLAN.md` — corrected prompt sequence and audit ledger.
- `SLATE360_MASTER_BUILD_PLAN.md` — master-level mandates for scaffolding, shell separation, and metering.
- `SLATE360_PROJECT_MEMORY.md` — this handoff.

#### Next Steps (ordered)
1. Have the other AI assistant re-review the updated plan and master-plan mandates.
2. If approved, start Prompt 0 and update the ledger row when complete.
3. After every prompt, update the ledger with completion status, commit hash, exact summary, validation results, and remaining risks before starting the next prompt.

---

### Session Handoff — 2026-04-27 (Site Walk Build Plan Alignment)

#### What Changed
- `docs/site-walk/SITE_WALK_V1_3_ACT_WORKFLOW_PLAN.md` — updated the execution plan so it is explicitly compatible with the current live backend foundation and interactive deliverable schema.
- Added a backend compatibility baseline covering project-aware access, ad-hoc sessions, item/offline fields, Master Plan Room, draft pins/markup, realtime, SlateDrop bridge, deliverables, audit/read receipts, and usage metering.
- Added a Copilot-concern resolution matrix for migration drift, rich deliverables, dead buttons/App Store mode, field-office realtime, collaborator workflow, offline resilience, 100k-user scale/testability, and outside-AI review workflow.
- Replaced the short V1 priority list with a 16-prompt build plan: 14 implementation prompts plus 2 hardening prompts, including acceptance gates and validation requirements after each prompt.
- Documented estimate: 4–7 focused workdays for functional V1 if prompts run back-to-back, safer 1–2 calendar weeks with outside-AI review between prompts, plus separate 1–2 weeks for enterprise-scale load/App Store/PWA hardening.

#### What's Broken / Partially Done
- No Site Walk implementation files were changed in this planning pass.
- The Site Walk frontend/API still needs to be built against the new schema.
- Known first build blockers to resolve in Prompt 0: stale Site Walk shared types/enums, old deliverable status/type validation, ad-hoc session creation, draft pins using `plan_sheet_id`, and normalized deliverable public viewer loading.

#### Context Files Updated
- `docs/site-walk/SITE_WALK_V1_3_ACT_WORKFLOW_PLAN.md` — backend-compatible build plan and prompt sequence.
- `SLATE360_PROJECT_MEMORY.md` — this handoff.

#### Next Steps (ordered)
1. Have the other AI assistant review the updated Site Walk plan for missed features or backend incompatibilities.
2. If approved, begin Prompt 0: type/API reconciliation against current migrations before building visible UI.
3. After each implementation prompt, produce a change summary, validation results, risks, and outside-AI review checklist before continuing.
4. Keep visible Site Walk buttons functional or hidden; do not ship placeholder/dead-end actions.

---

### Session Handoff — 2026-04-27 (Foundation Maintenance + Interactive Deliverables — Pushed)

#### What Changed
- `supabase/migrations/*_remote_history_placeholder.sql` — added no-op placeholders for remote-only historical Supabase migration versions so local history mirrors production history.
- Renamed duplicate short Supabase migration filenames (`20260223_*`, `20260224_*`, `20260227_*`, `20260303_*`, `20260305_*`, `20260306_*`) to unique timestamp prefixes and repaired remote migration history accordingly.
- `supabase/migrations/20260427090000_site_walk_project_access_helpers.sql` — added collaborator-aware project access helpers, project-aware columns/backfills, and replaced Site Walk RLS so `project_members` can access scoped Site Walk records.
- `supabase/migrations/20260427091000_site_walk_master_plan_room.sql` — added project-level Master Plan Room tables (`site_walk_plan_sets`, `site_walk_plan_sheets`, `site_walk_session_plan_sheets`) and legacy plan compatibility fields.
- `supabase/migrations/20260427092000_site_walk_offline_capture_idempotency.sql` — added offline/client IDs, sync/upload state, draft pin support, and `site_walk_offline_mutations`.
- `supabase/migrations/20260427093000_site_walk_deliverable_outputs.sql` — expanded deliverables beyond PDF/report outputs and added `site_walk_deliverable_blocks` plus `site_walk_portal_boards`.
- `supabase/migrations/20260427094000_site_walk_audit_receipts_realtime.sql` — added `site_walk_activity_log`, `site_walk_read_receipts`, status-change triggers, and realtime publication/replica identity coverage.
- `supabase/migrations/20260427095000_site_walk_usage_metering.sql` — added `site_walk_usage_events`, `site_walk_usage_monthly`, and `record_site_walk_usage()`.
- `supabase/migrations/20260427100000_site_walk_interactive_deliverables.sql` — added hosted interactive deliverable assets/scenes/hotspots/threads/responses/sends so Slate360 can host PDF/email snapshots, interactive links, 360 tours, model viewers, thumbnails/navigation, overlays, and response sidebars.
- Deleted tracked zombie artifacts: `.bak` backups, `patch.js`, `.devcontainer_broken/`, and raw-upload context artifacts under `slate360-context/dashboard-tabs/`.
- `slate360-context/BACKEND.md` — documented the applied Site Walk backend foundation and validation notes.
- Commit `494c693 chore: harden backend migration foundation` is pushed to `origin/main`.

#### Strategic Decisions / Corrections
- The external AI SQL was not applied verbatim. It was corrected for repo realities: nullable ad-hoc `site_walk_sessions.project_id`, safer constraint names, explicit `WITH CHECK` policies, optional-table guards, plan-sheet-only draft pins, and migration-history recording.
- Root `.env` parse issue was fixed by correcting an over-quoted `MARKET_SCHEDULER_SECRET` value.
- Supabase CLI migration drift is now repaired. `supabase db push --dry-run --linked` reports the remote database is up to date.
- The remote database now has the Site Walk backend and interactive-deliverable migrations applied and recorded in `supabase_migrations.schema_migrations`.
- Post-push verification confirmed `main` is clean and aligned with `origin/main` at `494c693`.

#### What's Broken / Partially Done
- Backend foundation for Site Walk is now in place, but frontend/API code still needs to be built to use the new schema.
- Supabase linked lint still reports pre-existing unrelated legacy SQL function errors (missing old tables/columns like `share_tokens`, `credit_usage`, `org_storage_used_bytes`). No new Site Walk lint errors were found in the maintenance pass.
- Remaining cleanup candidates need targeted review before deletion: old `components/dashboard/MarketClient.tsx`, `components/dashboard/market/MarketRobotWorkspace.tsx`, and legacy Site Walk V1 route subtree.

#### Context Files Updated
- `SLATE360_PROJECT_MEMORY.md` — this handoff.
- `slate360-context/BACKEND.md` — applied Site Walk backend foundation and validation notes.

#### Next Steps (ordered)
1. Begin Site Walk app build against the new backend in thin slices: Act 1 shell/project setup, Master Plan Room upload/list, then Act 2 capture/offline queue.
2. Wire Site Walk APIs to `withProjectAuth()` / project-aware access helpers; avoid new org-only collaborator regressions.
3. During deliverable build, use `site_walk_deliverable_assets/scenes/hotspots/threads/responses/sends` rather than burying all interaction state in `content` JSON.
4. Schedule a separate SQL hygiene pass for unrelated legacy lint errors before they block future release gates.

---

### Session Handoff — 2026-04-27 (Site Walk Master Architecture Consolidation)

#### What Changed
- `docs/SITE_WALK_MASTER_ARCHITECTURE.md` — replaced the earlier short feature map with the consolidated authoritative Site Walk blueprint. It now captures the other AI feedback: realtime multiplayer sync, IndexedDB offline-first capture queues, tier-gated collaboration, profit-margin/storage/AI-credit guardrails, App Store feature-flag strategy, field-tested design doctrine, Slate360 shell quick actions/hubs, collaborator/subcontractor assigned-task workflow, Act 1/2/3 details, non-PDF deliverables, Cinematic Presentation Mode, SlateDrop/Coordination routing, route-group strategy, and a feature completeness checklist.
- `docs/site-walk/SITE_WALK_V1_3_ACT_WORKFLOW_PLAN.md` — updated the existing V1 3 Act plan so it explicitly defers to the master architecture and no longer reads as a camera/PDF-only plan. Added plan-or-camera start flow, long-press pinning, Oops Engine, plan layers, sync states, collaborator loop, Cinematic Mode, non-PDF outputs, App Store mode, and revised V1 build priorities.
- `SLATE360_MASTER_BUILD_PLAN.md` — added a pointer naming `docs/SITE_WALK_MASTER_ARCHITECTURE.md` as the authoritative module-level Site Walk blueprint that must stay aligned with the root master plan.

#### Strategic Decisions / Corrections
- Site Walk remains a module inside Slate360, not a separate auth/billing/file-system product.
- PDF is now explicitly a secondary output. The plan centers hosted previews, portals, Kanban/client boards, cinematic presentations, exports, and living project records.
- The `/(act-X)` route group strategy is approved for clean URLs with organized Act 1/2/3 code ownership.
- App Store mode should be a feature-flagged UI mode, not a second project. Incomplete apps/features must disappear under `NEXT_PUBLIC_APP_STORE_MODE=true`.
- Service-worker HTML/CSS/JS caching remains disabled until offline behavior is redesigned and tested on real phones after deploy; offline capture should be IndexedDB queue based.

#### What's Broken / Partially Done
- This was a documentation/strategy consolidation only. Route groups, Act 1 scaffolding, and Act 2 `/site-walk/capture` layout are not implemented yet.
- Realtime multiplayer, IndexedDB offline queues, collaborator role/schema/UI, Cinematic Mode, and App Store mode are now planned requirements but still need implementation slices.
- Pricing labels still need final product decision: code should use canonical `lib/entitlements.ts` tiers while marketing can use Site Walk Standard / Pro labels if approved.

#### Context Files Updated
- `docs/SITE_WALK_MASTER_ARCHITECTURE.md` — authoritative Site Walk architecture.
- `docs/site-walk/SITE_WALK_V1_3_ACT_WORKFLOW_PLAN.md` — execution-oriented V1 3 Act plan aligned to the master architecture.
- `SLATE360_MASTER_BUILD_PLAN.md` — pointer to Site Walk module blueprint.
- `SLATE360_PROJECT_MEMORY.md` — this handoff.

#### Next Steps (ordered)
1. Begin Act 1/2 scaffolding under `app/site-walk/(act-1-setup)`, `(act-2-inputs)`, and `(act-3-outputs)` using clean URL route groups.
2. Build the Act 2 `/site-walk/capture` visual layout first: plan-or-camera modal, dual-mode shell, plan viewer, vector toolbar, queue indicator, and keyboard-safe bottom sheet.
3. Wire existing safe APIs/SlateDrop paths before adding new realtime/offline/collaborator schema.
4. Add App Store mode feature flag before any Capacitor/App Store packaging work.

---

### Session Handoff — 2026-04-26 (Mobile Service Worker Kill Switch)

#### What Changed
- `app/sw.ts` — escalated from cache purge to a service-worker kill switch. The worker now deletes all Cache Storage entries, claims current clients, tells clients to reload, then unregisters itself. It intentionally registers no fetch handler.
- `components/providers/SWRegistrar.tsx` — registers the kill-switch `/sw.js` only until cleanup completes, then stores a local disable flag, unregisters any remaining workers, deletes browser caches, and stops re-registering the worker on later page loads.
- `app/layout.tsx` — bumped the `data-build` marker to `2026-04-26-sw-kill-v2` for live verification.
- `ops/bug-registry.json` — added `BUG-036` for the mobile unstyled white/text-only page caused by stale service-worker caches.
- `ONGOING_ISSUES.md` — added `S360-039` as a critical PWA/service-worker issue in testing.
- `slate360-context/DASHBOARD.md` — documented that service-worker caching is disabled until it can be reintroduced with a tested versioned rollout.

#### Root Cause
- Production CSS assets were reachable from Vercel, but mobile browsers could still be controlled by an older Serwist service worker using default runtime caching/precaching.
- A stale cached HTML document can reference CSS chunk filenames from a previous deploy. After the deploy retires or changes those chunks, refresh can render a mostly white text-only page because the stylesheet request no longer matches the current app shell.
- The first `NetworkOnly` purge patch improved the initial refresh, but the page still reverted after about 10 seconds on phone. That behavior matched service-worker takeover/reload timing, so the follow-up fix fully disables and unregisters the worker instead of keeping a live no-cache worker.

#### What's Broken / Partially Done
- Existing phone tabs controlled by the old service worker may need one close/reopen after deployment if the first reload is still controlled by old cached state.
- Offline fallback/offline app caching is intentionally disabled for now to protect the live design; reintroduce offline support only with explicit cache versioning and mobile refresh testing.

#### Validation
- Live production diagnostic before the patch confirmed current Vercel HTML referenced CSS files that returned HTTP 200, pointing away from missing deploy assets and toward stale client SW/cache state.
- `get_errors` on changed app files: no errors.
- `npm run typecheck`: passed.
- `npm run build`: passed with existing warnings only; first build attempt failed until the Serwist `self.__SW_MANIFEST` injection marker was restored, then passed.
- Generated `/sw.js` contains `2026-04-26-sw-kill-v2` and `SLATE360_SW_KILL_RELOAD`, and no longer includes the old `static-style-assets`, `next-static-js-assets`, or runtime caching rules.

#### Context Files Updated
- `SLATE360_PROJECT_MEMORY.md` — this handoff.
- `slate360-context/DASHBOARD.md` — PWA service-worker caching contract.
- `ONGOING_ISSUES.md` — S360-039.
- `ops/bug-registry.json` — BUG-036.

#### Next Steps (ordered)
1. Commit and push the service-worker kill-switch fix.
2. Wait for Vercel production deploy from `main`.
3. On phone, refresh once; if the page reloads once automatically, let it finish.
4. If still unstyled, close all Slate360 tabs and reopen so the old worker process is gone.
5. Verify `/`, `/dashboard`, and `/m/diag` render styled on mobile after refresh and remain styled after 10+ seconds.

---

### Session Handoff — 2026-04-26 (PWA Install Icon Branding Fix)

#### What Changed
- `app/manifest.ts` — reordered PWA icons so the PNG install assets are first and the SVG favicon is only a fallback. The manifest now prioritizes `/uploads/icon-192.png`, `/uploads/icon-512.png`, and `/uploads/icon-512-maskable.png`.
- `app/layout.tsx` — updated Next metadata icons so browser and Apple home-screen discovery see the correct PNG icons before the SVG fallback.
- `app/icon.svg`, `public/icon-v2.svg`, `public/uploads/slate360-favicon-v2.svg`, and `public/uploads/favicon.svg` — replaced the stale generic letter-S SVG artwork with the updated geometric Slate360 mark on the dark background.
- `ops/bug-registry.json` — added `BUG-035` for the stale PWA install icon issue and marked it fixed.
- `ONGOING_ISSUES.md` — added `S360-038` as a critical PWA branding issue in testing.
- `slate360-context/DASHBOARD.md` — documented the PWA icon contract so future branding updates keep manifest, metadata, app icon, favicon SVGs, and PNG install icons aligned.

#### Root Cause
- The correct PNG PWA icons already existed, but `app/manifest.ts` listed stale `/uploads/slate360-favicon-v2.svg` first.
- `app/layout.tsx`, `app/icon.svg`, and `/icon-v2.svg` still exposed stale generic-S SVG fallbacks, so some browsers/OSes could select the wrong install/home-screen icon.

#### What's Broken / Partially Done
- Existing installed PWAs may keep the old icon because iOS/Android cache home-screen icons aggressively. After deployment, remove the old Slate360 home-screen app and add it again to force the refreshed icon.
- Non-active legacy uploaded icon assets still exist for archive/design-reference purposes; active app/manifest/favicon paths have been corrected.

#### Validation
- `get_errors` on changed config/docs JSON files: no errors.
- `npm run typecheck`: passed.
- `npm run build`: passed with existing warnings only (Sentry/top-level-await, cache serialization, missing Next ESLint plugin).
- `bash scripts/check-file-size.sh`: failed only on 12 known pre-existing oversized files; this PWA icon fix did not add or enlarge app code files.
- Grep validation confirmed the old generic-S SVG path/fav-mark pattern is no longer present in active app/public icon files.

#### Context Files Updated
- `SLATE360_PROJECT_MEMORY.md` — this handoff.
- `slate360-context/DASHBOARD.md` — PWA icon asset alignment contract.
- `ONGOING_ISSUES.md` — critical PWA branding issue status.
- `ops/bug-registry.json` — structured bug record.

#### Next Steps (ordered)
1. Commit and push the PWA icon fix.
2. Wait for Vercel production deploy from `main`.
3. On a real device, delete the old installed Slate360 PWA and add it to the home screen again.
4. Confirm the installed icon shows the geometric Slate360 S mark on the dark background.

---

### Session Handoff — 2026-04-26 (SlateDrop DnD + Ops/My Account/Homepage)

#### What Changed
- `components/slatedrop/SlateDropDesktopDropZone.tsx` — NEW desktop-only drag-and-drop upload component. It uses the existing `/api/slatedrop/upload-url` → signed PUT → `/api/slatedrop/complete` flow and supports multi-file uploads plus chooser fallback.
- `app/slatedrop/[...section]/page.tsx` — wired the desktop drop zone into `/slatedrop/upload` and folder pages under `/slatedrop/[...section]` while preserving the mobile-first action assistant layout.
- `lib/server/operations-console-counts.ts` — NEW shared server count helper for pending Version 1 access, new/open feedback, and feature/function suggestion counts.
- `components/dashboard/operations-console/OperationsConsoleNav.tsx` — Operations Console cards now accept notification badges for Access Queue, Feedback Inbox, and Product Health.
- `app/(dashboard)/operations-console/page.tsx`, `components/dashboard/OperationsConsoleClient.tsx`, `app/(dashboard)/operations-console/feedback/page.tsx`, and `app/(dashboard)/operations-console/[section]/page.tsx` — wired count badges through Operations Console and expanded CEO/control-center workflow scaffolds for access extensions, app grants, pricing controls, trials, enterprise seats, product health, and systems.
- `components/dashboard/my-account/AccountControlCenterNav.tsx` — NEW Operations Console-style card launcher for My Account sections.
- `components/dashboard/MyAccountShell.tsx` — added the Account Control Center cards above the existing grouped tab rail for Profile, Security, Notifications, Organization, Billing & Apps, Data & Storage, Team Seats, and Privacy.
- `app/page.tsx` and `components/marketing-homepage.tsx` — homepage title/metadata/hero/CTA/footer copy now positions Slate360 as a connected construction app ecosystem; Site Walk-specific capture language remains in the Site Walk app card.
- `ONGOING_ISSUES.md` — updated S360-023 to `testing` because Operations Console now has roadmap-backed UI but still needs backend mutation APIs.

#### Strategic Decisions / Corrections
- Operations Console card badges now answer the user’s question: access requests, feedback, and feature/function suggestions can surface as notification indicators.
- Operations Console is still not “done”: trial extensions, app access overrides, pricing edits, and enterprise seat changes need audited backend APIs/migrations before live mutation controls are safe.
- Desktop SlateDrop drag-and-drop is now real for the new folder/action pages, but final folder ID semantics should still be reconciled with the upcoming Site Walk folder browser.
- My Account should start with a section-card control center and then fall back to focused tabs; admin-only cards remain gated.
- Homepage hero should describe the entire Slate360 ecosystem and app-bundle power, not just Site Walk field capture.

#### What's Broken / Partially Done
- Operations Console expanded UI is scaffolded for many CEO/business controls, but only Version 1 approve/revoke and feedback reading have backend actions today.
- SlateDrop desktop drop uploads work through existing upload APIs, but folder pages still use slug/path namespaces until the final `project_folders` browser is wired.
- Coordination Inbox persistence, unread bell badges, and Operations feedback reply-to-inbox flow are still pending.
- Feedback attachments are still inline JSON for small Version 1 uploads; long-term storage should move to SlateDrop/S3 signed URLs.
- `components/marketing-homepage.tsx` remains a pre-existing oversized file and should be extracted before any large future marketing redesign.

#### Validation
- `get_errors` on changed files: no errors.
- `npm run typecheck`: passed.
- `npm run build`: passed with existing warnings only (Sentry/top-level-await, cache serialization, missing Next ESLint plugin).
- `bash scripts/check-file-size.sh`: failed on 12 pre-existing oversized files, including the already-oversized `components/marketing-homepage.tsx`; all new files and modified non-legacy app files stayed under 300 lines.

#### Context Files Updated
- `SLATE360_PROJECT_MEMORY.md` — this handoff.
- `slate360-context/SLATEDROP.md` — desktop drag/drop upload behavior and remaining folder-browser gap.
- `slate360-context/DASHBOARD.md` — Operations Console badge/control-center direction, My Account direction, homepage ecosystem positioning.
- `ONGOING_ISSUES.md` — S360-023 status/evidence updated.

#### Next Steps (ordered)
1. Commit and push this slice.
2. Add audited Operations Console mutation APIs/tables for trial extension, temporary/permanent app grants, pricing/plan edits, and enterprise seat management.
3. Wire Operations Console owner replies into user-facing `/coordination/inbox` threads.
4. Replace SlateDrop slug/path folder uploads with final `project_folders`-backed destination selection in the new browser.
5. Add Coordination Inbox persistence and unread counts to desktop/mobile notification bells.
6. Extract `components/marketing-homepage.tsx` before any further large homepage changes.

---

### Session Handoff — 2026-04-26 (Version 1 Mobile Shell + SlateDrop Actions)

#### What Changed
- `components/shared/MobileTopBar.tsx` — mobile/PWA topbar now uses the cobalt Version 1 icon asset, defaults the label to `Slate360`/org name instead of `Workspace`, raises chrome stacking, routes notifications to `/coordination`, and frames feedback as Version 1 feedback.
- `components/shared/BetaFeedbackModal.tsx` — feedback modal now portals to `document.body`, uses `z-[1000]`, and shows `Submit Version 1 Feedback` so it is not blocked by shell overlays.
- `components/dashboard/AppShell.tsx`, `components/dashboard/AuthedAppShell.tsx`, `app/(dashboard)/layout.tsx` — threaded `workspaceName` from server org context into the mobile topbar.
- `app/slatedrop/page.tsx` — folder/action cards are now tappable without nested-link issues. Cards keep separate folder-preview links plus an explicit `Open folder` CTA for reliable mobile taps.
- `app/slatedrop/[...section]/page.tsx` — NEW interim destination page for folder/action routes such as `/slatedrop/general-files`, `/slatedrop/site-walk-files/photos`, and `/slatedrop/upload` while the real mobile folder browser is rebuilt.
- Version 1 public/admin copy replaced visible beta/testing language in `components/marketing-homepage.tsx`, `app/beta-pending/page.tsx`, `components/dashboard/OperationsConsoleClient.tsx`, `components/shared/BetaFeedbackButton.tsx`, `components/shared/InviteShareModal.tsx`, `components/billing/BetaGatedButton.tsx`, `app/(dashboard)/more/page.tsx`, `app/preview/page.tsx`, `app/dev/health/page.tsx`, and internal owner account panels.

#### Strategic Decisions / Corrections
- Public-facing language should say Version 1 / Version 1 launch access, not beta tester/testing. Internal code names can remain temporarily where tied to DB fields/API routes.
- Notification bell belongs to Coordination Hub; avatar menu remains the account/billing/sign-out surface.
- Do not delete old backend projects automatically. Legacy/test projects remain hidden from the new `/slatedrop` hub until explicit cleanup is approved.
- SlateDrop buttons must always lead somewhere, even if the current page is an aligned placeholder pending the real file-browser wiring.

#### What's Broken / Partially Done
- `/slatedrop/[...section]` is an aligned placeholder. Upload, Share, Send, New folder, Move, Archive, and Receive routes still need real mutations/UI.
- Project-scoped routes such as `/projects/[projectId]/slatedrop` still use old `SlateDropClient` UI and need the mobile-first replacement.
- Internal backend/API names still use beta terminology (`is_beta_approved`, `/api/admin/beta`, `useBetaUsers`) because changing schema/API names needs a separate migration/backfill plan.

#### Validation
- `get_errors` on all changed files: no errors.
- `npm run typecheck`: passed.
- `npm run build`: passed with existing warnings only (`instrumentation.ts` top-level await warning and missing Next ESLint plugin warning).
- `bash scripts/check-file-size.sh`: failed on 12 pre-existing oversized files, including `components/marketing-homepage.tsx`; no newly created file exceeds 300 lines.

#### Context Files Updated
- `SLATE360_PROJECT_MEMORY.md` — this handoff.
- `slate360-context/SLATEDROP.md` — clickable interim folder/action route behavior.
- `slate360-context/DASHBOARD.md` — mobile topbar strategy.

#### Next Steps (ordered)
1. Test the deployed PWA on phone: topbar icon, org label, feedback modal stacking, notification route, and SlateDrop card/action taps.
2. Wire `/slatedrop/[...section]` actions to real upload/create-folder/share/send flows using `project_folders` and existing SlateDrop APIs.
3. Build the mobile-first replacement for old project-scoped `SlateDropClient` routes.
4. If old backend test projects should be removed, create an explicit cleanup script/report and get approval before deleting data.

---

### Session Handoff — 2026-04-26 (SlateDrop Folder Hub Correction)

#### What Changed
- `app/slatedrop/page.tsx` — corrected the first-pass SlateDrop hub after mobile review. The previous app cards looked like launch buttons and linked toward app/work routes. The route now presents a clear folder hierarchy:
  - `General Files` with Uploads, Received, Shared, Archive.
  - Entitlement-aware app file folders: Site Walk Files, 360 Tour Files, Design Studio Files, Content Studio Files.
  - Folder previews use folder/lock icons and labels like `Folder` / `Locked`, not app-entry language.
  - Legacy/test project rows are hidden from this hub so users are not sent into the old non-mobile SlateDrop project UI.
  - A visible action grid documents the intended mobile folder actions: New folder, Upload, Save, Share, Send, Receive, Archive, Move.
- `slate360-context/SLATEDROP.md` — clarified that `/slatedrop` is now a folder-system hub, not an app launcher, and that old/test projects should not be deleted automatically without explicit confirmation.

#### Strategic Decisions / Corrections
- The SlateDrop button should open a **folder hierarchy**, not app launch cards.
- App-specific folders should communicate “these are files for this app,” not “click here to open the app.”
- Existing legacy/test projects can be hidden from the new hub; do not delete live user data without explicit user confirmation.
- The final real folder layout should be driven by the new Site Walk architecture once Site Walk is scaffolded.

#### What's Broken / Partially Done
- `/slatedrop` is now visually aligned as a folder hierarchy, but it is still a presentation/IA correction. The real mobile folder browser actions are not wired yet.
- Project-scoped routes such as `/projects/[projectId]/slatedrop` still use the old `SlateDropClient` UI and need the next redesign pass before exposing them as the main mobile path.
- App-specific physical folder provisioning still needs implementation or a virtual grouping layer.

#### Validation
- `app/slatedrop/page.tsx` line count: 159.
- `get_errors` on `app/slatedrop/page.tsx`: no errors.
- `npm run typecheck`: passed.

#### Context Files Updated
- `SLATE360_PROJECT_MEMORY.md` — this handoff.
- `slate360-context/SLATEDROP.md` — corrected current `/slatedrop` behavior.

#### Next Steps (ordered)
1. Review `/slatedrop` on mobile/PWA. Confirm it reads as a folder hierarchy, not app launch buttons.
2. Decide whether old test projects should be deleted from the database; do not delete automatically.
3. Build the real mobile SlateDrop folder browser that replaces `SlateDropClient` for project-scoped routes.
4. Let Site Walk folder requirements drive physical/virtual folder provisioning.

---

### Session Handoff — 2026-04-26 (Mobile Nav + App-Centric SlateDrop Hub + Site Walk Blueprint)

#### What Changed
- `docs/SITE_WALK_MASTER_ARCHITECTURE.md` — NEW. Saved the external AI Site Walk master blueprint as the forward source of truth for the new build. Confirms the 3 Act Play route-group structure: `/(act-1-setup)`, `/(act-2-inputs)`, `/(act-3-outputs)` under `app/site-walk/`, with clean URLs like `/site-walk/capture`.
- `components/shared/MobileBottomNav.tsx` — platform PWA bottom nav now aligns to the confirmed shell strategy: Home, My Work, SlateDrop, Coordination, More. Coordination was already present and remains a primary tab. Site Walk future nav is now Home, Capture, Files, Outputs, More.
- `components/dashboard/command-center/CommandCenterContent.tsx` — replaced `Assigned Tasks` with `My Work`; empty state copy now covers tasks, to-dos, and reviews. Coordination Hub Open action is visible on mobile and desktop.
- `app/preview/mobile-shell-v2/page.tsx` — preview shell mirrors the new bottom nav and `My Work` quick-action language.
- `app/(dashboard)/my-work/page.tsx` — NEW. Lightweight authenticated My Work landing page for assigned/created/due-soon work with real empty state and links to Projects/Coordination/Quick Start.
- `app/(dashboard)/more/page.tsx` — NEW. Authenticated More hub for Projects, SlateDrop, Coordination, My Account, Billing, App Subscriptions, and Operations Console when available.
- `app/slatedrop/page.tsx` — replaced the old project-scoped empty client with an app-centric SlateDrop hub. It now shows entitlement-aware app folder cards and project/site file spaces linking into `/projects/[projectId]/slatedrop`.
- `slate360-context/SLATEDROP.md` — updated current direction: SlateDrop is app-centric, mobile-first, entitlement-aware, and can be visually rebuilt around existing backend APIs. Added recommended per-app folder model for Site Walk, 360 Tours, Design Studio, and Content Studio.
- `slate360-context/DASHBOARD.md` — updated mobile/PWA bottom nav and Quick Action strategy.

#### Strategic Decisions Locked In
- Fourth quick action is **My Work**, not `Assigned Tasks`.
- Bottom nav is primary-daily-use only: Home, My Work, SlateDrop, Coordination, More.
- More packages secondary surfaces so the bottom nav stays clean.
- SlateDrop should not be constrained by the old visual UI. Reuse APIs/hooks/backends, but the mobile folder UX can be rebuilt around app-centric cards, folder stacks, and bottom-sheet actions.
- As users add app subscriptions, SlateDrop should reveal app-specific folder experiences without changing the underlying `project_folders` + `slatedrop_uploads` model.

#### What's Broken / Partially Done
- The new `/slatedrop` hub is a first-pass app-centric landing surface; the underlying full mobile folder browser still needs a redesigned phone-first UI for folder stack navigation, preview, save/download, rename, move, copy, delete, contacts/text/email share, and Secure Send.
- App-specific SlateDrop folders are documented but not yet auto-provisioned for every app. Existing provisioning still creates broad project folders; next step is physical or virtual `Site Walks`, `360 Tours`, `Design Studio`, `Content Studio` folder groupings.
- Collaborator file access remains incomplete: current file APIs mostly check org/uploader, not project membership + collaborator permissions.
- Site Walk route tree is not scaffolded yet. `docs/SITE_WALK_MASTER_ARCHITECTURE.md` is ready for the next build phase, but `/site-walk` is still effectively blank/placeholder after legacy archive.
- `bash scripts/check-file-size.sh` still fails on 12 pre-existing oversized files not touched by this work.

#### Validation
- `get_errors` on changed TSX files: no errors.
- `npm run typecheck`: passed.
- `npm run build`: passed with existing Sentry/top-level-await and ESLint plugin warnings.
- `bash scripts/check-file-size.sh`: failed only on the known 12 pre-existing oversized files.

#### Context Files Updated
- `SLATE360_PROJECT_MEMORY.md` — this handoff.
- `slate360-context/SLATEDROP.md` — app-centric/mobile-first SlateDrop direction and folder model.
- `slate360-context/DASHBOARD.md` — current mobile nav and `My Work` strategy.
- `docs/SITE_WALK_MASTER_ARCHITECTURE.md` — new Site Walk source-of-truth blueprint.

#### Next Steps (ordered)
1. Review `/dashboard`, `/my-work`, `/more`, `/slatedrop`, and `/preview/mobile-shell-v2` on mobile/PWA once deployed.
2. Design/build the new mobile-first SlateDrop folder browser using existing APIs, not the old visual patterns.
3. Add app-specific folder provisioning or virtual grouping for Site Walk, 360 Tours, Design Studio, and Content Studio.
4. Harden SlateDrop APIs for collaborator project-scoped access.
5. Scaffold the new Site Walk App Router route groups from `docs/SITE_WALK_MASTER_ARCHITECTURE.md` when ready.

---

### Session Handoff — 2026-04-26 (SlateDrop Audit + Shell Action Recommendation)

#### What Changed
- **SlateDrop architecture audit completed (read-only):** SlateDrop is real and mostly project-scoped. Core data model is `project_folders` + `slatedrop_uploads` + `slate_drop_links` + `unified_files` bridge. Project routes embed `SlateDropClient` with `initialProjectId`; standalone `/slatedrop` currently exists but the client shows a project-scoped empty state unless opened from a project.
- **Folder system findings:** `project_folders` is canonical. `lib/slatedrop/provisioning.ts` currently creates project system folders like Documents, Drawings, Photos, 360 Tours, RFIs, Submittals, Schedule, Budget, Daily Logs, Reports, Records, Safety, Correspondence, Closeout, Deliverables, Misc. It does **not** yet create a dedicated `Site Walk` / `Walk Sessions` hierarchy.
- **Storage/upload findings:** `/api/slatedrop/upload-url` reserves uploads with canonical S3 keys `orgs/{namespace}/{folderId}/{timestamp}_{filename}`, enforces storage quota from `getEntitlements()`, supports public upload tokens, and writes pending `slatedrop_uploads`; `/api/slatedrop/complete` activates rows and ensures a `unified_files` bridge row.
- **Share/intake findings:** Secure Send exists at `/api/slatedrop/secure-send`, request/upload links exist through `project_external_links` and `/api/slatedrop/request-link`, and project audit ZIP export exists. Full audit log/versioning/folder-level permissions are still future work.
- **Site Walk bridge findings:** `lib/site-walk/slatedrop-bridge.ts` already bridges Site Walk photo/video captures to the project `Photos` folder and deliverable PDFs to `Deliverables`; `site_walk_items.file_id` points back to `slatedrop_uploads`. `/api/slatedrop/delete` blocks deleting files linked to Site Walk captures. Remaining gap is information architecture: no per-session folder/subfolder view and no “Site Walks / Field Reports” virtual project folder.
- **Entitlement findings:** Tier entitlements and modular subscriptions exist (`lib/entitlements.ts`, `lib/entitlements-modular.ts`, `lib/server/org-feature-flags.ts`). SlateDrop is treated as a backbone/platform feature; collaborators should derive file access from project membership, but current file APIs mostly check org/uploader and do not yet implement collaborator project-scoped permissions.
- **4th Quick Action recommendation:** Replace `Assigned Tasks` with **My Work** (or **Tasks & To-Dos** if more explicit). It should aggregate assigned-to-me tasks, tasks I created/assigned, self to-dos, due-soon approvals/reviews, and project follow-ups. This avoids bias toward only recipients while still giving every user one smart work queue.
- **Coordination Hub recommendation:** Keep it globally accessible on desktop and PWA, but do not make it the 4th quick action unless the user wants communication to outrank work execution. It should have a clear Open action in mobile and desktop sections, and later a topbar/bottom-nav affordance if it becomes daily-use.

#### What's Broken / Partially Done
- SlateDrop docs are stale in places: `slate360-context/SLATEDROP.md` still says Site Walk integration is missing, but code now has `lib/site-walk/slatedrop-bridge.ts` and Site Walk item/PDF bridge helpers.
- SlateDrop project folder provisioning lacks a dedicated `Site Walk` parent with per-walk/session subfolders (`Photos`, `Voice Notes`, `Plans`, `Markup`, `Deliverables`, `Shared`).
- `SlateDropClient` is effectively project-scoped for Phase 1; standalone `/slatedrop` is still a product-pillar route but needs a clear “choose a project/site” flow or org-level root strategy.
- Collaborator file access scoping is incomplete: file APIs are mostly org/uploader scoped, not per-project membership/role scoped.
- `app/api/slatedrop/zip/route.ts` uses `const namespace = orgId ?? user.id`, while newer code uses `resolveNamespace(orgId, user.id)`; verify/fix before relying on ZIP exports.
- `app/api/slatedrop/move/route.ts` requires `newS3KeyPrefix` but ignores it and recomputes the destination key. Client still sends `orgs/default/...`; cleanup recommended.
- SlateDrop UI still uses many dark/zinc styles and may need a light-shell pass consistent with the new app shell.
- Current Command Center Quick Action still says `Assigned Tasks`; update it to `My Work` / `Tasks & To-Dos` if implementing the recommendation.

#### Context Files Updated
- `SLATE360_PROJECT_MEMORY.md` — updated latest handoff with SlateDrop audit findings and quick-action recommendation.

#### Next Steps (ordered)
1. Decide label for the 4th Quick Action: recommended **My Work**; fallback **Tasks & To-Dos**.
2. Update `components/dashboard/command-center/CommandCenterContent.tsx` and `app/preview/mobile-shell-v2/page.tsx` to replace `Assigned Tasks`, and make Coordination Hub clearly openable on mobile as well as desktop.
3. Update `slate360-context/SLATEDROP.md` to reflect the real current bridge state and the remaining “Site Walks virtual folder/session hierarchy” gap.
4. Add/adjust SlateDrop folder conventions: project root → `Site Walks` → `{walk/session}` → Photos, Voice Notes, Plans, Markups, Deliverables, Shared/Client Uploads.
5. Harden SlateDrop APIs for collaborator access by checking project membership for folder/file operations.
6. Normalize ZIP/move route namespace handling and remove ignored `newS3KeyPrefix` contract.

---

### Session Handoff — 2026-04-26 (Preview Shell Updated + Home Viewer Expand Fixed)

#### What Changed
- **Executed external AI prompt directives for Phase 1 CSS/theming:**
  - `components/ui/input.tsx` — removed `bg-transparent` + `dark:bg-input/30`; base inputs now force `bg-white text-slate-900 border-slate-300`, cobalt focus ring, and 44px min touch height.
  - `components/ui/textarea.tsx` — same explicit field-tested styling; default min height now supports voice-dictation field entry.
  - `app/globals.css` — global border/input/app-border tokens moved to slate-300; `form-field` and `auth-input` now have 44px min height.
  - `components/providers/ThemeProvider.tsx` — default theme restored to `light`; no longer clears persisted light mode. Dark chrome is handled with isolated sidebar/header styling.
  - `components/dashboard/AppShell.tsx` — authenticated shell canvas forced to `bg-slate-50 text-slate-900`.
  - `components/dashboard/command-center/DashboardSidebar.tsx` — sidebar restored to dark `bg-slate-900` and now uses the dark-background logo component (`slate360-logo-light-v3.svg`).
- **Existing audit facts still apply:** sharing is already available via `InviteShareModal`, `navigator.share`, SMS links, QR codes, and invite APIs. `/communications` route does not exist yet; internal calendar CRUD exists, but external iOS/Android/Google calendar sync is new work.
- **4th Quick Action recommendation:** best universal choice is **Search Everything / Command Center** (global search / command palette) because it serves all apps, collaborators, projects, contacts, files, deliverables, and support workflows without privileging one product. Secondary option: **Create / Request Deliverable** for converting work into shareable outputs, but it is more app/tier-specific.
- **Preview route updated:** `app/preview/mobile-shell-v2/page.tsx` now reflects the new field-tested Global App Shell direction (light canvas, slate-300 cards, cobalt action, app-neutral quick actions, Projects & Tasks / Recent Work / Communications hubs). The old dark amber shell preview is removed.
- **Home viewer expand fix:** `components/home/HeroDemo.tsx` and `components/home/AppDemo.tsx` now render fullscreen viewer overlays through a React portal to `document.body` with `z-[1000]`, `h-[100dvh]`, and `overflow-hidden`. This avoids clipping/flashing caused by ancestor overflow/stacking contexts on the marketing homepage.
- **Production Command Center updated:** `components/dashboard/command-center/CommandCenterContent.tsx` now uses the new app-neutral shell layout after login/PWA launch: search everything, app-neutral quick actions, Projects & Tasks, Recent Work & Drafts, and Communications. `AppsGrid.tsx` now shows locked/available apps without privileging Site Walk.
- **Stale preview root cause:** the original `slate360-rebuild-git-feat-ops-console-phase1-slate360.vercel.app` URL is an old branch deployment and will not update from `main`. Use `https://www.slate360.ai/preview/mobile-shell-v2` or the latest `main` deployment instead.
- **Critical mobile preview header fix:** `app/preview/mobile-shell-v2/page.tsx` no longer tries to fit the full Slate360 wordmark plus giant search bar in the phone header. Header now matches the intended mobile/PWA pattern: left = cobalt app icon only; right = Share, Search, Notifications, user initials. Main content starts lower than the compact header so the app cards are no longer cut off.
- **Second-pass mobile/PWA topbar fix:** preview and production `components/shared/MobileTopBar.tsx` now follow the clean old dev-shell pattern: icon-only Slate360 mark (`slate360-icon-cobalt.svg`), compact workspace/user dropdown text, then action icons (share, search, feedback/bug, notifications/avatar where applicable). No full wordmark and no giant search field in the mobile header.
- **Homepage demo polish:** expanded viewer close buttons are now high-contrast white circles with blue ring/shadow; hero demo inactive tabs are now dark/slate instead of white pills with blue text.
- **Final shell correction pass:** mobile preview + real PWA topbar now use the actual icon-only color asset (`/slate360-icon-color.png`) instead of the generic S/cube SVG. Mobile search is top-icon only and opens the existing `CommandPalette`; the mobile welcome text + large search section are hidden, while desktop keeps welcome/search. Redundant Quick Action "Search Everything" removed and replaced with "Assigned Tasks". Desktop sidebar now includes a Dashboard link above Projects. Communications section renamed to **Coordination Hub** with an Open action.

#### Live DB Status
All five core admin-layer migrations are **Live** and tracked on `hadnfcenpcfaeclczsmm`:
- `20260305_contacts_calendar`
- `20260421000001_brand_and_report_defaults`
- `20260423000002_canvas_markup_realtime`
- `20260424000000_admin_layer_schema_v1`
- `20260425000000_projects_location_text`

#### What's Broken / Partially Done
- **`/site-walk` is a blank slate:** Reverting legacy code to `app/site-walk/_legacy_v1/` means the main route intentionally 404s. It is ready for the external AI's new code.
- **3 API routes are pending:** We still need to build `GET/PATCH /api/org` (global settings), `GET /api/contacts/search` (typeahead), and `POST /api/projects/[id]/attach-session` (ad-hoc closure).
- **Stale PR:** The outside-AI task at `prompts/CURRENT.md` (PR #27d.2 — PDF email) targets an archived `_legacy_v1` file. **Do not apply PR #27d.2** until reconciled with the new UI.
- **App Shell visual architecture is now visible in preview and the logged-in Command Center.** Remaining work is wiring real data into the sections, deciding the final 4th Quick Action if "Assigned Tasks" is not preferred, and building the final Site Walk app-specific UI.
- **Validation note:** `npm run typecheck` passes after clearing stale `.next` route types. `bash scripts/check-file-size.sh` still fails on 12 pre-existing oversized files not touched in this task.
- **PWA note:** Installing the PWA is handled by browser/OS install UI, not the in-app Share button. iOS: Safari share sheet → Add to Home Screen. Android/Chrome: install prompt/menu → Install app/Add to Home screen. Existing home-screen shortcuts may cache old service worker output; remove/re-add or force-refresh if stale.

#### Context Files Updated
- `SLATE360_PROJECT_MEMORY.md` (This handoff).

#### Next Steps (ordered)
1. Wait for Vercel deploy of the latest `main` commit, then review `https://www.slate360.ai/preview/mobile-shell-v2?v=<latest-commit>` and logged-in `/dashboard` PWA. Confirm icon-only color logo, no redundant mobile search bars, app cards start under header, and CommandPalette opens from mobile search icon.
2. Wire real data into Command Center sections (assigned tasks, recent work/drafts, communication threads/contacts) while preserving empty states for new/collaborator users.
3. Wire the top-header/share action to the existing `InviteShareModal` provider wherever the new shell has a share icon.
4. Build the 3 pending API routes (`/api/org`, `/api/contacts/search`, `/api/projects/[id]/attach-session`).
5. Reconcile outside-AI PR #27d.2 (PDF emailing rules) against the newly generated Deliverables UI.

---

### Session Handoff — 2026-04-24 (3-Act Play Phase 1: Schema Patches + Team API + Legacy UI Archive)

#### What Changed
- `supabase/migrations/20260424000000_admin_layer_schema_v1.sql` (NEW, 138 lines) — applies all 4 §6 patches signed off today:
  - Patch 1: `organizations` += `address`, `website`, `phone`, `brand_colors text[]`.
  - Patch 2: `projects` += `location`, `address`, `scope`, `start_date`, `end_date`, `budget_total numeric(14,2)`, `client_contact_id uuid REFERENCES org_contacts(id)`, `is_archived bool`. Indexes on client_contact_id and partial index on `is_archived = false`.
  - Patch 3: `user_profiles` table (`user_id PK -> auth.users`, `full_name`, `title`, `phone`, `signature_url`, `avatar_url`, `preferences jsonb`, `updated_at`) + RLS (self-only select/insert/update) + touch-updated_at trigger.
  - Patch 4: `site_walk_sessions.project_id DROP NOT NULL` + ADD `is_ad_hoc bool default false` + partial index. Enables Act 2 Zero-Friction walks.
  - Cleanup: `DROP TABLE IF EXISTS public.org_branding CASCADE` (canonical = `organizations.brand_settings`).
  - All idempotent (`IF NOT EXISTS` / `IF EXISTS`), wrapped in `BEGIN/COMMIT`.
- `app/api/projects/[projectId]/team/route.ts` (NEW, 178 lines) — unified roster endpoint. Aggregates `project_members` (internal auth users, joined to `user_profiles`), `project_stakeholders` (external), and `project_collaborator_invites` (status='pending') into a single `TeamMember[]` array with discriminator `source: "member" | "stakeholder" | "invite"`. Uses `getScopedProjectForUser` for auth. Three queries run in parallel via `Promise.all`. Auth-user emails fetched best-effort (non-fatal if view absent).
- **Legacy UI archived:** moved every entry under `app/site-walk/*` into `app/site-walk/_legacy_v1/` via `git mv` (preserves history). 9 dirs + 1 file moved: `admin/`, `board/`, `deliverables/`, `dev/`, `home/`, `more/`, `[projectId]/`, `projects/`, `share/`, `walks/`, `layout.tsx`. `app/site-walk/` is now empty except for `_legacy_v1/`. Underscore prefix means Next.js will not route any of it — `/site-walk` now 404s by design until the new UI lands. **`app/api/site-walk/` and `lib/site-walk/` were NOT touched** (per directive).

#### Live DB Status — APPLIED 2026-04-25
All three migrations now live on `hadnfcenpcfaeclczsmm` (applied via direct `psql` against pooler `aws-1-us-west-1.pooler.supabase.com:5432` since CLI tracking was empty):
- `20260305_contacts_calendar.sql` (prerequisite — `org_contacts` was missing live, blocking the FK)
- `20260421000001_brand_and_report_defaults.sql`
- `20260423000002_canvas_markup_realtime.sql`
- `20260424000000_admin_layer_schema_v1.sql`
All four versions inserted into `supabase_migrations.schema_migrations` so future `supabase db push` won't re-run them. Verified columns: `organizations.{address,website,phone,brand_colors}` present; `projects.{address,scope,budget_total,client_contact_id,is_archived}` present; `user_profiles` table present; `site_walk_sessions.project_id` is now nullable + `is_ad_hoc` column present; `org_branding` dropped.

**⚠ Schema discrepancy noted:** `projects.location` already existed on live DB as `jsonb` (not `text`), so the `ADD COLUMN IF NOT EXISTS location text` was skipped. The column remains `jsonb`. UX must either treat location as a jsonb object (e.g. `{lat,lng,label}`) or a follow-up migration must convert it to `text`. Same for `projects.start_date` / `end_date` — those were pre-existing as `date` already, so they match the patch.

#### Side Effect to Note
The outside-AI task at `prompts/CURRENT.md` (PR #27d.2 — PDF email mode) targets `app/site-walk/deliverables/[id]/SendEmailModal.tsx`, which has now moved to `app/site-walk/_legacy_v1/deliverables/[id]/SendEmailModal.tsx`. That task's output paths must be updated, OR the task should be re-issued against the new UI once it exists. Do not apply that PR as-written until reconciled.

#### What's Broken / Partially Done
- `/site-walk` now 404s (intentional — new UI not built).
- Migration not yet pushed to live Supabase.
- No `GET/PATCH /api/org`, `GET /api/contacts/search`, `POST /api/projects/[id]/attach-session` yet (next phase).

#### Context Files Updated
- This handoff (overwrites prior 2026-04-24 audit handoff).

#### Next Steps (ordered)
1. Operator runs `supabase db push` against `hadnfcenpcfaeclczsmm` to apply pending migrations.
2. UX-lead delivers new Site Walk UI structure → build under `app/site-walk/` (fresh, not on top of `_legacy_v1/`).
3. Build `GET/PATCH /api/org` + `GET /api/contacts/search?q=` + `POST /api/projects/[id]/attach-session` to support Act 1 Global Settings, Act 2 Zero-Friction Walk attach, and contact picker.
4. Reconcile outside-AI PR #27d.2 (PDF email) against the new UI before applying.
5. Update `slate360-context/dashboard-tabs/site-walk/FEATURE_REGISTRY.md` status flags as new UI features land.

---

### Session Handoff — 2026-04-24 (Site Walk Feature Registry + Admin-Layer Backend Audit)

#### What Changed
- `slate360-context/dashboard-tabs/site-walk/FEATURE_REGISTRY.md` (NEW) — rolling, ID-stable list of every Site Walk feature across 9 sections (A Foundations · B Uploads · C Field UX · D Plans · E Deliverables · F Client Interaction · G Reports · H Canvas/Realtime · I Auth). Combines this chat's contributions (H1–H18) with the UX-lead's spec (A–G).
- `slate360-context/dashboard-tabs/site-walk/BACKEND_AUDIT.md` (NEW) — full schema audit for `organizations`, `org_contacts`, `project_stakeholders`, `project_members`, `project_collaborator_invites`, `projects` + API route inventory + 13 blocking gaps + a 4-patch migration proposal (NOT yet authored).
- `/memories/repo/site-walk-feature-registry.md` (NEW) — pointer + top-8 blockers.

#### Key Findings (read these before UX design)
- `organizations` base CREATE TABLE is NOT in `supabase/migrations/` (predates CLI). Columns added since: `credits_balance`, `stripe_customer_id`, `deliverable_logo_s3_key`, `brand_settings jsonb`.
- `address`, `website`, `brand_colors[]` are NOT first-class — only inside `brand_settings` jsonb.
- No personal-profile schema separate from org branding (would need new `user_profiles` table).
- `org_contacts` (global address book) + `contact_projects` (M:N) + `contact_files` exist; `project_stakeholders` (per-project external) + `project_members` (auth users) + `project_collaborator_invites` (pending) exist as 3 separate tables — UX must treat as union.
- `projects` has only `name`, `description`, `status`, `metadata jsonb`, `report_defaults jsonb` as content fields. NO top-level `location`/`address`/`scope`/`start_date`/`end_date`/`budget_total`/`client_id`.
- `site_walk_sessions.project_id` is NOT NULL → blocks "Start Walk Now" ad-hoc mode.
- Branding source duplication: `organizations.brand_settings` vs separate `org_branding` table (`20260408000002_org_branding.sql`). Need to pick canonical.

#### What's Broken / Partially Done
- Nothing broken. This was a discovery + documentation pass — no code changes.
- Operator action still pending: apply migrations `20260421000001_brand_and_report_defaults.sql` and `20260423000002_canvas_markup_realtime.sql` to live Supabase project `hadnfcenpcfaeclczsmm`. **Live status unconfirmed for both.**

#### Context Files Updated
- NEW `slate360-context/dashboard-tabs/site-walk/FEATURE_REGISTRY.md`
- NEW `slate360-context/dashboard-tabs/site-walk/BACKEND_AUDIT.md`
- NEW `/memories/repo/site-walk-feature-registry.md`

#### Next Steps (ordered)
1. UX lead reviews FEATURE_REGISTRY + BACKEND_AUDIT and signs off on the §6 schema patches.
2. Author migration for proposed patches (4 ALTERs + new `user_profiles` table).
3. Build missing admin endpoints: `GET/PATCH /api/org`, `GET /api/org/members`, `GET /api/contacts/search`, `GET /api/projects/[id]/team`, `POST /api/projects/[id]/attach-session`.
4. Resolve `organizations.brand_settings` vs `org_branding` duplication — likely deprecate `org_branding`.
5. THEN start UI build: Global Settings → Address Book → Project Intake → Ad-hoc Walk flow.
6. Canvas UI (H14–H18) can proceed in parallel since its dependencies (H1–H13) are shipped.

### Session Handoff — 2026-04-23 (Canvas UX-Perf Patches: Broadcast, Offline PATCH, Undo/Redo, Strict Realtime Types)

#### What Changed
- `lib/hooks/useSiteWalkRealtime.ts` (rewrite, 201 lines)
  - Replaced `"postgres_changes" as never` cast with strictly typed `RealtimePostgresChangesFilter<...ALL>` filters via `REALTIME_LISTEN_TYPES.POSTGRES_CHANGES` + `REALTIME_POSTGRES_CHANGES_LISTEN_EVENT.ALL`. No casts.
  - Added Supabase **Broadcast** transport on the same channel: events `cursor:move` and `pin:drag`. Hook now returns `{ sendCursorMove, sendPinDrag }` so canvas can push ephemeral X/Y deltas without DB writes.
  - Added `onCursorMove` / `onPinDrag` handlers for ghost rendering.
  - Channel held in `useRef`; handlers held in `handlersRef` so callers may pass inline callbacks without resubscribing.
- `lib/hooks/useSiteWalkOfflineSync.ts` — new generic `submitMutation({url, method, body})` (POST/PATCH/DELETE). `submitItem` delegates. PATCH calls (pin moves, markup edits) now seamlessly fall back to offline queue.
- `lib/site-walk/pin-mutations.ts` (NEW, 65 lines) — `patchPinPosition`, `patchPinMarkup`, `patchPin`. Canvas uses these on dragEnd / shape commit.
- `components/site-walk/canvas/useUndoRedo.ts` (NEW, 125 lines) — generic `<T>` history stack: `state`, `commitState`, `replaceState`, `undo`, `redo`, `canUndo`, `canRedo`, `reset`. Capped at 100 snapshots. Designed for `MarkupData` but reusable.
- `components/site-walk/SiteWalkSessionProvider.tsx` — context now exposes `realtime: SiteWalkRealtimeApi` and `submitMutation`.

#### What's Broken / Partially Done
- Nothing broken. UI canvas component (Konva/Fabric) is the next logical build — all required hooks now exist.
- Operator action still pending: apply migrations `20260421000001_brand_and_report_defaults.sql` and `20260423000002_canvas_markup_realtime.sql` to live Supabase.

#### Context Files Updated
- `/memories/repo/canvas-foundation.md`: added "Phase 10 add-ons" section.

#### Next Steps (ordered)
1. Pick canvas library (recommend **Konva.js** + `react-konva`).
2. Build `components/site-walk/canvas/PlanCanvas.tsx` consuming `usePlanViewer`, `useSiteWalkSession().realtime`, `useUndoRedo<MarkupData>(EMPTY_MARKUP)`.
3. On pin drag: call `realtime.sendPinDrag({...})` per `requestAnimationFrame`; on dragEnd call `patchPinPosition(submitMutation, …)`.
4. Render remote ghost pins via `onPinDrag` handler.
5. Wire PDF.js for the multi-page base layer.
6. Bind `⌘Z` / `⌘⇧Z` to `useUndoRedo` API.

### Session Handoff — 2026-04-23 (Site Walk Canvas Foundation: Realtime + Markup + PlanViewer + Pin API)

#### What Changed

- [supabase/migrations/20260423000002_canvas_markup_realtime.sql](supabase/migrations/20260423000002_canvas_markup_realtime.sql) — **NEW migration.** Adds `markup_data jsonb DEFAULT '{}'` to both `site_walk_items` and `site_walk_pins`. Adds `updated_at` + trigger to pins (was missing). Adds the missing UPDATE RLS policy on `site_walk_pins` (pins must be moveable). Adds both tables to `supabase_realtime` publication. Sets `REPLICA IDENTITY FULL` so realtime UPDATE payloads include the `old` row for delta calc.
- [lib/site-walk/markup-types.ts](lib/site-walk/markup-types.ts) — **NEW.** `MarkupData v1` shape (rect/ellipse/arrow/line/freehand/text). Each shape carries id + stroke/fill/strokeWidth/rotation/authorId/updatedAt. Designed for direct rehydration into Konva.js / Fabric.js. Exports `EMPTY_MARKUP` + `isMarkupData()` runtime guard used by API validation.
- [lib/hooks/usePlanViewer.ts](lib/hooks/usePlanViewer.ts) — **NEW hook.** Owns `currentPage`, `pageCount`, `zoomLevel`, `panOffset`, `visibleLayers: Set<PlanLayerId>`, `isCleanView`. API: `nextPage/prevPage`, `setZoom/zoomBy/resetZoom`, `setPan/panBy/resetPan/resetView`, `toggleLayer/setLayerVisible`, `showCleanSet()` (base only — for clean drawings), `showMarkedUp()` (all layers — for marked-up drawings). Layer ids: `base | pins | markup | comments | measurements`.
- [lib/hooks/useSiteWalkRealtime.ts](lib/hooks/useSiteWalkRealtime.ts) — **NEW hook.** Subscribes one Supabase channel `site-walk:<sessionId>` to `postgres_changes` on `site_walk_items` (filtered by session_id) and `site_walk_pins` (org-scoped via RLS). Calls `onItemInsert/Update/Delete` and `onPinInsert/Update/Delete` callbacks. Auto-cleanup on unmount.
- [lib/hooks/useSiteWalkOfflineSync.ts](lib/hooks/useSiteWalkOfflineSync.ts) — **NEW hook.** Extracted from provider to keep it under 300 lines. Owns `isOnline / isSyncing / pendingUploadCount`, `submitItem(payload)` (network-first → enqueue fallback), `syncOfflineItems()` (flushQueue), and the online/offline window listeners.
- [lib/site-walk/draft-store.ts](lib/site-walk/draft-store.ts) — **NEW module.** Extracted IDB draft persistence: `loadDraftFromIdb / persistDraftToIdb / clearDraftFromIdb`, `EMPTY_DRAFT`, `DraftItem`, `DraftTab`. Uses `idb-keyval` `createStore("slate360-site-walk", "session-drafts")`.
- [components/site-walk/SiteWalkSessionProvider.tsx](components/site-walk/SiteWalkSessionProvider.tsx) — **rewritten, 269 lines.** Now composes draft-store + offline-sync + realtime hooks. Realtime item events automatically reconcile `capturedItems` (insert/update/delete) so multi-user sessions feel instant.
- [app/api/site-walk/pins/route.ts](app/api/site-walk/pins/route.ts) — POST now accepts `markup_data` with `isMarkupData()` validation.
- [app/api/site-walk/pins/[id]/route.ts](app/api/site-walk/pins/[id]/route.ts) — **new PATCH endpoint.** Accepts `{x_pct?, y_pct?, pin_number?, pin_color?, markup_data?}` so pins can be dragged, restyled, or have their overlay edited without re-creating. DELETE unchanged.
- [lib/types/site-walk-ops.ts](lib/types/site-walk-ops.ts) — `SiteWalkPin` now has `markup_data: MarkupData | Record<string, never>` and `updated_at: string`. Added `UpdatePinPayload` type. `CreatePinPayload` now optionally accepts `markup_data`.
- [lib/types/site-walk.ts](lib/types/site-walk.ts) — re-export adds `UpdatePinPayload`.

#### What's Broken / Pending Operator Action

- **Migration NOT applied to live Supabase.** Dev container has no Supabase CLI access. Operator must run `supabase db push` (or apply via dashboard SQL editor) for project `hadnfcenpcfaeclczsmm` before realtime broadcasts and `markup_data` columns work in any environment.
- **Realtime publication add is conditional on `supabase_realtime` existing** — true on managed Supabase, true if the operator hasn't dropped it.
- **No UI consumer wired yet.** The hooks compile but no component imports `usePlanViewer` or wires pin realtime. That's the next slice (canvas component).
- **Pin realtime events are NOT routed through the provider** — the provider only handles item events. Plan viewer components must mount their own `useSiteWalkRealtime<SiteWalkPin>(sessionId, { onPinInsert, onPinUpdate, onPinDelete })` to drive the canvas. (Documented in the provider comment + canvas-foundation memory.)
- **Phase 1 prior session** still has migration `20260421000001_brand_and_report_defaults.sql` pending live application.
- `prompts/CURRENT.md` (PR #27d.2 PDF email) is still held for v0/external assistant — NOT touched this session.

#### Context Files Updated
- `/memories/repo/canvas-foundation.md` — full breakdown of what shipped + what's deferred.
- `/memories/repo/edit-affordance-principle.md` — already exists from prior session; still applies.

#### Next Steps (ordered)
1. **Operator:** apply both pending migrations to live Supabase (`20260421000001_brand_and_report_defaults.sql` + `20260423000002_canvas_markup_realtime.sql`).
2. Pick canvas library (recommend **Konva.js** — better React story via `react-konva`, lower bundle than Fabric, perf identical for <500 shapes).
3. Build `PlanCanvas.tsx` consuming `usePlanViewer` + `useSiteWalkRealtime<SiteWalkPin>` — render base layer (image or PDF page via pdf.js) + Konva `<Layer>` per visible layer id.
4. Build long-press gesture handler on the canvas — calls `POST /api/site-walk/items` then `POST /api/site-walk/pins` with the new pin's `item_id`.
5. Wire pin drag → `PATCH /api/site-walk/pins/[id]` with debounced `{x_pct, y_pct}` updates; the realtime broadcast will mirror to all other users automatically.

#### Validation
- `npx tsc --noEmit` → clean exit 0.
- All new/changed files under 300 lines (provider 269, plan viewer 180, others ≤135).
- Pre-existing oversized files unchanged.
- Build was NOT run (no test infrastructure changes); unit tests not added (UI-less hooks — to be tested when wired).

---

### Session Handoff — 2026-04-23 (Phase 1 UI Architecture Cleanup)

#### What Changed (Phase 1 — token consolidation, header isolation, email quarantine)

- [app/globals.css](app/globals.css) — **fully rewritten, 534→457 lines.** Removed duplicate token systems: entire `--slate-*` block, `--text-primary/secondary/muted`, `--surface-page/card/glass/light/light-secondary`, `--border-glass`, `--shadow-glass`, all `--status-*`, the `.dark` mirror block (now empty placeholder + comment), redundant `--space-*`. **Preserved (real consumers):** all shadcn vars, all `--app-*`, `--accent-teal*`, all `--module-*` (6 keys used by `components/apps/app-data.ts`).
- **Header isolation tokens added** in `:root`: `--header-bg: #0B0F15`, `--header-fg: #F8FAFC`, `--header-border: rgba(255,255,255,0.10)` — permanently dark, independent of any future body light theme. New `@utility` blocks: `bg-header`, `bg-header-glass`, `text-header`, `border-header`.
- **White-label hook wired:** `--primary: var(--brand-primary, #3B82F6)` and `--ring: var(--brand-primary, #3B82F6)`. The org branding cookie injection on `<body>` (existing in `app/layout.tsx`) now actually flips the brand color globally — previously dead.
- 4 shells migrated to header tokens: [components/dashboard/command-center/DashboardTopBar.tsx](components/dashboard/command-center/DashboardTopBar.tsx), [components/shared/MobileTopBar.tsx](components/shared/MobileTopBar.tsx), [components/shared/MobileBottomNav.tsx](components/shared/MobileBottomNav.tsx), [components/Navbar.tsx](components/Navbar.tsx).
- `--slate-*` + `--surface-light` leaks fixed in [components/apps/AppCard.tsx](components/apps/AppCard.tsx), [components/apps/AppPreviewSheet.tsx](components/apps/AppPreviewSheet.tsx), [components/home/HeroSection.tsx](components/home/HeroSection.tsx). The `--slate-orange` refs were broken (var was never defined); replaced with `--primary`.
- [lib/email-theme.ts](lib/email-theme.ts) — **NEW.** Exports `EMAIL_COLORS` constant. Single source of truth for all transactional email + PDF brand colors (HTML emails and `@react-pdf` cannot consume CSS vars).
- [lib/email.ts](lib/email.ts), [lib/email-site-walk.ts](lib/email-site-walk.ts), [lib/site-walk/pdf/DeliverablePdf.tsx](lib/site-walk/pdf/DeliverablePdf.tsx) — refactored: every inline hex literal replaced with `EMAIL_COLORS.xxx` references. Future white-label swap = edit one file.
- Backup: `app/globals.css.bak.20260423` (committed for safety; can be deleted next session).

#### Tracks Delegated (NOT Copilot's job)

- **Track 2 — palette CSS-var generation:** delegated to ChatGPT (produce final `:root` color palette).
- **Track 3 — homepage v0 redesign:** delegated to v0.
- **Open file `prompts/CURRENT.md`** (PR #27d.2 PDF prompt): explicitly held for the v0 piece. Copilot does NOT touch it.

#### Validation
- `npx tsc --noEmit` → clean.
- `bash scripts/check-file-size.sh` → no new oversized files (only pre-existing warnings).

#### Next Steps (ordered)
1. Wait for v0 components to land — wire them up (entitlements, Supabase, error states).
2. Apply migration `20260421000001_brand_and_report_defaults.sql` to live Supabase (still pending from prior chat).
3. Build Blocker #3 (SlateDrop "Site Walks" virtual folder per project) once v0 ships the SlateDrop project view.
4. Delete `app/globals.css.bak.20260423` after one stable session.

---

### Session Handoff — 2026-04-23 (Strategic pivot: v0+Copilot split, Unified Projects, Whisper wired)

#### Strategy Pivot (READ FIRST — applies to ALL future chats)

1. **v0 by Vercel owns visual UI.** User generates static React/Tailwind components in v0 and pastes them into the repo. **Copilot does NOT redesign UI conversationally anymore.** Copilot's job is plumbing: Supabase wiring, state, entitlements, server actions, error/empty states, accessibility audit on what v0 produced.
2. **Unified Projects Architecture (LOCKED rule).** ONE `projects` table for ALL tiers — no `field_projects`, no `sites` table, no parallel hierarchy.
   - Trial + Standard tier UI says "Site"/"Sites".
   - Business + Enterprise tier UI says "Project"/"Projects".
   - Stripe upgrade flips entitlements only — zero data migration.
   - Site Walk sessions, SlateDrop folders, photos, etc. all reference the same `projects.id`.
   - **Hardcoding "Project" or "Site" anywhere in UI is forbidden.** Always use `getProjectLabel(tier)` / `getProjectsLabel(tier)` from [lib/projects/labels.ts](lib/projects/labels.ts).
3. **STT path.** Voice notes use the existing Groq-first / OpenAI-fallback Whisper helper at [lib/server/ai-provider.ts](lib/server/ai-provider.ts) (`transcribeAudio(blob, filename)`). Two routes:
   - [app/api/site-walk/notes/transcribe/route.ts](app/api/site-walk/notes/transcribe/route.ts) — live form-data Blob upload (offline-friendly, fires from `NoteCaptureBar`).
   - [app/api/site-walk/transcribe/route.ts](app/api/site-walk/transcribe/route.ts) — **NEW this session.** Post-upload path: takes `{ item_id }`, fetches audio from S3 via `audio_s3_key`, runs Whisper, persists to `site_walk_items.metadata.transcript`. Idempotent (returns cached transcript unless `?force=1`).

#### Backend Audit Outcome (3 directives, all DONE)

- **Blocker #1 — `projects.org_id` FK.** Verified live prod ALREADY has `projects_org_id_fkey FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE`. Created idempotent backfill migration [supabase/migrations/20260423000001_projects_org_id_fk.sql](supabase/migrations/20260423000001_projects_org_id_fk.sql) for fresh deploys + `idx_projects_org_id` index. **No prod action needed.**
- **Blocker #2 — Tier-aware label helper.** Created [lib/projects/labels.ts](lib/projects/labels.ts) exporting `getProjectLabel`, `getProjectsLabel`, `getProjectLabelLower`, `getProjectsLabelLower`, `getProjectLabels`. `SITE_TIERS = new Set(["trial", "standard"])`. Tier type imported from `@/lib/entitlements` (`"trial" | "standard" | "business" | "enterprise"`).
- **Blocker #3 — STILL OPEN.** SlateDrop UI does not surface a virtual "Site Walks" / "Field Reports" folder per project. Site Walk photos already land in the project's `Photos` folder via `provisionProjectFolders()`, but the dedicated read-only view is not built. Punted to v0 (waiting on a v0 component for the SlateDrop project view).

#### What Changed
- [supabase/migrations/20260423000001_projects_org_id_fk.sql](supabase/migrations/20260423000001_projects_org_id_fk.sql) — NEW. Idempotent FK + index for fresh deploys.
- [lib/projects/labels.ts](lib/projects/labels.ts) — NEW. Tier→label helper. Use this everywhere instead of hardcoded "Project"/"Site".
- [app/api/site-walk/transcribe/route.ts](app/api/site-walk/transcribe/route.ts) — NEW. Post-upload Whisper transcribe with 25 MB cap, S3 fetch via inline `GetObjectCommand`, writes to `metadata.transcript` (preserves other metadata via spread). Idempotent unless `?force=1`. Error code `"no-stt-provider"` returns friendly serverError.
- `SLATE360_PROJECT_MEMORY.md` — this handoff.

#### What's Broken / Partially Done
- Migration `20260421000001_brand_and_report_defaults.sql` (from prior chat) still NOT applied to live Supabase.
- Blocker #3 (SlateDrop "Site Walks" virtual folder per project) — no UI yet.
- Branding/Project Defaults UI (delegated below) — still pending external dev.
- Mobile bug-fix verification on iPhone — pending after Vercel redeploy.
- Capture Screen (the next vertical slice) is BLOCKED on user delivering the v0 component. **Do not write any new field-capture UI until the v0 paste arrives.**
- New `/api/site-walk/transcribe` route is wired but no client calls it yet — needs a "Transcribe" button on the voice_note item viewer (also waiting on v0 component).

#### Validation Done
- `get_errors` clean on all 3 new files.
- TypeScript types confirmed (`Tier`, `AuthedContext.user`, `s3`, `BUCKET`, `withAppAuth("punchwalk", ...)`).
- **Not yet run:** `npm run typecheck`, `bash scripts/check-file-size.sh`, commit, push. Do these before signing off the chat.

#### Next Steps (ordered)
1. Run `npm run typecheck` and `bash scripts/check-file-size.sh`. Commit + push the 3 new files: `feat: prep for v0 — projects FK, labels helper, Whisper transcribe`.
2. **WAIT for v0 Capture Screen component from user.** No new UI work until then.
3. When Capture Screen arrives: wire it to existing `/api/site-walk/items` POST + `/api/site-walk/items/[id]/voice` upload + new `/api/site-walk/transcribe` for the transcribe button.
4. Audit existing UI (DashboardSidebar, ProjectHub headers, SlateDrop folder labels) for hardcoded "Project"/"Site" strings and migrate to `getProjectLabel(tier)`. Sweep grep: `grep -rn "Project\|Site" components/ app/ | grep -v node_modules` — selective, not blanket.
5. Apply migration `20260421000001_brand_and_report_defaults.sql` in Supabase SQL editor.
6. Build SlateDrop "Site Walks" virtual folder (Blocker #3) once v0 ships the SlateDrop project view component.
7. Verify mobile iPhone bug fixes from prior session after Vercel redeploy.

#### Reference: Unified Architecture Quick Facts (for future agents)

- `projects` table is tier-agnostic. No `field_projects` or `sites` table exists.
- `site_walk_sessions.project_id NOT NULL` — every session attaches to a project.
- Canonical S3 key: `orgs/{orgId|userId}/{folderId}/{ts}_{filename}` (built by `buildS3Key` in [lib/s3.ts](lib/s3.ts)).
- File metadata table: `slatedrop_uploads` (single source of truth — Site Walk uploads also write here).
- Entitlement resolver: `resolveOrgEntitlements(orgId)` — returns booleans like `canAccessStandalonePunchwalk`, `canAccessStandaloneTourBuilder`. Driven by `organizations.tier` + `org_feature_flags` + `org_app_subscriptions`. Stripe webhook updates `tier` → entitlements flip on next request.
- Auth wrappers: `withAuth`, `withAppAuth(appId, req, handler)`, `withProjectAuth` from [lib/server/api-auth.ts](lib/server/api-auth.ts). `withAppAuth` app IDs: `tour_builder`, `punchwalk`, `design_studio`, `content_studio`.

---

### Session Handoff — 2026-04-22 (Mobile bug-fix root causes + Site Walk Phase 3 — commits `174b066`, `01aca4b`)

#### What Changed
- `app/globals.css`: iOS 15 fallback `overflow-x: hidden;` BEFORE `overflow-x: clip;` on `html, body`. Added `--breakpoint-xs: 22rem` to `@theme inline`.
- `components/shared/MobileTopBar.tsx`: header gets `max-w-full overflow-hidden`, inner row gets `min-w-0 overflow-hidden gap-1`. Hid Search/Download/Bell on `<xs` (22rem) screens. (Root cause of horizontal scroll: a `position: fixed` topbar with 7+ icons forced 384px width on a 360px viewport, escaping all parent overflow clips.)
- `components/dashboard/command-center/DashboardSidebar.tsx`: line 67 logo `<a href="/">` → `<Link href="/dashboard">`. Fixes "logo doesn't take me home."
- `app/sw.ts`: added `CACHE_VERSION` constant + `activate` handler that deletes ALL caches not matching version + `message` handler for `SLATE360_FORCE_REFRESH`. **Critical:** previous SW used `defaultCache` with no version bump → iOS Safari served stale precached HTML/CSS for hours, which is why prior "fixes" appeared not to work.
- `components/home/HeroDemo.tsx`: cameraOrbit `145% → 107%` inline (model ~35% larger). Removed bottom "Close (Esc)" pill — top X is the only close.
- `components/home/AppDemo.tsx`: viewer refactored to function `viewer(full)` that mirrors HeroDemo zoom (90% expanded / 107% inline). Removed bottom Close pill. All app card viewers now match Hero behavior.
- `components/dashboard/AppShell.tsx`: added `usePathname` + `fullBleed` detection for `/site-walk/walks/active/[id]`. Renders a `fixed inset-0 h-[100dvh]` wrapper with NO sidebar, NO topbar, NO bottom-nav, NO padding when fullBleed.
- `components/site-walk/LiveWalkShell.tsx` (NEW, 101 lines): floating top bar `[← Exit] [Title · LIVE] [···]` with iOS safe-area padding. Menu has End session + Back to walks. Body locked to 100dvh, content scrolls inside.
- `app/site-walk/walks/active/[sessionId]/CaptureClient.tsx`: wrapped in `<LiveWalkShell title={title}>`, removed inline `<header><h1>` (title now lives in floating bar).

#### What's Broken / Partially Done
- Migration `20260421000001_brand_and_report_defaults.sql` (from prior chat) still NOT applied to live Supabase. Run before testing Send-by-Email features end-to-end.
- No UI yet for editing org `brand_settings` or `projects.report_defaults` — APIs are ready (see prior handoff for delegation prompt).
- PDF email mode deferred to PR #27d.2.
- `/site-walk/more/branding` page extension (text fields beyond logo) still pending.
- LiveWalkShell `onEndSession` prop wired but CaptureClient does not yet call any "end session" API — menu currently only shows "Back to walks."
- `MobileTopBar`: hiding Search/Download/Bell on `<xs` is a temporary measure. Long-term: rethink which actions belong on mobile (likely move to a "More" sheet).

#### Context Files Updated
- `SLATE360_PROJECT_MEMORY.md`: this handoff.

#### Next Steps (ordered)
1. **Verify on iPhone after Vercel deploy completes** — open the deployed URL with cleared Safari cache (Settings → Safari → Clear History) OR force-quit Safari first; confirm:
   - No horizontal scroll on `/dashboard` after login
   - Sidebar/header logo navigates to `/dashboard`
   - `/install` PWA install button works (or shows the new server-rendered `<a>` with text "Install Slate360")
   - Hero model is visibly larger; expand view has X close at top, no bottom pill
   - All app card viewers (AppDemo) match Hero behavior
2. **Apply migration `20260421000001_brand_and_report_defaults.sql`** in Supabase SQL editor.
3. **Phase 4 Live Walk** (next vertical slice): bottom action bar inside LiveWalkShell with persistent capture FAB + sheet selector (camera / upload / note / voice). Move the existing 2x2 tile grid into a bottom sheet so camera is one tap.
4. **End Session API + UI** wiring in LiveWalkShell menu (POST to `/api/site-walk/sessions/[id]/end` — likely needs new endpoint that sets status to `completed`).
5. **Outside-AI Branding & Project Defaults UI** (delegation prompt below) — unchanged from previous handoff.

#### Outside-AI Delegation Prompt — PR #27c.3 (Branding & Project Defaults UI)

> **Task:** Build two settings forms that POST to existing JSON APIs.
>
> **Repo:** bcvolker/slate360-rebuild, branch `feat/app-shell-cobalt-v1`. Read `.github/copilot-instructions.md` first. **Do not exceed 300 lines per file.** No `any`. Use Tailwind + the cobalt palette already in the codebase.
>
> **1. Org Branding form** — extend `app/site-walk/more/branding/page.tsx` (and split into `BrandingClient.tsx` if needed):
> - GET `/api/site-walk/branding/settings` → prefill form
> - Fields: `logo_url` (display existing — upload UI already exists at `/api/site-walk/branding`), `signature_url` (signature pad — render to PNG, upload via existing branding endpoint with a new field type, OR use a simple file input as v1), `primary_color` (hex picker), `header_html` (textarea, monospace), `footer_html` (textarea, monospace), `contact_name`, `contact_email`, `contact_phone`, `address`, `website`
> - PUT `/api/site-walk/branding/settings` with `{ settings: { ...fields } }`
> - Show a small live preview card at the top with logo + primary color + contact line (no `<iframe>`, just a Tailwind card).
>
> **2. Project Defaults form** — new page `app/site-walk/more/projects/[projectId]/page.tsx` + `ProjectDefaultsClient.tsx`:
> - Server component fetches project name via Supabase admin client (use `createAdminClient` from `@/lib/supabase/admin` then verify ownership via `withProjectAuth` pattern — or fetch via the already-built API).
> - GET `/api/projects/[projectId]/report-defaults` → prefill
> - Fields: `project_name`, `client_name`, `client_email`, `project_address`, `project_number`, `inspector_name`, `inspector_license`, `scope_of_work` (textarea), `default_deliverable_type` (select: photo_log/punchlist/report/custom)
> - PUT `/api/projects/[projectId]/report-defaults` with `{ defaults: { ...fields } }`
>
> **Hard rules:**
> - Use `useState` + `useEffect`, no form libraries.
> - Save button disabled until dirty; show "Saved ✓" toast for 1.5s on success.
> - Both APIs return shape `{ brand_settings: {...} }` or `{ report_defaults: {...} }`.
> - Both APIs accept `{ settings: {...} }` or `{ defaults: {...} }` with key whitelist enforced server-side — only valid keys persist.
> - All file paths must be absolute imports (`@/lib/...`).
>
> **Smoke test:** Open form, change `primary_color` to `#ff0000`, save, refresh — value persists. Open NewDeliverable page after setting `project_name` → title auto-fills.

#### Next Steps (ordered)
1. Apply migration `20260421000001_brand_and_report_defaults.sql` in Supabase Studio.
2. Send the prompt above to the outside AI for the two settings forms (PR #27c.3).
3. Verify email sending end-to-end: set `RESEND_API_KEY` in env, share a deliverable, click "Send by email" → expect link mode + inline_images mode both deliver.
4. PR #27d.2 — PDF email mode. Pick stack: `@react-pdf/renderer` (lighter, react-component PDF) vs `puppeteer-core + @sparticuz/chromium` (full HTML→PDF on Vercel). Recommend `@react-pdf/renderer` for speed and bundle size.
5. PR #27f — project-bound mode (lock a session to a project on creation; today they're loosely coupled by project_id but the UI doesn't enforce it).
6. PR #27g — leadership view + contacts tab.

#### Progress (LA-trip beta target)
- Shipped: PR #27a, #27b, #27c, #27d (link + inline images), #27e, #27h, #28a, branding/defaults infra (#27c.1+#27c.2 backend)
- Remaining: branding/defaults UI (#27c.3, delegated), PDF email (#27d.2), #27f, #27g
- **Estimate: ~75-80% to LA-trip beta-ready.**

---

### Session Handoff — 2026-04-20 (Shell consistency root-cause fix + clean-slate DB + single logo source — PRs #12 / #13 / #14)

### What Changed (PRs #12, #13, #14 — all merged to `main`)
- **PR #12** — `(apps)` group switched to `AuthedAppShell` (consistent shell on `/site-walk`, `/slatedrop`, `/tours`, `/geospatial`, `/virtual-studio`). `ComingSoonEmptyState` created (cobalt-themed). Removed fake placeholder forms from MyAccountShell tabs (preferences/sessions/login-history/workspace/members/permissions/audit/privacy/legal) and from unbuilt `(apps)` pages. `/site-walk` 187-line marketing hero replaced with redirect to `/site-walk/board`. Mobile homepage hero spacing fix.
- **PR #13** — Three architectural root-causes fixed:
  1. **Double headers killed**: `DashboardHeader` (logo + ⌘K + quick-nav + create + bell + user-menu) was rendered INSIDE `AppShell`'s `<main>` by both `DashboardTabShell` and `DashboardClient`. Result: every authed page had two stacked topbars. **Fix:** `DashboardHeader` now returns `null` (interface kept for backward compat); removed import from `DashboardTabShell`; removed `<DashboardHeader>` JSX block from `DashboardClient` (also fixed a TS error: `DashboardInboxNotification[]` not assignable to `HeaderNotification[]`); `CommandPalette` mounted globally in `AppShell` with ⌘K/Ctrl+K listener so search still works on every authed route.
  2. **Logo single source**: `variant` prop **removed entirely** from `SlateLogo`. Old "dark" variant used `#18181b` (near-black) on `#0B0F15` background = invisible. App is dark-themed everywhere; one logo (white SLATE + cobalt 360, `/uploads/slate360-logo-light-v3.svg?v=cobalt-2026-04-19d`). **Decision recorded: never reintroduce a `variant` prop on `SlateLogo`. If a future light surface needs graphite, create a separate `SlateLogoOnLight` component.** This is the third time this bug returned.
  3. **Projects DB clean-slate**: `TRUNCATE projects RESTART IDENTITY CASCADE` on live Supabase wiped 177 leftover test projects (4 CEO-owned `Beth 5/7/8/9`, 173 orphaned `Runtime Overflow2 mm8jbcso-*` from deleted users). Cascade hit ~37 dependent tables (project_rfis, submittals, budgets, notifications, external_links, punch_items, daily_logs, contracts, tours, site_walk_*, design_studio_*, tour_scenes, file_versions, folder_permissions, model_files, media_assets, etc.). Plus explicit truncates for design_studio_projects, file_folders, project_files, project_folders, project_members, project_activity, project_history_events, project_documents, project_assets, project_stakeholders, project_tasks, project_observations, deliverable_access_tokens, deliverable_cleanup_queue. Verified `SELECT COUNT(*) FROM projects = 0`. Auth users untouched (slate360ceo@gmail.com remains).
- **PR #14 (build hotfix)** — After PR #13 merged, Vercel build broke because three `<SlateLogo variant="dark" />` call sites in `components/marketing-homepage.tsx` (lines 292, 367, 996) lingered (the merge from main re-introduced them despite the local edit). Stripped all three to `<SlateLogo />`. Build now compiles.

### What's Broken / Partially Done
- **Awaiting visual verification post-deploy**: walk `/dashboard`, `/projects`, `/site-walk`, `/slatedrop`, `/tours`, `/my-account` and confirm: (a) only ONE topbar, (b) no extra logo/search/avatar in body, (c) projects list empty, (d) logo white+cobalt and visible everywhere, (e) account "Coming Soon" tabs are clean (no fake field lists).
- **UNITS #16 / #17 / #20** — code-only request `docs/CODE_REQUEST_CREDIT_METER_BETA_BANNER_APP_SHELL.md` still pending response from parallel AI.
- **UNITS #18 / #19 / #21 / #22 / #23 / #24 / #25** — backlog, not started.
- **User offered**: full per-page content specs once shell is clean — request these next.

### Critical Decisions Recorded This Session
- **`SlateLogo` has NO `variant` prop, ever.** Period. The product is dark-themed; the logo is white SLATE + cobalt 360. End of variants.
- **`DashboardHeader` is a no-op**. Do NOT add chrome back to it. AppShell's `DashboardTopBar` is the only authed topbar. If you need a per-page chrome element, add it INSIDE the page (not in a header wrapper).
- **`CommandPalette` lives in `AppShell`** (mounted once, global ⌘K listener). Do NOT re-mount it in `DashboardHeader` / `DashboardTabShell` / page-level shells.

### Context Files Updated
- `SLATE360_PROJECT_MEMORY.md`: this handoff.

### Next Steps (ordered)
1. **Visual smoke** of deployed prod (~3 min after PR #14 merge): verify the five points above.
2. Request page-by-page content specs from user; build empty-state → real-content rollout plan tab-by-tab.
3. When parallel AI responds with Credit Meter / Beta Banner / `/app` shell code, integrate per the existing `docs/CODE_REQUEST_CREDIT_METER_BETA_BANNER_APP_SHELL.md` plan.
4. Scope UNIT #18 (Pricing page beta state) and UNIT #19 (Production smoke checklist).
5. Resolve marketing-page tier mismatch (decision still pending from earlier handoff).

---

### Session Handoff — 2026-04-19f (Branch fix + AppShell extraction + beta join API + parallel-AI collaboration model)

### What Changed (PRs #8 → #11, all merged to `main`)
- **Critical fix — PR #7 was misconfigured**: targeted sibling feature branch instead of `main`. Production was stuck at `b691ca8`. Resolved by opening fresh PRs with explicit `--base main`. New rule: always use `gh pr create --base main --head <branch>`.
- **PR #8** (brand token migration to main): full cobalt + zinc surface migration.
- **PR #9** (logo + sidebar + topbar fixes): cobalt `SlateLogo` source-of-truth, default-open sidebar with persisted pin (`localStorage.slate360.sidebar.pinned`), homepage hero "Get the App — Free" CTA.
- **PR #10** (BetaGatedButton wire-up): all "Subscribe" / "Upgrade" / "Buy Credits" / "Add Collaborator" CTAs route through `components/billing/BetaGatedButton.tsx` (tooltip + disabled when `isBetaMode()`).
- **PR #11** (AppShell extraction + beta join API):
  - **`components/dashboard/AppShell.tsx`** (111 lines, client) — owns sidebar+topbar+pin persistence. Props: `{userName, hasOperationsConsoleAccess, children}`.
  - **`components/dashboard/AuthedAppShell.tsx`** (27 lines, server wrapper) — calls `resolveServerOrgContext()` then renders `<AppShell>`.
  - Mounted in `app/(dashboard)/layout.tsx`, `app/site-walk/layout.tsx`, `app/slatedrop/layout.tsx`. **Sidebar is now consistent across all dashboard routes** (was missing on /site-walk and /slatedrop before).
  - `components/walled-garden-dashboard.tsx` simplified to just render `<CommandCenterContent />`.
  - **`app/api/beta/join/route.ts`** (41 lines): correct `withAuth(req, async ({user, admin}) => …)` signature, counts beta testers via admin client, returns `forbidden("beta_full")` if `>= BETA_TESTER_CAP`, else flips `beta_tester=true, foundational_member=true, beta_joined_at=now(), foundational_granted_at=now()` on profiles.
- **Test users cleaned**: `DELETE FROM auth.users WHERE email != 'slate360ceo@gmail.com'` — 13 deleted, only CEO account remains.
- **All service credentials verified working from dev container**: Supabase pooler (`aws-1-us-west-1.pooler.supabase.com:5432`, password URL-encoded as `Arlopear%241976_989*`), AWS S3 (`slate360-storage` us-east-2), Cloudflare R2 (`slate360-storage` empty), Stripe products endpoint, gh CLI auth, Vercel auto-deploy on main merge.
- **Master issue cross-reference**: `docs/MASTER_ISSUE_CROSS_REFERENCE.md` — maps the 10-category beta-readiness audit against shipped/queued/new-backlog work. Net-new units #22 (storage routing), #23 (Site Walk capture closeout), #24 (Ops Console roster + ledger), #25 (usage visibility).
- **Code-only request prepared** for the parallel AI assistant: `docs/CODE_REQUEST_CREDIT_METER_BETA_BANNER_APP_SHELL.md` covers Credit Meter (UNIT #16) + Beta Banner (UNIT #17) + `/app` mobile shell (UNIT #20) in one document with full type contracts, real DB schemas, helper signatures, and example call sites.

### Parallel-AI Collaboration Model (NEW — important for next chat)
The "other AI assistant" the user pastes into has **NO repo access**. Their file tools don't see this codebase. New workflow:
1. Orchestrator (this chat) writes code-only request docs in `docs/CODE_REQUEST_*.md` with full contracts + schemas + surrounding code.
2. User pastes the doc to the other AI.
3. Other AI returns full file contents (no diffs, no `...existing code...` placeholders).
4. Orchestrator integrates, fixes signature mismatches (they routinely get `withAuth` and `forbidden()` wrong), grep-confirms imports are wired, opens PR `--base main`.

### Critical Schema Gotchas (don't re-discover)
- **`credit_balance.org_id` (NOT `organization_id`)** — PK is `org_id uuid`. Columns: `balance_credits bigint`, `monthly_allowance bigint`, `last_reset_at`, `updated_at`. RLS via organization_members.
- **`credit_ledger.organization_id`** — different name from credit_balance! Columns: `delta numeric(12,2)`, `running_balance numeric(12,2)`, `reason`, `category` (enum: subscription/purchase/bonus/refund/job_usage/storage_usage/bandwidth_usage/export_usage/api_usage/adjustment/expiration), `credit_source` (enum: monthly/purchased/bonus/refund/mixed), `metadata jsonb`.
- **`forbidden(msg: string)`** — accepts STRING only, not an object. Other AI keeps writing `forbidden({reason: '...'})` — wrong.
- **`withAuth(req, handler)`** — handler receives `{req, user, admin, orgId}`. Other AI keeps writing `withAuth(async (req, {userId}) => …)` — wrong.
- **Beta limit for credits** = `BETA_LIMITS.credits = 500` from `lib/billing/cost-model.ts`. Use as the "limit" for beta users in CreditMeter.

### What's Broken / Partially Done
- **UNITS #16 / #17 / #20 pending** — code-only request sent to other AI (`docs/CODE_REQUEST_CREDIT_METER_BETA_BANNER_APP_SHELL.md`), awaiting their response.
- **UNIT #18** Pricing page beta state, **UNIT #19** Production smoke checklist, **UNIT #21** Command Center reimagine — not yet started.
- **Net-new UNITS #22/#23/#24/#25** added to backlog; not yet scoped into prompt rounds.
- Marketing-page tier mismatch from previous handoff still unresolved (decision needed).

### Context Files Updated
- `SLATE360_PROJECT_MEMORY.md`: this handoff.
- `docs/CODE_REQUEST_CREDIT_METER_BETA_BANNER_APP_SHELL.md`: NEW — comprehensive request to parallel AI.
- `docs/MASTER_ISSUE_CROSS_REFERENCE.md`: NEW — 10-category audit mapped to build plan.

### Next Steps (ordered)
1. **When other AI responds** to `docs/CODE_REQUEST_CREDIT_METER_BETA_BANNER_APP_SHELL.md`: integrate Section A (Credit Meter), then B (Beta Banner), then C (`/app` shell). For each, run `npm run typecheck`, grep-confirm imports are wired, open PR `--base main`.
2. After Credit Meter lands, wire `<CreditMeter />` into `components/dashboard/AppShell.tsx` topbar (right side, before user menu).
3. After Beta Banner lands, wire `<BetaBanner isBetaTester={...} />` into `components/dashboard/AuthedAppShell.tsx` (above AppShell, fed from `getBetaStatus(user.id)`).
4. After `/app` shell lands, smoke-test PWA install on iOS Safari + Android Chrome at `https://www.slate360.ai/app`.
5. Scope and dispatch UNIT #18 (Pricing page beta state).
6. Resolve marketing-page tier mismatch (user decision pending from prior handoff).
7. Apply remaining migrations from prior handoffs if any are still outstanding.

---

### Session Handoff — 2026-04-19e (Live Supabase migrations applied + codespace audit + marketing-page mismatch flagged)

### What Changed
- **5 migrations applied to live Supabase** (`hadnfcenpcfaeclczsmm`, West US):
  - `20260306_slate360_staff.sql` (was missing on prod)
  - `20260418080828_create_invitation_tokens.sql` (was missing on prod)
  - `20260419120000_project_collaborator_invites.sql` (collaborator invite store)
  - `20260419130000_org_member_app_access.sql` (per-app seat assignment)
  - `20260419130001_org_members_permissions.sql` (enterprise per-feature `permissions` jsonb)
  - Verification query returned `t|t|t|t|t` for all five objects.
- **No code changes this turn.** Tree clean at `624d674`. Push state matches origin.
- **Codespace health probed**: 22 GB free on /workspaces, 109 GB free on /tmp, 9.7 GB RAM available, node v20.19.2, npm 10.8.2 — healthy. 4 stashes intact (DO NOT POP `stash@{0}` `broken-skin-attempts-before-restore-2026-04-19`).
- **Marketing homepage brand audit**: no raw amber hex left. The legacy class names (`btn-amber-soft`, `hover:bg-teal-soft`, `hover:text-teal`) intentionally remain — they're remapped to cobalt+steel in `globals.css`.

### What's Broken / Partially Done
- **Marketing homepage tier mismatch** (`components/marketing-homepage.tsx` lines ~200-255): advertises `Free Trial / Field Pro Bundle (Custom) / Enterprise` but `lib/entitlements.ts` defines four tiers with concrete prices: `trial / standard $149/mo / business $499/mo / enterprise (custom)`. Either the marketing copy needs to publish the per-tier prices, or the entitlements need a "bundle" mapping. **Decision needed from user before edit.** Also: no mention of the new "outside collaborators" feature in any tier card.
- **Members & Roles tab** in `MyAccountShell` still placeholder. Data layer is fully ready on live now.
- **No route uses `withAppAccess` yet** — wire to Site Walk / Tours / Design Studio / Content Studio API routes.
- **View selector is presentation-only** — `readProjectViewMode()` not consumed in any server query yet.
- **No vitest config** — tests for `assertCanInviteCollaborator` / `resolvePermissions` / `isCollaboratorOnly` still pending.

### How to Run Future Migrations on Live (recorded so we don't re-discover this)
```bash
psql "postgresql://postgres.hadnfcenpcfaeclczsmm:${POSTGRES_PASSWORD}@aws-1-us-west-1.pooler.supabase.com:5432/postgres?sslmode=require" \
  -v ON_ERROR_STOP=1 -f supabase/migrations/<file>.sql
```
- Pooler URL came from `supabase/.temp/pooler-url` after `supabase link` — note **`aws-1-us-west-1`** (not us-east-2 as the rest of our infra).
- `supabase` CLI cannot run from `/workspaces/slate360-rebuild` (`.env` has a backslash that breaks its parser). Workaround: `cd /tmp/sblink` (or any non-workspace dir) before running CLI commands.
- Live `supabase_migrations.schema_migrations` is unreliable — only tracks through `20260215`. Verify objects with `to_regclass(...)` instead of trusting the history.
- `psql` is installed via apt; supabase CLI via `npx supabase@2.92.1`.

### Context Files Updated
- `SLATE360_PROJECT_MEMORY.md`: this handoff.

### Next Steps (ordered)
1. **User decision**: marketing-homepage tier framing — publish Standard/Business prices or keep bundle pricing?
2. Build **Members & Roles** UI in `MyAccountShell › Workspace`: invite, role select, per-app seat checkboxes, enterprise permission toggles. Data layer is live.
3. Adopt `withAppAccess(...)` in Site Walk / Tours / Design Studio / Content Studio API routes.
4. Branch server components on `readProjectViewMode()` where Owner/Leadership views must differ from My view.
5. Stand up `vitest.config.ts` + smoke specs for `assertCanInviteCollaborator`, `resolvePermissions`, `isCollaboratorOnly`.
6. Operations Console subscription-status / cohort panel.

---

### Session Handoff — 2026-04-19d (CollaboratorShell + view selector + permissions resolver + app-access guard)

### What Changed (commit `99cf0e7`)
- **Trapped-collaborator shell**: `app/(collaborator)/collaborator/layout.tsx` + `page.tsx`. Layout calls `isCollaboratorOnly(user.id)` (new `lib/server/collaborator-mode.ts`) — if user has any `organization_members` row they bounce to `/dashboard`; otherwise they get `CollaboratorShell` (`components/collaborator/CollaboratorShell.tsx`) with stripped sidebar (My projects / Shared files / Comments / Account) and a persistent cobalt upgrade banner. Landing lists their projects via `listCollaboratorProjects()`.
- **Invite redemption now routes correctly**: `lib/server/invites.ts` checks `organization_members` after acceptance — invitees with no org go to `/collaborator`, everyone else to `/projects/{id}` as before.
- **Project view selector**:
  - `lib/server/project-view.ts` — cookie name + reader (`readProjectViewMode()` returns `"my" | "owner" | "leadership"`).
  - `app/api/projects/view-mode/route.ts` — POST sets the cookie (sameSite=lax, 30d).
  - `components/projects/ProjectViewSelector.tsx` — client `<select>` that POSTs + `router.refresh()`.
  - `app/(dashboard)/projects/[projectId]/layout.tsx` — mounts the selector next to the status pill, computes `allowedModes` from role (viewer→`["leadership"]`, admin→all three, member→`["my","owner"]`). Also adds the **People** tab to the nav.
- **Enterprise per-feature permissions resolver**:
  - `lib/server/org-context.ts` exports `PERMISSION_KEYS`, `PermissionKey`, `MemberPermissions`, and `resolvePermissions()`.
  - `ServerOrgContext.permissions: MemberPermissions` resolved on every request — enterprise reads `organization_members.permissions` jsonb, every other tier falls back to `isAdmin`.
  - All four return paths (no-user / no-membership / success / catch) wired with the resolver.
  - The membership query now selects the `permissions` column.
- **App-access guard for routes**: `lib/server/api-app-access.ts`:
  - `APP_ACCESS_KEYS` = `site_walk | tours | design_studio | content_studio`.
  - `userHasAppAccess(userId, orgId, appKey)` — owner/admin pass implicitly, otherwise checks `org_member_app_access`.
  - `withAppAccess(appKey, req, handler)` — drop-in wrapper that returns 403 `No seat assigned for {app}` when the grant is missing.
- Validation: `npm run typecheck` clean. File-size guard clean.

### What's Broken / Partially Done
- **3 migrations still not applied to live Supabase**: `20260419120000_project_collaborator_invites`, `20260419130000_org_member_app_access`, `20260419130001_org_members_permissions`. Until applied, `permissions` reads short-circuit through the `catch` branch (returns the fallback resolver). People tab + invite API will hard-fail until the first migration lands.
- **Members & Roles tab** in `MyAccountShell` still placeholder — the data layer is now ready (`organization_members` + `org_member_app_access` + `permissions`) so this is purely a UI build.
- **No route uses `withAppAccess` yet** — the wrapper exists but isn't wired to Site Walk / Tours / Design Studio / Content Studio routes. Adopt incrementally.
- **Trapped-collaborator detection is membership-based, not invite-based**: a paying user who happens to be added as a collaborator on someone else's project will NOT be trapped (correct). But a fresh invitee who happens to also start their own org later will keep `isCollaboratorOnly()` returning false (correct). Edge case: if we ever support "collaborator-only" enterprise-level users we'll need a separate flag.
- **View selector is presentation-only right now** — server components don't yet branch on `readProjectViewMode()`. Hook it into the per-tab queries (e.g. owner view widens scope, leadership view forces read-only) when those views need to differ from "my view".
- **No automated tests added** — would require setting up vitest config first (none exists). Deferred.
- `lib/email.ts` is at 280 lines — close to the 300 cap. Future templates should go in dedicated modules like `lib/email-collaborators.ts`.

### Context Files Updated
- `SLATE360_PROJECT_MEMORY.md`: this handoff.

### Next Steps (ordered)
1. Apply the 3 outstanding migrations on Supabase. Smoke-test the People tab → invite via email → click link → arrive at `/collaborator` (new user) or `/projects/{id}` (existing org user).
2. Wire `MyAccountShell › Workspace › Members & Roles` to live `organization_members` (invite, role select, per-app seat checkboxes, enterprise permission toggles).
3. Adopt `withAppAccess(...)` in the Site Walk / Tours / Design Studio / Content Studio API routes.
4. Branch server components on `readProjectViewMode()` where views need to actually differ (e.g. punch list "Owner view" reveals assignments, "Leadership view" hides edit controls).
5. Stand up `vitest.config.ts` + `package.json`'s `"test"` script and write smoke specs for: `assertCanInviteCollaborator` (trial throws, standard at 3 throws, enterprise unlimited), `resolvePermissions` (enterprise honors keys; standard ignores them), `isCollaboratorOnly` (org-member → false, project-only → true).
6. Operations Console subscription-status / cohort panel — still pending from earlier handoff.

---

### Session Handoff — 2026-04-19c (Collaborator invite end-to-end: API + People tab + SMS + 2 migrations)

### What Changed
- **Migrations** (HEAD `1e63650`):
  - `supabase/migrations/20260419130000_org_member_app_access.sql` — new table for per-member app seat assignment (`site_walk` / `tours` / `design_studio` / `content_studio`), with RLS scoped to org admins (write) and the member themselves (read).
  - `supabase/migrations/20260419130001_org_members_permissions.sql` — adds `permissions jsonb default '{}'` to `organization_members` for enterprise per-feature overrides. Comment lists recognized keys. **No** runtime read-side wired yet — populating the column is a no-op until `org-context.ts` reads it.
- **Backend**:
  - `lib/sms.ts` — Twilio REST client implemented via `fetch()` (no SDK dependency). `sendSms()` returns a typed `SmsResult`; missing env → `{ ok:false, reason:"missing_config" }` and a dev-mode warn. E.164 validator exported.
  - `lib/email-collaborators.ts` — new `sendCollaboratorInviteEmail()` using the existing branded HTML wrapper from `lib/email.ts` (kept here so `lib/email.ts` stays under 300 lines). HTML-escapes all interpolated user input.
  - `lib/server/collaborator-data.ts` — `loadProjectPeople(projectId, orgId)` returns `{ members, pendingInvites, leadershipViewers }`. Hydrates user emails/names from `profiles` (single round trip via `.in()`).
  - `app/api/projects/[projectId]/collaborators/route.ts` — GET, returns the people payload + `seatUsage: { used, limit | null }`.
  - `app/api/projects/[projectId]/collaborators/invite/route.ts` — POST, zod-validated, runs `assertCanInviteCollaborator`, mints an `invitation_tokens` row (`max_redemptions=1`, 14-day TTL), inserts the invite row, then dispatches via email/SMS/both/link. Returns `{ inviteId, inviteUrl, qrPayload, delivery }`.
  - `app/api/projects/[projectId]/collaborators/[inviteId]/revoke/route.ts` — POST, sets status=revoked + revokes the underlying token.
  - `app/api/projects/[projectId]/collaborators/[inviteId]/resend/route.ts` — POST, re-dispatches over the original channel and bumps `send_count` + `last_sent_at`.
  - All routes use the **real** wrappers (`withProjectAuth(req, ctx, handler)` / `ok` / `badRequest` / `conflict` / `serverError`), not the wrong shape an external AI suggested.
- **UI**:
  - `app/(dashboard)/projects/[projectId]/people/page.tsx` — server component that calls `loadProjectPeople` and `countActiveCollaborators` directly (no internal HTTP).
  - `components/projects/ProjectPeopleView.tsx` — client view, three sections (Project members / Outside collaborators with seat counter / Leadership viewers), inline resend+revoke buttons.
  - `components/projects/PeopleSection.tsx` — primitive list section.
  - `components/projects/CollaboratorInviteModal.tsx` — channel-aware form (email / sms / both / link). Link mode reveals the URL for QR/copy. Disables when at seat limit.
- `.env.example` — added `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` / `TWILIO_FROM`.
- Validation: `npm run typecheck` clean. File-size guard clean (none of the new files >300 lines).

### What's Broken / Partially Done
- **Migrations not yet applied** to live Supabase — `20260419120000`, `20260419130000`, `20260419130001`. Apply them before the People tab is exercised in prod. The invite redemption code in `lib/server/invites.ts` already swallows missing-table errors.
- **No "trapped collaborator" shell built yet** (`CollaboratorShell` + `(collaborator)` route group) — invited users with no subscription currently land on the regular dashboard. Next big UX item.
- **No `ProjectViewSelector`** (header view selector for `My / Owner / Leadership view`) — placeholder per design doc.
- **`organization_members.permissions` column not yet read anywhere** — runtime resolver in `org-context.ts` still needs to surface it (enterprise tier only).
- **Per-app seat assignment UI** for `org_member_app_access` not built — `MyAccountShell › Members & Roles` placeholder still.
- **Missing `withAppAccess` middleware** — nothing yet enforces `org_member_app_access` at the route level.
- **Twilio package**: not in `package.json`. `lib/sms.ts` uses raw REST so it works with zero deps — keep it that way unless you need MMS / verify / etc.
- No automated tests added this session (deferred — see next steps).

### Context Files Updated
- `SLATE360_PROJECT_MEMORY.md`: this handoff.
- (Did **not** edit `slate360-context/ORG_ROLES_AND_PERMISSIONS.md` because the design there is still accurate; only the "Backend Status" table now needs the People-tab + invite-API rows flipped to live — handle in next chat.)

### Next Steps (ordered)
1. Run the 3 outstanding migrations on Supabase (`20260419120000`, `20260419130000`, `20260419130001`) and smoke the People tab end-to-end (invite via email → check inbox → click link → land on `/projects/{id}` as a collaborator).
2. Build `CollaboratorShell` + `app/(collaborator)/layout.tsx` for invitees with no subscription. Use `project_members.role='collaborator'` + tier='trial' + no other org membership as the trap condition.
3. Build `components/projects/ProjectViewSelector.tsx` and mount it in the project header — wire it to a server-readable cookie or query param so server components can render the right slice.
4. Wire `MyAccountShell › Members & Roles` to live `organization_members` + `org_member_app_access` (invite, role select, per-app checkboxes, permissions toggles for enterprise tier).
5. Surface `organization_members.permissions` in `lib/server/org-context.ts` (enterprise-only) and add helpers `can('canViewBilling')` etc.
6. Add `withAppAccess(appKey, …)` middleware mirroring `withAppAuth` but enforcing `org_member_app_access` for sub-app routes.
7. Tests: vitest smoke for `assertCanInviteCollaborator` (trial=throw, standard at 3=throw, enterprise=infinity), and an integration test for the invite POST happy path (mock admin client).
8. Operations Console subscription-status / cohort panel — still pending from earlier handoff.

---

### Session Handoff — 2026-04-19 (Cobalt+Steel palette + viewer role + collaborator plan)

### What Changed
- **Brand palette swapped from Amber+Teal to Cobalt+Steel** across the app:
  - `app/globals.css`: `--primary` → `#3B82F6` (cobalt-500), `--primary-hover` → `#2563EB`, `--primary-foreground` → `#0B1220`, `--ring` → `#3B82F6`, `--accent-teal` → `#94A3B8` (steel-400), `--accent-teal-soft` → `rgba(148,163,184,0.18)`, `--slate-gold/accent` → cobalt, all sidebar tokens, all `--app-glow-*`, `btn-amber-soft`/`btn-teal-outline` utilities, `auth-page`/`auth-input`/`auth-btn-primary` utilities.
  - `lib/design-system/tokens.ts`: `brand.gold/goldHover/goldRing/goldGlow`, HSL strings, `teal/tealSoft/tealHover`, `appShell.glowAmber/glowAmberStrong`, all `modules.*` accents → cobalt + cobalt-deep.
  - `lib/types/branding.ts`: `DEFAULT_BRANDING.primary_color` → `#3B82F6`.
  - Logos: `public/logo.svg` and `public/uploads/slate360-logo-reversed-v2.svg` — `cls-2` fill swapped from amber to cobalt. Cache-bust string `?v=amber-2026-04-19` → `?v=cobalt-2026-04-19` everywhere.
  - Mass `sed` swept all `.ts/.tsx/.css` under `app/`, `components/`, `lib/`, `hooks/`: `#F59E0B/#f59e0b → #3B82F6`, `#D97706/#d97706 → #2563EB`, `#E64500/#e64500/#E04400/#162D69 → #1D4ED8`, `#451a03 → #0B1220`, `#5E8E8E → #94A3B8`, `rgba(245,158,11,…) → rgba(59,130,246,…)`, `rgba(217,119,6,…) → rgba(37,99,235,…)`, `rgba(94,142,142,…) → rgba(148,163,184,…)`. Verified zero stragglers outside `app/palette-lab/` (now deleted).
  - `app/palette-lab/` deleted (526-line sandbox served its purpose).
- **Viewer role wired into the server context:**
  - `lib/server/org-context.ts`: `roleRank()` now returns `viewer=3`. `ServerOrgContext` adds `isViewer: boolean` and `canEditOrg: boolean`. All return paths (no-user, no-membership, success, catch) updated. The `org_role` enum already included `viewer` (migration `20260406000003_org_member_roles.sql`) so no SQL change needed.
- **Collaborator + leadership-view plan documented** (no code yet — design only):
  - `slate360-context/ORG_ROLES_AND_PERMISSIONS.md`: appended a long Project Collaborators section (data model with new `project_collaborator_invites` table, seat-limit enforcement, multi-channel invite flow incl. SMS via Twilio, two UI variations for collaborators with/without subscriptions, list of code surfaces to build) plus a Leadership View section (the ASU-director use case packaged into a single `Project › People` tab + a header-level view selector with `My view / Owner view / Leadership view`) plus a Backend Status table marking what's live vs gap.
  - `docs/SLATE360_MASTER_BUILD_PLAN.md`: updated the collaborator onboarding path to reference SMS/QR channels and the Collaborator Shell, and links out to the new design doc as single source of truth.
- Validation: `npm run typecheck` clean after every change.

### What's Broken / Partially Done
- **No backend code yet** for the new collaborator pieces — only the plan doc. Specifically still missing: `project_collaborator_invites` migration, `org_member_app_access` migration, `org_members.permissions` jsonb migration, `maxCollaborators` in `lib/entitlements.ts`, `lib/sms.ts` (Twilio), the `Project › People` tab, the `CollaboratorShell` no-subscription view, the view-selector packaging, and the Operations Console subscription-status panel. Status table at the bottom of `ORG_ROLES_AND_PERMISSIONS.md` is the source of truth.
- Members & Roles, Permissions, Audit Log tabs in `MyAccountShell` are still placeholders (rendering `<PlaceholderTab>`). Now that `viewer` is in `ServerOrgContext`, the Members tab can be wired with role assignment when built.
- Tailwind utility classes `bg-amber-*` / `text-amber-*` / `border-amber-*` / `ring-amber-*` were intentionally NOT swept — they encode semantic warning / "in progress" status in punch-list, billing past-due, AccountDataTrackerTab, etc. A handful of brand-only usages (e.g. SceneUploader hover, AccountAdminCards "Internal Owner" badge) remain amber and look slightly off-brand. Punch them up if/when the visual review surfaces them.
- Production-deployment work for the homepage cutover (commit `7cce7b9`) noted in the previous handoff is unrelated and unaffected.

### Context Files Updated
- `app/globals.css`: cobalt+steel tokens + utility classes.
- `lib/design-system/tokens.ts`: brand/accent tokens.
- `lib/types/branding.ts`: default primary color.
- `lib/server/org-context.ts`: viewer role wired.
- `public/logo.svg`, `public/uploads/slate360-logo-reversed-v2.svg`: cobalt fill.
- `slate360-context/ORG_ROLES_AND_PERMISSIONS.md`: viewer marked live; full collaborator + leadership-view design appended.
- `docs/SLATE360_MASTER_BUILD_PLAN.md`: collaborator onboarding section updated.
- `SLATE360_PROJECT_MEMORY.md`: this handoff.

### Next Steps (ordered)
1. Visual QA of the cobalt+steel skin on `/dashboard`, `/projects`, `/slatedrop`, `/login`, `/signup`, `/preview/marketing-home`, `/preview/mobile-shell-v2`. Hard-refresh to bust any cached SVG. Capture any amber/steel utility-class stragglers worth sweeping.
2. Write the migration `project_collaborator_invites` (schema in `ORG_ROLES_AND_PERMISSIONS.md`).
3. Add `maxCollaborators` to `lib/entitlements.ts` per tier and surface it in `getEntitlements()`.
4. Build `Project › People` tab (`app/(dashboard)/projects/[projectId]/people/page.tsx`) wrapping the existing `app/api/invites/generate/route.ts` for the email/QR path; stub SMS until Twilio creds are added.
5. Build `CollaboratorShell` no-subscription view + the header view-selector (`My view / Owner view / Leadership view`).
6. Wire `MyAccountShell › Workspace › Members & Roles` to the live `organization_members` table now that `isViewer` exists in context — invite + role select + per-app seat assignment.
7. Operations Console subscription-status / cohort segmentation panel.

### Earlier Handoff — 2026-04-18

### What Changed
- `app/page.tsx`: the live homepage route no longer renders `components/marketing-homepage.tsx`; it now serves `components/home/LandingPage.tsx`, making the extracted home stack the active homepage source of truth.
- `components/home/LandingHeader.tsx`, `HeroSection.tsx`, `AppShowcaseSection.tsx`, `PricingSection.tsx`, `CTASection.tsx`, `LandingFooter.tsx`, and `LoginModal.tsx`: the live homepage stack now uses shared design-system primitives (`SlateCTA`, `SlateCard`, `SlateSectionHeader`) in the highest-visibility sections instead of the old ad hoc shadcn-only treatment.
- `components/shared/SlateLogo.tsx`: shared logo usage now covers the active homepage, auth pages, dashboard top bar/sidebar/header, mobile nav sheet, Site Walk header, SlateDrop top bar, external response portal, and the preview marketing page. Repo searches now show no remaining raw app/component logo-path references outside `SlateLogo.tsx` itself.
- Git / deploy promotion: committed `7cce7b9` (`Cut homepage to extracted landing shell`), pushed `refactor/brand-token-migration-core-surfaces`, and fast-forwarded `main` to `7cce7b9`. The Vercel production deployment for `7cce7b9` (`dpl_HDVXFzWGum1Zqw8JjgsCCBNiwCAS`) is currently building.
- Validation: `npm run typecheck` passed; local runtime spot-checks against `http://127.0.0.1:3000/` returned the extracted landing-page copy and the shared logo asset.

### What's Broken / Partially Done
- Production deployment for `7cce7b9` is still building, so live browser verification of the new homepage cutover is still pending.
- `components/marketing-homepage.tsx` remains in the repo as a pre-existing 1112-line monolith, but it is no longer the live homepage route.
- `mobile-smoke` CI gate still fails (pre-existing, not touched in this slice).
- Site Walk backend plumbing is mostly present, but three blockers remain before a confident UI build sprint: deliverable editor persistence is still uncertain (`S360-020`), core Phase 1 workflow gaps remain (`S360-019`), and offline capture queue wiring is still not connected to Site Walk components.
- The repo still contains unrelated local scratch/untracked asset files and deletions (`find_shell.mjs`, `get_git*.mjs`, extra SVGs, deleted screenshots/icons). They were intentionally left untouched.

### Context Files Updated
- `ONGOING_ISSUES.md`: updated `S360-037` to reflect that `/` now renders the extracted `components/home/*` stack and that commit `7cce7b9` was promoted to `main`.
- `SLATE360_PROJECT_MEMORY.md`: this handoff.

### Next Steps (ordered)
1. Wait for the Vercel production deployment for `7cce7b9` to reach `READY`, then visually verify the live homepage and auth/shell logo continuity on desktop and mobile.
2. If homepage direction is accepted, continue the same extracted-home migration by either deleting or freezing `components/marketing-homepage.tsx` so it cannot drift back into use.
3. Start the Site Walk UI sprint only after defining the first slice around already-real backend paths: session board/list/detail/review, while explicitly deferring offline capture and unresolved deliverable-persistence work unless those are part of the first milestone.

### Context Files Updated
- `SLATE360_PROJECT_MEMORY.md`: future-chat startup context now lists Cloudflare R2 access and verification commands.
- `.github/copilot-instructions.md`: startup instructions now include Cloudflare R2 in services and environment sources.
- `docs/ENV_AND_TOOL_MATRIX.md`: added the external service/env/tool matrix, including the Cloudflare R2 contract and verification commands.
- `docs/reference/R2_CUTOVER_CHECKLIST.md`: added the R2 production cutover and bucket CORS checklist.
- `ONGOING_ISSUES.md`, `slate360-context/ONGOING_ISSUES.md`, `ops/bug-registry.json`: recorded the resolved R2 CORS blocker and the resolved unified_files/share-link bridge mismatch.
- `slate360-context/BACKEND.md`: documented the shared storage client R2 env contract plus the tracked `unified_files` bridge.
- `slate360-context/SUPABASE_EMAIL_TEMPLATES.md`: updated the documented confirm-signup template to match the Slate360 app palette.
- `SLATE360_PROJECT_MEMORY.md`: this handoff.

### Next Steps (ordered)
1. Merge or deploy this branch so the production domain picks up the `unified_files` share bridge and the updated R2/CSP changes, then rerun the hosted smoke pass.
2. If preview smoke automation is required before merge, provide a Vercel preview-protection bypass or temporarily relax preview protection for the branch deployment.
3. Continue the homepage/web-shell visual migration by extracting the remaining live `components/marketing-homepage.tsx` sections into the already-existing `components/home/*` structure instead of extending the 1,100-line monolith.
4. Decide whether `slate360-storage` should remain the canonical bucket name on R2 or whether the project should move to a distinct R2 bucket before production cutover.

### Session Handoff — 2026-04-14 (Command Center Cleanup Follow-Up)

### What Changed

**A. Dead legacy files deleted**
- `components/dashboard/DashboardClient.tsx`: DELETED — confirmed no route imports it
- `components/dashboard/DashboardOverview.tsx`: DELETED — only imported by DashboardClient

**B. Internal `<a>` tags replaced with `next/link` `Link`**
- `QuickActionsCard.tsx`: all 4 action `<a>` → `Link`
- `ProjectOverviewCard.tsx`: "View all" link, project links, empty-state link → `Link`
- `RecentFilesCard.tsx`: "View all" link, file links, empty-state link → `Link`
- `StorageCreditsCard.tsx`: "Manage" link → `Link`
- `DashboardSidebar.tsx`: logo link, all NAV_ITEMS links, Operations Console link → `Link`

**C. Global SlateDrop loophole closed**
- QuickActionsCard: "Open SlateDrop" action REMOVED, replaced with "Install App" → /install
- RecentFilesCard: files without project_id now link to `/project-hub` instead of `/slatedrop`; "View all" → `/project-hub`; empty-state "Upload your first file" → `/project-hub`
- DashboardSidebar: "SlateDrop" nav item REMOVED from NAV_ITEMS (3 items now: Projects, Site Walk, My Account)
- Command Center no longer routes users to the global `/slatedrop` file bucket from any entry point
- The `/slatedrop` route still exists (accessible directly) but is not promoted from the Command Center

**D. Duplicate project-list widget removed**
- `PendingItemsCard.tsx`: REMOVED from CommandCenterContent layout (was duplicating ProjectOverviewCard)
- `CommandCenterContent.tsx`: Row 2 is now just RecentFilesCard (full-width), no grid
- `PendingItemsCard.tsx` file still exists but is not imported — safe to delete in a future cleanup

**E. App install/download entry point added**
- `app/install/page.tsx`: server component with auth gate, renders InstallClient
- `app/install/InstallClient.tsx`: PWA install page with 4 states: already installed, browser install prompt available, iOS instructions, generic browser instructions
- `QuickActionsCard.tsx`: "Install App" button added as 4th quick action (replaced "Open SlateDrop")

### What's Broken / Partially Done
- `PendingItemsCard.tsx` file still exists but is unused — can be deleted
- `/slatedrop` route still exists as a standalone page (not blocked, just not promoted)
- DashboardSidebar search UI is still placeholder (no actual search implementation)
- `entitlements` prop still unnecessarily passed through WalledGardenDashboard

### Context Files Updated
- SLATE360_PROJECT_MEMORY.md: this handoff

### Next Steps (ordered)
1. Rebuild Project Detail page (project-hub/\[projectId\]/page.tsx) — Phase 1 only
2. Delete orphaned PendingItemsCard.tsx
3. Decide on /slatedrop standalone route: redirect to /project-hub or keep as global bucket
4. Implement sidebar search or remove placeholder

### Session Handoff — 2026-04-15 (Command Center Phase 1 Rebuild)

### What Changed

**A. QuickActionsCard — full rewrite**
- `components/dashboard/command-center/QuickActionsCard.tsx`: replaced with 4 Phase 1 actions: New Project → /project-hub, Open Projects → /project-hub, Open SlateDrop → /slatedrop, Start Site Walk → /site-walk
- Removed: orphaned Upload Files action, 360 Tour (Phase 2)

**B. PendingItemsCard — full rewrite → "Active Projects"**
- `components/dashboard/command-center/PendingItemsCard.tsx`: now shows clickable active project links with creation dates
- Removed: Open RFIs counter, Pending Submittals counter, Budget utilization bar (all Phase 2)

**C. RecentFilesCard — made clickable**
- `components/dashboard/command-center/RecentFilesCard.tsx`: file items are now `<a>` tags linking to project SlateDrop view (if project_id) or global SlateDrop

**D. ProjectOverviewCard — links fixed + header updated**
- `components/dashboard/command-center/ProjectOverviewCard.tsx`: links changed from `/project-hub/{id}/management` to `/project-hub/{id}`, header renamed from "Projects" → "Your Projects", added "View all" link

**E. Dashboard summary API — added project_id to recent files**
- `app/api/dashboard/summary/route.ts`: added `project_id` to Supabase select query and response mapping
- `lib/types/command-center.ts`: added `project_id: string | null` to RecentFile interface

**F. DashboardSidebar — dead links + code removed**
- `components/dashboard/command-center/DashboardSidebar.tsx`: NAV_ITEMS reduced to 4 (Projects, SlateDrop, Site Walk, My Account); removed Deliverables, Clients, Enterprise Settings, Apps expandable section, APP_LINKS array, appsExpanded state, Upgrade CTA; removed Entitlements import
- `components/walled-garden-dashboard.tsx`: removed `entitlements` prop from both DashboardSidebar usages

**G. CommandCenterContent — layout reordered**
- `components/dashboard/command-center/CommandCenterContent.tsx`: Quick Actions now first (left), Your Projects second (right 2/3), then Active Projects + Recent Files row, then Storage

**H. StorageCreditsCard — simplified**
- `components/dashboard/command-center/StorageCreditsCard.tsx`: removed "Buy Credits" button, replaced with "Manage" link to /my-account

### What's Broken / Partially Done
- `entitlements` prop still accepted by WalledGardenDashboard and passed from dashboard/page.tsx but no longer used in sidebar — harmless but could be cleaned up
- DashboardSidebar search UI is still placeholder (no actual search implementation)
- Legacy dead files remain: DashboardClient.tsx, DashboardOverview.tsx (not imported by any route)

### Context Files Updated
- SLATE360_PROJECT_MEMORY.md: this handoff

### Next Steps (ordered)
1. Rebuild Project Detail page (project-hub/\[projectId\]/page.tsx) — Phase 1 only
2. Clean up remaining legacy dead files (DashboardClient.tsx, DashboardOverview.tsx)
3. Migrate hardcoded zinc classes to semantic vars in SlateDrop components
4. Implement sidebar search functionality or remove placeholder

### Session Handoff — 2026-04-14 (Page Reset Prep Pass)

### What Changed

**A. Overflow strategy fixed — removed global duct-tape**
- `app/globals.css`: removed `overflow-x: hidden` from `html` and `body` 
- `components/walled-garden-dashboard.tsx`: added `overflow-x-hidden` to root div
- `app/(dashboard)/project-hub/[projectId]/layout.tsx`: added `overflow-x-hidden` to root div
- `components/marketing-homepage.tsx`: added `overflow-x-hidden` to root div
- Already had overflow guard: DashboardClient, DashboardTabShell, ClientPage, SlateDropClient

**B. Full structural inventory completed (no code changes)**
- Command Center (walled-garden-dashboard → CommandCenterContent): 5 cards mapped
- Project Detail page (project-hub/\[projectId\]/page.tsx): stats grid + widget grid + sidebar mapped
- All 11 project sub-pages inventoried
- Theming approach audited: semantic CSS vars + glass utilities (correct), with hardcoded zinc fallback in some components

### Dependencies Confirmed
- `@tanstack/react-query`: **inactive / safe to remain removed** — zero active imports
- `next-themes`: **inactive / safe to remain removed** — custom ThemeProvider replaces it

### Theming Assessment
- Design system uses CSS variables (--background, --foreground, --primary, etc.) + Tailwind semantic classes (bg-background, text-foreground, text-muted-foreground)
- Glass design system (bg-glass, border-glass, shadow-glass) properly uses CSS vars with dark-mode overrides
- Command Center cards (command-center/*.tsx): correct — use semantic `bg-glass`, `text-foreground`, `text-muted-foreground`, `text-primary`
- SlateDrop files (previous session): use hardcoded `bg-zinc-900`, `border-zinc-800`, `text-zinc-*` — functionally correct but not semantic. These should be migrated to semantic vars during the rebuild.
- DashboardOverview.tsx: uses hardcoded zinc classes throughout — legacy web-era code
- ProjectDashboardGrid.tsx (560L): uses hardcoded zinc classes — legacy, over-limit

### Overflow Strategy
- Global html/body overflow-x: hidden REMOVED (was duct-tape)
- Each page shell now has its own overflow-x-hidden:
  - WalledGardenDashboard (Command Center)
  - DashboardClient (old tabbed dashboard)  
  - DashboardTabShell (my-account, analytics, etc.)
  - ClientPage (project-hub listing)
  - Project Detail layout
  - MarketingHomepage
  - SlateDropClient (uses overflow-hidden)

### What's Broken / Partially Done
- Nothing broken. Typecheck clean.
- Pre-existing oversized files: ProjectDashboardGrid 560L, LocationMap 1892L, marketing-homepage 1160L, WizardLocationPicker 412L, ObservationsClient 335L

### Context Files Updated
- SLATE360_PROJECT_MEMORY.md: this handoff

### Next Steps (ordered)
1. Owner reviews Command Center + Project Detail inventories below, approves clean-slate hierarchy
2. Implement approved Command Center rebuild (likely: strip DashboardOverview/widget grid, keep WalledGardenDashboard shell)
3. Implement approved Project Detail rebuild (likely: simplify stats, reduce widget count, add drillable links)
4. Migrate SlateDrop hardcoded zinc classes to semantic CSS vars
5. Extract ProjectDashboardGrid.tsx (560L) into smaller modules before any edits

---

### Session Handoff — 2026-04-14 (Build Stabilization + Security Verification + Legacy Cleanup)

### What Changed

**A. Fixed: /_not-found SSG build failure**
- **Root cause**: Sentry's `withSentryConfig` webpack plugin injects debug-id preamble code into server chunks. During SSG prerendering, this causes a non-deterministic race where React's internal `LayoutRouterContext` is null when the bundled `InnerLayoutRouter` calls `useContext()`. The error manifests on random pages each build — /login, /_not-found, /forgot-password, /super-admin.
- **Isolation**: Tested minimal next.config.ts (no Sentry, no Serwist, no webpack aliases, no experimental config), stripped root layout, minimal pages — same error. Tested React 19.0.0, 19.1.0, 19.2.4 — same error. Tested Next.js 15.3.2 — same error (different trace). Problem is in the SSG prerender worker itself.
- **Fix**: Added `export const dynamic = "force-dynamic"` to `app/layout.tsx`. Slate360 is a fully authenticated SaaS — zero pages benefit from static generation. All routes now render server-side on demand.
- **Result**: `npm run build` succeeds cleanly. `✓ Generating static pages (72/72)`. All routes are `ƒ` (dynamic).

**B. Verified and confirmed: /api/admin/beta is server-side protected**
- `app/api/admin/beta/route.ts`: Both GET and PATCH handlers wrapped in `withAuth()` (server-side session validation). Inside handler, `isOwnerEmail(user.email)` checks against `CEO_EMAIL` env var. Returns 403 for non-owners. Fail-closed: returns false if CEO_EMAIL is unset.
- `app/(dashboard)/operations-console/page.tsx`: Server component checks `canAccessOperationsConsole` from `resolveServerOrgContext()`, returns `notFound()` for non-owners.
- No changes needed — security was already correct.

**C. Purged all Web3/crypto legacy code**
- Deleted files: `components/Web3Providers.tsx`, `lib/wagmi-config.ts`, `components/dashboard/CeoCommandCenterClient.tsx`
- Removed npm packages: `wagmi`, `viem`, `@coinbase/wallet-sdk`, `@polymarket/clob-client`, `@tanstack/react-query`, `@safe-global/safe-apps-sdk`, `@safe-global/safe-apps-provider`, `@metamask/sdk`, `@base-org/account`, `next-themes`
- Removed from `next.config.ts`: webpack alias stubs (wagmi connector peer deps), `disableLogger` deprecated option, polygon/drpc CSP connect-src entries
- Rationale: Market Robot route `/market` was fully deleted in a prior session. All Web3 code was orphaned with zero importers.

**D. Behavior preservation verified**
- ✅ Beta gate: middleware PHASE_1_BLOCKED_PATHS still blocks 7 routes
- ✅ Operations Console: page checks `canAccessOperationsConsole`, API checks `isOwnerEmail()`
- ✅ PDF → Deliverables bridge: `bridgePdfToSlateDrop` resolves "Deliverables" folder
- ✅ Photo → SlateDrop bridge: `bridgePhotoToSlateDrop` resolves "Photos" folder
- ✅ Hidden module route blocking: /tours, /design-studio, /content-studio, /geospatial, /virtual-studio, /analytics, /tour-builder

### What's Broken / Partially Done
1. Offline capture queue not wired to Site Walk components
2. Site Walk layout unification pending
3. Stale context docs: DASHBOARD.md, BACKEND.md, SLATEDROP.md
4. ESLint config doesn't cover site-walk/ or api/ dirs (pre-existing)
5. 10 pre-existing oversized files (DashboardWidgetRenderer, LocationMap, marketing-homepage, etc.)

### Context Files Updated
- `SLATE360_PROJECT_MEMORY.md`: This handoff

### Next Steps (ordered)
1. Update stale context docs (SLATEDROP.md, BACKEND.md, DASHBOARD.md)
2. Wire offline capture queue to Site Walk components
3. Unify Site Walk layout with Slate360 shell
4. Address oversized file extractions
5. Consider Sentry v10→v11 migration to resolve debug-id SSG interaction long-term

### Session Handoff — 2026-04-15 (Bridge-Adjacent Hardening Slice)

### What Changed

**A. Verified: System folder protection already in place**
- `app/api/slatedrop/folders/route.ts`: PATCH handler already checks `folder.is_system` and returns 400 "System folders cannot be renamed". DELETE handler already checks `folder.is_system` and returns 400 "System folders cannot be deleted". No additional changes needed.

**B. Implemented: Bridge failure signaling**
- `app/api/site-walk/items/route.ts` (128 lines): Bridge return value is now captured. If `bridgePhotoToSlateDrop()` returns `null` or throws, a `warnings` array is included in the response: `{ item: data, warnings: ["SlateDrop bridge failed — photo saved but not linked to project files."] }`. Clean bridge operations return `{ item: data }` with no warnings field.

**C. Verified: Capture UX loading state**
- `components/site-walk/CaptureCamera.tsx` (151 lines): Already has proper duplicate-submit prevention via `saving` state + `disabled={!isStreaming || saving}` + Loader2 spinner during save. No changes needed.

### What's Broken / Partially Done
1. Market DB migration created but NOT executed — needs manual `supabase db push` or review
2. Deliverable PDFs not yet bridged to SlateDrop "Reports" folder
3. `lib/wagmi-config.ts` + `components/Web3Providers.tsx` are dead code
4. Offline capture queue not wired to Site Walk components
5. Site Walk layout unification pending
6. Stale context docs: DASHBOARD.md, BACKEND.md, SLATEDROP.md, SITE_WALK_BUILD_FILE.md
7. Client-side does not yet consume `warnings` from items API response (needs toast or inline alert)

### Context Files Updated
- `SLATE360_PROJECT_MEMORY.md`: This handoff

### Next Steps (ordered)
1. Wire client-side handling for `warnings` array in items API response (toast on bridge failure)
2. Review and execute Market DB cleanup migration (`supabase db push`)
3. Bridge deliverable PDF exports to SlateDrop "Reports" folder
4. Verify end-to-end: create project → provision folders → Site Walk capture → confirm photo in SlateDrop → attempt delete → confirm blocked
5. Update stale context docs
6. Wire offline capture queue
7. Unify Site Walk layout with Slate360 shell

### Session Handoff — 2026-04-14 (Bridge Hardening + Storage Integrity + Market DB Cleanup)

### What Changed

**A. Hardened: Bridge execution is now awaited**
- `app/api/site-walk/items/route.ts` (122 lines): The `bridgePhotoToSlateDrop()` call was a floating un-awaited promise that could be killed by the serverless runtime before completing. Now wrapped in `try { await bridgePhotoToSlateDrop(...) } catch`. Bridge failures still return null and log errors — they don't block the item response — but the DB writes are guaranteed to complete before the function exits.
- `lib/site-walk/slatedrop-bridge.ts`: Updated docstring to document the "MUST be awaited" contract.

**B. Implemented: Phase 1 file ownership / deletion safety**
- `app/api/slatedrop/delete/route.ts` (88 lines): Before soft-deleting a file, now checks `site_walk_items.file_id` for linked captures. If any Site Walk item references the file, returns `409 Conflict` with message "This file is attached to a Site Walk capture and cannot be deleted from SlateDrop." This prevents dangling references where a Site Walk item's `file_id` points to a deleted SlateDrop record.
- Rule: **Site Walk owns the S3 object lifecycle for bridged files. SlateDrop cannot independently delete them.**

**C. Created: Market DB cleanup migration**
- `supabase/migrations/20260414000002_drop_market_robot_tables.sql`: Drops 11 orphaned Market Robot tables + 1 trigger + 1 function. Uses plain `DROP TABLE IF EXISTS` — NO CASCADE. Will fail cleanly if an unexpected FK exists. Also resets `slate360_staff.access_scope` default from `'{market}'` to `'{}'`.
- Tables dropped: `market_activity_log`, `market_scheduler_lock`, `market_watchlist`, `market_tab_prefs`, `market_bot_runtime_state`, `market_bot_runtime`, `market_plans`, `market_directives`, `market_trades`, `market_bot_settings__legacy_backup`, `market_bot_state__legacy_backup`.
- **NOT YET EXECUTED** — migration file is ready for review and manual execution via `supabase db push` or migration CLI.

**D. Fixed: Sub-route blocking regex**
- `middleware.ts` (192 lines): Changed regex from `/^\/project-hub\/[^/]+\/(.+)/` to `/^\/project-hub\/[^/]+\/([^/]+)/`. The old `(.+)` would capture trailing slashes and sub-paths (e.g., `budget/` or `budget/extra`), causing the segment match to fail and bypass the block. The new `([^/]+)` captures only the first segment, making the block robust against trailing slashes.

### What's Broken / Partially Done
1. Market DB migration created but NOT executed — needs manual `supabase db push` or review
2. Deliverable PDFs not yet bridged to SlateDrop "Reports" folder
3. `lib/wagmi-config.ts` + `components/Web3Providers.tsx` are dead code
4. Offline capture queue not wired to Site Walk components
5. Site Walk layout unification pending
6. Stale context docs: DASHBOARD.md, BACKEND.md, SLATEDROP.md, SITE_WALK_BUILD_FILE.md

### Context Files Updated
- `SLATE360_PROJECT_MEMORY.md`: This handoff

### Next Steps (ordered)
1. Review and execute Market DB cleanup migration (`supabase db push`)
2. Bridge deliverable PDF exports to SlateDrop "Reports" folder
3. Verify end-to-end: create project → provision folders → Site Walk capture → confirm photo in SlateDrop → attempt delete → confirm blocked
4. Update stale context docs
5. Wire offline capture queue
6. Unify Site Walk layout with Slate360 shell

### Session Handoff — 2026-04-14 (Site Walk → SlateDrop Bridge + Phase 2 Route Blocking)

### What Changed

**Blocked: Phase 2 project sub-routes**
- `middleware.ts`: Added `PHASE_1_HIDDEN_PROJECT_SEGMENTS` array blocking 8 sub-routes: budget, schedule, daily-logs, observations, drawings, rfis, submittals, management. Regex matches `/project-hub/[id]/[segment]` and redirects to project overview.

**Renamed: "Files" tab → "SlateDrop"**
- `app/(dashboard)/project-hub/[projectId]/layout.tsx`: Tab label changed from "Files" to "SlateDrop".

**Created: Site Walk → SlateDrop bridge**
- `lib/site-walk/slatedrop-bridge.ts` (100 lines): New utility that bridges Site Walk photo captures to SlateDrop by:
  1. Resolving the project's "Photos" folder in `project_folders`
  2. Creating a `slatedrop_uploads` record (status: active, linked to folder)
  3. Linking `site_walk_items.file_id` → `slatedrop_uploads.id`
  4. Tracking storage usage via `trackStorageUsed()`
- `app/api/site-walk/items/route.ts` (116 lines): POST handler now:
  - Fetches `project_id` from session (was only fetching `id`)
  - After item creation, calls `bridgePhotoToSlateDrop()` for photo/video items
  - Non-blocking — bridge failures are logged but don't prevent item creation
  - Passes `file_size` from metadata for accurate storage tracking

**Fixed: Pre-existing field name bug (photo_s3_key → s3_key)**
- `components/site-walk/CaptureCamera.tsx`: Changed `photo_s3_key: s3Key` → `s3_key: s3Key` (was sending wrong field name — S3 key was NEVER being stored in DB). Added `file_size: result.blob.size` to metadata.
- `lib/server/quota-check.ts`: Changed `.not("photo_s3_key", "is", null)` → `.not("s3_key", "is", null)` (was querying non-existent column).

**Market/Athlete360 DB debris identified (NOT cleaned — report only)**
Found 11 orphaned tables in Supabase: `market_directives`, `market_trades`, `market_bot_runtime`, `market_bot_runtime_state`, `market_watchlist`, `market_tab_prefs`, `market_activity_log`, `market_scheduler_lock`, `market_plans`, `market_bot_settings__legacy_backup`, `market_bot_state__legacy_backup`. Plus 1 trigger function (`set_market_plans_updated_at`), ~8 indices, ~30 RLS policies. All user-isolated via `auth.users(id)` FK — no cross-table dependencies. Also `slate360_staff.access_scope` defaults to `'{market}'` but code no longer reads it. 0 Athlete360 tables exist. All safe to drop in a dedicated cleanup session.

### What's Broken / Partially Done
1. Site Walk → SlateDrop bridge requires project folders to be provisioned (via `/api/slatedrop/provision`). If a project's "Photos" folder doesn't exist, bridge silently skips + logs warning.
2. Deliverable PDFs (from `/api/site-walk/deliverables/[id]/export`) are NOT yet bridged to SlateDrop "Reports" folder. Only photo/video captures are bridged.
3. Text notes, voice notes, annotations don't have S3 files → no SlateDrop bridging (correct behavior).
4. Market/Athlete360 DB tables are orphaned debris — harmless but should be cleaned.
5. `lib/wagmi-config.ts` + `components/Web3Providers.tsx` are dead code.
6. Site Walk → SlateDrop bridge missing: offline capture queue not wired, layout unification pending.

### Context Files Updated
- `SLATE360_PROJECT_MEMORY.md`: This handoff

### Context Files to Update (next session)
- `docs/site-walk/SITE_WALK_BUILD_FILE.md`: Mark "SlateDrop integration" as partially done
- `slate360-context/SLATEDROP.md`: Add bridge documentation
- `slate360-context/DASHBOARD.md`: Market tab references are stale (from prior session)
- `ops/bug-registry.json`: Log the photo_s3_key field name bug as fixed

### Next Steps (ordered)
1. Verify end-to-end: create project → provision folders → Site Walk capture → confirm photo in SlateDrop
2. Bridge deliverable PDF exports to SlateDrop "Reports" folder
3. Clean Market/Athlete360 DB debris (dedicated session with migration)
4. Wire offline capture queue to Site Walk components
5. Unify Site Walk layout with Slate360 shell
6. Update stale context docs

### Session Handoff — 2026-04-14 (Phase 1 Surface Integrity — Market/Athlete Deletion + Projects Nav + Tab Trim)

### What Changed

**Deleted: Market Robot and Athlete360 — full removal (~100+ files)**

All market/athlete360 routes, components, hooks, lib, and API routes deleted:
- `app/market/` (2 files), `app/athlete360/page.tsx`, `app/api/market/` (20 API routes)
- `components/dashboard/market/` (37 components), `components/dashboard/MarketClient.tsx`
- `lib/hooks/useMarket*.ts` (12 hooks), `lib/market/` (27 lib files), `lib/market-bot.ts`

**Cleaned: All references to market/athlete access flags**

- `lib/server/org-context.ts`: Removed `InternalTabId` type, `canAccessMarket`/`canAccessAthlete360` fields, `internalAccessScopes`, `StaffAccessRow` type. `resolveInternalAccess()` now returns only `{ canAccessOperationsConsole, hasInternalAccess }`.
- `lib/hooks/useDashboardState.ts`: Removed `canAccessMarket`/`canAccessAthlete360` from `DashboardProps`.
- `components/dashboard/DashboardClient.tsx`: Removed `MarketClient` import, market tab rendering, simplified `useVisibleTabs()`.
- 6 server pages (project-hub, integrations, tours, operations-console, analytics, my-account): Simplified `internalAccess` props to `{ operationsConsole: canAccessOperationsConsole }`.
- `project-hub/[projectId]/layout.tsx`: Same simplification.
- 12 component type definitions: `internalAccess` type changed from `{ operationsConsole?; market?; athlete360? }` to `{ operationsConsole?: boolean }`.
- `middleware.ts`: Removed `/market` and `/athlete360` from `PHASE_1_BLOCKED_PATHS` (routes deleted, blocking unnecessary).
- `vercel.json`: Removed market scheduler cron entirely.
- `lib/server/api-auth.ts`: Removed `withMarketAuth()` function.

**Added: Projects as first-class nav destination**

- `components/shared/QuickNav.tsx`: Added Projects (`/project-hub`, FolderKanban icon), removed Market/Athlete items.
- `components/shared/MobileNavSheet.tsx`: Same.
- `components/shared/MobileModuleBar.tsx`: Same.
- `components/dashboard/command-center/DashboardSidebar.tsx`: Added Projects nav item below Apps.

**Trimmed: Project detail tabs to Phase 1 only**

- `app/(dashboard)/project-hub/[projectId]/layout.tsx`: TABS reduced from 12 to 4: Overview, Files, Photos, Punch List. Hidden tabs (RFIs, Submittals, Daily Logs, Observations, Drawings, Budget, Schedule, Management) page files still build — just not linked in tab nav.

**Verified: Hardening intact**

- Beta gate: `(dashboard)/layout.tsx` checks `isBetaApproved`, redirects to `/beta-pending`.
- Operations Console: requires `canAccessOperationsConsole`, 404 otherwise.
- Middleware: 7 blocked paths remain (tours, design-studio, content-studio, geospatial, virtual-studio, analytics, tour-builder).
- Build + typecheck: clean (zero errors after `.next/types` cache clear).

**Dead code identified (not deleted — harmless):**
- `lib/wagmi-config.ts` and `components/Web3Providers.tsx` — were only imported by deleted MarketProviders.
- `scripts/ops/` may reference deleted market files — ops scripts, not build-affecting.

### What's Broken / Partially Done
1. Site Walk → SlateDrop bridge missing
2. Item statuses don't match spec
3. No collaborator system
4. Dead code: `wagmi-config.ts` + `Web3Providers.tsx` (can clean later)

### Context Files to Update
- `slate360-context/DASHBOARD.md`: Market tab references are stale
- `slate360-context/dashboard-tabs/market-robot/START_HERE.md`: Entire market-robot context tree is now archive-only
- `slate360-context/BACKEND.md`: Market cron/API entries are stale
- `ops/module-manifest.json`: Market module entry should be marked removed

### Next Steps (ordered)
1. Update context docs listed above to reflect market/athlete deletion
2. Clean dead code (`wagmi-config.ts`, `Web3Providers.tsx`) if desired
3. Build Site Walk → SlateDrop bridge
4. Implement item status system per spec
5. Begin collaborator system

### Session Handoff — 2026-04-14 (Projects Route Fix + Legacy Route Containment)

### What Changed

**Fixed: `/project-hub` route was completely broken (404)**

All project-hub route files used the `_page.tsx` / `_layout.tsx` naming convention (underscore prefix), which Next.js App Router does not recognize as route convention files. This meant `/project-hub` and all sub-routes returned 404. Renamed 13 `_page.tsx` → `page.tsx` and 1 `_layout.tsx` → `layout.tsx`:

- `app/(dashboard)/project-hub/page.tsx` (was `_page.tsx`)
- `app/(dashboard)/project-hub/[projectId]/page.tsx` (was `_page.tsx`)
- `app/(dashboard)/project-hub/[projectId]/layout.tsx` (was `_layout.tsx`)
- `app/(dashboard)/project-hub/[projectId]/rfis/page.tsx`
- `app/(dashboard)/project-hub/[projectId]/submittals/page.tsx`
- `app/(dashboard)/project-hub/[projectId]/budget/page.tsx`
- `app/(dashboard)/project-hub/[projectId]/schedule/page.tsx`
- `app/(dashboard)/project-hub/[projectId]/punch-list/page.tsx`
- `app/(dashboard)/project-hub/[projectId]/daily-logs/page.tsx`
- `app/(dashboard)/project-hub/[projectId]/observations/page.tsx`
- `app/(dashboard)/project-hub/[projectId]/drawings/page.tsx`
- `app/(dashboard)/project-hub/[projectId]/photos/page.tsx`
- `app/(dashboard)/project-hub/[projectId]/slatedrop/page.tsx`
- `app/(dashboard)/project-hub/[projectId]/management/page.tsx`

Build now shows `/project-hub` + all 11 sub-routes in route list (previously absent).

**Contained: `/market` and `/athlete360` blocked for Phase 1 beta**

- `middleware.ts` (167→169 lines): Added `/market` and `/athlete360` to `PHASE_1_BLOCKED_PATHS` array. These routes now redirect to `/dashboard` on direct URL access.
- `components/shared/QuickNav.tsx`: Added `phase1Hidden: true` to Market Robot and Athlete360 nav items.
- `components/shared/MobileNavSheet.tsx`: Same.
- `components/shared/MobileModuleBar.tsx`: Same.
- Route files (`app/market/`, `app/athlete360/`) are **preserved** — not deleted. Page-level auth guards remain intact as defense-in-depth. Routes can be un-blocked by removing from `PHASE_1_BLOCKED_PATHS` and removing `phase1Hidden`.
- **CEO-only inline dashboard tabs** for Market Robot still render inside `DashboardClient.tsx` (they're inline components, not route links). These are only visible when `canAccessMarket` is true (CEO only).

### What's Broken / Partially Done
1. **Migration still needed** — `20260414000001_add_beta_approved_to_profiles.sql` must run on Supabase
2. **`CEO_EMAIL` env var required** — if missing, owner access is disabled + warning logged
3. **Project Hub not in main nav** — accessible via MobileQuickAccess, DashboardProjectCard, and QuickActionsCard links, but NOT in QuickNav/MobileNavSheet primary nav items
4. Site Walk → SlateDrop bridge missing
5. Item statuses don't match spec
6. No collaborator system
7. Offline infrastructure not wired to Site Walk
8. Operations Console content is mock data
9. Redundant env vars (`PRIMARY_CEO_EMAIL`, `PLATFORM_ADMIN_EMAILS`, `SLATE360_PLATFORM_ADMINS`) unused

### Context Files Updated
- `SLATE360_PROJECT_MEMORY.md`: this handoff

### Next Steps (ordered)
1. **Run migration** `20260414000001_add_beta_approved_to_profiles.sql` on Supabase
2. **Verify `CEO_EMAIL` is set** in Vercel production environment variables
3. **Set `is_beta_approved = true`** for CEO + known beta testers
4. Site Walk → SlateDrop bridge implementation
5. Owner decides on status reconciliation (spec statuses vs current code statuses)
6. Consider adding Project Hub to main nav (QuickNav/MobileNavSheet) if desired

### Session Handoff — 2026-04-14 (Route Cleanup + Legacy Name Elimination)

### What Changed

**Route rename: `/ceo` → `/operations-console` + legacy `canAccessCeo` naming purged**

- **`app/(dashboard)/operations-console/page.tsx`** (NEW location, 35 lines): Moved from `app/(dashboard)/ceo/`. Page renamed to `OperationsConsolePage`. Metadata title updated. Destructures `canAccessOperationsConsole` (was `canAccessCeo`). Still renders `CeoCommandCenterClient` (legacy component name, contained — no external reference).
- **`middleware.ts`** (160→167 lines): Added `/ceo` → `/operations-console` redirect for bookmarks/history safety. Redirect runs before all other checks.
- **`lib/server/org-context.ts`** (224 lines): `canAccessCeo` → `canAccessOperationsConsole` in `ServerOrgContext` type, `resolveInternalAccess()` return, and all spread sites. `hasOperationsConsoleAccess` alias now references `canAccessOperationsConsole`.
- **Nav components** (4 files): Updated `internalKey: "ceo"` → `"operationsConsole"`, `href: "/ceo"` → `"/operations-console"`, `internalAccess` type `{ ceo?: boolean }` → `{ operationsConsole?: boolean }`.
  - `components/shared/QuickNav.tsx`
  - `components/shared/MobileNavSheet.tsx`
  - `components/shared/MobileModuleBar.tsx`
  - `components/dashboard/command-center/DashboardSidebar.tsx`
- **Server pages** (7 files): All destructuring changed `canAccessCeo` → `canAccessOperationsConsole`, all `internalAccess` objects changed `{ ceo: ... }` → `{ operationsConsole: ... }`:
  - `app/market/page.tsx`, `app/(dashboard)/integrations/page.tsx`, `app/(dashboard)/tours/page.tsx`, `app/(dashboard)/project-hub/_page.tsx`, `app/(dashboard)/project-hub/[projectId]/_layout.tsx`, `app/(dashboard)/my-account/page.tsx`, `app/(dashboard)/analytics/page.tsx`
- **Client components** (11 files): Updated `internalAccess` type + prop names:
  - `lib/hooks/useDashboardState.ts`, `components/dashboard/DashboardClient.tsx`, `components/dashboard/TabRedirectCard.tsx`, `components/dashboard/DashboardOverview.tsx`
  - Shell components: `CeoCommandCenterClient.tsx`, `VirtualStudioShell.tsx`, `ContentStudioShell.tsx`, `GeospatialShell.tsx`, `DesignStudioShell.tsx`, `ToursShell.tsx`, `MarketRouteShell.tsx`, `MyAccountShell.tsx`, `AnalyticsReportsClient.tsx`
  - ClientPage types: `integrations/ClientPage.tsx`, `project-hub/ClientPage.tsx`
- **Shared types** (2 files): `DashboardTabShell.tsx`, `DashboardHeader.tsx` — `internalAccess` type updated.
- **`lib/entitlements.ts`**: Comment updated from `canAccessCeo` to `canAccessOperationsConsole`.

**Route verification results:**
- **`/market`**: EXISTS. `app/market/page.tsx` + `app/market/MarketProviders.tsx`. Internal-staff-only route gated by `canAccessMarket` from `resolveServerOrgContext()`. Shows in QuickNav/MobileNavSheet/MobileModuleBar when `internalAccess.market` is true. NOT beta-gated (intentional — internal route, not consumer feature). NOT in middleware auth checks — relies on page-level auth only.
- **`/athlete360`**: EXISTS. `app/athlete360/page.tsx` only. Internal-staff-only route gated by `canAccessAthlete360`. Minimal placeholder page. Same nav/auth pattern as `/market`.
- Both are NOT Phase 1 blocked and NOT exposed to regular beta users (internal access scopes required).

**Contained legacy naming:**
- `CeoCommandCenterClient.tsx` (component filename + name) — still uses "Ceo" naming internally. This is contained: only imported by `operations-console/page.tsx`. No external consumer code references "Ceo" anymore. Renaming the client component is deferred until the Operations Console UI work.
- `isSlateCeo` field in `ServerOrgContext` — this is a role identity flag ("is this user the CEO?"), not a route name. Kept as-is.
- `isCEOOnly` property on DashTab type in `DashboardClient.tsx` — visual indicator, not a route. Contained.

### What's Broken / Partially Done
1. **Migration still needed** — `20260414000001_add_beta_approved_to_profiles.sql` must run on Supabase
2. **`CEO_EMAIL` env var required** — if missing, owner access is disabled + warning logged
3. Site Walk → SlateDrop bridge missing
4. Item statuses don't match spec
5. No collaborator system
6. Offline infrastructure not wired to Site Walk
7. Operations Console content is mock data
8. `project-hub/_page.tsx` is underscore-prefixed — not routable
9. Redundant env vars (`PRIMARY_CEO_EMAIL`, `PLATFORM_ADMIN_EMAILS`, `SLATE360_PLATFORM_ADMINS`) unused

### Context Files Updated
- `SLATE360_PROJECT_MEMORY.md`: this handoff
- Context docs (GUARDRAILS.md, BACKEND.md, MODULE_REGISTRY.md, etc.) still reference `/ceo` and `canAccessCeo` — these are reference-only docs, not code. Update on next doc pass.

### Next Steps (ordered)
1. **Run migration** `20260414000001_add_beta_approved_to_profiles.sql` on Supabase
2. **Verify `CEO_EMAIL` is set** in Vercel production environment variables
3. **Set `is_beta_approved = true`** for the CEO account and any known beta testers
4. Site Walk → SlateDrop bridge implementation
5. Owner decides on status reconciliation (spec statuses vs current code statuses)
6. Update context docs to reflect `/operations-console` naming (low priority, reference-only)

### Session Handoff — 2026-04-14 (Beta Gate Hardening Pass 2)

- **`lib/server/beta-access.ts`** (75→82 lines): `isOwnerEmail()` no longer has hardcoded fallback — returns `false` + logs warning when `CEO_EMAIL` env var is missing. `checkBetaApproved()` now wrapped in React `cache()` — deduplicates the profiles query when both a layout and a page call it in the same request.
- **`lib/server/org-context.ts`** (218→224 lines): Added `import { cache } from "react"`. `resolveServerOrgContext` now wrapped in `cache()` — when `(dashboard)/layout.tsx` calls it and then a nested page calls it again, the second call is a zero-cost cache hit.
- **`app/(dashboard)/layout.tsx`** (26→29 lines): Refactored to use cached `resolveServerOrgContext()` instead of separate `createClient() → getUser()` + `requireBetaAccess()`. Checks `isBetaApproved` directly from context. Eliminates 2 duplicate DB calls per dashboard request (auth + profiles).
- **`app/slatedrop/page.tsx`** (27→26 lines): Removed separate `requireBetaAccess()` import/call. Now checks `isBetaApproved` from cached `resolveServerOrgContext()`.
- **`app/(dashboard)/ceo/page.tsx`** (33→35 lines): Added explicit comment documenting the two-layer protection chain (layout beta gate → page owner-only gate).
- **`app/beta-pending/page.tsx`** (43→61 lines): Now a server component that checks auth + approval status on render. If user is now approved, redirects to `/dashboard` automatically. New `BetaPendingRecheck` client component provides a "Check my status" button (calls `router.refresh()` to re-run server check).
- **`components/shared/BetaPendingRecheck.tsx`** (NEW, 33 lines): Client component with `useTransition`-wrapped `router.refresh()`. Shows spinner during check, updates label after first check.

**Architecture decisions:**
- React `cache()` on `resolveServerOrgContext` eliminates N+1 DB queries — layout + page share the same resolved context per request
- React `cache()` on `checkBetaApproved` deduplicates the profiles query even when called from different code paths (e.g., `requireBetaAccess` in `(apps)/layout.tsx`)
- `isOwnerEmail()` fails safely (returns `false`) when `CEO_EMAIL` is unset — no silent privilege escalation from hardcoded fallback
- Beta-pending recheck uses `router.refresh()` which re-renders the server component, checking approval server-side — no client-side API needed
- `(apps)/layout.tsx` still uses `requireBetaAccess()` since it doesn't call `resolveServerOrgContext()` — the cached `checkBetaApproved` inside handles dedup
- Operations Console (`/ceo`) is protected by two layers: layout-level beta gate + page-level `canAccessCeo` (owner-only) check

**Duplicate query analysis (before → after):**
- `/dashboard` request: 4 DB calls (layout getUser + layout checkBeta + page getUser + page checkBeta + org queries) → 2 DB calls (cached context resolves once, layout + page share it)
- `/ceo` request: same improvement
- `/slatedrop`: 3 DB calls → 2 (one context resolution, no separate beta check)
- `(apps)/*`: `checkBetaApproved` cached, so layout + any page that calls it share the result

### What's Broken / Partially Done
1. **Migration still needed** — `20260414000001_add_beta_approved_to_profiles.sql` must run on Supabase
2. Site Walk → SlateDrop bridge missing
3. Item statuses don't match spec
4. No collaborator system
5. Offline infrastructure not wired to Site Walk
6. Operations Console is mock data (route exists, content is placeholders)
7. `project-hub/_page.tsx` is underscore-prefixed — not routable (pre-existing issue)
8. **`CEO_EMAIL` env var is now required** — if missing, owner access is disabled and a warning is logged. Verify it's set in Vercel production env.
9. Redundant env vars (`PRIMARY_CEO_EMAIL`, `PLATFORM_ADMIN_EMAILS`, `SLATE360_PLATFORM_ADMINS`) still in `.env` — unused

### Context Files Updated
- `SLATE360_PROJECT_MEMORY.md`: this handoff

### Next Steps (ordered)
1. **Run migration** `20260414000001_add_beta_approved_to_profiles.sql` on Supabase
2. **Verify `CEO_EMAIL` is set** in Vercel production environment variables
3. **Set `is_beta_approved = true`** for the CEO account and any known beta testers
4. Site Walk → SlateDrop bridge implementation
5. Owner decides on status reconciliation (spec statuses vs current code statuses)
6. Offline wiring: connect existing queue/banner/sync to Site Walk capture
7. Operations Console minimum viable shell
8. Clean up redundant CEO email env vars from `.env`

### Session Handoff — 2026-04-14 (Beta Gate Hardening)

### What Changed

**Beta gate hardened — fail-closed enforcement, no more middleware DB query**

- **`lib/server/beta-access.ts`** (NEW, 75 lines): Centralized helper with `isOwnerEmail(email)` (uses `process.env.CEO_EMAIL`, fallback to hardcoded), `checkBetaApproved(userId)` (fail-closed DB query), `requireBetaAccess(user)` (redirects to `/beta-pending` on failure).
- **`app/beta-pending/page.tsx`**: Moved from `app/(dashboard)/dashboard/beta-pending/` to top-level `app/beta-pending/` to avoid redirect loops when `(dashboard)/layout.tsx` enforces beta access.
- **`middleware.ts`** (175→160 lines): Removed the entire beta gate DB query block (was fail-open). Added Phase 1 blocked-paths check (pathname-only, no DB) that redirects `/tours`, `/design-studio`, `/content-studio`, `/geospatial`, `/virtual-studio`, `/analytics`, `/tour-builder` → `/dashboard`.
- **`app/(dashboard)/layout.tsx`** (22→26 lines): Converted to async server component. Added `requireBetaAccess()` call — protects ALL `(dashboard)` routes including dashboard, ceo, tours, analytics, settings, etc.
- **`app/(apps)/layout.tsx`** (38→40 lines): Added `requireBetaAccess()` call after existing auth check — protects all `(apps)` routes.
- **`app/slatedrop/page.tsx`**: Added `requireBetaAccess()` call after auth check.
- **`lib/server/org-context.ts`** (200→218 lines): Replaced hardcoded `"slate360ceo@gmail.com"` with `isOwnerEmail()` from beta-access helper. Added `isBetaApproved` field (resolved via `checkBetaApproved()`). Added `hasOperationsConsoleAccess` convenience alias (= `canAccessCeo`).
- **`app/(dashboard)/dashboard/page.tsx`**: Now destructures `hasOperationsConsoleAccess` directly from context instead of aliasing `canAccessCeo`.

**Architecture decisions:**
- Beta DB query moved from middleware to server layouts/pages — middleware stays lightweight (pathname checks only)
- Three enforcement points: `(dashboard)/layout.tsx`, `(apps)/layout.tsx`, `app/slatedrop/page.tsx` — covers all protected route groups
- Owner email resolved from `CEO_EMAIL` env var (already set in `.env`), with fallback to hardcoded address for backward compat
- Phase 1 blocked paths in middleware are a simple pathname array — easy to remove when modules ship

### What's Broken / Partially Done
1. **Migration still needed** — `20260414000001_add_beta_approved_to_profiles.sql` must run on Supabase before beta gate actually blocks users
2. Site Walk → SlateDrop bridge missing
3. Item statuses don't match spec
4. No collaborator system
5. Offline infrastructure not wired to Site Walk
6. Operations Console is mock data (route exists, content is placeholders)
7. `project-hub/_page.tsx` is underscore-prefixed — not routable (pre-existing issue)
8. 4 redundant CEO email env vars in `.env` (`CEO_EMAIL`, `PRIMARY_CEO_EMAIL`, `PLATFORM_ADMIN_EMAILS`, `SLATE360_PLATFORM_ADMINS`) — only `CEO_EMAIL` is used in code

### Context Files Updated
- `SLATE360_PROJECT_MEMORY.md`: this handoff

### Next Steps (ordered)
1. **Run migration** `20260414000001_add_beta_approved_to_profiles.sql` on Supabase
2. **Set `is_beta_approved = true`** for the CEO account and any known beta testers
3. Site Walk → SlateDrop bridge implementation
4. Owner decides on status reconciliation (spec statuses vs current code statuses)
5. Offline wiring: connect existing queue/banner/sync to Site Walk capture
6. Unified bug/feature reporting form
7. Operations Console minimum viable shell (replace mock metrics with real beta user list + approval toggle)
8. Clean up redundant CEO email env vars

### Session Handoff — 2026-04-14 (Beta-Surface Honesty + Beta Gate Implementation)

### What Changed

**First code changes — beta-surface honesty + beta-access foundation**

- **DashboardSidebar.tsx**: Removed 360 Tours and Design Studio from APP_LINKS. Added Operations Console link (gated by `hasOperationsConsoleAccess` prop). Added `Shield` icon import.
- **QuickNav.tsx**: Added `phase1Hidden: true` to 360 Tours, Design Studio, Content Studio, Geospatial, Virtual Studio, Analytics. Renamed "CEO" to "Operations Console" in nav label. Filter logic skips `phase1Hidden` items.
- **MobileNavSheet.tsx**: Same `phase1Hidden` treatment. Renamed "CEO" to "Operations Console".
- **MobileModuleBar.tsx**: Same `phase1Hidden` treatment. Renamed "CEO" to "Ops Console" (short label).
- **walled-garden-dashboard.tsx**: Added `hasOperationsConsoleAccess` prop, passed through to both DashboardSidebar instances.
- **app/(dashboard)/dashboard/page.tsx**: Destructures `canAccessCeo` from `resolveServerOrgContext()`, passes as `hasOperationsConsoleAccess` to WalledGardenDashboard.
- **middleware.ts**: Added Phase 1 beta gate after auth check. Queries `profiles.is_beta_approved`. CEO email bypasses. Unapproved users redirect to `/dashboard/beta-pending`. Fails open if query errors (graceful degradation until migration runs).
- **app/(dashboard)/dashboard/beta-pending/page.tsx**: New page — clean "Beta Access Pending" UI with explanation and back link.
- **supabase/migrations/20260414000001_add_beta_approved_to_profiles.sql**: Adds `is_beta_approved boolean NOT NULL DEFAULT false` to `profiles` table.

**Architecture decisions:**
- Beta gate in middleware (not layout) — enforces at earliest server boundary, unapproved users never reach dashboard shell
- `profiles.is_beta_approved` as source of truth — app-owned, easily managed from Operations Console later
- CEO email hardcode bypass in middleware — matches existing `isSlateCeo` pattern in `org-context.ts`
- `phase1Hidden` flag on nav items — declarative, easy to remove when modules are ready, preserves gate keys for future
- Legacy `canAccessCeo` naming contained — used only in destructuring from existing `resolveServerOrgContext()`. New UI labels say "Operations Console." No new code expands the CEO naming.

### What's Broken / Partially Done
1. ~~360 Tours + Design Studio visible in sidebar nav~~ **FIXED**
2. Site Walk → SlateDrop bridge missing
3. Item statuses don't match spec
4. ~~No beta access gate~~ **FIXED** (migration must be run on Supabase)
5. No collaborator system
6. Offline infrastructure not wired to Site Walk
7. Operations Console is mock data (route exists, content is placeholders)
8. **Migration not yet applied** — `20260414000001_add_beta_approved_to_profiles.sql` must run before beta gate actually blocks users

### Context Files Updated
- `SLATE360_PROJECT_MEMORY.md`: this handoff

### Next Steps (ordered)
1. **Run migration** `20260414000001_add_beta_approved_to_profiles.sql` on Supabase
2. **Set `is_beta_approved = true`** for the CEO account and any known beta testers
3. Site Walk → SlateDrop bridge implementation
4. Owner decides on status reconciliation (spec statuses vs current code statuses)
5. Offline wiring: connect existing queue/banner/sync to Site Walk capture
6. Unified bug/feature reporting form
7. Operations Console minimum viable shell (replace mock metrics with real beta user list + approval toggle)

### Session Handoff — 2026-04-13 (Phase 1 Beta Doctrine Alignment)

### What Changed

**Doctrine + Planning Alignment (no code changes)**
- Rewrote `docs/SLATE360_MASTER_BUILD_PLAN.md` — now the canonical Phase 1 Beta Doctrine document
  - Fixed Doctrine: one app, individual-first licensing, project-centric data, owner-approved design
  - Defined Phase 1 scope: Slate360 shell + Projects + SlateDrop + Site Walk only
  - Documented all 10 codebase conflicts with doctrine (see Section 13)
  - Documented 10 owner decisions needed before design generation (see Section 14)
  - Defined build sequence: Phase A (pre-design code) → B (owner decisions) → C (design) → D (hardening)
- Rewrote `docs/platform/SLATE360_PLATFORM_BUILD_FILE.md` — aligned with Phase 1 doctrine
  - Added Phase 1 user experience section (what testers see, how they reach things)
  - Added conflict table and pre-design implementation requirements
- Rewrote `docs/site-walk/SITE_WALK_BUILD_FILE.md` — clarified Site Walk is a MODULE, not a separate app
  - Corrected API auth status: all 31 routes use withAppAuth("punchwalk") (was incorrectly listed as withAuth)
  - Documented SlateDrop integration gap as CRITICAL
  - Condensed 3200 lines to focused build file + product vision reference appendix
- Rewrote `docs/slatedrop/SLATEDROP_BUILD_FILE.md` — added Site Walk integration as CRITICAL gap
- Rewrote `docs/billing/BILLING_BUILD_FILE.md` — scoped to Phase 1 (Site Walk checkout only)
- Rewrote all prompt backlogs to Phase A/B/C/D phasing:
  - `docs/platform/SLATE360_PLATFORM_PROMPT_BACKLOG.md`
  - `docs/billing/BILLING_PROMPT_BACKLOG.md`
  - `docs/slatedrop/SLATEDROP_PROMPT_BACKLOG.md`
- Created `docs/PROMPT_BACKLOG.md` — master index with canonical Phase 1 ordered sequence

### What's Broken / Partially Done
- **CRITICAL: No beta access gate** — signup is open to anyone (app/signup/page.tsx, middleware.ts)
- **CRITICAL: Site Walk uploads are disconnected S3 silo** — no SlateDrop integration
- **HIGH: Nav shows Tours/DS/CS/Geo/Virtual** — must be hidden from beta testers
- **HIGH: MobileNavSheet gate inconsistency** — uses tier gates, not standalone
- **HIGH: Site Walk has own layout tree** — feels like separate app
- **MODERATE: Org bootstrap creates "Bob's Organization"** — conflicts with individual-first model
- **MODERATE: No bug reporting UI** — only feature suggestion widget
- **P2: 9 Project Hub monolith files** exceed 300-line limit
- **P2: 14 total files over 300 lines**

### Context Files Updated
- `docs/SLATE360_MASTER_BUILD_PLAN.md`: full rewrite — Phase 1 Beta Doctrine
- `docs/platform/SLATE360_PLATFORM_BUILD_FILE.md`: full rewrite
- `docs/site-walk/SITE_WALK_BUILD_FILE.md`: full rewrite
- `docs/slatedrop/SLATEDROP_BUILD_FILE.md`: full rewrite
- `docs/billing/BILLING_BUILD_FILE.md`: full rewrite
- `docs/platform/SLATE360_PLATFORM_PROMPT_BACKLOG.md`: full rewrite
- `docs/billing/BILLING_PROMPT_BACKLOG.md`: full rewrite
- `docs/slatedrop/SLATEDROP_PROMPT_BACKLOG.md`: full rewrite
- `docs/PROMPT_BACKLOG.md`: created (was empty)
- `SLATE360_PROJECT_MEMORY.md`: this handoff

### Owner Decisions Needed (Before Next Code Work)
1. Org model: Option A (rename to "workspace") or Option B (user-scoped entitlements)?
2. Beta gate mechanism: invite code? flag? approval queue?
3. Should beta testers pay or get free access?
4. Command center layout approval
5. Site Walk capture UX approval
6. Mobile navigation approval

### Next Steps (ordered)
1. Owner makes decisions on items 1-3 above
2. P-A1: Hide placeholder modules from nav (~30 min, no owner decision needed)
3. P-A2: Fix MobileNavSheet gates (~15 min, no owner decision needed)
4. P-A3: Beta access gate (needs decision #2)
5. SD-A1: Wire Site Walk → SlateDrop (needs decision #1 only if schema changes)
6. P-A5: Bug reporting form
7. P-A6: Rename org language
8. Then: Phase B owner design decisions → Phase C implementation → Phase D hardening

### Session Handoff — 2026-04-16
### What Changed
- `docs/audits/critical-platform-repair-report-2026-04-16.md`: added a grounded repair audit covering auth, shell separation, command center, SlateDrop, projects, Site Walk, operations, mobile nav, data visibility, beta readiness, and recommended work slices
- `SLATE360_PROJECT_MEMORY.md`: updated latest handoff and date

### What's Broken / Partially Done
- Missing `/beta-pending` route even though `app/(dashboard)/layout.tsx` and `app/install/page.tsx` redirect there
- Missing password reset destination: `app/forgot-password/page.tsx` redirects to `/account/reset-password`, but no matching app route exists
- Broken global SlateDrop entrypoints: multiple nav components link to `/slatedrop`, but the active route is only `/projects/[projectId]/slatedrop`
- Site Walk deliverable gap: `components/site-walk/SessionReviewClient.tsx` links to `/site-walk/[projectId]/deliverables/new`, but no matching route exists
- Installed shell contract unresolved: `app/manifest.ts` still starts the app at `/dashboard`

### Context Files Updated
- `docs/audits/critical-platform-repair-report-2026-04-16.md`: factual repair report for next implementation slices
- `SLATE360_PROJECT_MEMORY.md`: session handoff

### Next Steps (ordered)
1. Fix the auth continuation blockers: add `/beta-pending` and a real password reset destination, then verify redirects
2. Enforce one shell contract: decide installed app start route, remove dead `/slatedrop` entrypoints, align middleware and nav
3. Re-scope SlateDrop to project-scoped Phase 1 behavior while preserving existing storage APIs
4. Complete the Site Walk review-to-deliverable route chain
5. Unify desktop/mobile navigation around the Phase 1 surface set before any broader command-center redesign

### Session Handoff — 2026-04-16
### What Changed
- `docs/audits/follow-up-platform-blind-spot-report-2026-04-16.md`: added second-pass blind-spot report covering auth visuals, confirm-email/first-run guidance, install/update-center reality, dashboard reality, operations-console scope, SlateDrop route/folder model, Site Walk capability matrix, usage truth map, navigation mismatch, top 12 blind spots, beta blockers, implementation order, and blast-radius warnings
- `SLATE360_PROJECT_MEMORY.md`: updated latest handoff with corrected findings from the follow-up investigation

### What's Broken / Partially Done
- Auth visual defect is confirmed at the asset layer: `public/uploads/SLATE 360-Color Reversed Lockup.svg` flips the rounded logo background to white in dark mode
- Auth mobile readability remains weak: `app/globals.css` sets `.auth-input` to `text-sm` and `.auth-label` to `text-xs`
- No dedicated first-run onboarding route was found; `app/auth/confirm/route.ts` and `app/auth/callback/route.ts` still default to `/dashboard`
- `/install` is only a gated PWA instructions page, not a real install/update/permissions center (`app/install/page.tsx`, `app/install/InstallClient.tsx`)
- `Operations Console` is an owner-only beta approval UI, not a true operations console (`app/(dashboard)/operations-console/page.tsx`, `components/dashboard/OperationsConsoleClient.tsx`)
- Suspicious debug/test account creation remains unresolved; no direct generator path was found in repo code, only diagnostic and cleanup scripts
- `/slatedrop` now exists and redirects to `/projects`, so the remaining problem is nav/model inconsistency, not a missing route (`app/slatedrop/page.tsx`)
- SlateDrop root structure still mixes project records with app buckets (`lib/slatedrop/folderTree.ts`)
- Site Walk plan display is partial: `components/site-walk/PlanViewer.tsx` calls `/api/site-walk/plans/[id]/image`, but no matching route exists
- Site Walk deliverable editor persistence is still incomplete/unclear: `components/site-walk/BlockEditor.tsx` exposes save UI without a verified save path in this pass
- Usage truth is inconsistent across active surfaces: dashboard summary uses `slatedrop_uploads`, account overview mixes `organizations.org_storage_used_bytes`, `slatedrop_files`, and credit balances
- Shared/mobile nav still advertises non-canonical or gated surfaces like `/slatedrop` and `/analytics`; My Account still opens an effectively empty customize drawer

### Context Files Updated
- `docs/audits/follow-up-platform-blind-spot-report-2026-04-16.md`: detailed follow-up investigation report for remaining blind spots
- `SLATE360_PROJECT_MEMORY.md`: session handoff

### Next Steps (ordered)
1. Define one canonical usage contract for storage, file counts, and credits before changing more UI copy
2. Close Site Walk Phase 1 gaps: add the missing plan image route and verify/finish deliverable save persistence
3. Remove misleading shell affordances: hide My Account customize, clean `/slatedrop` and other non-canonical nav entries, and rename or narrow Operations Console framing
4. Add a dedicated first-run onboarding flow that clearly connects signup confirmation, first login, and install guidance
5. Decide the final Phase 1 SlateDrop information architecture, then align folder tree generation and navigation to that model

### Session Handoff — 2026-04-16
### What Changed
- `ONGOING_ISSUES.md`: created root durable issue tracker and seeded it with current known Phase 1 issues across auth, onboarding, install, product surfaces, command center, SlateDrop, projects, Site Walk, Operations Console, navigation/mobile, and data/usage/credits
- `docs/audits/business-logic-alignment-report-2026-04-16.md`: added concise business-logic/build-plan alignment report with aligned/partially aligned/misaligned classifications across the major product areas
- `SLATE360_PROJECT_MEMORY.md`: updated latest handoff for the alignment-and-issue-tracker pass

### What's Broken / Partially Done
- Public homepage, installed app shell, and web command center are only partially aligned: shell contract is documented but installed-app and web-command-center behavior are still blurred
- `/projects` is the active anchor surface, but command-center emphasis and older project assumptions still create drift risk
- Project-scoped SlateDrop is the canonical Phase 1 file surface, but folder generation and nav still preserve non-canonical global SlateDrop assumptions
- Site Walk is the main real Phase 1 module, but missing plan image routing, uncertain deliverable persistence, and viewer/collaboration gaps remain open
- `Operations Console` remains a misnamed owner-only beta approval tool rather than a real operations surface
- Owner-specific bypass and account overrides still distort the normal subscriber truth model
- `/install` remains a narrow PWA instructions page rather than a real install/update/permissions center
- No dedicated first-run onboarding route exists after successful auth confirmation/callback
- Shared/mobile navigation still exposes non-canonical or gated surfaces that do not match the Phase 1 shell contract
- Storage, file-count, and credit truth remain inconsistent across dashboard and account surfaces

### Context Files Updated
- `ONGOING_ISSUES.md`: root durable issue tracker for the active repair program
- `docs/audits/business-logic-alignment-report-2026-04-16.md`: alignment confirmation report
- `SLATE360_PROJECT_MEMORY.md`: session handoff

### Next Steps (ordered)
1. Use `ONGOING_ISSUES.md` as the canonical issue ledger for future repair prompts and keep it in sync with any fix slice
2. Start a trust-and-contract stabilization implementation slice: unify usage truth, close Site Walk plan/deliverable gaps, and clean misleading nav/shell affordances
3. Add a dedicated first-run onboarding route after the trust-critical gaps are stabilized
4. Rework the command center and installed-shell entry only after the Phase 1 contract and canonical metrics are locked

### Session Handoff — 2026-04-16
### What Changed
- `components/dashboard/command-center/CommandCenterContent.tsx`: removed the old visible command-center body composition and replaced it with a minimal proof-of-control shell for `/dashboard`
- `components/dashboard/command-center/CommandCenterContent.tsx`: detached the live route from `QuickActionsCard`, `ProjectOverviewCard`, `RecentFilesCard`, and `StorageCreditsCard` without changing auth, routing, sidebar, or top bar behavior; the live proof shell now renders only the title/subtitle, search shell, quick actions row, pinned/recent empty state, and files empty state
- `slate360-context/ONGOING_ISSUES.md`: updated BUG-027 and tech-debt notes to reflect that the `/dashboard` proof shell is active while the other Phase 1 blank-canvas targets remain pending
- `SLATE360_PROJECT_MEMORY.md`: updated latest handoff for the dashboard proof-of-control swap

### What's Broken / Partially Done
- `/dashboard` is now under direct visible-surface control, but it is only a proof shell with intentionally empty project/file blocks and not the final design replacement
- `/projects`, `/projects/[projectId]`, and `/projects/[projectId]/slatedrop` remain blank-canvas replacement targets and have not been rebuilt in this slice
- Old command-center card components still exist in the repo, but they are no longer rendered by the live dashboard body
- Wrapper-backed `/project-hub/[projectId]/*` routes remain legacy contamination beneath the broader project surface area

### Context Files Updated
- `ONGOING_ISSUES.md`: recorded the active `/dashboard` proof shell status under BUG-027
- `SLATE360_PROJECT_MEMORY.md`: session handoff

### Next Steps (ordered)
1. Manually verify that `/dashboard` now shows only the proof shell and that the old card layout is gone
2. Start the blank-canvas rebuild for `/projects` while preserving project APIs and creation plumbing
3. Rebuild `/projects/[projectId]` overview after the new projects directory surface is stable
4. Rebuild project-scoped SlateDrop after the new project hierarchy is locked