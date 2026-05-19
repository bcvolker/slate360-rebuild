# Frontend Surface to Backend Match Audit

Last Updated: 2026-05-14
Status: Read-only audit. No code changes.

## Purpose

Maps visible frontend surfaces to actual backend data and identifies filler/disconnected surfaces.

## Surface Map

### Dashboard / Home

| Surface | Route | Backend | Filler Risk | App Store V1 Visible? | Action |
|---|---|---|---|---|---|
| Dashboard Home | `/(dashboard)/page.tsx` | `organization_members`, `slatedrop_uploads`, widgets | Low (real data) | Yes | Keep |
| Quick Nav | AppShell command palette | Entitlements for gating | Low | Yes | Keep |

### Site Walk Home

| Surface | Route | Backend | Filler Risk | App Store V1 Visible? | Action |
|---|---|---|---|---|---|
| Site Walk Hub | `/site-walk/page.tsx` → `SiteWalkHub.tsx` | `site_walk_sessions`, `projects` | Medium (layout debt, not filler data) | Yes | Replace UI via V1 |
| Command Center actions | SiteWalkHub.tsx | Real actions wired | Low | Yes | Replace UI via V1 |
| Work panel tabs | SiteWalkHub.tsx | Real session/project data | Medium (pill-heavy UI) | Yes | Replace UI via V1 |

### Worksites / Walks

| Surface | Route | Backend | Filler Risk | App Store V1 Visible? | Action |
|---|---|---|---|---|---|
| Walks page | `/site-walk/walks/page.tsx` | `site_walk_sessions`, `projects` | Medium (layout debt) | Yes | Replace UI via V1 |
| Walk actions | `WalkActionsMenu.tsx` | Session CRUD | Low | Yes | Replace UI via V1 |
| Delete walk | `DeleteWalkButton.tsx` | Session DELETE | Low | Yes | Merge into V1 row menu |

### Plan / Capture

| Surface | Route | Backend | Filler Risk | App Store V1 Visible? | Action |
|---|---|---|---|---|---|
| Plan viewer | `PlanViewerLeaflet.tsx` | `site_walk_plan_sheets`, `site_walk_pins` | Low (working behavior) | Yes | Keep behavior, replace chrome via V1 |
| Capture shell | `CaptureShell.tsx` | Items CRUD, upload | Low (working behavior) | Yes | Keep behavior, replace chrome via V1 |
| Capture bottom sheet | `CaptureDataBottomSheet.tsx` | Item metadata | Medium (overlay debt) | Yes | Replace chrome via V1 |

### SlateDrop

| Surface | Route | Backend | Filler Risk | App Store V1 Visible? | Action |
|---|---|---|---|---|---|
| SlateDrop hub | `/slatedrop/page.tsx` | Folder cards, entitlements | Low | Yes | Keep, ensure visible from Home |
| File browser | `/slatedrop/[...section]` | `slatedrop_uploads`, `project_folders` | Low | Yes | Keep |

### Deliverables

| Surface | Route | Backend | Filler Risk | App Store V1 Visible? | Action |
|---|---|---|---|---|---|
| Deliverables list | `/site-walk/deliverables/page.tsx` | `site_walk_deliverables` | Low | Yes | Replace UI, rename from "Reports" |
| New deliverable | `/site-walk/deliverables/new` | Deliverable creation | Medium | Yes | Wire properly |
| Report builder | `ReportBuilderClient.tsx` | Static wireframe only | **High** — wireframe, not functional | No | Hide until wired |
| Share/viewer | `/view/[token]` | Token-gated public access | Low | Yes (public) | Keep |
| New reports page | `/site-walk/reports/new` | Deliverable creation | Low | Yes | Rename to Deliverables |

### Coordination

| Surface | Route | Backend | Filler Risk | App Store V1 Visible? | Action |
|---|---|---|---|---|---|
| Assignments | API exists | `site_walk_assignments` | No UI page exists | Needs V1 | Wire later |
| Comments | API exists | `site_walk_comments` | Inline in items only | Needs V1 | Wire later |
| Inbox | `/api/site-walk/inbox` | Items needing attention | No dedicated page | Needs V1 | Wire later |

### Account / Settings

| Surface | Route | Backend | Filler Risk | App Store V1 Visible? | Action |
|---|---|---|---|---|---|
| Settings page | `/settings` | Org settings, billing | Low | Yes | Keep |
| Account page | `/settings/account` | Profile data | Low | Yes | Keep |
| Billing | `/billing` or settings | Stripe integration | Low | Yes, gated | Keep |

### Operations / Admin

| Surface | Route | Backend | Filler Risk | App Store V1 Visible? | Action |
|---|---|---|---|---|---|
| CEO console | `/(admin)/ceo` | Platform metrics | Low | No (internal) | Hide from app store |
| Staff management | `/api/ceo/staff` | `slate360_staff` | Low | No (internal) | Hide from app store |

### Project Hub (Higher-Tier PM)

| Surface | Route | Backend | Filler Risk | App Store V1 Visible? | Action |
|---|---|---|---|---|---|
| Project Hub | `/project-hub/[projectId]` | Full PM data | Low | No (business+ only) | Hide for V1 app store |
| Budget/Schedule/RFIs | Under project hub | Full PM tables | Low | No | Hide for V1 |
| Drawings/Photos/Management | Under project hub | Project data | Low | No | Hide for V1 |

### Other Apps

| Surface | Route | Backend | Filler Risk | App Store V1 Visible? | Action |
|---|---|---|---|---|---|
| Tours | `/tour-builder` | `project_tours`, `tour_scenes` | Low (real) | No | Hide |
| Design Studio | `/design-studio` | `project_models`, `model_files` | Low (real) | No | Hide |
| Content Studio | `/content-studio` | `media_collections`, `media_assets` | Low (real) | No | Hide |

### Surfaces That Are Filler or Disconnected

| Surface | Issue | Risk |
|---|---|---|
| Site Walk "More" page | `/site-walk/more` — duplicate nav, no unique purpose | Medium — remove or merge |
| Report builder wireframe | Static wireframe, no block CRUD wired | **High** — hide |
| Collaborator files/comments/settings | Nav links exist, pages not built | Medium — remove nav links |
| `app/(public)/apps/[slug]` | Contains "Coming Soon" labels | Medium — hidden by app store mode |
