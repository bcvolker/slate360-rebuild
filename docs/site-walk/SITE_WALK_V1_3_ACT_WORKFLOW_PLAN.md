# Site Walk V1 — 3 Act Workflow, Layout, and Launch Plan

Last Updated: 2026-05-01
Purpose: Product/UI plan for making Site Walk usable for Slate360 Version 1 launch.

---

## Authoritative Companion Doc

The strategic source of truth is now `docs/SITE_WALK_MASTER_ARCHITECTURE.md`.

This V1 3 Act workflow plan remains the execution-oriented launch plan, but it must not be interpreted as a PDF-centric camera app plan. Any build prompt or implementation slice must preserve these master constraints:

- Site Walk is a module inside Slate360, not a separate app/auth/billing/file system.
- Field-office sync is central: Supabase Realtime/Broadcast, subscriber/collaborator project context, Coordination Hub notifications, and SlateDrop file routing are core architecture.
- Offline-first capture is required, but through explicit IndexedDB queues. Service-worker HTML/CSS/JS caching is disabled until a new offline strategy is proven on real phones after deployment.
- Tier gating is required: Free Collaborator assigned-task UI, Standard solo field projects, Pro/Business collaborator/CM workflows, and Enterprise governance.
- Monetization guardrails are part of product design: storage caps, AI credit caps, R2-backed storage, and App Store fee assumptions must protect margin.
- Deliverables are not PDF-first. PDF export is one output alongside hosted previews, interactive portals, Kanban boards, cinematic presentations, SMS/email links, CSV/Excel exports, and integration targets.
- App Store mode must hide unfinished apps/features entirely; no Coming Soon/dead-end surfaces should appear under `NEXT_PUBLIC_APP_STORE_MODE=true`.
- User-facing launch copy must avoid `Beta`, `Beta Testing`, and `Waitlist`; use `Version 1`, `Foundational Member`, `Account Verification`, or `Workspace Provisioning`.
- Data entry must use configurable Tags / Departments / Categories instead of hardcoded trade dropdowns so Site Walk can serve construction, university facilities, insurance, real estate, and other field workflows.
- Organization `owner` / `admin` users can receive a Global Command Center view across all active walks in their organization; solo owners should not see enterprise-only clutter unless needed.

---

## 2026-04-27 Backend Compatibility Baseline

This build plan is now aligned to the backend that is live on Supabase and tracked in migrations. The Site Walk UI should build against this baseline rather than inventing a parallel data model.

### Backend now available

| Capability | Backend support to use | Build implication |
|---|---|---|
| Project/collaborator-safe access | `user_can_access_project()`, `user_can_manage_project()`, `user_can_access_org_or_project()`, `user_can_manage_org_or_project()` plus project-aware RLS | New APIs should use `withProjectAuth()` or explicitly verify project access before reads/writes. Do not rely only on org membership for project-bound workflows. |
| Ad-hoc and project-bound sessions | `site_walk_sessions.project_id` is nullable; `is_ad_hoc`, `client_session_id`, `session_type`, `sync_state`, `last_synced_at` exist | `Start Walk Now` can create an ad-hoc session, then later attach it to a project. Project-bound walks should carry `project_id` from the start. |
| Items/capture persistence | `site_walk_items` has `project_id`, file linkage, offline IDs, `capture_mode`, `sync_state`, upload state/progress, vector history, tags, trade/category, assignment/status fields | The capture UI must autosave draft items and patch fields incrementally. Client IDs should be generated for offline replay/idempotency. |
| Master Plan Room | `site_walk_plan_sets`, `site_walk_plan_sheets`, `site_walk_session_plan_sheets`; legacy `site_walk_plans` remains for compatibility | New plan UI should prefer project-level plan sets/sheets and only use legacy plans as a bridge. |
| Plan pins and markup | `site_walk_pins` supports draft pins, `plan_sheet_id`, `pin_status`, `label`, `markup_data`, realtime update identity | Long-press plan pinning can create draft pins before full item details are complete. Vector markup stays editable as JSON. |
| Offline queue | `site_walk_offline_mutations` plus existing IndexedDB helpers | Offline UI must show pending/syncing/synced/failed/retry states and replay mutations in order. |
| Realtime field-office sync | Realtime publication covers Site Walk tables including items, pins, deliverable interactive tables, activity, receipts, usage | Office/leadership views can subscribe to active sessions and observe status, pins, item inserts, and responses without manual refresh. |
| SlateDrop bridge | `slatedrop_uploads`, `unified_files`, `site_walk_items.file_id`, `site_walk_deliverable_assets.file_id/unified_file_id` | Captures and deliverables must appear in project files. Do not write orphaned S3-only objects. |
| Deliverables beyond PDF | Expanded deliverable types/statuses, `site_walk_deliverable_blocks`, `site_walk_portal_boards`, assets/scenes/hotspots/threads/responses/sends | The deliverable build should produce hosted outputs first, with PDF/email as export/send modes. |
| Audit/read receipts/usage | `site_walk_activity_log`, `site_walk_read_receipts`, `site_walk_usage_events`, `site_walk_usage_monthly`, `record_site_walk_usage()` | Important sends, views, exports, comments, status changes, storage, AI, and realtime usage should be recorded. |

### Existing code that must be reconciled before/during UI build

- `/site-walk` is currently intentionally rebuilt from a clean surface. Legacy UI lives under `app/site-walk/_legacy_v1/` and should be treated as reference only, not the active route tree.
- Prompt 0 reconciled the shared contracts by splitting `lib/types/site-walk.ts` into a barrel plus focused type modules and live-schema constants. Keep new Site Walk UI/API imports pointed at `@/lib/types/site-walk`.
- `app/api/site-walk/deliverables/route.ts` now accepts the full backend deliverable type list: `report`, `punchlist`, `photo_log`, `rfi`, `estimate`, `status_report`, `proposal`, `field_report`, `inspection_package`, `safety_report`, `proof_of_work`, `client_portal`, `kanban_board`, `cinematic_presentation`, `spreadsheet_export`, `virtual_tour`, `tour_360`, `model_viewer`, `media_gallery`, `client_review`, `custom`.
- `app/api/site-walk/deliverables/[id]/route.ts` now accepts `draft`, `in_review`, `approved`, `submitted`, `shared`, `published`, `archived`, `revoked`.
- `app/api/site-walk/deliverables/send/route.ts` already sends `link`, `inline_images`, and `pdf_attachment`; it must also write rows into `site_walk_deliverable_sends` and support `email_snapshot` when the UI produces one.
- Deliverable metadata visibility does not need a new schema migration: `site_walk_deliverables.viewer_config` already exists and create/update APIs accept it. Use a stable nested shape such as `viewer_config.metadataVisibility = { gps: boolean, weather: boolean, timestamps: boolean, assignee: boolean, costImpact: boolean }`. `organizations.brand_settings` can hold org defaults, but each deliverable should persist its own override in `viewer_config`.
- `lib/site-walk/load-deliverable.ts` currently normalizes public viewer items from `site_walk_deliverables.content`; it should be upgraded to load normalized `site_walk_deliverable_assets/scenes/hotspots/threads/responses` while preserving old `content` compatibility.
- `app/api/site-walk/sessions/route.ts` supports nullable `project_id`, ad-hoc session creation, `client_session_id`, `session_type`, and `sync_state`.
- `app/api/site-walk/pins/route.ts` supports `plan_sheet_id` and draft pins where `item_id` is not available yet.
- `app/api/site-walk/upload/route.ts` currently routes photo/file captures to the project `Photos` folder. That is acceptable for launch, but the build should add clear folder conventions for Site Walk sessions and deliverables when SlateDrop provisioning is updated.

### 2026-04-30 Cross-App Ecosystem Synergy Baseline

Site Walk must preserve Slate360 ecosystem upside without becoming a clone of every other app. Cross-app features are premium, entitlement-gated bridges:

- **Site Walk + 360 Tours:** only show 360 import/reference, 360 plan-pin viewer launch, and `tour_360`/`photo_360` deliverable composition when the workspace has both Site Walk (`punchwalk`) and 360 Tours (`tour_builder`) access. The entitlement resolver already exposes `resolveModularEntitlements()` and the `synergy.tours360InSiteWalk` flag.
- **Site Walk + Design Studio:** only show model/design references in Site Walk deliverables when the workspace has both apps and `synergy.designInSiteWalk` is true.
- **No dead surfaces:** if a user lacks the required app, hide the cross-app action or show a real upgrade CTA. Do not render nonfunctional `360`, `Design`, or `Coming Soon` buttons in App Store mode.
- **Source of truth:** 360 authoring remains in 360 Tours. Site Walk may reference existing `project_tours` / `tour_scenes`, import entitled equirectangular assets into a Site Walk deliverable, or attach a 360 reference to a plan pin, but Site Walk should not duplicate the full 360 Tour builder UI.
- **Backend state:** `site_walk_deliverable_assets.asset_type` already supports `photo_360` and `tour_360`; `site_walk_deliverable_scenes.scene_type` supports `photo_360`; hotspots support `yaw`/`pitch`; and `site_walk_items.metadata` can carry bridge metadata. However, `site_walk_items.item_type` does not yet include `photo_360`, and there is no explicit bridge API from 360 Tours into Site Walk. Build the bridge before promising end-to-end cross-app UX.
- **Audit fields for future bridge:** any cross-app reference should persist source app, source table/id, source project, org, creator, referenced-vs-copied mode, entitlement gate used, and creation timestamp in normalized columns or `metadata`.

### Copilot response concerns addressed in this plan

| Concern | Resolution in this build plan |
|---|---|
| Backend drift / migration history | Already repaired. `supabase db push --dry-run --linked` reports the remote DB is up to date. Build uses current migrations, not assumed schema. |
| Rich deliverables may not be backed by schema | Addressed by `site_walk_deliverable_assets`, `scenes`, `hotspots`, `threads`, `responses`, and `sends`. Act 3 must use these normalized tables. |
| Dead buttons / App Store rejection risk | Every prompt includes a no-dead-button acceptance gate. App Store mode hides incomplete paths instead of showing placeholders. |
| Field-office realtime requirement | Prompts 4, 6, 7, and 9 include realtime subscriptions for items, pins, assignments, activity, and office board state. |
| Coworker/collaborator workflow | Access must use project-aware helpers and free-collaborator assigned-task routes. Collaborators should be able to respond and submit proof without full subscriber creation UI. |
| Offline resilience | Prompts 5, 6, 7, and 9 require IndexedDB drafts, blob persistence, ordered replay, idempotency, visible sync state, and conflict handling. |
| Scale to thousands through 100k+ users | Build must keep server components first, limit realtime subscriptions to active sessions/project boards, use indexed project/session queries, paginate lists, avoid large client payloads, and test with seeded/load data before launch. |
| Testability | Every prompt ends with typecheck/errors, file-size guard, route smoke, focused Playwright/manual checks, and a summary for outside-AI review. |
| Need for outside prompts | No external prompts are required for implementation. Another AI can review each completed prompt summary against this plan. |

### Critical review corrections added before execution

The outside-AI critical review was correct: the prior plan addressed backend compatibility but did not yet make three execution constraints explicit enough. These are now mandatory:

1. **300-line modular scaffolding before capture logic.** Prompt 1 must create the Act 2 capture scaffold as small imported files before any heavy capture/canvas logic is written. The active route `app/site-walk/(act-2-inputs)/capture/page.tsx` must compose imported components, not grow into a monolith. Required placeholder components: `DualModeToggle.tsx`, `CameraViewfinder.tsx`, `PlanViewer.tsx`, `UnifiedVectorToolbar.tsx`, `CaptureBottomSheet.tsx`, and `SyncQueueIndicator.tsx` under the Site Walk component tree.
2. **Profit-margin metering engine before upload/AI expansion.** Prompt 2 is now dedicated to metering. Upload presign routes and AI note/transcription routes must enforce tier caps, record usage, and block or prompt for top-up before expensive usage occurs.
3. **Global app shell and Site Walk module shell are separate.** `/dashboard` owns global Slate360 actions like Programmable Quick Start, Open SlateDrop, and Search Everything. `/site-walk` owns Site Walk-specific Recent Walks, Master Plan Room, Active Walks, Capture, Deliverables, and Assigned Work. The build must not duplicate the global dashboard inside the Site Walk module.
4. **App Store review account is mandatory.** Store submissions must include a permanent pre-approved reviewer login such as `apple@slate360.ai` that bypasses the access queue and opens a seeded, fully functional workspace.
5. **Generalized data entry is mandatory.** Construction templates can exist as industry packs, but the base UI must expose custom tags/departments/categories and broad defaults such as Safety, Quality, Maintenance, Progress, Priority, Follow-Up, and Client Request.

---

## North Star

Site Walk should feel like a mobile field assistant that turns jobsite context into branded deliverables:

1. **Act 1 — Set the stage:** company identity, contacts, project/site setup, location, templates, plans, and deliverable defaults.
2. **Act 2 — Capture inputs:** walk the site, take/upload photos, mark them up, classify findings, dictate notes, assign people, and autosave every item.
3. **Act 3 — Produce outputs:** choose a deliverable type, pull in captured items, brand it, price it when needed, preview, send, and track responses.

Site Walk must use the same Slate360 auth, Coordination contacts/inbox, and SlateDrop file backbone. It should not feel like a separate app.

The build must also preserve the larger strategic hooks: real-time multiplayer sync, offline queue resilience, collaborator restrictions, App Store review mode, leadership oversight, audit trails, and non-PDF deliverables.

---

## Act 1 — Setting the Stage

### Entry Page: `/site-walk`

Primary layout:
- Hero card: `Start Walk Now`, `Create Field Project`, `Upload Photo/File`, `Voice Note`.
- Recent walks: active/in-progress first.
- Recent deliverables: draft/shared status.
- Setup checklist: Branding, Contacts, Location, Templates, SlateDrop folders.

### Project / Field Report Creation

Two creation modes:

1. **Fast Field Report**
   - Name
   - Scope/purpose
   - Location
   - Optional client/stakeholders
   - Optional template
   - Starts capture immediately

2. **Project-Bound Walk**
   - Project name and type
   - Address using Google Places autocomplete
   - Map/geofence preview
   - Stakeholder groups from Coordination contacts
   - Plan uploads to SlateDrop `Site Walk Files / Plans`
   - Deliverable defaults: proposal, report, punch list, status update

3. **CM Project / Pro-Business Walk**
   - Cost-coded budget context
   - Schedule/milestone context
   - RFI/submittal hooks
   - Collaborator permissions and assigned-task routing
   - Leadership risk/reporting metadata

All project modes must support organization-defined Tags / Departments / Categories. Industry-specific fields such as trades, RFIs, submittals, claim types, asset groups, or listing condition categories are optional templates layered on top of the generalized tag system.

### Location + Google API UI

Recommended interface:
- Search field with Google Places autocomplete.
- Map preview card with pin, address, and confidence state.
- `Use current location` button on mobile.
- Address detail editor for suite/floor/unit.
- Optional geofence radius for higher-tier schedule/location awareness.

### Contacts + Stakeholders

Contacts come from Coordination Hub:
- Global contacts: reusable across Slate360.
- Project contacts: client, owner, PM, department lead, vendor, contractor, inspector, outside collaborator, internal team.
- Recipient groups: proposal recipients, daily update recipients, punch list recipients.
- Permission levels: view only, comment/respond, upload files, assigned-task responder.

### Branding + Deliverable Defaults

Company settings should be configured once and reused:
- PNG logo.
- Company name, address, phone, website.
- Brand color.
- Header/footer style.
- Signature block.
- Proposal terms/disclaimer.

Deliverables should automatically pull this information when created.

---

## Act 2 — Capture Inputs

Act 2 must start from the Act 1 setup context. Quick Capture remains available as a fallback, but it is not the primary product story. Planned walks, Master Plan Room sheets, assigned work, and strict subscriber/collaborator boundaries are the default assumptions for production workflows.

### Capture Home

Mobile-first bottom controls:
- `Camera`
- `Upload`
- `Plan`
- `Voice`
- `Items`

Top controls:
- Current walk name.
- Autosave/sync state.
- Battery/offline indicator.
- End walk button.

Start behavior:
1. User taps `Start Walk Now`.
2. If the session/project has uploaded plan sheets, the app asks: `Walk with Plans` or `Camera Only`.
3. `Walk with Plans` opens the Master Plan Room / active sheet first, with a camera action available from the plan header.
4. `Camera Only` bypasses the plan layer and opens the existing Visual capture surface.
5. If no plan sheets exist, the app defaults to Camera Only but should still surface the Act 1 prompt to upload plans before the next planned walk.

