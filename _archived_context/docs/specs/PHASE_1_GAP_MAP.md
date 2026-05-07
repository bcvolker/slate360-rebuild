# Phase 1 Gap Map — Spec vs. Repo Reality

> Generated: 2026-04-14
> Updated: 2026-04-14 (added gaps for offline policy, OS permission fallback, seat lifecycle, SlateDrop permissions, autosave vs snapshot)
> Based on: `docs/specs/PHASE_1_FUNCTIONAL_SPEC.md` vs. current `main` branch

---

## Section-by-Section Gap Map

### 1. Product Objective

| Requirement | Status | Files | Notes |
|---|---|---|---|
| Create an account | **IMPLEMENTED** | `app/signup/page.tsx`, `app/api/auth/signup/` | Email + Google + Azure OAuth |
| Receive beta access | **MISSING** | — | No beta gate mechanism exists. Signup is open to anyone. |
| Log into Slate360 | **IMPLEMENTED** | `app/login/page.tsx`, `app/auth/callback/route.ts` | |
| Create or join a project | **IMPLEMENTED** | `components/project-hub/CreateProjectWizard.tsx`, `app/api/projects/create/` | "Join" flow (invite/accept) is MISSING |
| Use Site Walk on web | **IMPLEMENTED** | `app/(apps)/site-walk/page.tsx`, `components/site-walk/` | |
| Use Site Walk on PWA | **IMPLEMENTED** | `app/manifest.ts`, `next.config.ts` (@serwist), `app/~offline/` | PWA manifest + service worker + offline page |
| Capture site data tied to project | **IMPLEMENTED** | `components/site-walk/CaptureCamera.tsx`, `CaptureTextNote.tsx` | Sessions link to `projectId` |
| Collaborate with office users | **MISSING** | — | No collaborator invite flow, no scoped view |
| Create and share deliverables | **IMPLEMENTED** | `components/site-walk/BlockEditor.tsx`, `app/share/deliverable/[token]/page.tsx` | |
| Project records saved in SlateDrop | **PARTIAL** | `lib/slatedrop/provisioning.ts` | Folder provisioning works. Site Walk captures go to S3 but don't create SlateDrop file records. |
| Report bugs and suggest features | **PARTIAL** | `app/api/suggest-feature/route.ts` | Feature suggestions only. No unified bug/feature form. |
| Operations Console for owner | **PARTIAL** | `app/(dashboard)/ceo/page.tsx`, `components/dashboard/CeoCommandCenterClient.tsx` | Route exists but shows mock metrics. No real beta management. |

---

### 2. Core Product Model

| Requirement | Status | Notes |
|---|---|---|
| One account system | **IMPLEMENTED** | Supabase auth with email + OAuth |
| One backend | **IMPLEMENTED** | Next.js API routes + Supabase + S3 |
| One project/data model | **IMPLEMENTED** | `projects` table + `project_members` + `project_folders` |
| One entitlement system | **IMPLEMENTED** | `lib/entitlements.ts` — 4-tier model |
| One web app | **IMPLEMENTED** | Single Next.js app |
| One installable PWA | **IMPLEMENTED** | `app/manifest.ts` with `display: "standalone"` |

No gaps in this section.

---

### 3. User Types

| Requirement | Status | Files | Notes |
|---|---|---|---|
| Full subscriber | **IMPLEMENTED** | `lib/entitlements.ts` | Standard / Business / Enterprise tiers |
| Shared-project subscriber | **PARTIAL** | `supabase/migrations/20260223_create_projects.sql` | `project_members` table exists with `role` column. No invite/accept UI. |
| Collaborator (non-paid seat) | **MISSING** | — | No collaborator concept in code. No DB table, no invite, no scoped view. |
| Standard = 0 collaborators | **MISSING** | `lib/entitlements.ts` | No `maxCollaborators` field |
| Pro = 3 collaborators | **MISSING** | `lib/entitlements.ts` | No `maxCollaborators` field |
| Only accepted collaborators consume seats | **MISSING** | — | No seat lifecycle logic. `maxSeats` exists for general seats, not collaborator-specific. |
| Pending invites do not consume seats | **MISSING** | — | No invite system exists |
| Revoked/expired free seats immediately | **MISSING** | — | No revocation logic |
| Downgrade blocks if seats in use | **MISSING** | — | No downgrade guard |

