# Site Walk V1 — 3 Act Workflow, Layout, and Launch Plan

Last Updated: 2026-04-27
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
- Some API routes still use old validation/type lists. Update shared types in `lib/types/site-walk.ts` before building UI on top of new deliverable/session/item fields.
- `app/api/site-walk/deliverables/route.ts` currently accepts only the old deliverable types; it must accept the full backend list: `report`, `punchlist`, `photo_log`, `rfi`, `estimate`, `status_report`, `proposal`, `field_report`, `inspection_package`, `safety_report`, `proof_of_work`, `client_portal`, `kanban_board`, `cinematic_presentation`, `spreadsheet_export`, `virtual_tour`, `tour_360`, `model_viewer`, `media_gallery`, `client_review`, `custom`.
- `app/api/site-walk/deliverables/[id]/route.ts` currently accepts only the old statuses; it must accept `draft`, `in_review`, `approved`, `submitted`, `shared`, `published`, `archived`, `revoked`.
- `app/api/site-walk/deliverables/send/route.ts` already sends `link`, `inline_images`, and `pdf_attachment`; it must also write rows into `site_walk_deliverable_sends` and support `email_snapshot` when the UI produces one.
- `lib/site-walk/load-deliverable.ts` currently normalizes public viewer items from `site_walk_deliverables.content`; it should be upgraded to load normalized `site_walk_deliverable_assets/scenes/hotspots/threads/responses` while preserving old `content` compatibility.
- `app/api/site-walk/sessions/route.ts` still requires `project_id`; it must support ad-hoc session creation using the new nullable `project_id` and `is_ad_hoc` fields.
- `app/api/site-walk/pins/route.ts` still requires `plan_id` and `item_id`; it must support `plan_sheet_id` and draft pins where `item_id` is not available yet.
- `app/api/site-walk/upload/route.ts` currently routes photo/file captures to the project `Photos` folder. That is acceptable for launch, but the build should add clear folder conventions for Site Walk sessions and deliverables when SlateDrop provisioning is updated.

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
- Project contacts: client, owner, PM, subcontractor, inspector, internal team.
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
2. Modal asks `Attach a Floor Plan?`.
3. User selects a sheet from Master Plan Room, uploads/selects a plan, or skips to Camera Only.
4. If a plan is selected, the first field action is long-press pin placement on the sheet; haptic feedback drops a pin and opens quick actions: `Take Photo`, `Upload from Device`, `Add Note`, `Assign Task`.

### Taking or Uploading a Picture

Flow:
1. User taps Camera or Upload.
2. Image opens in a review screen.
3. User can accept, retake, upload another, or mark up.
4. Background metadata is captured: timestamp, GPS if allowed, device, optional weather.
5. The original image is preserved; markups are stored separately as editable vector data.

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
- Layer toggles: clean base plan, current walk pins, historical pins, resolved items, assigned-to-me.
- Multi-page PDF plan navigation uses a sheet-index bottom sheet.
- Pinch-to-zoom and pan are first-class mobile gestures.

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

### Collaborator / Subcontractor Loop

Free Collaborators do not see the full subscriber creation surface. Their default Site Walk path is:
1. Open Slate360 and select the subscriber/GC context in the header switcher.
2. Land on Assigned Tasks.
3. Open a task/pin such as `Document electrical rough-in`.
4. Route directly into Act 2 capture for that item.
5. Submit before/after proof, notes, and status.
6. Notify the subscriber/GC through Coordination Hub and route files into SlateDrop.

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
| 0 | Not started | — | Preflight and stale-code reconciliation against current backend contracts. | Pending. |
| 1 | Not started | — | App shell, route scaffold, and mandatory empty Act 2 component scaffolding. | Pending. |
| 2 | Not started | — | Profit-margin metering engine for storage, AI, exports, messaging, and realtime usage. | Pending. |
| 3 | Not started | — | Act 1 company identity, contacts, and project setup. | Pending. |
| 4 | Not started | — | Master Plan Room. | Pending. |
| 5 | Not started | — | Session creation and active walk shell. | Pending. |
| 6 | Not started | — | Capture engine: photo/upload/voice/text. | Pending. |
| 7 | Not started | — | Plan canvas, long-press pins, and editable markup. | Pending. |
| 8 | Not started | — | Classification, assignment, notes, and item management. | Pending. |
| 9 | Not started | — | Offline queue and conflict handling. | Pending. |
| 10 | Not started | — | Field-office board and realtime support view. | Pending. |
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

Goal: make coworker/subcontractor participation usable without full subscriber UI.

Tasks:
- Build assigned-work entry route for project members/collaborators.
- Restrict collaborator UI to permitted tasks/items.
- Allow before/after proof, note, photo/video/voice upload, status submit, and comments.
- Route submitted files to SlateDrop and notify subscriber/GC.

Acceptance:
- Collaborator can complete assigned proof-of-work on mobile.
- Collaborator cannot create unauthorized projects/deliverables.
- Subscriber sees submitted work in realtime/notifications.

### Prompt 12 — Act 3 deliverable builder: hosted outputs first

Goal: create deliverables from captured items using the normalized backend.

Tasks:
- Create draft deliverables with full valid type/status lists.
- Build block/asset/scene composition UI from selected items, files, plan sheets, 360 assets, and model references.
- Store assets in `site_walk_deliverable_assets`, scenes in `site_walk_deliverable_scenes`, and hotspots in `site_walk_deliverable_hotspots`.
- Keep `content` JSON as backwards-compatible summary only, not the source of all interaction state.

Acceptance:
- User can create a hosted preview/client-review deliverable from a walk.
- Preview has thumbnails, arrows/navigation, overlays/hotspots, and expandable response sidebar.
- 360/model items can be referenced without Site Walk becoming the 360/model authoring app.

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

Goal: remove broken paths before beta.

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