Rules:
- No user is forced to use plans. Plan-based walks are premium and encouraged, but Camera Only remains a supported fallback.
- If plans exist, never funnel the user directly into camera without the plan/camera choice unless they explicitly launched a quick camera action.
- Users must be able to switch between Plan and Camera modes from the capture header after the walk starts.

### Plan Canvas / Master Plan Room Runtime

The plan screen is the primary surface for planned walks. It must be optimized for one-hand mobile use and low visual clutter.

Plan navigation:
- Mobile viewing uses pinch-to-zoom and pan as first-class gestures.
- Sheet/page navigation must be easy to reach through a sheet selector or bottom-sheet page picker.
- Multi-page PDFs are treated as plan sheet collections; users should never have to leave the walk to switch sheets.

Plan pinning:
- Pin dropping must use a Crosshair / Center-Screen mechanism: the user pans/zooms the plan until the target is under the fixed crosshair, then taps `Drop Pin`.
- Do not use long-press as the primary plan pin mechanism. Long-press can remain a fallback gesture only after the crosshair flow is shipped and tested.
- Dropping a plan pin opens quick actions: `Take Photo`, `Upload from Device`, `Add Note`, `Assign Task`, and `Progress / Before & After`.

Pin clutter and layers:
- Default layer shows only pins for the active walk/session.
- Optional toggles can reveal `Historical Pins`, `Assigned to Me`, `Resolved`, and `All Project Pins`.
- Historical pins are never on by default; this protects mobile performance and keeps field crews focused.
- Assigned-collaborator views default to only the pins/tasks assigned to that collaborator.

### Taking or Uploading a Picture

Flow:
1. User taps Camera or Upload.
2. Image opens in a review screen.
3. User can accept, retake, upload another, or mark up.
4. Background metadata is captured silently: timestamp, GPS if allowed, device, optional weather.
5. The original image is preserved; markups are stored separately as editable vector data.

Background metadata rules:
- GPS, weather, and timestamps are supporting context, not deliverable requirements.
- Deliverables can include or hide metadata per template, recipient, tier, and privacy setting.
- Missing GPS/weather must never block capture, save, preview, or delivery.

### Markup UI

Toolbar options:
- Arrow
- Freehand draw
- Rectangle
- Circle/ellipse
- Text label
- Numbered pin
- Measurement/calibration placeholder
- Blur/redaction for sensitive info
- Before/after link
- Attach/embed another image or file as supporting context

Color options:
- Red: urgent/problem
- Yellow: caution
- Green: complete/acceptable
- Blue: information
- White/black: contrast labels

Editing behavior:
- Every markup object should remain selectable after creation.
- Users can move, resize, recolor, edit text, delete, undo, redo.
- Markups should autosave as vector JSON plus a rendered preview for deliverables.
- The Oops Engine is mandatory: local undo/redo stack for vector operations before and after autosave where possible.

Plan behavior:
- Clean base plan plus active-walk pins is the default view.
- Layer toggles: current walk pins, historical pins, resolved items, assigned-to-me.
- Multi-page PDF plan navigation uses a sheet-index bottom sheet or equivalent one-hand picker.
- Pinch-to-zoom and pan are first-class mobile gestures, but pin placement is crosshair-driven.

### Classification + Notes Screen

After image/markup, user lands in a bottom-sheet style data panel with a thumbnail of the current photo pinned at the top.

Fields:
- Title
- Classification: observation, issue, punch item, proposal opportunity, safety, progress, RFI, general note
- Priority: low, medium, high, critical
- Status: pending, in progress, needs review, complete, needs attention
- Location label: floor/room/area
- Assign to: Coordination contact or project stakeholder
- Due date
- Cost estimate / itemized pricing when deliverable type requires it
- Notes rich text area

Notes UI:
- Large dictation-friendly text area.
- Formatting toolbar: bullets, numbered list, bold, heading, checklist.
- AI boost/magic wand button near the text box footer and above the keyboard safe area.
- AI actions: clean up wording, make professional, summarize, expand recommendations, convert to proposal language.

Keyboard behavior:
- On mobile, the photo thumbnail collapses to a small sticky strip when keyboard opens.
- Primary action bar stays above the keyboard: `Save Item`, `Next Capture`, `Items`.
- No critical buttons should sit behind iOS/Android keyboard chrome.

Autosave:
- Draft item is created immediately after capture.
- Markup, classification, notes, and assignments patch the item as the user works.
- Offline changes queue locally and sync when connection returns.
- Sync state must be visible: pending, syncing, synced, failed, retrying.

### Managing Many Items

Items list should support:
- Search.
- Filters by classification, status, priority, assignee, location, date.
- Bulk select.
- Edit item.
- Delete item with confirmation.
- Duplicate item.
- Create follow-up/resolution item.
- Before/after relationship.

---

## Act 3 — Outputs and Deliverables

### Deliverable Studio

User chooses a deliverable type:
- Proposal
- Field report
- Punch list
- Photo log
- Status report
- Estimate / scope of work
- Proof-of-work packet
- Safety report
- Inspection package
- Client portal board
- Cinematic presentation
- Spreadsheet/export package
- Custom branded package

The deliverable builder pulls from:
- Captured photos and markups.
- Notes and AI-cleaned descriptions.
- Classifications and status.
- Pricing/cost estimate fields.
- Project location and stakeholder details.
- Company branding settings.
- SlateDrop attachments.

### Proposal Deliverable

Recommended sections:
- Cover page with logo and client/project info.
- Executive summary.
- Existing conditions with images and markups.
- Diagnosis / findings.
- Recommendations.
- Itemized pricing table.
- Optional exclusions/assumptions.
- Signature/acceptance block.

### Sharing and Feedback Loop

Send modes:
- PDF email.
- Inline image email.
- Web viewing page.
- Secure SlateDrop link.
- SMS link when contact has phone number.
- Interactive client portal.
- Cinematic presentation link.
- CSV/Excel export.
- Procore/Primavera integration target export.

Responses:
- Stakeholder comments and file responses route to Coordination Inbox.
- Creator receives notification bell unread state.
- Feedback replies from Operations Console also route to Coordination Inbox.

### Cinematic Presentation Mode

Presentation mode must be treated as a premium Act 3 deliverable:
- Pitch-black `bg-[#0B0F15]` stage.
- Dark glass controls: `bg-white/10 backdrop-blur-md border border-white/20`.
- Bottom horizontal filmstrip for instant issue navigation.
- Guided presenter view and detached viewer exploration.
- Right-side collapsible comments/resolution panel tied to the current pin/photo.
- Top-right Share action that creates a secure SlateDrop link and supports native share/QR/SMS/email.

### Deputized Collaborator / Cross-Org Loop

Free Collaborators do not see the full subscriber creation surface. They run inside a restricted Trapped Shell that proves the app has useful functionality without exposing subscriber-only project setup, billing, deliverables, or broad project data.

Subscriber / GC capabilities:
- Create projects, plan sets, planned walks, deliverables, assignments, and collaborator invites.
- See all project walk history, historical pins, team progress, and deliverable outputs allowed by tier.
- Convert collaborator responses into reports, punch lists, proposals, proof packets, and client portals.

Free Collaborator capabilities:
1. Open Slate360 and select the subscriber/GC context in the header switcher.
2. Land on `Assigned Tasks` / `My Work`, not project creation.
3. See only projects, walks, pins, files, comments, and tasks specifically assigned to them.
4. Open a task/pin such as `Document Room 214 condition` or `Submit assigned proof`.
5. Route directly into Act 2 capture for that assigned item.
6. Submit Progress / Before-and-After proof, notes, status, and allowed file responses on those assigned pins only.
7. Notify the subscriber/GC through Coordination Hub and route files into SlateDrop.

Subscriber-to-subscriber collaboration:
- If an invited email already belongs to a paid Slate360 workspace, keep that user’s own organization intact.
- The invited subscriber can switch between their organization and the inviting organization/project through the top header context switcher.
- Shared project access should feel like collaboration between equals while still honoring the inviting organization’s project permissions.

Leadership oversight:
- Organization `owner` and `admin` roles can access a Global Command Center that lists all active walks across all org projects.
- Leadership users can read, comment, and monitor risk/status across employee walks without requiring every project manager to manually share each walk.
- Solo organization owners should simply see their normal dashboard; enterprise leadership chrome should appear only when there is more than one org member/project or when the user opens the command center.