---

### 4. Phase 1 Surfaces

| Requirement | Status | Files | Notes |
|---|---|---|---|
| Command Center on web | **IMPLEMENTED** | `components/dashboard/command-center/CommandCenterContent.tsx` | Welcome, projects, quick actions, recent files |
| Projects nav | **IMPLEMENTED** | `components/dashboard/command-center/DashboardSidebar.tsx` | |
| SlateDrop nav | **IMPLEMENTED** | `DashboardSidebar.tsx` | |
| Site Walk nav | **IMPLEMENTED** | `DashboardSidebar.tsx` | Under "Apps" expandable |
| Deliverables nav | **IMPLEMENTED** | `DashboardSidebar.tsx` | |
| Notifications nav | **PARTIAL** | `components/shared/DashboardHeader.tsx` | Bell icon in header, not a dedicated nav section |
| Settings nav | **IMPLEMENTED** | `DashboardSidebar.tsx` | Enterprise Settings link |
| Operations Console nav | **PARTIAL** | `app/(dashboard)/ceo/page.tsx` | Route exists but not in sidebar nav for owner. Accessed via `/ceo` directly. |
| PWA install | **IMPLEMENTED** | `app/manifest.ts` | Shortcuts: Site Walk, SlateDrop |

---

### 5. Phase 1 Modules Exposed

| Requirement | Status | Files | Notes |
|---|---|---|---|
| Slate360 shell visible | **IMPLEMENTED** | `components/walled-garden-dashboard.tsx` | |
| Projects visible | **IMPLEMENTED** | `app/(dashboard)/project-hub/` | |
| SlateDrop visible | **IMPLEMENTED** | `app/slatedrop/` | |
| Site Walk visible | **IMPLEMENTED** | `app/(apps)/site-walk/` | |
| Operations Console visible (owner) | **PARTIAL** | `app/(dashboard)/ceo/` | Not in sidebar. Requires manual URL. |
| 360 Tours HIDDEN | **NOT MET** | `DashboardSidebar.tsx` | **360 Tours is visible in Apps nav.** Must be hidden. |
| Design Studio HIDDEN | **NOT MET** | `DashboardSidebar.tsx` | **Design Studio is visible in Apps nav.** Must be hidden. |
| Content Studio HIDDEN | **MET** | — | Not in sidebar |
| Geospatial HIDDEN | **MET** | — | Not in sidebar |
| Virtual Studio HIDDEN | **MET** | — | Not in sidebar |

**BLOCKER:** 360 Tours and Design Studio are exposed in the sidebar nav. Spec requires them hidden from beta testers.

---

### 6. Beta Onboarding

| Requirement | Status | Notes |
|---|---|---|
| Account creation | **IMPLEMENTED** | |
| Beta access by controlled method | **MISSING** | No invite code, flag, or approval queue |
| User lands in Command Center | **IMPLEMENTED** | |
| Collaborator invite from project | **MISSING** | No invite flow |
| Collaborator scoped view | **MISSING** | No scoped/limited view |
| Beta managed from Operations Console | **MISSING** | CEO page has no beta management |

---

### 7. Project Creation and Project Model

| Requirement | Status | Files | Notes |
|---|---|---|---|
| Project name (required) | **IMPLEMENTED** | `CreateProjectWizard.tsx` | Step 1: Basics |
| Project location (required) | **IMPLEMENTED** | `WizardLocationPicker.tsx` | Google Maps picker with geocode |
| Project description (required) | **IMPLEMENTED** | `CreateProjectWizard.tsx` | Step 1: Basics |
| Client/owner (optional) | **MISSING** | — | Not in wizard |
| Milestones (optional) | **MISSING** | — | Not in wizard |
| Drawings (optional) | **MISSING** | — | Not in wizard (drawings page exists in project hub) |
| Schedule upload (optional) | **MISSING** | — | Not in wizard (schedule page exists in project hub) |
| Budget upload (optional) | **MISSING** | — | Not in wizard (budget page exists in project hub) |
| Attachments (optional) | **MISSING** | — | Not in wizard |
| Project linking (invite/accept) | **MISSING** | — | `project_members` table exists, no UI |
| Project history | **PARTIAL** | — | History via deliverable snapshots, no dedicated history view |

