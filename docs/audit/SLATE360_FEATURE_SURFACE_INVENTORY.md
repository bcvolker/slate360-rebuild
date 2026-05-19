# Slate360 Feature Surface Inventory

Last Updated: 2026-05-14
Status: Read-only audit. No code changes.

## 1. Slate360 App Shell

| Feature | Status | V1? | Post-Launch? |
|---|---|---|---|
| Global header (MobileTopBar) | Functional | Replace with V1 header | — |
| Global search (CommandPalette) | Functional | Keep | — |
| Notifications (bell icon + dropdown) | Partial — UI exists, no backend table | Include in V1 | Wire backend |
| Share/invite (InviteShareModal) | Functional | Keep | — |
| Bug report (BetaFeedbackModal) | Functional | Keep | — |
| Feature suggestion (/api/suggest-feature) | Functional | Keep | — |
| Profile/avatar menu | Functional (MobileTopBar avatar) | V1 header has avatar menu | — |
| App switcher (nav items) | Functional + app-store-mode gating | Keep gating | — |
| Entitlement-gated visibility | Functional | Keep | — |
| Desktop sidebar (DashboardSidebar) | Functional | V1 Shell has sidebar | — |
| Mobile bottom nav (MobileBottomNav) | Functional (context-switches by path) | V1 has 5-tab nav | — |

## 2. Site Walk Home

| Feature | Status | V1? | Post-Launch? |
|---|---|---|---|
| Command center layout | Functional (SiteWalkHub) | Replace UI | — |
| Recent walks list | Functional | Wire to V1 Recent tab | — |
| Active walks list | Functional | Wire to V1 Active tab | — |
| Shared with me | Backend ready (collaborator projects) | Wire to V1 Shared tab | — |
| Needs review | Backend ready (inbox API) | Wire to V1 Needs Review tab | — |
| New worksite/project button | Functional | Wire to V1 action grid | — |
| Start walk button | Functional | Wire to V1 action grid | — |
| Quick capture button | Functional | Wire to V1 action grid | — |
| SlateDrop access | Functional (More page link) | V1 has SlateDrop tab + Home row | — |
| Coordination access | Backend APIs ready | V1 has Coordination tab + Home row | — |
| Deliverables access | Functional (nav) | V1 has Deliverables tab + Home row | — |
| Summary counts (open items, needs review, drafts, unsynced) | Functional | Wire to V1 | — |

## 3. Worksites / Projects

| Feature | Status | V1? | Post-Launch? |
|---|---|---|---|
| Create field project (worksite) | Functional — all tiers | Yes | — |
| Create full project | Functional — business+ gated | Yes (gated) | — |
| Edit project | Functional | Yes | — |
| Rename project | Functional | Yes | — |
| Archive/delete | Functional | Yes | — |
| Open project | Functional | Yes | — |
| Plans & Documents | Functional (SlateDrop + plan sets) | Yes (renamed from Plan Room) | — |
| SlateDrop folders | Functional (auto-provisioned) | Yes | — |
| Collaborators | Functional (invite/revoke) | Yes | — |
| Leadership view (board) | Functional (board API) | — | Post-launch |
| Project-level sharing | Functional (external links) | Yes | — |
| Upgrade field → full | Backend ready (converted_from_id) | — | Post-launch |
| Full PM tools (RFIs, submittals, budget, schedule) | Functional (project-hub) | Hidden for V1 | Post-launch |
| Project stakeholders directory | Functional | — | Post-launch |
| Project contracts | Functional | — | Post-launch |

## 4. Setup / Create Worksite / Start Walk

| Feature | Status | V1? | Post-Launch? |
|---|---|---|---|
| Worksite/project selection | Functional (SiteWalkSetupClient) | Yes | — |
| Walk type selection | Functional | Yes | — |
| Title entry | Functional | Yes | — |
| Plan upload | Functional (PlanUploaderCard) | Yes | — |
| Document upload | Functional (SlateDrop) | Yes | — |
| Choose existing plan set | Functional (plan sets API) | Yes | — |
| Use clean copy | Backend ready (plan set duplication) | — | Post-launch |
| Reuse existing with pins/markup | Backend ready (session_plan_sheets) | Yes | — |
| Collaborators | Functional (invite flow) | — | Post-launch |
| Metadata entry | Partial | — | Post-launch |
| SlateDrop folder creation | Functional (auto-provision) | Automatic | — |

## 5. Plan Workspace

| Feature | Status | V1? | Post-Launch? |
|---|---|---|---|
| Plan display (Leaflet) | Functional | Yes | — |
| Sheet navigation UI | **Missing** — data model exists, no picker | Build for V1 | — |
| Sheet thumbnails | **Missing** | — | Post-launch |
| Search plan text | **Missing** | — | Post-launch |
| Pin list | Partial (PlanQuickActionMenu) | Build for V1 | — |
| Layer toggles | **Missing** | — | Post-launch |
| Plan pan/zoom | Functional | Yes — do not touch | — |
| Long-press pin creation | Functional | Yes — do not touch | — |
| Saved pin open | Functional | Yes — do not touch | — |
| Saved pin move | **Missing** | Build for V1 | — |
| Saved pin delete | **Missing** | Build for V1 | — |
| Plan-linked capture | Functional | Yes — do not touch | — |

## 6. Capture Workspace