App Store review safety:
- Free Collaborators must not land in an empty shell when they have no assigned work.
- They get a heavily restricted Personal Workspace for basic quick captures, local notes, and profile/account setup.
- The Personal Workspace must not create subscriber-owned projects, branded deliverables, plan rooms, broad file shares, or team assignments.
- Upsell Solo / Standard tier from Personal Workspace with clear messaging: upgrade to create your own projects, plan rooms, and deliverables.
- Public UI must not say `Beta`, `Beta Testing`, or `Waitlist`; use `Account Verification`, `Workspace Provisioning`, `Foundational Member`, or `Version 1 Access`.
- App Store submission credentials must use a permanent approved account such as `apple@slate360.ai` so reviewers bypass the access queue and see complete functionality.

Enforcement rules:
- Collaborator APIs must use project-aware access helpers and assignment checks.
- Collaborators cannot reveal historical pins unless assigned or explicitly shared.
- Collaborators cannot create unauthorized project pins; they can add proof/resolution captures to assigned pins.
- Subscriber context and Personal Workspace context must be visually distinct to avoid accidental data leakage.

---

## Build Plan for a Backend-Compatible Site Walk V1

### Prompt estimate and working rhythm

Estimated build size: **18 prompt waves total**: Prompt 0 preflight, Prompts 1–15 implementation, and Prompts 16–17 hardening/scale readiness.

Estimated elapsed work time if prompts are run back-to-back with review between each: **5–8 focused workdays** for a functional V1, assuming no major third-party credential blocker. A safer calendar estimate with outside-AI review after each prompt is **1–2 weeks**. Full enterprise-scale load validation and App Store/PWA packaging hardening is a separate **1–2 week** track after the core workflows are functional.

Each prompt should end with:
1. What changed.
2. Files touched.
3. Backend tables/API routes used.
4. Smoke tests run and expected results.
5. Known risks or follow-up.
6. A short outside-AI review checklist.

### Prompt execution and audit ledger

This table is the audit record. After each prompt wave is completed, update its status to `Complete`, add the commit hash, and replace the pending summary with exactly what changed, what was validated, and what remains.

The detailed sections below are the executable prompt texts. When a prompt starts, use that section as the instruction block. When it ends, update this ledger before moving to the next prompt.