**Note:** The wizard has a Classification step (project type, contract type) not in the spec. This is additive, not contradictory.

---

### 8. SlateDrop and Project Record Doctrine

| Requirement | Status | Files | Notes |
|---|---|---|---|
| Auto-create project folders | **IMPLEMENTED** | `lib/slatedrop/provisioning.ts` | Creates 16 system folders |
| Photos folder | **IMPLEMENTED** | Provisioning includes "Photos" | |
| Deliverables folder | **DIFFERENT** | — | Provisioning has no "Deliverables" folder. Has "Records" and "Reports". |
| History folder | **DIFFERENT** | — | No "History" folder. Has "Records". |
| Schedules folder | **IMPLEMENTED** | Provisioning includes "Schedule" | |
| Budgets folder | **IMPLEMENTED** | Provisioning includes "Budget" | |
| Reports folder | **IMPLEMENTED** | Provisioning includes "Reports" | |
| Attachments folder | **MISSING** | — | Not in provisioned folders |
| Site Walk → SlateDrop bridge | **PARTIAL** | `components/site-walk/CaptureCamera.tsx` | Photos upload to S3 with `photo_s3_key`. **No SlateDrop file record created.** Critical gap. |
| Autosave | **MISSING** | — | Not implemented in Site Walk capture |
| Resume drafts | **PARTIAL** | — | Sessions persist in DB. No explicit draft-resume UX. |
| Historical snapshots | **IMPLEMENTED** | `app/api/site-walk/deliverables/[id]/snapshot/` | Snapshot endpoint exists |
| Autosave updates draft only (no history) | **N/A** | — | Autosave not implemented yet. Constraint noted for when it is built. |
| Publish/share creates immutable record | **IMPLEMENTED** | `app/api/site-walk/deliverables/[id]/snapshot/` | Snapshot endpoint creates immutable copy |
| Draft always resumable | **PARTIAL** | — | Sessions persist. No explicit "resume draft" UX flow. |

**BLOCKER:** Site Walk photos/captures go to S3 but don't appear in SlateDrop. Users can't see their captured data in the file manager.

---

### 9. Site Walk Phase 1 Workflow

| Requirement | Status | Files | Notes |
|---|---|---|---|
| Open Site Walk inside Slate360 | **IMPLEMENTED** | `app/(apps)/site-walk/page.tsx` | |
| Select a project | **IMPLEMENTED** | `components/site-walk/ProjectSelectorClient.tsx` | |
| Start/resume a session | **IMPLEMENTED** | `SessionListClient.tsx`, `SessionCaptureClient.tsx` | |
| Photo capture | **IMPLEMENTED** | `CaptureCamera.tsx` | Live camera + S3 upload + geolocation |
| Text notes | **IMPLEMENTED** | `CaptureTextNote.tsx` | Title + description + location |
| Voice-to-text | **MISSING** | — | `@types/react-speech-recognition` in package.json but **no component uses it** |
| AI note cleanup | **MISSING** | — | Not implemented |
| Priority / urgency | **IMPLEMENTED** | `lib/types/site-walk.ts` | `ItemPriority`: low / medium / high / critical |
| Due date | **IMPLEMENTED** | `SiteWalkItem.due_date` field | |
| Assignee | **IMPLEMENTED** | `SiteWalkItem.assigned_to` field + `AssignmentPanel.tsx` | |
| Status | **DIFFERENT** | `lib/types/site-walk.ts` | See Status Doctrine section below |
| Percent complete | **MISSING** | — | Not in schema |
| Punch list deliverable | **IMPLEMENTED** | `SiteWalkDeliverableType` includes "punchlist" | |
| Inspection deliverable | **PARTIAL** | — | Workflow type "inspection" exists but no dedicated deliverable type |
| Proposal deliverable | **PARTIAL** | — | Workflow type "proposal" exists but no dedicated deliverable type |
| Custom report deliverable | **IMPLEMENTED** | `SiteWalkDeliverableType` includes "custom" | |
| Save drafts | **PARTIAL** | — | Sessions have "draft" status. No explicit UX. |
| Share links | **IMPLEMENTED** | `app/share/deliverable/[token]/page.tsx` | Token-based with expiry + view tracking |
| Email-style deliverable | **IMPLEMENTED** | `app/api/site-walk/deliverables/send/` | |
| PDF export | **PARTIAL** | `app/api/site-walk/deliverables/[id]/export/` | Endpoint exists. **Quality untested.** |

