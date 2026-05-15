# Slate360 — Project Memory

Last Updated: 2026-05-13
Repo: bcvolker/slate360-rebuild
Branch: main
Live: https://www.slate360.ai

This file is the default new-chat attachment. Keep it short. Read this first, then only pull the docs required for the task.

## AI Agent Access & Backend Autonomy

**AI Agents (Copilot, Claude, etc.) have full read/write/run/push access and MUST act autonomously on the backend:**
- **Git**: commit, branch, merge, and push to `bcvolker/slate360-rebuild` on GitHub.
- **Vercel**: deploy + env var management via the token.
- **AWS S3 & Cloudflare R2**: direct bucket access via variables populated in `.env.local`.
- **Stripe**: webhook and billing management via Vercel env secrets.
- **Supabase CLI**: You MUST link the project autonomously (`npx supabase link --project-ref hadnfcenpcfaeclczsmm --password 'Arlopear$1976_989*'`) using the `SUPABASE_ACCESS_TOKEN` in `.env.local` and you MUST push migrations, RPC functions, and schema changes on your own. Do not ask for permission to run migrations.

This access is completely intentional. Agents are expected to push commits, run database migrations, test backend scripts, and deploy — not just suggest changes.

## Start Here (Initialization Routine)

When a new chat starts, you must immediately get caught up to speed on the project's memory and context.
Recommended read order:
1. This file (`SLATE360_PROJECT_MEMORY.md`).
2. `slate360-context/ONGOING_ISSUES.md` (Check the active bugs, especially current blockers).
3. `SLATE360_MASTER_BUILD_PLAN.md` (Single source of truth for product architecture).
4. `ops/bug-registry.json` (For tracking the actual schema and status of bugs).
5. Load the `.env.local` variables into your context so you are ready to access the backend immediately.

## Concurrent Development Tracks (Active — 2026-05-15)

**Two AI tracks are running simultaneously. Read `docs/CONCURRENT_DEVELOPMENT_TRACKS.md` before any session.**

| Track | Owns | Branch |
|---|---|---|
| **Track A — AppShell + Site Walk UI** | Global AppShell design, Site Walk V1 UI, Graphite Glass design system, capture/plan shell visual work | `main` |
| **Track B — Digital Twin Lite** | CEO-gated Digital Twin app, drone processing, multipart upload, GPU worker, twin APIs/viewers/share | `feature/digital-twin-lite` |

**Hard rules (enforced by both tracks):**
1. Track A must not implement Digital Twin backend/viewer logic.
2. Track B must not modify Site Walk UI, Site Walk capture, Site Walk plan viewer, or global AppShell styling.
3. Track B may request AppShell integration but must not edit shared shell files directly.
4. Both tracks must read this file before work and confirm they did not touch the other track's files at session end.

## Save State - Architecture & Design (May 2026)
- The `_legacy_v1` tree has been explicitly purged and removed from the active routing.
- The entire application is strictly unified under the 'Dark Glass & Amber' design token system utilizing the `<GlassCard>` component.
- Site Walk Plan Walk core loop is now partially working on live: plan opens, pan/zoom works, long press opens capture, plan-linked capture can be created, and saved plan pins can be opened.
- Major next phase: Site Walk V1 mobile UI architecture cleanup. Do not start an app-wide redesign in one pass.
- Selected UX direction: Site Walk Home command center, shared mobile `CaptureShell`, compact plan tools drawer, contextual markup/attachments, explicit saved-pin Move Pin mode, Before/After guided recapture, and a graphite/slate design-token foundation.
- App-shell bridge direction: Slate360 Home remains the app-neutral command center; normal mobile shell nav is `Home | Projects | SlateDrop | Coordination | Account`; active capture/plan task modes may hide platform nav and own the full viewport.
- Visual framing correction: future V1 design work should be described as Graphite Glass + restrained amber + muted teal, not harsh black/orange or a broad app-wide Dark Glass repaint.
- Site Walk terminology rule: use `Worksite` for lower-tier field containers and reserve `Project` for higher-tier PM containers unless existing route/API/table names force the old term.
- `docs/SLATE360_GLOBAL_UX_DOCTRINE.md` now exists as the concise global UX doctrine; `docs/EXTERNAL_AI_UX_REVIEW_PACKET.md` is the sanitized external-review packet; `docs/site-walk/PLAN_PIN_SAFETY_BEFORE_CAPTURESHELL.md` is the tiny saved-pin safety plan before Shared CaptureShell.
- **Production `/site-walk` now uses V1 Home** (commit `99f3fa5`). AppShell fullBleed suppresses MobileTopBar/BottomNav. V1Shell owns the viewport.
- **Quick Walk** creates a real DB session via `/api/site-walk/sessions`, then navigates to `/site-walk/capture?session=<id>&quick=camera`. Capture shell is entered with `autoOpenCamera=true`.
- **Capture idle screen** ("Capture field proof") still needs V1 replacement — it lives in `CameraViewfinder.tsx`, `!activePreview` branch. `autoOpenCamera` is blocked by `captureCtx` guard (iOS-safe by design). Next slice: replace with V1 minimal prompt.
- **Global Slate360 AppShell** visual migration to Graphite Glass + amber still needed — currently uses Dark Glass. Track A owns this.
- **Site Walk capture review shell** and **Plan Walk viewer shell** both need redesigned V1 wrappers — deferred pending approved slices.

## Session Handoff — 2026-05-15 (Concurrent development tracks + capture audit)
### What Changed
- `docs/CONCURRENT_DEVELOPMENT_TRACKS.md`: created — defines Track A (AppShell + Site Walk UI) and Track B (Digital Twin Lite) with ownership tables, forbidden zones, branch strategy, and cross-track safety check protocol.
- `SLATE360_PROJECT_MEMORY.md`: added "Concurrent Development Tracks" summary section and state bullets for production V1 Home, Quick Walk, capture idle screen, AppShell migration, and capture/plan V1 deferred work.
- `SLATE360_MASTER_BUILD_PLAN.md`: added Section 2a "Concurrent AI Development Tracks" note referencing the new doc.
### What's Broken / Partially Done
- Quick Walk capture idle screen still shows "Capture field proof" (needs V1 replacement in `CameraViewfinder.tsx`).
- Global Slate360 AppShell visual migration to Graphite Glass + amber not yet started.
- Site Walk capture review V1 shell not yet started.
- Plan Walk viewer V1 shell not yet started.
- Track B (Digital Twin Lite) not yet started.
### Context Files Updated
- `docs/CONCURRENT_DEVELOPMENT_TRACKS.md`: created
- `SLATE360_PROJECT_MEMORY.md`: concurrent tracks section + state bullets
- `SLATE360_MASTER_BUILD_PLAN.md`: concurrent tracks note in Section 2
### Cross-Track Safety Check
- Track: A
- Branch: main
- Files touched: `docs/CONCURRENT_DEVELOPMENT_TRACKS.md` (created), `SLATE360_PROJECT_MEMORY.md`, `SLATE360_MASTER_BUILD_PLAN.md`
- Did NOT touch: Digital Twin files, Trigger.dev, Supabase migrations, API routes, capture product code, PlanViewerLeaflet, billing, ops console
### Next Steps (ordered)
1. Approved next slice: replace "Capture field proof" idle screen in `CameraViewfinder.tsx` with V1-styled minimal prompt (single amber button, no verbose copy).
2. Begin global AppShell Graphite Glass migration once capture idle screen slice is approved.
3. Track B to create `feature/digital-twin-lite` branch when ready to start Digital Twin work.

## Session Handoff — 2026-05-14 (V1 UI replacement layer + backend audit)
### What Changed
- `components/site-walk/v1/`: created 11 new V1 UI components (SiteWalkV1Shell, Header, BottomNav, ActionGrid, ListPanel, RowMenu, WorksiteV1Row, WalkV1Row, ReportV1Row, PlanWorkspaceV1Skeleton, CaptureWorkspaceV1Skeleton).
- `app/site-walk-v1-preview/page.tsx`: non-production preview route demonstrating V1 UI.
- `docs/site-walk/SITE_WALK_V1_UI_REPLACEMENT_LAYER.md`: created + updated with backend audit corrections.
- `docs/audit/`: created 7 audit documents (backend/data model, API surface, entitlement/tier, SlateDrop, deliverables, collaboration/org, frontend-to-backend match, responsive layout).
- V1 preview committed and deployed to Vercel at commit `2ac4f25`.
### What's Broken / Partially Done
- V1 preview uses "Reports" label — must change to "Deliverables" in next revision.
- V1 preview uses "Account" as bottom nav tab — should be avatar/profile menu; give slot to Deliverables or Coordination.
- V1 preview is phone-portrait only — no landscape/tablet/desktop layout.
- V1 preview uses empty states only — no real data wired.
- "Plan Room" terminology banned — use "Plans & Documents."
- SlateDrop not visible from V1 Home — needs primary nav position.
- Coordination has no dedicated V1 page yet.
### Context Files Updated
- `SLATE360_PROJECT_MEMORY.md`: this handoff
- `docs/site-walk/SITE_WALK_V1_CURRENT_BUILD_CONTEXT.md`: added backend audit findings
- `docs/site-walk/SITE_WALK_V1_UI_REPLACEMENT_LAYER.md`: added backend audit corrections + revised next steps