| Prompt | Status | Commit | Execution prompt | Completion summary / audit response |
|---|---|---|---|---|
| 0 | Complete | `1c3d77c` | Preflight and stale-code reconciliation against current backend contracts. | Split Site Walk shared contracts into focused type modules plus live-schema constants, updated session/item/deliverable/pin payloads to match nullable project sessions, offline sync fields, expanded deliverable output fields, Master Plan Room sheets, and draft pins. Updated Site Walk APIs to use the shared constants for deliverable types/statuses/output modes, ad-hoc session creation, offline item fields, `plan_sheet_id`, and draft pins. Verified no active imports from `app/site-walk/_legacy_v1/`, changed-file diagnostics passed, `npm run typecheck` passed, and file-size guard only reports pre-existing oversized files outside this Prompt 0 change. |
| 1 | Complete | `c52d2f2` | App shell, route scaffold, and mandatory empty Act 2 component scaffolding. | Created the active `/site-walk` module layout and landing page, Act 1/2/3 route-group scaffold, `/site-walk/capture` thin composition route, and required modular capture placeholders. Updated Site Walk segmented navigation for the new routes and App Store mode, and removed the stale duplicate route at `app/(apps)/site-walk/page.tsx`. Validated with changed-file diagnostics, `npm run typecheck`, and `npm run build`; file-size guard still reports pre-existing oversized files outside this Prompt 1 scaffold. |
| 2 | Complete | `e46be46` | Profit-margin metering engine for storage, AI, exports, messaging, and realtime usage. | Added isolated `lib/site-walk/metering.ts` gatekeeper using `resolveModularEntitlements` from `lib/entitlements.ts` to resolve Site Walk Basic/Pro caps, enforce 5GB/25GB storage and 300/1,000 AI credits, return typed allow/block responses, and record usage through `record_site_walk_usage()` with a logged direct-insert fallback. Integrated storage checks into the Site Walk upload presign route, storage usage recording into item activation, and AI credit checks/usage recording into note formatting plus both transcription routes. Validated changed-file diagnostics, `git diff --check`, and `npm run typecheck`; file-size guard still reports only pre-existing oversized files outside Prompt 2. |
| 3 | Complete | `1958da1` | Act 1 company identity, contacts, and project setup. | Replaced the setup scaffold with a server-loaded Act 1 workflow that reads org brand settings, active projects, contacts, first-project report defaults, and canonical tier context. Added modular `_components/` for company identity, project setup, stakeholder picking, deliverable defaults, shared setup types, and client orchestration; all files remain under 300 lines. Saves use existing branding, project, contacts/stakeholder, and report-default routes, and each save path performs DB/API readback before updating UI state. Validated changed-file diagnostics, `npm run typecheck`, `git diff --check`, and the file-size guard, which still reports only pre-existing oversized files outside Prompt 3. |
| 4 | Complete | `ffb3799` | Master Plan Room. | Replaced the placeholder plans route with a server-loaded Master Plan Room and modular `_components/` for `PlanUploader`, `PlanSetList`, `PlanSheetGrid`, client orchestration, and shared plan-room types; all Prompt 4 files remain under 300 lines. Added project selection, SlateDrop-backed PDF upload into the `Site Walk Files / Plans` folder convention, visible `Uploading...`, `Processing Sheets...`, and `Complete` states, project-level plan-set/sheet readback, and a sheet image redirect route for future thumbnails. Added `/api/site-walk/plan-sets` to read/write `site_walk_plan_sets` and `site_walk_plan_sheets` from completed SlateDrop uploads. Validated changed-file diagnostics, `npm run typecheck`, `git diff --check`, and the file-size guard, which still reports only pre-existing oversized files outside Prompt 4. |
| 5 | Complete | `e1ef0c6` | Session creation and active walk shell. | Added idempotent session creation with server-generated fallback `client_session_id`, project-bound validation, ad-hoc support, `in_progress` start state, and sync timestamps. Wired `/site-walk` Start Walk Now and Create Field Project triggers to create real sessions and route to `/site-walk/capture?session=...`. Replaced the capture placeholder header with a server-loaded active walk shell wrapped in a modular `SiteWalkSessionProvider`, plus `WalkHeader`, `SyncStatusBadge`, and `SessionExitModal`; safe exit leaves the walk active and End Walk patches the session to completed. Guarded scope to shell/session initialization only; camera and plan markup remain placeholders for Prompts 6–7. Validated changed-file diagnostics, `npm run typecheck`, `git diff --check`, and the file-size guard, which still reports only pre-existing oversized files outside Prompt 5. |
| 6 | Complete | `17c35cc` | Capture engine: photo/upload/voice/text. | Replaced the camera placeholder with a native mobile-friendly capture surface: 44px+ Take Photo and Upload from Device buttons using `accept="image/*"` and `capture="environment"`, plus a large dictation-friendly textarea for text and voice/dictation notes. Added `useCaptureUpload()` to gather timestamp/GPS/weather metadata, request metered Site Walk presigned URLs with `fileSizeBytes`, upload blobs, and create `site_walk_items` records tied to the active session. Updated the upload route to keep Prompt 2 storage metering before presign and to route project-bound captures into the SlateDrop `Site Walk Files / Photos` folder convention with an ad-hoc storage fallback. Validated changed-file diagnostics, `npm run typecheck`, `git diff --check`, and the file-size guard, which still reports only pre-existing oversized files outside Prompt 6. |
| 7 | Complete | `9e571ec`, hotfixes `e20aa7b`, `b7af818`, `5b8cfa9`, `c2be1c4` | Plan canvas, long-press pins, and editable markup. | Hotfixed the Site Walk module shell by making `/site-walk` resilient to project-list load failures, replacing direct browser UUID calls with a guarded client session ID fallback, and removing user-facing Act labels from active Site Walk pages. Follow-up Code Red hotfix deferred plan/capture browser-only behavior until client mount, guarded `navigator.vibrate`, made `/site-walk/capture` tolerate missing/invalid sessions with a safe empty state, stopped rendering the plan canvas/markup toolbar for photos-only walks, moved `CameraViewfinder`, `PlanViewer`, and `UnifiedVectorToolbar` behind a client-only island using `next/dynamic` with `ssr: false`, added a deeper no-SSR `CaptureShell` boundary, and fixed the root `/site-walk` Server Component crash by replacing function/component icon props passed into `StartWalkCardButton` with serializable icon keys. Start Walk opens an `Attach a Floor Plan?` modal with Select Plan vs Skip - Photos Only choices; photos-only routes directly to capture with `plan=skip`. Mobile capture shows large Take Photo and Camera Roll buttons; desktop shows a prominent Drag & Drop Photos Here zone. Validated changed-file diagnostics, route browser smoke tests, `npm run typecheck`, `npm run build`, `git diff --check`, and the file-size guard, which still reports only pre-existing oversized files. |
| 8 | Complete | `84e0483` | Classification, assignment, notes, and item management. | Replaced the capture data placeholder with a mobile bottom-sheet item drawer that slides up after photo/note capture or plan-pin creation, includes title, classification, priority, status, project assignee, and iOS/Android dictation-optimized notes, and uses `dvh`/safe-area/focus padding to keep the keyboard from covering text entry. Added filtered item list management for the active session, project assignee loading from project members plus matched stakeholders, debounced autosave to `site_walk_items`, and an AI note formatter button that calls the Site Walk notes format route through the Prompt 2 metering engine before provider processing and shows upgrade/top-up UI on 402 credit exhaustion. Validated changed-file diagnostics, `npm run typecheck`, `git diff --check`, and file-size guard; the guard still reports only known pre-existing oversized files. |
| 9 | Complete | `9e1676a`, UX hotfixes `922f1db`, `5788313`, `c52bdb2`, `7aaaa98`, `977e525` | Offline queue and conflict handling. | Added an IndexedDB data-only offline engine with separate `offline_mutations` and `offline_blobs` stores, local client IDs, queued JSON mutations, queued media blobs, and a client replay manager that listens for `online`, polls while active, replays mutations sequentially, presigns/uploads queued media through the metered Site Walk upload route, clears synced blobs, and surfaces pending/failed state. Updated photo/note capture, plan-pin creation, and item autosave to queue instantly when offline or when network/storage calls fail, optimistically update local React state, and preserve idempotency with `client_item_id`/`client_mutation_id`; the item POST route now returns existing rows for replay retries. Follow-up UX hotfixes create a local object URL immediately after photo selection, open the item drawer with a local draft item, render the photo in a markup canvas, keep the vector toolbar available for photo-only walks, replace duplicate landing-page quick-capture controls with a compact app-shell launch grid, remove marketing copy plus redundant Site Walk topbar/section nav on the app home, reduce home actions to Quick Capture, Project, and Site Walk SlateDrop, add a Site Walk-specific SlateDrop project picker, define Photos/Notes/Data/Plans/Deliverables folder expectations, open the mobile camera or desktop file picker directly from the first tap, persist the selected file through memory + IndexedDB launch handoff, remove the non-interactive Camera/Plan selector from capture, add arrow/color markup tools, stop using file names as default item titles, remember the last entered title for repeated captures, let plan-pin photo actions launch the camera, add due date and dedicated dictation controls, and preserve the preview through background upload/offline queue reconciliation. No service-worker HTML/CSS/JS caching was added. Validated changed-file diagnostics, `npm run typecheck`, `git diff --check`, and file-size guard; the guard still reports only known pre-existing oversized files. |
| 10A | Complete | `4783645`, `2ab7884`, `58bd5bf`, setup-workbook commit | Site Walk UI Foundation. | Paused Prompt 10 to ship the UI foundation first: added reusable shared `PagedWorkspace` primitives; made `/site-walk/capture` full-bleed in the global `AppShell`; replaced the old capture grid/bottom-sheet primary layout with a zero-scroll two-step Visual/Data flow; preserved native camera/file input, object URL preview, upload/offline queue, autosave, and AI metering paths; added an angle carousel and visual-only markup surface; added Location-first workflow state with current location persistence, auto-title preview, carry-forward classification/priority/status/assignee, `Save & New Item Same Location`, and `Move to New Location`; and converted Act 1 Setup into a paged workbook with Project, Company/Branding, Plans & Docs, Team, Deliverables, and Project Controls sections. Branding now supports file-based logo/signature upload via the existing org branding asset route instead of URL-only entry. |
| 10B | Complete | Prompt 10B polish commit | Capture Polish & Advanced Tools. | Replaced the temporary native location prompt with an in-app zero-scroll Location picker modal with typed entry and recent session locations; added `markup_data` to item types/API patch allowlist and wired `PhotoMarkupCanvas` changes through existing autosave/offline item patching; added a Ghost Overlay toggle in the Visual capture view for progress-photo alignment against a previous same-location image; and upgraded `/api/site-walk/notes/format` to request structured JSON smart tags (`cleanedNotes`, `suggestedClassification`, `suggestedPriority`) while preserving `formattedText` for legacy callers. The Data view now applies AI-cleaned notes plus classification/priority suggestions automatically. |
| 10C | Complete | `2fdd0f9` | Field Capture Visual Polish. | Tightened the post-photo Visual screen for actual field use: removed extra title/help chrome above the image, moved to a dark/glassy high-contrast UI with emerald/amber accents instead of navy, added a top horizontal stop strip with title overlays, kept a lower current-location angle strip, added a clear swipe/right-to-notes CTA, changed photo rendering to fill the frame with portrait/landscape detection, upgraded markup selection so existing shapes can be moved, resized, deleted, and text can be typed inline, and added long-press photo attachment pins. Attachment pins upload common image/PDF/office/text files through the Site Walk upload path, finalize them through SlateDrop completion, cap each pin at four files and 25MB/file, store labels/notes/file ids in item metadata, and show removable pinned-file chips below the angle strip. |
| 10D | Complete | `67b2a50` | Branded capture controls and progress timeline. | Reworked the active Visual capture flow around the Slate360 dark-glass palette, but the initial pass still used an outdated Industrial Gold accent from stale design documentation. Renamed the top post-photo rail to Location Stops, changed the default photo state to pinch/zoom navigation instead of instant drawing, added an explicit Start Markup toggle, kept the markup toolbar directly below the photo only when active, removed the visual-mode Ready to capture status strip, added undo/redo controls above the photo, overlaid a narrow right-side chevron on the photo to enter Notes without forcing another angle, moved Ghost Align into the new Progress Timeline strip, and added progress-oriented classifications plus an auto-filled captured timestamp on the Data screen. |
| 10E | Complete | `fe6fc8a` | Capture rail compaction, cobalt palette correction, and zoom/upload fixes. | Removed the redundant top messaging/Notes button so the Location Stops rail is first on screen; moved Back plus undo/redo into the top rail; made saved thumbnails render from the item image endpoint; added blank outlined next-stop/progress placeholders and scroll-edge arrows; reformatted Progress as a matching horizontal rail; hid Ghost Align until there is progress content; removed the post-photo upload/status message from visual mode and replaced it with a compact over-photo upload badge; corrected capture markup/pin controls from yellow/gold to current Slate360 cobalt; improved pinch/wheel zoom and pan before Start Markup; and extracted markup overlay controls so active capture files remain under the 300-line production limit. |
| 10F | Complete | `007be7a` | Marked-up sketch capture layout alignment. | Reworked `VisualCaptureView` to match the clarified marked-up JPEG: the photo/capture area is now a bounded middle section between the top stops carousel and bottom carousels instead of hosting control overlays. Added separate non-overlay rows for top controls, markup/files/add-angle buttons, and three black rectangular horizontal carousels with thumbnails for Stops, Angles, and Progress. Kept the right-side notes affordance as a bounded side rail and preserved photo markup, ghost alignment, attachment-sheet state, and capture/upload callbacks. |
| 10G | Complete | `067bcc4` | Capture carousel semantics and markup edit fix. | Converted Last Location, Angles, and Progress from button-like pills inside the scroll bars into plain section labels above the black horizontal thumbnail carousels. The Stops rail now represents thumbnails of stops already made, Angles keeps the plus action for adding more views at the current stop, and Progress keeps the plus action for future progress/before-after captures. Removed the redundant plus button between Markup and Files, changed the top Photos-only control into a dropdown for future project attachment, changed the top-right control to Next, and made newly drawn markup shapes immediately selected so users can move, resize, edit text, or delete them after drawing. |
| 10H | Complete | `a917bc9` | Angular full-width capture rails. | Made the Stops, Angles, and Progress rails span the full screen width with square/angular black translucent containers, stronger section outlines, and square thumbnail buttons. Removed the `Next` placeholders from all three rails and replaced remaining placeholder behavior with Add actions only. Thumbnail names are hidden by default; first tap reveals the stop/photo name, and the next tap opens/selects the thumbnail so users do not mistake labels for separate controls. |
| 10I | Complete | `65edc5f` | Contained rails and capture-order correction. | Contained the three angular rails inside the phone viewport with side margins and scroll-edge gradient shading so users can see the rail boundaries and understand there is more content to swipe. Moved the Angles rail directly under the bounded capture image, then placed Markup/Files below Angles and above Progress/Before & After as requested. |
| 10J | Complete | `0784234` | Progress collapse and canvas gesture isolation. | Tightened the contained rail wrapper with stronger borders and edge fades, made Progress/Before & After collapsible with safe-area bottom padding for rounded phone screens, and added a `data-disable-workspace-swipe` opt-out so `PhotoMarkupCanvas` pinch/zoom/pan/long-press gestures no longer trigger the parent Visual/Data page swipe. |
| 10K | Complete | `93ca444` | Mobile capture stability fix. | Stopped the phone capture canvas from re-saving/resetting during parent rerenders by emitting markup only on local shape changes and only resetting local canvas state when the displayed image changes. Preserved the active blob preview while upload reconciliation swaps the optimistic local item to the saved server item, and disabled swipe paging for the capture task mode so Visual/Data movement uses explicit Next/Back controls instead of accidental gestures. |
| 10L | Complete | `9614939` | Capture notes affordance overlay. | Removed the dedicated black right-side notes/swipe bar from the main capture area and changed the chevron into a small translucent overlay button on top of the photo, preserving the full-width capture canvas while keeping the explicit Next/details affordance visible. |
| 10M | Complete | `7d7ce7b` | Pinned files and optional next photo flow. | Fixed pinned-file visibility by auto-saving a pin after file upload, updating pin markers locally before the server patch completes, rendering a larger blue paperclip marker, and applying the same canvas transform to pins so they stay on the selected photo point while zoomed/panned. Fixed active-photo drops by merging initial server item loads with optimistic captures instead of replacing local items. Updated the Data page copy/actions so one-photo workflows can choose Done with this photo without being pushed into another angle/same-location capture. |
| 10N | Complete | `9cd60f3` | Capture flow review and Slate360 polish. | Preserved capture image previews across Visual/Data navigation by keeping local preview object URLs available until server images are ready. Added pinned-file preview chips and an image/iframe modal in the attachments sheet. Reworked the Data page into a dark Slate360/cobalt photo-details view with a read-only reference thumbnail, standard construction classifications, `Save & Next Location`, `Add Angle`, and `Save & Finish Walk`. Replaced `/site-walk/walks/[sessionId]` with a contained mobile-first Walk Summary list and deliverables CTA; tapping a capture reopens it in the capture shell for editing. |
| 10O | Complete | `dc465a2` | Markup canvas mobile UX fixes. | Suppressed iOS selection/callouts and native touch gestures on the canvas root so long-press pin placement does not trigger the iOS magnifier/copy UI. Made pinch and wheel zoom update the shared canvas transform even in markup mode. Kept the freehand pencil active between strokes, added bounding-box hit detection for selecting/moving shapes, rendered selected shape bounds with cyan handles, and removed the redundant Text button from the selected-shape popup while keeping second-tap text editing. |
| 10P | Complete | `0de234b` | Capture control spacing and attachment marker refinement. | Made saved photo attachment pins smaller paperclip markers and added a tap-to-preview popover that opens an edit panel for marker name/note changes. Moved Markup and Files directly under the capture image, moved Additional Angles below those controls, and combined Additional Angles with Progress/Before & After into a single toggled horizontal rail that defaults to Additional Angles. Updated top undo/redo controls to include text labels next to the icons. |
| 10Q | Complete | `6b138dd` | Draggable attachment markers and thumbnail previews. | Added hold-and-drag repositioning for saved photo attachment markers, committing the new pin coordinates on release. Reworked the marker popover into a compact split layout with a small attached-file thumbnail that opens a larger preview modal, while the `Tap to edit` side opens marker name/note editing. Renamed the direct capture attachment control from Files to Attached. |
| 10R | Complete | `c7ed2e5` | Attachment drag and markup edit follow-up. | Replaced delayed paperclip long-press drag with immediate touch-drag movement after a small threshold, moved the marker preview tile to the right side with an always-visible `View` fallback, removed the detached selected-shape plus/minus/delete popup, added toolbar-based selected markup color/line-width/delete controls, and made the cyan selected-shape handles draggable for resize/reshape. |
| 10S | Complete | `dcff461` | Centered attachment panels and contained preview modal. | Centered the new attachment and edit attachment panels inside the capture area so action buttons are no longer cut off by the lower markup controls. Reduced the attached-file preview modal size, added a persistent top-right close button, and added pinch/drag zoom for image previews. |
| 10T | Complete | `2172899` | Preview event isolation and attachment fallback. | Further contained marker file previews by shrinking the modal, making the close button a prominent cyan control, and stopping preview pointer/wheel events from bubbling into the capture canvas so pinch gestures zoom the preview instead of the photo behind it. Added an item-level attachment pin resolver so the capture canvas and Attached sheet read persisted `photo_attachment_pins` when metadata is missing or stale. |
| 10U | Complete | `03b492f` | Preview crash hardening and faster capture preview. | Removed pointer capture from the marker file preview zoom handlers to avoid mobile DOM pointer-capture errors, made the preview card fit as a fixed small contained card within the capture area, capped image zoom at 4x, and kept all preview gestures isolated from the canvas behind it. Made new camera captures feel snappier by showing an immediate object URL from the original file before image compression/upload continues in the background. |
| 10V | Complete | `1a8e6a9` | Planned-walk strategy and start choice. | Updated the Act 2 strategy to make planned walks, Master Plan Room sheets, plan layering, optional background metadata, and restricted collaborator shells the source of truth. Updated org role docs for trapped collaborator shells plus restricted Personal Workspace. Added a `Walk with Plans` vs `Camera Only` capture start choice when plan sheets exist, a Plan/Camera mode toggle, PlanViewer primary mode with camera action, active-session pin filtering, and a crosshair `Drop Pin` action. |
| 10W | Complete | `1d0ebb8` | Cross-app ecosystem synergy audit and docs. | Audited Site Walk, 360 Tours, deliverable, SlateDrop, and entitlement surfaces for cross-app compatibility. Confirmed deliverable assets/scenes/hotspots already support `photo_360`, `tour_360`, and 360 yaw/pitch hotspots; confirmed 360 Tours has separate equirectangular upload/project tour APIs under `withAppAuth("tour_builder")`; confirmed `resolveModularEntitlements()` exposes `synergy.tours360InSiteWalk` and `synergy.designInSiteWalk`; and documented the gap that Site Walk lacks a first-class bridge route and `site_walk_items.item_type` does not yet include `photo_360`. Updated master/workflow docs to require entitlement-gated Site Walk + 360 Tours + Design Studio integration with no dead App Store surfaces. |
| 10X | Complete | `dd61886` | Generalist data, leadership oversight, collaborator deputization, and App Store compliance docs. | Audited the current Operations Console/access gate and org role model, then updated the master docs to require customizable Tags / Departments / Categories, organization-level Global Command Center access for `owner` / `admin`, deputized collaborator shells plus subscriber-to-subscriber org switching, and App Store-safe launch copy/reviewer account rules. |
| 10 | Complete | `9bc5868` | Field-office board and realtime support view. | Added a desktop-optimized `/site-walk/walks` board for in-progress walks with walk name, project, person walking, elapsed time, and captured item count. Added `/site-walk/walks/[sessionId]` live command center with split-pane layout: left feed grouped by Location → Item and right detail pane with photo preview, persisted vector markup overlay, AI-cleaned notes, classification, priority, status, and sync state. Added a scoped `useRealtimeWalk()` hook that subscribes to `postgres_changes` for `site_walk_items` filtered by `session_id=eq.${sessionId}` and `site_walk_sessions` filtered by `id=eq.${sessionId}`; no org-wide firehose channel is used. New realtime inserts animate into the feed and auto-select for office review. |
| 11 | Not started | — | Collaborator and assigned-work loop. | Pending. |
| 12 | Not started | — | Act 3 deliverable builder: hosted outputs first. | Pending. |
| 13 | Not started | — | Public viewer, client responses, and analytics. | Pending. |
| 14 | Not started | — | PDF, inline email, email snapshot, and send log. | Pending. |
| 15 | Not started | — | SlateDrop and Coordination polish. | Pending. |
| 16 | Not started | — | End-to-end QA, button audit, and mobile smoke. | Pending. |
| 17 | Not started | — | Scale, load, and reliability hardening. | Pending. |

