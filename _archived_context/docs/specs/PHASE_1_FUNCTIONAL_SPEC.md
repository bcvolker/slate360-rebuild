# Phase 1 Functional Spec — Slate360 Private Beta

> Canonical spec. Changes require explicit owner approval.
> Last saved: 2026-04-14 (clarifications added: offline policy, OS permission fallback, seat lifecycle, SlateDrop permissions, autosave vs snapshot)

---

## 1. Product Objective

Phase 1 delivers a working private beta of Slate360 with Site Walk as the first usable module.

The goal is for a real user to:

- Create an account
- Receive beta access
- Log into Slate360
- Create or join a project
- Use Site Walk on web or installed Slate360 PWA
- Capture site data tied to the project
- Collaborate with office users and limited collaborators
- Create and share deliverables
- Have all project records and history saved correctly in SlateDrop
- Report bugs and suggest features
- Allow the owner to manage beta access and issues through the Operations Console

This phase is not the final monetization or enterprise phase. It is the first real, testable, working product.

---

## 2. Core Product Model

Slate360 is one product surface with:

- One account system
- One backend
- One project/data model
- One entitlement system
- One web app
- One installable PWA

Site Walk is a module inside Slate360, not a separate product architecture in Phase 1.

- On web, modules are pages/sections inside Slate360.
- On mobile/PWA, users install Slate360 and access Site Walk from inside the installed Slate360 shell.

---

## 3. User Types

There are three user modes in Phase 1.

### Full Subscriber

A full subscriber has one paid seat/license. They are independent by default and may:

- Create and manage their own projects
- Use entitled modules
- Invite collaborators if their tier allows
- Link with another subscriber on a shared project

### Shared-Project Subscriber

A full subscriber may be invited to collaborate on a project owned by another subscriber. This is handled through a project-level invite and acceptance workflow with explicit permissions.

### Collaborator

A collaborator is not a full paid seat. A collaborator is invited by a subscriber, receives limited project-scoped access, and can contribute only within permitted areas.

For Phase 1:

- Site Walk Standard includes 0 collaborators
- Site Walk Pro includes 3 collaborators
- Collaborator allowance is per subscriber, not per project

### Collaborator Seat Lifecycle

- Only accepted, active collaborators consume seats
- Pending invites do not permanently consume seats
- Revoked or expired collaborators free their seats immediately
- Seat counts are per subscriber, not per project
- If a subscriber downgrades from Pro to Standard (0 collaborators), existing active collaborators must be revoked or the downgrade blocked

---

## 4. Phase 1 Surfaces

### Web

After login, the user sees the Slate360 Command Center. From there they navigate to:

- Projects
- SlateDrop
- Site Walk
- Deliverables
- Notifications
- Settings
- Operations Console (if owner/admin-authorized)

### Mobile / PWA

The user installs Slate360 as a PWA, logs in with the same account, and accesses Site Walk from inside the installed Slate360 shell.

There is no separate Site Walk app in Phase 1.

---

## 5. Phase 1 Modules Exposed

### Visible and Usable

- Slate360 shell / command center
- Projects
- SlateDrop
- Site Walk
- Operations Console (owner only)

### Hidden from Normal Beta Navigation

- 360 Tours
- Design Studio
- Content Studio
- Geospatial
- Virtual Studio
- Any other placeholder modules

These remain in the roadmap and docs, but not in tester-facing navigation until usable.

---

## 6. Beta Onboarding

### Full Subscriber Beta Onboarding

1. User creates account
2. User receives beta access by controlled method
3. User logs into Slate360
4. User lands in the Slate360 Command Center
5. User can create/use projects and Site Walk if enabled
6. User may install Slate360 as a PWA later for mobile use

### Collaborator Onboarding

1. Collaborator is invited by a subscriber from a project
2. Collaborator receives onboarding email/invite
3. Collaborator creates account or logs in
4. Collaborator gets scoped access only
5. Collaborator lands in a limited shared-work view, not the full command center

### Beta Access Control

Phase 1 requires a controlled beta-access mechanism:

- Invite code, or
- Owner/admin grant, or
- Approval queue

This must be manageable from the Operations Console.

---

## 7. Project Creation and Project Model

Projects are primarily created in Slate360, not in Site Walk.

### Minimum Project Creation Wizard for Phase 1

**Required fields:**

- Project name
- Project location
- Project description / scope summary