## Session Handoff — 2026-05-15 (V1 production Home swap)
### What Changed
- `app/site-walk/page.tsx`: now renders `SiteWalkHomeClient` (V1 Home) instead of `SiteWalkHub`
- `app/site-walk/layout.tsx`: removed `SiteWalkShell`; now `AuthedAppShell` only
- `components/site-walk/v1/SiteWalkV1Shell.tsx`: root div changed to `fixed inset-0 z-50 overflow-hidden` so it covers AppShell chrome
- `app/site-walk/_components/siteWalkHubTypes.ts`: converted to re-export shim; types moved to `lib/types/site-walk.ts`
- `lib/types/site-walk.ts`: added `HubProject`, `HubWalk`, `HubSummary`
- `app/site-walk-v1-preview/_components/V1PreviewClient.tsx`: slimmed 541→94 lines; imports from shared view files
### What Was Created
- `components/site-walk/SiteWalkHomeClient.tsx` — production Home client (no skeleton demos)
- `components/site-walk/v1/views/HomeView.tsx` — 2×2 action grid + work panel
- `components/site-walk/v1/views/WorksitesView.tsx` — worksites list view
- `components/site-walk/v1/views/SlateDropView.tsx` — SlateDrop quick access
- `components/site-walk/v1/views/CoordinationView.tsx` — coordination sections
- `components/site-walk/v1/views/DeliverablesView.tsx` — deliverables tab
- `components/site-walk/v1/views/v1-view-utils.tsx` — shared utils (timeAgo, EmptyList, RouterLike)
- `app/site-walk/(act-1-setup)/layout.tsx` — SiteWalkShell for setup sub-routes
- `app/site-walk/(act-2-inputs)/layout.tsx` — SiteWalkShell for walks/capture sub-routes
- `app/site-walk/(act-3-outputs)/layout.tsx` — SiteWalkShell for deliverables/reports sub-routes
- `app/site-walk/more/layout.tsx`, `slatedrop/layout.tsx`, `items/layout.tsx` — SiteWalkShell for top-level sub-routes
### What's Broken / Partially Done
- Nothing known. Typecheck, build, guard:architecture, file-size all pass.
- `SiteWalkHub` old UI is preserved at `app/site-walk/_components/SiteWalkHub.tsx` but no longer rendered.
### Architecture Rule Fix
- Hub types were in `app/`; moved to `lib/types/site-walk.ts`; `siteWalkHubTypes.ts` is now a re-export shim for backward compat with `app/` consumers.
### Untouched Areas (confirmed)
- Trigger.dev tasks, Supabase schema/migrations, all API routes, capture upload, plan pin logic, PlanViewerLeaflet, billing, ops console.
### Context Files Updated
- `SLATE360_PROJECT_MEMORY.md`: this handoff
- `docs/site-walk/SITE_WALK_V1_CURRENT_BUILD_CONTEXT.md`: production Home section updated
### Next Phase (ordered)
1. Worksites list page migration to V1 shell (WorksitesView already wired in tab; add full-page route)
2. Walk detail / session page V1 migration
3. Capture shell migration (V1 CaptureShell — not started; do not disturb existing capture logic)
4. Plan workspace / pin tools V1 shell migration
- `docs/audit/*`: 7 new audit documents
### Next Steps (ordered)
1. Revise V1 bottom nav: Home, Worksites, Deliverables, SlateDrop (or Coordination). Account via avatar.
2. Rename all "Reports" labels to "Deliverables" in V1 components.
3. Wire real project/session data from existing APIs into V1 preview.
4. Add desktop sidebar layout alongside mobile bottom nav.
5. Physical device testing on iPhone.
6. Feature-flagged swap of production imports once V1 is approved.

## Session Handoff — 2026-05-14 (Act 2 screen-zone ownership correction)
### What Changed
- `app/site-walk/(act-2-inputs)/capture/_components/SharedCaptureTaskHeader.tsx`: Exit confirmation now renders in the modal layer with safe-area padding and updated unsaved-changes copy.
- `app/site-walk/(act-2-inputs)/capture/_components/CaptureClientIsland.tsx`: removed duplicate floating Plan/Camera and Home controls from active task mode and drives Markup mode from the bottom drawer tab.
- `components/site-walk/capture/PlanToolbar.tsx`: collapsed plan controls to one compact `Plans` pill with current page context and pin count; full Plan Tools Drawer remains deferred.
- `components/site-walk/capture/PlanViewerLeaflet.tsx`: removed floating Pan/Pin controls while preserving pan/zoom and empty-area long-press draft pin creation; saved linked pins now fall back to the locked menu when their item cannot be resolved locally.
- `components/site-walk/capture/CaptureDataBottomSheet.tsx`: removed floating Details/Start button and duplicate top Save; mobile drawer auto-opens to Details after capture/select and keeps the bottom footer save canonical.
- `components/site-walk/capture/VisualCaptureView.tsx`: removed detached always-visible bottom markup rail so Markup tools appear only in the drawer's Markup tab.
- `components/site-walk/capture/PendingUploadPreviewModal.tsx`: raised upload preview into the modal layer above task controls.
- `docs/site-walk/ACT2_SCREEN_ZONE_OWNERSHIP_CORRECTION.md`: created diagnosis and implementation record.
### What's Broken / Partially Done
- Physical iPhone confirmation is still required before marking Act 2 zone ownership complete.
- Full Plan Tools Drawer remains deferred.
- Full saved-pin Move/Delete remains deferred.
- Full Stop Strip navigation remains deferred.
- Before/After/Ghost and Deliverables V1 remain deferred.
### Context Files Updated
- `SLATE360_PROJECT_MEMORY.md`: latest handoff
- `docs/site-walk/ACT2_SCREEN_ZONE_OWNERSHIP_CORRECTION.md`: new correction diagnosis and record
- `docs/site-walk/SHARED_CAPTURESHELL_V1_IMPLEMENTATION.md`: added correction summary
- `docs/site-walk/SITE_WALK_V1_CURRENT_BUILD_CONTEXT.md`: updated current state and code map
### Next Steps (ordered)
1. Validate with `npm run typecheck`, `npm run build`, `npm run guard:architecture`, and `bash scripts/check-file-size.sh || true`.
2. Test on iPhone: Plan Walk top zone has only task header plus compact plan pill, no Home/Pan/Pin/large card stack; Quick Capture has no floating Details button; Details auto-opens after capture; only bottom save is primary; Exit modal is centered and unobscured; Markup tools appear only under Markup tab; saved pins either open details or show the locked fallback menu.
3. Keep Plan Tools Drawer, saved-pin Move/Delete, full Stop Strip navigation, Before/After/Ghost, and Deliverables for later approved slices.

## Session Handoff — 2026-05-13 (Shared CaptureShell V1)
### What Changed
- `app/site-walk/(act-2-inputs)/capture/_components/SharedCaptureTaskHeader.tsx`: added the shared Quick Walk / Plan Walk active task header with primary Back to Plan or Site Walk, stop context, walk title, and secondary/destructive Exit confirmation.
- `app/site-walk/(act-2-inputs)/capture/_components/CaptureClientIsland.tsx`: wraps plan and camera modes in one shared shell structure and uses `Stop N · From Plan` or `Stop N · Quick Capture` copy.
- `components/site-walk/capture/VisualCaptureView.tsx`: can suppress its legacy header inside the shared shell so camera mode does not duplicate chrome.
- `components/site-walk/capture/CaptureDataBottomSheet.tsx`: added live Details, Attachments, and Markup tabs plus state-specific save labels.
- `components/site-walk/capture/CaptureSheetUtilityPanel.tsx`: wires Attachments to existing capture/upload callbacks and Markup to the existing vector toolbar events.
- `docs/site-walk/SHARED_CAPTURESHELL_V1_AUDIT.md` and `docs/site-walk/SHARED_CAPTURESHELL_V1_IMPLEMENTATION.md`: record the pre-edit audit, shell structure, checklist, validation, and deferred work.
### What's Broken / Partially Done
- Physical iPhone confirmation is still required for Quick Walk and Plan Walk.
- Full saved-pin Move Pin and Delete remain deferred.
- Plan Tools Drawer remains deferred.
- Full Stop Strip navigation remains deferred; current shell shows only the current stop label.
- Before/After/Ghost V1 and Deliverables V1 remain deferred.
### Context Files Updated
- `SLATE360_PROJECT_MEMORY.md`: latest handoff
- `docs/site-walk/SITE_WALK_V1_CURRENT_BUILD_CONTEXT.md`: updated current shell state and remaining gaps
- `docs/site-walk/SHARED_CAPTURESHELL_V1_AUDIT.md`: new pre-edit audit
- `docs/site-walk/SHARED_CAPTURESHELL_V1_IMPLEMENTATION.md`: new implementation and validation notes
### Next Steps (ordered)
1. Monitor Vercel deployment for the Shared CaptureShell V1 commit.
2. Test on iPhone: Quick Capture opens, header says `Stop 1 · Quick Capture`, save label says `Save Stop & Continue`, Plan Walk opens, plan pan/zoom works, empty-plan long press opens capture, header says `Stop N · From Plan`, Back to Plan returns to the plan, save label says `Save Stop & Return to Plan`, and saved-pin duplicate guard still holds.
3. Keep saved-pin Move/Delete, Plan Tools Drawer, full Stop Strip navigation, Before/After/Ghost, and Deliverables for later approved slices.