### Prompt 0 — Preflight and stale-code reconciliation

Goal: prepare the codebase so the build starts from accurate contracts.

Tasks:
- Update `lib/types/site-walk.ts` and related types to match the live backend fields and expanded enums.
- Update stale API validation constants for deliverable types/statuses, session ad-hoc creation, and draft pins.
- Confirm `/site-walk` active route tree is clean and `_legacy_v1` is reference only.
- Confirm no active UI imports legacy paths that should remain archived.

Acceptance:
- TypeScript contracts match current migrations.
- Existing API routes do not reject backend-valid Site Walk deliverables/statuses.
- No dead route is introduced.

### Prompt 1 — Site Walk app shell and route scaffold

Goal: make `/site-walk` a functional module inside Slate360, not a 404 or a separate app.

Tasks:
- Build clean route-group scaffold for Act 1, Act 2, and Act 3 while preserving user-friendly URLs.
- Use shared Slate360 shell, mobile bottom nav, entitlement/access rules, and real empty states.
- Add a functional landing page with Start Walk, Create Field Project, Open Active Walks, Master Plan Room, Deliverables, and Assigned Work paths.
- In App Store mode, hide incomplete actions rather than showing disabled placeholders.
- Create the Act 2 capture route as a thin composition file at `app/site-walk/(act-2-inputs)/capture/page.tsx`.
- Before writing capture logic, create empty modular placeholder components under `components/site-walk/capture/`: `DualModeToggle.tsx`, `CameraViewfinder.tsx`, `PlanViewer.tsx`, `UnifiedVectorToolbar.tsx`, `CaptureBottomSheet.tsx`, and `SyncQueueIndicator.tsx`.
- The route page must import and compose these components. No capture page/component may exceed 300 lines, and no later prompt may bypass these placeholders by moving logic back into the page.
- Keep `/dashboard` global-shell actions separate from `/site-walk` module actions: global Dashboard owns Programmable Quick Start, Open SlateDrop, and Search Everything; Site Walk owns Recent Walks, Master Plan Room, Active Walks, Capture, Deliverables, and Assigned Work.

