# SlateDrop — Build File

Last Updated: 2026-04-14
Module Status: **Active — production feature, mature implementation**
Doctrine Source: `docs/SLATE360_MASTER_BUILD_PLAN.md` (this file must align)

## Purpose

SlateDrop is the file management and storage system within Slate360. It provides cloud storage (S3-backed), hierarchical folder management, file upload/download, secure sharing links, and project file organization. Included with all subscription tiers — it is a platform feature, not a paid module.

## Phase 1 Doctrine Alignment

### Project-Centric Foldering (CRITICAL)

When a project is created:
1. A project folder is created in a Projects area
2. Subfolders are auto-created for supported record types:
   - Deliverables (punch lists, inspection reports, proposals)
   - Photos (field captures, progress photos, markup images)
   - Plans / Drawings
   - Schedules / Budgets / SOV
   - Reports
   - RFIs / Submittals
   - Attachments / Misc
3. A history/archive area exists for project records
4. Subscribers can create additional custom folders

This is already partially implemented via `lib/slatedrop/provisioning.ts` and `lib/slatedrop/projectArtifacts.ts`.

### Auto-Filing Rules

- Site Walk captures → Photos subfolder (or Site Walk Sessions subfolder)
- Deliverables → Deliverables subfolder
- Uploaded schedules/budgets → Schedules or Budgets subfolder
- Plans/drawings → Plans subfolder
- User can always move files to different folders after creation

### Site Walk Integration (CRITICAL GAP)

Site Walk captures and deliverables **must not remain a disconnected storage silo.** They need to appear in the project's record/folder structure in SlateDrop so users experience one connected system.

**Current state**: Site Walk uploads go to S3 at `site-walk/photos/{orgId}/{sessionId}/...` with ZERO integration to `slatedrop_uploads` or `project_folders`. This is the #2 CRITICAL conflict in the doctrine.

**Required fix**: When Site Walk captures photos, those files must be registered in SlateDrop's `slatedrop_uploads` table and linked to the project folder tree (e.g., `Projects/{projectName}/Site Walk/Sessions/{sessionDate}/`). Users browsing their project in SlateDrop should see Site Walk captures without knowing two systems are involved.

### Collaboration

Subscribers must be able to:
- Create additional folders
- Share upload/download permissions
- Collaborate through project-linked records and files
- Invite other subscribers to share project access
- Use this on mobile as well as web

### Collaborator File Access (Subscriber-Granted)

Collaborators are NOT full SlateDrop users. Their file access is scoped and granted by the subscribing user.

**What a collaborator CAN do in SlateDrop:**
- View files within the project(s) they are invited to
- Upload files (photos, memos) to items they are assigned to — these go into the project's folder structure
- Download files they have access to within their project scope
- Attach files to items they are working on

**What a collaborator CANNOT do in SlateDrop:**
- Browse SlateDrop freely (no /slatedrop page access)
- Create folders
- Delete or move files
- Access files outside their assigned project scope
- Use secure send / share links
- Manage folder structure
- Access storage settings

**How it works:**
- Subscriber invites collaborator to a project
- Collaborator's uploads are automatically placed in the project's folder structure (e.g., `Projects/{projectName}/Site Walk/Collaborator Uploads/`)
- Subscriber retains full control over the folder structure and can move/organize collaborator files
- Collaborator sees only files relevant to their assigned items, not the full project folder tree

**Implementation note:** This requires a per-project permission check on file access APIs, scoped by the collaborator's project membership. No separate SlateDrop entitlement for collaborators — access derives from project membership.

### History / Archive Behavior (Required for Phase 1)

- All file operations must be tracked: who uploaded/modified/shared/deleted, when, from where
- Deliverables auto-save to deliverables folder
- Photos auto-save to photos folder
- Soft delete + restore cycle must be maintained (already exists)
- History metadata supports future version history feature

### Future-Phase File Goals

| Feature | Phase | Notes |
|---------|-------|-------|
| Version history per file | Phase 2 | Track re-uploads and rollback |
| Editable imported schedule/budget data | Phase 2 | Parse and normalize uploaded files |
| AI-assisted document normalization | Phase 3+ | OCR, classification, auto-tagging |
| Project export / archive packages | Phase 2 | ZIP download with full project structure |
| BIM/model-linked file behaviors | Phase 3+ | 3D model overlays, linked documents |
| Advanced per-file permissions | Phase 2 | Beyond folder-level sharing |
| Selective sharing/permission per folder | Phase 2 | Granular access control |

## Current Real Implementation State

### What Works (Real)
- Full file management UI with drag-and-drop uploads
- Hierarchical folder system via project_folders table
- File upload with presigned S3 URLs (useSlateDropUploadActions.ts)
- File download, rename, move, delete, restore (useSlateDropMutationActions.ts)
- Secure send / share links (/api/slatedrop/secure-send, /api/slatedrop/request-link)
- Context menu for file operations (SlateDropContextMenu.tsx)
- Action modals for bulk operations (SlateDropActionModals.tsx)
- Share/preview modals (SlateDropSharePreviewModals.tsx)
- ZIP download for folders (/api/slatedrop/zip)
- Soft delete + restore cycle (/api/slatedrop/delete, /api/slatedrop/restore)
- Project artifact provisioning (lib/slatedrop/provisioning.ts)
- Storage tracking (lib/slatedrop/track-storage.ts)
- Folder tree builder (lib/slatedrop/folderTree.ts)
- 7 dedicated hooks (well-extracted pattern)
- 15 API routes
- 4 database tables