#### Offline State Policy

| Requirement | Status | Files | Notes |
|---|---|---|---|
| Create/continue sessions offline | **PARTIAL** | `lib/offline-queue.ts`, `lib/hooks/useOfflineSync.ts` | IndexedDB queue + online/offline detection exist. **Not wired to Site Walk.** |
| Photo capture offline | **MISSING** | — | Camera capture goes straight to S3 upload. No local queue. |
| Text notes offline | **MISSING** | — | Notes save to API. No local fallback. |
| Drafts save locally | **MISSING** | — | No localStorage/IndexedDB draft storage in site-walk components |
| Queue uploads for sync | **PARTIAL** | `lib/offline-queue.ts` | `enqueue()` / `flushQueue()` with retry. Not integrated with Site Walk. |
| Offline banner + pending count | **IMPLEMENTED** | `components/shared/OfflineBanner.tsx` | Banner exists with pending count + "Sync now" button. Not rendered in Site Walk layout. |
| Auto sync on reconnect | **IMPLEMENTED** | `lib/hooks/useOfflineSync.ts` | Auto-flushes queue on `online` event |

**NOTE:** Offline infrastructure exists (`offline-queue.ts`, `useOfflineSync.ts`, `OfflineBanner.tsx`) but is NOT integrated with Site Walk capture. Wiring is required.

---

### 10. Metadata Doctrine

| Requirement | Status | Files | Notes |
|---|---|---|---|
| Timestamp capture | **IMPLEMENTED** | `SiteWalkItem.captured_at` | |
| Geolocation capture | **IMPLEMENTED** | `lib/hooks/useGeolocation.ts`, used in `CaptureCamera.tsx` + `CaptureTextNote.tsx` | Auto-captures lat/lng |
| Weather capture | **PARTIAL** | `lib/hooks/useWeatherState.ts`, `SiteWalkItem.weather` field exists | Hook exists for dashboard, weather field on items not confirmed populated during capture |
| Subscriber/project settings for metadata | **MISSING** | — | No per-project metadata settings |
| Collaborators cannot disable | **N/A** | — | No collaborator system exists yet |
| Toggleable visibility in deliverables | **MISSING** | — | No metadata visibility toggle |

#### OS Permission Fallback

| Requirement | Status | Files | Notes |
|---|---|---|---|
| Camera denial = photo only blocked | **MET** | `components/site-walk/CaptureCamera.tsx` | Camera error shows message + retry. Other tabs (text notes) remain available. |
| Geolocation denial = not blocking | **MET** | `lib/hooks/useGeolocation.ts` | Failure sets `error` state. Capture proceeds without lat/lng. |
| Missing metadata marked for review | **MISSING** | — | No "missing required metadata" flag on items |
| Weather only when data sufficient | **MET** | `lib/hooks/useWeatherState.ts` | Weather field optional; only populated when data available |

---

### 11. Status Doctrine

| Spec Status | Code Equivalent | Match |
|---|---|---|
| Pending | `open` | **DIFFERENT** — "open" not "pending" |
| In Progress | `in_progress` | **MATCH** |
| Needs Review | — | **MISSING** — no equivalent |
| Complete | `resolved` / `verified` | **DIFFERENT** — uses two statuses instead of one |
| Needs Attention | — | **MISSING** — no equivalent |
| — | `closed` | **EXTRA** — exists in code, not in spec |
| — | `na` | **EXTRA** — exists in code, not in spec |

**CONTRADICTION:** Current `ItemStatus` is `"open" | "in_progress" | "resolved" | "verified" | "closed" | "na"`. Spec wants `pending | in_progress | needs_review | complete | needs_attention`. These must be reconciled before the first design pass.

