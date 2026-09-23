# Entity Action / Settings Matrix

**Status:** planning and verification document. Slice 5 added the client Items read/question/plan-marker contract in section 5c. Do not invent backend features.  
**Last updated:** 2026-09-21 (Slice 5: client Items consumption, questions, plan locator)  
**Scope:** Phase 1 vNext. Do not invent backend features. Do not surface SaaS pricing, plans, seat upsells, app marketplace, or subscription controls.

Vocabulary:

| Status | Meaning |
|---|---|
| `SUPPORTED` | Existing API/table clearly implements the operation |
| `PARTIAL` | Some of the operation exists; gaps, split models, or UI-only pieces remain |
| `NOT CURRENTLY SUPPORTED` | No production API/table consumer found for this operation |
| `NEEDS VERIFICATION` | Evidence is incomplete or conflicting; later slice must confirm before building UI |
| `NOT APPLICABLE` | Operation does not apply to this entity |

Permission source is what production code uses today. Owner vNext additionally requires `canAccessOperationsConsole` (CEO / `isSlateCeo` today). This slice does not broaden staff access.

Cross-slice rule: when a later slice adds a control for an entity, it must consult this matrix, only expose operations marked `SUPPORTED` or confirmed after `NEEDS VERIFICATION`, and add tests from `docs/vnext/SLATE360_UI_PHASE1_REVIEW_PROTOCOL.md`.

---

## 1. Client / Organization

These are **not** the same record. There is no `clients` table.

### 1a. Organization (tenant)

| Field | Value |
|---|---|
| Backend / data model | `organizations` via `organization_members`. Branding: `organizations.brand_settings` and `org_branding` |
| Permission source | Org membership + `role` (`owner` / `admin` / `member` / `viewer`). Settings writes typically `isAdmin` / `canChangeOrgSettings` |
| Rename | `NEEDS VERIFICATION` — org name is loaded in org context; no dedicated public rename API found in this inventory |
| Edit | `PARTIAL` — `PUT /api/site-walk/branding/settings` updates `brand_settings`; `org_branding` is read by `lib/server/branding.ts` |
| Duplicate / Copy | `NOT CURRENTLY SUPPORTED` |
| Move | `NOT APPLICABLE` |
| Archive | `NOT CURRENTLY SUPPORTED` |
| Delete | `NOT CURRENTLY SUPPORTED` as a product action |
| Restore | `NOT APPLICABLE` |
| Share / Copy link | `NOT APPLICABLE` |
| Download | `NOT APPLICABLE` |
| Publish / Unpublish / Revoke | `NOT APPLICABLE` |
| Delete semantics | `NOT APPLICABLE` |
| Intended vNext UI | Owner Clients + owner Settings; not a client dump of org admin |
| Planned Phase 1 slice | 9 (Clients), 11 (permissions / polish) |
| Backend exists | `PARTIAL` |
| Later verification | Whether `organizations.name` is writable; which branding table is canonical for client-facing identity |

### 1b. CRM client (`org_contacts`)

| Field | Value |
|---|---|
| Backend / data model | `org_contacts` + `contact_projects` + `contact_files` |
| Permission source | Authenticated org scope (`withAuth` + `orgId`) |
| Rename | `SUPPORTED` — `PATCH /api/contacts/[contactId]` (`name`) |
| Edit | `SUPPORTED` — name, email, phone, company, title, notes, tags |
| Duplicate / Copy | `NOT CURRENTLY SUPPORTED` |
| Move | `NOT APPLICABLE` (link to projects via `contact_projects` instead) |
| Archive | `NOT CURRENTLY SUPPORTED` |
| Delete | `SUPPORTED` — `DELETE /api/contacts/[contactId]` |
| Restore | `NOT CURRENTLY SUPPORTED` |
| Share / Copy link | `NOT CURRENTLY SUPPORTED` |
| Download | `NEEDS VERIFICATION` — contact files exist; no dedicated contact zip found |
| Publish / Unpublish / Revoke | `NOT APPLICABLE` |
| Delete semantics | **Hard-delete** of contact row, associations, and related S3 files |
| Intended vNext UI | Owner Clients entity actions |
| Planned Phase 1 slice | 9 |
| Backend exists | `SUPPORTED` for rename/edit/delete |
| Later verification | Role gating beyond org membership; file download |

---

## 2. Project