### What Is Partial
- Storage quota enforcement (track-storage.ts is 28 lines, may not be fully wired)
- File preview for common formats (preview URL hook exists but rendering unclear)
- Notifications overlay (41 lines — scaffolded)

### What Is Missing for Phase 1
- **Site Walk capture integration** — zero cross-reference between Site Walk files and SlateDrop
- **Version history for files** — no rollback capability
- **Storage usage display** — data tracked but not shown to users

## Routes / Pages

| Route | File | Purpose |
|-------|------|---------|
| /slatedrop | app/slatedrop/page.tsx | Main SlateDrop view |

## API Routes (15 endpoints)

| Endpoint | Purpose |
|----------|---------|
| GET/POST /api/slatedrop/files | File list/create |
| GET/POST /api/slatedrop/folders | Folder list/create |
| GET /api/slatedrop/project-folders | Project-scoped folders |
| POST /api/slatedrop/provision | Initialize project storage |
| POST /api/slatedrop/delete | Soft delete |
| POST /api/slatedrop/restore | Restore deleted |
| POST /api/slatedrop/rename | Rename file/folder |
| POST /api/slatedrop/move | Move file/folder |
| GET /api/slatedrop/download | Download file |
| POST /api/slatedrop/zip | ZIP folder download |
| POST /api/slatedrop/upload-url | Get presigned S3 URL |
| POST /api/slatedrop/complete | Mark upload complete |
| POST /api/slatedrop/secure-send | Secure file sharing |
| POST /api/slatedrop/request-link | Request access link |
| GET /api/slatedrop/project-audit-export | Export project audit |

## Database Tables

| Table | Migration | Purpose |
|-------|-----------|---------|
| project_folders | Various Project Hub migrations | Folder hierarchy |
| slatedrop_uploads | 20260411000001 | File metadata |
| slatedrop_deleted_at | 20260412000004 | Soft deletion tracking |
| slatedrop_links | 20260411000002 | Share links |

## Components (10 files, ~2150 lines)

| Component | Lines | Status |
|-----------|-------|--------|
| ProjectFileExplorer.tsx | 363 | OVER 300-line limit — needs extraction |
| SlateDropFileArea.tsx | 287 | Under limit |
| SlateDropActionModals.tsx | 283 | Under limit |
| SlateDropClient.tsx | 282 | Under limit |
| SlateDropSharePreviewModals.tsx | 268 | Under limit |
| SlateDropContextMenu.tsx | 218 | Under limit |
| SlateDropSidebar.tsx | 201 | Under limit |
| SlateDropToolbar.tsx | 117 | Under limit |
| SlateDropTopBar.tsx | 87 | Under limit |
| SlateDropNotificationsOverlay.tsx | 41 | Scaffolded |

## Hooks (7 files, 841 lines — well-extracted)

| Hook | Lines | Purpose |
|------|-------|---------|
| useSlateDropMutationActions.ts | 287 | File CRUD operations |
| useSlateDropUploadActions.ts | 110 | Upload handling |
| useSlateDropTransferActions.ts | 114 | Move/copy |
| useSlateDropInteractionHandlers.ts | 98 | UI interactions |
| useSlateDropUiState.ts | 88 | UI state management |
| useSlateDropFiles.ts | 87 | File data fetching |
| useSlateDropPreviewUrl.ts | 57 | File preview URLs |

## Codebase Conflicts with Phase 1 Doctrine

| # | Severity | Issue | Action Needed |
|---|----------|-------|--------------|
| 1 | CRITICAL | Site Walk uploads not registered in slatedrop_uploads | Wire Site Walk upload route to also create slatedrop_uploads record + link to project folder |
| 2 | MODERATE | ProjectFileExplorer.tsx at 363 lines | Extract into smaller components |
| 3 | MODERATE | Storage quota may not be enforced | Verify track-storage.ts is called on upload, enforce limits |
| 4 | LOW | No file version history | Add later, not Phase 1 blocker |
| 5 | MODERATE | No collaborator file access scoping | File APIs need per-project permission checks for collaborator role |
| 6 | LOW | No collaborator upload routing | Collaborator uploads need auto-placement in project folder structure |

## Phase 1 Implementation Needed

1. **Site Walk bridge** (CRITICAL): When `/api/site-walk/upload` stores a file to S3, also create a `slatedrop_uploads` record pointing to the same S3 key, linked to the project's Site Walk subfolder in `project_folders`. This is a backend-only change — no UI needed.

2. **Auto folder structure**: When project provisioning runs, ensure a "Site Walk" subfolder is created with session-date subfolders. Verify `lib/slatedrop/provisioning.ts` handles this.

3. **File preview on mobile**: Verify presigned URL preview works on mobile PWA for photos.

## Verification Checklist

- [ ] File upload via presigned URL works
- [ ] Folder create/rename/move/delete works
- [ ] File download generates correct presigned URL
- [ ] Secure send creates share link
- [ ] Soft delete + restore cycle works
- [ ] ZIP download produces valid archive
- [ ] Storage tracking increments on upload
- [ ] Site Walk captures appear in project folder (AFTER integration)
- [ ] Project provisioning creates correct subfolder structure
- [ ] No console errors on SlateDrop page
