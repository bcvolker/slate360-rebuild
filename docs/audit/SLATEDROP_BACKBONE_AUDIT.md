# SlateDrop Backbone Audit

Last Updated: 2026-05-14
Status: Read-only audit. No code changes.

## Purpose

Maps SlateDrop file management infrastructure for V1 UI integration.

## Routes & Pages

| Route | Type | Purpose |
|---|---|---|
| `/slatedrop` | Page | Hub with app-specific folder cards, gated by entitlements |
| `/slatedrop/[...section]` | Page | Catch-all section sub-routes |
| `/api/slatedrop/upload-url` | API | Presigned S3 PUT URL + pending record |
| `/api/slatedrop/complete` | API | Finalize upload, bridge to `unified_files`, track quota |
| `/api/slatedrop/download` | API | Presigned S3 GET URL (1hr) |
| `/api/slatedrop/files` | API | List files by folder |
| `/api/slatedrop/folders` | API | CRUD project folders |
| `/api/slatedrop/delete` | API | Soft-delete (30-day recovery) |
| `/api/slatedrop/restore` | API | Restore within 30-day window |
| `/api/slatedrop/rename` | API | Rename file |
| `/api/slatedrop/move` | API | Move to different folder |
| `/api/slatedrop/zip` | API | Download folder as ZIP |
| `/api/slatedrop/provision` | API | Create 17 canonical project folders |
| `/api/slatedrop/secure-send` | API | Time-limited share link via email |
| `/api/slatedrop/request-link` | API | External upload token |
| `/api/slatedrop/project-folders` | API | List project folders |
| `/api/slatedrop/project-audit-export` | API | Export entire project tree as ZIP |

## Data Model

| Table | Purpose | Key Columns |
|---|---|---|
| `slatedrop_uploads` | File records | `file_name`, `s3_key`, `folder_id`, `status`, `unified_file_id` |
| `project_folders` | Folder hierarchy | `name`, `folder_path`, `parent_id`, `is_system`, `folder_type` |
| `unified_files` | Cross-app file registry | `name`, `storage_key`, `source`, `parent_folder_id` |
| `slate_drop_links` | Share tokens | `file_id`, `token`, `role`, `expires_at` |
| `project_external_links` | External upload tokens | `project_id`, `folder_id`, `token` |

## Upload Flow

1. Client → `POST /api/slatedrop/upload-url` with `{ filename, contentType, size, folderId }`
2. Server validates (blocks dangerous extensions, enforces 50MB Site Walk limit)
3. Server creates pending `slatedrop_uploads` row
4. Server returns presigned S3 PUT URL (15 min expiry)
5. Client uploads directly to S3
6. Client → `POST /api/slatedrop/complete` with `{ fileId }`
7. Server marks active, creates/links `unified_files` row, tracks storage quota
8. Public upload flow: supports `publicToken` from `project_external_links`

## Storage Providers

| Provider | Usage |
|---|---|
| Cloudflare R2 | Primary if `R2_ACCESS_KEY_ID` configured |
| AWS S3 | Fallback (`slate360-storage` bucket, `us-east-2`) |
| Supabase Storage | Not used for files (DB only) |

S3 key pattern: `orgs/{orgId}/{folderId}/{timestamp}_{filename}`

## Automatic Folder Creation

`provisionProjectFolders()` creates 17 system folders per project:
Documents, Drawings, Photos, 3D Models, 360 Tours, RFIs, Submittals, Schedule, Budget, Daily Logs, Reports, Records, Safety, Correspondence, Closeout, Deliverables, Misc.

`ensureSiteWalkFolderTree()` creates Site Walk-specific folders:
Site Walk Files → Photos, Notes, Data, Plans, Deliverables.

Both are idempotent.

## File-to-Project/Walk Linking

| Bridge | Function | Purpose |
|---|---|---|
| Capture → SlateDrop | `bridgePhotoToSlateDrop()` | Copies capture photos to project Photos folder |
| PDF → SlateDrop | `bridgePdfToSlateDrop()` | Copies exported PDFs to project Deliverables folder |
| Delete protection | Delete route checks `site_walk_items` | Blocks deletion if file linked to capture |
| Artifacts | `saveProjectArtifact()` | Auto-files RFIs, submittals to correct folders |

## What Exists vs Missing for V1

| Capability | Status |
|---|---|
| File upload/download | Production-ready |
| Folder hierarchy | Production-ready |
| Auto-folder provisioning | Production-ready |
| Secure send/share | Production-ready |
| External upload (file request) | Production-ready |
| Soft delete/restore | Production-ready |
| ZIP download | Production-ready |
| Project audit export | Production-ready |
| Capture auto-filing | Production-ready |
| Thumbnail generation | Not implemented |
| File versioning | Not implemented (folder-based only) |
| Real-time sync indicator | Not implemented |
| Drag-and-drop between folders | Frontend only, not implemented |

## Recommended V1 Folder Model

Use existing auto-provisioned folders. For Site Walk V1, the most relevant:
- Plans (for plan PDFs)
- Photos (for captures auto-filed)
- Deliverables (for exported deliverables)
- Site Walk Files / Data (for walk-specific data)
- Shared Uploads (via file requests)