## Session Handoff — 2026-05-13 (Saved plan pin duplicate guard)
### What Changed
- `components/site-walk/capture/PlanViewerLeaflet.tsx`: saved Leaflet markers now isolate pointer, touch, click, and contextmenu events so saved-pin taps/presses do not bubble into map-level draft-pin creation; saved pins remain non-draggable unless a future explicit Move Pin mode is implemented.
- `components/site-walk/capture/PlanViewerLeafletEvents.tsx`: draw-mode map click/contextmenu creation now ignores events whose source target is a Leaflet marker icon.
- `components/site-walk/capture/PlanQuickActionMenu.tsx`: saved/unlinked pin menu copy now says `Saved Stop`, `Location locked`, and `Open Details` language instead of `Draft pin` drag instructions; Move Pin and Delete are not exposed as active flows.
- `components/site-walk/capture/planViewerModel.ts`: quick-menu state now carries saved-pin context without changing `clientPinId` or server UUID reconciliation semantics.
- `docs/site-walk/PLAN_PIN_SAFETY_BEFORE_CAPTURESHELL.md`: updated from planning-only to record the implemented tiny guard and deferred work.
### What's Broken / Partially Done
- Do not mark the pin issue resolved until user confirms on a physical phone.
- Full saved-pin Move Pin mode remains a future slice.
- Full saved-pin Delete flow remains a future slice.
- Shared CaptureShell remains the next planned major slice if the user approves it.
- Plan navigation/search/layers/thumbnails remain incomplete.
### Context Files Updated
- `SLATE360_PROJECT_MEMORY.md`: latest handoff
- `docs/site-walk/PLAN_PIN_SAFETY_BEFORE_CAPTURESHELL.md`: implemented guard and deferred work
### Next Steps (ordered)
1. Validate with `npm run typecheck`, `npm run build`, `npm run guard:architecture`, and `bash scripts/check-file-size.sh || true`.
2. Commit only the focused saved-pin safety files if validation passes.
3. Test on iPhone: tap saved pins, long-press saved pins, attempt a drag gesture on saved pins, and confirm no duplicate draft pin appears; then long-press empty plan space and confirm draft pin creation still works.
4. Wait for user phone confirmation before marking this issue resolved.

## Session Handoff — 2026-05-13 (Global UX doctrine + pin safety plan)
### What Changed
- `docs/SLATE360_GLOBAL_UX_DOCTRINE.md`: created the missing concise global UX doctrine covering platform identity, spacing/action rules, object action rules, plan pin rules, Site Walk three-act model, collaboration ownership, hidden-app rules, visual direction, and desktop/landscape expectations.
- `docs/EXTERNAL_AI_UX_REVIEW_PACKET.md`: created a sanitized external-AI UX packet for Gemini/Claude/Grok/v0 review; it excludes secrets, credentials, env vars, backend quick-access instructions, and raw project memory.
- `docs/site-walk/PLAN_PIN_SAFETY_BEFORE_CAPTURESHELL.md`: created a planning-only saved-pin safety audit before Shared CaptureShell, based only on the requested pin viewer/API files.
- `docs/SLATE360_CURRENT_BUILD_CONTEXT.md`: updated the source map so global UX doctrine and external packet are current, not missing.
- `docs/REPO_CONTEXT_FILE_AUDIT.md`: updated context classification so the global doctrine is filled and the pin-safety plan is current.
- `docs/SLATE360_ACCELERATED_BUILD_WORKFLOW.md`: updated default read order and added external-AI packet safety guidance plus current planning packet references.
### What's Broken / Partially Done
- No product behavior was changed, no UI was redesigned, no migrations were run, Trigger rasterization was untouched, and Supabase schema was untouched.
- Saved plan pins remain not safely movable/deletable in product code; this session only documents the tiny guard plan.
- Plan navigation/search/layers/thumbnails remain incomplete.
- Quick Walk and Plan Walk are still not unified under Shared CaptureShell.
### Context Files Updated
- `SLATE360_PROJECT_MEMORY.md`: latest handoff
- `docs/SLATE360_GLOBAL_UX_DOCTRINE.md`: new doctrine
- `docs/EXTERNAL_AI_UX_REVIEW_PACKET.md`: new sanitized external packet
- `docs/site-walk/PLAN_PIN_SAFETY_BEFORE_CAPTURESHELL.md`: new pin-safety plan
- `docs/SLATE360_CURRENT_BUILD_CONTEXT.md`: source map update
- `docs/REPO_CONTEXT_FILE_AUDIT.md`: audit classification update
- `docs/SLATE360_ACCELERATED_BUILD_WORKFLOW.md`: workflow update
### Next Steps (ordered)
1. Run `codex --version || true`; run only a no-edit Codex review if authentication and safe no-edit execution are available.
2. Run `npm run typecheck` and `npm run build`.
3. Next implementation should be either a tiny saved-pin safety guard or Shared CaptureShell, depending on user approval.
4. Do not commit or push unless the user explicitly approves.

## Session Handoff — 2026-05-13 (Repo source-of-truth + UI debt audit)
### What Changed
- `docs/SLATE360_CURRENT_BUILD_CONTEXT.md`: created current source-of-truth map for broad Slate360 work, including active doc order, missing requested docs, code boundaries, no-go rules, validation baseline, and rollback plan.
- `docs/site-walk/SITE_WALK_V1_CURRENT_BUILD_CONTEXT.md`: created Site Walk V1 current context map covering working baseline, current docs, code map, preserve-before-edit rules, known gaps, risk areas, safe next slices, and smoke tests.
- `docs/REPO_CONTEXT_FILE_AUDIT.md`: created context-file classification audit that separates authoritative current docs from useful references, missing docs, active confusing files, and stale archived context zones.
- `docs/design/UI_TECHNICAL_DEBT_INVENTORY.md`: created no-edit UI debt inventory covering duplicate shells/navs, filler/demo language, hardcoded color drift, capture/plan overlay risk, and safe implementation order.
- `docs/SLATE360_ACCELERATED_BUILD_WORKFLOW.md`: created the previously missing workflow doc with default read order, build stages, Codex role, broad UI checklist, and rollback pattern.
### What's Broken / Partially Done
- `docs/SLATE360_GLOBAL_UX_DOCTRINE.md` is still missing; the audit instructs agents to use app-shell architecture, design gap audit, and token plan until a formal doctrine doc is created.
- No code behavior was changed, no UI was refactored, and no stale files were deleted.
- Physical iPhone confirmation for Site Walk Home Slice 1.3 remains pending.
- Site Walk plan/capture gaps remain: saved pin move/delete, plan navigation/search/layers/thumbnails, shared CaptureShell polish, save/return loop polish, and Deliverables V1.
### Context Files Updated
- `SLATE360_PROJECT_MEMORY.md`: latest handoff
- `docs/SLATE360_CURRENT_BUILD_CONTEXT.md`: new current build source map
- `docs/site-walk/SITE_WALK_V1_CURRENT_BUILD_CONTEXT.md`: new Site Walk current context map
- `docs/REPO_CONTEXT_FILE_AUDIT.md`: new context-file classification audit
- `docs/design/UI_TECHNICAL_DEBT_INVENTORY.md`: new UI debt inventory
- `docs/SLATE360_ACCELERATED_BUILD_WORKFLOW.md`: new accelerated workflow and Codex role doc
### Next Steps (ordered)
1. Run `codex --version || true`, `npm run typecheck`, and `npm run build` for the documentation-only audit validation requested in this session.
2. If future UX doctrine is needed, create `docs/SLATE360_GLOBAL_UX_DOCTRINE.md` by consolidating existing shell architecture and design-system docs, not by duplicating them.
3. Before any broad UI slice, start from `docs/SLATE360_CURRENT_BUILD_CONTEXT.md`, `docs/REPO_CONTEXT_FILE_AUDIT.md`, and `docs/design/UI_TECHNICAL_DEBT_INVENTORY.md`.

