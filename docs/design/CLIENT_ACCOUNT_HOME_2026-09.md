# Client-account home — locked decisions

Status: **Slice 1 shipped 2026-09-15** (hero carousel + routing). Companion to
[DASHBOARD_PORTAL_AUDIT_2026-09.md](./DASHBOARD_PORTAL_AUDIT_2026-09.md) and
[DASHBOARD_PORTAL_DESIGN_ALIGNMENT.md](./DASHBOARD_PORTAL_DESIGN_ALIGNMENT.md).

## What this is (and isn't)

This is the home an authenticated **client login** lands on — a real account with credentials,
listing every project that org can access. It is **not** the token-link `/portal/[token]` viewer
(that's a separate, already-locked surface owned by `feature/aob205-ux-polish-v3` — see
`docs/ops/SPATIAL_EXPERIENCE_V3_UX_HANDOFF.md`). The two will likely converge later (a client
project card here could deep-link into the same `/portal/[token]` viewer per project), but that's
a follow-up decision, not assumed here.

## Decisions locked 2026-09-15 (Brian)

1. **Route split:** new dedicated route (`/client-home`), not a branch inside the shared `/projects`
   page Brian's own team uses. `portalHomeHref()` (`lib/spatial-walkthrough/client-surface.ts`) now
   points spatial-only clients here instead of `/projects`; `/projects` itself redirects them here
   too as a safety net for bookmarks/direct nav.
2. **Layout:** most recent project renders as a large hero (real capture imagery as background —
   360 photo, plan-with-pins, or exterior render, whichever the project has), remaining projects
   scroll in a row below. Slice 1 reuses the existing hero-image resolution
   (`lib/dashboard/resolve-project-thumbs.ts`, already used by the CEO dashboard's Featured Project
   widget) rather than inventing new capture-media selection logic — good enough for a real photo
   background today; picking specifically between "360 photo vs. plan-with-pins vs. 3D exterior"
   per project is a future refinement, not required for this to look real.
3. **No Twin 360 / Site Walk anywhere in this surface.** Both are pre-App-Store native products.
   `lib/spatial-walkthrough/client-surface.ts` already enforces this at the nav/tab/command-palette
   level for any org flagged spatial-walkthrough-only — verified live (not just read) in
   `app/preview/client-home` before shipping. Copy in `ClientHomeContent` is deliberately
   product-agnostic ("project", not any app name).
4. **Multiple scans per project, varied deliverable types** — already true in the data model
   (`site_walk_sessions`/`digital_twin_spaces` keyed by `project_id`; the portal's own History tab
   already lists multiple capture visits). No schema change needed for this slice; the per-project
   detail view (`/projects/[projectId]`) is where scan-level variety actually needs richer surfacing
   — not addressed in slice 1, which is the top-level project list only.

## Explicitly out of scope for slice 1 (real, tracked gaps)

- **Folder customization + templates.** No code exists anywhere in `lib/slatedrop/**` for
  per-project folder customization or saving a folder structure as a reusable template — SlateDrop
  folders are fixed at provisioning time today. This needs a small additive migration (a
  `folder_templates` table or a JSON structure column) plus a settings UI. Draft the migration for
  Brian to apply; do not build the UI without that decision made first.
- **Document dual-access polish.** Pinning a document to a model location already works
  (`SpatialReferencesIndex`, locator capture in `lib/spatial-walkthrough/project-items.ts`) and a
  flat document list already exists in the portal's Documents tab, but per the audit doc it's
  missing revision/date fields and has a blank-empty-state bug. Fix those before calling "dual
  access" done — the pattern already exists, it just needs finishing, not reinventing.
- **CEO's own tools dashboard** (crop/pin-to-plan/tour-build production console) — a separate,
  larger rebuild Brian asked for in the same conversation. Not started; needs its own design pass
  before building, per [[slate360-dashboard-overhaul-not-incremental]] (ground-up, not a reskin).

## Verification note

Slice 1 was verified against a real render in the browser (`app/preview/client-home`, screenshot
taken 2026-09-15), not just by reading the gating code — confirmed the sidebar genuinely renders
with zero Twin/Site Walk/Thermal/Labs entries under client-level flags, not assumed from
`client-surface.ts` alone.
