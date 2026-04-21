# Site Walk — Build File

Last Updated: 2026-04-21
Module Status: **Active — first real usable module in Phase 1 beta**
Doctrine Source: `docs/SLATE360_MASTER_BUILD_PLAN.md` (this file must align)

## Vision Update — 2026-04-21 (Founder Direction)

**Headline:** Site Walk is *capture → AI-formatted deliverable → multi-channel share*. Plans are a power-user feature (~20–30% of users), not a top-level tab.

### Revised IA (Bottom Nav, 5 tabs)
1. **Home** — Quick Start (Camera / Upload Photo / Upload File / Voice Note), Recent Walks, Recent Deliverables
2. **Walks** — Active + past sessions (standalone OR project-bound)
3. **Deliverables** — Created reports grouped by type-folder; bulk export
4. **Share** — Outbound deliverable history, recipient list, viewing-page comments inbox
5. **More** — **Plans (demoted here)**, Templates, Contacts, Branding, Assignments, Settings

> Top-left icon = Slate360 cobalt platform icon (taps back to platform Home). No module-specific icon. **Locked.**

### Capture-First Flow
1. Open Walk → take photo / record voice / type note / mark up photo
2. Background metadata (time, GPS, weather, device) stamped automatically — always recorded, visibility per-deliverable
3. End walk → "Create Deliverable" → pick template → AI cleanup formats notes (bullets, headings, spell-check)
4. Preview → edit → brand (logo, company info) → share

### Sharing Modes (3 channels per deliverable)
| Mode | Format | Use Case |
|---|---|---|
| **A. PDF Email** | PDF attachment + customizable company-branded email body | Formal record |
| **B. Inline Image Email** | Non-editable rendered image embedded in email body — no attachment to open | Quick "look-at-this" recipients |
| **C. Viewing Page** | Hosted slideshow link (click-through), per-item comment/question thread | Interactive review, async Q&A |

Customizable email template per user/org (company name, signature, contact info).

### Viewing Page Capabilities (renders by app entitlement)
- Always: photos, notes, voice clips, videos, markup, GPS pins
- With 360 Tours app: 360 photos, 360 tours, 360 video
- With Design Studio: 3D models, plan markups
- With Content Studio: edited video, time-lapse
- With future apps: thermal, drone, etc.
- **Comments per item** — viewer can leave questions on each slide; routed to creator's inbox

### Project Modes (tier-gated)
- **Standalone (all tiers)** — walk not bound to a project. Use for inspections, proposals, one-offs. Deliverables saved in Site Walk app folder.
- **Project-bound (premium tier)** — walk attached to a construction project. Photos auto-route to project's SlateDrop photo folder. Multiple walks per project link over time for progress tracking.

### Storage / SlateDrop Folder Doctrine
- Deliverables saved in SlateDrop under `Site Walk / Deliverables / <Type>/` folder structure
- Photos from project-bound walks also saved under `Projects / <ProjectName> / Photos /`
- **Bulk download** — beta testers can download all data + deliverables (per-deliverable or full export) so they retain everything if they don't subscribe
- All other apps follow the same pattern: `<App> / <Type> /` folders inside SlateDrop

### Collaboration & Leadership Visibility (beta-critical)
- Subscriber can grant **view-only access** to leadership (select from contact list OR enter name + email/phone)
- Send report via: email / SMS link / direct download package
- Contacts have email + cell — system picks the right channel based on what the recipient has
- Multi-walk-per-project enables progress reports auto-populated with latest dates/notes

### 360 Tours Quick Start (cross-reference)
- Default Quick Action = "Upload 360 photos from phone" (transferred from 360 cam/drone)
- Build branded tour (user logo) → host on Slate360 → share via link OR embed snippet for client websites

### End-to-End Validation Requirement (pre-beta)
Before beta launch every deliverable path must be virtually tested:
- No mock data, no placeholder buttons
- PDF actually contains the rendered content (not blank)
- Email actually sends with correct attachment
- Viewing page actually loads with real assets
- Edit-before-send works
- All channels (PDF email, image email, viewing link) tested end-to-end



## Doctrine Alignment

