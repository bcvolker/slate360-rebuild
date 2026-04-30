# Org Roles, Permissions, and Member Model

Last updated: 2026-04-30

## Roles (today, in `org_members.role`)

| Role | Created by | Default capability |
|---|---|---|
| `owner` | First user to create the org | Everything. Cannot be removed without ownership transfer. Gets Global Command Center access for all org projects/walks. |
| `admin` | Promoted by owner | Same as owner except cannot delete the org or transfer ownership. Gets Global Command Center access for all org projects/walks. |
| `member` | Invited by owner/admin | Use the apps. No billing/data/audit/members visibility. |
| `viewer` | Invited by owner/admin | **Read-only across all org projects.** Use case: directors viewing what 40–50 Version 1 pilot PMs/architects produce. No edits, no creates. |

Role rank lives in `lib/server/org-context.ts` (`roleRank()`):
`owner=0, admin=1, member=2, viewer=3`. The DB enum (`org_role`) was
added in migration `20260406000003_org_member_roles.sql`. `ServerOrgContext`
exposes `isAdmin`, `isViewer`, and `canEditOrg` so any server component
can render read-only state without re-deriving from the role string.

## Per-feature permissions (Enterprise-only override layer)

For Enterprise tier, the owner/admin can override the role default for an
individual member by setting flags on `org_members.permissions` (jsonb):

```jsonc
{
  "canViewBilling": false,        // hide billing tab + portal
  "canViewOrgDataUsage": false,   // hide org-wide data tracker
  "canViewAuditLog": false,
  "canInviteMembers": false,
  "canChangeOrgSettings": false,
  "canPublishToClients": true     // can hit "share" / "publish" in Site Walk
}
```

UI surfaces this on `My Account → Workspace → Permissions` (placeholder
exists). `MyAccountShell` reads `isAdmin` today; once permissions land,
also pull this jsonb and gate tabs accordingly.

## Apps + per-app seat assignment (Enterprise)

Today the four apps are **Site Walk, 360 Tours, Design Studio, Content Studio**. List is open-ended.

For Enterprise plans, admins assign per-app seats on `org_member_app_access`:

```sql
create table org_member_app_access (
  org_id uuid references organizations(id),
  user_id uuid references auth.users(id),
  app_key text check (app_key in ('site_walk','tours','design_studio','content_studio')),
  primary key (org_id, user_id, app_key)
);
```

`AppsGrid` and `QuickNav` should read this and only show apps the user
has been assigned, in addition to the org-level `canAccessStandalone*`
flags. Today both surfaces show all four apps to every user in the internal launch build.

## Project-scoped access

Independent from org role. Two models:

1. **All projects** (default for owner/admin, viewer with `viewer` role)
2. **Specific projects** — user appears in `project_members(project_id, user_id, role)` with role `editor` / `commenter` / `viewer`

For ASU / enterprise pilots:
- 40–50 PMs/architects = `member` role on `org:asu` + `editor` on the projects they create
- Directors / assistant directors = `viewer` role on `org:asu` (read-all)
  + automatic membership inserted on every new project under that org

## Leadership Oversight / Global Command Center

Leadership oversight is organization-scoped, not project-scoped:

- Solo customers are `owner` of their own organization and should simply see the normal app unless they open leadership tools intentionally.
- Multi-person organizations can promote directors, department heads, or operations leads to `owner` / `admin` for full control or `viewer` for read-only leadership oversight.
- `owner` / `admin` users should receive a Global Command Center view that can list every active Site Walk across the organization, show status/risk/activity, and allow auditable comments where enabled.
- `viewer` users receive read-only leadership dashboards and deliverables without upload/edit controls.
- Server-side access must continue to derive from `organization_members.role`, project-aware helpers, and RLS; UI-only hiding is not sufficient.

## Demographic data captured at signup

Persisted into `auth.users.user_metadata` from `/api/auth/signup`:

- `full_name` (required)
- `company` (optional)
- `jobTitle` (optional)
- `industry` (optional, fixed list)
- `companySize` (optional, fixed list)
- `referralSource` (optional, free text)
- `signupAt` (server-set ISO timestamp)

Operations Console reads these via `auth.admin.listUsers()` for
segmentation: industry breakdown, company size cohort, referral
attribution. Future: copy to a `profiles` table for cheaper analytics
queries.

## Operations Console (CEO-only)

