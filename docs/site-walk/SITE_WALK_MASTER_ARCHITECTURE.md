# Site Walk Master Architecture — Field-to-Office Bridge

Last Updated: 2026-04-28
Status: Authoritative strategy blueprint for the active Site Walk module

## Executive Mandate

Site Walk is a first-class module inside the Slate360 ecosystem, not a parallel app. Its field objective is simple: one tap starts capture, the camera opens, the image appears immediately, and the user can mark up, dictate notes, classify, assign, and move to the next item without hunting through screens.

The tactical product goals are:
- Real-time field-to-office visibility.
- Multiplayer support workflows for future field-office coordination.
- Offline-first capture using IndexedDB mutation and blob queues.
- Project-bound plan rooms where every Field Project owns its plan sets.
- High-value client deliverables through SlateDrop-hosted interactive outputs before PDF.

## Non-Negotiable UX Rule: One Tap → Snap → Markup & Note

The capture workflow must avoid clunky wizards.

Required default flow:
1. User selects or creates a Field Project, or starts an ad-hoc capture.
2. User taps **Quick Capture**.
3. Mobile opens the native camera immediately from that same tap; desktop opens the file picker for uploaded pictures.
4. The selected file is stored in a short-lived IndexedDB launch handoff while the Site Walk session is created.
5. The capture route opens with `launch=<id>` and consumes the selected file without asking the user to tap another camera button.
6. `URL.createObjectURL(file)` renders the raw image instantly.
7. The capture details drawer opens immediately with title, classification, priority, status, due date, assignee, and notes.
8. Markup tools activate over the local image while upload/offline sync runs in the background.
9. User taps **Capture next item** and repeats.

Plan-based flow:
1. User starts a project-bound Site Walk.
2. User chooses **Select Plan** or uploads plan sets in the Plan Room.
3. User long-presses the plan sheet to drop a pin.
4. Pin quick actions offer **Attach next photo** and **Attach next note**.
5. Choosing photo immediately opens the camera and attaches the next capture to the pin.
6. The same drawer captures notes/classification/assignment as photos-only mode.

## Field Project Model

A Field Project is the organizing container for many Site Walk sessions.

Each Field Project must support:
- Project setup and branding defaults.
- Stakeholders and project members.
- A Master Plan Room with uploaded plan sets and sheets.
- Multiple Site Walk sessions over time.
- Deliverables generated from the accumulated item history.

Plan storage rule:
- Plan sets are stored against the Field Project, not against a one-off walk.
- Individual Site Walk sessions can select plans from the Field Project Plan Room.
- Photos-only sessions must remain one-tap and must not require a plan decision after Quick Capture.

## Tier Guardrails

Tier gates are architecture, not Phase 2 polish.

Standard tier:
- 5GB Site Walk storage cap.
- 300 AI credits.
- Construction-management project hooks are disabled.

Pro/Business tier:
- 25GB Site Walk storage cap.
- 1,000 AI credits.
- Gantt schedule, budgets, RFIs, and deeper project-management hooks are unlocked.

Enforcement rules:
- Upload presign must call the Site Walk metering engine before issuing storage URLs.
- AI formatting and summaries must call metering before provider work.
- UI affordances can be visible but must show upgrade/locked states when a tier is insufficient.

## Design System: Field-Tested Visual Doctrine

Site Walk sets the field-tested design baseline for Slate360:
- Page canvas: `bg-slate-50`.
- Cards/forms: pure white elevated surfaces.
- Borders: crisp `slate-300`.
- Text: bold `slate-900` primary labels.
- Buttons: large touch targets, cobalt primary actions.
- Inputs: high-contrast white backgrounds, slate borders, 16px mobile font minimum.
- Keyboard safety: `dvh`, safe-area padding, and focus padding for bottom sheets.

Global shell alignment:
- Authenticated module shells should converge on the same high-contrast field-tested language.
- The header should expose user initials/settings, bug reporting, and share actions consistently.

