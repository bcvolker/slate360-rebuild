# Slate360 — SlateDrop Blueprint

**Last Updated:** 2026-03-04
**Context Maintenance:** Update this file whenever SlateDrop routes, components, API endpoints, folder structure, or file management behavior changes.
**Cross-reference:** See `FUTURE_FEATURES.md` Phase 3E for SlateDrop wow features and SQL migrations.

---

## 1. What Is SlateDrop?

SlateDrop is Slate360's file management system. It provides a full file explorer UI for organizing project files with S3 storage, folder management, file sharing, and project-scoped browsing.

---

## 2. Entry Points

| Location | Route | Behavior |
|---|---|---|
| Standalone page | `/slatedrop` | Full explorer UI |
| Dashboard widget | `/(dashboard)` | Compact: entitlement-gated root folder icon grid. Expanded: embeds `SlateDropClient` (sidebar + main). |
| Project Hub Tier 2 widget | `/project-hub/[projectId]` | Compact: folder icon grid. Expanded: embeds `SlateDropClient` scoped to project via `initialProjectId`. |
| Project Hub Tier 3 tab | `/project-hub/[projectId]/slatedrop` | Full explorer scoped to project |

---

## 3. Key Components

| Component | File | Lines | Purpose |
|---|---|---|---|
| SlateDropClient | `components/slatedrop/SlateDropClient.tsx` | **2,030** | Main explorer (⚠️ decompose) |
| SlateDropContextMenu | `components/slatedrop/SlateDropContextMenu.tsx` | ~240 | Extracted context-menu render/actions surface from `SlateDropClient` |
| SlateDropActionModals | `components/slatedrop/SlateDropActionModals.tsx` | ~300 | Extracted new-folder/rename/delete/move modal UI surface from `SlateDropClient` |
| SlateDropSharePreviewModals | `components/slatedrop/SlateDropSharePreviewModals.tsx` | ~260 | Extracted secure-send and preview modal UI surface from `SlateDropClient` |
| ProjectFileExplorer | `components/slatedrop/ProjectFileExplorer.tsx` | 363 | Project-scoped file view |
| useSlateDropFiles | `lib/hooks/useSlateDropFiles.ts` | ~110 | Extracted file loading/sorting state hook used by `SlateDropClient` |
| useSlateDropUiState | `lib/hooks/useSlateDropUiState.ts` | ~130 | Extracted UI modal/context-menu/share/preview state hook used by `SlateDropClient` |

### Canonical Root Folder List (Entitlement-Gated)

Single source of truth for which top-level folders should be visible by tier:

- `lib/slatedrop/folderTree.ts`
  - `buildSlateDropBaseFolderTree(tier)`
  - `listSlateDropRootFolders(tier)`

Used by:
- `components/slatedrop/SlateDropClient.tsx` (sidebar root nodes)
- Dashboard SlateDrop widget compact folder grid
- Project Hub SlateDrop widget compact folder grid

### SlateDropClient Decomposition Target
```
SlateDropClient.tsx       → ~200 lines (layout shell)
SlateDropSidebar.tsx      → folder tree sidebar
SlateDropFileGrid.tsx     → file list/grid view
SlateDropUploadZone.tsx   → drag-and-drop upload area
SlateDropContextMenu.tsx  → right-click context menu
SlateDropPreviewPanel.tsx → file preview
SlateDropBreadcrumb.tsx   → breadcrumb navigation
```

---

## 4. Folder System

### System Folders (auto-created per user)
Root-level system folders are created on user signup via the auth webhook bootstrap.

### Project Subfolders (auto-provisioned on project create)
```
/Projects/{projectId}/Documents/
/Projects/{projectId}/Drawings/
/Projects/{projectId}/Photos/
/Projects/{projectId}/RFIs/
/Projects/{projectId}/Submittals/
/Projects/{projectId}/Schedule/
/Projects/{projectId}/Budget/
/Projects/{projectId}/Records/
```

Provisioning: `POST /api/slatedrop/provision` → inserts into `project_folders` table.

### Project Sandbox Deletion (2-step)

Deleting a project from within SlateDrop's Project Sandbox UI requires typing the exact project name to confirm before calling `DELETE /api/projects/[projectId]`.

### Canonical Folder Table: `project_folders`

```sql
CREATE TABLE project_folders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  folder_path TEXT,
  parent_id UUID REFERENCES project_folders(id),
  is_system BOOLEAN DEFAULT false,
  is_public BOOLEAN DEFAULT false,
  allow_upload BOOLEAN DEFAULT true,
  org_id UUID,
  project_id UUID REFERENCES projects(id),
  folder_type TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
```

**IMPORTANT:** Use `project_folders` for ALL new code. Do NOT use `file_folders` — migration pending.

### Migration Status
- **Phase 1 (Complete):** 7 routes migrated to `project_folders`
- **Phase 2 (Pending):** Design Studio routes, export-zip, audit, cross-tab service
- **Phase 3 (Future):** Data sync + drop `file_folders`

Phase 2 pending routes:
- `app/api/slatedrop/zip/route.ts`
- Design Studio file routes
- Any remaining `file_folders` references

---

## 5. Upload Flow

1. **Reserve URL:** `POST /api/slatedrop/upload-url` → returns presigned S3 PUT URL
2. **Upload:** Client PUTs file directly to S3 presigned URL
3. **Finalize:** `POST /api/slatedrop/complete` → creates DB record, returns `{ ok: true }`