| Field | Value |
|---|---|
| Backend / data model | `projects` + `project_members` + `collaborator_invites` |
| Permission source | `lib/projects/access.ts` — org ∪ creator ∪ `project_members` |
| Rename | `SUPPORTED` — `PATCH /api/projects/[projectId]` `name` |
| Edit | `SUPPORTED` — name, description, metadata, status |
| Duplicate / Copy | `NOT CURRENTLY SUPPORTED` |
| Move | `NOT APPLICABLE` (org-scoped; no move-between-orgs API found) |
| Archive | `PARTIAL` — `status` is patchable; `projects.is_archived` exists. Client portfolio hides archived/`status=archived` rows. Archive-as-product-action **NEEDS VERIFICATION** |
| Delete | `SUPPORTED` — `DELETE /api/projects/[projectId]` with `confirmText === "DELETE"` and matching `confirmName`. **Not exposed on the Slice 2 client portfolio** |
| Restore | `NOT CURRENTLY SUPPORTED` |
| Share / Copy link | `PARTIAL` — project-level share is via nested deliverable/twin/file tokens, not a single project token |
| Download | `NEEDS VERIFICATION` — SlateDrop zip exists; not a whole-project export product |
| Publish / Unpublish / Revoke | `NOT CURRENTLY SUPPORTED` as a project-level publish flag |
| Delete semantics | **Hard-delete** of the project row after related cleanup |
| Intended vNext UI | Client portfolio (open only, Slice 2); Overview (Slice 3, **built** — read-only header/hero/latest-visit/representations/recent-items/recent-documents, no project CRUD surfaced); Explore (Slice 4, **built** — `/vnext/projects/[id]/explore`, reads the same `representations` this row documents); owner Projects Slice 9 |
| Planned Phase 1 slice | 2, 3, 4, 9 |
| Backend exists | `SUPPORTED` for list/rename/edit/confirmed delete |
| Image fields | `SUPPORTED` `projects.thumbnail_url`. Reality preview: `digital_twin_models.preview_storage_key`. 360 still: `site_walk_items` `photo_360`. Plan: `site_walk_plan_sheets` thumbnail/raster/image keys. Satellite: lat/lng + `/api/static-map`. Drone **hero still** `NOT CURRENTLY SUPPORTED` (no image route; `droneUrl` is never populated). **Corrected 2026-09-18:** drone *representation* is never reported as client-renderable either — `drone_photo`/`drone_video` source assets exist (`digital_twin_capture_assets`) but are not flagged into `representations`, because no proven client-renderable Drone viewer exists (confirmed in the Slice 0 salvage audit). Raw drone asset ingest/storage is unaffected. **Further corrected 2026-09-18 (Slice 4):** the same table's `panorama_360` asset kind was *also* incorrectly flagging "360" available — confirmed via repo-wide search that `app/api/digital-twin/**` has no GET/image route for `digital_twin_capture_assets` at all (only a PATCH re-tag route exists). `load-portfolio-evidence.ts` no longer reads this table for any representation flag; "360" is sourced only from `site_walk_items` (`photo_360`), which does have a proven route (`/api/site-walk/items/[id]/image`) |
| Latest visit | `PARTIAL` — adapter over session/capture/item/thermal timestamps. No `visits` table. Omit when no dated record exists |
| Later verification | Who may delete; archive product semantics; drone still URL |

---

## 3. Visit / Scan

No first-class `visits` table. Adapter over existing records (Decision C).

| Field | Value |
|---|---|
| Backend / data model | Closest: `site_walk_sessions`, `digital_twin_captures` / spaces / models, `thermal_analysis_sessions` |
| Permission source | Site Walk: `withAppAuth("punchwalk")` + org. Twin: org + twin entitlement. Thermal: CEO studio vs published share |
| Rename | `PARTIAL` — Site Walk `PATCH /api/site-walk/sessions/[id]` `title`. Twin space title **NEEDS VERIFICATION**. Thermal **NEEDS VERIFICATION** |
| Edit | `PARTIAL` — session status/metadata/type; twin/thermal edit surfaces differ |
| Duplicate / Copy | `NOT CURRENTLY SUPPORTED` as a visit clone |
| Move | `PARTIAL` — Site Walk session `project_id` is patchable |
| Archive | `SUPPORTED` (Site Walk) — `DELETE` without `permanent` sets `status='archived'` |
| Delete | `SUPPORTED` (Site Walk) — `permanent: true` + `confirmText` + `confirmName` hard-deletes |
| Restore | `NEEDS VERIFICATION` — archived status can likely be patched back; no dedicated restore route found |
| Share / Copy link | `PARTIAL` — share is of deliverables / twin spaces / thermal reports, not a unified visit token |
| Download | `NEEDS VERIFICATION` per modality |
| Publish / Unpublish / Revoke | Each Reality model, Geometry model, 360 photo, and plan sheet is its own `project_source_publications` row. Publishing one does not revoke another. Thermal publish is a live share token, and only after that session is included and approved. A Site Walk session status is not a public publish flag |
| Delete semantics | Site Walk: **soft archive** default; **hard-delete** when permanent. Twin/thermal: **NEEDS VERIFICATION** |
| Intended vNext UI | History, Explore, owner Processing / QA; Overview (Slice 3) shows only a single derived "latest visit" (date + plain client-facing source label — "Site visit" / "3D scan" / "Thermal scan"; corrected 2026-09-18 from the original implementation-oriented "Site walk visit" / "Digital twin capture" / "Thermal session"), no visit list or actions |
| Planned Phase 1 slice | 4, 7, 10 |
| Backend exists | `PARTIAL` — mature for Site Walk sessions; adapter still required |
| Later verification | Twin capture/space delete/rename; thermal session lifecycle; unified Visit identity |

