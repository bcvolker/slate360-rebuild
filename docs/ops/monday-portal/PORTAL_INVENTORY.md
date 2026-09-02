# Monday client portal — capability inventory

Read the repo and branches on 2026-09-01/02. Base for `feature/monday-client-portal-v1`
is `feature/spatial-walkthrough-rc2` @ `44934788` (verified equal to `origin`).
`git merge-base --is-ancestor` confirms RC2 already contains
`spatial-privacy-publish`, `spatial-branding-polish`, `spatial-portal-ux`,
`spatial-walkthrough-editor`, `spatial-navigation-hud`, `spatial-chapters`.
It does **not** contain `spatial-project-items` or `spatial-temporal-compare` —
those are genuinely parallel side branches and are ported in this branch.

| Capability | Status | Branch(es) | Files | Data model | Safe to reuse | Monday priority |
|---|---|---|---|---|---|---|
| Walkthrough core (walk/clip/waypoint/pin) | EXISTS | rc2 (base) | `supabase/migrations/20260829180000_spatial_walkthrough.sql` | `spatial_walkthroughs`, `spatial_clips`, `spatial_waypoints`, `spatial_pins`, `spatial_pin_attachments` | Yes | P0 (link target) |
| Share tokens (hash, password, expiry, revoke, view count) | EXISTS | rc2 (base) | `lib/spatial-walkthrough/share-*.ts`, `app/api/spatial-walkthrough/[id]/share/*`, `app/api/spatial-walkthrough/public/[token]/*` | `spatial_share_tokens` (token_hash unique, password_hash, expires_at, max_views, is_revoked, branding_snapshot) | Yes, already production-grade | P0 (this is the security backbone) |
| Rate limiting on unlock + public resolver | EXISTS | rc2 (base) | `lib/server/rate-limit.ts`, unlock route (8/60s), public route (30/60s) | — | Yes | P0 |
| Redaction / operator-patch | EXISTS | rc2 (base) | `lib/spatial-walkthrough/redaction*.ts`, `operator-patch.ts` | `spatial_redactions` | Yes | reuse as-is |
| Branding (org theme, logo, colors, powered-by) | EXISTS | rc2 (base) | `lib/spatial-walkthrough/theme.ts`, `components/spatial-walkthrough/studio/BrandThemeForm.tsx`, `BrandThemePreview.tsx`, `app/(dashboard)/spatial-walkthrough/branding/page.tsx`, `app/api/spatial-walkthrough/theme/*` | `spatial_org_themes` (org-level; walkthrough + snapshot layering already coded in `theme.ts`) | Yes | P0 — this **is** Phase 6, just needs a portal-facing normalized contract on top |
| Chapters | EXISTS | rc2 (base) | `lib/spatial-walkthrough/chapters.ts`, `[id]/chapters/route.ts` | `spatial_chapters` | Yes | reuse |
| Clip edges / authoring keyframes | EXISTS | rc2 (base) | `[id]/edges/route.ts`, authoring migration | `spatial_clip_edges` | Yes | reuse |
| Public share player | EXISTS | rc2 (base) | `app/w/[token]/page.tsx`, `components/spatial-walkthrough/share/WalkthroughShareClient.tsx` | — | Yes, this is the OTHER engineer's surface — do not edit rendering | integration point only |
| Project creator page (card-list) | PARTIAL | main/rc2 | `components/projects/ProjectDetailShell.tsx`, `ProjectOverviewTab.tsx`, `SpatialProjectOverview.tsx`, `lib/projects/load-project-overview-data.ts` | reads `projects`, counts, `latestWalkthrough` | Yes — data loader reusable, presentation is a text card list, not hero-first | P0 — replace presentation, keep loader contract |
| Client portal (visual, hero-first) | MISSING | none | `components/studio-ui/SpatialPortalHome.tsx` is a **mobile nav section**, not a client portal; `app/preview/spatial-portal/` is an internal creator preview harness, not client-facing | — | build new | P0 |
| Spatial project items (observation/question/issue/punch) + locators + comments + activity + documents | EXISTS (unmerged) | `feature/spatial-project-items` @ `d75a7b81` | `supabase/migrations/20260830200000_spatial_project_items.sql`, `app/api/spatial-walkthrough/project-items/**`, `app/api/spatial-walkthrough/public/[token]/items/**`, `app/(dashboard)/projects/[projectId]/items/page.tsx` | `spatial_project_items`, `spatial_project_item_locators`, `spatial_project_documents`, `spatial_project_item_comments`, `spatial_project_item_activity`, `spatial_project_item_files`; `spatial_pins.project_item_id` FK | Yes, additive, RLS'd, exactly matches the SpatialItem/Locator/Thread model this brief asked for | P0 — port into this branch, do not redesign |
| Temporal compare | EXISTS (unmerged) | `feature/spatial-temporal-compare` @ `820333c1` | `supabase/migrations/20260830140000_spatial_compare_anchors.sql`, `app/api/spatial-walkthrough/compare/**`, `app/preview/spatial-compare/` | `spatial_compare_anchors`, `spatial_compare_issue_refs` | Yes | P2 — port schema now, wire portal card behind readiness gate, no UI required Monday |
| Audio narration | PARTIAL | `feature/spatial-walkthrough-audio` @ `e6855f3c` | migration not in rc2 | `spatial_audio_assets` (kind check already extended by items migration to include `item_comment`) | Yes if needed later | P2, not required Monday |
| Documents (generic project file view) | PARTIAL | project-items branch gives spatial-scoped table; `lib/slatedrop/**` gives the real file system | `spatial_project_documents` references `slatedrop_uploads` | Yes | P1 |
| Org/project roles | EXISTS | main | `organization_members`, `org_member_app_access`, `org_members_permissions` migrations, `project_collaborator_invites` | — | Yes | reuse, do not touch billing/entitlements |
| Email invite infra | EXISTS | main | `lib/email/**` (SendGrid, verified in earlier sessions), `invitation_tokens` migration, `project_collaborator_invites` | `invitation_tokens` | Yes | P1 |
| Twin viewer / Spark / GLB | EXISTS | fidelity branch (parallel engineer) | — | — | **DO NOT TOUCH** | out of scope |

## What this branch ports in (additive only, not applied to prod)

1. `supabase/migrations/20260830200000_spatial_project_items.sql` — copied verbatim from
   `feature/spatial-project-items` (git show), re-dated to sort after RC2's latest
   (`20260830120000_spatial_authoring_keyframes.sql`) so it applies cleanly on top.
2. `supabase/migrations/20260830140000_spatial_compare_anchors.sql` — copied verbatim from
   `feature/spatial-temporal-compare`.
3. Their matching `lib/spatial-walkthrough/*` and `app/api/spatial-walkthrough/project-items/**`
   / `compare/**` route handlers, copied as-is (server logic, not rendering).

Neither migration has been applied to any database. Brian applies via the Supabase
Management API per the standing convention.

## What is net-new in this branch

- Hero-first `/projects/:id` creator page (Phase 4).
- Hero-first client portal at `/portal/:token` keyed off a **project-level** share
  (new `spatial_project_shares` table, additive, modeled directly on the proven
  `spatial_share_tokens` pattern) rather than a single-walkthrough token, so the
  portal can show capture history across many deliverables (Phase 2/5).
- `BrandProfile` viewer-facing normalizer (Phase 6) that wraps the existing
  `theme.ts` layering so the renderer never sees Supabase shapes.
- `SECURITY_MODEL.md`, `VIEWER_PORTAL_CONTRACT.md` (this doc's siblings).