Site Walk is a **module inside Slate360**, not a separate app.
- Users access Site Walk from within the Slate360 command center
- Users do NOT download a separate Site Walk app
- Users do NOT need a separate login or account for Site Walk
- Site Walk uses the same auth, database, projects, and files as the rest of Slate360
- Site Walk sessions and captures are part of the project record
- Site Walk photos must flow into SlateDrop project folders (CRITICAL GAP — not yet wired)

## Phase 1 Beta Role

Site Walk is the first and only real working module for Phase 1 beta. It must demonstrate:
1. Field capture that creates connected project records
2. Deliverable generation from field data
3. Sharing deliverables with external recipients
4. Mobile + desktop continuity (PWA)
5. Voice-to-text for fast field notes

### Subscriber Workflow (Full Access)
- Office: Create project in Slate360 → enter project info → folder auto-created
- Field: Install Slate360 PWA → log in → open Site Walk → select project → start session → capture → review → create deliverable → share
- Office: View project, see field-collected work, review deliverables
- Invite other subscribers to share the project
- Invite collaborators (up to tier limit) for field participation

### Collaborator Workflow (Scoped Access)
Collaborators are invited by a subscriber to participate in specific projects. They do NOT have full Site Walk module access — only project-scoped field capabilities.

**What a collaborator CAN do in Site Walk:**
- View items in the project(s) they are invited to
- Submit photos from the field (with GPS tagging)
- Respond to punch items and inspection findings
- Submit limited reports if allowed by subscriber
- Use measurements if enabled for the project
- Mark items as: pending / in progress / needs review / complete / needs attention
- Use geolocation tagging on their captures
- Use voice-to-text for field notes
- Use AI cleanup / spell check on their own notes
- Attach text, voice, or short video memos to items they have access to
- Trigger notifications to the subscribing user when they submit/update something
- Complete assignments given to them by the subscriber

**What a collaborator CANNOT do in Site Walk:**
- Start new Site Walk sessions (only subscriber can initiate)
- Create deliverables
- Share deliverables externally
- Access the Site Walk board view across all projects
- Access session templates or plan management
- Create or modify project-level settings
- Invite other collaborators or subscribers
- Disable background metadata (timestamp, geolocation) if project requires them

**Collaborator count per subscriber (recommended defaults):**
- Site Walk Standard: **0 collaborators** (solo use)
- Site Walk Pro: up to **3 collaborators**
- Collaborator seats are per-subscriber, not per-project

**Open decisions:** Whether collaborators can create new items or only respond to existing. See master build plan Section 2.

### Metadata Doctrine for Site Walk

Timestamp, geolocation, and weather are **background metadata** on every capture:
- Subscriber/project settings decide which metadata fields are captured
- If enabled, they are automatically recorded — collaborators cannot disable them
- Deliverables may control visibility of metadata lines (e.g., hide weather from PDF)
- Underlying data is always saved regardless of display settings
- Phase 1: timestamp always captured; geolocation if device permits; weather if API wired (may be Phase 2)

### Status Doctrine for Site Walk Items

All Site Walk items, punch entries, assignments, and findings use:

| Status | Meaning |
|--------|---------|
| Pending | Created, not started |
| In Progress | Work underway |
| Needs Review | Work done, awaiting subscriber review |
| Complete | Verified done |
| Needs Attention | Blocked, flagged, or requires intervention |

Optional percent-complete is supported for items/assignments where useful.
Collaborators can change status within their assigned scope and trigger notifications when they do.

### Notification Triggers in Site Walk

Phase 1 required notifications:
- Collaborator submits photo/note → subscriber notified (in-app + optional email)
- Assignment marked complete → assigner notified
- Item status changed to "Needs Review" or "Needs Attention" → subscriber notified
- Comment added to item → relevant parties notified
- All notification events are historically tracked per project/item

## Current Real Implementation State

### What Works (Real)
- Full session capture flow (create session → add items → review)
- Photo/video capture with GPS tagging via CaptureCamera.tsx
- Text note capture via CaptureTextNote.tsx
- Session board view (SessionBoardClient.tsx)
- Session list and review (SessionListClient.tsx, SessionReviewClient.tsx)
- Deliverable generation and viewing (DeliverableViewer.tsx)
- Block editor for rich content (BlockEditor.tsx, BlockRenderer.tsx, BlockToolbar.tsx)
- Comment threads on items (CommentThread.tsx)
- Assignment panel for task delegation (AssignmentPanel.tsx)
- Plan viewer with pins (PlanViewer.tsx)
- Template manager (TemplateManager.tsx)
- Workflow item cards with status tracking (WorkflowItemCard.tsx)
- Item timeline view (ItemTimeline.tsx)
- All 31 API routes deployed and responding
- All 31 API routes correctly use withAppAuth("punchwalk") (hardened in commit 8f9c3e9)
- 10 database tables with migrations applied

