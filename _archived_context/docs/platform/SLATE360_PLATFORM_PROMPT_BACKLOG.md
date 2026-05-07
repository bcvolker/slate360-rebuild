# Slate360 Platform — Prompt Backlog

Last Updated: 2026-04-14
Doctrine Source: docs/SLATE360_MASTER_BUILD_PLAN.md

## Phase A — Pre-Design Implementation (Do Before Design Generation)

### P-A1: Hide Placeholder Modules from Navigation
- Remove Tours, Design Studio, Content Studio, Geospatial, Virtual Studio, Analytics from:
  - MobileNavSheet.tsx
  - MobileModuleBar.tsx
  - QuickNav.tsx
  - DashboardSidebar.tsx
- Beta testers must not see or reach these modules
- **Why now:** HIGH — Phase 1 doctrine requires only Site Walk visible

### P-A2: Fix MobileNavSheet Gate Inconsistency
- MobileNavSheet uses tier-based gates (canAccessTourBuilder) while other nav components use standalone gates (canAccessStandaloneTourBuilder)
- After P-A1, this becomes moot for hidden modules, but fix the pattern for Site Walk visibility
- **Why now:** HIGH — inconsistent gating model across nav

### P-A3: Add Beta Access Gate
- Owner must decide mechanism: invite code, beta flag, or approval queue
- Then implement:
  - Field on signup form or user record
  - Middleware check before granting dashboard access
  - CEO dashboard: view pending / approved beta users
- **Why now:** CRITICAL — signup is completely open, no gate exists

### P-A4: Wire Site Walk → SlateDrop Integration
- When /api/site-walk/upload stores a file to S3, also create slatedrop_uploads record
- Link to project's Site Walk subfolder in project_folders
- Verify provisioning.ts creates Site Walk subfolder on project creation
- **Why now:** CRITICAL — captures are a disconnected silo

### P-A5: Add Bug Reporting Form
- Accessible from any page (floating button or nav item)
- Fields: title, description, severity (optional), screenshot (optional), current URL (auto)
- Saves to DB table (new bug_reports or extend feature_suggestions)
- Visible in CEO dashboard
- **Why now:** MODERATE — beta testers need this

### P-A6: Rename Organization Language
- Hide "Organization" text from user-facing UI
- org-bootstrap.ts: Change "Bob's Organization" to user's name or "Personal Workspace"
- Audit all UI strings that reference "organization" and reframe
- **Why now:** MODERATE — individual-first doctrine conflict

### P-A7: Rebuild Operations Console
- Replace CeoCommandCenterClient.tsx mock data with real queries
- Add: beta user list with grant/revoke + expiry, all projects view, bug/feature triage with status workflow
- Add: collaborator invite visibility (which subscribers invited whom)
- Add: shared-project linking visibility (which subscribers share projects)
- Add: in-app notification log and delivery status
- Remove or hide: old pricing tables, mock metrics, placeholder revenue data
- **Why now:** HIGH — current page is legacy mock data, not usable for beta management

## Phase B — Owner Design Decisions (No Code Until Approved)

### P-B1: Command Center Layout Design
- Owner must approve what the main /dashboard shows
- Proposed elements: project launcher, recent activity, module launchers (Site Walk only), SlateDrop quick access
- Use v0 or wireframe ONLY after owner approves functional spec

### P-B2: Site Walk Capture UX Design
- Owner must approve: button placement, camera area, note input area, voice toggle placement
- Key requirement: thumb-friendly voice toggle, one-handed capture
- Use v0 or wireframe ONLY after owner approves

### P-B3: Mobile Navigation Design
- Owner must approve what appears in mobile PWA navigation
- Phase 1: only Slate360 shell + Site Walk + Projects + SlateDrop

### P-B4: Project Creation Flow Design
- Owner must approve what fields are collected on project create
- Minimum: name, location, scope. What else for Phase 1?

### P-B5: Beta Onboarding Flow Design
- Owner must approve the signup → beta gate → first-use experience
- Includes: welcome screen, first project creation prompt, Site Walk tutorial?