Percent-complete field: **MISSING** from `SiteWalkItem` schema.

---

### 12. Collaboration Doctrine

| Requirement | Status | Notes |
|---|---|---|
| Subscriber-to-subscriber invite | **MISSING** | `project_members` table exists but no invite/accept UI |
| Explicit permissions model | **MISSING** | No permission granularity (view/upload/comment/etc.) |
| Collaborator view/respond | **MISSING** | No collaborator role in code |
| Collaborator photo upload | **MISSING** | No scoped access |
| Voice-to-text for collaborators | **MISSING** | Voice-to-text not implemented at all |
| AI note cleanup for collaborators | **MISSING** | AI cleanup not implemented at all |
| Status updates on assigned work | **MISSING** | No collaborator assignment flow |
| Notification triggers | **MISSING** | No event-based notification dispatch |

#### SlateDrop vs Item-Level Permissions

| Requirement | Status | Files | Notes |
|---|---|---|---|
| Collaborators cannot browse full file tree | **MISSING** | — | No collaborator system. SlateDrop access is project-scoped (org-level RLS). |
| File access limited to shared folders/items | **MISSING** | `lib/slatedrop/` | No per-folder or per-file ACL. No `folder_permissions` table. |
| Full subscribers get broader folder access | **MISSING** | — | No permission differentiation by user type |
| Item-linked files open through item scope | **MISSING** | — | Files are accessed through SlateDrop explorer, not through item context |

---

### 13. Notifications and Communication

| Requirement | Status | Files | Notes |
|---|---|---|---|
| In-app notifications | **IMPLEMENTED** | `supabase/migrations/20260224_notifications.sql`, `DashboardHeader.tsx` | DB table + bell icon in header |
| Communication history | **IMPLEMENTED** | `components/site-walk/CommentThread.tsx` | Comment threads on items |
| Email notifications | **PARTIAL** | `lib/email.ts`, `app/api/site-walk/deliverables/send/` | Deliverable email send exists. No event-triggered emails. |
| Configurable notification events | **MISSING** | — | No event system, no preferences |
| Voice memo attachment | **MISSING** | — | |
| Video memo attachment | **MISSING** | — | |
| File attachment on items | **PARTIAL** | — | Items can have photos but no arbitrary file attachments |

---

### 14. Deliverable Sharing Doctrine

| Requirement | Status | Files | Notes |
|---|---|---|---|
| Share link | **IMPLEMENTED** | `app/share/deliverable/[token]/page.tsx` | Token + expiry + view counter |
| Textable link | **IMPLEMENTED** | — | Share link is a URL, textable by nature |
| Email-style view | **IMPLEMENTED** | `app/api/site-walk/deliverables/send/` | |
| PDF export | **PARTIAL** | `app/api/site-walk/deliverables/[id]/export/` | **Quality untested** |
| Clickable linked assets | **PARTIAL** | `components/site-walk/DeliverableViewer.tsx` | Block-based renderer. Asset linking depth unverified. |
| Immutable snapshot | **IMPLEMENTED** | `app/api/site-walk/deliverables/[id]/snapshot/` | |
| Editable draft | **PARTIAL** | — | Deliverables editable until shared. No explicit draft/published toggle. |

---

### 15. Bug Reporting and Feature Requests

| Requirement | Status | Files | Notes |
|---|---|---|---|
| Unified reporting flow | **MISSING** | — | Only feature suggestions exist |
| Bug reporting | **MISSING** | — | No bug-specific form |
| Module/location pre-fill | **MISSING** | — | |
| Attachments/screenshots | **MISSING** | — | |
| Voice-to-text in report | **MISSING** | — | |
| Visible in Operations Console | **MISSING** | — | CEO page shows no bug inbox |
| Triage/status tools | **MISSING** | — | |

**BLOCKER:** No mechanism for beta testers to report bugs. Only a basic feature suggestion endpoint exists.

---

### 16. Operations Console