Acceptance:
- `/site-walk` loads without auth/session crashes.
- All visible buttons navigate to implemented routes or open functional modals.
- Free-collaborator path defaults toward Assigned Work, not project creation.
- Required Act 2 placeholder components exist, are imported by the route scaffold, and are ready for later logic.

### Prompt 2 — Profit-margin metering engine

Goal: protect 60%+ margin before upload, AI, export, messaging, and realtime usage scale.

Tasks:
- Build a reusable Site Walk metering guard/service that checks entitlements from `lib/entitlements.ts`, reads current usage from `site_walk_usage_monthly`, records usage through `record_site_walk_usage()`, and returns a typed allow/block/top-up-needed result.
- Enforce storage limits before R2/S3 presigned upload URLs are issued. Standard planning cap: 5GB; Pro/Business planning cap: 25GB; Enterprise uses negotiated/custom caps.
- Enforce AI credit limits before AI note formatting, transcription, summary generation, or future AI extraction. Standard planning cap: 300 credits; Pro/Business planning cap: 1,000 credits; Enterprise uses negotiated/custom caps.
- Integrate the guard into Site Walk upload presign routes, AI formatting/transcription routes, PDF/export generation, email/SMS send routes when present, and realtime-minute recording where practical.
- Return user-facing upgrade/top-up responses when caps are exceeded. Do not silently fail and do not perform expensive work before the guard allows it.

Acceptance:
- A user over storage cap cannot receive a presigned upload URL for a new Site Walk file.
- A user over AI cap cannot run AI note/transcription/summary work.
- Successful metered events are recorded in `site_walk_usage_events` and visible through monthly usage rollups.
- The metering guard is route-level/server-side and cannot be bypassed by hiding UI buttons.

### Prompt 3 — Act 1 company identity, contacts, and project setup

Goal: implement the setup foundations needed before a walk.

Tasks:
- Wire branding/settings UI to existing org branding endpoints and `organizations.brand_settings`.
- Use existing contacts and project/team endpoints for stakeholders; if typeahead is missing, create a focused search endpoint.
- Build project-bound walk setup using existing `projects` fields plus `metadata/report_defaults` where needed.
- Keep canonical tiers from `getEntitlements()`; do not hardcode obsolete tiers.

Acceptance:
- User can configure branding basics.
- User can select/create project context and stakeholders.
- New setup data is read back from the DB after save, not trusted only in local state.

### Prompt 4 — Master Plan Room

Goal: wire project-level plan upload/list/select against the new plan-room schema.

Tasks:
- Build plan-set upload and list UI using SlateDrop-reserved files.
- Store project-level plan sets/sheets in `site_walk_plan_sets` and `site_walk_plan_sheets`.
- Attach selected plan sheets to a session through `site_walk_session_plan_sheets`.
- Preserve legacy plan viewer compatibility where needed.

Acceptance:
- Project can show a reusable Master Plan Room.
- Session can select a plan sheet before capture.
- Plan image route returns a browser-loadable signed URL.

### Prompt 5 — Session creation and active walk shell

Goal: start and resume walks reliably.

Tasks:
- Support both ad-hoc `Start Walk Now` and project-bound session creation.
- Generate `client_session_id` for offline/idempotency.
- Mount `SiteWalkSessionProvider` around active capture routes.
- Show sync/online/offline, active user/session status, and safe exit/end-session controls.

Acceptance:
- User can start a walk with or without a project.
- Session can be resumed from Recent Work.
- End Session updates DB status and records activity.

### Prompt 6 — Capture engine: photo/upload/voice/text

Goal: make field capture work end-to-end.

Tasks:
- Camera/upload path uses presigned upload, creates `site_walk_items`, bridges to SlateDrop, and refreshes item list.
- Text/voice notes create items and support transcription when configured.
- Capture metadata stores GPS/weather/device where available.
- Upload progress and errors are visible.

Acceptance:
- User can create photo, upload, voice, and text items.
- Captures appear in active walk item list and project files.
- Failed upload does not lose the draft.

### Prompt 7 — Plan canvas, long-press pins, and editable markup

Goal: make the plan-first workflow real.

Tasks:
- Build canvas component with zoom/pan/layers and mobile gestures.
- Wire long-press to create draft pin + item flow using `plan_sheet_id` when available.
- Store editable vector markup in `markup_data` with undo/redo.
- Broadcast cursor/pin drag during interaction and persist only on release/save.

Acceptance:
- User can drop/move pins on a plan.
- Markup remains editable after save/reload.
- Another active user sees pin/item updates in realtime.

### Prompt 8 — Classification, assignment, notes, and item management

Goal: turn raw captures into actionable field records.

Tasks:
- Build bottom-sheet classification form with title, status, priority, location, assignee, due date, cost/manpower, tags/trade/category, and notes.
- Autosave patches items incrementally with visible save state.
- Build item list with search/filter/bulk status/assignment actions.
- Notify assignees and create activity/read records where applicable.

Acceptance:
- Office user can see assigned/critical/open work immediately.
- Bulk operations are capped and safe.
- No buttons are decorative.

### Prompt 9 — Offline queue and conflict handling

Goal: survive jobsite connectivity loss.

Tasks:
- Persist in-flight blobs and form state in IndexedDB.
- Queue create/update/delete/upload-complete mutations with client IDs.
- Replay in order when online.
- Surface conflict/failed states and allow retry/discard.

Acceptance:
- Airplane-mode capture creates local drafts.
- Returning online syncs without duplicate items.
- User can see exactly what is pending or failed.