---

## 4. Deliverable

| Field | Value |
|---|---|
| Backend / data model | `site_walk_deliverables` (+ snapshots, questions, `share_token`) |
| Permission source | `withAppAuth("punchwalk")` + org |
| Rename | `SUPPORTED` — `PATCH /api/site-walk/deliverables/[id]` `title` |
| Edit | `SUPPORTED` — status, content, portal/presentation/viewer configs |
| Duplicate / Copy | `NOT CURRENTLY SUPPORTED` |
| Move | `NOT CURRENTLY SUPPORTED` |
| Archive | `SUPPORTED` — `DELETE /api/site-walk/deliverables/[id]` archives (route comment) |
| Delete | `PARTIAL` — archive path exists; permanent hard-delete **NEEDS VERIFICATION** |
| Restore | `NEEDS VERIFICATION` — status patch may unarchive |
| Share / Copy link | `SUPPORTED` — `POST .../share` (token, snapshot pin, optional expiry / max_views / refresh) |
| Download | `SUPPORTED` — `POST .../export` PDF; `allow_viewer_download` flag |
| Publish / Unpublish / Revoke | `SUPPORTED` — share publishes token; `POST .../revoke` sets `share_revoked` / status `revoked` |
| Delete semantics | **Archive** (not documented as row hard-delete) |
| Intended vNext UI | Project overview / Documents / owner Shares & QA |
| Planned Phase 1 slice | 11 (also 3, 10 as surfaces appear) |
| Backend exists | `SUPPORTED` for rename/edit/share/revoke/export |
| Later verification | Exact archive vs restore status values; portal vs `/view/[token]` mint path |

---

## 5. Item / Question

Two related records. Do not collapse them in UI.

### 5a. Site Walk item

| Field | Value |
|---|---|
| Backend / data model | `site_walk_items` (+ pins, comments, assignments) |
| Permission source | `withAppAuth("punchwalk")` + org |
| Rename | `SUPPORTED` — `PATCH .../items/[id]` `title` |
| Edit | `SUPPORTED` — description, status, priority, assignment, markup, tags, trade, category |
| Duplicate / Copy | `NOT CURRENTLY SUPPORTED` as a first-class clone (bulk route exists; clone semantics **NEEDS VERIFICATION**) |
| Move | `NEEDS VERIFICATION` — no dedicated move-between-sessions field inventoried here |
| Archive | `NOT CURRENTLY SUPPORTED` as a separate archive flag |
| Delete | `SUPPORTED` — `DELETE .../items/[id]` sets `deleted_at` |
| Restore | `NOT CURRENTLY SUPPORTED` — no item restore route found (`deleted_at: null` not exposed) |
| Share / Copy link | `PARTIAL` — items appear inside deliverable/share viewers; no standalone item token found |
| Download | `PARTIAL` — item image route exists |
| Publish / Unpublish / Revoke | `NOT APPLICABLE` |
| Delete semantics | **Soft-delete** via `deleted_at`; related plan pin is reverted to empty |
| Intended vNext UI | Items surface + Explore overlays; Overview (Slice 3) shows a read-only 5-most-recent list (title, `item_status` label, updated date) with a link to the Items scaffold — no rename/edit/delete surfaced |
| Planned Phase 1 slice | 5 |
| Backend exists | `SUPPORTED` for rename/edit/soft-delete |
| Later verification | Restore; bulk duplicate; twin pins vs Site Walk items |

### 5b. Deliverable question

| Field | Value |
|---|---|
| Backend / data model | Deliverable questions via `/api/site-walk/deliverables/[id]/questions` |
| Permission source | Same as deliverable |
| Rename / Edit | `SUPPORTED` (questions API exists — KEEP BACKEND) |
| Duplicate / Move / Archive | `NEEDS VERIFICATION` |
| Delete | `NEEDS VERIFICATION` |
| Share | `PARTIAL` — visible on shared deliverable, not independently tokenized |
| Intended vNext UI | Items / share response UI |
| Planned Phase 1 slice | 5, 11 |
| Backend exists | `PARTIAL` |
| Later verification | Full question CRUD verbs before building overflow actions |

### 5c. vNext client Items (Slice 5)

Verified against the Phase 1 client route. This does not change the legacy Site Walk capabilities in 5a.