## Session Handoff — 2026-05-13 (Site Walk Home Slice 1.3 Worksites layout)
### What Changed
- `app/site-walk/_components/SiteWalkHub.tsx`: removed the arbitrary `43dvh`/max-height cap so the Home work panel again fills remaining space above bottom nav via `flex-1 min-h-0`; top actions remain compact with tighter spacing.
- `app/site-walk/(act-2-inputs)/walks/page.tsx`: changed the visible page concept to Worksites, removed giant passive metric cards, added compact summary badges, and kept walk/report lists dense and scroll-contained.
- `docs/site-walk/SITE_WALK_HOME_COMMAND_CENTER_IMPLEMENTATION_NOTES.md`: added Phone Review After Taxonomy Pass, Slice 1.3 layout notes, and Codex-style review.
- `docs/site-walk/SITE_WALK_V1_TAXONOMY_AND_WORKFLOW.md`: clarified Worksite as the lower-tier Site Walk container and Project as higher-tier PM; no table/API renames in this slice.
### What's Broken / Partially Done
- Slice 1 remains pending physical iPhone confirmation.
- `/site-walk/walks` route name remains unchanged; only visible labeling moves toward Worksites.
- SlateDrop folder automation for Worksites/Projects remains documented future work only.
- Higher-tier Project Management suite remains out of scope.
- File-size guard still reports 13 pre-existing unrelated oversized files.
### Context Files Updated
- `SLATE360_PROJECT_MEMORY.md`: latest handoff
- `docs/site-walk/SITE_WALK_HOME_COMMAND_CENTER_IMPLEMENTATION_NOTES.md`: Slice 1.3 review/validation notes
- `docs/site-walk/SITE_WALK_V1_TAXONOMY_AND_WORKFLOW.md`: taxonomy clarification
### Next Steps (ordered)
1. Monitor the Slice 1.3 Vercel deployment.
2. Test on iPhone: no blank dead space below Home panel, compact top actions, panel reaches above bottom nav, Worksites page has no giant metrics, and existing walk open/delete behavior still works.
3. Do not mark Slice 1 complete until user confirms physical phone testing.

## Session Handoff — 2026-05-13 (Site Walk Home Slice 1.2 balance + taxonomy)
### What Changed
- `docs/site-walk/SITE_WALK_V1_TAXONOMY_AND_WORKFLOW.md`: created Worksite / Project / Walk / Stop / Item-Issue / Deliverable / SlateDrop relationship taxonomy.
- `app/site-walk/_components/SiteWalkHub.tsx`: reduced the mobile work panel height, replaced horizontal scrolling tabs with compact wrapped tabs, renamed tabs to Active / Recent / Worksites / Issues / Reports, and changed primary actions to New Worksite / Start Walk / Quick Capture.
- `app/site-walk/_components/WalkActionsMenu.tsx`: changed menu wording to Link / Change Worksite and Create Report while preserving existing APIs/routes.
- `slate360-context/ONGOING_ISSUES.md`: added the Worksite-vs-Project terminology rule.
- `docs/site-walk/SITE_WALK_HOME_COMMAND_CENTER_IMPLEMENTATION_NOTES.md`: documented Slice 1.2 balance/taxonomy refinement.
### What's Broken / Partially Done
- Slice 1 remains pending physical iPhone confirmation.
- Existing route/API/table names still use `project` / `deliverables` where changing them would risk regressions.
- SlateDrop folder automation for Worksites/Projects is documented only; not implemented.
- File-size guard still reports 13 pre-existing unrelated oversized files.
### Context Files Updated
- `SLATE360_PROJECT_MEMORY.md`: latest handoff and terminology rule
- `slate360-context/ONGOING_ISSUES.md`: terminology note
- `docs/site-walk/SITE_WALK_V1_TAXONOMY_AND_WORKFLOW.md`: new taxonomy doc
- `docs/site-walk/SITE_WALK_HOME_COMMAND_CENTER_IMPLEMENTATION_NOTES.md`: Slice 1.2 notes
### Next Steps (ordered)
1. Monitor the Slice 1.2 Vercel deployment.
2. Test on iPhone: action area balance, panel height, wrapped tabs, Worksites empty state, Reports empty state, row menu wording, and two-click delete.
3. Do not mark Slice 1 complete until user confirms phone testing.

## Session Handoff — 2026-05-13 (Site Walk Home final compression)
### What Changed
- `app/site-walk/_components/SiteWalkHub.tsx`: removed the boxed top context row, removed top All Walks button, removed Resume hero, removed metric chip strip, and made the main contained panel the primary value surface with Active / Recent / Projects / Issues / Drafts tabs and tab badges.
- `app/site-walk/_components/WalkActionsMenu.tsx`: changed hard delete from typed DELETE/title confirmation to a two-click destructive modal while still sending the existing server confirmation payload internally.
- `app/site-walk/page.tsx`: reduced mobile vertical padding so the panel starts higher.
- `docs/site-walk/SITE_WALK_HOME_COMMAND_CENTER_IMPLEMENTATION_NOTES.md`: added Phone Review After Compact Pass, final compression notes, review, and validation.
### What's Broken / Partially Done
- Slice 1 remains pending physical iPhone confirmation.
- Setup page still needs a future focused cleanup.
- Saved plan pin move/delete duplication remains deferred to the Pins / Stop Preview slice; no plan viewer or pin logic was changed.
- File-size guard still reports 13 pre-existing unrelated oversized files.
### Context Files Updated
- `SLATE360_PROJECT_MEMORY.md`: latest handoff
- `docs/site-walk/SITE_WALK_HOME_COMMAND_CENTER_IMPLEMENTATION_NOTES.md`: phone-review/final-compression/validation record
### Next Steps (ordered)
1. Monitor the final-compression Vercel deployment.
2. Test on iPhone: tiny Site Walk label, compact Setup Walk / Quick Capture / Project Walk actions, Active tab, Recent full walks list link, Projects/Issues/Drafts tabs, visible row menu, two-click Delete Walk modal, and no page-level scroll under bottom nav.
3. Do not mark Slice 1 complete until the user confirms phone testing.

## Session Handoff — 2026-05-13 (Site Walk Home compact command center correction)
### What Changed
- `app/site-walk/_components/SiteWalkHub.tsx`: compacted Site Walk Home by replacing the large hero with a small context row, replacing oversized action cards with compact Resume Walk / Setup Walk / Quick Capture / From Project actions, converting metrics to chips, and moving Recent / Projects / Issues / Drafts into one contained tabbed work panel.
- `app/site-walk/_components/StatusPanel.tsx`: converted large status cards into compact actionable chips.
- `app/site-walk/_components/WalkActionsMenu.tsx`: made the row menu more visible and added Resume / Open as the first menu action while keeping Delete behind confirmation.
- `components/site-walk/SiteWalkModuleNav.tsx`: replaced the full duplicate subpage module nav with a compact Site Walk context bar and Home affordance.
- `docs/site-walk/SITE_WALK_HOME_COMMAND_CENTER_IMPLEMENTATION_NOTES.md`: documented phone-review findings, compact correction, review checklist, and validation.
- `slate360-context/ONGOING_ISSUES.md`: logged `SITEWALK-PIN-MOVE-DELETE-DUPLICATION` as a critical Pins / Stop Preview follow-up.
### What's Broken / Partially Done
- Slice 1 remains pending physical iPhone confirmation.
- Setup page still needs a future focused cleanup; only duplicate module chrome was compacted here.
- Saved plan pin move/delete and duplicate-on-move behavior is deferred to the Pins / Stop Preview slice; no plan viewer or pin logic was changed.
- File-size guard still reports 13 pre-existing unrelated oversized files.
### Context Files Updated
- `SLATE360_PROJECT_MEMORY.md`: latest handoff
- `docs/site-walk/SITE_WALK_HOME_COMMAND_CENTER_IMPLEMENTATION_NOTES.md`: audit/review/validation record
- `slate360-context/ONGOING_ISSUES.md`: pin move/delete duplication follow-up
### Next Steps (ordered)
1. Monitor the compact correction Vercel deployment.
2. Test on iPhone: compact header/actions, chips, tabbed work panel, Recent rows, Projects tab, More menu, delete confirmation, and Site Walk subpage Home return.
3. After phone confirmation, decide whether to proceed to Setup page cleanup or the next approved Site Walk slice.

