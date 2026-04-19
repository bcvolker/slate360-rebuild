# Slate360 Master Build Plan — Phase 1 Beta Doctrine

Last Updated: 2026-04-14

---

## 0. How to Read This Document

This is the single source of truth for product direction, architecture, and Phase 1 scope.
All other build files (SITE_WALK_BUILD_FILE.md, SLATEDROP_BUILD_FILE.md, etc.) must align with this document.
If a module-level doc conflicts with this file, this file wins.

**We are optimizing for:**
- Private beta with controlled access
- Slate360 shell + Site Walk as the working Phase 1 product
- Project-connected records and file/history integrity
- Mobile + web continuity via PWA
- Beta onboarding and Operations Console oversight

**We are NOT optimizing first for:**
- Final public pricing
- All bundles
- All modules being live
- App-store rollout
- Speculative placeholder UI
- Enterprise-first assumptions

---

## 1. What Is Slate360 — Fixed Doctrine

Slate360 is the main app/platform shell. One product. One system.

- **One account system** — every user has one Slate360 account
- **One backend** — Supabase + S3 + Stripe + Vercel
- **One data model** — projects, files, sessions, deliverables all in one DB
- **One entitlement system** — a single resolver determines what each user can access
- **One cross-platform product surface** — web and installed app are the same thing
- **Usable from web** — the website after login IS the Slate360 app
- **Installable as a PWA** — same code, same backend, same auth
- **Native wrappers later if needed** — Tauri/Capacitor/React Native are future options, not Phase 1

### Modules Inside Slate360

| Module | Phase 1 Status |
|--------|---------------|
| Site Walk | **Active** — the first real usable module |
| 360 Tours | Hidden from beta testers |
| Design Studio | Hidden from beta testers |
| Content Studio | Hidden from beta testers |

These are modules inside Slate360, NOT separate standalone products with separate auth stacks.

### What Is NOT a Separate App

- Site Walk is NOT "the Site Walk app." It is "the Site Walk module inside Slate360."
- Users do NOT download a separate Site Walk app. They install Slate360 as a PWA.
- Site Walk does NOT have its own auth flow, its own login page, or its own account system.
- There is no "app store" of standalone apps in Phase 1.

---

## 2. User/Account Model — Fixed Doctrine

### Individual-First Licensing

This is the canonical user model. This must be reflected in all code, docs, and UI.

- Each user has **one seat / one license**
- Users are treated as **independent by default**
- Users may work for totally different companies
- Users may have completely unrelated projects
- Users are **NOT assumed to belong to a shared organization** in the enterprise sense by default
- An "organization" in the DB is a billing/entitlements wrapper — not a corporate entity the user must understand

### Shared Project Collaboration — Subscriber-to-Subscriber

Even though users are independent by default, paying subscribers can collaborate:

- A user creates their own account independently
- A user owns their own projects independently
- A user can be linked to one or more shared projects with other subscribers
- Multiple subscribers collaborate on the same project while maintaining separate accounts/seats
- Project-level collaboration does NOT require users to be in the same "org"

**Subscriber-to-subscriber linking workflow:**
1. Subscriber A invites Subscriber B to a shared project (by email or Slate360 username)
2. Subscriber B receives an invitation (in-app notification + optional email)
3. Subscriber B accepts the invitation
4. Both subscribers now see the project in their own command center
5. Permissions are granted at the project level — not account-wide
6. Either subscriber can revoke the link

This is NOT automatic. There is no "org" that bundles users together. Each subscriber explicitly chooses who to collaborate with on which projects.

### Collaborator Role — Non-Subscriber Limited Access

A **collaborator** is a separate role from a subscriber. Collaborators are NOT paying users. They are invited by a paying subscriber to participate in specific projects with limited capabilities.

**Key rules:**
- A collaborator does NOT have a full Slate360 subscription
- A collaborator is invited by a subscriber who DOES have a subscription
- A collaborator's access is scoped to the specific project(s) they are invited to
- A collaborator must install Slate360 (PWA or web login) and create an account
- A collaborator does NOT get full module access — only project-scoped capabilities
- **Site Walk Standard** tier: **0 collaborators** (solo use)
- **Site Walk Pro** tier: up to **3 collaborators per subscriber**
- Collaborator allowance is per subscriber, not per project

**What a collaborator CAN do:**
- View shared/assigned project items
- Submit photos from the field
- Respond to punch items / inspection findings
- Submit limited reports if allowed by subscriber
- Use measurements if enabled for the project
- Mark items as: pending / in progress / needs review / complete / needs attention
- Use geolocation tagging on captures
- Use voice-to-text for notes
- Use AI cleanup / spell check on their own notes
- Attach text, voice, or short video memos to specific items/issues
- Trigger notifications to the subscribing user when they submit/update something
- Complete assignments given to them

**What a collaborator CANNOT do:**
- Access full Slate360 command center by default
- Access all project files/folders by default (only what permissions allow)
- Create new projects
- Invite other collaborators
- Manage billing, admin, or module settings
- Access Operations Console
- Access unrestricted project-wide controls unless granted
- See other subscribers' projects or data
- Disable background metadata (timestamp, geolocation, weather) if subscriber/project requires them

**Open collaborator decisions (owner must decide):**
- Whether collaborators can create new items or only respond to existing
- What invite UX should be (email only? in-app search? invite link?)
- What first-login scoped view should be
- Whether collaborators can access full project file browser or only item-scoped files

**Collaborator onboarding path:**
1. Subscriber invites collaborator (by email, SMS, or both — SMS via Twilio, email via existing `lib/email.ts`)
2. Collaborator receives invite link (and/or QR for in-person handoff)
3. Collaborator creates a Slate360 account (lightweight — no subscription required)
4. Collaborator installs Slate360 PWA (or uses web)
5. Collaborator sees ONLY the project(s) they were invited to (Collaborator Shell)
6. Collaborator can immediately start field work within their project scope