| Requirement | Status | Files | Notes |
|---|---|---|---|
| Owner-only access | **IMPLEMENTED** | `app/(dashboard)/ceo/page.tsx` | Gated by `canAccessCeo` for `slate360ceo@gmail.com` |
| Beta user management | **MISSING** | — | |
| Beta access grant/revoke/expiry | **MISSING** | — | |
| Subscriber visibility | **PARTIAL** | `components/dashboard/ceo/CeoPlatformOverview.tsx` | Shows mock metrics only |
| Bug report inbox | **MISSING** | — | |
| Feature request inbox | **MISSING** | — | |
| Triage/status tools | **MISSING** | — | |

---

### 17–18. Non-Goals and Future Phases

No action required. These are documentation-only sections. Current docs retain future phases per master build plan Section 21.

---

### 19. Verification Criteria

| Criterion | Ready? |
|---|---|
| Account creation works | **YES** |
| Beta access can be granted | **NO** — no mechanism |
| Slate360 shell works on web | **YES** |
| Slate360 installs as PWA | **YES** |
| Project creation works | **YES** |
| Site Walk session can start | **YES** |
| Photo capture works | **YES** |
| Notes + AI cleanup work | **PARTIAL** — notes yes, AI cleanup no |
| Metadata saves correctly | **PARTIAL** — geo yes, weather unverified |
| Item saving works | **YES** |
| Collaborator responses work | **NO** — no collaborator system |
| Deliverables save | **YES** |
| Share links work | **YES** |
| PDF output is readable | **UNVERIFIED** |
| SlateDrop receives project files | **NO** — bridge missing |
| Operations Console sees reports | **NO** — no report inbox |
| No placeholder modules in nav | **NO** — 360 Tours + Design Studio visible |
| Offline capture works for Site Walk | **NO** — infrastructure exists but not wired to Site Walk |
| OS permission denial handled gracefully | **PARTIAL** — camera/geo don’t block app, but no "missing metadata" flag |
| Autosave updates draft only (no history) | **N/A** — autosave not built yet |

---

## Pre-Design Blockers

These must be fixed before any shell/Site Walk design generation work starts:

### Ready Now (no blockers)

1. Account creation + login
2. Dashboard shell / Command Center
3. Project creation wizard (core fields)
4. Site Walk session start + photo capture + text notes
5. SlateDrop file manager
6. Deliverable creation + share links
7. PWA manifest + service worker + offline page

### Must Fix Before Design Work

1. **Hide placeholder modules from nav** — 360 Tours + Design Studio visible to all users
2. **Site Walk → SlateDrop bridge** — captures invisible in file manager
3. **Status reconciliation** — code uses different statuses than spec requires
4. **Folder structure alignment** — provisioning creates 16 folders; spec expects 7 minimum with "Deliverables", "History", "Attachments" (missing from current set)

### Can Defer Until After First Beta

1. Beta access gate (can soft-launch with known testers)
2. Collaborator system (full subscriber testing first)
3. Voice-to-text
4. AI note cleanup
5. Unified bug reporting (use email/Slack for initial beta feedback)
6. Operations Console rebuild (manual DB queries for early beta)
7. Percent-complete field
8. Weather capture on items
9. Communication attachments (voice/video memo)
10. PDF export quality verification
11. Optional wizard fields (milestones, drawings, schedule, budget uploads)
12. Offline wiring to Site Walk (infrastructure exists; integration is medium-effort)
13. Collaborator seat lifecycle logic (no collaborator system yet)
14. SlateDrop per-folder/per-file ACL (no collaborator system yet)
15. "Missing required metadata" flag on items

---

## Contradictions Between Spec and Current Code

| # | Area | Spec Says | Code Does | Resolution Needed |
|---|---|---|---|---|
| 1 | Item statuses | pending / in_progress / needs_review / complete / needs_attention | open / in_progress / resolved / verified / closed / na | **Owner decision required** — adopt spec statuses or keep current? |
| 2 | Project folders | 7 folders (Photos, Deliverables, History, Schedules, Budgets, Reports, Attachments) | 16 system folders (Documents, Drawings, Photos, 3D Models, 360 Tours, RFIs, etc.) | Keep 16 and add missing 3 (Deliverables, History, Attachments)? Or trim to spec's 7? |
| 3 | Placeholder modules | 360 Tours + Design Studio **hidden** | Visible in sidebar under "Apps" | Must hide. Clear fix path: conditional render by entitlement or feature flag. |
| 4 | Operations Console | In sidebar nav for owner | Not in sidebar. Accessed by `/ceo` URL only | Add to sidebar for admin/owner |
| 5 | Notifications | Dedicated nav section | Bell icon in header only | Decide: separate page vs. header dropdown |
| 6 | Command Center name | "Slate360 Command Center" | `CommandCenterContent` component | Already aligned in code naming |

