# Client project page ("the package") — design + published-chapter contract

Status: **DRAFT — needs Brian's yes on §4 before code.** Written 2026-09-15 on
`feature/dashboard-portal-alignment-2026-09`. Follows [CLIENT_ACCOUNT_HOME_2026-09.md](./CLIENT_ACCOUNT_HOME_2026-09.md)
(the login landing); coordinates with the desktop track's
`docs/ops/DESKTOP_SPLAT_MAP_SESSION_2026-09-15.md` §7.8 (package publisher) and §9 (one viewer).

## 1. The business flow this serves (locked by Brian, 2026-09-15)

Negotiate deliverables + scan frequency → Brian creates the contractor's login → Brian scans,
processes (Slate360 Splat / Map / tours / walkthrough), uploads → the contractor signs in, opens
the project, opens the scan, and sees exactly what was agreed. **No guest tokens.** Contractor
self-scan and the Twin 360 / Site Walk apps are a later phase and never appear here.

## 2. What the client sees

`/client-home` (built) → **project page** (this doc) → **scan** → **chapters**.

```
Project: Oak Ridge Roof Inspection                      [client logo]  ·  small Slate360 mark
────────────────────────────────────────────────────────────────────────────────
Scans          Sep 15, 2026 (latest)   Sep 1, 2026   Aug 17, 2026        [dates are the nav]
────────────────────────────────────────────────────────────────────────────────
Sep 15 — Chapters (only what was published for this scan)
  [ Walkthrough ]   [ 360 Tour on plans ]   [ 3D model ]   [ Drone map ]      ← cards, 16:9 posters
Documents (this project)                                     Questions (2 open)
  Drawings / Reports / Invoices …  flat, foldered, dated       "Ask a question" — never "RFI"
```

Rules (all already locked elsewhere, restated so nobody re-decides them):
- A chapter card exists **only if published** for that scan. No empty tiles, no "coming soon,"
  no processing states, no product names (Twin 360, Site Walk, Splat, Map are internal).
- Posters are rectilinear 16:9 project imagery — never a flattened equirect, never a nadir/pole shot.
- Opening a chapter goes to **one calm viewer** that switches by asset type (desktop handoff §9).
  Chapter cards link to authenticated routes; any existing token viewer is wrapped, not exposed.
- Documents are reachable two ways: pinned in a chapter *and* in the flat foldered list here.
  Folders start from SlateDrop's defaults (`01_Project_Info/Drawings`, …); customization/templates
  is a separate later slice.
- Mobile: dates row scrolls horizontally; chapter cards stack; documents/questions become bottom
  sheets; 48–72 px targets. Verified at 375 and 768 px before "done."
- Branding: client logo dominant + small "Powered by Slate360" when the client has a logo; else
  Slate360 used professionally (`lib/spatial-experience/brand.ts` rules).

## 3. Published-chapter contract (the piece both tracks write/read)

The desktop track's package publisher produces chapters; this page reads them. Additive
migration, drafted for Brian to apply — never edits an existing migration.

```
project_chapters
  id               uuid pk
  org_id           uuid  (the client org)
  project_id       uuid  → projects
  scan_id          uuid  → the visit/capture this belongs to (site_walk_sessions /
                          spatial_walkthroughs / digital_twin_spaces id; see note)
  scan_date        date  (denormalized for the dates row)
  kind             text  check in ('walkthrough','tour','splat','mesh','ortho','lidar',
                          'video','photos','report')
  title            text  (client-facing, product-agnostic: "Walkthrough", "360 Tour on plans")
  poster_key       text  (R2 key, 16:9)
  viewer_ref       jsonb (what the one-viewer needs to open it: e.g. {walkthroughId} |
                          {tourSlug} | {modelId} | {fileId})
  sort_order       int
  published_at     timestamptz null   ← null = not visible to the client
  published_by     uuid
  created_at / updated_at
```

Notes:
- `scan_id` is deliberately generic in slice 1 (a uuid + `scan_kind` discriminator is acceptable)
  because scans are stored in three tables today. Unifying "scan/visit" is a bigger refactor; do
  not block the package page on it.
- `published_at IS NULL` is the only gate. Nothing else on the page decides visibility.
- Gating for the client login reuses the org scoping every other dashboard query uses
  (`org_id` from `resolveServerOrgContext`), not a new permission model.

## 4. Decisions needed from Brian

1. **Reuse the locked portal IA's content model** (Overview / Reality / Plan / History / Documents /
   Items → here: scans-as-dates, chapters, documents, questions) but **rebuild the presentation**
   on the light tokens inside the authenticated project page — rather than a third, separate
   project page. Yes/no?
2. **Chapter kinds** above — anything missing that you'd sell (e.g. "cut/fill", "thermal report"
   stays CEO-only per policy)?
3. **Who owns the owner/tools home:** dashboard chat builds the light console shell; desktop chat's
   Splat/Map/Tours are the tools it launches. Yes/no?
4. **Downstream reshare** (contractor → their client/stakeholders) under login-only: defer, or
   plan for contractor-created sub-logins now? Recommendation: defer; design the chapter page so
   a share feature can be added without changing the contract.

## 5. Build order once §4 is answered

1. Migration draft `project_chapters` (Brian applies via Management API).
2. Loader `lib/dashboard/load-client-project.ts` (scans grouped by date, chapters, documents,
   open questions) — org-scoped, published-only.
3. Page `app/(dashboard)/projects/[projectId]` — branch: spatial-only client → new
   `ClientProjectPackage` component; staff → existing internal tabs untouched.
4. Preview harness `/preview/client-project` with populated + sparse fixtures (states A–E), desktop
   and mobile screenshots.
5. Chapter → viewer wrapper routes (authenticated), one per kind, wrapping existing viewers.
6. Gates, push, PR update.
