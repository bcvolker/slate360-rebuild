# SlateDrop + Slate360 Desktop Shell — LOCKED design (multi-AI consensus, Jun 28 2026)

> 8+ independent AI passes; unanimous. Build on the existing backend (don't redesign schemas):
> `project_folders` taxonomy (auto-provisioned), `unified_files` bridge, `slatedrop_uploads`,
> `project_external_links` (token links), `site_walk_plan_sets` raster pipeline, tiers.
> Aesthetic = Graphite Glass; accent only on interactive states.

## Persistence requirement (Brian, this round) — partially wired
- **Projects/work** started in Site Walk or Twin 360 must be saved in their **SlateDrop folders**
  so the user can re-open, continue/edit, or finish. (Sessions already persist; ensure they're
  navigable from SlateDrop.)
- **Deliverables** created from Site Walk / Twin 360 must be saved into their respective
  **Deliverables** folders in SlateDrop — so the user can navigate to them (open the interactive
  link, hand a digital-twin file to a client, etc.).
- **DONE (Site Walk):** `lib/slatedrop/register-deliverable.ts` registers each created deliverable
  as a `unified_files` row (type `deliverable`, `storage_key='deliverable://<id>'`, in the resolved
  Deliverables folder, metadata.openPath deep-links to the deliverable). Wired into
  `POST /api/site-walk/deliverables`. Idempotent + non-fatal. **TODO:** same for Twin deliverables
  (`twin_deliverables` folder), PDF/Word/ZIP exports → Deliverables folder, and confirm sessions
  surface in SlateDrop as navigable "open to continue" entries.

## SlateDrop — Explorer-class file system
**Core opinion:** feel like Finder/Explorer/Dropbox on contact; never force tree management.
The 5 auto-provisioned roots (Photos/Plans/Deliverables/Intake/Submissions) are FIXED smart
locations (can't delete/rename). Auto-routing files by intent/type is shown as **type chips +
"filed to" hints**, never as "pick a folder." Add **Smart Views** (Plans/Photos/Intake/Recent/
Shared) = saved filters, not a second product.

**Desktop = three-pane:** folder tree (left, ~240px, system roots locked) + items grid/list
(center, sortable columns Name/Type/Modified/Size/Status, multi-select, marquee, drag-to-move,
breadcrumb) + preview pane (right, ~340px; plan conversion status, share actions). Keyboard
(↑↓/Space-quicklook/F2/⌘A/Del/⌘K), right-click context menu, bulk action bar. Plan rows show
Uploading→Converting(N/M sheets)→Ready→Failed.

**Mobile = focused stack:** smart folders as big rows → grid/list → full-screen preview. Upload
FAB → intent sheet (non-photos) → background queue. Long-press multi-select; bottom sheet actions.
≥48–60px targets. No three-pane.

**Secure links (two kinds, unified create UX):** (1) **Share** a file/folder — view / view+download,
expiry, optional password, branded no-login `/view|/share/[token]` viewer (download hidden when
view-only). (2) **Request files** (upload portal) — `/upload/[token]` drop zone landing in **Intake**,
private, captures uploader name+email, no login (Dropbox file-request model; never expose sibling
files). Links revocable; manage in "Active links."

**Permission model:** project role (Manager/Contributor/Viewer/External) → per-folder capability
(view/download/upload/manage), most-restrictive default, subfolders inherit with explicit override
(Egnyte, not Box waterfall). Presets (View deliverables / Upload to Intake / Owner rep / Custom).
Secure links are ADDITIVE grants to non-members; never reduce member access. Folder-level only
(no per-file ACL UI v1). Enforce server-side, not just UI.

## Slate360 Desktop Shell — one ecosystem, two accents
**Core opinion:** ONE Graphite Glass product, two workspaces (Site Walk green `#00E699`, Twin 360
blue `#3D8EFF`). A top **app switcher** (segmented, always-visible since only two) flips a single
`--accent` CSS var; EVERYTHING else (canvas, glass, rail geometry, type, spacing, ⌘K, shared
sections) stays identical. Figma-UI3 / Linear precedent. **Desktop NEVER captures** — a desktop
"walk"/"twin" is assembled by **uploading** photos/clips from the computer, then authored into
deliverables; capture is phone/tablet only. Make the primary action **Upload**, offer
"continue on phone" handoff.

**Layout:** top bar (brand + app switcher + ⌘K + account/tier) · left rail (project picker +
shared sections Projects/SlateDrop/Contacts/Calendar/Deliverables + app section label Walks↔Twins,
dimmed) · center workspace (app-specific) · right context pane (selection-scoped, collapsible).
⌘K palette is the spine (switch app/project, upload, new walk/twin, open SlateDrop, share).

**Site Walk desktop:** Upload media → auto-group into stops → review/curate → author deliverable
→ share. **Twin 360 desktop:** Upload clips/LiDAR/poses → review → submit to cloud reconstruction
(credit+time estimate, optional Google 3D Tiles) → monitor job → splat viewer (orbit, download SPZ)
→ deliverable. Shared SlateDrop/Contacts/Calendar/Deliverables embed identically in both.

**Tier gating:** each app lower/upper tier; show locked features visible-but-badged (🔒 Pro),
contextual UpgradeSheet naming the exact capability + price; never hide the Twin tab or Pro features.

**App-shell ecosystem polish:** the existing Slate360 / Site Walk / Twin shells look rough and are
slated for a redo to this grammar (one shell, accent-only difference). Mobile shells = capture-first
stack + bottom tabs/FAB; desktop = upload/author multi-pane + ⌘K.

**Build order (consensus):** 1) `AppShell` + `AppSwitcher` (accent-binding) + ⌘K. 2) SlateDrop
three-pane explorer (+ mobile stack). 3) Unified secure-link create + manager. 4) Site Walk desktop
upload-assembled walks. 5) Twin desktop upload + job monitor + splat. 6) Permission presets → link
minting. 7) Tier callouts. Plus the persistence wiring above.

See [[slate360-project-layer-rebuild-plan]], [[slate360-twin-data-pipeline]],
docs/design/PROJECT_LAYER_AND_WALK_START.md, docs/TWIN360_CAPTURE_GAPS.md.