---

## Recommended First Implementation Slice

### **Beta-Surface Honesty + Minimum Beta Gate**

**Choice:** Option A — beta-surface honesty + minimum beta gate.

**Why this over Site Walk offline/SlateDrop backbone:**

1. **Prerequisite for all other work** — you cannot invite testers to a product showing fake modules (360 Tours, Design Studio). Every subsequent slice assumes an honest nav.
2. **A beta gate — even minimal — controls who sees the product.** Without it, anyone who finds the URL can sign up. The gate can be as simple as an `is_beta_approved` flag checked in the dashboard layout.
3. **Small, testable, zero-schema-risk scope** — nav changes are pure UI; the beta gate is one DB column + one layout check.
4. **Offline wiring is higher-effort and lower-urgency for first testers** — initial beta testers will be office users on stable connections. Offline is critical for field use but not for validating the core workflow.
5. **SlateDrop bridge is important but complex** — it requires DB writes, UI updates, and end-to-end testing. Better as slice 2.

**What it includes:**

1. Hide 360 Tours and Design Studio from sidebar nav
2. Add Operations Console link to sidebar for owner/admin only (gated by `canAccessCeo`)
3. Add `is_beta_approved` column to user/org metadata (or use existing `org_feature_flags`)
4. Add beta gate check in dashboard layout — unapproved users see a "Beta access pending" page
5. Add manual beta approval in Operations Console (toggle in DB for now; full UI is slice N)
6. Verify no other placeholder modules leak into tester-visible UI

**Files to touch:**

- `components/dashboard/command-center/DashboardSidebar.tsx` — hide 360 Tours + Design Studio, add Operations Console link
- `components/walled-garden-dashboard.tsx` — if nav items are passed from here
- `app/(dashboard)/layout.tsx` or equivalent — beta gate check
- `lib/entitlements.ts` or `lib/server/api-auth.ts` — beta flag resolution
- `app/(dashboard)/ceo/page.tsx` — verify owner access still works

**What it does NOT include:**

- No Site Walk code changes
- No SlateDrop bridge
- No offline wiring
- No schema migrations (beta flag can live in existing `org_feature_flags` or `app_metadata`)

**Smoke tests:**

- Log in as unapproved user → see "Beta access pending" or equivalent
- Log in as approved user → see clean nav (no 360 Tours, no Design Studio)
- Log in as `slate360ceo@gmail.com` → see Operations Console in sidebar
- Navigate to `/ceo` as owner → still works
- Navigate to `/ceo` as non-owner → still blocked
- All existing routes/features unchanged

---

## Recommended Next Prompt

```
Execute beta-surface honesty + minimum beta gate:

1. Hide 360 Tours and Design Studio from the sidebar nav
   (conditional render — they should not appear for any beta tester)
2. Add Operations Console link to the sidebar nav for owner only
   (gated by canAccessCeo or equivalent)
3. Add a minimum beta gate:
   - Use org_feature_flags or app_metadata for is_beta_approved
   - Check in dashboard layout before rendering
   - Unapproved users see a clean "Beta access pending" page
   - Owner can manually flip the flag in DB for now
4. Verify no other placeholder modules are visible in tester-facing nav

Files to touch:
- components/dashboard/command-center/DashboardSidebar.tsx
- components/walled-garden-dashboard.tsx (if nav items flow from here)
- app/(dashboard)/layout.tsx (or equivalent dashboard wrapper)
- lib/entitlements.ts or lib/server/api-auth.ts (beta flag resolution)

After the change:
- Run get_errors on changed files
- Run npm run typecheck
- Run bash scripts/check-file-size.sh
- Update SLATE360_PROJECT_MEMORY.md
```