### What Is Partial
- Deliverable sharing (API exists at /deliverables/[id]/share, email integration unclear)
- PDF export (endpoint at /deliverables/[id]/export, generation quality untested)
- Offline mode (lib/offline-queue.ts exists but NOT wired to Site Walk capture components)
- Branding/white-label (API at /branding/route.ts exists, propagation to deliverables unverified)
- Voice-to-text (browser SpeechRecognition available, UI toggle for thumb-friendly use not designed)

### What Is Missing (Phase 1 Blockers)
- **Site Walk → SlateDrop integration**: Uploads go to S3 at site-walk/photos/{orgId}/{sessionId}/... with ZERO integration to slatedrop_uploads or project_folders. Files are a disconnected silo.
- **Offline capture**: lib/offline-queue.ts + useOfflineSync hook exist but zero imports in components/site-walk/. Not wired.
- **Layout unification**: Site Walk has its own layout tree (app/site-walk/layout.tsx) separate from the Slate360 shell. Creates jarring app-switching feel.
- **Voice-to-text UX**: No AI note cleanup action (bullet-point, clean up wording)
- **Mobile capture optimization**: Voice toggle thumb-friendly design not implemented

## Routes / Pages

| Route | File | Purpose |
|-------|------|---------|
| /site-walk | app/(apps)/site-walk/page.tsx | Entry point (project selector) |
| /site-walk/board | app/site-walk/board/page.tsx | Session board view |
| /site-walk/[projectId]/sessions | app/site-walk/[projectId]/sessions/page.tsx | Session list |
| /site-walk/[projectId]/sessions/[sessionId] | app/site-walk/[projectId]/sessions/[sessionId]/page.tsx | Session capture |
| /site-walk/[projectId]/sessions/[sessionId]/review | .../review/page.tsx | Session review |
| /site-walk/[projectId]/deliverables/new | .../deliverables/new/page.tsx | New deliverable |

**Layout issue**: /site-walk uses (apps) layout (AppSidebar). Sub-routes under app/site-walk/ use standalone layout (no sidebar). This causes a layout shift and makes Site Walk feel like a separate app, conflicting with the "one app" doctrine.

## API Routes (31 endpoints)

| Group | Endpoints | Auth |
|-------|-----------|------|
| Board | /api/site-walk/board | withAppAuth("punchwalk") |
| Branding | /api/site-walk/branding | withAppAuth("punchwalk") |
| Upload | /api/site-walk/upload | withAppAuth("punchwalk") |
| Deliverables | 7 routes: CRUD + share + export + snapshot + revoke + views | withAppAuth("punchwalk") |
| Sessions | 3 routes: list + detail + sign | withAppAuth("punchwalk") |
| Items | 5 routes: CRUD + verify + resolve + bulk | withAppAuth("punchwalk") |
| Comments | 3 routes: CRUD + read | withAppAuth("punchwalk") |
| Assignments | 2 routes: CRUD | withAppAuth("punchwalk") |
| Plans | 2 routes: CRUD | withAppAuth("punchwalk") |
| Templates | 3 routes: CRUD + apply | withAppAuth("punchwalk") |
| Pins | 2 routes: CRUD | withAppAuth("punchwalk") |

All 31 routes properly gated with withAppAuth("punchwalk") as of commit 8f9c3e9.

## Database Tables

| Table | Migration | Purpose |
|-------|-----------|---------|
| site_walk_sessions | 20260407000002 | Capture sessions |
| site_walk_items | 20260412000005 | Individual items in a walk |
| site_walk_deliverables | 20260412000006 | Final deliverable outputs |
| site_walk_plans | 20260412000009 | Pre-planned templates |
| site_walk_templates | 20260412000009 | Reusable templates |
| site_walk_pins | 20260412000009 | Location pins on plans |
| site_walk_comments | 20260412000005 | Comment threads |
| site_walk_assignments | 20260412000005 | Task assignments |
| deliverable_sharing_snapshots | 20260412000010 | Shared snapshots |
| deliverable_access_tokens | 20260408000007 | Secure access tokens |

