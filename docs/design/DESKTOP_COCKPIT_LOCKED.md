# Desktop cockpit + dashboard overhaul — LOCKED decisions (2026-06-30)

Decided summary from a 9+ AI panel + repo audit. Detailed reference:
[`DESKTOP_DASHBOARD_FULL_SCOPE.md`](./DESKTOP_DASHBOARD_FULL_SCOPE.md),
[`DASHBOARD_PLANNING_AND_GAP_ANALYSIS.md`](./DASHBOARD_PLANNING_AND_GAP_ANALYSIS.md). Current dashboard is a
5-widget launcher (continue + counts + recents) — **~2–5% of target**, confirmed. Subsystems (`DesktopSplatEditor`,
`SplatViewer`, `TwinMeasureTool`, `DesktopSlateDropBrowser`, `CustomizableWidgetBoard`, notifications table) exist
but scattered. **Phone = capture; desktop = the operations cockpit** (upload, organize, edit, measure, author,
coordinate, publish, bill).

## Dashboard IA — operational, NOT vanity KPIs
Home answers "what needs my attention right now?" Keep the shell (left rail from `resolveDashboardNav`, top bar +
app-switcher + ⌘K + account) and `CustomizableWidgetBoard`; **replace the recents-only widgets** with:
1. **Needs attention** — Coordination Hub inbox: unresolved client comments, uploads to triage, mentions, share
   responses, reminders due today. (The reason to open the app.)
2. **Deliverables in flight** — drafts / shared-awaiting-response / viewed, with resend.
3. **Processing jobs** — twin reconstructions running/failed (`digital_twin_processing_jobs`) + retry.
4. **Active projects** — status, last activity, open-item count.
5. **Recent captures** — walks/twins/photos (demoted from hero).
6. **Calendar / milestones due** — next 7 days.
7. **Storage + credits** — R2 usage + twin credits + tier.
**No** vanity KPIs (totals, "productivity score", empty charts, counters).

## Navigation: workspaces, not tabs
Left rail = full-viewport **workspaces** (one active at a time), ⌘K to jump. Heavy workspaces use **dockable panels**
(dockview). Workspaces: Dashboard · Projects & Files · Twin Editor · Deliverable Studio · Coordination Hub ·
SlateDrop · Contacts · Calendar · Settings/Billing. Graphite Glass, blue desktop accent `--desktop-accent #3D8EFF`
(Site Walk green only inside the Site Walk workspace), IBM Plex Mono labels, no amber/gold.

## The 4 core workspaces
- **Projects & Files (Finder-class)** — 3-pane (folder tree · sortable grid · preview+metadata+shares+activity),
  multi-select, drag-to-move, breadcrumb, upload/new-folder/share-folder/request-upload, auto-routing surfacing.
  Build on `DesktopSlateDropBrowser` + TanStack Table.
- **Twin Editor** — dockview panels: splat viewport (crop/bbox, section-cut via generalized `createSweepEdit` clip
  planes, floater removal, annotations extending `TwinEditList`) + 2D plan editor (Konva, from RoomPlan JSON) +
  layers/edit-list panel. Offload heavy destructive crops to SuperSplat.
- **Deliverable Authoring Studio** — tabbed/block builder: pick stops/twins/plans/photos → sections → branding →
  recipient picker (contacts/groups) → publish + per-recipient tokens → live `/view/[token]` preview. Rich text via
  Tiptap; blocks via dnd-kit/BlockNote.
- **Coordination Hub cockpit** — 3-pane inbox (Supabase Realtime), messaging (email/SMS + recipient picker),
  folder-share manager (grants + audit), calendar authoring (FullCalendar). Wires to the Coordination Hub P0 backend
  (see [[slate360-coordination-hub-plan]]).

## Phased build (from near-empty)
- **D0** Dashboard IA overhaul: swap widget set (attention/deliverables/jobs/projects/captures/calendar/storage),
  reuse `CustomizableWidgetBoard`, wire "Needs attention" → notifications/hub inbox. Real routes on sidebar (kill `#`).
- **D1** Coordination Hub cockpit (biggest value gap).
- **D2** Projects & Files (SlateDrop Finder-class).
- **D3** Deliverable Studio.
- **D4** Twin Editor depth (dockview + SuperSplat + annotations + section cuts).
- **D5** 2D plan editor (Konva, RoomPlan JSON — ties to RoomPlan plan).
- **D6** Docking/power UX (layout serialization per user, multi-monitor).

## OSS to adopt
dockview (dockable panels) · SVAR react-filemanager or react-complex-tree (SlateDrop tree; restyle to tokens) ·
SuperSplat (splat editing) · Konva/react-konva (2D plan) · cmdk (⌘K) · TanStack Table+Query (grids/state) · Tiptap/
BlockNote+dnd-kit (deliverable authoring) · FullCalendar (calendar). Avoid: full BIM desktop (FreeCAD), Chonky (deprecated).

## Fastest wins
D0 dashboard widget-set swap (turns launcher → real cockpit) + D1 Coordination Hub. Then the twin editor
(differentiator) and deliverable studio (revenue loop).
