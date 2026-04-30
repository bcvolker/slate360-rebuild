# Site Walk — Master Architecture, Monetization, and Workflow Blueprint

Last Updated: 2026-04-30
Status: Authoritative strategic blueprint for the Site Walk rebuild
Scope: Slate360 Site Walk module, PWA/App Store strategy, collaborator workflow, tier gates, field capture, and non-PDF-centric deliverables

---

## 1. Prime Mandate

Site Walk is not a standalone app with a separate login, billing model, or file system. Site Walk is the first flagship field module inside the broader Slate360 ecosystem.

The product goal is to bridge field and office work in one connected loop:

1. Set up the project, people, brand, plan room, and tier-aware permissions.
2. Capture field truth from camera, plans, voice, uploads, 360 media, markups, and assignments.
3. Route that field truth into interactive deliverables, client portals, presentations, task boards, exports, and only sometimes PDFs.

PDF is a supported output, not the center of the product. The core value is a living, synced project record that can become a report, proposal, punch list, proof-of-work package, portal board, cinematic presentation, spreadsheet export, or executive update.

---

## 2. Overarching Strategy: Bridging Field and Office

### 2.1 Real-Time Multiplayer Sync

Site Walk should support real-time visibility through Supabase Realtime/Broadcast:

- Multiple users can walk the same project simultaneously.
- Pins, comments, status changes, and assignments appear across devices without a manual refresh.
- Office-side users can observe field progress as it happens.
- Realtime is additive to persistence; the database remains the source of truth.

### 2.2 Offline-First Resilience

Site Walk must be resilient on jobsites with poor signal:

- IndexedDB stores pending photos, videos, voice notes, vector markups, form fields, and status updates.
- Background sync retries silently when connectivity returns.
- Upload queue state is visible: pending, syncing, synced, failed, retrying.
- Collision handling uses `updated_at`, local revision IDs, and explicit conflict states when needed.
- The current service-worker caching layer is disabled by kill switch until a new offline strategy is tested on real mobile refresh after deployment. Offline capture should be implemented through explicit IndexedDB queues, not stale HTML/CSS/JS caching.

### 2.3 Tier-Gated Collaboration Logic

Monetization is part of the product architecture, not an afterthought.

Site Walk commercial tiers for planning:

| Tier | Example Price | Storage | AI Credits | Collaborators | Project Mode | Notes |
|---|---:|---:|---:|---:|---|---|
| Free Collaborator | $0 | 0 GB owned storage | 0 owned credits | N/A | Assigned-task responder | Can view/respond/submit only within invited scope. |
| Standard | ~$66/mo | 5 GB | 300 | 0 | Field Projects | Solo field capture and deliverables. |
| Pro / Business | ~$108/mo | 25 GB | 1,000 | 3 included | CM Projects | Collaboration, schedules, budgets, RFIs, submittals. |
| Enterprise | Custom | Custom | Custom | Custom | Organization-wide | Advanced governance, white-label, audit, admin controls. |

Implementation note: the broader Slate360 codebase currently uses platform tiers such as `trial`, `standard`, `business`, and `enterprise`. Site Walk copy may use `Pro` as a market-facing label for the Business-level Site Walk package, but code must continue to use canonical entitlement helpers from `lib/entitlements.ts` until pricing is finalized.

### 2.4 Profit-Margin Guardrails

The target business model is 60%+ gross margin:

- Cloudflare R2 should remain the preferred storage path for low/no egress exposure.
- Storage and AI credits are tier-bounded to prevent silent margin leaks.
- Free Collaborators receive no owned credits and no broad storage allocation.
- AI features must consume metered credits or run under subscriber-owned allowances.
- App Store economics assume Apple/Google Small Business Program fees around 15% while eligible; pricing should still tolerate higher review, payment, or infrastructure costs.

### 2.5 Cross-App Ecosystem Synergy (Entitlement Gated)

Site Walk must be architected as the field capture and project-context layer for the wider Slate360 ecosystem, not as a silo. Cross-app features are a premium differentiator and must only appear when the authenticated workspace has the required app entitlements.

Core rule:

- Site Walk + 360 Tours integrations require both the `punchwalk` and `tour_builder` app entitlements.
- Site Walk + Design Studio integrations require both Site Walk and Design Studio entitlements.
- The canonical resolver is `resolveModularEntitlements()` from `lib/entitlements.ts` / `lib/entitlements-modular.ts`; the existing synergy flags include `tours360InSiteWalk` and `designInSiteWalk`.
- API surfaces must continue to use `withAppAuth("punchwalk", ...)` for Site Walk routes and `withAppAuth("tour_builder", ...)` for 360 Tours routes. Any bridge route must verify both sides before exposing cross-app records.
- Under App Store mode and normal production UX, features that are not entitled must be hidden or replaced with a clear upgrade path. They must not appear as dead buttons, empty shells, or broken Coming Soon surfaces.

Backend compatibility audit as of 2026-04-30:

- Site Walk capture rows support generic metadata through `site_walk_items.metadata`, `markup_data`, `file_id`, `s3_key`, project linkage, and SlateDrop bridging, but `site_walk_items.item_type` currently accepts `photo`, `video`, `text_note`, `voice_note`, and `annotation`. Native capture rows do not yet have a first-class `photo_360` item type.
- Plan pins can link any Site Walk item through `site_walk_pins.item_id`, include project/session fields, and can use `metadata`/`markup_data` for future viewer hints. They can support 360-pinned workflows once a 360-backed item or bridge reference exists.
- Interactive deliverables are already 360-aware: `site_walk_deliverable_assets.asset_type` includes `photo_360` and `tour_360`; `site_walk_deliverable_scenes.scene_type` includes `photo_360`; hotspots support `yaw` and `pitch` for 360 navigation.
- 360 Tours has a separate `project_tours` / `tour_scenes` schema and upload API that validates equirectangular JPEG/PNG panoramas with a 2:1 aspect ratio under the `tour_builder` entitlement.
- The current codebase does not yet include an explicit Site Walk ↔ 360 Tours bridge route. The next implementation slice should add a narrow bridge that lists entitled project tours/scenes, allows selection into Site Walk plan pins/deliverables, and stores references without duplicating large media unless the user explicitly imports/copies assets.

Required product behavior:

1. Entitled users can attach existing 360 Tour scenes to Site Walk project context, plan pins, and deliverable scenes.
2. Entitled users can upload equirectangular photos through the 360 Tours flow and reference them from Site Walk without treating Site Walk as the 360 authoring app.
3. Plan pins may open a native 360 viewer when the linked item/asset is `photo_360` or `tour_360`.
4. Interactive deliverables can include plan-sheet scenes, normal photo/video scenes, 360 photo scenes, 360 tour links, and hotspots that jump between them.
5. Design Studio/model references may appear in Site Walk deliverables only when the workspace has the Design Studio synergy entitlement; otherwise Site Walk should show normal photo/report outputs only.
6. Cross-app references must retain auditability: source app, source table/id, project, org, creator, entitlement state at creation time, and whether media is referenced or copied.

### 2.6 Auditability and Leadership Oversight

The leadership layer must provide operational truth, not vanity metrics:

- Immutable status-change logs.
- Read receipts for sent deliverables and assigned tasks.
- Plan heatmaps showing issue clusters.
- Subcontractor scorecards based on time-to-resolution and rework patterns.
- Financial risk tracking tied to budget, estimate, change-order, and scope fields.
- Exportable project history for disputes, closeout, and client communication.

---

## 3. Design System Doctrine: Tail Wags the Dog

Site Walk’s field-tested capture surface sets the global trust standard for Slate360.

### 3.1 High-Contrast Field Standard

Use a glare-safe UI for field work:

- Canvas: `bg-slate-50`
- Elevated cards/forms: pure white
- Borders: `border-slate-300`
- Text: `text-slate-900`
- Touch targets: minimum 44x44px
- Important controls: bold, high-contrast, thumb-reachable

### 3.2 Global Reset Requirement

The broader app must avoid invisible text and low-contrast input failures:

- Define explicit foreground/background colors for form controls.
- Prevent dark text on dark fields and light text on white cards.
- Keep auth, app shell, dashboard, Site Walk, SlateDrop, and public forms on consistent semantic tokens.
- Treat mobile legibility as a launch blocker.

---

## 4. Slate360 App Shell Contract

### 4.1 Header

The universal app shell header should include:

- User initials/avatar menu.
- Workspace/organization switcher for subscriber and collaborator contexts.
- Accessible bug report icon.
- Prominent Share button.

