# Site Walk V1 — 3 Act Workflow, Layout, and Launch Plan

Last Updated: 2026-04-26
Purpose: Product/UI plan for making Site Walk usable for Slate360 Version 1 launch.

---

## North Star

Site Walk should feel like a mobile field assistant that turns jobsite context into branded deliverables:

1. **Act 1 — Set the stage:** company identity, contacts, project/site setup, location, templates, plans, and deliverable defaults.
2. **Act 2 — Capture inputs:** walk the site, take/upload photos, mark them up, classify findings, dictate notes, assign people, and autosave every item.
3. **Act 3 — Produce outputs:** choose a deliverable type, pull in captured items, brand it, price it when needed, preview, send, and track responses.

Site Walk must use the same Slate360 auth, Coordination contacts/inbox, and SlateDrop file backbone. It should not feel like a separate app.

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

Responses:
- Stakeholder comments and file responses route to Coordination Inbox.
- Creator receives notification bell unread state.
- Feedback replies from Operations Console also route to Coordination Inbox.

---

## Build Priority for V1 Launch

1. Shell alignment: Site Walk uses the same Slate360 chrome and bottom nav rules.
2. Act 1 fast setup: field project + location + contacts + branding defaults.
3. Act 2 capture loop: photo/upload → markup → classification/notes → autosave → item list.
4. SlateDrop bridge: photos, markups, plans, and deliverables route into app/project folders.
5. Act 3 first deliverable: branded field report/proposal with PDF or hosted preview.
6. Coordination loop: contact picker, send/share, stakeholder response, notification inbox.
7. Offline queue and recovery for mobile capture.

---

## Open Product Decisions

- Which markup tools are mandatory for launch versus Phase 2.
- Whether proposal pricing is part of the first deliverable or a follow-up deliverable type.
- Whether collaborators can create new findings or only respond to assigned items in V1.
- Which calendar integration ships first: one-way calendar feed or Google/Microsoft two-way OAuth.