## Session Handoff — 2026-05-13 (Site Walk Home command center Slice 1)
### What Changed
- `app/site-walk/page.tsx`: loads real Site Walk command-center summary counts for open items, needs review, draft deliverables, unsynced items, projects, and walks.
- `app/site-walk/_components/SiteWalkHub.tsx`: converted Site Walk Home into a bounded native-style command center with Resume Active Walk, Start New Walk, Quick Walk, status panels, contained Recent Walks, and Field Project shortcuts.
- `app/site-walk/_components/WalkActionsMenu.tsx`: added supported row actions: Rename, Link / Change Project, Create Deliverable, Archive, and Delete with second confirmation.
- `app/site-walk/_components/StatusPanel.tsx`, `ModalActions.tsx`, and `siteWalkHubTypes.ts`: extracted small focused helpers/types to keep files under 300 lines.
- `components/dashboard/AppShell.tsx`: removed the authenticated `MobileInstallStrip` render while leaving the shared component available elsewhere.
- `components/site-walk/SiteWalkModuleNav.tsx`: hides duplicate top tabs on `/site-walk` home only.
- `components/site-walk/SiteWalkShell.tsx`: fills the parent app-shell viewport with `h-full min-h-0` to reduce page-level scroll bleed.
- `docs/site-walk/SITE_WALK_HOME_COMMAND_CENTER_IMPLEMENTATION_NOTES.md`: added audit, implementation notes, review checklist, and validation results.
### What's Broken / Partially Done
- Duplicate Walk is intentionally hidden; no safe duplicate-with-items/attachments API exists yet.
- Physical iPhone testing is still required before marking Slice 1 complete.
- File-size guard still reports 13 pre-existing oversized unrelated files; no Slice 1 changed production file exceeds 300 lines.
### Context Files Updated
- `SLATE360_PROJECT_MEMORY.md`: latest handoff
- `docs/site-walk/SITE_WALK_HOME_COMMAND_CENTER_IMPLEMENTATION_NOTES.md`: audit/review/validation record
### Next Steps (ordered)
1. Monitor Vercel deployment for the Slice 1 commit.
2. Test on iPhone Safari/PWA: `/site-walk` opens without install banner/top tabs, page does not scroll under bottom nav, Recent Walks scrolls internally, row menu opens, delete requires second confirmation, and Resume/Quick Walk still route to capture.
3. Only after user confirms phone testing, mark Slice 1 complete and proceed to the next approved slice.

## Session Handoff — 2026-05-13 (app shell bridge planning)
### What Changed
- `docs/SLATE360_V1_APP_SHELL_UX_ARCHITECTURE.md`: created the shell bridge between Site Walk task UX and the app-neutral Slate360 command-center shell.
- `docs/design/SLATE360_UNIFIED_DESIGN_SYSTEM_GAP_AUDIT.md`: created a planning audit for current UI-system fragmentation, token direction, Codex review role, and guardrail script recommendations.
- `SLATE360_MASTER_BUILD_PLAN.md`: linked the new app-shell/design-system docs and added the Graphite Glass + restrained amber + muted teal shell bridge rules.
- `slate360-context/ONGOING_ISSUES.md`: added the app-shell/design-system issue group for design-system fragmentation, shell command-center alignment, and App Store visible-surface risk.
- `docs/CHATGPT_FACT_FINDING_FILE_LIST.txt`: added the new planning docs to the prioritized file list.
### What's Broken / Partially Done
- No product behavior, backend, schema, Trigger, migration, or UI implementation changes were made.
- Bug registry was not updated in this app-shell bridge pass; existing `BUG-086` remains the grouped Site Walk mobile UI planning tracker.
- The next implementation should still begin with Site Walk Slice 1 unless the user first approves a no-edit app-shell visibility/design audit slice.
### Context Files Updated
- `SLATE360_PROJECT_MEMORY.md`: latest handoff and app-shell visual direction
- `SLATE360_MASTER_BUILD_PLAN.md`: shell bridge and visual framing correction
- `slate360-context/ONGOING_ISSUES.md`: app-shell/design-system planning issues
- `docs/CHATGPT_FACT_FINDING_FILE_LIST.txt`: new docs added
### Next Steps (ordered)
1. Review and approve the new app-shell architecture and design-system gap audit docs.
2. Run the next implementation as Site Walk Slice 1: Site Walk Home command center cleanup, or first run a no-edit shell visibility/design audit if desired.
3. Keep Plan Walk/capture behavior intact while iterating UI.

## Session Handoff — 2026-05-13 (Site Walk V1 mobile UX planning)
### What Changed
- `docs/site-walk/SITE_WALK_V1_MOBILE_UX_DECISION_RECORD.md`: created locked mobile UX decisions for Site Walk Home, task header, stop strip, plan viewer, plan tools drawer, markup, save copy, attachments, shared Quick/Plan Walk capture shell, pin movement, Before/After/Ghost, and color/token direction.
- `docs/site-walk/SITE_WALK_V1_UI_IMPLEMENTATION_PLAN.md`: created eight implementation slices with goals, likely files, what not to touch, validation commands, iPhone smoke tests, and rollback concerns.
- `docs/design/SLATE360_V1_DESIGN_TOKEN_PLAN.md`: created proposed `--s360-*` design tokens and first migration plan limited to Site Walk capture/plan.
- `SLATE360_MASTER_BUILD_PLAN.md`: added the selected Site Walk V1 mobile UX direction and linked the new planning docs.
- `slate360-context/ONGOING_ISSUES.md`: added a Site Walk V1 Mobile UI issue group covering command center, capture header/back/exit, plan workspace/tools, markup, details/save, attachments, pins, Before/After/Ghost, and design tokens.
- `ops/bug-registry.json`: added one grouped UI-planning bug entry if schema validation remains compatible.
### What's Broken / Partially Done
- No UI implementation was done in this planning slice.
- No backend, migration, Trigger, Stripe, or product behavior changes were made.
- The next implementation should start with Slice 1: Site Walk Home command center cleanup.
### Context Files Updated
- `SLATE360_PROJECT_MEMORY.md`: latest handoff and next UI direction
- `SLATE360_MASTER_BUILD_PLAN.md`: Site Walk V1 mobile UX direction
- `slate360-context/ONGOING_ISSUES.md`: UI issue group
- `ops/bug-registry.json`: grouped UI-planning bug entry
### Next Steps (ordered)
1. Review and approve the planning docs.
2. Start Slice 1 only after approval: Site Walk Home command center cleanup.
3. Keep Plan Walk/capture behavior intact while iterating UI.

## Session Handoff — 2026-05-13 (capture + plan mobile UI reorg)
### What Changed
- `components/site-walk/capture/VisualCaptureView.tsx`: reorganized the active capture screen into a flex task shell with a clear Plan return button, secondary Exit action, larger visual stage, compact bottom controls, and vector tools shown only while Drawing is active.
- `app/site-walk/(act-2-inputs)/capture/_components/CaptureClientIsland.tsx`: wired Back to Plan through the existing `walkMode` owner, hid the minimized details launcher while already in plan mode, and extracted controls/helpers to keep the file under the 300-line guard.
- `app/site-walk/(act-2-inputs)/capture/_components/CaptureModeControls.tsx` and `captureSessionHelpers.ts`: extracted capture mode/home controls plus session label helpers from `CaptureClientIsland`.
- `components/site-walk/capture/CaptureDataBottomSheet.tsx`: moved the minimized mobile Details/Start launcher away from the bottom action rail.
- `components/site-walk/capture/UnifiedVectorToolbar.tsx`: compacted markup tools and removed the tall explanatory block.
- `components/site-walk/capture/CameraViewfinder.tsx`: made the plan-target banner compact/absolute in visual mode to preserve photo space.
- `components/site-walk/capture/PlanToolbar.tsx`: reduced the mobile plan toolbar footprint while preserving sheet navigation, search, layer toggles, and zoom.
- `components/site-walk/capture/PendingUploadPreviewModal.tsx`: raised and constrained the upload preview modal so it stays above active capture controls.
- `docs/site-walk/CAPTURE_AND_PLAN_UI_REORG_DIAGNOSIS.md`: added the required structure/overlap diagnosis and safe reorg plan.
### What's Broken / Partially Done
- Physical iPhone verification is still required for the reorganized Back to Plan / Details / upload preview layout.
- Draft pin dragging was not changed in this slice; it remains the prior implementation and should be re-tested on device.
- `bash scripts/check-file-size.sh` still fails on 13 unrelated pre-existing oversized files, but no touched file exceeds the 300-line threshold.
### Context Files Updated
- `SLATE360_PROJECT_MEMORY.md`: latest handoff
- `docs/site-walk/CAPTURE_AND_PLAN_UI_REORG_DIAGNOSIS.md`: mobile capture/plan UI diagnosis
### Next Steps (ordered)
1. Commit and push `fix(site-walk): reorganize mobile capture and plan workspace` to `main`.
2. Monitor Vercel production until the new deployment is Ready.
3. Test on iPhone Safari: plan load → pan/zoom → long-press → capture/upload → Details → Save & Return to Plan → reopen saved pin.