If the collaborator already has their own Slate360 subscription, they
keep their full dashboard — the inviting subscriber's project shows up
under `Projects → Shared with me` with the collaborator-scoped
permissions intact.

This is distinct from the subscriber onboarding path (Section 7).

**Detailed data model + UI surfaces** for the collaborator system —
including the new `project_collaborator_invites` table, the
`Project › People` tab packaging, the view selector that also serves
ASU directors / leadership-viewers, and the back-end status table —
live in [`slate360-context/ORG_ROLES_AND_PERMISSIONS.md`](../slate360-context/ORG_ROLES_AND_PERMISSIONS.md). That document is the single source of truth
for what is built vs. what is still a gap.

### Future Enterprise Model

Enterprise/bulk licensing will come later. Phase 1 priorities:
- Independent subscriber accounts
- Project-level linking/collaboration between subscribers
- Collaborator invitations from subscribers for limited field access
- Operations Console ability to manage and connect users/projects

### Current Repo Reality (Conflict)

The current codebase uses an **org-first model** that conflicts with individual-first:

| Conflict | File | Problem |
|----------|------|---------|
| Auto org creation | lib/server/org-bootstrap.ts | Creates "Bob's Organization" on signup — confusing for individual users |
| Org-scoped entitlements | lib/entitlements.ts, lib/server/org-context.ts | All entitlements resolve from organizations.tier and org_feature_flags |
| Org-scoped data | site_walk_sessions.org_id | Site Walk data scoped to org, not just project |
| Org middleware | middleware.ts | Every request resolves org context |

**Phase 1 resolution strategy (owner decision needed):**

Option A — **Thin org wrapper**: Keep the organizations table but rename/reframe it as a "personal workspace." Each user gets one automatically. Project collaboration still works through project-level sharing. Rename UI references from "Organization" to "Workspace" or hide org language entirely.

Option B — **User-scoped entitlements**: Move subscriptions and entitlements to the user level. Remove org requirement for basic access. Add project-level collaboration table. Significant refactor.

**Recommended**: Option A for Phase 1. Low-risk, achieves the "individual-first" UX without rewriting the entitlement system. The org still exists in the DB but users never see "organization" in the UI.

---

## 3. Phase 1 Exposed Modules

For beta, the functional focus is:

| Surface | Status | What Users See |
|---------|--------|---------------|
| Slate360 command center | Functional, needs design | Main dashboard after login |
| Projects | Functional (Project Hub) | Create/manage projects with data fields |
| SlateDrop | Functional | File manager for project files |
| Site Walk | Functional | Field capture, deliverables, sharing |

### Modules That Must Be Hidden from Beta Testers

- 360 Tours — shell only, no real UI
- Design Studio — shell only, no real UI
- Content Studio — shell only, no real UI
- Geospatial — pure placeholder
- Virtual Studio — pure placeholder
- Analytics — placeholder

**Hidden means:**
- Not in sidebar navigation
- Not in mobile nav
- Not in module bar
- Not reachable from any link a tester can discover
- Route still exists (for development), but excluded from all nav components

---

## 4. Phase 1 Functional Workflow Doctrine

### Office / Web Workflow

1. User creates account on slate360.ai
2. User gets beta access (code, flag, approval, or invite)
3. User logs into Slate360 command center on desktop/web
4. User creates a project
5. User enters or uploads project information:
   - Project name, location, scope
   - Milestones, schedule, budget
   - Drawings
   - Later: RFIs, submittals, and more
6. Project data becomes part of the project record
7. Project folder structure is automatically created in SlateDrop
8. User can later open the same project from Site Walk

### Field / Mobile Workflow

1. User installs Slate360 as a PWA on phone (same system, same account)
2. User logs in (same credentials)
3. User opens Site Walk module inside Slate360
4. User selects a project already created in Slate360
5. User begins a Site Walk session
6. User takes photos
7. User types notes or uses voice-to-text
   - Voice input must be easy to toggle on/off with thumb
8. User can use an AI boost action to:
   - Clean up wording
   - Bullet-point notes
9. User can manually edit notes
10. User can attach fields: urgency, due date, assignee, other metadata
11. Saved items become part of that project's running record
12. User can create deliverables: punch lists, proposals, inspections, reports
13. Office-side users can view the project and see field-collected work

### Critical: One App, Not Multiple Apps

- Users install ONE Slate360 PWA
- They do NOT need a separate auth/account for Site Walk
- Site Walk is a module inside Slate360
- Web and installed app use the same backend, same projects, same records
- Do NOT drift into a "separate Site Walk app" architecture

---

## 5. SlateDrop / Project Records Doctrine

### Project-Centric Foldering

When a project is created:
1. A project folder is created in a Projects area in SlateDrop
2. Subfolders are created for current supported record types:
   - Deliverables (punch lists, inspection reports, proposals, etc.)
   - Photos (field captures, progress photos, markup images)
   - Schedules / Budgets / SOV (uploaded or entered data)
   - Plans / Drawings
   - Reports
   - RFIs / Submittals
   - Attachments / Misc
3. A history/archive area exists for project records
4. Additional subfolders can be added by subscribers as features grow

### Site Walk Integration (CRITICAL GAP)

Site Walk captures and deliverables **must not remain a disconnected storage silo.**
They need to appear in the project's record/folder structure in SlateDrop so users experience one connected system.

**Current state**: Site Walk uploads go to S3 at site-walk/photos/{orgId}/{sessionId}/... There is ZERO integration with project_folders or slatedrop_uploads. This must be fixed before beta.

**Required fix**: When a Site Walk session creates items with photos, those files must be registered in SlateDrop's slatedrop_uploads table and linked to the project folder tree. Users browsing their project in SlateDrop should see Site Walk captures.

### Collaboration and Permissions

