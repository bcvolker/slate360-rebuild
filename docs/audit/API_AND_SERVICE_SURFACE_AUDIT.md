# API & Service Surface Audit

Last Updated: 2026-05-14
Status: Read-only audit. No code changes.

## Purpose

Maps all 156 API routes and server-side services for V1 UI reuse planning.

## Route Summary (156 total)

| Category | Count | Auth Pattern |
|---|---|---|
| Auth/Profile/Account | 10 | `withAuth`, inline |
| Organizations/Members | 1 | `withAuth` |
| Billing/Stripe | 5 | `getAuthenticatedOrgContext`, Stripe webhook |
| Projects/Worksites | 26 | `withProjectAuth`, `resolveProjectScope` |
| Site Walk Sessions | 4 | `withAppAccess("site_walk")` |
| Site Walk Items/Captures | 12 | `withAppAccess("site_walk")` |
| Site Walk Plans/Sheets | 9 | `withAppAccess("site_walk")` |
| Site Walk Pins | 2 | `withAppAccess("site_walk")` |
| Site Walk Deliverables | 8 | `withAppAccess("site_walk")` |
| Site Walk Assignments/Comments | 5 | `withAppAccess("site_walk")` |
| Site Walk Templates/Branding | 9 | `withAppAccess("site_walk")` |
| SlateDrop/Files/Storage | 15 | Inline auth |
| Contacts | 3 | `withAuth` |
| Invitations/Collaborators | 6 | `withAuth`, `withProjectAuth` |
| Feedback | 2 | `withAuth` |
| Tours | 8 | `withAppAuth("tour_builder")` |
| Design Studio | 5 | `withAppAuth("design_studio")` |
| Content Studio | 4 | `withAppAuth("content_studio")` |
| CEO/Operations | 4 | `withAuth` + isSlateCeo/isSlateStaff |
| Analytics/Dashboard | 8 | `withAuth`, inline |
| Calendar | 2 | `withAuth` |
| Email | 1 | `withAuth` |
| Public/Unauthenticated | 7 | Token-based or none |

## Site Walk API Routes (Safe for V1 Reuse)

### Sessions
| Route | Methods | Purpose | Safe for V1? |
|---|---|---|---|
| `/api/site-walk/sessions` | GET, POST | List/create walks | Yes |
| `/api/site-walk/sessions/[id]` | GET, PATCH, DELETE | Get/update/delete walk | Yes |
| `/api/site-walk/sessions/[id]/sign` | POST | Capture signatures | Yes |
| `/api/site-walk/sessions/[id]/status-report` | POST | Generate status report | Yes |

### Items/Captures
| Route | Methods | Purpose | Safe for V1? |
|---|---|---|---|
| `/api/site-walk/items` | GET, POST | List/create captures | Yes |
| `/api/site-walk/items/[id]` | GET, PATCH, DELETE | CRUD item | Yes |
| `/api/site-walk/items/[id]/image` | GET | Presigned image URL | Yes |
| `/api/site-walk/items/[id]/resolve` | POST | Resolve item | Yes |
| `/api/site-walk/items/[id]/verify` | POST | Verify item | Yes |
| `/api/site-walk/items/[id]/voice` | POST | Voice transcription | Yes |
| `/api/site-walk/items/[id]/comparison` | GET | Before/after comparison | Yes |
| `/api/site-walk/items/bulk` | PATCH | Bulk update | Yes |
| `/api/site-walk/inbox` | GET | Items needing attention | Yes |
| `/api/site-walk/board` | GET | Leadership board overview | Yes |
| `/api/site-walk/upload` | POST | Upload file | Yes |
| `/api/site-walk/transcribe` | POST | Transcribe audio | Yes |

### Plans/Sheets
| Route | Methods | Purpose | Safe for V1? |
|---|---|---|---|
| `/api/site-walk/plans` | GET, POST | Legacy plan CRUD | Yes (legacy) |
| `/api/site-walk/plans/[id]` | DELETE | Delete plan | Yes (legacy) |
| `/api/site-walk/plans/[id]/image` | GET | Plan image URL | Yes |
| `/api/site-walk/plan-sets` | GET, POST | Plan set CRUD | Yes |
| `/api/site-walk/plan-sets/[id]/file` | GET | Plan set file URL | Yes |
| `/api/site-walk/plan-sets/[id]/pdf` | GET | Plan set PDF | Yes |
| `/api/site-walk/plan-sets/[id]/rasterize` | POST | Trigger rasterization | Yes |
| `/api/site-walk/plan-sets/[id]/sheets/auto` | POST | Auto-detect sheets | Yes |
| `/api/site-walk/plan-sheets/[id]/image` | GET | Sheet image URL | Yes |