| Field | Value |
|---|---|
| Backend / data model | Adapter over `site_walk_items`, `site_walk_comments`, `site_walk_pins`, `site_walk_sessions`. No new table |
| Permission source | vNext project access (`getScopedProjectForUser`: org, creator, or `project_members`). Punchwalk entitlement is not required |
| Read item | `SUPPORTED` for non-deleted items whose `project_id` matches the authorized project |
| Ask a question | `SUPPORTED` — inserts `site_walk_comments` only after item and session both belong to that project |
| Rename / Edit / Delete / status / priority / assign / pin move | `HIDDEN` on the client route. Legacy routes still support several of these for the standalone app; they are not exposed here |
| Comment delete / escalate | `HIDDEN` |
| Share / Copy link | `NOT IN THIS SLICE` |
| Plan location | `SUPPORTED` when `site_walk_pins.plan_sheet_id` points at a renderable sheet in the same project. Read-only marker in Explore |
| Reality / Geometry XYZ | `NOT CURRENTLY SUPPORTED` — `digital_twin_pins` is not linked to `site_walk_items` |
| 360 look-at | `NOT CURRENTLY SUPPORTED` — no item yaw/pitch. A `photo_360` item can open its own panorama |
| Geo viewer | `NOT IN THIS SLICE` — coordinates stay on the locator; the label is what the client sees |
| Intended vNext UI | `/vnext/projects/[projectId]/items` and `/items/[itemId]` |
| Planned Phase 1 slice | 5, built |

---

## 6. Document

| Field | Value |
|---|---|
| Backend / data model | `slatedrop_uploads` (authoritative). `unified_files` is a downstream bridge — do not treat as source of truth |
| Permission source | Authenticated user + org/project scope (`getScopedProjectForUser` / org membership) |
| Rename | `SUPPORTED` — `PATCH /api/slatedrop/rename` |
| Edit | `PARTIAL` — metadata/name; file bytes replaced via upload, not an in-place editor |
| Duplicate / Copy | `SUPPORTED` — `/api/slatedrop/duplicate` |
| Move | `SUPPORTED` — `/api/slatedrop/move` |
| Archive | `NOT CURRENTLY SUPPORTED` as a distinct archive state |
| Delete | `SUPPORTED` — `/api/slatedrop/delete` |
| Restore | `SUPPORTED` — `/api/slatedrop/restore` within 30 days (`/api/slatedrop/deleted` lists) |
| Share / Copy link | `SUPPORTED` — `/api/slatedrop/links` → `/share/[token]` (+ unlock) |
| Download | `SUPPORTED` — `/api/slatedrop/download`; zip via `/api/slatedrop/zip` |
| Publish / Unpublish / Revoke | `PARTIAL` — link create exists; revoke/expiry **NEEDS VERIFICATION** on `slate_drop_links` |
| Delete semantics | **Soft-delete** (`status='deleted'` + `deleted_at`); S3 retained for 30-day restore. Permanent purge is described as future scheduled cleanup |
| Intended vNext UI | Documents; Overview (Slice 3) shows a read-only 5-most-recent list (file name, upload date) reusing the exact `project_folders` + `resolveNamespace` + `slatedrop_uploads` prefix-scoping pattern from the legacy `loadProjectOverviewData`, with a link to the Documents scaffold — no rename/move/delete/share surfaced |
| Planned Phase 1 slice | 6 |
| Backend exists | `SUPPORTED` for rename/duplicate/move/soft-delete/restore/download |
| Later verification | Link revoke; password-gated links in vNext |

### 6b. vNext client Documents (Slice 6)

Verified against the Phase 1 client route. This does not change the legacy SlateDrop capabilities in section 6.

| Field | Value |
|---|---|
| Backend / data model | Adapter over `project_folders` + `slatedrop_uploads`. `unified_files` is not the source. No new table |
| Permission source | vNext project access (`getScopedProjectForUser`: org, creator, or `project_members`). A SlateDrop or Punchwalk entitlement is not required |
| Read | `SUPPORTED` for `status='active'` files whose folder belongs to the project and is a client document folder |
| Hidden from the client | Capture folders (photos, notes, voice, data), reconstruction inputs (clips, LiDAR, models, source assets, tour scenes), commercial/operator folders (contracts, insurance, budget, schedule, daily logs, RFIs, team uploads), deliverable sentinel links, storage keys |
| Open | `SUPPORTED` for PDF and common images, via a project-scoped file route that redirects to a signed URL |
| Download | `SUPPORTED` for the same client files. Other types are download-only |
| Rename / move / delete / upload / share | `HIDDEN` on the client route |
| Folder tree | `NOT IN THIS SLICE` — folder is a label and, when more than one exists, a filter |
| Document → item | `SUPPORTED` when `site_walk_deliverable_assets.file_id` points at the file and `source_item_id` is a live item in the same project |
| Document → plan | `SUPPORTED` when `site_walk_plan_sets.source_file_id` is that file (Slice 6A). A shared name is not a link. Slice 6 had not found this foreign key |
| Project search | Documents, items, and renderable plan sheets. No embeddings |
| Intended vNext UI | `/vnext/projects/[projectId]/documents` and `/documents/[documentId]` |
| Planned Phase 1 slice | 6, built |

