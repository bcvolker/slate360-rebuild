# Org Roles, Permissions, and Member Model

Last updated: 2026-04-19

## Roles (today, in `org_members.role`)

| Role | Created by | Default capability |
|---|---|---|
| `owner` | First user to create the org | Everything. Cannot be removed without ownership transfer. |
| `admin` | Promoted by owner | Same as owner except cannot delete the org or transfer ownership. |
| `member` | Invited by owner/admin | Use the apps. No billing/data/audit/members visibility. |
| `viewer` *(planned)* | Invited by owner/admin | **Read-only across all org projects.** Use case: ASU directors viewing what 40–50 beta-tester PMs/architects produce. No edits, no creates. |

Role rank lives in `lib/server/org-context.ts` (`roleRank()`). Add `viewer = 3` when implemented.

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
flags. Today both surfaces show all four apps to every user (beta).

## Project-scoped access

Independent from org role. Two models:

1. **All projects** (default for owner/admin, viewer with `viewer` role)
2. **Specific projects** — user appears in `project_members(project_id, user_id, role)` with role `editor` / `commenter` / `viewer`

For ASU beta:
- 40–50 PMs/architects = `member` role on `org:asu` + `editor` on the projects they create
- Directors / assistant directors = `viewer` role on `org:asu` (read-all)
  + automatic membership inserted on every new project under that org

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