**Optional fields:**

- Client/owner
- Milestones
- Drawings
- Schedule upload
- Budget upload
- Attachments

Users may create minimal projects first and add more records later.

### Project Linking

A project may have:

- One owner/creator
- Linked subscriber collaborators
- Invited limited collaborators
- Project-scoped permissions
- Project history and deliverables

---

## 8. SlateDrop and Project Record Doctrine

When a project is created, Slate360 should create a project-centric folder structure in SlateDrop.

### Minimum Phase 1 Project Folder Structure

```
/Projects/{Project Name}/Photos
/Projects/{Project Name}/Deliverables
/Projects/{Project Name}/History
/Projects/{Project Name}/Schedules
/Projects/{Project Name}/Budgets
/Projects/{Project Name}/Reports
/Projects/{Project Name}/Attachments
```

Additional custom folders may be allowed.

### Saving Behavior

- Site Walk captures must not remain an invisible S3 silo in the product experience
- Captures and deliverables must appear in the correct project record structure
- Deliverables should be saved both as current working records and historical snapshots
- Users should be able to resume drafts and return later
- Autosave is required for long-running work

The current audit flags Site Walk → SlateDrop bridging as a critical gap to fix before beta.

### Autosave vs Snapshot

- Autosave updates the working draft only. It does not create history entries.
- Manual save updates the working draft only.
- Publish, generate, share, or snapshot actions create immutable historical records.
- Autosave must never create history snapshots. Only explicit user actions (publish/share/snapshot) generate immutable records.
- Draft state is always resumable. The user picks up where they left off.

---

## 9. Site Walk Phase 1 Workflow

### Core Workflow

1. User opens Site Walk inside Slate360
2. User selects a Slate360 project
3. User starts or resumes a Site Walk session
4. User captures a photo
5. User adds notes by typing or voice-to-text
6. User can toggle voice input on/off easily
7. User can use AI boost to clean or bullet the notes
8. User can manually edit notes
9. User can set item metadata:
   - Priority / urgency
   - Due date
   - Assignee
   - Status
   - Percent complete (if relevant)
10. User saves item
11. Item becomes part of that project's running record
12. User may continue adding items and creating deliverables later

### Supported Phase 1 Deliverables

- Punch list
- Inspection
- Proposal
- Custom report

### Required Behaviors

- Save drafts
- Autosave
- Resume later
- Create share links
- Create email-style deliverable views
- Support PDF export
- Store snapshots/history
- Link deliverables to project record

### Offline State Policy

Phase 1 supports offline draft capture for Site Walk:

- Users can create and continue sessions offline
- Photo capture and text notes work offline
- Drafts save locally (browser/PWA storage)
- Uploads and actions queue for sync when the connection returns
- Email/share-link generation and live notifications are online-only
- An offline banner and pending sync count must be visible when offline
- Sync happens automatically when the connection returns

Offline mode is a first-class requirement for field use, not a nice-to-have.

---

## 10. Metadata Doctrine

Metadata such as:

- Timestamp
- Geolocation
- Weather

must be treated as background capture rules, not optional user-controlled toggles once required for a project.

### Rules

- Subscriber/project settings decide whether metadata capture is required
- If required, metadata is automatically recorded
- Collaborators cannot disable it
- Deliverable visibility of metadata lines can be toggled on/off
- Stored underlying data remains intact

### OS Permission Fallback

- Camera denial blocks photo capture only, not the whole app. Text notes, voice, and other capture types remain available.
- Geolocation denial does not block the app. The item proceeds with missing location metadata unless project rules require it.
- If project rules require geolocation, the item is marked as "missing required metadata" for later review.
- Weather metadata only derives when sufficient location/time data exists. Missing weather is not a blocking error.

---

## 11. Status Doctrine

Use these statuses in Phase 1:

| Status | Meaning |
|---|---|
| Pending | Not yet started |
| In Progress | Work underway |
| Needs Review | Awaiting review/approval |
| Complete | Done |
| Needs Attention | Flagged issue or blocker |

Percent-complete should be available where useful, especially for assignments and task-like items.

---

## 12. Collaboration Doctrine

### Subscriber-to-Subscriber Project Linking

Uses:

- Invite
- Accept
- Explicit permissions

Permissions may include:

- View
- Upload
- Download
- Comment
- Create deliverables
- Access specific folders
- Project-specific workflows