| Feature | Status | V1? | Post-Launch? |
|---|---|---|---|
| Quick capture | Functional | Yes | — |
| Plan-linked capture | Functional | Yes | — |
| Camera (getUserMedia) | Functional | Yes | — |
| Camera roll/file picker | Functional | Yes | — |
| Multiple angles | UI exists (PhotoAngleStrip) | — | Post-launch |
| Before/after | Backend ready (item_relationship) | — | Post-launch |
| Ghost alignment | **Missing** | — | Post-launch |
| Attachments (file pins) | Functional | Yes | — |
| Pin files to photo | Functional (PhotoAttachmentPins) | Yes | — |
| Markup tools | Functional (PhotoMarkupCanvas) | Yes | — |
| Notes | Functional (CaptureQuickNotePanel) | Yes | — |
| Categories | Functional (CaptureItemForm) | Yes | — |
| Status/assignee/priority | Functional | Yes | — |
| Metadata: timestamp/GPS/weather/device | Functional (auto-captured) | Yes | — |
| Offline queue | Partial (IndexedDB + sync) | Yes — needs device testing | — |
| Save and continue | Functional | Yes | — |
| Save and return to plan | Functional | Yes | — |

## 7. Details / Data Entry

| Feature | Status | V1? | Post-Launch? |
|---|---|---|---|
| Note | Functional | Yes | — |
| Category | Functional | Yes | — |
| Assignee | Functional | Yes | — |
| Status | Functional | Yes | — |
| Priority | Functional | Yes | — |
| Trade | Functional | Yes | — |
| Custom tags | Functional | Yes | — |
| Link to previous/progression | Functional (item_relationship) | — | Post-launch |
| AI format note | Functional (notes/format API) | Yes | — |
| Review/finish walk | Functional (SessionReviewClient) | Yes | — |
| Edit prior stop | Functional (item PATCH) | Yes | — |

## 8. SlateDrop

| Feature | Status | V1? | Post-Launch? |
|---|---|---|---|
| Folder hierarchy | Functional | Yes | — |
| Auto project/worksite folders (17) | Functional | Yes | — |
| Plans folder | Functional | Yes | — |
| Photos folder | Functional + auto-filing | Yes | — |
| Captures/walk data | Functional + auto-filing | Yes | — |
| Deliverables folder | Functional + auto-filing | Yes | — |
| Shared drops (secure send) | Functional | Yes | — |
| File requests (external upload) | Functional | Yes | — |
| Upload/download | Functional (presigned S3/R2) | Yes | — |
| ZIP export | Functional | Yes | — |
| Soft delete/restore | Functional | Yes | — |
| Project audit export | Functional | — | Post-launch |

## 9. Coordination

| Feature | Status | V1? | Post-Launch? |
|---|---|---|---|
| Contacts (ContactsClient) | Functional | Yes | — |
| Assignments (AssignmentPanel) | Functional | Yes | — |
| Comments (CommentThread) | Functional | Yes | — |
| Inbox (InboxTabs) | Functional | Yes | — |
| Shared with me | Functional (collaborator projects) | Yes | — |
| Invitations (invite flow) | Functional | Yes | — |
| Notifications (bell icon) | Partial — UI only, no backend | Include | Wire backend |
| Schedule/calendar (CalendarClient) | Functional | Yes | — |
| iOS/Android calendar integration | **Missing** | — | Post-launch |
| Org/member visibility | Functional | Yes | — |
| Cross-user collaboration | Functional (assignments + comments) | Yes | — |
| Collaborator-only experience | Functional (CollaboratorShell) | Yes | — |

## 10. Deliverables

| Feature | Status | V1? | Post-Launch? |
|---|---|---|---|
| Create deliverable from walk | API ready, UI is redirect stub | Build creation form | — |
| Create from selected stops | API ready | — | Post-launch |
| Visual walk summary | API ready (report type) | Yes | — |
| Punch/issue package | API ready (punchlist type) | Yes | — |
| Proposal package | API ready (proposal type) | — | Post-launch |
| Before/after | API ready (item_relationship) | — | Post-launch |
| Progress timeline | API ready (status_report) | — | Post-launch |
| 360 tour | API ready (virtual_tour type) | — | Post-launch |
| 3D model review | API ready (model_viewer type) | — | Post-launch |
| Closeout record | API ready (client_review type) | — | Post-launch |
| PDF export | Functional (jsPDF) — images placeholder | Yes — fix images | — |
| Hosted share link | Functional | Yes | — |
| Email/text share | Functional (3 modes) | Yes | — |
| Public viewer | Functional (token-gated) | Yes | — |
| Branded output | Functional (brand_snapshot) | Yes | — |
| Viewer analytics/tracking | Functional | Yes | — |
| Block editor | Partial (wireframe only) | — | Post-launch |
| Interactive renderers | **Missing** | — | Post-launch |

## 11. Operations Console

| Feature | Status | V1? | Hidden? |
|---|---|---|---|
| Owner-only access | Functional | Admin-only | Yes (hidden from normal users) |
| Pending user approvals | Functional | Admin-only | — |
| Approve/deny users | Functional | Admin-only | — |
| Grant app access | **Missing** — no UI | — | Post-launch |
| Manage entitlements | **Missing** — no UI | — | Post-launch |
| Beta/foundational users | Functional | Admin-only | — |
| Feedback/bug review | Functional | Admin-only | — |
| Feature suggestion review | Functional | Admin-only | — |
| Org management | Stub | — | Post-launch |
| Subscription oversight | Stub | — | Post-launch |
| Audit logs | Stub | — | Post-launch |

## 12. Account / Profile

| Feature | Status | V1? | Post-Launch? |
|---|---|---|---|
| Profile editing | Functional (user_profiles) | Yes | — |
| Subscription display | Functional | Yes | — |
| Billing (Stripe portal) | Functional | Yes | — |
| Organization switcher | Partial (single-org model) | — | Post-launch |
| App preferences | Partial (UI exists) | Yes | — |
| Support/help | **Missing** — no route | Build minimal page | — |
| Bug report/feature request | Functional (feedback + suggest) | Yes | — |
| Account deletion | Functional | Yes | — |
| Privacy/terms links | Functional (/privacy, /terms) | Yes | — |