Subscribers must be able to:
- Create additional custom folders
- Share upload/download permissions at the folder or file level
- Collaborate through project-linked records and files
- Use this on mobile as well as web

Collaborators can only:
- View files within their assigned project scope
- Upload to items they are working on
- Download files they have access to
- They CANNOT browse the full SlateDrop UI or manage folder structure

### History / Archive Behavior (Required)

- Project records must have history tracking — who uploaded/modified/shared, when, and from where
- Deliverables should save to a deliverables folder automatically
- Photos go to photos folder
- Schedules, budgets, attachments, and reports go to their respective folders
- Version history for files is a future-phase feature but the folder/metadata structure should support it

### Future-Phase File Goals

| Feature | Phase | Notes |
|---------|-------|-------|
| Version history per file | Phase 2 | Track re-uploads, rollback |
| Editable imported schedule/budget data | Phase 2 | Parse and normalize uploaded files |
| AI-assisted document normalization | Phase 3+ | OCR, classification, auto-tagging |
| Project export / archive packages | Phase 2 | ZIP download with full project structure |
| BIM/model-linked file behaviors | Phase 3+ | 3D model overlays, linked documents |
| Advanced per-file permissions | Phase 2 | Beyond folder-level sharing |

---

## 6. Operations Console (Replaces "CEO Page" Terminology)

### Owner Account

The owner account is: slate360Ceo@gmail.com

The internal admin surface is now called the **Operations Console**, not "CEO page."
Old references to "CEO page," "CEO dashboard," or "CeoCommandCenter" in code are legacy naming — the concept is the Operations Console.

### Phase 1 Operations Console Capabilities (Rescoped)

The Operations Console must serve the beta — NOT the old pricing/tier scaffold. Do NOT treat CeoCommandCenterClient.tsx mock data or pricing tables as current truth. The Operations Console must be rebuilt around actual Phase 1 needs.

**What the Operations Console must provide in Phase 1:**
- Access restricted to slate360Ceo@gmail.com (/ceo — exists, gated correctly)
- **Beta user management**: See all beta users, grant/revoke beta access (with optional expiry), see signup dates and activity
- **Project visibility**: See all projects across all users
- **Collaborator/subscriber linking visibility**: See who has invited collaborators, to which projects, and collaborator activity; see which subscribers share projects
- **Bug report inbox**: See all bug reports submitted by testers, with severity and status
- **Feature request inbox**: See all feature suggestions, with status
- **Issue triage/status workflow**: Mark bugs as acknowledged/in-progress/resolved; mark features as planned/deferred
- **User management**: Deactivate users, reset access, view account details
- **Admin metrics**: Signups, active users, sessions created, deliverables shared

**What the Operations Console should NOT contain in Phase 1:**
- Pricing management UI (prices are TBD)
- Bundle/tier configuration UI
- Stripe product management
- Revenue dashboards (no real revenue in beta)
- Multi-tenant/enterprise admin features
- Any mock data or placeholder tables pretending to show real metrics

**Future Operations Console capabilities (Phase 2+):**
- Business/profit/churn/investor metrics
- Pricing/content/admin controls
- Employee/admin scoped access (not just owner)
- Revenue and subscription dashboards
- Advanced analytics and user behavior tracking

No other users should see or access the Operations Console.

### Current State (Legacy — Needs Rework)

- /ceo route exists, gated to slate360Ceo@gmail.com via canAccessCeo
- CeoCommandCenterClient.tsx is **mock-data driven with TBD pricing** — treat as LEGACY, not current truth
- A separate /super-admin route also exists with app_metadata.is_super_admin gate
- **Decision needed**: Merge these into one Operations Console or keep them separate
- The Operations Console must be rebuilt to serve beta management, not pricing/tier administration

---

## 7. Beta Onboarding Doctrine

### Beta Access Control (CRITICAL GAP)

For private beta:
- User creates account
- Beta access is controlled (code, flag, approval, invite, or equivalent)
- Testers should only see the working parts of Slate360 + Site Walk
- Placeholder module shells must NOT be reachable in normal tester navigation

**Current state**: Signup is completely open. No beta flag, invite code, waitlist, or approval step exists in app/signup/page.tsx or middleware.ts.

**Must be implemented before beta launch**: One of:
- Invite code field on signup
- Beta flag in user profile / org record, checked by middleware
- Approval queue visible to CEO
- Waitlist with manual activation

### Separate Onboarding Paths

There are TWO distinct onboarding flows. They must NOT be conflated.

#### Subscriber Onboarding (paying user)
1. User visits slate360.ai
2. User signs up with email (must pass beta gate)
3. User confirms email
4. User lands on Slate360 command center
5. User sees: project creation, module launchers (Site Walk), SlateDrop
6. User creates a project
7. User starts using Site Walk for field capture
8. User can invite collaborators to their projects (up to tier limit)
9. User can invite other subscribers to share projects

#### Collaborator Onboarding (invited non-subscriber)
1. Subscriber sends invite to collaborator's email
2. Collaborator receives invite link with project context
3. Collaborator clicks link → lands on lightweight signup (no subscription required)
4. Collaborator creates account and installs Slate360 PWA
5. Collaborator sees ONLY the project(s) they were invited to
6. Collaborator can immediately start assigned field work
7. Collaborator does NOT see the full command center, SlateDrop, or other modules
8. Collaborator's experience is project-scoped from first login

**Key difference:** Subscribers see the full Slate360 shell. Collaborators see a scoped project view. These are different experiences and must be handled by the entitlement/routing system.

### Bug Reporting and Feature Suggestions

Phase 1 must make it easy for testers to:
- Report bugs
- Suggest features

From:
- Slate360 command center
- Site Walk
- Any web or mobile surface

#### Unified Reporting Flow (Phase 1)

All bug reports and feature suggestions use a single flow:

1. User triggers report (floating button, nav item, or context menu)
2. **Report type**: Bug or Feature Request (user selects)
3. **Module/location**: Auto-populated from current page context; user can change
4. **Title**: Short summary
5. **Description**: Text field with voice-to-text and AI cleanup support if feasible
6. **Attachments**: Screenshots, video clips, files allowed
7. **Severity** (bugs only): Low / Medium / High / Critical (optional for users, triaged by owner)
8. Submission saves to DB and is immediately visible in Operations Console
9. Owner/Operations Console can set status: acknowledged / in-progress / resolved (bugs) or planned / deferred (features)

**Current state**: A "Suggest a Feature" widget exists on the dashboard (saves to feature_suggestions table). There is NO dedicated bug reporting UI.

**Gap**: Need a unified report form accessible from any page. The Operations Console should see all submissions with filtering by type, module, severity, and status.

---

## 8. Design Process Doctrine

The owner wants to be actively involved in the design process.

### Rules

1. AI must NOT invent final layout/workflow decisions without owner approval
2. Placeholder UI must NOT be treated as "done"
3. v0 or any design-generation tool should only be used AFTER the Phase 1 functional spec is approved
4. Implementation must follow approved workflows, not just attractive mockups
5. Existing backend capabilities should be reused where possible instead of blindly rebuilding
6. Design work follows this sequence:
   - Functional requirements approved by owner
   - Wireframe/layout proposed (can use v0 or similar)
   - Owner reviews and approves
   - Implementation follows the approved design
   - Owner verifies implementation matches intent

### What Must Be Decided Before Design Generation Begins

1. Command center layout — owner must approve what appears on the main dashboard
2. Site Walk field capture UX — owner must approve the capture flow, button placement, voice toggle
3. Project creation flow — owner must approve what fields are collected and how
4. SlateDrop integration — owner must approve how Site Walk files appear in project folders
5. Mobile navigation — owner must approve the module nav for PWA
6. Beta onboarding flow — owner must approve signup → beta gate → first-use experience

---

## 9. Access Layers (Gating Architecture)

### Layer 0: Public Marketing
Unauthenticated users see: homepage, pricing, learn-more pages. CTA to sign up.

### Layer 1: Platform Shell
Authenticated users (any tier, including trial) can access:
- Dashboard home (command center — may be limited state if no subscription)
- Pricing / billing / manage subscription
- Settings (account, profile)
- App catalog (shows available modules with status)

### Layer 2: Workspace Activation
Requires at least one paid module or beta flag:
- Create and manage projects
- SlateDrop file management
- Calendar / contacts (if built)
- Project collaboration

