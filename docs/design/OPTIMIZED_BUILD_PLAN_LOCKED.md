# Optimized Build Plan — LOCKED (2026-07-01, ~10-platform consensus)

Near-unanimous multi-AI convergence on the remaining high-value work. Contractor-first
rule: one obvious primary action per screen, every row opens something real, near-zero
training. Canonical loop: **Project → Capture → Review → Deliver → Inbox**.

## P0 ordering (consensus)
1. **Report builder** — DONE (first slice): killed the SLOP mock, routed to the real flow.
   NEXT: enrich the real editor (below).
2. **Dashboard** — squarish hero + widget registry.
3. **Contacts detail sheet** — fix the `?contact=` dead-end.
4. **3D-tiles surrounding context**.
5. **Twin cinematic MP4 export** (Trigger.dev).
6. **Cross-company collaboration**.
7. **Onboarding wizard** + white-label free hex + unify duplicates.

---

## 1. Site Walk report/deliverable builder — REUSE, don't rebuild
**KEY INSIGHT (unanimous):** do NOT build a new PDF engine. The real editor already exists:
`components/site-walk/reports/DeliverableEditorClient.tsx` (block editor over
`site_walk_deliverables.content` = ViewerItem[], PATCH persistence) mounted at
`/projects/[id]/deliverables/[deliverableId]/edit`; `/view/[token]` + `lib/site-walk/pdf`
+ BrandOverlay all work. The SLOP `ReportBuilderClient` was a parallel fake — **deleted**
(commit ee7bafbd), `/site-walk/reports/new` now redirects to the real deliverables flow.

**Enrichment TODO** (on the real `DeliverableEditorClient`):
- "Create report from walk" CTA on the walk summary (`/site-walk/walks/[sessionId]`) →
  create deliverable from session (`/api/site-walk/sessions/[id]/quick-deliverable`) →
  drop into the real editor pre-populated from the walk's photos/notes/plan/pins/weather.
- Templates that seed block order: Daily Field Report · Inspection · Progress · Punch List
  (3–4 presets, not 22 types).
- One-tap "Include all photos from this walk"; live client preview (owner `/view`); recipient
  picker (contacts); "Add twin to deliverable" block (`model_3d` embed of `/share/twin/[token]`).
- PDF stays the existing pipeline (Trigger.dev job → pdf-lib → R2 → SlateDrop Deliverables folder).
- Merge `/site-walk/reports` signpost into Deliverables (redirect or make it a real reports list).

## 2. Dashboard — squarish hero + widget registry (see DASHBOARD_VISION.md)
- **Hero:** squarish (~6×2 of 12-col), background = real snapshot resolved by
  `load-dashboard-home-data` (populate the never-set `imageUrl`: latest twin preview →
  360 still → first walk photo → gradient fallback). Overlay project name/status/last-
  activity/counts; tap → `/projects/[id]`. **"Make primary"** control → `projects.is_featured`
  (unique per org): `alter table projects add column is_featured boolean default false;
  create unique index on projects(org_id) where is_featured and deleted_at is null;`
- **Widget registry** (`lib/dashboard/widgetRegistry.ts`): FeaturedHero · NeedsAttention
  (inbox counts) · InFlight (twins processing + deliverables sent) · Usage (credits/storage
  + **Buy more tokens** → Stripe) · Pdf (compose report) · Map (Google 3D-tiles directions).
  Expandable/collapsible sections, fixed sensible order v1 (no drag-grid), per-user layout
  persisted. New widgets slot in without redesign.

## 3. Cross-company collaboration (additive schema)
- `project_collaborators` (project_id, org_id invited, invited_by_org, role, status) — invite
  an external org to one project, scoped by role; accept flow.
- Org structural level: `org_members.role` ('owner'|'leader'|'member') + `reports_to`; RLS lets
  a `leader` read all org projects (leadership visibility).
- `cross_org_folder_shares` (folder_id, host_org, guest_org, scope view|upload|view+comment) —
  SlateDrop-to-SlateDrop. All enforced **server-side via RLS**, never client-trusted.
- Clients (no account) stay on tokens: `/view/[token]` (comment/approve), `/upload/[token]`,
  `/share/twin/[token]`. No DM tab until `message_threads` exist — Activity feed is honest v1.

## 4. 3D-tiles surrounding context (Google primary, Cesium EEA fallback)
- **Tiles:** Google Photorealistic 3D Tiles (Map Tiles API — the one allowed paid API; GA;
  billed only per root tileset query, 10k/day free, renderer requests unlimited within 3hr
  session token). **EEA fallback: Cesium ion** (Google Tiles 403 in EEA). Renderer:
  `3d-tiles-renderer` (3DTilesRendererJS, OSS, OGC-standard, fits the existing three.js/Spark stack).
- **Georef (deterministic):** capture-side store GPS lat/lng/alt + ARKit `gravityAndHeading`
  (+X=north); worker computes `T_arkit→ecef` (ENU→ECEF at capture lat/lng) and bakes it into
  the manifest. The `digital_twin_models.georef` JSON column **already exists** (unused) — use it.
  Viewer applies the transform to place the splat at its real location under the tiles.
- **Pitfalls:** phone GPS ~5m error → provide a manual nudge gizmo (persist `T_manual_offset`);
  altitude datum mismatch → vertical offset control; Google attribution mandatory; meter tile
  usage; gate behind **exterior + GPS present** (don't load tiles for interiors).
- **UX:** separate **"Site Context" tab** in the twin viewer (Option A — don't merge Spark +
  Cesium renderers v1). Submit card becomes real: radius presets (Off / Near ~120m +credits /
  Block ~250m) — NEVER inert, never "Soon". Copy: "context is for orientation only, not survey-grade."
- **Phases:** T1 persist GPS (hide card if absent) → T2 worker georef in manifest → T3 viewer
  tiles + splat transform (desktop first) → T4 submit radius + credit → T5 deliverable embed.

## 5. Quick fixes (P1–P2)
- **Contacts** `?contact=` → `ContactDetailSheet` (name/company/role/phones/emails + add/edit +
  "Send to" + "Share folder") wired to the recipient picker.
- **Unify SlateDrop pickers**: one component, `data-app` for accent; `/site-walk/slatedrop`
  becomes a themed instance of `/slatedrop` (kill the raw-Tailwind duplicate).
- **Capture V1/V2**: V2 canonical; redirect/hide V1 + `capture-v2/flow` (or persist + de-mock).
- **Onboarding wizard**: 3–4 steps (create project → invite → first capture → send), skippable,
  `users.onboarding_completed_at`; every step does something real.
- **White-label**: free hex accent + custom domain (tier-gated) — beyond the 3 presets.
- **Twin MP4 export**: Trigger.dev job (headless three.js render → ffmpeg → R2) — the before/after social MP4.
- **Token/color sweep**: assigned-work status colors, `#6EA7A0` in capture-flow → tokens.

Related: DASHBOARD_VISION.md, SCREEN_BLUEPRINT.md, COORDINATION_AND_PORTFOLIO_REBUILD_LOCKED.md.