Lives at `/operations-console`. Visibility controlled by
`resolveServerOrgContext().canAccessOperationsConsole` (driven by
`isSlateCeo` + `slate360_staff` table). NOT a tier feature.

Capabilities (planned / scaffolded):

- All users + demographic segmentation
- Storage usage, credits balance per org
- Subscription status: active / trialing / past-due / canceled / lapsed
- Cohort actions: send promo, grant free month, grant temporary app access
- Audit log of CEO actions

---

## Project Collaborators (cross-org, per-project)

**Goal:** A subscriber working on a project can invite outside
contributors (e.g. PM invites a vendor, inspector, facilities tech, contractor, adjuster, or teammate) to help
with that one project. Collaborators may or may not already have a
Slate360 subscription.

### Data model

```sql
-- Already exists (see 20260223_create_projects.sql):
--   project_members (project_id, user_id, role, invited_at)
-- Already exists (see 20260418080828_create_invitation_tokens.sql):
--   invitation_tokens (token, invite_type, project_id, status, expires_at,
--                      max_redemptions, redeemed_count, metadata)
--
-- New gap to fill:
create table project_collaborator_invites (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  invited_by uuid not null references auth.users(id),
  email text,
  phone text,                       -- E.164 for SMS
  role text not null check (role in ('collaborator','viewer')),
  status text not null check (status in ('pending','accepted','revoked','expired')) default 'pending',
  channel text not null check (channel in ('email','sms','both','link')),
  invitation_token uuid references invitation_tokens(token),
  created_at timestamptz default now(),
  accepted_at timestamptz,
  revoked_at timestamptz
);
create unique index on project_collaborator_invites (project_id, lower(email))
  where email is not null and status = 'pending';
```

### Seat-limit enforcement

- Per-subscriber cap (NOT per-project). Documented in `docs/billing/BILLING_BUILD_FILE.md`:
  - `standard` (Site Walk Pro) tier = up to 3 active collaborator seats across all owned projects.
  - `business` / `enterprise` = configurable, default ≥5 per project.
- Add `maxCollaborators` to `getEntitlements()` resolver (gap `B-A4`).
- `/api/projects/[projectId]/collaborators/invite` rejects with `409 collaborator_limit_reached` when active count ≥ entitlement.
- Active count = `project_members` rows where `role = 'collaborator'` + pending invites belonging to projects owned by this subscriber.

### Invite flow

1. Subscriber opens project → `Project › People` tab → “Invite collaborator”.
2. Picks channel: email, SMS, both, or share-link/QR (for in-person).
3. Server creates `invitation_tokens` row (`invite_type='collaborator'`, `project_id` set) + `project_collaborator_invites` row.
4. Email goes through existing `lib/email.ts` template; SMS goes through new `lib/sms.ts` (Twilio — add as a TODO; for now, fall back to a copyable share link).
5. Recipient lands on `/signup?invite=<token>` (existing redeem path in `app/auth/callback/route.ts`).
6. After signup the existing `redeemInvitationToken()` adds them to `project_members` with `role='collaborator'`.

### UI variations (subscription vs. no-subscription)

- **Collaborator without subscription:**
  - Lands in a stripped-down deputized `Collaborator Shell` — only assigned projects/tasks/walks/pins are visible.
  - Sidebar shows: Assigned Tasks / My Work, permitted Project snapshot, Files (shared folders only), Comments.
  - Hidden: Marketplace, billing, AppsGrid (except read-only viewer of files), Operations Console, settings beyond profile.
  - Site Walk access is assignment-bound: collaborators can submit Progress / Before-and-After captures, notes, file responses, and status updates only on tasks/pins assigned to them.
  - To satisfy iOS/Android app review, if no assigned work exists they see a heavily restricted Personal Workspace for basic quick captures, local notes, and profile/account setup. It cannot create subscriber projects, plan rooms, deliverables, broad file shares, or team assignments.
  - Banner: “You’re collaborating on **‹Project›**. Upgrade to Solo to create your own projects and deliverables.”
- **Collaborator with own subscription:**
  - Sees the full dashboard for their own org.
  - The other subscriber’s project shows up under `Projects › Shared with me`.
  - Switches between contexts via the existing org/project switcher in the header.
  - Collaborates as an equal paid Slate360 user inside the inviting organization’s permissions while retaining their own workspace, files, billing, and projects.

## App Store / Version 1 Access Language

Public user-facing UI must avoid launch-risk wording that Apple can treat as incomplete software:

- Do not show `Beta`, `Beta Testing`, `Waitlist`, or similar wording in normal app surfaces.
- Use `Version 1`, `Foundational Member`, `Account Verification`, `Workspace Provisioning`, or `Account Under Review`.
- The current database/API field names such as `profiles.is_beta_approved` can remain internally until a safe migration is scheduled, but UI copy should present them as Version 1 access/account verification.
- Maintain a permanent pre-approved reviewer account such as `apple@slate360.ai` for App Store submission. It must bypass the access queue and open a complete seeded workspace.

### Code surfaces to build

| Surface | File |
|---|---|
| People tab inside a project | `app/(dashboard)/projects/[projectId]/people/page.tsx` (new) |
| Invite modal | `components/projects/CollaboratorInviteModal.tsx` (new) |
| Limit-aware invite button | `components/projects/InviteCollaboratorButton.tsx` (new) |
| Collaborator shell (no-subscription view) | `app/(collaborator)/layout.tsx` + `components/collaborator/CollaboratorShell.tsx` (new) |
| Server invite endpoint | `app/api/projects/[projectId]/collaborators/invite/route.ts` (new — wraps existing `app/api/invites/generate/route.ts`) |
| Entitlement resolver | `lib/entitlements.ts` (add `maxCollaborators`) |
| SMS delivery | `lib/sms.ts` (new, Twilio — stub OK for first pass) |

---

## Leadership View of Version 1 / Enterprise Projects

**Goal:** ASU directors must be able to see (read-only) every project
that any Version 1 pilot member or employee in their cohort works on, without the employee
having to think about it.

This is the same problem as project collaborators — cross-account
read-only access — but at the **org** level instead of the project
level. We package both behaviors behind one new surface, so the
relevant UI is in the same place no matter who is acting:

### `Project › People` (single tab, two sections)

```
People on this project

  Project members (your team)
    • Maria Lopez — Owner
    • Jamie Wu  — Editor
    [+ Invite teammate]

  Outside collaborators       (counter: 2 / 3 used)
    • Greg the Vendor        pending  email·sms      [Resend] [Revoke]
    • Dana the Inspector     active   email           [Revoke]
    [+ Invite collaborator]

  Shared with leadership      (auto, controlled by org admin)
    • Dr. Smith — Director (read-only)
    • K. Evans  — Asst. Director (read-only)
    [Manage at Workspace › Members]
```

The “Shared with leadership” list is **auto-populated** for every
project in the org from `org_members` rows where `role='viewer'`. The
project owner can’t add or remove leadership viewers from this tab —
that’s done by the org owner/admin under `My Account › Workspace ›
Members & Roles`.

### View selector packaging (per the Apr-19 ask)

In the project header (`/projects/[projectId]`), a small dropdown right
of the project name controls how the project is rendered:

```
[ Acme Tower ▾ ]   View: [ My view  | Owner view (read-only) | Leadership view (read-only) ]
```

- **My view** — default. What the current user can do.
- **Owner view** — visible to admins/leadership-viewers. Same as the
  project owner sees, but writes are blocked client-side and
  re-validated server-side.
- **Leadership view** — stripped to dashboards/deliverables only;
  no upload/edit affordances. Used by ASU directors and CEO Operations
  Console drill-downs.

All three views share the same React tree; switching only flips a
`viewMode` context value that gates write affordances.

---

## Backend status (as of 2026-04-19)

| Concern | Status |
|---|---|
| `viewer` enum on `org_role` | Live (migration `20260406000003`) |
| `roleRank('viewer')` | Live in `lib/server/org-context.ts` |
| `isViewer` / `canEditOrg` flags | Live in `ServerOrgContext` |
| `project_members` table | Live |
| `invitation_tokens` table | Live |
| `redeemInvitationToken()` for collaborators | Live (`lib/server/invites.ts`) |
| `org_member_app_access` per-app seats | **Migration not yet written** |
| `org_members.permissions` jsonb override | **Migration not yet written** |
| `project_collaborator_invites` table | **Migration not yet written** |
| `maxCollaborators` in `getEntitlements()` | **Not yet implemented** (gap `B-A4`) |
| Twilio / SMS delivery | **Not yet implemented** |
| `Project › People` tab | **Not yet built** |
| Collaborator shell (no-subscription) | **Not yet built** |
| View-selector packaging | **Not yet built** |
| Operations Console subscription-status panel | **Not yet built** |