### Prompt 10 — Field-office board and realtime support view

Goal: let coworkers and office staff see field progress and support strategically.

Tasks:
- Build active sessions board using indexed project/session queries.
- Subscribe only to relevant project/session channels.
- Show open items, critical items, active assignments, latest comments, and sync health.
- Add drill-down from office board to item/session details.

Acceptance:
- Office user can watch active walk progress without refresh.
- Field user changes appear on the office board quickly.
- Board queries are paginated/limited and do not load every org row.

### Prompt 11 — Collaborator and assigned-work loop

Goal: make coworker/outside collaborator participation usable without full subscriber UI.

Tasks:
- Build assigned-work entry route for project members/collaborators.
- Restrict collaborator UI to permitted tasks/items.
- Allow before/after proof, note, photo/video/voice upload, status submit, and comments.
- Route submitted files to SlateDrop and notify subscriber/GC.
- If the collaborator already has a paid Slate360 workspace, preserve their own organization and expose the inviting organization/project through the header context switcher.
- If the collaborator has no paid subscription, route them into a restricted deputized shell that can execute assigned work but cannot create full projects, plan rooms, or deliverables.

Acceptance:
- Collaborator can complete assigned proof-of-work on mobile.
- Collaborator cannot create unauthorized projects/deliverables.
- Subscriber sees submitted work in realtime/notifications.
- Paid subscriber collaborators can switch back to their own organization without losing the invited project context.

### Prompt 12 — Act 3 deliverable builder: hosted outputs first

Goal: create deliverables from captured items using the normalized backend.

Tasks:
- Create draft deliverables with full valid type/status lists.
- Build block/asset/scene composition UI from selected items, files, plan sheets, 360 assets, and model references.
- Gate 360 asset/tour pickers behind Site Walk + 360 Tours entitlement (`synergy.tours360InSiteWalk`), and gate model/design references behind Site Walk + Design Studio entitlement (`synergy.designInSiteWalk`).
- Reference existing 360 Tour scenes through a narrow bridge before copying media; preserve source app/table/id, project, org, and referenced-vs-copied mode.
- Store assets in `site_walk_deliverable_assets`, scenes in `site_walk_deliverable_scenes`, and hotspots in `site_walk_deliverable_hotspots`.
- Keep `content` JSON as backwards-compatible summary only, not the source of all interaction state.

Acceptance:
- User can create a hosted preview/client-review deliverable from a walk.
- Preview has thumbnails, arrows/navigation, overlays/hotspots, and expandable response sidebar.
- 360/model items can be referenced without Site Walk becoming the 360/model authoring app, and the references are invisible or upgrade-gated when the workspace lacks the paired app entitlement.

### Prompt 13 — Public viewer, client responses, and analytics

Goal: make shared links interactive and auditable.

Tasks:
- Upgrade public token loader to normalized assets/scenes/hotspots/threads/responses.
- Support token roles: view, download, comment, respond, approve.
- Write client comments/questions/approvals into `site_walk_deliverable_threads` and `site_walk_deliverable_responses`.
- Record views/read receipts/usage.

Acceptance:
- External recipient can open a hosted link, navigate the deliverable, comment/respond/approve as permitted.
- Owner sees responses and analytics in-app.
- Expired/revoked/max-view links fail safely.

### Prompt 14 — PDF, inline email, email snapshot, and send log

Goal: complete static/export send modes.

Tasks:
- Keep link, inline images, and PDF attachment modes working.
- Add immutable email snapshot generation when needed.
- Write every send attempt/result into `site_walk_deliverable_sends`.
- Bridge exported PDFs/snapshots to SlateDrop and record usage.

Acceptance:
- Recipient can receive a PDF attachment email.
- Recipient can receive an inline-image/body email without needing an attachment.
- Owner can see send history and failures.

### Prompt 15 — SlateDrop and Coordination polish

Goal: make Site Walk feel integrated with the broader product.

Tasks:
- Add a Site Walk/Field Reports folder convention or virtual folder view in project files.
- Confirm captured photos, plans, voice notes, PDFs, snapshots, and deliverable assets appear in predictable project file locations.
- Route comments/responses/action-needed items into Coordination/My Work surfaces.
- Ensure delete/revoke behaviors do not leave dangling references.

Acceptance:
- Users browsing project files can find Site Walk outputs without knowing internal S3 paths.
- Coordination surfaces show actionable Site Walk work.

### Prompt 16 — End-to-end QA, button audit, and mobile smoke

Goal: remove broken paths before App Store / Version 1 launch.

Tasks:
- Click every visible Site Walk button in desktop and mobile states.
- Validate empty/error/loading states.
- Run focused Playwright route and workflow smokes.
- Run `npm run typecheck`, targeted errors, and file-size guard.
- Confirm App Store mode hides incomplete paths.

Acceptance:
- A real user can complete: setup → start walk → capture → classify/assign → office sees progress → build/share deliverable → recipient responds.
- No visible button is dead or placeholder-only.

### Prompt 17 — Scale, load, and reliability hardening

Goal: prove the architecture can grow without avoidable crashes.

Tasks:
- Add seed/load scripts for realistic org/project/session/item/deliverable volumes.
- Test query plans and indexes for key routes: active board, item list, deliverables, public viewer, SlateDrop folder load.
- Add pagination/cursors where any route can exceed 100 rows.
- Add realtime subscription limits: subscribe to active session/project only, unsubscribe on route change, avoid org-wide firehose channels.
- Validate RLS behavior with org owner, project member, collaborator, and anonymous token roles.

Acceptance:
- Route/API tests cover small and large datasets.
- No core endpoint depends on loading all org data into memory.
- Realtime remains scoped and recoverable.

### Scalability targets and design rules

The build should be designed for 1,000 → 10,000 → 50,000 → 100,000+ users by enforcing these rules from the start:

- Database reads must be scoped by `org_id`, `project_id`, `session_id`, or token and supported by indexes.
- Lists must paginate or cap results; dashboards should use summary endpoints/views instead of raw row floods.
- Realtime should be used for active sessions and active office boards only. No global org-wide subscription should stream every row.
- File uploads should go directly to object storage via presigned URLs; server routes should reserve/complete metadata, not proxy large files.
- Heavy rendering/export work should be bounded, queued, or chunked when it grows beyond serverless-safe limits.
- Mobile clients should keep local state bounded: visible session only, incremental item loading, thumbnails instead of originals.
- Usage events should meter storage, AI, exports, messages, and realtime minutes so margin and abuse controls are enforceable.
- Every schema/API change must keep RLS and project collaborator behavior intact.

### Required validation after each implementation prompt

- `get_errors` on changed files.
- `npm run typecheck` when TypeScript contracts, routes, hooks, or components changed.
- `bash scripts/check-file-size.sh` when app code changed; if it fails on pre-existing oversized files, note that separately and do not add new oversized files.
- Focused smoke test for the route/workflow touched.
- Confirm no visible button points to an unimplemented/dead route.
- Update this plan or the relevant context doc when the implementation changes scope.

### Information needed before or during build

I do not need external prompts to start building. I can implement the slices directly from this plan and the current backend. Helpful decisions from you before the first build prompt:

1. Confirm whether V1 should ship with the full plan canvas in Prompt 6 or allow camera-first capture before plan canvas is complete.
2. Confirm launch-critical deliverable types: recommended first set is `field_report`, `photo_log`, `punchlist`, `client_review`, and `cinematic_presentation`.
3. Confirm whether SMS send is required for V1 or can remain Phase 2 until Twilio/env setup is approved.
4. Confirm the wording for collaborator UI: `My Work`, `Assigned Tasks`, or `Tasks & To-Dos`.
5. Provide any required brand/design approval for the Site Walk capture screen if you want a specific v0 visual direction; otherwise I can build using the existing Slate360 design system.

---

## Open Product Decisions

- Which markup tools are mandatory for launch versus Phase 2.
- Whether proposal pricing is part of the first deliverable or a follow-up deliverable type.
- Whether collaborators can create new findings or only respond to assigned items in V1.
- Which calendar integration ships first: one-way calendar feed or Google/Microsoft two-way OAuth.
- Final marketing names for the Site Walk tiers: code should stay on canonical entitlement tiers while product copy may use Standard / Pro labels.
- Exact cut line between V1 and Phase 2 for realtime multiplayer, offline queue depth, Cinematic Mode interactivity, and leadership analytics.
