# SlateDrop — Build File

Last Updated: 2026-04-13
Module Status: **Active — production feature, mature implementation**

## Purpose

SlateDrop is the file management and sharing system within Slate360. It provides cloud storage (S3-backed), folder management, file upload/download, secure sharing links, and project file organization. Included with all subscription tiers.

## Current Real Implementation State

### What Works (Real)
- Full file management UI with drag-and-drop uploads
- Hierarchical folder system via `project_folders`
- File upload with presigned S3 URLs (`useSlateDropUploadActions.ts`)
- File download, rename, move, delete, restore (`useSlateDropMutationActions.ts`)
- Secure send / share links (`/api/slatedrop/secure-send`, `/api/slatedrop/request-link`)
- Project file explorer (`ProjectFileExplorer.tsx` — 363 lines ⚠️ over limit)
- Context menu for file operations (`SlateDropContextMenu.tsx`)
- Action modals for bulk operations (`SlateDropActionModals.tsx`)
- Share/preview modals (`SlateDropSharePreviewModals.tsx`)
- ZIP download for folders (`/api/slatedrop/zip`)
- Soft delete + restore cycle (`/api/slatedrop/delete`, `/api/slatedrop/restore`)
- Project artifact provisioning (`lib/slatedrop/provisioning.ts`)
- Storage tracking (`lib/slatedrop/track-storage.ts`)
- Folder tree builder (`lib/slatedrop/folderTree.ts`)
- 7 dedicated hooks (well-extracted pattern)
- 15 API routes
- 4 database tables

### What Is Partial
- Notifications overlay (41 lines — likely scaffolded)
- Storage quota enforcement (`track-storage.ts` — 28 lines, may not be fully wired)
- Project audit export (`/api/slatedrop/project-audit-export`)

### What Is Missing
- File preview for common formats (PDF, images, video — preview URL hook exists but rendering unclear)
- Version history for files
- Bulk upload progress UI (hook exists, UI integration depth unclear)
- Storage usage dashboard (data tracked but not displayed)

## Routes / Pages

| Route | File | Purpose |
|-------|------|---------|
| `/slatedrop` | `app/slatedrop/page.tsx` | Main SlateDrop view |

## API Routes (15 endpoints)

| Endpoint | Purpose |
|----------|---------|
| `GET/POST /api/slatedrop/files` | File list/create |
| `GET/POST /api/slatedrop/folders` | Folder list/create |
| `GET /api/slatedrop/project-folders` | Project-scoped folders |
| `POST /api/slatedrop/provision` | Initialize project storage |
| `POST /api/slatedrop/delete` | Soft delete |
| `POST /api/slatedrop/restore` | Restore deleted |
| `POST /api/slatedrop/rename` | Rename file/folder |
| `POST /api/slatedrop/move` | Move file/folder |
| `GET /api/slatedrop/download` | Download file |
| `POST /api/slatedrop/zip` | ZIP folder download |
| `POST /api/slatedrop/upload-url` | Get presigned S3 URL |
| `POST /api/slatedrop/complete` | Mark upload complete |
| `POST /api/slatedrop/secure-send` | Secure file sharing |
| `POST /api/slatedrop/request-link` | Request access link |
| `GET /api/slatedrop/project-audit-export` | Export project audit |

## Database Tables

| Table | Migration | Purpose |
|-------|-----------|---------|
| `project_folders` | Various Project Hub migrations | Folder hierarchy |
| `slatedrop_uploads` | `20260411000001` | File metadata |
| `slatedrop_deleted_at` | `20260412000004` | Soft deletion tracking |
| `slatedrop_links` | `20260411000002` | Share links |

## Key Components (10 files, 2147 lines)

| Component | Lines | Status |
|-----------|-------|--------|
| `ProjectFileExplorer.tsx` | 363 | ⚠️ Over 300-line limit |
| `SlateDropFileArea.tsx` | 287 | Under limit |
| `SlateDropActionModals.tsx` | 283 | Under limit |
| `SlateDropClient.tsx` | 282 | Under limit |
| `SlateDropSharePreviewModals.tsx` | 268 | Under limit |
| `SlateDropContextMenu.tsx` | 218 | Under limit |
| `SlateDropSidebar.tsx` | 201 | Under limit |
| `SlateDropToolbar.tsx` | 117 | Under limit |
| `SlateDropTopBar.tsx` | 87 | Under limit |
| `SlateDropNotificationsOverlay.tsx` | 41 | Likely scaffolded |

## Hooks (7 files, 841 lines — well-extracted)

| Hook | Lines | Purpose |
|------|-------|---------|
| `useSlateDropMutationActions.ts` | 287 | File CRUD operations |
| `useSlateDropUploadActions.ts` | 110 | Upload handling |
| `useSlateDropTransferActions.ts` | 114 | Move/copy |
| `useSlateDropInteractionHandlers.ts` | 98 | UI interactions |
| `useSlateDropUiState.ts` | 88 | UI state management |
| `useSlateDropFiles.ts` | 87 | File data fetching |
| `useSlateDropPreviewUrl.ts` | 57 | File preview URLs |

## Lib Utilities (8 files, 685 lines)

| File | Lines | Purpose |
|------|-------|---------|
| `client-utils.ts` | 148 | Client-side helpers |
| `projectArtifacts.ts` | 140 | Project artifact management |
| `helpers.ts` | 115 | General helpers |
| `folder-helpers.ts` | 94 | Folder operations |
| `folderTree.ts` | 78 | Tree structure builder |
| `provisioning.ts` | 74 | Storage provisioning |
| `track-storage.ts` | 28 | Storage tracking |
| `storage.ts` | 8 | Storage constants |

## Biggest Blockers

1. **`ProjectFileExplorer.tsx` at 363 lines** — exceeds 300-line limit, needs extraction
2. **Storage quota may not be enforced** — `track-storage.ts` is 28 lines, weak integration
3. **File preview rendering unclear** — preview URLs exist but in-app preview quality unknown
4. **No version history** — files are mutable with no rollback

## Verification Checklist

- [ ] File upload via presigned URL works
- [ ] Folder create/rename/move/delete works
- [ ] File download generates correct presigned URL
- [ ] Secure send creates share link
- [ ] Soft delete + restore cycle works
- [ ] ZIP download produces valid archive
- [ ] Storage tracking increments on upload
- [ ] No console errors on SlateDrop page