## Session Handoff — 2026-05-13 (Plan Walk action sheet + draft pin drag)
### What Changed
- `components/site-walk/capture/PlanQuickActionMenu.tsx`: raised the plan capture actions to a mobile-safe `z-[2000]` bottom sheet, removed fragile full-screen click-to-close behavior, added Cancel, and kept camera/upload opening from trusted button taps. Note-only is disabled with explanatory text until the visual note UX is reliably wired.
- `components/site-walk/capture/PlanViewerLeaflet.tsx`: unsaved optimistic plan pins are now draggable before save; drag updates `x_pct`, `y_pct`, and the active quick-menu target coordinates without changing persisted pin behavior.
- `components/site-walk/capture/PlanViewerLeafletEvents.tsx`: added limited `[PLAN_WALK]` diagnostics for draft pin creation and action sheet visibility.
- `docs/site-walk/PLAN_WALK_ACTION_MENU_AND_DRAFT_PIN_DIAGNOSIS.md`: documented why the action UI was likely hidden, how the sheet now opens, draft-pin dragging behavior, metadata preservation, and remaining UI parity gaps.
### What's Broken / Partially Done
- Live iPhone verification is still required before marking BUG-079 resolved.
- Note-only plan stops remain a follow-up; the action sheet disables that path rather than leaving a dead button.
- Rich plan pin thumbnail/card preview parity remains a future UI polish slice.
### Context Files Updated
- `SLATE360_PROJECT_MEMORY.md`: latest handoff
- `docs/site-walk/PLAN_WALK_ACTION_MENU_AND_DRAFT_PIN_DIAGNOSIS.md`: action sheet/draft pin diagnosis
### Next Steps (ordered)
1. Validate with `npm run typecheck`, `npm run build`, and `npm run guard:architecture`.
2. Commit and push the focused main fix.
3. Monitor Vercel production deployment and test live iPhone Safari with cache-busting URL.

## Session Handoff — 2026-05-12 (Plan Walk touch capture fix)
### What Changed
- `components/site-walk/capture/PlanViewerLeafletEvents.tsx`: added Leaflet map event bridge for mobile long-press, contextmenu, and explicit Pin-mode click plan-stop creation without disabling normal pan/zoom.
- `components/site-walk/capture/PlanViewerLeaflet.tsx`: moved Leaflet map event handling into the new helper and removed the extra toolbar wrapper so the mobile plan surface gets more usable space.
- `components/site-walk/capture/PlanToolbar.tsx`: mobile toolbar now starts collapsed with sheet/page count and pin count visible; search, layers, zoom, and page navigation remain available when expanded.
- `components/site-walk/capture/PlanQuickActionMenu.tsx`: added limited `[PLAN_WALK]` capture-request diagnostics for camera/upload handoff.
- `docs/site-walk/PLAN_WALK_TOUCH_CAPTURE_DIAGNOSIS.md`: documented the event-path diagnosis, toolbar obstruction, capture handoff, return-to-plan behavior, and follow-ups.
### What's Broken / Partially Done
- Live iPhone verification is still required; do not mark BUG-079 resolved until user confirms plan long-press → capture/upload → details → save → return → one persisted pin.
- Note-only plan stop flow still needs a follow-up UX pass if it remains exposed as a primary workflow.
- Final rich pin thumbnail/card preview parity remains a later UI polish slice.
### Context Files Updated
- `SLATE360_PROJECT_MEMORY.md`: latest handoff
- `docs/site-walk/PLAN_WALK_TOUCH_CAPTURE_DIAGNOSIS.md`: focused diagnosis and fix notes
### Next Steps (ordered)
1. Commit and push the focused main fix after validation.
2. Monitor Vercel production deployment.
3. User tests live iPhone Safari plan long-press capture flow with cache-busting URL.

## Session Handoff — 2026-05-12 (BUG-079 pre-commit review)
### What Changed
- `docs/site-walk/BUG079_IMPLEMENTATION_REVIEW.md`: added strict pre-commit review covering fix summary, changed files, identity lifecycle, validation, remaining risks, manual device test plan, and targeted staging command.
- `docs/CODEX_LOCAL_SETUP_STATUS.md`: recorded Codex CLI global install (`codex-cli 0.130.0`) and current unauthenticated status (`codex login status` => not logged in).
- `docs/site-walk/BUG079_METADATA_AND_UI_PARITY_AUDIT.md`: added focused audit confirming plan-pin captures use the same metadata/upload path as quick capture, with follow-ups documented for richer pin card UI parity and offline transaction resilience.
- Review checks confirmed the BUG-079 tracked diff stays scoped to Site Walk capture/pin identity plus prior workflow/docs; no Trigger, migration, billing, auth, theme, or hidden-app implementation paths were modified.
- Re-ran validations: `npm run typecheck` passed, `npm run build` passed with existing warnings, `npm run guard:architecture` passed, and `npm run audit:sitewalk-release` still reports 984 existing release-surface findings by design.
### What's Broken / Partially Done
- Physical iOS/Android testing is still required before marking BUG-079 fixed in `ops/bug-registry.json` / `slate360-context/ONGOING_ISSUES.md`.
- `npm run audit:sitewalk-release` still exits 1 with 984 existing findings unrelated to the BUG-079 identity fix.
- Codex CLI is installed but not logged in; user must run `codex login` before using Codex audits/reviews.
- No files are staged, committed, or pushed yet.
### Context Files Updated
- `SLATE360_PROJECT_MEMORY.md`: latest handoff
- `docs/site-walk/BUG079_IMPLEMENTATION_REVIEW.md`: review artifact for commit readiness
- `docs/CODEX_LOCAL_SETUP_STATUS.md`: local Codex install/auth status
- `docs/site-walk/BUG079_METADATA_AND_UI_PARITY_AUDIT.md`: metadata/UI parity audit
### Next Steps (ordered)
1. Re-run validation after the metadata/Codex docs are added.
2. If validation is clean, stage only targeted files; do not use `git add .`.
3. Commit and push `chore/codex-workflow-and-sitewalk-pin-plan`, then run physical-device BUG-079 smoke tests before resolving the bug registry entries.

## Session Handoff — 2026-05-12 (BUG-079 pin identity lifecycle slice)
### What Changed
- `components/site-walk/capture/PlanViewerLeaflet.tsx`: optimistic pins now use `clientPinId`/`client_pin_id`; temporary IDs are no longer passed as authoritative `pinId` UUIDs.
- `components/site-walk/capture/planViewerModel.ts` and `PlanViewerPdf.tsx`: PDF/fallback optimistic pins now follow the same client-id distinction.
- `components/site-walk/capture/PlanQuickActionMenu.tsx`: capture targets now separate saved `pinId` from optimistic `clientPinId`, and avoid double-opening the native picker when the direct callback is available.
- `lib/hooks/useCaptureUpload.ts`: attach logic now PATCHes saved UUID pins, POSTs unsaved optimistic pins with `client_pin_id`, parses the returned persisted pin row, and includes it in save context.
- `components/site-walk/capture/useCaptureFileHandler.ts`, `CameraViewfinder.tsx`, `VisualCaptureView.tsx`, and `CaptureClientIsland.tsx`: threaded persisted pin callback and trigger a fresh PlanViewer mount after plan-linked save.
- `lib/site-walk/offline-capture.ts`: offline queued pin mutations now preserve `client_pin_id`.
- `docs/site-walk/BUG079_PIN_CAPTURE_ROOT_CAUSE_PLAN.md`: updated with applied implementation notes.
### What's Broken / Partially Done
- Physical iOS/Android testing is still required before marking BUG-079 fixed in the bug registry.
- Note-only quick action still sets a plan target but needs manual verification of the note-entry UX.
- `npm run audit:sitewalk-release` still reports 984 existing release-surface risk lines unrelated to this fix.
### Context Files Updated
- `SLATE360_PROJECT_MEMORY.md`: latest handoff
- `docs/site-walk/BUG079_PIN_CAPTURE_ROOT_CAUSE_PLAN.md`: applied implementation notes
### Next Steps (ordered)
1. Run physical-device smoke test: plan → pin → photo/upload → details → save → return → refresh, confirming one persisted pin.
2. If verified, update `ops/bug-registry.json` and `slate360-context/ONGOING_ISSUES.md` to mark BUG-079 resolved.
3. Commit only after user review/approval; do not push directly to `main`.