### Collaborator Doctrine

**Collaborators may:**

- View assigned/shared items
- Respond to punch list items
- Upload photos
- Use measurement tools (if enabled)
- Use voice-to-text
- Use AI note cleanup
- Attach text/voice/video memos to specific issues
- Update statuses on their assigned/shared work
- Trigger notifications to the subscriber

**Collaborators may not:**

- Access full admin surfaces
- Access unrestricted project data
- Manage billing
- See the Operations Console
- Create unrestricted project-wide changes (unless granted)

### SlateDrop vs Item-Level Permissions

- Collaborators do not browse the full project file tree by default
- Collaborator file access is limited to explicitly shared folders or items
- Full subscribers on shared projects may receive broader folder-level permissions
- Item-linked files open through the item context or a specifically shared folder scope, not through unrestricted SlateDrop browsing

---

## 13. Notifications and Communication

### Required Phase 1 Notifications

- In-app notifications
- Project/item communication history
- Email notifications for critical events

### Recommended Configurable Events

- Collaborator submitted response
- Collaborator asked a question
- Assignment completed
- Review requested
- Direct mention
- Critical issue

### Communication Tracking

Issue-related communication should be attached to the relevant item and saved historically.

Supported communication types:

- Text
- Voice memo
- Short video memo
- File attachment

SMS can remain Phase 2 unless easily supported.

---

## 14. Deliverable Sharing Doctrine

Users must be able to send deliverables by:

- Share link
- Textable link
- Email-style view
- PDF export

The deliverable should support:

- Clickable linked assets
- Later 360 scene links
- Later 3D model links
- Immutable snapshot when needed
- Editable draft when still in progress

Current audits confirm deliverable share links and PDF routes exist, but PDF quality and email delivery still need verification.

---

## 15. Bug Reporting and Feature Requests

Phase 1 should provide one unified reporting flow:

- Bug or feature request
- Module/location pre-filled by context
- User can change module/category if needed
- Attachments/screenshots/videos/files allowed
- Voice-to-text and AI cleanup supported (if feasible)

The report should be visible in the Operations Console with:

- Submitter
- Module
- Project
- Severity/type
- Status
- Triage notes

The current audit confirms there is not yet a real bug-reporting mechanism for testers. This is a true Phase 1 gap.

---

## 16. Operations Console

Operations Console replaces the old CEO-page concept.

### Phase 1 Scope

- Owner-only access for `slate360Ceo@gmail.com`
- Beta user management
- Beta access grant/revoke/expiry
- Subscriber/collaborator visibility
- Project/user linking visibility
- Bug report inbox
- Feature request inbox
- Triage/status tools

### Future Capabilities (Post-Beta)

- Employee/admin scoped access
- Business/profit/churn/pricing/content metrics

The old CEO scaffold should be treated as legacy reference only, not current truth.

---

## 17. Phase 1 Non-Goals

These remain in the roadmap but are not required to start beta:

- Public pricing polish
- Full enterprise seat model
- App-store packaging
- Full 360 Tours UI
- Full Design Studio UI
- Full Content Studio UI
- BIM overlay workflows
- Full budget/schedule editor parity with dedicated external tools

---

## 18. Future Phases Retained

These must remain in docs and roadmap:

- Imported and editable schedules/budgets/SOV/invoices
- RFIs and submittals
- Versioned project finance records
- 360 scene links in deliverables
- 3D/BIM model links and overlays
- BIM layer toggles
- Richer notifications/SMS
- Deeper Operations Console business metrics
- Employee/department/admin access
- Integrations with external systems
- App-store rollout
- Monetization rollout
- Enterprise licensing

---

## 19. Verification Criteria for Phase 1

Before beta:

- [ ] Account creation works
- [ ] Beta access can be granted
- [ ] Slate360 shell works on web
- [ ] Slate360 installs as PWA
- [ ] Project creation works
- [ ] Site Walk session can start
- [ ] Photo capture works
- [ ] Notes + AI cleanup work
- [ ] Metadata saves correctly if required
- [ ] Item saving works
- [ ] Collaborator responses work (if implemented)
- [ ] Deliverables save
- [ ] Share links work
- [ ] PDF output is readable
- [ ] SlateDrop receives project files correctly
- [ ] Operations Console can see tester reports
- [ ] No placeholder modules are exposed in tester nav
