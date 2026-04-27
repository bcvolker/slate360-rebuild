# Site Walk V1 — 3 Act Workflow, Layout, and Launch Plan

Last Updated: 2026-04-26
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

## Build Priority for V1 Launch

1. Shell alignment: Site Walk uses the same Slate360 chrome and bottom nav rules.
2. Route-group scaffolding: `app/site-walk/(act-1-setup)`, `(act-2-inputs)`, `(act-3-outputs)` while preserving clean URLs.
3. Act 1 fast setup: field project + location + contacts + branding defaults + Master Plan Room.
4. Act 2 visual capture shell: plan-or-camera modal, dual-mode Camera/Plan view, pinning quick menu, vector toolbar, queue indicator, bottom sheet.
5. Act 2 persistence loop: photo/upload → markup → classification/notes → autosave → item list.
6. SlateDrop bridge: photos, markups, plans, and deliverables route into app/project folders.
7. Coordination loop: assigned tasks, contact picker, send/share, stakeholder response, notification inbox.
8. Act 3 first non-PDF deliverables: hosted preview/client portal and cinematic presentation shell before treating PDF as the only output.
9. Offline queue and recovery for mobile capture through IndexedDB, not service-worker HTML/CSS/JS caching.
10. App Store mode: hide unfinished/coming-soon modules under `NEXT_PUBLIC_APP_STORE_MODE=true`.

---

## Open Product Decisions

- Which markup tools are mandatory for launch versus Phase 2.
- Whether proposal pricing is part of the first deliverable or a follow-up deliverable type.
- Whether collaborators can create new findings or only respond to assigned items in V1.
- Which calendar integration ships first: one-way calendar feed or Google/Microsoft two-way OAuth.
- Final marketing names for the Site Walk tiers: code should stay on canonical entitlement tiers while product copy may use Standard / Pro labels.
- Exact cut line between V1 and Phase 2 for realtime multiplayer, offline queue depth, Cinematic Mode interactivity, and leadership analytics.