### P-B6: Collaborator Invite/Accept UX Design
- Owner must approve: how subscriber invites a collaborator, invitation format, accept flow
- Key decisions: email-only invite? In-app search? Invite link?
- Collaborator first-login experience: what do they see?

### P-B7: Collaborator Scoped Project View Design
- Owner must approve: what the collaborator sees instead of the full command center
- Proposed: project-scoped view showing assigned items, capture actions, notifications
- Must be distinct from subscriber experience

### P-B8: Subscriber-to-Subscriber Project Linking UX
- Owner must approve: how subscriber A invites subscriber B to share a project
- Key decisions: invitation in-app vs email, permission levels, how shared projects appear in each command center

### P-B9: Metadata + Notification Settings UX
- Owner must approve: how subscriber configures project-level metadata (geo, timestamp, weather)
- Owner must approve: notification preference UI (per-project email settings)
- Phase 1 defaults: timestamp always on, geo if device permits, email on collaborator submission

## Phase C — Post-Design Implementation

### P-C1: Implement Approved Command Center
- After P-B1 approved

### P-C2: Implement Site Walk UI Refinements
- After P-B2 approved

### P-C3: Implement Beta Onboarding Flow
- After P-B5 approved

### P-C4: Implement Subscriber-to-Subscriber Project Linking
- After P-B8 approved
- Create project_members or project_collaborators table
- Implement invite/accept API endpoints
- Show shared projects in both subscribers' command centers

### P-C5: Implement Collaborator Invitation Flow
- After P-B6 approved
- Implement: subscriber sends invite → collaborator receives → creates account → sees scoped view
- Enforce collaborator seat limits per subscriber tier
- CEO visibility into all collaborator invitations

### P-C6: Implement Collaborator Scoped View
- After P-B7 approved
- Collaborator sees project-scoped UI, not full command center
- Route handling: collaborator login → scoped project list → item view → capture actions

### P-C7: Implement In-App Notification System
- Notification table + delivery mechanism
- Triggers: collaborator submission, assignment completion, status changes, mentions
- Operations Console inbox for all notifications
- Subscriber project-level notification preferences (email toggles)

### P-C8: Implement Unified Bug/Feature Reporting
- Report form accessible from any page (floating button or nav item)
- Type: bug or feature request + module/location auto-populated
- Attachments, voice-to-text, AI cleanup support
- Operations Console triage with status workflow

### P-C9: Extract Project Hub Monoliths
- 9 files over 300-line limit
- Start with worst: management/page.tsx (931 lines)
- **Why:** Non-negotiable rule #1 but not beta-blocking

## Phase D — Beta Hardening

### P-D1: E2E Smoke Tests
- Auth flow: signup → confirm → login → dashboard
- Project creation → SlateDrop folder provisioned
- Site Walk: create session → capture → review → deliverable → share
- Billing: checkout → webhook → entitlement active

### P-D2: Verify Offline Capture
- Connect lib/offline-queue.ts to CaptureCamera.tsx and CaptureTextNote.tsx
- Test: capture in airplane mode → reconnect → sync

### P-D3: Verify PDF Export
- Test /api/site-walk/deliverables/[id]/export
- Confirm readable PDF output

### P-D4: Verify Email Sharing
- Test Resend integration for deliverable sharing
- Confirm recipient gets working link

### P-D5: E2E Collaborator Flow
- Subscriber invites collaborator → collaborator signs up → sees scoped project → submits photo → subscriber notified
- Verify collaborator cannot access full command center or other projects
- Verify tier limit enforcement (reject invite when at max collaborators)

## Deprioritized (Not Phase 1)

### P-X1: Third-Party Integration Activation
- Procore, Autodesk, DocuSign — future

### P-X2: Real-Time Collaboration
- WebSocket presence — future

### P-X3: White-Label / Multi-Tenant
- Org branding expansion — future

### P-X4: Full Subscription Management UI
- Upgrade/downgrade/cancel — after beta