## Key Components (18 files, ~2500 lines total)

| Component | Lines | Purpose |
|-----------|-------|---------|
| SessionReviewClient.tsx | 226 | Session review UI |
| AssignmentPanel.tsx | 221 | Task assignment |
| BlockRenderer.tsx | 196 | Rich content rendering |
| TemplateManager.tsx | 196 | Template CRUD |
| WorkflowItemCard.tsx | 190 | Item card with workflow |
| PlanViewer.tsx | 159 | Plan display with pins |
| DeliverableViewer.tsx | 159 | Deliverable preview |
| CaptureCamera.tsx | 151 | Camera capture |
| CommentThread.tsx | 148 | Comment UI |
| SessionListClient.tsx | 129 | Session list |
| SessionCaptureClient.tsx | 122 | Session capture flow |
| BlockEditor.tsx | 118 | Rich content editing |
| ItemTimeline.tsx | 114 | Item status timeline |
| CaptureTextNote.tsx | 97 | Text note capture |
| SessionBoardClient.tsx | 96 | Board view |
| ProjectSelectorClient.tsx | 64 | Project picker |
| SiteWalkNav.tsx | 59 | Navigation |
| BlockToolbar.tsx | 51 | Editor toolbar |

All files under 300-line limit.

## Codebase Conflicts with Phase 1 Doctrine

| # | Severity | Issue | Action Needed |
|---|----------|-------|--------------|
| 1 | CRITICAL | Uploads go to disconnected S3 silo — no SlateDrop integration | Wire uploads to slatedrop_uploads + project_folders |
| 2 | HIGH | Own layout tree separate from Slate360 shell | Unify layout or make transition seamless |
| 3 | HIGH | Offline queue exists but not wired to capture | Connect lib/offline-queue.ts to CaptureCamera + CaptureTextNote |
| 4 | MODERATE | PDF export untested | Verify /api/site-walk/deliverables/[id]/export |
| 5 | MODERATE | Email sharing untested | Verify Resend integration works |
| 6 | MODERATE | Voice-to-text has no AI cleanup action | Add bullet-point / cleanup action |
| 7 | HIGH | No collaborator access model | Need per-project scoped access for non-subscribers, item-level permissions |
| 8 | MODERATE | No collaborator notification triggers | Subscriber should be notified when collaborator completes work |
| 9 | MODERATE | No in-app notification system | Need notification table + delivery for status changes, submissions, assignments |
| 10 | MODERATE | Status set not standardized | Ensure all items use: pending/in-progress/needs-review/complete/needs-attention |

## What Must Be Working Before Beta

1. Session capture flow end-to-end (create → capture → review → deliverable → share)
2. Photos appear in SlateDrop project folders (not just disconnected S3)
3. PDF export produces readable output
4. Share links work for external recipients
5. PWA install on mobile works for capture
6. Voice-to-text toggle is thumb-friendly
7. AI note cleanup (bullet-point, clean wording) works
8. Offline capture queues and syncs when back online
9. Collaborator can view assigned items and submit photos within invited project
10. Subscriber receives notification when collaborator completes an assignment

## What Must Be Decided Before Design Generation

1. **Capture screen layout**: Button placement, camera area, note input, voice toggle — owner must approve
2. **Session type selection**: What session types for Phase 1? (Punch, inspection, progress, custom?)
3. **Deliverable types for Phase 1**: Punch list report, inspection report, proposal — which are in scope?
4. **AI boost actions**: What specifically does "clean up wording" and "bullet-point" do? Owner approves.
5. **Item metadata fields**: Which are required vs optional? (urgency, due date, assignee, trade, etc.)
6. **Layout integration**: How should Site Walk feel as part of Slate360? Same sidebar? Separate?

## Verification Checklist