### Pins
| Route | Methods | Purpose | Safe for V1? |
|---|---|---|---|
| `/api/site-walk/pins` | GET, POST | List/create pins | Yes |
| `/api/site-walk/pins/[id]` | PATCH, DELETE | Move/delete pin | Yes |

### Deliverables
| Route | Methods | Purpose | Safe for V1? |
|---|---|---|---|
| `/api/site-walk/deliverables` | GET, POST | List/create deliverables | Yes |
| `/api/site-walk/deliverables/[id]` | GET, PATCH, DELETE | CRUD deliverable | Yes |
| `/api/site-walk/deliverables/[id]/export` | POST | PDF export | Yes |
| `/api/site-walk/deliverables/[id]/share` | POST | Generate share link | Yes |
| `/api/site-walk/deliverables/[id]/revoke` | POST | Revoke share | Yes |
| `/api/site-walk/deliverables/[id]/snapshot` | POST, GET | History snapshots | Yes |
| `/api/site-walk/deliverables/[id]/views` | GET | View analytics | Yes |
| `/api/site-walk/deliverables/send` | POST | Email deliverable | Yes |

### Assignments/Comments
| Route | Methods | Purpose | Safe for V1? |
|---|---|---|---|
| `/api/site-walk/assignments` | GET, POST | List/create assignments | Yes |
| `/api/site-walk/assignments/[id]` | GET, PATCH, DELETE | CRUD assignment | Yes |
| `/api/site-walk/comments` | GET, POST | List/create comments | Yes |
| `/api/site-walk/comments/[id]` | DELETE | Delete comment | Yes |
| `/api/site-walk/comments/[id]/read` | POST | Mark read | Yes |

## Project API Routes (Safe for V1 Reuse)

| Route | Methods | Purpose | Safe for V1? |
|---|---|---|---|
| `/api/projects` | GET | List projects | Yes |
| `/api/projects/create` | POST | Create project | Yes |
| `/api/projects/[projectId]` | GET, PATCH, DELETE | CRUD project | Yes |
| `/api/projects/[projectId]/team` | GET | Team roster | Yes |
| `/api/projects/[projectId]/collaborators/invite` | POST | Invite collaborator | Yes |

## SlateDrop API Routes (Safe for V1 Reuse)

| Route | Methods | Purpose | Safe for V1? |
|---|---|---|---|
| `/api/slatedrop/upload-url` | POST | Presigned upload URL | Yes |
| `/api/slatedrop/complete` | POST | Finalize upload | Yes |
| `/api/slatedrop/files` | GET | List folder files | Yes |
| `/api/slatedrop/folders` | GET, POST, PATCH, DELETE | Folder CRUD | Yes |
| `/api/slatedrop/download` | GET | Presigned download URL | Yes |
| `/api/slatedrop/delete` | DELETE | Soft-delete file | Yes |
| `/api/slatedrop/provision` | POST | Create 17 system folders | Yes |
| `/api/slatedrop/secure-send` | POST | Share link | Yes |
| `/api/slatedrop/request-link` | POST | External upload link | Yes |

## Server-Side Utilities

| File | Purpose | Safe for V1? |
|---|---|---|
| `lib/server/api-auth.ts` | Auth wrappers | Yes |
| `lib/server/api-response.ts` | Response helpers | Yes |
| `lib/server/org-context.ts` | Org/user/role resolver | Yes |
| `lib/server/collaborators.ts` | Collaborator counting/limits | Yes |
| `lib/server/collaborator-mode.ts` | Collaborator-only user detection | Yes |
| `lib/server/invites.ts` | Invite redemption | Yes |
| `lib/server/api-app-access.ts` | Per-app seat checks | Yes |
| `lib/server/org-feature-flags.ts` | Entitlement resolution | Yes |
| `lib/project-access.ts` | Field vs full project gates | Yes |
| `lib/site-walk/metering.ts` | Usage metering | Yes |
| `lib/slatedrop/provisioning.ts` | Auto-folder creation | Yes |
| `lib/site-walk/slatedrop-bridge.ts` | Photo/PDF bridging to SlateDrop | Yes |

## Missing API Surfaces

| Missing | Impact | Priority |
|---|---|---|
| No worksite-specific list endpoint | V1 must filter `projects` by `project_type='field'` | High |
| No walk-to-worksite reassignment endpoint | V1 row menu "Link Worksite" needs backend | Medium |
| No deliverable interactive viewer renderer | API CRUD exists but frontend viewers not built | Medium |
| No cross-org sharing endpoint | Collaboration stays within org boundary | Low for V1 |
