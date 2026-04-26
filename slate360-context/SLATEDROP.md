# Slate360 — SlateDrop Blueprint

**Last Updated:** 2026-04-26
**Context Maintenance:** Update this file whenever SlateDrop routes, components, API endpoints, folder structure, or file management behavior changes.
**Cross-reference:** See `FUTURE_FEATURES.md` Phase 3E for SlateDrop wow features and SQL migrations.

---

## 0. Current Direction — App-Centric Mobile File Hub

SlateDrop is no longer treated as a generic desktop file explorer. The current strategy is:

- **SlateDrop is the shared file backbone for every app.** Site Walk, 360 Tours, Design Studio, Content Studio, and future apps write to SlateDrop-backed folders.
- **The `/slatedrop` button opens a personalized hub.** It should show entitlement-aware app folder cards plus project/site file spaces. Users with only Site Walk see Site Walk-ready folders; when they add 360 Tours, a 360 Tours folder experience appears without changing data models.
- **Mobile/PWA first.** The phone view must be thumb-optimized for open, back/forward folder navigation, upload, save/download, rename, move, copy, delete, and share by contacts/text/email.
- **Project/site folders remain canonical.** New folder writes still use `project_folders`; file metadata remains in `slatedrop_uploads`; cross-app search/share should use the `unified_files` bridge.
- **Do not preserve the old SlateDrop UI if it blocks usability.** Existing hooks/APIs can be reused, but the visual folder experience can be rebuilt from scratch around the same backend.

### Recommended App Folder Model

Every project/site should support app-scoped folders as the user unlocks apps:

```text
Project or Site
  /Site Walks
    /{Walk Date or Session Name}
      /Photos
      /Voice Notes
      /Plans
      /Markups
      /Deliverables
      /Shared / Client Uploads
  /360 Tours
    /Panoramas
    /Scenes
    /Hotspots
    /Exports
  /Design Studio
    /Models
    /Drawings
    /Review Attachments
    /Exports
  /Content Studio
    /Raw Media
    /Edits
    /Branded Exports
```

The exact rows may be physical `project_folders` or virtual grouped views over existing folders. The first mobile UI pass should prioritize a clean, app-centric presentation over exposing raw database folder paths.

### Mobile SlateDrop UX Requirements

- Top: current folder title + back/up action + search/filter.
- Body: large folder cards and file rows with 44px minimum actions.
- Bottom sheet/context actions: preview, save/download, rename, move, copy, delete, share, secure send.
- Share surface: existing contacts picker + email/text/native share where available.
- Routing: external uploads and received files should land in the right project/app folder based on token context.
- Small-device navigation: breadcrumbs should collapse into a folder stack/back button, not a desktop path bar.

### Current Implementation Notes