- [ ] Session capture creates DB rows in site_walk_sessions + site_walk_items
- [ ] Photo upload stores to S3 AND registers in slatedrop_uploads
- [ ] Photos appear in project's SlateDrop folder
- [ ] Deliverable generation produces viewable output
- [ ] PDF export is readable
- [ ] Share link works for external recipients with no account
- [ ] Voice-to-text captures to note field
- [ ] AI cleanup action processes notes
- [ ] Offline capture queues and syncs
- [ ] PWA capture works on mobile (camera, GPS, notes)
- [ ] No console errors on any Site Walk page

---

## Product Vision Reference

The sections below contain the owner's detailed product vision for Site Walk. These are reference material — not implementation instructions. Implementation follows only after owner approves the Phase 1 functional spec.

### Module Boundaries

Site Walk owns: field walks, site observations, punch lists, inspections, QA/QC findings, safety observations, field notes, progress photos, photo markup, plan-based issue pinning, branded reports, branded proposals, digital handoff packages, share links, mobile-first issue capture.

Slate360 Core owns: auth, billing, project creation, permissions, SlateDrop file management, history snapshots, deliverable editing, desktop review, external links, dashboard notifications, metering.

Other modules enrich Site Walk:
- 360 Tours: immersive 360 proof and navigable linked context
- Content Studio: edited clips and advanced media polish
- Project Hub: office-side coordination, routing, assignments, logs
- BIM/Virtual: model-based contextual overlays

### Standalone Value Proposition

"Everything you need to document field conditions, create punch lists, perform inspections, create branded proposals and reports, and send polished digital deliverables from mobile or desktop."

Site Walk must be complete and valuable on its own, but expandable through bundles.

### Core Workflows

A. **Punch walk**: Walk site → document deficiencies → pin to plans → assign trades → generate punch report
B. **Inspection**: Formal/informal inspection → templates/checklists → evidence → inspection report
C. **Progress documentation**: Progress photos/notes over time → summary for owners/leadership
D. **Proposal**: Document field conditions → branded proposal/scope/corrective action package
E. **Client deliverable**: Digital handoff with issue details, marked-up photos, attachments
F. **Closeout/verification**: Revisit findings → upload completion proof → verify → open/closed logs
G. **Plan-based**: Upload plans → spatial backbone for issue creation and tracking
H. **Mobile-first capture**: Photo + note + voice + markup → save in few taps

### Mobile UX Requirements

Must be optimized for:
- One-handed use
- Quick capture with big buttons
- Minimal typing, voice-first input
- Reliable save behavior
- Offline tolerance
- Fast photo handling
- Visible controls with keyboard open
- Easy send/share after the walk

Must-have behaviors:
- Sticky bottom action bar
- Floating capture button
- Large save button
- Auto-save drafts
- Keyboard-safe form layout
- Easy voice toggle on/off
- Easy bullet-point note formatting
- Swipe between captured items
- Review screen before sending

### Deliverable Types (Full Vision)

Punch list report, inspection report, progress report, site walk summary, deficiency report, turnover report, closeout verification package, field observation report, branded proposal, estimate summary, trade-specific action list, issue-specific memo, digital review package.

Delivery methods: PDF, email, textable share link, downloadable package, CSV, image export, branded mobile review page.

### MVP Features (Phase 1 Subset)

- Project selection / creation
- Session creation with session type
- Camera capture with GPS/timestamp
- Text notes and voice-to-text
- Photo markup (arrows, circles, text)
- Category/trade/status/priority/assignee
- Due date
- Plan upload and plan pinning
- List filtering
- Branded PDF report generation
- Link-based deliverable sharing
- Mobile-friendly review pages
- Send by email workflow
- Export/download

### Phase 2 Features (After Stable Beta)

Templates and checklists, recurring walk templates, before/after compare, turnover mode, richer proposal layouts, external acknowledgement, issue history timeline, stronger offline queueing, richer client presentation mode.

### Phase 3 Features (Future)

360-linked issues, immersive context, BIM/model-linked findings, AI-generated descriptions, recurring issue pattern detection, executive summaries, trade performance insights, digital owner portal, geospatial tie-ins, automated closeout books.

### Build Sequence (Within Site Walk)

1. Lock architecture and schemas
2. Build fast field capture
3. Build issue list and organization
4. Build plan upload and pinning
5. Build branded report generation
6. Build branded proposal generation
7. Build share links and delivery
8. Add bundle hooks for future module integration