### Trial Upload Guards
```typescript
if (tier === 'trial') {
  if (fileSizeMb > 50) return badRequest('Trial file size limit is 50 MB');
  if (currentStorageGb + fileSizeMb / 1024 > 0.5) return badRequest('Trial storage limit reached');
}
// ALWAYS call consume_credits(org_id, amount) BEFORE enqueuing processing
```

### S3 Configuration
- **Bucket:** `slate360-storage`
- **Region:** `us-east-2`
- **Key pattern:** `{orgId}/{folderId}/{filename}`
- **CORS:** Configured for `https://www.slate360.ai` + `http://localhost:3000`

---

## 6. API Routes

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/slatedrop/upload-url` | POST | Generate presigned S3 upload URL |
| `/api/slatedrop/complete` | POST | Finalize upload (create DB record) |
| `/api/slatedrop/files` | GET | List files in folder |
| `/api/slatedrop/folders` | POST, PATCH, DELETE | Folder CRUD |
| `/api/slatedrop/project-folders` | GET | List project-scoped folders |
| `/api/slatedrop/provision` | POST | Provision project subfolders |
| `/api/slatedrop/download` | GET | Generate download URL |
| `/api/slatedrop/delete` | DELETE | Delete file |
| `/api/slatedrop/rename` | PATCH | Rename file/folder |
| `/api/slatedrop/move` | PATCH | Move file to different folder |
| `/api/slatedrop/zip` | POST | Export folder as ZIP |
| `/api/slatedrop/request-link` | POST | Create share link |
| `/api/slatedrop/secure-send` | POST | Secure file send |
| `/api/slatedrop/project-audit-export` | GET | Export project audit trail |

---

## 7. Sidebar Behavior

- Sidebar shows folder tree with expand/collapse
- 3-dot menu on project nodes (where `node.parentId === "projects"`)
- Uses `opacity-0 group-hover/tree-row:opacity-100` pattern for menu button
- Auto-expand key: `projects` (not `project-sandboxes`)
- Mobile: `top-14 bottom-0` + `overscroll-contain`
- Desktop: `md:h-full`

---

## 8. Sharing & External Access

### Share Links
- `POST /api/slatedrop/request-link` creates a share link with expiry
- External recipients access via `/external/respond` with token

### External Response Links
Stored in `external_response_links` table for tracking external stakeholder uploads.

---

## 9. SlateDrop “Wow Features” Roadmap (Phase 3E)

These features differentiate SlateDrop from basic cloud storage. Full SQL migrations are in `FUTURE_FEATURES.md` §Phase 3E.

| Feature | Table/Column | Description |
|---|---|---|
| Share links (with expiry, PIN, download tracking) | `slatedrop_shares` | Public/private file sharing with analytics |
| File versioning | `unified_files.version`, `version_group_id`, `is_latest` | Track file revisions, restore previous versions |
| Audit trail | `slatedrop_audit_log` | Immutable log of view/download/share/delete events |
| Full-text search | `unified_files.tags` (`text[]`) | Tag-based + filename search across all files |
| Project packs | `slatedrop_packs` | Downloadable ZIP bundles curated per project |
| Deep links | URL params | Direct link to any folder/file for email/chat sharing |
| Offline queue | Service worker | Cache uploads when offline, sync when reconnected (Phase 3 PWA) |
| File origin tracking | `unified_files.origin_tab`, `origin_route`, `origin_entity_id` | Know which module/entity created each file |

### Planned Tables (Not Yet Created)
See `BACKEND.md` §8b for the full list. SlateDrop-specific:
- `slatedrop_audit_log` — immutable access log
- `slatedrop_shares` — shareable links with expiry, PIN protection, download counts
- `slatedrop_packs` — curated project export packages

### SlateDrop as App Ecosystem Backbone
All standalone apps (Design Studio, 360 Tour, Content Studio, etc.) use SlateDrop as their file storage backend. Standalone app subscribers get access to a scoped SlateDrop view showing only files relevant to their module (filtered by `origin_tab`).

---

## 10. Data Retention Rules

| Event | Behavior |
|---|---|
| Upgrade tier | Storage limit increases, existing files preserved |
| Downgrade tier | Files preserved but uploads blocked if over new limit |
| Cancel subscription | 30-day grace period, then soft-delete |
| Delete project | S3 files cleaned up (non-blocking), DB records cascade-deleted |

---

## 11. Lib Files

| File | Purpose |
|---|---|
| `lib/slatedrop/provisioning.ts` | Subfolder provisioning logic |
| `lib/slatedrop/projectArtifacts.ts` | Project artifact helpers |
| `lib/slatedrop/storage.ts` | Storage calculation helpers |
| `lib/s3.ts` | S3 client initialization |

---

## 12. Context Maintenance Checklist

When making SlateDrop changes, update this file if:
- [ ] API endpoints are added, renamed, or removed
- [ ] Folder structure or provisioning changes
- [ ] Upload flow changes
- [ ] Component files are created or decomposed
- [ ] Storage limits or tier guards change
- [ ] Sharing/external access behavior changes
- [ ] Migration phases progress
- [ ] Wow features are implemented (move from §9 to built sections)
- [ ] New origin_tab values are registered
