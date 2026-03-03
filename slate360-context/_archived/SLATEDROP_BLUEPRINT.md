# SlateDrop — Complete System Blueprint

**Last Updated:** 2026-03-02
**Purpose:** Single source of truth for the SlateDrop file-management system. This document is authoritative enough to rebuild the entire SlateDrop folder system (structure, rules, code, backend) from scratch if the project ever needs to be restarted.

---

## Table of Contents

1. [What SlateDrop Is](#1-what-slatedrop-is)
2. [Multiple Entry Points](#2-multiple-entry-points)
3. [Folder System Architecture](#3-folder-system-architecture)
4. [Projects — Single Source of Truth](#4-projects--single-source-of-truth)
5. [Project Subfolder Structure](#5-project-subfolder-structure)
6. [Auto-Save from Tab Activity](#6-auto-save-from-tab-activity)
7. [Inbound Documents & Notifications](#7-inbound-documents--notifications)
8. [Tier & Entitlement Gating](#8-tier--entitlement-gating)
9. [Data Limits, Credits, and Cost Protection](#9-data-limits-credits-and-cost-protection)
10. [UI — Explorer Interface](#10-ui--explorer-interface)
11. [3-Dot Menu & Project Card Interactions](#11-3-dot-menu--project-card-interactions)
12. [2-Step Project Deletion](#12-2-step-project-deletion)
13. [Permissions & Sharing](#13-permissions--sharing)
14. [Backend — Database Tables](#14-backend--database-tables)
15. [Backend — API Routes](#15-backend--api-routes)
16. [Frontend — Key Files](#16-frontend--key-files)
17. [State Management](#17-state-management)
18. [Data Retention Rules](#18-data-retention-rules)
19. [Known Tech Debt & Migration Status](#19-known-tech-debt--migration-status)
20. [Reconstruction Checklist](#20-reconstruction-checklist)

---

## 1. What SlateDrop Is

SlateDrop is the **single unified file system** for all users across all tabs of Slate360. It behaves like macOS Finder or Windows Explorer with Dropbox-style sharing and an S3/Supabase backend.

**Core principles:**
- One SlateDrop instance per user/org — same system opened everywhere.
- **Projects folder is the canonical record** for all project-related files.
- System folders are provisioned by tier and can never be moved, renamed, or deleted.
- User-created folders have full CRUD permissions.
- External parties (clients, subs, consultants) can receive scoped share links.
- When a user is inside a project (in any tab), saving sends the file to the correct project subfolder automatically.
- When an external party returns a document electronically, it lands in the project subfolder automatically and triggers a user notification.

---

## 2. Multiple Entry Points

SlateDrop opens in the same state from every entry point — the same folder tree, same files.

| Entry Point | Route | Context |
|---|---|---|
| Dashboard widget | `/dashboard` | Opens from sidebar "SlateDrop" widget; defaults to org root |
| SlateDrop tab | `/slatedrop` | Full-screen explorer |
| Project Hub — projects list | `/project-hub` | Shows project cards; clicking opens project in both Project Hub AND SlateDrop project folder |
| Project Hub — project home | `/project-hub/[projectId]` | Context-aware; SlateDrop opens scoped to `/Projects/{projectId}` |
| Project Hub — Tier 1 card context menu | 3-dot → "Open in Project Hub" | Navigates to `/project-hub/[projectId]` |
| Slatedrop project sandbox | `/slatedrop` → Projects folder → project node | Sidebar 3-dot, context menu, project info banner |
| Individual tab (Design Studio, etc.) | Any tab save action | Routes output to the correct project subfolder |

**Rule:** `initialProjectId` prop on `<SlateDropClient>` auto-navigates to that project's sandbox folder on mount.

---

## 3. Folder System Architecture

### 3.1 System Folders (Locked — Cannot Rename/Move/Delete)

Provisioned on account creation via `/api/slatedrop/v2/provision`. Locked folders are identified by `is_system = true` in the `project_folders` table.

```
org-root/
├── General/          (always present on all tiers)
├── History/          (always present on all tiers)
├── Project Hub/      (business + enterprise only — contains Projects/)
│   └── Projects/
│       └── {projectId}/    ← see Section 5
├── Design Studio/    (model + business + enterprise)
├── Content Studio/   (creator + model + business + enterprise)
├── 360 Tour Builder/ (creator + model + business + enterprise)
├── Geospatial & Robotics/ (model + business + enterprise)
└── [trial gets all of the above, with strict processing limits]
```

### 3.2 User Folders (Fully Editable)

Users can create unlimited subdirectories anywhere in their folder tree (except inside locked system paths). Operations:
- Rename
- Move (drag-and-drop or context menu)
- Copy
- Delete (non-empty folder requires confirmation)
- Share (generate link with granular permissions)

### 3.3 Projects Folder (Business + Enterprise + Trial)

`/Projects/` is a special system folder that acts as the container for all project records. Each project creates a subtree at `/Projects/{projectId}/` with a canonical subfolder set (see Section 5).

Trial users see the Projects folder structure so they understand what they get on upgrade. Their ability to create project records is limited by tier (see Section 8).

---

## 4. Projects — Single Source of Truth

SlateDrop **is** the single source of truth for projects. A project card that appears in the Dashboard or Project Hub is the same entity that has its folders in SlateDrop at `/Projects/{projectId}/`.

**Project record** (stored in `projects` Supabase table):
```typescript
{
  id: string;               // UUID, also the folder path segment
  name: string;
  org_id: string;
  status: 'active' | 'on_hold' | 'closed';
  metadata: {
    location?: { address: string; lat: number; lng: number; boundary?: LatLng[] };
    startDate?: string;
    endDate?: string;
    client?: string;
    projectNumber?: string;
  };
  created_at: string;
  updated_at: string;
}
```

**Consistency rule:** Any place a project card is displayed (Dashboard, Project Hub, SlateDrop sidebar) reads from the same `projects` table row and links to the same `/Projects/{projectId}/` folder tree.

**Access:** SlateDrop sidebar shows project nodes (`parentId === "projects"`) in the Projects folder section. Clicking a project node in the sidebar navigates the content pane to that project's subfolder tree.

---

## 5. Project Subfolder Structure

When a project is created (via the new-project wizard in Project Hub or via API), the following subfolders are provisioned automatically:

```
Projects/
└── {projectId}/
    ├── Documents/          ← contracts, specs, correspondence
    │   ├── Contracts/
    │   ├── Specs/
    │   └── Correspondence/
    ├── Drawings/           ← architectural, structural, civil, MEP
    │   ├── Architectural/
    │   ├── Structural/
    │   └── MEP/
    ├── Photos/             ← site photos, inspection images
    ├── RFIs/               ← RFI attachments and responses
    ├── Submittals/         ← submittal packages and approvals
    ├── Schedule/           ← schedule files, Gantt exports
    ├── Budget/             ← budget spreadsheets, cost reports
    └── Records/            ← closeout, punch, warranties, O&M
```

Each of these maps 1:1 to a page/tool inside the project in Project Hub:

| SlateDrop Subfolder | Project Hub Page | What auto-saves there |
|---|---|---|
| `Documents/` | `/project-hub/[id]/documents` | Any document upload inside Projects docs tool |
| `Drawings/` | `/project-hub/[id]/drawings` | Plan uploads, Design Studio exports scoped to this project |
| `Photos/` | `/project-hub/[id]/photos` | Photo uploads, 360 tour captures |
| `RFIs/` | `/project-hub/[id]/rfis` | RFI attachments at creation, RFI responses when received |
| `Submittals/` | `/project-hub/[id]/submittals` | Submittal packages; reviewer stamp attachments |
| `Schedule/` | `/project-hub/[id]/schedule` | Gantt exports, milestone reports |
| `Budget/` | `/project-hub/[id]/budget` | Cost report exports, budget spreadsheets |
| `Records/` | `/project-hub/[id]/records` | Closeout packages, O&M manuals, warranties |

**Implementation note:** Every API route that creates a file inside a project context must resolve the `folder_id` of the correct SlateDrop subfolder and record the file in both `unified_files` (or `project_files`) **and** `project_folders`. File upload routes accept an optional `projectSubfolder` param (`"rfis"`, `"submittals"`, etc.) and route accordingly.

---

## 6. Auto-Save from Tab Activity

When a user is working inside a project in any tab, saves land in the correct SlateDrop subfolder automatically. The pattern:

### 6.1 Client-side context

The active `projectId` is tracked in a Zustand store (or URL param). Every save action includes the `projectId` in the API call body.

### 6.2 Server-side routing

API routes that write project files:

```typescript
// Example: RFI attachment upload
POST /api/slatedrop/upload-url
Body: { projectId, subfolder: "rfis", fileName, fileType }
// Returns: presigned S3 URL

POST /api/slatedrop/complete
Body: { projectId, subfolder: "rfis", s3Key, fileName, fileType, size }
// Creates record in unified_files, links to project_folders row for RFIs/
```

### 6.3 Design Studio → Drawings

When a Design Studio project exports or saves a version, and that design studio project is linked to a Project Hub project (`projects.id`), the version file is also sent to `/Projects/{projectId}/Drawings/`.

---

## 7. Inbound Documents & Notifications

When an external party (client, sub, consultant) sends a document to a project via a share/response link:

### 7.1 Flow

1. User creates an **external response link** via `/api/slatedrop/request-link` scoped to a specific subfolder (e.g., `Submittals/`).
2. External party receives the link and uploads via the public `/external/[token]` route.
3. Server-side handler (`app/api/slatedrop/complete` + `external_response_links` table) writes the file to:
   - The scoped project subfolder in `project_folders`
   - `unified_files` with `source: "external_response"`
4. A notification record is created in the `notifications` table.
5. The signed-in user receives a **real-time notification** (Supabase Realtime channel or polling) that a document has arrived and is ready for review.

### 7.2 Notification payload

```typescript
{
  type: "document_received",
  project_id: string;
  project_name: string;
  file_name: string;
  subfolder: string;    // e.g., "RFIs"
  sender_name?: string;
  received_at: string;
  link: `/project-hub/${projectId}/rfis`   // deep link to the correct tool view
}
```

### 7.3 UI

The Bell icon in the SlateDrop header (and the main app header) shows a badge with unread count. Clicking opens a notification tray with each item linking directly to the correct tool view.

---

## 8. Tier & Entitlement Gating

Source of truth: `lib/entitlements.ts` — **never duplicate tier logic in pages**.

```typescript
const TIER_MAP = {
  trial:      { canAccessHub: true,  maxStorageGB: 5,    maxCredits: 500,    maxSeats: 1  },
  creator:    { canAccessHub: false, maxStorageGB: 40,   maxCredits: 6000,   maxSeats: 1  },
  model:      { canAccessHub: false, maxStorageGB: 150,  maxCredits: 15000,  maxSeats: 1  },
  business:   { canAccessHub: true,  maxStorageGB: 750,  maxCredits: 30000,  maxSeats: 25 },
  enterprise: { canAccessHub: true,  maxStorageGB: 5000, maxCredits: 100000, maxSeats: 999},
}
```

### SlateDrop-specific gates

| Feature | Trial | Creator | Model | Business | Enterprise |
|---|---|---|---|---|---|
| System folders provisioned | All tabs | Content + Tour | Design + Content + Tour + Geo | All tabs | All tabs |
| Projects folder + project subfolders | View only (no create) | ✗ | ✗ | ✅ | ✅ |
| Create sandbox project | ✗ | ✗ | ✗ | ✅ | ✅ |
| User-created folders | ✅ | ✅ | ✅ | ✅ | ✅ |
| Share links (external) | ✗ | ✅ | ✅ | ✅ | ✅ |
| Storage limit shown in header | 5 GB | 40 GB | 150 GB | 750 GB | 5 TB |
| Upload blocked when over storage limit | ✅ | ✅ | ✅ | ✅ | ✅ |

### Trial data protection rules (cost protection)

**Problem:** Thousands of trial users potentially hammering S3 and GPU workers.

**Rules:**
- Trial uploads are capped at **50 MB per file**, **500 MB total storage**.
- Processing jobs (photogrammetry, AI, 3D) require a credit balance check BEFORE enqueue. Trial has 500 credits.
- Processing reservation uses Supabase RPC `consume_credits(org_id, amount)` — never proceeds without this check.
- If `total_available == 0`, show upgrade modal, not an error.
- Trial accounts are auto-suspended after **90 days of inactivity** (no logins or uploads). Suspended accounts cannot upload but data is preserved for 30 additional days.
- Server-side upload-url route checks both storage limit AND per-file limit before returning a presigned URL.

```typescript
// In /api/slatedrop/upload-url
if (tier === 'trial') {
  if (fileSizeMb > 50) return badRequest('Trial file size limit is 50 MB');
  if (currentStorageGb + fileSizeMb/1024 > 0.5) return badRequest('Trial storage limit reached');
}
```

---

## 9. Data Limits, Credits, and Cost Protection

### Storage tracking

`project_folders` rows have `folder_path` and `org_id`. `unified_files` rows have `size` (bytes). A server-side function or view aggregates total bytes per `org_id`.

Dashboard usage widget calls `GET /api/dashboard/usage` which returns:

```typescript
{
  storage: { used: number, limit: number, percent: number },
  credits: {
    monthlyAllocation: number,
    monthlyUsed: number,
    monthlyRemaining: number,
    purchasedBalance: number,   // Never expire
    totalAvailable: number,
    daysUntilReset: number,
  }
}
```

### Credit consumption order

1. Monthly allocation credits consumed first (they reset on billing cycle anyway).
2. Purchased credits consumed after monthly is exhausted.
3. `consume_credits(org_id, amount)` Supabase RPC enforces this order atomically.

### Subtle credit purchase

The credit top-up is intentionally non-intrusive (per product decision). It appears:
- As a small link near the usage widget when ≤20% remains.
- As a "Top up" badge in the header when credits are critically low.
- Never as a modal pop-up on its own.

### Credit packs

| Pack | Credits | Additional Storage | Price |
|---|---|---|---|
| Starter | 100 | 5 GB | $9.99 |
| Pro | 500 | 25 GB | $39.99 |
| Enterprise | 2,000 | 100 GB | $99.99 |

Purchased via `POST /api/credits/purchase` → Stripe Checkout → webhook → `add_purchased_credits(org_id, amount)` RPC.

---

## 10. UI — Explorer Interface

**Component:** `components/slatedrop/SlateDropClient.tsx` (~2000 lines, may need splitting)

### Layout

```
┌─────────────────────────────────────────────────┐
│  Header: Logo | Search | Bell | Credits | Tier  │
├──────────┬──────────────────────────────────────┤
│ Sidebar  │  Content Pane                        │
│          │                                      │
│ Folder   │  Breadcrumb | View Toggle | Sort | Upload│
│ Tree     │                                      │
│          │  File Grid / List                    │
│          │                                      │
│          │  (Project Info Banner when in proj.) │
└──────────┴──────────────────────────────────────┘
```

### Sidebar Folder Tree

- Rendered by `FolderTreeItem` — recursive component.
- Each node: icon (color-coded by type) + label.
- **System folders:** locked icon, no 3-dot.
- **Project nodes** (`parentId === "projects"`): show 3-dot (`MoreHorizontal`) button on hover via `opacity-0 group-hover/tree-row:opacity-100` pattern. Clicking 3-dot calls `onMenuClick(node, e)`.
- Clicking a folder node sets `activeFolderId` and loads files.
- Chevron toggle for expand/collapse of children.

### Project Info Banner (Content Pane)

When the active folder is a sandbox project root (`sandboxProjects.find(p => p.id === activeFolderId)`), display a banner above the file list:

```tsx
<div className="project-info-banner">
  <h3>{project.name}</h3>
  <span>{project.folders.length} subfolders</span>
  <button onClick={() => window.location.href = `/project-hub/${project.id}`}>
    Project Hub →
  </button>
  <button onClick={handleDelete2Step}>Delete Project</button>
</div>
```

### Context Menu

Right-click or 3-dot triggers a context menu. Items vary by node type:

| Item | Icon | Shown When |
|---|---|---|
| Open | `FolderOpen` | Always |
| Rename | `Edit3` | Non-system folders & files |
| Copy | `Copy` | Files |
| Move | `Scissors` | Non-system folders & files |
| Share | `Share2` | Non-system folders |
| Download | `Download` | Files |
| **Open in Project Hub** | `ArrowUpRight` (accent) | Project nodes only |
| **Delete** | `Trash2` (danger) | Non-system nodes |

### View modes

- Grid view: file cards with thumbnail/icon, name, size, date.
- List view: table with name, type, size, date modified columns.
- Details view (future): adds preview pane on right.

Toggle between views via icons in the content pane header.

### Drag and Drop Upload

- Drop zone covers the entire content pane.
- Files dropped trigger presigned URL flow (see API section).
- Upload progress shown inline on each file card.

---

## 11. 3-Dot Menu & Project Card Interactions

### SlateDrop Sidebar 3-dot (Project Nodes)

```tsx
// FolderTreeItem receives onMenuClick prop
onMenuClick?: (node: FolderNode, e: React.MouseEvent<HTMLButtonElement>) => void

// 3-dot button: only visible on hover, only on project nodes
{node.parentId === "projects" && onMenuClick && (
  <button
    className="opacity-0 group-hover/tree-row:opacity-100 ..."
    onClick={(e) => { e.stopPropagation(); onMenuClick(node, e); }}
  >
    <MoreHorizontal size={14} />
  </button>
)}
```

### Dashboard Project Cards

Route: `app/(dashboard)/dashboard/` — uses `DashboardProjectCard` component.

- Card shows: satellite map thumbnail (Static Maps API), project name, status pill, open items count.
- Card click: navigates to `/project-hub/[projectId]`.
- **Not** the delete entry point — deletion is handled from Project Hub or SlateDrop.

### Project Hub Project Cards

Route: `app/(dashboard)/project-hub/page.tsx`

- Same satellite map rendering approach as `DashboardProjectCard` (separate absolute-positioned overlay div).
- Card click: navigates to `/project-hub/[projectId]`.
- Card 3-dot (future): opens inline options including rename, archive, delete.

---

## 12. 2-Step Project Deletion

Projects are high-value records. Deletion is always 2-step (confirm intent, then execute).

### Step 1 — Initiate

User clicks "Delete" (from: SlateDrop project banner, SlateDrop context menu, or future Project Hub 3-dot).

A confirmation modal appears with:
- **Project name** shown prominently.
- Warning: "This will permanently delete all project files, RFIs, submittals, schedule, and budget records. This cannot be undone."
- Cancel (default focus) and "Delete Project" (red, requires 3-second countdown or re-type of project name).

### Step 2 — Execute

On confirmation:

```
DELETE /api/projects/[projectId]
```

Server-side handler (uses admin Supabase client):
1. Soft-delete all files for this project: set `deleted_at = now()` on `unified_files` rows.
2. Soft-delete all folders: set `deleted_at = now()` on `project_folders` rows.
3. Soft-delete the project record: set `status = 'deleted'` in `projects`.
4. Enqueue a background job to hard-delete S3 objects after 30-day grace period.
5. Return `200 ok`.

On success: navigate to `/project-hub` (project list) and show a toast "Project deleted."

**Grace period:** S3 objects are NOT immediately deleted. A nightly cleanup cron (`/api/cron/cleanup-deleted-projects`) runs 30 days after soft-delete and calls `DeleteObjectsCommand` on all S3 keys.

**No recovery after hard delete.** This is disclosed in the confirmation modal.

---

## 13. Permissions & Sharing

### Internal (org members)

Roles from `organization_members.role`:
- `owner` — full rights
- `admin` — full rights except billing
- `project_manager` — CRUD on project items, can invite others
- `project_member` — read + upload, add comments
- `external_viewer` — scoped read-only, externally invited

### External (share links)

`external_response_links` table:
```sql
id uuid, org_id uuid, project_id uuid, folder_id uuid,
token text unique, label text,
allow_upload boolean, allow_download boolean,
expires_at timestamptz,
created_by uuid, created_at timestamptz
```

Link generation: `POST /api/slatedrop/request-link`
External upload endpoint: `GET /external/[token]` → renders `app/external/[token]/page.tsx`

### Folder-level permissions

`project_folders`:
- `is_public boolean` — whether the folder is visible to external viewers
- `allow_upload boolean` — whether uploads are accepted (used for response folders)

---

## 14. Backend — Database Tables

### Canonical Tables

| Table | Purpose |
|---|---|
| `projects` | Project records (name, status, metadata with lat/lng/boundary) |
| `project_folders` | (**Canonical** — replaces legacy `file_folders`) All folders: org folders, project subfolders, system folders |
| `unified_files` | All file records across all contexts |
| `project_files` | Junction: files linked to a specific project |
| `external_response_links` | Scoped upload/download share tokens |
| `notifications` | User notification records (type, payload, read_at) |
| `organization_members` | User↔org membership with roles |
| `credits` | `org_id, balance, purchased_balance, monthly_credits_used, monthly_reset_at` |
| `credit_ledger` | Per-transaction credit history with `credit_source` |

### `project_folders` Schema (Canonical)

```sql
CREATE TABLE project_folders (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          uuid REFERENCES organizations(id),
  project_id      uuid REFERENCES projects(id),   -- null for org-level folders
  folder_path     text NOT NULL,                  -- e.g. /Projects/abc123/RFIs
  parent_id       uuid REFERENCES project_folders(id),
  name            text NOT NULL,
  folder_type     text,                           -- 'system' | 'project-root' | 'project-sub' | 'user'
  is_system       boolean DEFAULT false,
  is_public       boolean DEFAULT false,
  allow_upload    boolean DEFAULT false,
  deleted_at      timestamptz,
  created_at      timestamptz DEFAULT now()
);

ALTER TABLE project_folders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_access" ON project_folders FOR ALL TO authenticated
  USING (org_id IN (
    SELECT org_id FROM organization_members
    WHERE user_id = auth.uid() AND status = 'active'
  ));
```

### Legacy table still in use

`file_folders` — still referenced by some secondary routes (Design Studio, export-zip). Migration ongoing. Do NOT drop this table until Phase 2 migration is complete (see migration tracker).

---

## 15. Backend — API Routes

All routes in `app/api/slatedrop/` and `app/api/projects/`.

### SlateDrop API

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/slatedrop/list` | List files/folders in a path for an org |
| `POST` | `/api/slatedrop/upload-url` | Generate S3 presigned PUT URL (checks tier limits) |
| `POST` | `/api/slatedrop/complete` | Finalize upload: write `unified_files` row, link to folder |
| `POST` | `/api/slatedrop/create` | Create new folder |
| `POST` | `/api/slatedrop/rename` | Rename folder or file |
| `POST` | `/api/slatedrop/move` | Move folder/file to new parent |
| `DELETE` | `/api/slatedrop/delete` | Soft-delete file or folder |
| `POST` | `/api/slatedrop/request-link` | Create external share link |
| `POST` | `/api/slatedrop/secure-send` | Email file to external party |
| `GET` | `/api/slatedrop/download` | Return presigned S3 GET URL |
| `POST` | `/api/slatedrop/zip` | Zip a folder for bulk download |
| `POST` | `/api/slatedrop/v2/provision` | Provision system folder tree for new org/tier |
| `GET` | `/api/slatedrop/files` | Paginated file listing |
| `GET` | `/api/slatedrop/folders` | Folder tree for org |
| `GET` | `/api/slatedrop/project-folders` | List folders inside a project |

### Projects API

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/projects` | List all projects for org |
| `POST` | `/api/projects/create` | Create project + provision SlateDrop subfolders |
| `GET` | `/api/projects/sandbox` | List sandbox projects (for SlateDrop sidebar) |
| `GET` | `/api/projects/[projectId]` | Get single project |
| `PATCH` | `/api/projects/[projectId]` | Update project metadata |
| `DELETE` | `/api/projects/[projectId]` | 2-step soft-delete (as described in Section 12) |
| `GET` | `/api/projects/[projectId]/folders` | Get folder tree for a project |

### Auth wrappers (always use these)

```typescript
import { withAuth, withProjectAuth } from "@/lib/server/api-auth";
import { ok, badRequest, unauthorized, serverError } from "@/lib/server/api-response";
import type { ProjectRouteContext } from "@/lib/types/api";
```

---

## 16. Frontend — Key Files

| File | Lines | Purpose |
|---|---|---|
| `components/slatedrop/SlateDropClient.tsx` | ~2031 | Main explorer UI — sidebar + content pane |
| `app/slatedrop/page.tsx` | Short | Loads user/tier from Supabase session, renders `<SlateDropClient>` |
| `components/dashboard/DashboardProjectCard.tsx` | ~275 | Project card component (dashboard + project hub use the same satellite map approach) |
| `app/(dashboard)/project-hub/page.tsx` | ~828 | Project Hub Tier 1 (all projects grid, uses satellite map cards) |
| `app/external/[token]/page.tsx` | — | Public external response upload page |
| `lib/entitlements.ts` | 127 | Tier → entitlements mapping (single source of truth) |
| `lib/server/api-auth.ts` | — | `withAuth()`, `withProjectAuth()` |
| `lib/server/api-response.ts` | — | `ok()`, `badRequest()`, `unauthorized()`, `serverError()` |

### Component split rules

`SlateDropClient.tsx` is approaching the 300-line limit rule. When adding features, extract:
- `FolderTreeItem` → `components/slatedrop/FolderTreeItem.tsx`
- `ContextMenu` → `components/slatedrop/ContextMenu.tsx`
- `FileGrid` / `FileList` → `components/slatedrop/FileGrid.tsx` / `FileList.tsx`
- `ProjectInfoBanner` → `components/slatedrop/ProjectInfoBanner.tsx`
- `UploadDropzone` → `components/slatedrop/UploadDropzone.tsx`
- `notification tray` → `components/slatedrop/NotificationTray.tsx`

---

## 17. State Management

SlateDrop uses local `useState`/`useRef` inside `SlateDropClient.tsx` for UI state. No global Zustand store for SlateDrop currently.

Key state variables:
```typescript
activeFolderId: string | null       // Currently selected folder
viewMode: "grid" | "list"
sortKey: "name" | "modified" | "size" | "type"
sortDir: "asc" | "desc"
selectedItems: Set<string>
contextMenu: { x, y, target } | null
sandboxProjects: SandboxProject[]   // Loaded from /api/projects/sandbox
folderTree: FolderNode[]            // Loaded from /api/slatedrop/folders
files: SlateDropItem[]              // Loaded from /api/slatedrop/list for activeFolderId
uploadProgress: Record<string, number>
notifications: Notification[]       // Realtime or polled from /api/notifications
```

---

## 18. Data Retention Rules

1. **Upgrade:** Trial → paid: all data and folders carry over seamlessly, nothing deleted.
2. **Downgrade:** Paid → lower paid: data kept, locked folders that no longer match tier are hidden but not deleted. User sees a "Restore access by upgrading" message.
3. **Cancellation:** Account enters 30-day grace period. Files downloadable but no new uploads. After 30 days, soft-delete. After 60 days, S3 hard-delete.
4. **Project deletion:** 2-step (Section 12). 30-day grace before S3 hard-delete.
5. **System folders:** Never deleted on tier change. Tier change affects what new folders are provisioned on the next provision call.
6. **Inbound documents:** Auto-saved to project subfolders; never auto-deleted.

---

## 19. Known Tech Debt & Migration Status

### file_folders → project_folders migration

| Phase | Status |
|---|---|
| Phase 1: Main API routes migrated | ✅ Complete |
| Phase 2: Secondary routes (Design Studio, export-zip, audit, cross-tab service) | ⚠️ Pending |
| Phase 3: Data sync + drop `file_folders` | ❌ Not started |

Secondary routes still on `file_folders`:
- `lib/audit/pdfSnapshots.ts`
- `lib/services/cross-tab-file-service.ts`
- `lib/slatedrop/systemFolders.ts`
- `app/api/design-studio/projects/[projectId]/route.ts`
- `app/api/design-studio/workspace/route.ts`
- `app/api/projects/[projectId]/export-zip/route.ts`

**Do not drop `file_folders`** until all Phase 2 routes are migrated and validated.

### WizardLocationPicker — completed migrations

- ✅ `AutocompleteService` replaced with `AutocompleteSuggestion.fetchAutocompleteSuggestions()` (new Google API, March 2025)
- ✅ `DrawingManager` replaced with custom click-based `google.maps.Polyline` + `google.maps.Polygon` (DrawingManager deprecated Aug 2025, removed May 2026)
- ✅ `libraries` prop changed from `["places", "drawing", "geocoding"]` to `["places", "geocoding"]`

---

## 20. Reconstruction Checklist

Use this if rebuilding from scratch:

### Backend Setup
- [ ] Create Supabase project (ref: `hadnfcenpcfaeclczsmm`)
- [ ] Run all migrations in `supabase/migrations/` in order
- [ ] Enable RLS on all tables with org-scoped policies
- [ ] Create AWS S3 bucket `slate360-storage` in `us-east-2`
- [ ] Set CORS on bucket for presigned upload/download
- [ ] Configure S3 bucket lifecycle: move to Glacier after 90 days, delete after 365 days
- [ ] Set Stripe webhook to `POST /api/stripe/webhook`

### Environment Variables
- [ ] `NEXT_PUBLIC_SUPABASE_URL` = `https://hadnfcenpcfaeclczsmm.supabase.co`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` (from .env.local)
- [ ] `SUPABASE_SERVICE_ROLE_KEY` (from .env.local)
- [ ] `AWS_REGION=us-east-2`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `SLATEDROP_S3_BUCKET=slate360-storage`
- [ ] `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`, `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID`
- [ ] `RESEND_API_KEY`
- [ ] Stripe keys in Vercel (not .env.local)

### Provision System Folders on Sign-Up
- [ ] Supabase auth webhook → `POST /api/auth/webhook` → calls `/api/slatedrop/v2/provision`
- [ ] Provision creates system folders in `project_folders` based on tier
- [ ] `is_system = true` on all system folders

### Core UI
- [ ] `SlateDropClient.tsx` — sidebar + content pane (see Section 16 for planned component splits)
- [ ] `FolderTreeItem` with `onMenuClick` prop for project nodes
- [ ] Project info banner in content pane when on project root
- [ ] 2-step delete modal with countdown or name confirmation
- [ ] Notification tray with Bell icon + unread badge
- [ ] Upload dropzone with presigned URL flow
- [ ] Context menu (right-click + 3-dot) with items from Section 10 table

### Project Creation Wizard
- [ ] Step 1: Project name, number, client, status
- [ ] Step 2: Dates, phases
- [ ] Step 3: Location picker (`WizardLocationPicker.tsx`) — uses new `AutocompleteSuggestion` API + custom polygon drawing
- [ ] Step 4: Team (invite org members + set roles)
- [ ] On submit: `POST /api/projects/create` → creates `projects` row + provisions SlateDrop subfolders

### Testing
- [ ] Upload file → appears in correct subfolder
- [ ] Inbound external document → appears in project subfolder + notification fires
- [ ] Trial user hits 50MB file limit → clear error, no crash
- [ ] Trial user hits 500MB storage limit → upload blocked
- [ ] 2-step delete → project gone from sidebar and project-hub page
- [ ] Tier upgrade → all data preserved, new folders provisioned