---

### 6c. vNext project plans (Slice 6A)

| Field | Value |
|---|---|
| Backend / data model | `site_walk_plan_sets` and `site_walk_plan_sheets`, both `project_id` required. Sessions reference sheets through `site_walk_session_plan_sheets`. Pins reference `plan_sheet_id` |
| Visit ownership | A visit does not own the plan file. Two sessions can reference the same sheet |
| Revisions | Set-level `revision_number`, `revision_label`, `supersedes_plan_set_id`, `is_current_revision`. Displayed when present. New uploads do not auto-supersede |
| Source document | `source_file_id` → `slatedrop_uploads`, shown only when that file is a client document |
| Read | vNext project access. Renderable sheets open Explore. Processing and failed sheets do not |
| Write / upload | `user_can_manage_project` roles only: owner, admin, member, manager. Collaborator and viewer cannot upload. PDF into an existing drawings or plans folder, then `plan.rasterize` |
| Legacy route | `/api/site-walk/plan-sets` remains Punchwalk-gated and was not widened |
| Intended vNext UI | Documents → Project plans. No new nav tab |
| Planned Phase 1 slice | 6A, built |

---

### 6d. vNext history and compare (Slice 7)

| Field | Value |
|---|---|
| Backend / data model | Adapter over `site_walk_sessions`, `site_walk_items`, `digital_twin_captures`, `digital_twin_models`, `digital_twin_spaces`, `thermal_analysis_sessions`, and `site_walk_session_plan_sheets`. No visits table |
| Merge rule | Only a real foreign key. Same calendar date does not merge a thermal scan with a site walk or a reality scan |
| Date | Physical capture time. `updated_at` is never the visit date. See Slice 7 notes for the exact fallback per source |
| Client record | Site walk `completed` or `signed`. A published ready twin model. A published 360 photo or plan sheet. Thermal only when `isThermalSessionAvailable`. Drafts, failed processing, unpublished ready models, revoked or expired thermal, and deleted rows are excluded |
| Documents on a visit | `NOT SUPPORTED`. No visit-to-document foreign key. Documents stay on Documents |
| Items on a visit | `SUPPORTED` when `site_walk_items.session_id` is that session |
| Plan context | `SUPPORTED` as a reference to the project sheet. The visit does not own a plan copy. Revision label is the drawing revision, not the visit date |
| Compare | Reality, Geometry, 360, Plan, and Thermal, only when both selected visits can render that representation. Side-by-side stills. No automated change detection |
| Camera sync | Allowed by evidence only: both models `georeferenceStatus=VERIFIED` in the same space. The compare page still does not move the cameras. Unproven pairs stay independent |
| 360 viewpoint | `NOT SUPPORTED`. No station or yaw link. Side-by-side panoramas are not labeled as the same viewpoint |
| Read | vNext project access. Another project's id is not found |
| Write | `HIDDEN` |
| Intended vNext UI | `/vnext/projects/[projectId]/history`, `/history/[visitId]`, `/history/compare` |
| Planned Phase 1 slice | 7, built |

---

### 6e. Project client delivery scope (Slice 7A)

| Field | Value |
|---|---|
| Backend / data model | `project_client_capabilities`. One row per project and capability id. Not `projects.settings`, not `org_feature_flags` |
| Included | The service or portal section is part of this project's delivery. Authoritative when any row exists |
| Published | Separate from included and from ready. Thermal uses the live share. Reality, Geometry, 360, and Plans use an active `project_source_publications` row for that exact source. See `docs/vnext/PROCESS_QA_PUBLISH.md` |
| Renderable | A working viewer or file. Included without a renderable source stays hidden |
| Client rule | Project access AND included AND published where applicable AND renderable. Otherwise the client sees nothing about that capability |
| Unconfigured | Portal sections on. Services off |
| New project | Seed trigger: portal on, services off |
| Existing project | Backfill from already client-visible sources only |
| Read | Project access. The server adapter applies the filter. Hidden services are not queried into History or search hits |
| Write | `PUT /api/vnext/projects/[projectId]/scope` calls `replace_project_client_scope`, one upsert of all nine ids. `user_can_manage_project` only. Unknown ids dropped. No prices |
| Intended vNext UI | The same client pages, with tabs and records removed when the capability is off. Owner checklist is Slice 9/10 |
| Planned Phase 1 slice | 7A, built. Canonical doc: `docs/vnext/PROJECT_CLIENT_DELIVERY_SCOPE.md` |

---

## 7. Folder

