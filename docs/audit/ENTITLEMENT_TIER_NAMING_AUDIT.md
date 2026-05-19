# Entitlement, Tier & Naming Audit

Last Updated: 2026-05-14
Status: Read-only audit. No code changes.

## Purpose

Maps all entitlement logic so V1 UI can correctly gate features, show appropriate labels, and avoid contradicting the backend.

## Three Coexisting Billing Models

### Model A: Legacy Org-Level Tiers (`lib/entitlements.ts`)

| Tier | Monthly | Storage | Credits | Seats | Collaborators |
|---|---|---|---|---|---|
| `trial` | $0 | 2 GB | 250 | 1 | 0 |
| `standard` | $149 | 25 GB | 5,000 | 3 | 3 |
| `business` | $499 | 100 GB | 25,000 | 15 | 10 |
| `enterprise` | Custom | 500 GB | 100,000 | 999 | ∞ |

Legacy aliases: `creator` → `standard`, `model` → `standard`.

### Model B: Per-App Modular Subscriptions (`lib/entitlements-modular.ts`)

| App | Basic $/mo | Pro $/mo |
|---|---|---|
| site_walk | $79 | $129 |
| tours | $49 | $99 |
| slatedrop | $0 | $39 |
| design_studio | $49 | $99 |
| content_studio | $49 | $99 |

Bundles: `field_pro` ($149), `all_access` ($249).

### Model C: SKU Cost Model (`lib/billing/cost-model.ts`)

Adds `canCreateProjects`, `hasFullProjectManagement`, `collaboratorsPerProject` concepts.

## Entitlement Keys (Model A)

| Key | Trial | Standard | Business | Enterprise |
|---|---|---|---|---|
| `canAccessHub` | ✅ | ✅ | ✅ | ✅ |
| `canAccessDesignStudio` | ❌ | ✅ | ✅ | ✅ |
| `canAccessContent` | ❌ | ✅ | ✅ | ✅ |
| `canAccessTourBuilder` | ❌ | ✅ | ✅ | ✅ |
| `canAccessAnalytics` | ❌ | ❌ | ✅ | ✅ |
| `canAccessReports` | ❌ | ❌ | ✅ | ✅ |
| `canManageSeats` | ❌ | ❌ | ✅ | ✅ |
| `canWhiteLabel` | ❌ | ❌ | ❌ | ✅ |
| `canViewSlateDropWidget` | ✅ | ✅ | ✅ | ✅ |

Standalone flags (from `org_feature_flags`):
- `canAccessStandalonePunchwalk` — gates Site Walk access
- `canAccessStandaloneTourBuilder`
- `canAccessStandaloneDesignStudio`
- `canAccessStandaloneContentStudio`

## Site Walk Access Gating

1. Navigation: `canAccessStandalonePunchwalk` in MobileModuleBar.
2. API routes: `withAppAccess("site_walk")` checks `org_member_app_access` table.
3. Metering: `lib/site-walk/metering.ts` maps modular tier to basic/pro limits.
4. Beta mode: When `NEXT_PUBLIC_BETA_MODE !== "false"`, all gates are bypassed.

## Worksite vs Project Gating

| Concept | Backend Implementation | Gate |
|---|---|---|
| Worksite (field project) | `projects` table with `project_type = 'field'` | `canCreateFieldProject()` — always true, all tiers |
| Full Project | `projects` table with `project_type = 'full'` | `canCreateFullProject()` — business/enterprise only |
| Project conversion | `projects.converted_from_id` self-ref | Field → full upgrade path exists |

**V1 UI Rule:** Show "Worksites" for field projects (all tiers). Show "Projects" for full projects (business+ only). The label switch can be driven by checking `canCreateFullProject()` for the current tier.

## Collaborator Model

| Aspect | Implementation |
|---|---|
| Seat counting | `countActiveCollaborators()` — distinct collaborators across all projects |
| Limits | trial=0, standard=3, business=10, enterprise=∞ |
| Enforcement | `assertCanInviteCollaborator()` throws `CollaboratorLimitError` |
| Detection | `isCollaboratorOnly()` — user has project_members but no org |
| Add-on packs | 5 for $25/mo, 10 for $45/mo, 25 for $99/mo |
| Per-project | `project_collaborator_invites` table with invite/resend/revoke |

## Enterprise Permissions

Business and enterprise tiers get granular per-member permissions:
- `canViewBilling`, `canViewOrgDataUsage`, `canViewAuditLog`
- `canInviteMembers`, `canChangeOrgSettings`, `canPublishToClients`

## Feature Flags

| Flag | Source | Default | Effect |
|---|---|---|---|
| `NEXT_PUBLIC_APP_STORE_MODE` | env | true | Hides `comingSoon` items from nav |
| `NEXT_PUBLIC_BETA_MODE` | env | true | Unlocks ALL entitlements |
| `org_feature_flags` | DB | per-org | Standalone app booleans |

## Recommended V1 Visible Labels

| Backend Concept | V1 Label (Lower Tier) | V1 Label (Higher Tier) |
|---|---|---|
| `project_type = 'field'` | Worksite | — |
| `project_type = 'full'` | — | Project |
| `site_walk_deliverables` | Deliverables | Deliverables |
| Plan sets/sheets | Plans & Documents | Plans & Documents |
| `slatedrop_uploads` / folders | SlateDrop (Files) | SlateDrop (Files) |
| `site_walk_assignments` + `site_walk_comments` | Coordination | Coordination |
| Profile/settings | Account | Account |

**Banned labels:** "Reports" (use Deliverables), "Plan Room" (use Plans & Documents).