### 4.2 Share Logic

The Share button should support:

- Native OS Share Sheet for AirDrop, Messages, Android Share, and installed-PWA flows.
- SlateDrop secure link creation.
- QR/SMS/email modal when native share is unavailable or insufficient.

### 4.3 Four Universal Quick Actions

Quick actions are tier-gated and context-aware:

1. Programmable Quick Start: primary cobalt action. Defaults to `Start Walk` for Site Walk users, `Create Tour` for 360 Tours users, and can be customized by subscribed users.
2. New Project: routes to Field Project setup for Standard and CM Project setup for Pro/Business.
3. Open SlateDrop: opens the universal file/document-control gateway.
4. Search Everything: command palette for projects, tasks, deliverables, contacts, and files.

Free Collaborators should see restricted versions: assigned work first, no project creation, and locked premium quick actions.

### 4.4 Three Contained Scrolling Hubs

Use a unified contained-hub UI with max height around `max-h-[250px]` and bottom fade:

1. Projects & Tasks Hub
   - Tabs: Pinned, All Active, Assigned Tasks.
   - Free Collaborators default to Assigned Tasks.
2. Recent Work & Drafts
   - Tabs: In Progress, Completed.
   - Resumes paused walks, draft deliverables, and unfinished uploads.
3. Coordination & Communications Hub
   - Tabs: My Action Items, Unread Threads.
   - Prioritizes assigned tasks, client comments, and subcontractor updates.
   - Calendar sync remains Phase 2 unless explicitly pulled forward.

---

## 5. Collaborator and Subcontractor Workflow

### 5.1 Invitation and Login

Example: an electrician is invited by a general contractor.

1. Subscriber invites the electrician to a project or specific task.
2. Electrician installs Slate360 as a PWA or opens the web app.
3. Electrician creates a free account or logs in.
4. Header workspace switcher shows the general contractor’s invited workspace/project context.
5. Access is project-scoped and permission-scoped, not broad account access.

### 5.2 Free Collaborator UI

Free Collaborators see a simplified shell:

- Assigned Tasks is the default dashboard.
- No New Project affordance.
- No billing/admin controls.
- Unsubscribed apps are locked or hidden depending on environment mode.
- They can view instructions, upload required proof, comment, and resolve within assignment scope.

### 5.3 Before/After Proof-of-Work Loop

1. Collaborator opens an assigned item such as `Document electrical rough-in`.
2. The route deep-links directly into Act 2 capture for that item/pin.
3. Collaborator takes or uploads before/after photos.
4. Collaborator adds notes, voice, or short video memo if allowed.
5. Collaborator marks status such as `complete` or `needs review`.
6. Submission syncs to SlateDrop and notifies the subscriber/GC in Coordination Hub.
7. The record becomes proof before walls are closed or work is covered.

---

## 6. PWA and App Store Strategy

### 6.1 Single Codebase

Do not create parallel app-store and web projects. Maintain one codebase with environment-driven feature visibility.

### 6.2 App Store Mode

Use a feature flag such as:

```text
NEXT_PUBLIC_APP_STORE_MODE=true
```

When true:

- Hide incomplete modules entirely.
- Remove Coming Soon buttons and placeholder sections.
- Hide unfinished upsell cards that could trigger App Store rejection.
- Show a complete Site Walk-focused Slate360 experience.

When false:

- Web users may see locked/coming-soon ecosystem hints where appropriate.

### 6.3 Apple/Google Completeness Rule

Apple Guideline 2.1 rejects incomplete apps with placeholders or dead-end buttons. App Store review mode must show only shippable paths.

### 6.4 Capacitor/TWA Strategy

If wrapped for stores:

- Use the same authenticated Slate360 web app.
- Keep native shell minimal.
- Route permissions to camera, photos, microphone, location, and share sheets.
- Do not fork business logic.

### 6.5 Legacy Cleanup

Legacy reference files should move under ignored/archive folders such as `_legacy_website_files` or route-ignored archival folders. Active App Router surfaces must not expose dead links.

---

## 7. Act 1 — Setting the Chess Board

Goal: segmented, low-friction setup based on tier and use case.

### 7.1 Global Settings and Foundational Data

All tiers should share these account-level foundations:

- Company Identity Hub: high-resolution PNG logo, brand colors, address, phone, website.
- User Profile: direct phone, title, digital signature, avatar/initials.
- Global Address Book: reusable typeahead contacts for trades, clients, inspectors, owners, and internal team.
- Deliverable defaults: terms, disclaimers, signature block, report/proposal visual style.

### 7.2 Field Project Setup — Standard Tier

Standard is the lean solo mode:

- Required: name, scope/purpose, location.
- Smart map autocomplete and optional current-location capture.
- Geofence radius for future location-aware workflows.
- Master Plan Room for plan uploads.
- Plan ingestion should convert large multi-page PDFs into mobile-optimized sheets/tiles.
- Solo Site Walk sessions, field reports, photo logs, proposals, and basic deliverables.

### 7.3 CM Project Setup — Pro/Business Tier

Pro/Business unlocks construction-management context:

- Cost-coded budgets.
- Schedule/milestones and later Gantt views.
- RFIs.
- Submittals.
- Stakeholder permission management.
- Collaborator assignments and response workflows.
- Leadership oversight and risk reporting.

### 7.4 Ad-Hoc Start

The system must support emergency capture:

- Massive `START WALK NOW` action.
- Can bypass full setup.
- Creates a temporary walk container.
- User can attach project, plan, contacts, and deliverable type later.

---

## 8. Act 2 — Inputs: Frictionless Field Capture

Goal: mobile-first, resilient, high-contrast tools for field users with gloved hands, glare, weak signal, and limited time.

### 8.1 Explicit Start Walk Flow

When the user starts a walk:

1. Show rapid modal: `Attach a Floor Plan?`
2. Options:
   - Select sheet from Master Plan Room.
   - Upload/select a plan.
   - Skip — Camera Only.
3. If a plan is selected, open plan-first mode.
4. If skipped, open camera-first mode.

### 8.2 Plan-Based Pinning Flow

1. User long-presses a location on the blueprint.
2. Haptic feedback confirms the point.
3. Numbered pin drops.
4. Quick menu appears:
   - Take Photo.
   - Upload from Device.
   - Add Note.
   - Assign Task.
5. The pin remains linked to all captures, comments, status, and deliverable blocks.

### 8.3 Camera and Upload Flow

- Native OS camera capture.
- Camera roll multi-select.
- Drag/drop on desktop/tablet where available.
- HEIC/ProRAW conversion where supported.
- Client-side image/video compression where safe.
- 360° equirectangular panorama ingest.
- Metadata extraction: EXIF timestamp, GPS, weather, device, uploader.
- Background queue shows progress without blocking continued capture.

### 8.4 Dual-Mode Interface

The main capture surface should include:

- Floating toggle: Camera / Plan.
- Items list drawer.
- Offline/sync indicator.
- Battery saver toggle.
- End walk button.
- High-contrast glare mode.

### 8.5 Unified Vector Toolbar

Markup tools are saved as editable vector JSON, never only as flattened pixels:

- Draw/freehand.
- Arrow.
- Rectangle.
- Circle/ellipse.
- Text.
- Numbered pin.
- Measurement/calibration placeholder.
- Blur/redaction.
- Before/after link.
- Attach/embed supporting image/file.

### 8.6 Oops Engine

Act 2 must include local undo/redo:

- Every vector operation is pushed to a local stack.
- Undo/redo works before and after autosave where possible.
- Autosave must persist both current vector state and operation history when needed.

### 8.7 Plan Layers and Navigation

- Clean base plan.
- Current walk pins.
- Historical pins.
- Resolved/closed items.
- Assigned-to-me view.
- Sheet index bottom sheet for multi-page PDFs.
- Pinch-to-zoom and pan on mobile.

### 8.8 Ghost Camera

Before/after workflows need alignment support:

- Overlay previous photo translucently in the viewfinder.
- User aligns current camera to prior frame.
- New capture links to original item as a resolution/progress photo.

### 8.9 Data Entry Bottom Sheet

The bottom sheet is the primary data-entry surface:

- Title.
- Classification: observation, issue, punch item, proposal opportunity, safety, progress, RFI, general note.
- Priority: low, medium, high, critical.
- Status: pending, in progress, needs review, complete, needs attention.
- Location label: floor, room, zone, area.
- Assignee: Coordination contact or project stakeholder.
- Due date.
- Cost estimate or itemized pricing when relevant.
- Tags such as `#SafetyHazard`.
- Large dictation-friendly notes area.
- AI Magic Wand: clean wording, summarize, create checklist, proposal language, executive summary seed.