| Field | Value |
|---|---|
| Backend / data model | `project_folders` |
| Permission source | Same as Documents / project scope |
| Rename | `SUPPORTED` — `PATCH /api/slatedrop/folders` (`folderId`, `newName`). System folders cannot be renamed |
| Edit | `PARTIAL` — name/path; no general folder metadata product |
| Duplicate / Copy | `NOT CURRENTLY SUPPORTED` |
| Move | `NEEDS VERIFICATION` — file move exists; folder reparent **NEEDS VERIFICATION** |
| Archive | `NOT CURRENTLY SUPPORTED` |
| Delete | `SUPPORTED` — `DELETE /api/slatedrop/folders`. System folders cannot be deleted |
| Restore | `NOT CURRENTLY SUPPORTED` for the folder row |
| Share / Copy link | `NEEDS VERIFICATION` |
| Download | `PARTIAL` — zip may include folder contents |
| Publish / Unpublish / Revoke | `NOT APPLICABLE` |
| Delete semantics | **Hard-delete** of `project_folders` rows. Contained files are marked `status='deleted'` and S3 objects are deleted best-effort — restore of those files after folder delete is **NEEDS VERIFICATION** / likely broken |
| Intended vNext UI | Documents |
| Planned Phase 1 slice | 6 |
| Backend exists | `SUPPORTED` for create/rename/delete (non-system) |
| Later verification | Folder move; restore after folder delete; system-folder UX |

---

## 8. Share

Do not casually unify token families.

| Family | Table / route | Create | Copy link | Revoke | Expiry / max views |
|---|---|---|---|---|---|
| Site Walk deliverable | `site_walk_deliverables.share_token` → `/view/[token]` | `SUPPORTED` | `SUPPORTED` | `SUPPORTED` | `SUPPORTED` (optional) |
| Deliverable portal | `deliverable_access_tokens` → `/portal/[token]` | `NEEDS VERIFICATION` which mint path is live | `PARTIAL` | `NEEDS VERIFICATION` | `NEEDS VERIFICATION` |
| Twin | `digital_twin_share_tokens` → `/share/twin/[token]` | `SUPPORTED` (`/api/digital-twin/share/create`) | `SUPPORTED` | `SUPPORTED` (`.../share/revoke`) | `PARTIAL` (create accepts expiry / max_views) |
| Thermal | `thermal_analysis_share_tokens` → `/share/thermal/[token]` | `NEEDS VERIFICATION` for vNext owner QA | `PARTIAL` | `NEEDS VERIFICATION` | `NEEDS VERIFICATION` |
| SlateDrop file | `slate_drop_links` → `/share/[token]` | `SUPPORTED` | `SUPPORTED` | `NEEDS VERIFICATION` | `NEEDS VERIFICATION` |
| Tour public | `project_tours` slug → `/tours/view/[slug]` | `DEFER` as a client product | — | — | — |

| Field | Value |
|---|---|
| Permission source | Creating shares: authenticated org/app auth. Viewing: token (login not required) |
| Rename | `PARTIAL` — twin create accepts `label` |
| Duplicate | `NOT APPLICABLE` (mint a new token instead) |
| Delete | `PARTIAL` — revoke, not always row delete |
| Restore | `NEEDS VERIFICATION` (un-revoke) |
| Intended vNext UI | Owner Shares; contextual Copy link on the source entity |
| Planned Phase 1 slice | 11 |
| Backend exists | `SUPPORTED` for deliverable + twin create/revoke |
| Later verification | Portal vs view token; thermal; file-link revoke; un-revoke |

Production token URLs must remain stable (Decision K).

---

## 9. Saved evidence view

| Field | Value |
|---|---|
| Backend / data model | `project_saved_views`. `digital_twin_viewpoints` stays twin-only (space, left/right cameras, kinds orbit / book_spread / section / compare) and is not the store for Plan, 360, or Thermal |
| Permission source | Read: project access, then the client capability must still be included. Write: `userCanManageVnextProject` (owner, admin, member, manager). Collaborators and viewers do not create project-shared views |
| Rename | `SUPPORTED` — title only, same write role |
| Edit | `PARTIAL` — create captures the current source and whatever view state that viewer exposes. There is no separate pose editor |
| Duplicate / Copy | `NOT CURRENTLY SUPPORTED` |
| Move | `NOT APPLICABLE` |
| Archive | `NOT CURRENTLY SUPPORTED` |
| Delete | `SUPPORTED` — confirmed delete by a manager. Turning a capability off does not delete the row |
| Restore | `NOT APPLICABLE` |
| Share / Copy link | `PARTIAL` — authenticated deep link `?view=` only. No public token in this slice |
| Download | `NOT APPLICABLE` |
| Publish / Unpublish / Revoke | `NOT APPLICABLE` — visibility follows project capability and source renderability |
| Delete semantics | Row delete. Hidden is not deleted |
| Intended vNext UI | Explore → Views. Not a project tab |
| Planned Phase 1 slice | 8 — implemented |
| Backend exists | `SUPPORTED` — `GET/POST /api/vnext/projects/[projectId]/saved-views`, `PATCH/DELETE .../[viewId]` |
| Later verification | Public share tokens are Slice 11 |