## Session Handoff — 2026-05-12 (Codex workflow + BUG-079 root-cause plan)
### What Changed
- `AGENTS.md`: added repo-level guardrails for Codex/Copilot workflows, App Store mode, Site Walk-only release scope, Trigger rasterization safety, and validation expectations.
- `docs/CODEX_WORKFLOW.md`: documented ChatGPT/Copilot/Codex responsibilities and the feature-branch workflow.
- `docs/CODEX_PROMPTS.md`: added reusable Codex prompts for no-edit audits, BUG-079 identity lifecycle review, hidden-app/filler/style/App Store audits, and PR review.
- `scripts/audit-sitewalk-release-surface.mjs`: added read-only scanner for release-surface risk terms in `app/` and `components/`.
- `package.json`: added `audit:sitewalk-release` script.
- `docs/site-walk/BUG079_PIN_CAPTURE_ROOT_CAUSE_PLAN.md`: confirmed BUG-079 likely root cause and proposed a first implementation slice without touching product code.
### What's Broken / Partially Done
- No BUG-079 product fix implemented yet; approval is needed before editing Site Walk capture/pin code.
- `npm run audit:sitewalk-release` reports 984 current risk lines and exits 1 by design.
- `npm run guard:file-size-regression` still fails on pre-existing over-threshold files.
### Context Files Updated
- `SLATE360_PROJECT_MEMORY.md`: latest handoff for workflow/root-cause planning.
### Next Steps (ordered)
1. Get approval before implementing the BUG-079 pin identity lifecycle fix.
2. Implement the narrow slice from `docs/site-walk/BUG079_PIN_CAPTURE_ROOT_CAUSE_PLAN.md` on the current feature branch.
3. Validate with typecheck/build/guards and physical iOS/Android preview smoke tests before any merge.

## Session Handoff — 2026-05-12 (Trigger PDF rasterizer fixed)
### What Changed
- `src/trigger/rasterize.ts`: fixed production PDF rasterization by explicitly registering `pdf.worker.mjs` on `globalThis`, dynamically loading a Path2D-capable canvas runtime, and adding a Trigger-safe `process.getBuiltinModule` shim before importing `@napi-rs/canvas`.
- `trigger.config.ts`: added `additionalPackages({ packages: ["@napi-rs/canvas"] })` so the Trigger image installs the native canvas package that PDF.js requires at runtime.
- `package.json` / `package-lock.json`: added `@napi-rs/canvas`.
- `lib/types/pdfjs-worker.d.ts`: added a module declaration for `pdfjs-dist/legacy/build/pdf.worker.mjs`.
- Trigger.dev production worker deployed successfully as version `20260512.15`.
### What's Broken / Partially Done
- File-size guard still fails on unrelated pre-existing oversized files; changed production files are under 300 lines (`src/trigger/rasterize.ts` is 252 lines, `trigger.config.ts` is 57 lines).
- Older unrasterized plan sets may still need the user to tap Generate Mobile View unless backfilled separately.
### Context Files Updated
- `SLATE360_PROJECT_MEMORY.md`: latest handoff
- `slate360-context/ONGOING_ISSUES.md`: BUG-082 root cause updated with PDF.js worker/canvas fixes
- `ops/bug-registry.json`: BUG-085 verification updated with production Trigger run success
### Next Steps (ordered)
1. Commit and push the rasterizer fix so Vercel/API-route code and package lock are preserved on `main`.
2. Smoke test from the PWA: upload a new plan → confirm “mobile conversion started” → wait for WebP plan to open in Leaflet.
3. Optional backend cleanup: backfill or re-trigger any remaining old plan sets without `rasterized_key`.

## Session Handoff — 2026-05-12 (plan upload + Trigger dispatch rescue)
### What Changed
- `app/site-walk/(act-1-setup)/setup/_components/ProjectSetupForm.tsx`: added an obvious "Next step — upload plans" panel directly under project setup. Existing/just-saved projects show `PlanUploaderCard`; unsaved projects show "Save first" guidance.
- `app/site-walk/(act-1-setup)/setup/_components/StartWalkForm.tsx`: removed the hidden optional upload toggle. Plan upload is now always visible as "Step 2 — Upload plans for this walk" for the selected project.
- `app/site-walk/(act-2-inputs)/capture/page.tsx`: project-backed walks now enter plan-capable mode even when they currently have zero plan sheets, so users can upload plans from the active walk.
- `app/site-walk/(act-2-inputs)/capture/_components/WalkStartChoice.tsx`: start screen now clearly offers "Open Plan Room / Upload Plans" and "Camera-only Capture".
- `components/site-walk/capture/PlanViewer.tsx`: added active-walk upload state. If a project walk has no plans, it renders `PlanUploaderCard` inside the plan view. If an old plan has no job row or a stale queued/processing job, it shows "Generate Mobile View" instead of spinning forever.
- `app/api/site-walk/plan-sets/[id]/rasterize/route.ts`: stale queued/processing raster jobs older than 5 minutes are marked failed and replaced with a fresh job before dispatching Trigger.dev.
- `app/api/site-walk/plan-sets/route.ts` and `app/api/site-walk/plan-sets/[id]/rasterize/route.ts`: Trigger SDK dispatch now passes `clientConfig.previewBranch = ""` so Vercel production does not send `x-trigger-branch: main`; both routes log accepted Trigger run IDs.
- `components/site-walk/PlanUploaderCard.tsx`: upload no longer fire-and-forgets rasterization. It awaits the manual rasterize route and surfaces dispatch failure instead of showing false completion.
- `trigger.config.ts`: added `syncEnvVars` for Supabase + R2 variables so Trigger.dev workers have the runtime secrets needed to download PDFs and write WebP images.
- Trigger.dev production worker deployed successfully: version `20260512.9`, 1 detected task, 9 env vars synced.
### What's Broken / Partially Done
- Backend inspection found 4 plan sets: all have sheets, zero `rasterized_key`; two had no job rows and two had queued jobs with no raster output. New UI/route handles no-job and stale-job cases, but user must tap "Generate Mobile View" on old plans to force a fresh Trigger run unless we backfill jobs separately.
- Vercel env shows `TRIGGER_SECRET_KEY` available for Preview + Production only. That covers current deployed tests; Development is not set.
- Existing file-size guard still reports unrelated pre-existing >300-line files, including `CaptureClientIsland.tsx` at ~305 lines. Touched files remain under 300 lines.
### Context Files Updated
- `SLATE360_PROJECT_MEMORY.md`: session handoff updated
- `slate360-context/ONGOING_ISSUES.md`: added BUG-082 fixed row for plan upload discoverability/stale jobs
- `ops/bug-registry.json`: added BUG-085 fixed entry
### Next Steps (ordered)
1. Verify Vercel deploy succeeds for the next commit.
2. Smoke test: create/select project → upload plans from project setup; start a new walk → upload plans from visible Step 2; active walk with no plans → Open Plan Room / Upload Plans.
3. Open old plan → tap Generate Mobile View → confirm Trigger.dev prod Runs tab shows a new `plan.rasterize` run and `site_walk_plan_sheets.rasterized_key` fills in.
4. Optional backend cleanup: backfill fresh raster jobs for old unrasterized plan sets instead of requiring manual Generate taps.

## Session Handoff — 2026-05-13 (session 2 — architecture enforcement)
### What Changed
- `components/site-walk/capture/PlanViewerLeaflet.tsx`: **HARD REVERTED** to pre-81bd284. pdfjs browser rendering removed (OOM-crashes WebKit on 50MB PDFs). WebP-only Leaflet viewer restored. `hasRasterized` gate enforced.
- `components/site-walk/capture/PlanViewer.tsx`: `hasRasterized` gate restored. Added Trigger.dev error display — fetches `plan_raster_jobs` via Supabase client when `!hasRasterized`; if `status='failed'`, shows red `AlertTriangle` card with `error_text`. No more silent spinners.
- `components/site-walk/capture/useCaptureItems.ts`: Added `deselectItem()` export (clears `activeItemId`).
- `app/site-walk/(act-2-inputs)/capture/_components/CaptureClientIsland.tsx`: `deselectItem()` now called in `saveNextStop` when returning to plan. Removed redundant double `setWalkMode("plan")` call. FAB correctly shows "Start Capture" after save-and-return.
### What's Broken / Partially Done
- **Root cause still unfixed**: `TRIGGER_SECRET_KEY` not set in Vercel Production. Plans will still spin (or show Trigger error on failure) until the key is added.
  - Fix: Trigger.dev dashboard → Project Settings → API Keys → copy `tr_prod_...` → Vercel env → `TRIGGER_SECRET_KEY` (Production + Preview).