Keyboard requirement: controls must move above the virtual keyboard. No critical action can sit behind iOS/Android keyboard chrome.

### 8.10 Hardware and Accessibility

- Volume button capture where browser/container support allows.
- 44x44px controls.
- Voice dictation-friendly text areas.
- Screen-reader labels for key actions.
- Avoid hover-only interactions.

---

## 9. Act 3 — Outputs: Documentation, Portals, Presentations, Data

Goal: transform field inputs into impressive, useful outputs without forcing every workflow through PDF.

### 9.1 Deliverable Builder

Use a Notion-style block editor where users assemble outputs from Act 2 inputs:

- Photo/markup blocks.
- Plan map blocks.
- Pin lists.
- Punch-list tables.
- Proposal sections.
- Estimate/scope-of-work sections.
- Executive summary.
- Issue cluster summary.
- Before/after proof blocks.
- Signature/acceptance blocks.

### 9.2 Supported Deliverable Types

- Field report.
- Punch list.
- Photo log.
- Proposal.
- Estimate/scope of work.
- Status report.
- Inspection package.
- Safety report.
- Proof-of-work packet.
- Client portal board.
- Cinematic presentation.
- Spreadsheet/export package.
- Custom branded package.

### 9.3 PDF Is a Secondary Output

PDF export is useful for formal records, but Act 3 must also prioritize:

- Hosted web previews.
- SlateDrop secure links.
- Interactive client portals.
- Kanban boards.
- Presentation mode.
- CSV/Excel export.
- Procore/Primavera P6 integration targets.
- SMS/email links.

### 9.4 SlateDrop Client Portal

Portal links should be secure and tokenized:

- Magic-link login where needed.
- Interactive floor plans.
- Kanban by status/assignee.
- Client comments.
- File responses.
- Threaded chats tied to pins/photos.
- Read receipts and activity trail.

### 9.5 Cinematic Presentation Mode

This is premium presentation software, not a generic web page:

- Background: `bg-[#0B0F15]`.
- Dark glass UI: `bg-white/10 backdrop-blur-md border border-white/20`.
- Bottom filmstrip of slides/thumbnails.
- Keyboard/remote-friendly navigation.
- Presenter-guided mode.
- Detached viewer mode for asynchronous exploration.
- Collapsible right sidebar for threaded comments, live markups, and resolution notes.
- Top-right Share action creates secure SlateDrop link for text/email/QR/native share.

### 9.6 Automated Formatting and AI

- Table of contents.
- Map summary.
- Open vs. closed stats.
- AI executive summary.
- Recommendation summaries.
- Owner/client-friendly wording.
- Credit-gated usage to protect margins.

### 9.7 Cross-Session Querying

Users need to find patterns across large projects:

- Filter by tags.
- Filter by classification/status/assignee/location/date.
- Query across sessions, plans, deliverables, and SlateDrop files.
- Support leadership heatmaps and risk views.

---

## 10. SlateDrop and Coordination Integration

### 10.1 SlateDrop File Backbone

Every Site Walk artifact should land in the project file system:

- Plans to Site Walk Files / Plans.
- Captures to Photos or field-capture folders.
- Markup previews to item folders.
- Deliverables to Deliverables.
- Exports to Reports/Exports.
- Client responses and attachments to the related item/thread.

Do not create a disconnected `site-walk/photos` silo for new work.

### 10.2 Coordination Hub

- Assigned tasks route to My Action Items.
- Client comments route to Unread Threads.
- Subscriber receives notifications for collaborator submissions.
- Operations or owner replies should eventually thread into Coordination Inbox.

---

## 11. Next.js Routing Structure

Use App Router route groups to keep code organized without changing URLs.

```text
app/site-walk/
  layout.tsx

  (act-1-setup)/
    projects/page.tsx
    directory/page.tsx
    plan-room/page.tsx
    settings/page.tsx

  (act-2-inputs)/
    capture/page.tsx
    capture/_components/UnifiedToolbar.tsx
    capture/_components/DataInputBottomSheet.tsx
    capture/_components/PlanViewer.tsx
    capture/_components/CaptureQueue.tsx
    capture/_components/GhostCameraOverlay.tsx

  (act-3-outputs)/
    deliverables/page.tsx
    deliverables/[deliverableId]/page.tsx
    present/[deliverableId]/page.tsx
    portal/[token]/page.tsx
```