---

## 10. Saved camera path

| Field | Value |
|---|---|
| Backend / data model | `digital_twin_models.camera_path` jsonb. One current path for that model. Not a named library |
| Permission source | vNext project route. The model must be a ready splat in a space on that project, and Reality must be included. Write: `userCanManageVnextProject`. The legacy `withAppAuth("digital_twin")` route is not the vNext surface |
| Rename | `NOT CURRENTLY SUPPORTED` — the path is not a named library item |
| Edit | `SUPPORTED` — `GET/PATCH /api/vnext/projects/[projectId]/models/[modelId]/camera-path` |
| Duplicate / Copy | `NOT CURRENTLY SUPPORTED` |
| Move | `NOT APPLICABLE` — a path is not copied onto another model |
| Archive | `NOT CURRENTLY SUPPORTED` |
| Delete | `PARTIAL` — saving an empty keyframe list clears it. No separate delete route |
| Restore | `NOT CURRENTLY SUPPORTED` |
| Share / Copy link | `NOT CURRENTLY SUPPORTED` |
| Download | `NOT CURRENTLY SUPPORTED` |
| Publish / Unpublish / Revoke | `NOT APPLICABLE` |
| Delete semantics | The blob stays on the model row until replaced |
| Intended vNext UI | Explore → Views, Reality only |
| Planned Phase 1 slice | 8 — implemented |
| Backend exists | `SUPPORTED` for one path per splat model |
| Later verification | Named path libraries and server video export are later work |

---

## 11. User Account