## Module Navigation

Core Site Walk navigation labels:
- My Dashboard
- Deliverables
- Active Walks
- Plan Room
- Setup & Branding

The capture screen itself is a task mode reached from Quick Capture, plan pins, or active walks; it should not force users to browse through navigation to begin work.

## Act 1 — Setting the Chess Board

Global setup:
- Company identity: logo, brand colors, signatures.
- Unified address book and stakeholders.
- Report defaults for deliverables.

Project setup:
- Standard: solo Field Project, location context, Master Plan Room, basic collaborators.
- Pro/Business: cost-coded budgets, schedule milestones/Gantt, RFIs, submittal hooks.

Required outcome:
- A project-bound user can start many walks against the same Field Project and reuse its plans.

## Act 2 — Dynamic & Frictionless Inputs

Capture screen requirements:
- Large cobalt Quick Capture / Take Photo button.
- Camera auto-open when launched with `quick=camera`.
- Immediate object URL preview.
- Orientation-aware layout for portrait and landscape.
- Image markup canvas over the local photo.
- Capture drawer opens automatically.
- Title, classification, priority, status, due date, assignee, and notes autosave.
- Dedicated dictation button in the notes group.
- `✨ Format with AI` uses metering before AI.
- GPS, timestamp, and weather metadata are collected where available.
- Offline queue stores mutations and blobs in IndexedDB and surfaces pending/syncing/synced state.

Plan requirements:
- Long-press drops a pin with haptic feedback where available.
- Pin quick actions can launch camera immediately.
- Pin colors communicate status: red/issue, yellow/caution, blue/default, green/resolved.
- Pin history and layered views must keep the clean base plan available.
- Future native photo overlays should support visual alignment against plan context.

## Act 3 — High-Value Outputs

Deliverable Builder:
- Notion-style block editor.
- AI executive summaries behind metering.
- Branded hosted outputs first, PDF second.

SlateDrop Client Portal:
- Interactive floor plans.
- Kanban-style issue views.
- Team review and approval workflow.
- Client responses routed back into Slate360 coordination.

Premium Cinematic Mode:
- Pitch-black presentation surface.
- TV/casting-first slideshow.
- Horizontal filmstrip navigation.
- Guided and detached viewing modes.
- Threaded comments.

Exports:
- Excel/CSV.
- Procore or CM-system handoff where tier permits.
- Standard branded PDFs.

## Current Implementation Alignment

Implemented foundation:
- Active Site Walk route scaffold.
- Start Walk modal with Select Plan vs Skip - Photos Only.
- Site Walk launch grid with one Quick Capture / desktop Upload Pictures action, Field Project selector, Walk With Plans, Photos Only Walk, and Active Walks above the fold.
- Quick Capture file handoff that opens the mobile camera or desktop file picker from the first tap, then routes to capture with the selected image already available.
- Mobile home now removes explanatory marketing copy and hides secondary section nav on `/site-walk`; Plan Room, Deliverables, and Setup are folded into the Field Project tools menu.
- Photo markup supports draw, box, circle, arrow, text, and color selection.
- Capture metadata is collected through `captureMetadata()`: timestamp always, GPS when browser/native permission is granted, weather when GPS is available, and file size/MIME metadata. Deliverable builders must expose an `Include photo metadata` checkbox that renders timestamp/location/weather subtly under photos.
- Local object URL preview and photo markup canvas.
- Bottom-sheet capture form with autosave, AI formatting, due date, assignee, and dictation control.
- IndexedDB offline mutation/blob queue and sync indicator.
- Plan Room and plan long-press capture path.
- Field-tested header with initials, bug report, and share actions in Site Walk shell.

Near-term follow-ups:
- Persist local photo markup shapes into `site_walk_items.markup_data`.
- Expand pin status colors and historical layer toggles.
- Add user-facing retry/discard controls for failed offline mutations.
- Promote the Site Walk header pattern into every module shell after validating the field workflow.