Route examples:

- `app/site-walk/(act-1-setup)/projects/page.tsx` → `/site-walk/projects`
- `app/site-walk/(act-2-inputs)/capture/page.tsx` → `/site-walk/capture`
- `app/site-walk/(act-3-outputs)/present/[deliverableId]/page.tsx` → `/site-walk/present/[deliverableId]`

This route-group strategy makes sense because it preserves clean URLs while making Act 1, Act 2, and Act 3 ownership obvious in the codebase.

Implementation guardrail: existing active routes such as `/site-walk/[projectId]/sessions/[id]` may remain as compatibility wrappers during migration, but new build work should align to the 3 Act architecture.

---

## 12. Feature Completeness Checklist

This checklist captures the strategic features that must not be lost during implementation:

- [ ] Real-time multiplayer pins/comments/status via Supabase Realtime.
- [ ] IndexedDB offline queue for blobs, text, vector markups, and status updates.
- [ ] Tier gates for Standard, Pro/Business, Enterprise, and Free Collaborators.
- [ ] Storage and AI credit limits to protect margins.
- [ ] App Store mode feature flag that hides unfinished/coming-soon surfaces.
- [ ] High-contrast field UI and global form contrast reset.
- [ ] Universal app shell with initials/workspace switcher, bug report, share.
- [ ] Four universal quick actions.
- [ ] Three contained scrolling hubs.
- [ ] Free Collaborator assigned-task default dashboard.
- [ ] Master Plan Room with mobile-optimized plan sheets/tiles.
- [ ] Start Walk modal: attach plan or skip camera-only.
- [ ] Long-press plan pinning with quick menu.
- [ ] Camera, camera roll, upload, HEIC/ProRAW conversion, compression.
- [ ] GPS/weather/EXIF metadata extraction.
- [ ] 360° media ingest through entitled 360 Tours flows and/or a dual-entitlement Site Walk bridge.
- [ ] Entitlement-gated Site Walk + 360 Tours plan pins, native 360 viewer launch, and interactive deliverable scenes.
- [ ] Entitlement-gated Site Walk + Design Studio model/design references in deliverables.
- [ ] Background upload queue with visible status.
- [ ] Unified vector toolbar.
- [ ] Undo/redo Oops Engine.
- [ ] Plan layers and sheet index.
- [ ] Ghost Camera before/after overlay.
- [ ] Keyboard-safe bottom sheet.
- [ ] AI Magic Wand formatting.
- [ ] Hardware/volume capture where supported.
- [ ] Notion-style deliverable builder.
- [ ] Interactive SlateDrop client portal.
- [ ] Cinematic Presentation Mode.
- [ ] Threaded comments tied to pins/photos.
- [ ] CSV/Excel and Procore/Primavera export targets.
- [ ] Leadership heatmaps, scorecards, financial risk views.
- [ ] Immutable audit trails and read receipts.

---

## 13. Build Readiness Gate

The strategic plan is ready to drive implementation when these near-term constraints are accepted:

1. Build Act 1 scaffolding and Act 2 capture layout first, not every feature at once.
2. Keep all production files under 300 lines by extracting components/hooks early.
3. Keep Site Walk inside Slate360 auth, entitlements, Coordination, and SlateDrop systems.
4. Treat App Store mode and collaborator restrictions as architecture-level requirements.
5. Do not reintroduce service-worker HTML/CSS/JS caching until the new offline strategy is tested on real phones after deploy.

Recommended next implementation slice:

1. Create route-group scaffolding for `app/site-walk/(act-1-setup)`, `(act-2-inputs)`, and `(act-3-outputs)`.
2. Build Act 1 entry pages as non-destructive wrappers around existing project/session flows.
3. Build Act 2 `/site-walk/capture` visual layout with plan-or-camera modal, dual-mode shell, toolbar, queue indicator, and keyboard-safe bottom sheet.
4. Wire only safe existing APIs first; add new persistence/realtime/offline queues in later slices.