See also [Account / Settings contract](#account--settings-contract). Actions belong on Account, not on project objects.

| Field | Value |
|---|---|
| Backend / data model | `auth.users` + `profiles` (`display_name`, `job_title`, `phone`, `avatar_url`, `preferences`) |
| Permission source | The signed-in user (own profile). Supabase Auth for password/session |
| Rename | `SUPPORTED` — display name via `profiles` (`useSettingsProfile`) |
| Edit | `SUPPORTED` — name, job title, phone, bio, location, avatar |
| Duplicate / Copy | `NOT APPLICABLE` |
| Move | `NOT APPLICABLE` |
| Archive | `NOT CURRENTLY SUPPORTED` as a self-serve account archive |
| Delete | `NOT CURRENTLY SUPPORTED` as a self-serve account delete in this inventory |
| Restore | `NOT APPLICABLE` |
| Share / Copy link | `NOT APPLICABLE` |
| Download | `NOT APPLICABLE` |
| Publish / Unpublish / Revoke | `NOT APPLICABLE` |
| Delete semantics | `NOT APPLICABLE` |
| Intended vNext UI | Client `/vnext/account`; owner `/vnext/ops/account` |
| Planned Phase 1 slice | 11 |
| Backend exists | `SUPPORTED` for profile + password + sign-out |
| Later verification | Email change; listing/revoking other devices vs current sign-out |

---

## 12. Organization Settings

Authorized roles only. Not a client dumping ground. See contract below.

| Field | Value |
|---|---|
| Backend / data model | `organizations`, `organization_members`, `organizations.brand_settings`, `org_branding`, `site_walk_project_capture_settings` |
| Permission source | `isAdmin` / `canChangeOrgSettings` / `canInviteMembers`. Owner vNext also requires operations-console access for `/vnext/ops/settings` |
| Rename | `NEEDS VERIFICATION` (org display name) |
| Edit | `PARTIAL` — branding settings PUT; org_branding loader |
| Duplicate / Copy | `NOT APPLICABLE` |
| Move | `NOT APPLICABLE` |
| Archive / Delete / Restore | `NOT CURRENTLY SUPPORTED` as org-admin product actions |
| Share | `NOT APPLICABLE` |
| Members | `PARTIAL` — `GET /api/org/members`, `POST /api/org/members/invite` (admin). Invite currently enforces seat limits / `/plans` messaging — **do not surface that in vNext** |
| Project defaults | `PARTIAL` — per-project capture trades via `/api/site-walk/projects/[projectId]/capture-settings`. Org-wide defaults **NEEDS VERIFICATION** |
| Intended vNext UI | Owner Settings |
| Planned Phase 1 slice | 11 (owner Settings scaffold is Slice 1 route-only) |
| Backend exists | `PARTIAL` |
| Later verification | Canonical branding table; member deactivate/role change APIs; org name write |

---

## Account / Settings contract

Do not create settings that cannot persist. Do not implement this contract in Slice 1.

### Client / user Account (`/vnext/account`, `/vnext/ops/account`)

Expose only where backend support exists:

| Capability | Status | Persistence |
|---|---|---|
| Display name | `SUPPORTED` | `profiles.display_name` |
| Job title, phone, bio, location | `SUPPORTED` | `profiles` + `preferences` jsonb |
| Profile image | `SUPPORTED` | `profiles.avatar_url` (existing settings upload) |
| Email / contact as login identity | `PARTIAL` / `NEEDS VERIFICATION` — email is on auth/profile; self-serve email change not inventoried as a dedicated vNext-safe API |
| Password management | `SUPPORTED` — existing settings `updateUser` password + `/forgot-password` | Supabase Auth |
| Authentication / sign-in management | `PARTIAL` — password + confirmation resend exist; extra IdP linking **NEEDS VERIFICATION** |
| Notification preferences | `PARTIAL` — current settings persist to **`auth.user_metadata`**. Table `notification_preferences` exists in types with **no product consumer found** in this inventory |
| Personal preferences | `PARTIAL` — only fields already on `profiles.preferences` / metadata |
| Active session / sign-out | `SUPPORTED` — `POST /api/auth/signout`. Multi-device session list **NEEDS VERIFICATION** (`SettingsSecuritySessions` loads overview sessions) |
| Billing alerts toggle | Exists in current notification prefs — **do not carry into vNext Account** (Decision H) |

### Organization / admin Settings (`/vnext/ops/settings`, authorized roles)

| Capability | Status | Persistence |
|---|---|---|
| Company / organization information | `PARTIAL` — contact/address/website in `brand_settings`; org name write **NEEDS VERIFICATION** |
| Client-facing branding | `PARTIAL` — `PUT /api/site-walk/branding/settings` + logo upload `/api/site-walk/branding`. Separate `org_branding` used by portal chrome |
| Organization logo | `SUPPORTED` (Site Walk branding upload) |
| Members / access | `PARTIAL` — list + admin invite. Role/deactivate **NEEDS VERIFICATION**. Do not show seat upsells even though invite API mentions `/plans` |
| Project defaults | `PARTIAL` — Site Walk capture trades per project, not proven org-wide |
| Other existing org preferences | Only if a real writable field is confirmed in a later slice |

### Explicitly out of Phase 1 settings

Do **not** include unless Brian changes the business model:

- SaaS pricing
- plans
- seat upsells
- app marketplace
- subscription / entitlement / credit purchase controls

Existing billing/entitlement code stays untouched (Decisions H, J). `SettingsBillingPanel` / `SettingsBuyCreditsButton` are **not** vNext salvage.

---

## Cross-slice checklist

When a later slice adds entity UI:

1. Read this matrix for that entity.
2. Render only actions that are `SUPPORTED` (or newly verified).
3. Place actions on the object, not in Account.
4. Match delete semantics (hard vs soft vs archive).
5. Confirm destructive actions.
6. Add review-protocol regression coverage for each new control.
7. Update this file if verification changes a status.

No Slice 2+ controls are implemented by this document.

## 11. Owner workspace (Slice 9)

Verified against the current schema. No new client table.

| Surface | What Slice 9 does | What it does not do |
|---|---|---|
| Home `/vnext/ops` | Lists failed jobs that belong to an included service, plus a source that is ready for review or ready to publish. Recent projects come from the owner's accessible projects | KPI tiles, question queue, share manager |
| Clients `/vnext/ops/clients` | Groups `projects.client_name` by trimmed case-folded text. Detail is the matching projects | CRM, fuzzy merge, `org_contacts` as the list source |
| Projects `/vnext/ops/projects` | Search, client filter, attention filter. Row shows included services and client-visible services | Completion percent, storage, subscription language |
| Project scope `/vnext/ops/projects/[projectId]` | Reads and writes `project_client_capabilities` through `PUT /api/vnext/projects/[projectId]/scope`. Write still requires `userCanManageVnextProject` | A second visibility resolver |

Deferred attention: client questions (`site_walk_comments` has no client-versus-operator reply state) and share expiry. Those belong to Slice 11.

A service with `included = false` is omitted from the project summary. It is not an attention row.

## 12. Processing, QA, and publish (Slice 10)

| Surface | What Slice 10 does | What it does not do |
|---|---|---|
| Processing `/vnext/ops/processing` | Queued, running, failed, and recently completed twin, plan, and thermal jobs. Stage comes from the job | GPU metrics, cost, fake percent, retry |
| QA `/vnext/ops/qa` | Needs review, ready to publish, published, and rejected. The row is one model, sheet, 360 photo, or thermal session | Kanban, `review_status`, auto-publish |
| Preview | Owner route renders the client shell. A candidate source is a path on that route only | A client query that opens an unpublished source |
| Publish | `POST /api/vnext/ops/projects/[projectId]/release`. Operations-console owner. Source must belong to the project, the service must be included, and the review must be approved. Unpublish is that source only | Credit purchase, share recipient UI, publishing an unreviewed or rejected source |

Publishing one splat does not revoke another splat or a mesh. Review notes are operator-only. The legacy `published_model_id` pointer is unchanged and is not the vNext release.

