# Collaboration & Organization Access Audit

Last Updated: 2026-05-14
Status: Read-only audit. No code changes.

## Purpose

Maps collaboration, org, and access control infrastructure for V1 UI.

## Organization-Level Model

| Table | Purpose | Roles |
|---|---|---|
| `organizations` | Org container | — |
| `organization_members` | Membership + RBAC | owner, admin, member, viewer |

Role capabilities:
- **Owner**: full control, billing, staff management
- **Admin**: full control except billing/ownership
- **Member**: read/write project data, create walks
- **Viewer**: read-only

Enterprise permissions (jsonb on `organization_members`):
- `canViewBilling`, `canViewOrgDataUsage`, `canViewAuditLog`
- `canInviteMembers`, `canChangeOrgSettings`, `canPublishToClients`

## Project-Level Sharing

| Table | Purpose |
|---|---|
| `project_members` | `{ project_id, user_id, role }` — includes `collaborator` role |
| `project_collaborator_invites` | `{ project_id, email, phone, status, invitation_token }` |
| `project_stakeholders` | `{ project_id, name, role, company, email }` (directory, not access) |
| `project_external_links` | Token-gated external access (folder-scoped upload) |

## Collaborator Model

| Aspect | Implementation |
|---|---|
| Invite flow | `POST /api/projects/[projectId]/collaborators/invite` → creates invite + token |
| Resend | `POST .../collaborators/[inviteId]/resend` |
| Revoke | `POST .../collaborators/[inviteId]/revoke` |
| Redeem | `POST /api/invites/redeem` → `ensureProjectMembership()` adds project_members row |
| Detection | `isCollaboratorOnly()` — has project_members but no organization_members |
| Seat counting | `countActiveCollaborators()` — distinct across all org projects |
| Limits | trial=0, standard=3, business=10, enterprise=∞ |
| Add-on packs | 5/$25, 10/$45, 25/$99 per month |
| Per-project | Each invite is project-scoped |

## Collaborator UI

| Route | Component | Status |
|---|---|---|
| `/collaborator` | `CollaboratorHomePage` | Active — lists shared projects |
| `/collaborator/layout.tsx` | `CollaboratorRouteLayout` | Active — guards, redirects non-collaborators |
| `/collaborator/files` | — | Nav link exists, page not built |
| `/collaborator/comments` | — | Nav link exists, page not built |
| `/collaborator/settings` | — | Nav link exists, page not built |

CollaboratorShell: stripped-down frame with SlateLogo, upgrade banner, sidebar with My projects/Shared files/Comments/Account.

## Invitation Flows

| Type | Source | Target | Mechanism |
|---|---|---|---|
| CEO invite | Owner email | VIP beta access | `invitation_tokens` with `invite_type: 'ceo'` |
| Beta invite | Beta-approved user | Beta access | `invitation_tokens` with `invite_type: 'beta'` |
| Collaborator invite | Project owner/admin/member | Project access | `project_collaborator_invites` + `invitation_tokens` |
| Org member invite | `POST /api/org/members/invite` | Org membership | Direct `organization_members` insert |

## Cross-Organization Sharing

**Not supported.** Collaborators are org-less users invited to specific projects. No org-to-org sharing mechanism exists. A collaborator who wants full access must create their own subscription.

## What Exists vs Missing

| Capability | Status |
|---|---|
| Org membership with roles | Production |
| Enterprise per-member permissions | Production |
| Per-project collaborator invites | Production |
| Collaborator seat counting/limits | Production |
| Collaborator add-on packs | Production |
| Collaborator-only user routing | Production |
| Collaborator files page | Not built |
| Collaborator comments page | Not built |
| Cross-org sharing | Not built |
| Department-level access (e.g., ASU) | Not built |
| Shared-with-me project list | Exists for collaborators only |
| Leadership view of employee work | Via `/api/site-walk/board` (active sessions) |
| Per-worksite/project team management | Via `/api/projects/[id]/team` |