### Layer 3: Module Access — Phase 1 Beta
Only Site Walk is accessible:
- /site-walk/* requires Site Walk entitlement (or beta flag)
- Tours, DS, CS routes exist but are NOT linked from any navigation

### Entitlement Resolution

Current system resolves from org-level flags. For Phase 1 this works if the "org" is reframed as a personal workspace (see Section 2).

---

## 10. Route Architecture (Current State)

### Public (unauthenticated)
```
/                       Homepage
/pricing                Pricing page
/login                  Auth
/signup                 Auth (needs beta gate)
/forgot-password        Password reset
```

### Authenticated Shell
```
/dashboard              Command center (Slate360 app home)
/project-hub            Project list + creation
/project-hub/[id]/*     Project sub-pages (14 tabs)
/slatedrop              File management
/my-account             Account settings (5 tabs)
/plans                  Subscription management
```

### Site Walk (active module)
```
/site-walk              Landing / project selector
/site-walk/[projectId]/sessions           Session list
/site-walk/[projectId]/sessions/[id]      Session capture
/site-walk/[projectId]/sessions/[id]/review  Session review
/site-walk/[projectId]/deliverables/new   New deliverable
/site-walk/board        Session board view
```

### Internal (Operations Console only)
```
/ceo                    Operations Console
/market                 Market Robot (CEO access)
/athlete360             Athlete360 (CEO access)
```

### Hidden from Phase 1 (routes exist, no nav links)
```
/tours                  360 Tours (shell)
/design-studio          Design Studio (shell)
/content-studio         Content Studio (shell)
```

---

## 11. Web vs App — Fixed Rule

The website after login IS the web version of the Slate360 app. The downloadable PWA IS the same thing in a mobile-optimized shell.

- Same auth (Supabase)
- Same database (Supabase)
- Same API (Next.js API routes)
- Same entitlements (resolveOrgEntitlements)
- Same project data
- Same file storage (S3)

Only the client surface changes:
- Browser = web app
- PWA install = feels like native
- Later: native wrappers if needed

Do NOT build separate auth, billing, or product logic for "web" vs "app." One system, many surfaces.

---

## 12. Module Availability Status

| Module | Beta Visible | Purchase Available | Fully Implemented |
|--------|-------------|-------------------|-------------------|
| Site Walk | Yes | When checkout is wired | Backend: 95%, UI: needs design |
| 360 Tours | No — hidden | No | Shell + 7 API routes, no UI |
| Design Studio | No — hidden | No | Shell + 5 API routes, no UI |
| Content Studio | No — hidden | No | Shell + 4 API routes, no UI |
| Geospatial | No — hidden | No | Pure placeholder |
| Virtual Studio | No — hidden | No | Pure placeholder |

Do NOT sell unfinished modules. Do NOT show them to testers.

---

## 13. Current Codebase Conflicts with Doctrine

These must be resolved before beta launch. See Section 2 for the org-model discussion.

| # | Severity | Area | Issue | File(s) |
|---|----------|------|-------|---------|
| 1 | CRITICAL | Identity | Auto org creation shows "Bob's Organization" — confusing for individual users | lib/server/org-bootstrap.ts |
| 2 | CRITICAL | Integration | Site Walk uploads are disconnected S3 silo with no SlateDrop flow | app/api/site-walk/upload/route.ts |
| 3 | CRITICAL | Access | No beta gating mechanism — signup is open to anyone | app/signup/page.tsx, middleware.ts |
| 4 | HIGH | Navigation | Tours/DS/CS/Geo/Virtual visible in nav for standard+ users | MobileNavSheet.tsx, MobileModuleBar.tsx, QuickNav.tsx, DashboardSidebar.tsx |
| 5 | HIGH | Architecture | Site Walk has own layout tree separate from Slate360 shell | app/site-walk/layout.tsx vs app/(apps)/layout.tsx |
| 6 | HIGH | Architecture | app-data.ts defines 6 standalone "apps" — multi-app marketplace concept | components/apps/app-data.ts |
| 7 | MODERATE | Data model | Site Walk data doubly scoped (org_id + project_id) — org scope redundant | site_walk_sessions schema |
| 8 | MODERATE | Feedback | No bug reporting UI — only feature suggestions widget | Dashboard widgets |
| 9 | LOW | Pricing | Hardcoded prices in billing-apps.ts could surface if checkout triggered | lib/billing-apps.ts |
| 10 | LOW | Admin | Two admin concepts: Operations Console (/ceo) and Super Admin (/super-admin) | ceo/ and super-admin/ routes |
| 11 | HIGH | Admin | CeoCommandCenterClient.tsx has mock data and old pricing tables — does NOT reflect Phase 1 Operations Console needs | components/dashboard/CeoCommandCenterClient.tsx |
| 12 | HIGH | Collaboration | No collaborator role exists — no DB table, no invite flow, no scoped view | Greenfield — needs schema + API + UI |
| 13 | MODERATE | Collaboration | No subscriber-to-subscriber project linking workflow — Section 2 defines it but no implementation exists | Greenfield — needs project_members/project_collaborators table |

---

## 14. What Still Needs Owner Decisions Before Design Starts

1. **Org model resolution**: Option A (thin wrapper, rename to "workspace") or Option B (user-scoped entitlements)?
2. **Command center layout**: What should the main dashboard show? Owner must approve before v0 design.
3. **Site Walk capture UX**: Button placement, voice toggle, AI boost — owner must approve flow.
4. **Beta gate mechanism**: Invite code? Beta flag? Approval queue? Which one?
5. **Bug reporting scope**: Standalone form? Widget? Floating button? What fields?
6. **Project creation fields**: What exactly is collected on project create for Phase 1?
7. **Mobile navigation structure**: What tabs/buttons appear on the mobile PWA?
8. **Site Walk to SlateDrop integration**: Auto-sync captures or manual?
9. **Operations Console content**: What beta management views are needed? (See Section 6 for proposed scope)
10. **Subscriber-to-subscriber collaboration model**: How do subscribers invite each other to shared projects? In-app only? Email? Both?
11. **Collaborator tier limits**: How many collaborators per tier? (Proposed: 0 for lower tiers, up to 3 for higher Site Walk tiers)
12. **Collaborator onboarding UX**: What does the collaborator see on first login? Scoped project view? Mini-tutorial?
13. **Collaborator capabilities per project**: Can collaborators only respond to existing items, or also create new items within the project?
14. **Collaborator notifications**: What notifications does the subscriber get about collaborator activity?
15. **Operations Console visibility into collaborators**: Should Operations Console show all collaborator invitations and activity?

---

## 15. Likely Build Sequence from Here

### Phase A — Pre-Design Implementation (code, no UI design needed)
1. Hide placeholder modules from all nav components (~30 min)
2. Fix MobileNavSheet gate inconsistency (~15 min)
3. Add beta access gate to signup/middleware (~2-4 hrs)
4. Wire Site Walk uploads to SlateDrop project folders (~2-4 hrs)
5. Add bug reporting form accessible from any page (~2-4 hrs)
6. Rename "Organization" UI text to "Workspace" or hide it (~1 hr)
7. Rebuild Operations Console for beta management (replace mock data with real user/project/bug queries) (~4-8 hrs)

### Phase B — Owner Design Decisions (no code until approved)
8. Owner approves command center layout
9. Owner approves Site Walk capture UX
10. Owner approves mobile navigation
11. Owner approves project creation flow
12. Owner approves collaborator invite/accept UX
13. Owner approves collaborator scoped project view

### Phase C — Design Generation + Implementation
14. Generate approved designs (v0 or manual)
15. Implement command center
16. Implement Site Walk UI refinements
17. Implement beta onboarding flow (subscriber path)
18. Implement subscriber-to-subscriber project linking
19. Implement collaborator invitation + onboarding path
20. Implement collaborator scoped project view (limited shell)
21. Implement Operations Console collaborator/linking visibility

### Phase D — Beta Hardening
22. E2E smoke tests for all Phase 1 flows
23. Fix remaining file-size violations
24. Extract Project Hub monoliths
25. Verify offline capture
26. Verify PDF export and email sharing
27. Test collaborator flow end-to-end (invite → signup → scoped access → field work)

---

## 16. Rules of Engagement for AI Agents

1. DO NOT show unfinished modules to beta testers
2. DO NOT build separate auth/billing/backend for web vs app
3. DO NOT create placeholder buttons that do nothing in production
4. DO NOT invent layout/design decisions without owner approval
5. DO NOT use fake company names, endorsements, or testimonials
6. DO NOT assume users belong to an organization — they are independent by default
7. DO NOT start design generation before functional spec is approved
8. DO treat Site Walk as a module inside Slate360, not a separate app
9. DO make all data project-centric, not org-centric
10. DO connect Site Walk captures to SlateDrop project folders
11. DO gate beta access before launch
12. DO work in small, testable increments with clear diffs
13. DO keep pricing as TBD in all user-facing UI until owner finalizes
14. DO NOT give collaborators full module access — their view is project-scoped only
15. DO NOT treat CeoCommandCenterClient.tsx mock data as current truth — it is legacy (Operations Console must be rebuilt)
16. DO NOT auto-link subscribers — collaboration requires explicit invitation and acceptance
17. DO distinguish between subscriber and collaborator onboarding paths in all flows
18. DO NOT remove future-phase features from docs — keep them marked by phase
19. DO NOT assume missing features must be rebuilt if backend pieces already exist
20. DO reuse existing backend capabilities where possible instead of blindly rebuilding

---

## 17. Metadata Doctrine

### Background Metadata (Automatic)

Timestamp, geolocation, and weather are **background metadata** — captured automatically when enabled.

**Rules:**
- Collaborators must NOT be able to disable background metadata if the subscriber/project requires them
- Subscriber or project-level settings decide whether metadata fields are captured
- If enabled at the project level, metadata is automatically recorded on every capture, note, and submission
- Deliverables may control the **visibility** of metadata lines (e.g., hide weather from a punch list PDF)
- But the underlying data must still be saved and stored regardless of display settings
- Metadata includes: timestamp, GPS coordinates, weather conditions, device info, user ID

**Phase 1 defaults:**
- Timestamp: always captured (no opt-out)
- Geolocation: captured if device permits and project setting enables it
- Weather: captured if API is wired and project setting enables it (may be Phase 2 for weather API)

**Phase 2+:**
- Weather API integration
- Metadata display controls per deliverable type
- Metadata export in reports

---

## 18. Notification Doctrine

### Phase 1 Requirements

In-app notifications are **required** for Phase 1. Project/item communication must be historically tracked.

**In-app notifications (Phase 1 — mandatory):**
- Collaborator submits/updates something → subscriber notified
- Assignment completed → assigner notified
- Direct mention or review-needed event → mentioned user notified
- Bug report or feature request submitted → Operations Console notified
- Project invite received → recipient notified
- Project invite accepted/declined → inviter notified

**Email notifications (Phase 1 — recommended options):**
- Email on collaborator submission (configurable per project)
- Email on critical issue/question flagged
- Email on assignment completion
- Email on direct mention / review-needed event

**Subscriber controls:**
- Subscriber can configure project-level notification preferences
- Per-project: enable/disable email notifications by type
- Global: notification digest frequency (immediate, daily, off)

### Future Notification Features (Phase 2+)

| Feature | Phase | Notes |
|---------|-------|-------|
| SMS/text notifications | Phase 2 | Unless already easy to support |
| Voice memo notifications | Phase 3+ | Record and attach voice memos to items |
| Short video memo | Phase 3+ | Attach video context to issues |
| Issue threads with reply chains | Phase 2 | Threaded conversation on items |
| Rich attachments in notifications | Phase 2 | Photos, documents inline |
| Historical communication log per project | Phase 2 | Full audit trail |
| @mention in notes and comments | Phase 2 | Trigger targeted notifications |

---

## 19. Status Doctrine

### Canonical Item Statuses

All items, issues, assignments, and punch list entries use this status set:

| Status | Meaning |
|--------|---------|
| **Pending** | Created, not started |
| **In Progress** | Work underway |
| **Needs Review** | Work done, awaiting review/approval |
| **Complete** | Verified done |
| **Needs Attention** | Blocked, flagged, or requires intervention |

These statuses apply to:
- Site Walk items
- Punch list entries
- Assignments
- Inspection findings
- Deliverable status (draft → review → final)
- Bug reports (acknowledged → in-progress → resolved)
- Feature requests (submitted → planned/deferred)

**Optional percent-complete**: For items/assignments where useful, support an optional 0-100% completion field. This is supplementary to the status — not a replacement. Not required for all item types.

**Collaborator status permissions**: Collaborators can mark items as pending / in progress / needs review / complete / needs attention within their assigned project scope. They trigger notifications when they change status.

---

## 20. Project Creation Doctrine

### Phase 1: Projects Created in Slate360

- Projects are primarily created in the Slate360 command center or Project Hub
- Site Walk attaches to existing Slate360 projects — it does NOT create projects independently
- Project creation triggers SlateDrop folder provisioning
- A project creation wizard should be part of the Phase 1 design spec (fields TBD by owner)

**Project creation fields (proposed — owner must approve):**
- Project name (required)
- Location / address (required)
- Scope / description
- Milestones / schedule dates
- Budget (basic fields)
- Drawings upload
- Team members (invite subscribers or collaborators)

**Future project creation enhancements:**
- Quick-start draft capture from Site Walk (create lightweight project record from field, fill in details later)
- Project templates (residential, commercial, inspection, etc.)
- Import from external systems (Procore, PlanGrid, etc.)
- AI-assisted project setup from uploaded documents

### What Happens When a Project Is Created

1. Project record created in DB
2. SlateDrop folder structure auto-provisioned (see Section 5)
3. Project appears in command center and Project Hub
4. Project available as target in Site Walk
5. If collaborators assigned: invitations sent

---

## 21. Full Roadmap — Feature Inventory by Phase

Every feature area in Slate360 must be documented with its phase and readiness. Do NOT remove future features from docs because they are not Phase 1.

### Project Management Features

| Feature | Phase | Status | Reuse Potential |
|---------|-------|--------|-----------------|
| Project creation + basic fields | Phase 1 | ✅ Functional (Project Hub) | — |
| Project sub-tabs (14 tabs) | Phase 1 | ✅ Functional but monolith files | Extract before beta |
| Budgets | Phase 1 (view/upload) | ✅ UI exists (421 lines) | Needs extraction + design review |
| Schedules | Phase 1 (view/upload) | ✅ UI exists (465 lines) | Needs extraction + design review |
| SOV (Schedule of Values) | Phase 2 | UI shell may exist | Check project-hub sub-tabs |
| Invoices | Phase 2 | Not implemented | — |
| RFIs | Phase 1 (basic) | ✅ UI exists (339 lines) | Needs extraction |
| Submittals | Phase 1 (basic) | ✅ UI exists (579 lines) | Needs extraction |
| Daily Logs | Phase 1 (basic) | ✅ UI exists (358 lines) | Needs extraction |
| Punch List | Phase 1 | ✅ UI exists (403 lines) | Needs extraction |
| Reports | Phase 2 | Deliverable generation partial | — |
| Project export/archive | Phase 2 | Not implemented | — |
| Project templates | Phase 2 | Not implemented | — |

### Site Walk Features

| Feature | Phase | Status | Reuse Potential |
|---------|-------|--------|-----------------|
| Session capture (photo + notes) | Phase 1 | ✅ Functional | — |
| Voice-to-text | Phase 1 | ✅ Browser SpeechRecognition | Needs thumb-friendly UX |
| AI note cleanup | Phase 1 | Partial | Needs AI action wiring |
| Photo markup | Phase 1 | Partial | — |
| Plan upload + pinning | Phase 1 | ✅ Functional (PlanViewer) | — |
| Deliverable generation | Phase 1 | ✅ Functional (DeliverableViewer) | Needs design review |
| PDF export | Phase 1 | Endpoint exists | Needs quality testing |
| Share links | Phase 1 | ✅ Functional (sharing API) | — |
| Email delivery | Phase 1 | Partial (Resend) | Needs testing |
| Offline capture | Phase 1 | ⚠️ Code exists, not wired | lib/offline-queue.ts |
| Templates/checklists | Phase 2 | ✅ TemplateManager exists | Needs design review |
| Before/after compare | Phase 2 | Not implemented | — |
| Recurring walk templates | Phase 2 | Not implemented | — |
| Turnover mode | Phase 2 | Not implemented | — |
| Richer proposal layouts | Phase 2 | Not implemented | — |
| External acknowledgement | Phase 2 | Not implemented | — |
| 360-linked issues | Phase 3+ | Not implemented | Depends on Tours module |
| BIM/model-linked findings | Phase 3+ | Not implemented | Depends on Virtual Studio |
| AI-generated descriptions | Phase 3+ | Not implemented | — |
| Recurring issue pattern detection | Phase 3+ | Not implemented | — |
| Executive summaries | Phase 3+ | Not implemented | — |
| Digital owner portal | Phase 3+ | Not implemented | — |
| Geospatial tie-ins | Phase 3+ | Not implemented | Depends on Geospatial module |

### SlateDrop / File Management Features

| Feature | Phase | Status | Reuse Potential |
|---------|-------|--------|-----------------|
| File upload/download | Phase 1 | ✅ Functional | — |
| Folder hierarchy | Phase 1 | ✅ Functional | — |
| Project auto-provisioning | Phase 1 | ✅ Functional | — |
| Secure share links | Phase 1 | ✅ Functional | — |
| ZIP download | Phase 1 | ✅ Functional | — |
| Soft delete + restore | Phase 1 | ✅ Functional | — |
| Site Walk integration | Phase 1 | ❌ Not wired (CRITICAL) | — |
| Version history | Phase 2 | Not implemented | — |
| Editable schedule/budget data | Phase 2 | Not implemented | — |
| AI document normalization | Phase 3+ | Not implemented | — |
| BIM-linked files | Phase 3+ | Not implemented | — |
| Project export packages | Phase 2 | Not implemented | — |

### Collaboration Features

| Feature | Phase | Status | Reuse Potential |
|---------|-------|--------|-----------------|
| Subscriber-to-subscriber project linking | Phase 1 | ❌ Not implemented | Greenfield |
| Collaborator invitations | Phase 1 | ❌ Not implemented | Greenfield |
| Collaborator scoped view | Phase 1 | ❌ Not implemented | Greenfield |
| In-app notifications | Phase 1 | ❌ Not implemented | — |
| Email notifications | Phase 1 | Partial (Resend available) | — |
| Comment threads on items | Phase 1 | ✅ CommentThread.tsx exists | — |
| Assignment panel | Phase 1 | ✅ AssignmentPanel.tsx exists | — |
| @mentions | Phase 2 | Not implemented | — |
| Issue threads with replies | Phase 2 | Not implemented | — |
| SMS/text notifications | Phase 2 | Not implemented | — |
| Voice/video memos | Phase 3+ | Not implemented | — |
| Real-time collaboration (WebSocket) | Phase 3+ | Not implemented | — |

### Platform / Shell Features

| Feature | Phase | Status | Reuse Potential |
|---------|-------|--------|-----------------|
| Auth (signup/login/forgot) | Phase 1 | ✅ Functional | — |
| Dashboard widgets | Phase 1 | ✅ Functional (10+ types) | Needs design review |
| PWA installability | Phase 1 | ✅ Functional | — |
| Beta access gate | Phase 1 | ❌ Not implemented (CRITICAL) | — |
| Bug reporting form | Phase 1 | ❌ Not implemented | — |
| Operations Console (beta mgmt) | Phase 1 | ⚠️ Exists but legacy mock data | Needs rebuild |
| My Account (5 tabs) | Phase 1 | ✅ Functional | — |
| Sentry error tracking | Phase 1 | ✅ Functional | — |
| E2E tests (Playwright) | Phase 1 | ✅ 4 spec files | Needs expansion |
| Enterprise roles | Phase 3+ | Not implemented | — |
| White-label / multi-tenant | Phase 3+ | API exists, propagation unclear | — |
| Third-party integrations (Procore, Autodesk, DocuSign) | Phase 3+ | Not implemented | — |

### Billing Features

| Feature | Phase | Status | Reuse Potential |
|---------|-------|--------|-----------------|
| Stripe checkout (Site Walk) | Phase 1 | ✅ Products exist, chain needs E2E test | — |
| Webhook processing | Phase 1 | ✅ Functional | — |
| Entitlements resolver | Phase 1 | ✅ Functional | Needs maxCollaborators |
| Subscription status display | Phase 1 | Partial | Needs design review |
| Bundle checkout | Phase 2 | Defined, untested | — |
| Storage addon | Phase 2 | Defined, untested | — |
| Credit system | Phase 2 | ✅ Idempotency exists | — |
| Upgrade/downgrade UI | Phase 2 | Not implemented | — |
| Annual vs monthly toggle | Phase 2 | Not implemented | — |
| Invoice history | Phase 2 | Not implemented | — |
| Team/seat billing (enterprise) | Phase 3+ | Not implemented | — |

### Hidden Modules (Phase 2+)

| Module | Status | Backend Exists | UI Exists |
|--------|--------|---------------|-----------|
| 360 Tours | Phase 2 | 7 API routes | Shell only |
| Design Studio | Phase 2 | 5 API routes | Shell only |
| Content Studio | Phase 2 | 4 API routes | Shell only |
| Geospatial | Phase 3+ | None | Placeholder |
| Virtual Studio | Phase 3+ | None | Placeholder |
| Analytics | Phase 2 | None | Placeholder |

---

## 22. Practical Questions — Answered

### What Does a Full Subscriber See and Do in Phase 1?

After signup + beta gate + email confirmation:
1. **Command center** (dashboard): project launcher, recent activity, module launchers (Site Walk only)
2. **Project Hub**: Create projects, manage project data (14 sub-tab pages)
3. **SlateDrop**: Full file management for their projects
4. **Site Walk**: Field capture, deliverables, sharing
5. **My Account**: Profile, billing, security, notifications, data tracker
6. **Plans**: Subscription management
7. Can invite collaborators (up to tier limit: 0 for Standard, 3 for Pro)
8. Can invite other subscribers to share projects

### What Does a Collaborator See and Do in Phase 1?

After receiving invite → creating account:
1. **Scoped project view**: Only the project(s) they were invited to
2. **Item list**: Assigned items within the project
3. **Capture actions**: Submit photos, respond to items, mark status, use voice/AI
4. **Notifications**: See notifications relevant to their assignments
5. Do NOT see: command center, SlateDrop browser, Project Hub, billing, other projects

### How Does Shared-Project Collaboration Between Subscribers Work?

1. Subscriber A opens a project → invites Subscriber B (by email or username)
2. Subscriber B receives in-app notification (+ optional email)
3. Subscriber B accepts → project appears in their command center
4. Both can add sessions, files, records, and deliverables
5. Permissions are project-level — not account-wide
6. Either can revoke the link
7. Each subscriber's own projects remain private unless explicitly shared

### How Do Web Users Navigate Modules/Pages Inside Slate360?

- Login → command center (dashboard)
- Sidebar navigation: Projects, SlateDrop, Site Walk (only Phase 1 modules visible)
- Click into a project → 14 sub-tabs (management, photos, drawings, budget, schedule, etc.)
- Click Site Walk → project selector → session list → capture → review → deliverable
- Mobile nav: bottom bar with same module access

### How Do Mobile/PWA Users Access Site Walk Inside Slate360?

- Install Slate360 as PWA on phone
- Login (same credentials as web)
- Bottom navigation: Home (command center), Projects, Site Walk, SlateDrop
- Tap Site Walk → select project → start session → capture photos/notes/voice
- Same data, same backend, same auth as web

### How Does Project Foldering/History Work in Phase 1?

- Project creation → auto-provisioned folder structure in SlateDrop
- Subfolders: Deliverables, Photos, Plans, Reports, RFIs, Submittals, etc.
- Site Walk captures flow into project folders (AFTER integration fix)
- File upload/download/rename/move/delete/restore available
- History: who uploaded/modified/shared, when (metadata tracked)
- Version history is Phase 2

### Which Future-Phase Features Have Partial Backend Support?

These appear to have existing code that can be reused:

| Feature | Existing Code | Phase |
|---------|--------------|-------|
| 360 Tours | 7 API routes in api/tours/ | Phase 2 |
| Design Studio | 5 API routes in api/design-studio/ | Phase 2 |
| Content Studio | 4 API routes in api/content-studio/ | Phase 2 |
| Templates/checklists | TemplateManager.tsx + API routes | Phase 2 |
| Comment threads | CommentThread.tsx + API routes | Phase 1 (exists) |
| Assignments | AssignmentPanel.tsx + API routes | Phase 1 (exists) |
| Item timeline | ItemTimeline.tsx | Phase 1 (exists) |
| Credit system | lib/credits/idempotency.ts | Phase 2 |
| White-label branding | lib/server/branding.ts + API route | Phase 2-3 |
| Offline queue | lib/offline-queue.ts + useOfflineSync | Phase 1 (needs wiring) |
| Bundle pricing | lib/billing-apps.ts definitions | Phase 2 |
| Storage tracking | lib/slatedrop/track-storage.ts | Phase 1 (needs verification) |

### What Must Be Implemented Before Design Generation?

1. Beta access gate (CRITICAL — signup is completely open)
2. Hide placeholder modules from all navigation
3. Fix MobileNavSheet gate inconsistency
4. Wire Site Walk uploads to SlateDrop project folders
5. Add unified bug/feature reporting form
6. Rename org language to workspace
7. Rebuild Operations Console for beta management
8. Add collaborator seat tracking to entitlements

### What Requires Owner Decisions Before Build/Design Proceeds?

See Section 14 for the full list. The most blocking are:
1. Org model resolution (Option A vs B)
2. Beta gate mechanism
3. Beta pricing (free or paid?)
4. Command center layout
5. Site Walk capture UX
6. Collaborator seat limits per tier (recommended: Standard=0, Pro=3)
7. Collaborator capabilities (create new items or only respond?)
8. Operations Console scope confirmation