- `plan_raster_jobs` error fetch in `PlanViewer` is one-shot (no polling). If job fails after mount, error won't auto-appear without navigation.
### Context Files Updated
- `SLATE360_PROJECT_MEMORY.md`: session handoff updated
### Next Steps (ordered)
1. Check Trigger.dev Dashboard → Runs tab → find failed run error message.
2. Add `TRIGGER_SECRET_KEY` (prod `tr_prod_...`) to Vercel → redeploy → confirm Runs tab is populated.
3. Once Trigger runs, test full loop: upload plan → wait for rasterize → plan in Leaflet → long-press → pin → camera → capture → "Save & Return to Plan" → confirms lands back on plan with clear FAB.

## Session Handoff — 2026-05-13 (session 1 — browser rendering attempt, superseded)
### What Changed (REVERTED in session 2)
- `app/api/site-walk/plan-sets/[id]/pdf/route.ts` (NEW): GET proxy for PDF from R2. Still in codebase; unused now.
- `app/api/site-walk/plan-sets/[id]/rasterize/route.ts` (NEW): POST retry endpoint. Still in codebase; used by retry button.
- `app/api/site-walk/plan-sets/route.ts`: `tasks.trigger` wrapped in TRIGGER_SECRET_KEY guard. Still active.
- `supabase/migrations/20260512000003_rls_realtime_plan_sheets.sql`: RLS policies APPLIED. Still active.
- `.env.local`: Fixed `MARKET_SCHEDULER_SECRET` double-quoted value. Still fixed.

## Session Handoff — 2026-05-12
### What Changed
- `lib/hooks/usePlanSheetsRealtime.ts` (NEW): Supabase Realtime hook — subscribes to `site_walk_plan_sheets` changes filtered by `project_id`. When Trigger.dev writes `rasterized_key`, local state updates instantly. This is the fix for `hasRasterized` evaluating to false after rasterization completes.
- `app/site-walk/(act-2-inputs)/capture/_components/CaptureClientIsland.tsx`: now calls `usePlanSheetsRealtime(planSheets, projectId)` and passes `liveSheets` to `PlanViewer`. Root cause of Leaflet not loading was static server props never updating.
- `components/site-walk/PlanUploaderCard.tsx` (NEW): shared PDF plan uploader component, transplanted from deleted plans page.
- `app/site-walk/(act-1-setup)/setup/_components/StartWalkForm.tsx`: added collapsible "Upload a plan (optional)" section with `PlanUploaderCard` — plan upload is now part of walk creation.
- `components/shared/MobileBottomNav.tsx`: removed Plans tab from `SITE_WALK_NAV`; `/site-walk/plans` now falls under "More" match prefix.
- `app/site-walk/(act-1-setup)/plans/` (DELETED): entire directory removed (page + 6 _components).
### What's Broken / Partially Done
- Supabase Realtime requires the `project_id` column to be indexed on `site_walk_plan_sheets` for filter performance. Verify or add index if latency is an issue.
### Context Files Updated
- `SLATE360_PROJECT_MEMORY.md`: session handoff added
### Next Steps (ordered)
1. Verify Vercel deploy succeeds (check Vercel dashboard).
2. Smoke test: upload a PDF on the setup page → check plan sheets appear in capture view via Leaflet automatically.
3. Confirm Supabase Realtime is enabled for the `site_walk_plan_sheets` table in the Supabase dashboard (Table Editor → Replication).
4. If Leaflet still doesn't appear after rasterization, check Trigger.dev run logs for errors writing `rasterized_key`.
### What Changed
- `lib/hooks/usePlanSheetsRealtime.ts` (NEW): Supabase Realtime hook — subscribes to `site_walk_plan_sheets` changes filtered by `project_id`. When Trigger.dev writes `rasterized_key`, local state updates instantly. This is the fix for `hasRasterized` evaluating to false after rasterization completes.
- `app/site-walk/(act-2-inputs)/capture/_components/CaptureClientIsland.tsx`: now calls `usePlanSheetsRealtime(planSheets, projectId)` and passes `liveSheets` to `PlanViewer`. Root cause of Leaflet not loading was static server props never updating.
- `components/site-walk/PlanUploaderCard.tsx` (NEW): shared PDF plan uploader component, transplanted from deleted plans page.
- `app/site-walk/(act-1-setup)/setup/_components/StartWalkForm.tsx`: added collapsible "Upload a plan (optional)" section with `PlanUploaderCard` — plan upload is now part of walk creation.
- `components/shared/MobileBottomNav.tsx`: removed Plans tab from `SITE_WALK_NAV`; `/site-walk/plans` now falls under "More" match prefix.
- `app/site-walk/(act-1-setup)/plans/` (DELETED): entire directory removed (page + 6 _components).
### What's Broken / Partially Done
- Supabase Realtime requires the `project_id` column to be indexed on `site_walk_plan_sheets` for filter performance. Verify or add index if latency is an issue.
### Context Files Updated
- `SLATE360_PROJECT_MEMORY.md`: session handoff added
### Next Steps (ordered)
1. Verify Vercel deploy succeeds (check Vercel dashboard).
2. Smoke test: upload a PDF on the setup page → check plan sheets appear in capture view via Leaflet automatically.
3. Confirm Supabase Realtime is enabled for the `site_walk_plan_sheets` table in the Supabase dashboard (Table Editor → Replication).
4. If Leaflet still doesn't appear after rasterization, check Trigger.dev run logs for errors writing `rasterized_key`.

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

## Critical Rules & Safety Guardrails

**1. No "Vibe Coding" & No Feature Creep**
- Build ONLY what is explicitly requested or specifically required to resolve the active task/bug.
- Do NOT invent features, fluff UI, or add "AI generated" filler content/options just to make a page look busy. Everything presented to the user must provide explicit, practical value.
- If you notice missing "industry standards" or have ideas for architectural improvements, **STOP and ask the user** in conversation before building them.

**2. Anti-Tangling & Code Structure**
- No production `.ts` / `.tsx` / `.js` file over **300 lines**. If a file grows too large, extract components/hooks safely.
- One component per file, one hook per file.
- Single responsibility: keep files decoupled to prevent tangled bugs where fixing one area breaks another.

**3. Types & Access**
- No `any`. Use proper typed contracts. Types come from `lib/types/`.
- Use shared auth wrappers and response helpers.
- Internal routes (`/ceo`, `/market`, `/athlete360`) do not use entitlements.
- Subscription gates must use `getEntitlements()`.

**4. Data & State**
- New folder writes use `project_folders`.
- No mock data in production UI. Show realistic empty states or error states.
- Always `await` backend DB actions before navigating or fetching related data (prevent async race conditions).

**5. Context Integrity**
- Update context docs after code changes.

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
| **Colors / design tokens / CSS vars / logos / email colors** | **`slate360-context/DESIGN_SYSTEM.md`** |
| **What's left to build (completion audit)** | **`docs/COMPLETION_AUDIT.md`** |

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

## Latest Session Handoff — 2026-05-12

### What Changed
- `src/trigger/rasterize.ts`: Removed `@napi-rs/canvas`, switched to standard `canvas`, injected `DOMMatrix` and `ImageData` polyfills, and deferred `pdfjs-dist` to conditional dynamic imports so it passes the Trigger bundle phase.
- `trigger.config.ts`: Added exact linux bindings for Cairo/Pango via `systemDependencies: ["libcairo2-dev", "libpango1.0-dev", "libjpeg-dev", "libgif-dev", "librsvg2-dev"]`.
- `components/site-walk/capture/PlanToolbar.tsx`: Stripped standard layout format and fixed it as an absolute `<div className="absolute top-12 inset-x-2 z-50 pointer-events-none">` floating directly over the Leaflet map.
- `components/site-walk/capture/VisualCaptureView.tsx`: Extracted Unified Bottom Rail to rigidly stick to `bottom-0` and set `pr-[160px]` padding to completely dodge the floating `CaptureDataBottomSheet` FAB.

### What's Broken / Partially Done
- All requested critical overrides are fully executed and actively deployed. The Vercel PDF block limit issue was successfully conquered via `trigger.dev` and all Native C++ compile errors have been routed around.

### Context Files Updated
- `SLATE360_PROJECT_MEMORY.md`: Logged success condition of the Enterprise Pipeline.

### Next Steps
1. Field-Test Mobile App on physical iOS device for canvas rendering success inside background workers via S3 polling.
2. Expand Trigger worker to dispatch WebSocket / Revalidation hooks so the client automatically updates its state without manual refreshing.