- `/slatedrop` now acts as a folder-system hub, not an app launcher. It shows `General Files` plus entitlement-aware app file folders and hides legacy/test project rows so users are not pushed into the old non-mobile SlateDrop UI.
- Folder cards and action pills are clickable. `/slatedrop/[...section]` provides the interim folder/action destination page for routes such as `/slatedrop/general-files`, `/slatedrop/site-walk-files/photos`, and `/slatedrop/upload` while the real mobile file browser is rebuilt.
- `/slatedrop/[...section]` now includes action assistant panels for action routes. This prevents terminal controls and defines the required fields for Upload, New folder, Share, Send, Receive, Archive, Save, and Move before wiring each action to the live SlateDrop APIs.
- Avoid nested links in the mobile folder cards. Keep folder preview rows and the explicit `Open folder` CTA as separate tap targets so phone taps do not require multiple attempts.
- Existing test/legacy projects should **not** be deleted automatically. Hide them from the new hub until the user explicitly confirms data cleanup or the new Site Walk folder model creates fresh project/site folders.
- Project-scoped full file browser remains available at `/projects/[projectId]/slatedrop` and `/project-hub/[projectId]/slatedrop`.
- `lib/site-walk/slatedrop-bridge.ts` already bridges Site Walk captures/PDF exports into `slatedrop_uploads`; older notes that say Site Walk has zero SlateDrop bridge are stale.
- Remaining gap: build the dedicated Site Walks/session folder presentation, wire action routes to real upload/share/send/create-folder flows, and add collaborator-scoped file permissions.

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
| SlateDropClient | `components/slatedrop/SlateDropClient.tsx` | **282** | ✅ Main explorer orchestration shell (decomposition complete — 7 sub-hooks extracted) |
| SlateDropContextMenu | `components/slatedrop/SlateDropContextMenu.tsx` | ~240 | Extracted context-menu render/actions surface from `SlateDropClient` |
| SlateDropActionModals | `components/slatedrop/SlateDropActionModals.tsx` | ~300 | Extracted new-folder/rename/delete/move modal UI surface from `SlateDropClient` |
| SlateDropSharePreviewModals | `components/slatedrop/SlateDropSharePreviewModals.tsx` | ~260 | Extracted secure-send and preview modal UI surface from `SlateDropClient` |
| SlateDropFileArea | `components/slatedrop/SlateDropFileArea.tsx` | ~290 | Extracted subfolders/files grid-list/empty-state render surface from `SlateDropClient` |
| SlateDropSidebar | `components/slatedrop/SlateDropSidebar.tsx` | ~200 | Extracted mobile overlay + sidebar storage/new-folder/folder-tree surface from `SlateDropClient` |
| SlateDropTopBar | `components/slatedrop/SlateDropTopBar.tsx` | ~100 | Extracted top header shell (logo/nav/mobile toggle/user menu) from `SlateDropClient` |
| SlateDropToolbar | `components/slatedrop/SlateDropToolbar.tsx` | ~120 | Extracted breadcrumb + search/sort/view/upload/ZIP controls from `SlateDropClient` |
| SlateDropNotificationsOverlay | `components/slatedrop/SlateDropNotificationsOverlay.tsx` | ~40 | Extracted toast and upload-progress overlay UI from `SlateDropClient` |
| SlateDrop client utils | `lib/slatedrop/client-utils.ts` | ~150 | Shared format/icon/tree/path helpers extracted from `SlateDropClient` |
| ProjectFileExplorer | `components/slatedrop/ProjectFileExplorer.tsx` | 363 | Project-scoped file view |
| useSlateDropFiles | `lib/hooks/useSlateDropFiles.ts` | ~110 | Extracted file loading/sorting state hook used by `SlateDropClient` |
| useSlateDropUiState | `lib/hooks/useSlateDropUiState.ts` | ~130 | Extracted UI modal/context-menu/share/preview state hook used by `SlateDropClient` |
| useSlateDropTransferActions | `lib/hooks/useSlateDropTransferActions.ts` | ~115 | Extracted download/zip/clipboard/secure-send handlers from `SlateDropClient` |
| useSlateDropMutationActions | `lib/hooks/useSlateDropMutationActions.ts` | ~290 | Extracted create/rename/delete/move handlers from `SlateDropClient` |
| useSlateDropInteractionHandlers | `lib/hooks/useSlateDropInteractionHandlers.ts` | ~100 | Extracted drag/drop/sort/select/context-menu/sign-out handlers from `SlateDropClient` |
| useSlateDropUploadActions | `lib/hooks/useSlateDropUploadActions.ts` | ~105 | Extracted upload reservation/put/finalize workflow from `SlateDropClient` |
| useSlateDropPreviewUrl | `lib/hooks/useSlateDropPreviewUrl.ts` | ~60 | Extracted preview URL loading/error/url lifecycle from `SlateDropClient` |

### Canonical Root Folder List (Entitlement-Gated)

Single source of truth for which top-level folders should be visible by tier:

- `lib/slatedrop/folderTree.ts`
  - `buildSlateDropBaseFolderTree(tier)`
  - `listSlateDropRootFolders(tier)`

Used by:
- `components/slatedrop/SlateDropClient.tsx` (sidebar root nodes)
- Dashboard SlateDrop widget compact folder grid
- Project Hub SlateDrop widget compact folder grid

### SlateDropClient Decomposition — ✅ COMPLETE
Reduced from 451 → 282 lines. All state and logic extracted into 7 sub-hooks + 7 render components.
```
SlateDropClient.tsx       → 282 lines (layout shell + orchestrator)
SlateDropSidebar.tsx      → folder tree sidebar
SlateDropToolbar.tsx      → breadcrumb + controls
SlateDropNotificationsOverlay.tsx → toast + upload-progress overlays
SlateDropFileArea.tsx     → file list/grid + empty states + upload drop area
SlateDropContextMenu.tsx  → right-click context menu
SlateDropSharePreviewModals.tsx → share + file preview modals
SlateDropActionModals.tsx → create/rename/delete/move modals
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
