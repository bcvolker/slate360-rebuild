# Spec: SlateDrop Permissions, Copy & External Intake

Status: **spec / planning** (no app code). Wire the **dormant** permission model, add the missing
**copy** verb, add **external upload-intake links**, and polish mobile. Decision: **keep the custom
SlateDrop**, fill gaps. See `FEATURE_SPECS.md` §2 and `RESEARCH_SYNTHESIS_AND_DECISIONS.md` §3, §5.

## 1. Current state (from audit)
- Robust custom browser: upload/download/move/rename/soft-delete/restore/multi-select/drag-drop/
  context-menu/search/share; desktop + mobile shells; S3/R2 presign; `project_folders` tree.
- `project_folders` has `allowed_roles`, `allow_upload`, `allow_download`, `is_private`.
- **`folder_permissions` table + `check_stakeholder_folder_permission(email, folder_id, permission)`
  SQL function EXIST but are NOT CALLED anywhere.** ← highest-value work.
- **Missing:** copy; a permission-assignment UI; finished external upload-intake; mobile polish.
- **No upload notifications** (covered by the notification service spec).

## 2. Permission model (principal × folder × verb)

```sql
folder_permissions (
  id uuid pk, org_id uuid, folder_id uuid references project_folders,
  principal_type text,          -- 'user' | 'role' | 'external_link'
  principal_id text,            -- user_id | role key | intake token id
  can_view bool default true, can_upload bool, can_download bool,
  can_rename bool, can_move bool, can_delete bool, can_manage bool,
  inherited_from uuid null,     -- parent folder this was inherited from
  expires_at timestamptz null
);
```
**Inheritance:** a folder inherits parent permissions unless explicitly overridden; UI shows
"Inherited from <parent>" with an "Override" action. Effective permission = nearest explicit
ancestor row for the principal, else the role default (`allowed_roles`), else deny.

## 3. Wire enforcement into every route (server-side)
Add a single guard `assertFolderPermission(userOrToken, folderId, verb)` calling the existing SQL
function (batched for tree loads), then apply in:

| Route | Verb checked |
|---|---|
| folder tree / list | `can_view` (filter the tree; hide non-viewable) |
| `upload-url` / `complete` | `can_upload` |
| `download` / `zip` | `can_download` |
| `move` | `can_move` (source) + `can_upload` (target) |
| `rename` | `can_rename` |
| `delete` / `restore` | `can_delete` |
| **`copy`** (new) | `can_view`(source) + `can_upload`(target) |
| permission edits | `can_manage` |

RLS stays as the backstop; the function is the app-level fine-grain.

## 4. Copy (new verb — P0)
`POST /api/slatedrop/copy { fileId|folderId, targetFolderId }` → S3 `CopyObject` to a new key +
insert new `slatedrop_uploads`/`unified_files` row (+ recurse for folders). Same shape as `move`
minus the source delete. Increments storage quota.

## 5. Permission-assignment UI (desktop, P0)
A folder detail panel (slide-over):
```
FOLDER ACCESS — Project / Photos
People / Roles                 view  upload  download  rename  delete  manage
  Brian Volker (owner)          ✓     ✓       ✓         ✓       ✓       ✓
  Field crew (role)             ✓     ✓       ✓         ·       ·       ·
  Client reviewer (user)        ✓     ·       ✓         ·       ·       ·
Inherited from: Project (root)  [Override permissions for this folder]
Link access: [Create upload-intake link] [Create view-only share link]
```
Optimistic toggles → `folder_permissions` upserts. Reuse a clean toggle-matrix pattern.

## 6. External upload-intake links (P1)
For "send a contractor a link to drop files into THIS folder without an account."

```sql
upload_intake_links (
  id uuid pk, token_hash text, org_id uuid, folder_id uuid,
  label text, allowed_mime text[], max_file_size bigint, max_uploads int,
  require_email bool, expires_at timestamptz, created_by uuid, revoked_at timestamptz
);
```
Flow: create link → public page `/intake/[token]` (no auth) → presigned PUT into the target folder
(optionally a `_intake`/quarantine subfolder) → on complete, **fire `file.uploaded` notification** to
the folder owner/watchers. Enforce mime/size/count/expiry server-side.

## 7. Mobile polish (P1)
List-first (large rows, thumbnail left, name/meta stacked, trailing ⋮); **long-press → multi-select**
with a sticky bottom action bar (move/share/download/delete); **swipe-row actions**; **bottom sheets**
for context menu + create/upload (not desktop dropdowns); collapsing breadcrumb chips; FAB upload +
camera capture; per-file upload progress with retry. Libraries: `@dnd-kit/core` (desktop dnd),
`@radix-ui/react-context-menu`, `@tanstack/react-virtual` (folders with thousands of files).

## 8. Build order
1. `assertFolderPermission` guard + wire into all routes (filter tree by `can_view`).
2. Copy verb.
3. Permission-assignment UI + inheritance.
4. External upload-intake links + `/intake/[token]` + upload notification.
5. Mobile polish + virtualization.

## 9. Open items
- Version history / lineage on `unified_files` (P2).
- Audit log per folder (P2) — feeds the enterprise oversight console.
- Inline preview panel (image/PDF/video) via the unified `SlatePlayer`.
