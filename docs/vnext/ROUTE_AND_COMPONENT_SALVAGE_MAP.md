# Slate360 Phase 1 — Route and Component Salvage Map

**Slice:** 0 (forensic audit only)  
**Worktree:** `C:\s360-ui-vnext`  
**Branch:** `feature/ui-vnext-phase1`  
**Baseline:** `origin/main` @ `a7b1c66c0871c4e41adb89d0d58dab86183a9665`  
**Date:** 2026-09-17  
**Mode:** read-only classification. No routes, UI, APIs, viewers, or reconstruction code were changed.

Canonical documents read (copied into this folder for in-repo precedence):

1. `docs/vnext/SLATE360_UI_PHASE1_MASTER_BUILD_PLAN.md`
2. `docs/vnext/SLATE360_UI_PHASE1_CURSOR_SLICE_PROMPTS.md`
3. `docs/vnext/SLATE360_UI_PHASE1_REVIEW_PROTOCOL.md`

Where this map conflicts with older repo docs, current homepage layout, existing dashboard/navigation, SaaS-era plans, or previous UI branches, **the Phase 1 documents win**.

---

## 1. Repository baseline

| Item | Value |
|---|---|
| GitHub repo | `bcvolker/slate360-rebuild` |
| Implementation worktree | `C:\s360-ui-vnext` (created this slice; did not exist) |
| Implementation branch | `feature/ui-vnext-phase1` (created this slice from `origin/main`; tracks `origin/feature/ui-vnext-phase1`) |
| Baseline SHA | `a7b1c66c0871c4e41adb89d0d58dab86183a9665` |
| Slice 0 audit commit | `0d425cb3b579fe4757a1fc4d4883804fc8fc4090` |
| Baseline tip message | `Add Twin Continue upload and Sign out so a stuck phone scan can retry.` |
| Older UI branch | `origin/feature/ui-phase-1` @ `8466d81c` — **already an ancestor of `main`**. Inspected only. Not adopted. |
| Active reconstruction / spatial tree | `C:\s360` @ `feature/aob205-spatial-experience-v3` (`302917d6`) — **not merged**, inspected as OTHER-BRANCH salvage |
| Dashboard/portal experiment | `C:\s360-dashboard-portal` @ `feature/dashboard-portal-alignment-2026-09` — **not merged** |
| Counts on baseline | 164 `app/**/page.tsx`, 32 `layout.tsx`, 305 `app/api/**/route.ts` |

`feature/ui-vnext-phase1` was created from `origin/main` @ `a7b1c66c` and now tracks `origin/feature/ui-vnext-phase1`. It does **not** contain the 67 spatial-experience commits that exist only on `feature/aob205-spatial-experience-v3`, nor the 55 `main` commits missing from that spatial branch. Those trees have diverged.

---

## 2. Method and confidence

Traced from implementation, not filenames:

- App Router `page.tsx` / `layout.tsx` catalog
- `middleware.ts`, `next.config.ts` redirects/rewrites
- Desktop nav config, mobile launcher, project tab registry
- Org context / project access / entitlements (read-only)
- Loader modules under `lib/projects`, `lib/site-walk`, `lib/digital-twin`, `lib/thermal`, `lib/dashboard`, `lib/mobile`
- Viewer components and camera-path types
- Share-token page families
- Generated `lib/supabase/database.types.ts` (224 public tables)

Findings that could not be proven at runtime (no production click-through in this slice) are marked **NEEDS VERIFICATION**.

---

## 3. Critical product-model mismatch (read this first)

The live codebase is still a **multi-app SaaS platform**. Phase 1 is a **service-operated professional project record**.

| Live implementation | Phase 1 canonical model |
|---|---|
| Tenant = `organizations` (contractor company using apps) | Operator = Slate360; client/org = the party receiving the project record |
| Top-level products: Site Walk, Twin 360, SlateDrop, studios | Top-level: Projects → Visit/Scan → Deliverables → Reality/Geometry/360/Plan/Drone/Thermal |
| Authenticated home = `/dashboard` (desktop) or `/app` launcher (mobile) | Authenticated home = visual project portfolio (client) or attention queue (owner) |
| “Client” ≈ `org_contacts` + `projects.client_name` | Client / Organization is a primary hierarchy node |
| Sharing is per-app tokens (walk deliverable, twin, thermal, SlateDrop, portal RPC) | Unified project/view/item sharing |
| Billing, seats, entitlements, app upsells are first-class | Subscription/billing/app marketplace deferred |

Do not rebuild the current dashboard, app launcher, or studio nav “a bit cleaner.” Replace the information architecture. Preserve backends, viewers, auth, storage, and share infrastructure.

---

## 4. Route inventory

Auth stack (verified):

1. `middleware.ts` — session refresh, `/ceo` → `/operations-console`, super-admin `app_metadata` gate, **mobile `/dashboard` ↔ desktop `/app` swap**, mobile legacy quarantine, beta-protected login gate, V1 approval gate, Phase-1 module blocklist → `/app`, standalone walled garden, portal CSP
2. Route-group layouts — `(dashboard)`, `(mobile)`, `(apps)`, `site-walk`, `digital-twin` require user + beta approval
3. Page/layout gates — CEO `notFound()` (thermal, some studios), `getScopedProjectForUser`, share-token RPCs

Phase-1 middleware blocklist (authenticated users redirected to `/app`):  
`/tours`, `/design-studio`, `/content-studio`, `/geospatial`, `/virtual-studio`, `/analytics`, `/tour-builder`  
Does **not** catch `/content-studio-workspace`, `/unreal-studio`, `/thermal-studio`, `/app/tours`.

Desktop nav: `components/dashboard-desktop/dashboard-nav-config.ts`  
Mobile launcher: `lib/mobile/mobile-launcher-apps.ts`  
Project tabs: `components/projects/projectDetailTabs.ts`

### 4.1 Authenticated homes / dashboards

| Path | Source | Purpose | Auth | Data | Linked | Status | Salvage |
|---|---|---|---|---|---|---|---|
| `/dashboard` | `app/(dashboard)/dashboard/page.tsx` | Desktop home. **Customizable widget board** + metric chips + library tabs | Session + beta; mobile → `/app` | `loadDashboardHomeData` | Desktop sidebar | Functional; **forbidden widget-board pattern** | **REBUILD FRONT END** (owner Home). Loader: KEEP BACKEND |
| `/app` | `app/(mobile)/app/page.tsx` | Mobile **app launcher** (Site Walk / Twin 360 tiles + upsell) | Session + beta; desktop → `/dashboard` | `loadMobileAppHomeData`, entitlements | Mobile bottom nav Home | Functional; **forbidden marketplace** | **REBUILD FRONT END** / **DEFER** as product launcher |
| `(dashboard)/_dashboard-legacy` | `_dashboard-legacy/page.tsx` | Walled-garden `StudioCommandCenter` tiles | Not routable (`_` folder) | — | No | Dead code | **RETIRE AFTER CUTOVER** |
| `(dashboard-v3)/` | layout only | Dark SaaS chrome; **no pages** | — | — | No | Unwired prototype | **RETIRE AFTER CUTOVER** |
| `/collaborator` | `(collaborator)/collaborator` | Collaborator-only project list; upgrade banner → `/plans` | Auth; others → `/dashboard` | Shared projects | Own shell | Narrow functional | **KEEP BACKEND**; FE **REBUILD** if stakeholders become real logins |

### 4.2 Projects / project hub

| Path | Source | Purpose | Auth | Data | Linked | Status | Salvage |
|---|---|---|---|---|---|---|---|
| `/projects` | `(dashboard)/projects/page.tsx` | Project directory (desktop/mobile fork) | Session | Org-scoped projects API | Desktop + mobile nav | Functional; not image-first portfolio | **REBUILD FRONT END**. List API: KEEP BACKEND |
| `/projects/new` | `(mobile)/projects/new/page.tsx` | Create project | `(mobile)` layout | Create API | Mobile flows | Functional | **KEEP BACKEND**; owner create UI later |
| `/projects/[projectId]` | `projects/[projectId]/page.tsx` + `layout.tsx` | Overview in `ProjectDetailShell` | `getScopedProjectForUser` | `loadProjectOverviewData` (counts, recent activity, location) | Project tabs | Functional; count-centric, Site Walk/Twin framing | **REBUILD FRONT END**. Loader: KEEP + HARDEN |
| `.../walks` | walks/page.tsx | Site Walks tab | Scoped | `loadProjectWalksTabData` | Tab registry | Functional | **DEFER / HIDE** as a product tab. Session list: KEEP BACKEND (maps to History/visits) |
| `.../plans` | plans/page.tsx | Plans tab | Scoped | `loadProjectPlansTabData` | Tab registry | Functional | KEEP BACKEND; FE becomes Explore representation, not a peer tab |
| `.../twins` | twins/page.tsx | Twins tab | Scoped; hidden in APP_STORE_MODE | `loadProjectTwinsTabData` | Tab registry | Functional | KEEP BACKEND (Reality/Geometry). FE **DEFER** as top-level tab |
| `.../slatedrop` | slatedrop/page.tsx | Files tab | Scoped | SlateDrop APIs | Tab “Files” | Functional canonical file browser | KEEP BACKEND; FE **REBUILD** as Documents |
| `.../deliverables` | deliverables/page.tsx | Deliverables list | Scoped | `loadProjectDeliverablesTabData` | Tab registry | Functional | KEEP BACKEND; FE **REBUILD** into Overview/Explore/share, not a sibling app |
| `.../deliverables/[id]/edit` | edit/page.tsx | Deliverable editor | Auth | Client fetch | From deliverables | Functional | KEEP + HARDEN (owner authoring) |
| `.../team` | team/page.tsx | Collaborators | Role + invite entitlement | `loadProjectTeamTabData` | Tab registry | Functional | KEEP BACKEND; owner-side later. Not client primary nav |
| `.../people` | people/page.tsx | Legacy people UI | Scoped | `loadProjectPeople` | Alias in tab resolver | Legacy; still routable | **RETIRE AFTER CUTOVER** (compat redirect to team) |
| `.../photos` | photos/page.tsx | Photos via SlateDrop Photos folder | Client fetch | SlateDrop folders/files | Legacy alias → files | Legacy | **RETIRE AFTER CUTOVER** |
| `.../punch-list` | punch-list/page.tsx | Punch CRUD | Client | `/api/projects/.../punch-list` | **Not in tab registry** | Direct URL only | **DEFER / HIDE** (PM suite) |

Canonical project tabs today: Overview, Site Walks, Plans, Twins, Files, Deliverables, Team.  
Phase 1 project tabs: **Overview, Explore, Items, Documents, History**. Do not keep the current tab registry as the new IA.

### 4.3 Site Walk (must not be a Phase 1 top-level client product)

| Path | Purpose | Status | Salvage |
|---|---|---|---|
| `/site-walk` | Mobile/desktop Site Walk hub | Primary functional capture product | **DEFER / HIDE** as client product. Hub loaders: KEEP BACKEND |
| `/site-walks` | Desktop walks list | Functional; desktop nav | Same |
| `/site-walk/capture-v2*` | Capture V2 canvas | Primary capture; mobile-exempt | KEEP BACKEND (operator ingest later). FE not Phase 1 client nav |
| `/site-walk/capture` | Older capture | Functional | KEEP BACKEND; prefer V2 |
| `/site-walk/walks`, `/walks/[sessionId]` | Walk list/detail | Functional | KEEP BACKEND (visit records) |
| `/site-walk/items/[id]/compare` | Item compare | Exists | KEEP BACKEND; **NEEDS VERIFICATION** of completeness |
| `/site-walk/progression` | Before/after groups | Client-fetch | KEEP BACKEND for History/Compare |
| `/site-walk/deliverables*` | Owner deliverable CRUD/preview | Functional; **mobile redirects list → `/site-walk`** | KEEP BACKEND |
| `/site-walk/reports*` | Thin glass CTA | Stubby | **REBUILD FRONT END** or fold; **DEFER** as product |
| `/site-walk/slatedrop` | Folder picker | Mobile quarantined | DEFER |
| `/site-walk-v1-preview` | Redirect → `/site-walk` | Redirect-only | RETIRE AFTER CUTOVER |
| `/sw360/**` | Parallel branded Site Walk 360 shell + host rewrite `app.sitewalk360.app` | Parallel product | **DEFER / HIDE** from Slate360 Phase 1. Shared APIs: KEEP BACKEND |

### 4.4 Twin 360 / Twin Studio (must not be a Phase 1 top-level client product)

| Path | Purpose | Status | Salvage |
|---|---|---|---|
| `/digital-twin` | Twin 360 home | Functional; mobile launcher | **DEFER / HIDE** as app. Loaders: KEEP BACKEND |
| `/digital-twins` | Desktop twin list | Functional; APP_STORE_MODE → `/dashboard` | Same |
| `/digital-twin/projects*` | Per-project twins | Functional | KEEP BACKEND |
| `/digital-twin/twins` | Redirect → projects | Redirect | RETIRE AFTER CUTOVER |
| `/digital-twin/twins/[id]` | Authenticated splat/mesh viewer | **Mature** | **KEEP + HARDEN** engine; **REBUILD** shell |
| `/digital-twin/twins/[id]/progression` | Side-by-side / wipe / blend + camera sync | Desktop-capable | **KEEP + HARDEN** |
| `/digital-twin/twins/[id]/cinematic` | Keyframed camera path editor | Desktop entitlement | **KEEP + HARDEN** path model; not a full NLE |
| `/digital-twin/capture|review|submit|upload` | Field/LiDAR ingest | Functional | KEEP BACKEND; operator ingest later |
| `/twin-studio*` | CEO production cockpit | Functional CEO | KEEP BACKEND / KEEP + HARDEN for owner QA. **DEFER** as “Studio” product name |

### 4.5 SlateDrop / files (must not be a top-level client product)

| Path | Purpose | Status | Salvage |
|---|---|---|---|
| `/slatedrop` | Project picker | Functional; nav | **DEFER / HIDE** as app. APIs: KEEP BACKEND |
| `/slatedrop/[...section]` | Action placeholders + drop zone | **Stubbed** (“will be wired”) | REBUILD FRONT END as Documents, or RETIRE unused sections |
| `/projects/.../slatedrop` | Real file browser | Canonical FE | KEEP BACKEND; REBUILD as Documents |

### 4.6 Client portal / public share / viewers / upload

| Path | Purpose | Auth | Status | Salvage |
|---|---|---|---|---|
| `/portal/[token]` | Branded **deliverable_access_tokens** portal | Token RPC `claim_deliverable_view` | **Functional token gate, thin confirmation card — does not open a viewer**. Includes SaaS downgrade → pricing | Token/RPC: **KEEP BACKEND**. FE: **REBUILD FRONT END** |
| `/view/[token]` | Site Walk deliverable interactive viewer | Share token | **Canonical working deliverable viewer** | **KEEP + HARDEN** |
| `/share/deliverable/[token]` | Redirect → `/view/[token]` | — | Redirect | Keep redirect until cutover; then RETIRE alias if unused |
| `/share/[token]` | SlateDrop file share | `slate_drop_links` + optional password | Functional | KEEP + HARDEN |
| `/share/twin/[token]` | Public twin splat/mesh + annotate | Twin share token | **Mature** | **KEEP + HARDEN** |
| `/share/thermal/[token]` | Public thermal report | Thermal token | Mature; intended public thermal surface | KEEP + HARDEN; **DEFER** as client top-level product |
| `/upload/[token]` | External intake | `project_external_links` | Functional | KEEP BACKEND (owner ingest aid) |
| `/tours/view/[slug]` | Public tour PSV | Public slug | Functional for anon; **logged-in users matching `/tours*` bounce to `/app`** | KEEP BACKEND; middleware exception **KEEP + HARDEN** |
| `/external/respond/[token]` | External RFI/submittal response | Token | Expected functional | DEFER (PM). KEEP BACKEND if already used |

### 4.7 Account / billing / settings (SaaS-era)

| Path | Purpose | Status | Salvage |
|---|---|---|---|
| `/more`, `/more/[section]` | Account hub: org/billing/coordination/storage/support | Functional | **REBUILD** Account (no billing for clients). Billing: **DEFER / HIDE** |
| `/more/billing`, `/more/account` | Static `(mobile)` pages vs dynamic `[section]` | **Duplicated path** — static likely wins | NEEDS VERIFICATION which file wins in prod build |
| `/my-account` | Redirect → `/more/account`; mobile quarantine | Redirect | RETIRE AFTER CUTOVER |
| `/settings`, `/settings/account` | Account settings | Functional | KEEP BACKEND; REBUILD FE |
| `/plans` | Stripe checkout | Functional | **DEFER / HIDE** from Phase 1 product. Stripe: KEEP BACKEND, do not surface |
| `/my-work` | Assignments; mobile → `/app?blocked=my-work` | Desktop-only | DEFER |

### 4.8 Owner / CEO / admin / studios (must not become client products)

| Path | Purpose | AuthZ | Status | Salvage |
|---|---|---|---|---|
| `/operations-console` | Ops console | `canAccessOperationsConsole` = **CEO only** (staff flag exists but helper ignores it) | Functional CEO | **REBUILD FRONT END** as owner Home (attention queue, not SaaS widgets/revenue) |
| `/operations-console/[section]`, `/feedback` | After gate, **redirect to `/site-walk`** | CEO | Misleading stubs | RETIRE / replace |
| `/ceo/*` | Middleware → `/operations-console` | — | Redirect | Temporary compatibility |
| `/super-admin` | Minimal console | `app_metadata.is_super_admin` else 403 | Stub | DEFER |
| `/thermal-studio*`, `/thermal-studio-v2*` | Thermal ops | CEO `notFound` | Functional | KEEP + HARDEN viewers/jobs. **DEFER / HIDE** from client nav. Explore Thermal only when published |
| `/unreal-studio` | Design Studio | CEO | Functional | **DEFER / HIDE** |
| `/content-studio-workspace` | Content studio | CEO | Functional | **DEFER / HIDE** (aspect presets salvageable for presentation) |
| `/tours` dashboard | Tour builder | CEO layout **but middleware blocks all auth users including CEO → `/app`** | **Unreachable when logged in** | KEEP BACKEND; **DEFER** product; middleware is a live bug for CEO |
| `/app/tours` | Mobile tour import | CEO | Mobile OK | DEFER |
| `/content-studio`, `/design-studio`, `/tour-builder`, `/geospatial`, `/virtual-studio` | Older `(apps)` shells / ComingSoon | Middleware blocked | Unreachable / stub | DEFER / RETIRE aliases |
| `/integrations` | “In Development” | CEO `notFound` else | Stub | DEFER |
| `/analytics` | Redirect → `/site-walk` (also Phase-1 blocked) | — | Misleading | RETIRE |

### 4.9 Marketing / auth / preview / diag

| Path | Status | Salvage |
|---|---|---|
| `/` | Marketing homepage; Capacitor UA → `/app` | Out of Phase 1 authenticated rebuild; do not restyle this slice |
| `/product/:slug*`, `/apps/:slug*` | Pages exist under `(public)` but **`next.config.ts` redirects them to `/`** | Testing-misleading. RETIRE pages or remove redirects in a later slice — **do not change now** |
| `/login` `/signup` `/forgot-password` `/reset-password` | Functional; authed login → `/app` then desktop may bounce to `/dashboard` | KEEP + HARDEN (double hop) |
| `/pending-verification`, `/beta-pending` | Approval waiting room | KEEP BACKEND |
| `/preview/*` (27) | Unauthenticated harnesses | Keep for internal build; **DEFER / HIDE** from product nav. Slice 1 may add vNext harnesses here |
| `/dev/*`, `/deploy-check/*`, `/m/diag`, `/~offline` | Diag / PWA | DEFER / HIDE |

Complete `page.tsx` path list: 164 files (catalogued). Significant surfaces are tabled above; remaining preview/dev/SW360/act-route pages are classified in groups rather than 164 identical 12-column rows.

---

## 5. Navigation inventory

Do **not** treat any existing nav as the Phase 1 standard.

| System | Path | Active? | Notes |
|---|---|---|---|
| Desktop sidebar | `dashboard-nav-config.ts` + `DashboardDesktopSidebar` | **Yes** | App-centric: Dashboard, Projects, Site Walks, Twin 360, Twin Studio, SlateDrop, Thermal×2, Tours, Design, Content, Ops, Team, **Billing**, My Account |
| Desktop top AppSwitcher | `AppSwitcher.tsx` | **Yes** | Home / Site Walk / Twin 360 |
| Command palette | `CommandPalette.tsx` | **Yes** | Parallel, incomplete vs sidebar |
| Mobile bottom nav | `mobile-system/MobileBottomNav` + `mainMobileTabs` | **Yes** | Home `/app`, Projects, SlateDrop, **Activity**, Account |
| Mobile app launcher | `mobile-launcher-apps.ts` | **Yes** | Entitlement tiles + upsell sheet |
| Project tabs | `projectDetailTabs.ts` | **Yes** | Walks/Plans/Twins/Files — not Overview/Explore/Items/Documents/History |
| SW360 bottom nav | `SW360BottomNav` | Yes (parallel product) | Separate IA |
| Collaborator nav | `CollaboratorShell` | Yes | Includes `/plans` upgrade |
| External portal header | `ExternalPortalShell` | Yes | Branding chrome, not app IA |
| Marketing header | `MarketingHeader` | Yes | Public |
| DashboardV3 sidebar | `DashboardV3Sidebar` | **No** | Most hrefs `#`; dark teal SaaS |
| shared `MobileBottomNav` / `MobileTopBar` / `QuickNav` / `MobileNavSheet` / `MobileModuleBar` / `DashboardTabShell` | `components/shared/*` | **Orphan** (no importers found) | Conflicting Home=`/dashboard`, “Command Center” |
| `SiteWalkBottomNav` | unused | Orphan | Header still used |
| `CoordinationHubShell` | no app imports found | Likely orphan | Inbox uses standalone client |
| Studio workspace tabs | `StudioWorkspaceShell` | Yes inside CEO studios | Not platform IA |

Conflicts:

- Two homes: `/app` vs `/dashboard`
- Site Walk: `/site-walk` vs `/site-walks`
- Twin: `/digital-twin` vs `/digital-twins` vs `/twin-studio`
- Design: `/unreal-studio` vs blocked `/design-studio`
- Tours: sidebar `/tours` **unusable** (middleware) vs `/app/tours`
- Coordination vs Activity vs Inbox
- Account: `/more`, `/more/account`, `/my-account`, `/settings`
- Desktop Billing/Thermal/Studios absent from mobile bottom nav
- Command palette omits several sidebar destinations

Phase 1 target (not implemented):

- Client: **Projects, Account** (optional later: Shared with me)
- Owner: **Home, Clients, Projects, Processing, QA & Publish, Shares** + quiet Settings/Account
- Project: **Overview, Explore, Items, Documents, History**

---

## 6. Shell and layout inventory

Live nesting (simplified):

```
app/layout.tsx
├── (dashboard)/layout → desktop DashboardDesktopShell | mobile StudioAppShell
│     └── projects/[id]/layout → ProjectDetailShell
│     └── studio layouts (twin/thermal/tours/unreal/content)
├── (mobile)/layout → MobilePlatformShell | desktop DashboardDesktopShellGate
├── site-walk/layout → StudioAppShell → SiteWalkShell → MobileAppShell
├── digital-twin/layout → StudioAppShell → DigitalTwinShell
├── (apps)/layout → StudioAuthedShell
├── (collaborator) → CollaboratorShell
├── sw360/(shell) → SW360Header + bottom nav
├── (public) → PublicSiteChrome
└── token routes → ExternalPortalShell
```

| Shell | Active | Phase 1 fate |
|---|---|---|
| `DashboardDesktopShell` | Yes | **REBUILD** (dark/glass Graphite dashboard). Do not restyle in place as the new product |
| `StudioAppShell` / `MobilePlatformShell` / `MobileAppShell` | Yes | **REBUILD** client/owner shells. Capture full-bleed may remain internally |
| `ProjectDetailShell` | Yes | **REBUILD** (wrong tabs) |
| `DashboardV3Shell` | Unwired | RETIRE |
| Walled garden / `StudioCommandCenter` | Dead `_` folder | RETIRE |
| `AuthGlassShell` | Yes | REBUILD (glass) when login is touched; not Slice 1-critical if login stays |
| `ExternalPortalShell` | Yes | REBUILD chrome; keep token-state pages pattern |
| `TwinViewerCanvasShell` / share annotate shells | Yes | KEEP + HARDEN immersive canvas (dark OK) |
| `CaptureV2Shell` / `LiveWalkShell` | Yes | DEFER as client product; KEEP for operator capture later |
| `StudioWorkspaceShell` | Yes CEO | DEFER / HIDE |
| SW360 shell | Yes | DEFER / HIDE |
| `(dashboard-v3)` layout | Empty | RETIRE |

Styling that must not carry into Phase 1 portal/dashboard chrome: glassmorphism (`bg-white/[0.04]`, `backdrop-blur`), dark `#0B0F15` shells, teal `#00E699` as product accent, decorative icon tiles, widget boards, nested glass cards, upgrade pills.

Dark immersive canvases **are** allowed inside Reality / Geometry / 360 / thermal viewers.

---

## 7. Data model summary

### 7.1 Actual spine (baseline)

```
auth.users → profiles
           → organization_members → organizations
                                      ├─ org_contacts          ← CRM “client” (not tenant)
                                      ├─ org_app_subscriptions / org_feature_flags / billing fields
                                      └─ projects
                                           ├─ project_members / collaborator_invites
                                           ├─ project_folders + slatedrop_uploads (+ unified_files bridge)
                                           ├─ site_walk_sessions → items, pins, comments, assignments
                                           │                      → site_walk_deliverables → questions, snapshots, share_token
                                           ├─ site_walk_plan_sets → plan_sheets / plan_raster_jobs
                                           ├─ digital_twin_spaces → captures/assets → processing_jobs → models
                                           │                      → pins, measurements, comments, versions, share_tokens
                                           ├─ thermal_analysis_sessions → captures/jobs/reports/share_tokens
                                           └─ project_tours → tour_scenes / jobs
```

There is **no** `clients` table. `projects.client_contact_id` / `projects.client_name` plus `org_contacts` are the closest client records.

There is **no** first-class `visits` table. Closest: `site_walk_sessions`, `digital_twin_captures`, thermal sessions, tour captures, OTHER-BRANCH `spatial_walkthroughs`.

There is **no** first-class drone table. Drone exists as twin `asset_kind` `drone_photo` / `drone_video` and folder taxonomy.

### 7.2 Terminology crosswalk

| Phase 1 language | Current UI | DB / API |
|---|---|---|
| Client / Organization | Org, company, “client name” on reports, `org_contacts` | `organizations` (tenant) vs `org_contacts` / `projects.client_*` |
| Project | Project / Worksite | `projects` |
| Visit / Scan | Walk, Site Visit, Session, Twin capture, Thermal session | `site_walk_sessions`, `digital_twin_captures`, `thermal_analysis_sessions` |
| Reality | Twin 360, Digital Twin, splat | `digital_twin_models` (splat / spz) |
| Geometry | Mesh, GLB, hybrid | `digital_twin_models` (glb/gltf) + hybrid layer |
| 360 | Tours, photo_360 items, panorama_360 assets, spatial stations (OTHER-BRANCH) | `project_tours` / `tour_scenes`; `site_walk_items.item_type`; twin assets |
| Plan | Plans tab, plan sets | `site_walk_plan_sets` / `plan_sheets` |
| Drone | Ingest chip only | asset_kind; no viewer |
| Thermal | Thermal Studio | `thermal_*` |
| Items | Items, issues, punch, questions | `site_walk_items`; twin pins; deliverable questions |
| Documents | SlateDrop / Files | `slatedrop_uploads` (authoritative list; not `unified_files`) |
| History | Progression, epochs, snapshots | twin epochs / `digital_twin_versions`; deliverable snapshots; session dates |
| Shares | Many token families | See §7.3 |
| Site Walk app id | punchwalk | `withAppAuth("punchwalk")` |

### 7.3 Share-token families (do not casually unify)

| Family | Table / column | Public route |
|---|---|---|
| Site Walk deliverable | `site_walk_deliverables.share_token` | `/view/[token]` |
| Deliverable access RPC | `deliverable_access_tokens` | `/portal/[token]` |
| Twin | `digital_twin_share_tokens` | `/share/twin/[token]` |
| Thermal | `thermal_analysis_share_tokens` | `/share/thermal/[token]` |
| SlateDrop file | `slate_drop_links` | `/share/[token]` |
| Tour public | slug on `project_tours` | `/tours/view/[slug]` |
| External upload | `project_external_links` | `/upload/[token]` |
| OTHER-BRANCH spatial | spatial share tokens | richer `/portal/[token]/*` |

**NEEDS VERIFICATION:** which mint path is live for “client portal” vs “deliverable review” in production sends.

### 7.4 OTHER-BRANCH spatial model (`C:\s360`)

Not in baseline types (still 224 tables on both trees). Code + migrations on spatial branch include `spatial_walkthroughs`, clips, waypoints/pins, processing jobs, share tokens, project items, narration. APIs under `/api/spatial-walkthrough/**`. Client contract: `lib/client-experience/types.ts` (`Visit`, modalities walkthrough/twin/stations/aerial, spatial refs).

Classification until an explicit absorb decision: **DEFER / HIDE** from Slice 1, **KEEP BACKEND (OTHER-BRANCH)** as the strongest existing client-portal IA.

---

## 8. Data loaders and APIs

### 8.1 Loaders worth preserving

| Loader | Path | Why |
|---|---|---|
| Project access | `lib/projects/access.ts` | Org ∪ creator ∪ `project_members` |
| Org context | `lib/server/org-context.ts` | Cached role/CEO/staff/tier/permissions |
| API auth wrappers | `lib/server/api-auth.ts` | `withAuth` / `withAppAuth` / `withProjectAuth` |
| Project overview | `lib/projects/load-project-overview-data.ts` | Real aggregates; UI must stop treating counts as a KPI dashboard |
| Walks / twins / deliverables / team / plans tab loaders | `lib/projects/load-project-*-data.ts` | Visit/file/model lists |
| Site Walk hub + deliverable by id/token | `lib/site-walk/load-*.ts` | Mature share viewer normalization |
| Twin hub / studio / viewer / editor | `lib/digital-twin/load-*.ts` | Signed URLs + model assembly |
| Thermal session/share | `lib/thermal/load-*.ts` | Parallel job pattern |
| Dashboard / mobile home | `lib/dashboard/*`, `lib/mobile/*` | Data useful; **widget presentation is not** |
| Branding | `lib/server/branding.ts` | Portal chrome |
| Entitlements | `lib/entitlements.ts` | **Do not edit.** Hide from client Phase 1 UI; keep server gates |

### 8.2 Storage / signed URLs / share validation

KEEP BACKEND:

- R2/S3 presign (`@aws-sdk/s3-request-presigner`) for SlateDrop, site-walk upload, twin multipart, tours
- SlateDrop password gate **before** presign
- Twin `resolveTwinShareToken` + `claim_digital_twin_share_view`
- Deliverable snapshot pin on share
- Evidence events + content hash verify

### 8.3 Important APIs (Phase 1 relevant)

Classification is backend-oriented. Frontends that call them are rebuilt.

**KEEP BACKEND (high maturity)**

- `GET/POST /api/projects`, `POST /api/projects/create`, `GET/PATCH /api/projects/[projectId]`
- `/api/projects/[projectId]/collaborators*`, team
- `/api/site-walk/sessions*`, `items*`, `upload`, `pins*`, `plan-sets*`, `plans*`, `plan-sheets/*/image`
- `/api/site-walk/deliverables*` (CRUD, share, revoke, snapshot, questions, views, media)
- `/api/slatedrop/upload-url`, `complete`, `files`, `folders`, `download`, `provision`, `project-folders`, `links`, `/api/share/[token]/unlock`
- `/api/view/[token]/media|plan-sheet|comments`
- `/api/share/twin/[token]/*` (manifest, splat, glb, lidar, pin, comment, measurement, cameras)
- `/api/digital-twin/upload/*` multipart, `spaces*`, `models*`, `jobs*`, `share/create|revoke`, worker callbacks
- `/api/auth/bootstrap-org`, signup/signout, `/api/org/members*`, `/api/invites/*`

**KEEP + HARDEN**

- Twin/thermal job callbacks (signed)
- `/api/twin/jobs/[id]/progress` vs `/api/digital-twin/jobs*` (**NEEDS VERIFICATION** duplication)
- Plan rasterize (Trigger/Modal — do not move onto Vercel)
- Share view recording / max_views / expiry

**DEFER**

- `/api/projects/.../rfis|submittals|punch-list|budget|schedule|daily-logs|observations|management/*`
- `/api/tours/**` as a client product (engine reusable for 360)
- `/api/share/thermal/**` as top-level product (keep for published reports)
- `/api/share/design/[token]`
- Site Walk AI notes/transcribe, nearby
- OTHER-BRANCH `/api/spatial-walkthrough/**` until absorb decision

**REBUILD FRONT** (APIs stay): all hubs, capture UIs, current dashboards, current project tabs, thin `/portal/[token]` page.

Do not change API behavior in Slice 0 (none changed).

---

## 9. Viewer salvage map

| Viewer | Route / component | Library | Assets | Maturity | Reuse | Do not retain |
|---|---|---|---|---|---|---|
| Gaussian splat | `SplatViewer`, `splat-viewer-core/scene`, `TwinShareSplatViewer`, `DesktopSplatViewport` | Spark + R3F/Three | `.spz` primary; raw PLY **unsupported** | **High** | **KEEP + HARDEN** | Demo/dev sandboxes; operator chrome |
| Mesh / GLB hybrid | `MeshTwinViewer`, `TwinModelViewer` | R3F; also `model-viewer` | glb/gltf/usdz + optional splat look | **High** hybrid | KEEP + HARDEN R3F walkthrough | Dual stack forever |
| LiDAR / point cloud | `LidarPointCloudViewer`, Potree-style tiles | Custom R3F | `lidar_potree` | Medium | KEEP BACKEND + viewer | Unfinished QA chrome |
| 360 panorama | `TourPanoViewer`, `PublicTourPanoViewer`, `PanoramaViewer` | `@photo-sphere-viewer/core` (+ tiles) | Equirect / tiled | **High** tours | KEEP + HARDEN | Pannellum CDN iframe baggage |
| Floor plan | `PlanViewer` / Leaflet; twin `PlanPanel` | Leaflet | Raster sheets; twin vector JSON partial | **High** Site Walk pins | KEEP + HARDEN | Duplicate V1 vs V2 trees if both survive |
| Photo / file | `ShareViewer`, deliverable `ViewerClient`, twin photo-explorer | img/pdf/video | Files + overlays | Medium–High | KEEP + HARDEN | — |
| Thermal | `ThermalProbeViewer`, `ThermalShareViewer` | Canvas heatmap | Radiometric grids | **High** | KEEP + HARDEN | Studio glass chrome; `rounded-full` share CTAs |
| Drone / map | **No orthomosaic viewer** | Google Maps only for project location | `drone_photo/video` ingest | Viewer missing | KEEP maps helper; **DEFER** drone viewer | Geospatial ComingSoon app |
| Compare | `ProgressionCompareViewer` | Dual splat + `splat-camera-sync` | Epoch models | Medium–High desktop | **KEEP + HARDEN** | Do not claim auto change detection (`compareReady` reserved) |
| Annotations | Twin share pins/comments/measures; tour hotspots; thermal spots | Various | Twin tables | Medium–High | KEEP BACKEND + overlay logic | Punch-export statuses without UX |
| Measurements | `measurement-math` / persist | — | Needs metric proxy for splat | Medium | KEEP | Splat-only measure without mesh proxy |
| Clipping | Ceiling clip runtime; `digital_twin_clip_planes` schema | — | Schema ≫ UI | Ceiling usable; generic **schema-only** | KEEP schema | Do not invent a clip editor in Phase 1 unless required |
| Saved viewpoints | `digital_twin_viewpoints` | — | kinds orbit / book_spread / section / compare | **Schema only — no product consumer found** | KEEP schema | — |
| Camera path | `camera-path-types.ts`, `camera-path-math.ts`, `CinematicCameraPath` | Catmull-Rom, easing | `digital_twin_models.camera_path` jsonb | Authoring exists; **no server video export** | **KEEP + HARDEN** | Full video editor / content-studio NLE |
| Presentation mode | Share `chrome="share"`; cinematic playback; thermal aspect presets | — | 16:9 / 9:16 / 1:1 exist in thermal/content-studio | **Weak as a product mode** | Salvage aspect enums + hide-chrome flag | Content Studio as the presentation product |

### 9.1 Progress / history / presentation readiness (do not build in Slice 0)

| Capability | Existing seed | Readiness |
|---|---|---|
| Visit/date history | Sessions, twin epochs, progression slides, OTHER-BRANCH `Visit` | Strong enough to design History around |
| Before/after | Site Walk progression API; ProgressionCompare | Partial |
| Side-by-side | ProgressionCompare | Usable desktop splat |
| Synced cameras | `lib/digital-twin/splat-camera-sync.ts` | Usable when shared world frame exists; epoch swap policy preserves camera |
| Saved views | `digital_twin_viewpoints` | Schema only |
| Orbit presets | Worker manifest `recommended_orbit_camera` / `fallback_camera` | Worker-baked, not user-saved |
| Flythrough / keyframes | Cinematic path types + editor | Authoring ready |
| UI-free presentation | Share chrome variants | Needs a thin present mode |
| Framing guides | Thermal `MotionEditor` + content-studio aspect presets | Pattern salvage |
| Later MP4 export | Keyframe JSON | Good seed; **do not build an NLE** |

### 9.2 OTHER-BRANCH viewer salvage (`C:\s360` client-experience)

| Component | Role | Classification |
|---|---|---|
| `ProjectOverview`, `ProjectShell`, `ModalityTiles` | Closest existing Overview + representation switcher | Salvage IA; **REBUILD** visual system |
| `WalkViewer` + PSV VideoPlugin | Equirect **video** walkthrough | KEEP + HARDEN if spatial is absorbed |
| `StationViewer` (PSV MarkersPlugin) | 360 stations | KEEP + HARDEN |
| `PlanExperience` / `PlanCanvas` | Plan + UV locators | KEEP + HARDEN |
| `TwinExperience` | Twin inside client shell | KEEP engine, rebuild chrome |
| `lib/client-experience/types.ts` | Visit / modality / SpatialRef contract | **Best locator abstraction found** |
| `app/(public)/portal/[token]/{plan,reality,items,documents,history}` | Real portal IA **missing on main** | Absorb decision required |

`C:\s360-dashboard-portal`: fork with share-dialog / chapter IA. Treat as duplicate frontend; salvage selectively, do not merge wholesale.

---

## 10. Authentication and permission findings

| Finding | Detail |
|---|---|
| Session | Supabase SSR in middleware + layouts |
| Beta / approval | `profiles.account_status === "approved"`; CEO email and `is_app_reviewer` bypass |
| Tenant | Single `organization_members` row assumed in middleware (`.single()`) — **NEEDS VERIFICATION** for multi-org users |
| Project scope | Org membership **or** creator **or** `project_members` |
| Roles | `owner` / `admin` / `member` / `viewer` + enterprise permissions JSON |
| CEO | `CEO_EMAIL` / `isOwnerEmail` |
| Staff | `slate360_staff` table; **ops console still CEO-only** despite `staffOnly` nav flag |
| Super-admin | `user.app_metadata.is_super_admin` only (not user_metadata) |
| Entitlements | `org_app_subscriptions` + `lib/entitlements.ts` — **forbidden edit zone**; hide from client IA |
| APP_STORE_MODE | Opt-in env; hides Twin from desktop nav |
| Collaborator mode | Separate shell + `/plans` upsell |
| Token shares | Independent of login; several families |
| Thermal | Server `notFound()` unless CEO |
| Tours desktop | CEO nav item **unusable** due to middleware blocklist |

Phase 1 implication: owner vs client is **not** a first-class auth role today. Closest: CEO/staff vs org member vs collaborator vs anonymous token. Mapping service clients onto this is an **approval question**, not something Slice 1 should invent.

---

## 11. Duplicate route / product findings

| Concept | Duplicates |
|---|---|
| Authenticated home | `/dashboard`, `/app`, `_dashboard-legacy`, DashboardV3, SW360 home |
| Project overview | Live project tab + `/preview/project-overview` mock |
| Site Walk list | `/site-walk`, `/site-walks`, `/projects/.../walks`, `/sw360` |
| Twin list | `/digital-twin`, `/digital-twins`, `/twin-studio`, project twins tab |
| 360 | Tours, walk `photo_360`, twin `panorama_360`, OTHER-BRANCH stations/walkthrough |
| Files | `/slatedrop`, project Files tab, `/site-walk/slatedrop`, `unified_files` vs `slatedrop_uploads` |
| Deliverable view | `/view/[token]`, `/share/deliverable/[token]`, thin `/portal/[token]` |
| Account | `/more`, `/more/account`, `/my-account`, `/settings` |
| Design | `/unreal-studio` vs `/design-studio` |
| Content | `/content-studio-workspace` vs `/content-studio` |
| Tours | `/tours` vs `/tour-builder` vs `/app/tours` vs `/tours/view/[slug]` |
| Mobile shells | Platform shell, Site Walk shell, SW360 shell |
| Punch | Project punch-list API vs Site Walk items |
| Compare | Twin progression vs `/site-walk/items/[id]/compare` vs `/site-walk/progression` |

---

## 12. Legacy / stub / broken findings

### Stubs / placeholders

- `/slatedrop/[...section]` incomplete actions
- `/site-walk/reports` thin CTA
- `/integrations` “In Development”
- `/geospatial`, `/virtual-studio` ComingSoon (also middleware-blocked)
- `/super-admin` stub shell
- `/operations-console/[section]` → `/site-walk`
- DashboardV3 tools launcher dead buttons
- Preview routes with MOCK project overview
- Some twin capture wizard mock credits/spaces (**NEEDS VERIFICATION** whether any prod path still uses mocks)

### Broken / misleading

- **CEO `/tours` unreachable** (middleware vs sidebar)
- **Logged-in `/tours/view/[slug]` bounced to `/app`**
- **`/portal/[token]` does not show the deliverable** (confirmation card only)
- **`/product/*` and `/apps/*` next.config → `/`** while pages still exist
- **`/analytics` → `/site-walk`**
- Twin `/floor-plan` noted missing in desktop workspace links
- `digital_twin_viewpoints` / generic clip planes unused
- Epoch `compareReady` reserved
- Desktop `/login` → `/app` → `/dashboard` double hop
- DevTools mobile emulation **swaps `/dashboard` and `/app`** (testing-misleading)
- `/more/account` dual page files

### Fake / forbidden UI already in production

- `/dashboard` **customizable widget board** + metric chips
- `/app` **app marketplace tiles** + upsell
- Collaborator **upgrade to `/plans`**
- Portal **downgrade watermark + View plans**
- Desktop **Billing** nav item
- Glass dark dashboard tokens

---

## 13. Redirect map (do not implement changes)

### next.config.ts

| From | To | Flag |
|---|---|---|
| `/360-capture` | `/features/360-tour-builder` | Marketing; destination may 404 **NEEDS VERIFICATION** |
| `/product/:slug*` | `/` | SaaS teardown; hides existing product pages |
| `/apps/:slug*` | `/` | Same; `(apps)` product routes are **not** under `/apps/` so dashboard `/design-studio` is unaffected |

Rewrite: host `app.sitewalk360.app` → `/sw360/:path` (excludes `/api`, `/_next`, `/sw360`).

### middleware.ts

| From | To | Flag |
|---|---|---|
| `/ceo`, `/ceo/*` | `/operations-console*` | Legacy alias |
| `/dashboard` if mobile/tablet | `/app` | Exact `pathname === "/dashboard"` only. Misleads **current production** `/dashboard` testing. Does **not** match `/vnext` or `/preview/vnext` |
| `/app` if not mobile | `/dashboard` | Exact `pathname === "/app"` only. Inverse of the row above. Does **not** match `/vnext` or `/preview/vnext` |
| Mobile `/my-work*`, `/my-account*` | `/app?blocked=` | Quarantine |
| Mobile `/site-walk/{deliverables,reports,slatedrop,more,plans}*` | `/site-walk` | Capture-v2 exempt |
| Unauth beta-protected | `/login?redirectTo=` | OK |
| Unapproved | `/pending-verification` | Owner/reviewer bypass |
| Auth + Phase-1 blocklist | `/app` | Breaks `/tours` including public prefix for logged-in users |
| Standalone-only + `/dashboard` or `/slatedrop` | `/app` | Walled garden |
| Authed `/login` `/signup` | `/app` | Then desktop bounce |

### Route-level

| From | To |
|---|---|
| `/share/deliverable/[token]` | `/view/[token]` |
| `/beta-pending` | `/pending-verification` |
| `/site-walk-v1-preview` | `/site-walk` |
| `/digital-twin/twins` | `/digital-twin/projects` |
| `/my-account` | `/more/account` |
| `/settings/account` | `/settings` |
| `/operations-console/[section\|feedback]` | `/site-walk` **surprising** |
| `/analytics` | `/site-walk` **surprising** |
| `/digital-twins` if APP_STORE_MODE | `/dashboard` |
| Native UA on `/` | `/app` |

Circular / multi-hop risks: `/login` → `/app` → `/dashboard`; historical ops/analytics paths landing on Site Walk; Phase-1 block vs still-present dashboard pages.

**Device-fork scope (corrected after Slice 0 review):** the `/dashboard` ↔ `/app` swap is exact-path only. `resolveMobileLegacyRedirect()` does not match `/vnext` or `/preview/vnext`. Slice 1 must **not** modify `middleware.ts` merely to support those trees. Verify responsive behavior on vNext routes directly. Middleware stays untouched unless a later route/auth requirement demonstrates a real need.

---

## 14. Five-category salvage classification

Counts are **significant Phase 1-relevant areas**, not raw file counts.

| Class | Count (approx) | Meaning |
|---|---|---|
| KEEP BACKEND | ~40 | Auth, project scope, sessions/items/pins/plans/deliverables, SlateDrop FS, twin/thermal jobs, share tokens, signed URLs |
| KEEP + HARDEN | ~18 | Splat/mesh/PSV/plan/thermal/share viewers, camera path, compare sync, deliverable `/view`, twin share |
| REBUILD FRONT END | ~25 | All authenticated chrome, dashboard, launcher, project IA, portal page, owner home, account |
| DEFER / HIDE | ~30 | Site Walk/Twin/SlateDrop/Tours/Thermal/Design/Content as products; billing; PM suite; SW360; capture apps; spatial until decided; previews |
| RETIRE AFTER CUTOVER | ~20 | Widget board, DashboardV3, walled garden, orphan navs, misleading redirects, duplicate aliases, stub studios |

Nothing is deleted in Slice 0.

### 14.1 KEEP BACKEND (selected)

Project access, org context, API auth wrappers, site-walk session/item idempotency, deliverable snapshots/questions/share, SlateDrop upload/FS/links, twin multipart + job callbacks + model URLs, plan raster contracts (Trigger/Modal), thermal job contracts, branding, invites, collaborator membership, evidence events, entitlements (hidden).

### 14.2 KEEP + HARDEN (selected)

Spark splat viewer, hybrid mesh walkthrough, twin share annotate, ProgressionCompare + camera sync, cinematic keyframe types/math, Photo Sphere tours, Leaflet plan pins, `/view/[token]` deliverable viewer, `/share/[token]` file gate, `/share/thermal/[token]`, thermal probe, signed URL + token expiry/revoke, locator ideas in OTHER-BRANCH `SpatialRef`.

### 14.3 REBUILD FRONT END (selected)

`DashboardDesktopShell`, `/dashboard` widget board, `/app` launcher, project tab shell, `/projects` directory, `/portal/[token]` card, `ExternalPortalShell` glass, account/more IA, operations console as SaaS ops, all current navs.

### 14.4 DEFER / HIDE (selected)

Site Walk / Twin 360 / SlateDrop / Tours / Content Studio / Design Studio / Thermal Studio as top-level products; billing/plans/seats/upgrade; PM RFI/budget/schedule; SW360; geospatial/virtual-studio; capture self-serve; AI chatbot; Procore/Autodesk; spatial walkthrough until absorb decision; `/preview/*` from client nav.

### 14.5 RETIRE AFTER CUTOVER (selected)

`_dashboard-legacy`, DashboardV3, orphan shared navs, `/analytics` and ops-section redirects to Site Walk, duplicate `/tour-builder` `/design-studio` `/content-studio` aliases, `/site-walk-v1-preview`, photos/people legacy project segments, widget preference store as product home, app-tile launchpads.

---

## 15. Proposed client / stakeholder route tree

**Not implemented.** Parallel during slices 1–11 so production routes stay untouched.

Recommended parallel prefix: **`/vnext`** (CEO/preview gated). Preview harnesses: `/preview/vnext/*`. Canonical cutover in Slice 12.

```
/login
/vnext/projects                              visual portfolio (image-first)
/vnext/projects/[projectId]                  Overview
/vnext/projects/[projectId]/explore          unified spatial shell
  ?visit=&rep=reality|geometry|360|plan|drone|thermal&item=
/vnext/projects/[projectId]/items
/vnext/projects/[projectId]/items/[itemId]
/vnext/projects/[projectId]/documents
/vnext/projects/[projectId]/history
/vnext/projects/[projectId]/compare          two-visit side-by-side (Slice 7)
/vnext/account

# Public / share (keep existing token hosts during cutover)
/portal/[token]                              rebuild into real project record landing
/portal/[token]/explore                      optional later
/view/[token]                                keep Site Walk deliverable viewer
/share/twin/[token]                          keep twin engine
/share/[token]                               keep file share
/share/thermal/[token]                       keep delivered thermal reports (not nav)
```

Rules:

- Do not add Spaces/Rooms/Floors as primary nav.
- Do not add Site Walk / Twin / SlateDrop / Studio as client tabs.
- Representation switcher shows **only available** deliverables.
- If a stakeholder has one project, Overview is still required (identity + latest state).
- Optional later: `/vnext/shared` (“Shared with me”).

**DECIDED (see status doc):** authenticated `/vnext/projects` uses existing auth/membership; public token sharing stays separate. Do not replace production `/portal/[token]` in early slices.

---

## 16. Proposed owner / internal route tree

```
/vnext/ops                                   Home — what needs attention next
/vnext/ops/clients
/vnext/ops/clients/[clientId]
/vnext/ops/projects
/vnext/ops/projects/[projectId]              operator project (visits, ingest entry, publish state)
/vnext/ops/projects/[projectId]/visits
/vnext/ops/processing
/vnext/ops/qa                                QA & Publish
/vnext/ops/shares
/vnext/ops/preview/[projectId]               preview as client
/vnext/ops/settings
/vnext/ops/account
```

Do **not** expose: Revenue widgets, seat counts, Stripe portal, app marketplace, Thermal/Content/Design/Tours as primary owner nav. Thermal remains CEO-only capability behind Processing/QA when a thermal deliverable exists.

Existing `/operations-console` is not this tree (SaaS ops + Site Walk dumps). Rebuild rather than restyle.

---

## 17. Recommended legacy redirect strategy (Slice 12, not now)

| Legacy | Recommendation | Risk if auto-redirected too early |
|---|---|---|
| `/dashboard`, `/app` | Role-based: owner → `/ops`, client → `/projects` | Device fork + launcher users land in the wrong product |
| `/projects` | Become canonical client portfolio after vNext proven | Current tab hub ≠ Overview/Explore IA |
| `/projects/[id]/{walks,twins,plans,slatedrop,deliverables,team}` | Compat redirects into History / Explore `?rep=` / Documents / owner team | Losing tab context; twins hidden in APP_STORE_MODE |
| `/site-walk`, `/site-walks`, `/digital-twin*`, `/slatedrop` | Hide from nav; owner-only legacy during cutover; then not-found or ops ingest | Field capture still needed internally — **do not 404 capture-v2 until operator ingest exists** |
| `/portal/[token]` | Rebuild in place or redirect to new portal once it actually opens content | Today’s card would hide a “successful” share |
| `/view/[token]`, `/share/twin/[token]`, `/share/[token]` | Keep hosts stable (token URLs are already in the wild) | Changing token URL shape = broken client links |
| `/tours`, `/design-studio`, `/content-studio`, `/geospatial`, `/virtual-studio` | Stay hidden; not-found after replacement | Middleware already dumps to `/app` |
| `/more/billing`, `/plans` | Hide from nav; owner-only if Brian still needs Stripe | Clients must not see upgrade |
| `/operations-console` | Redirect to `/ops` after owner Home exists | Section routes currently dump to Site Walk |
| `/analytics`, `/ceo` | `/ceo` keep → ops; `/analytics` stop pretending | Testing confusion |
| `/sw360` | Leave host rewrite; out of Phase 1 Slate360 nav | Separate product |

**Do not auto-redirect** capture, twin upload, or processing URLs to client Explore — that would look like data loss and skip QA.

---

## 18. Functionality worth preserving

- Org/project scoping and membership
- Idempotent Site Walk capture/sync contracts
- Plan raster pipeline (off Vercel)
- Deliverable share + snapshots + questions
- SlateDrop storage/provision/signed download
- Twin multipart upload + processing job callbacks + splat/GLB resolution
- Spark splat + hybrid mesh viewers
- Twin share pins/comments/measurements
- Progression compare + camera sync
- Cinematic keyframe path model
- Photo Sphere 360
- Leaflet plan pins
- Thermal probe + tokenized thermal reports
- Multiple share-token validators (keep behavior; unify UX later)
- Google Maps location helpers
- Branding snapshot for portals
- OTHER-BRANCH client-experience locator contract (if absorbed)

---

## 19. UI that must not be carried forward

- Dark Graphite Glass dashboard shell
- Customizable widget board (`CustomizableWidgetBoard` on `/dashboard`)
- Quick metric chips as fake analytics
- Mobile app launcher + entitlement upsell tiles
- Desktop AppSwitcher as product marketplace
- Studio proliferation (Twin/Thermal/Design/Content/Tours as peer apps)
- Billing / plans / seats / upgrade banners in client or owner primary nav
- “Command Center” / walled-garden tiles
- DashboardV3 dark teal prototype
- Nested glass cards, decorative icon tiles, giant empty heroes
- Site Walk / Twin / SlateDrop as client information architecture
- Current project tab set (Walks / Twins / Files as peer products)
- Thin `/portal/[token]` confirmation card + pricing watermark
- Coming Soon / In Development authenticated stubs
- Orphan shared mobile navs and Command Center lists
- Teal-as-brand for the new portal (keep existing tokens in **legacy** code until cutover; vNext uses a restrained accent per the Phase 1 plan — *cobalt at Slice 0 time, superseded 2026-09-18 by Slate360's deep green `#0C7A52`; see `docs/vnext/UI_DESIGN_RULES.md`*)

---

## 20. Risks / questions requiring approval before Slice 1

The original Slice 0 questions below are retained as audit history. They are now **decided**. Locked decisions live in `docs/vnext/PHASE1_IMPLEMENTATION_STATUS.md` under **Approved Decisions After Slice 0**.

Item 9 is **corrected**: the original recommendation to exempt `/vnext` from the device swap was wrong. See §13 device-fork scope.

1. **Baseline vs spatial absorb.** Slice 1 on `origin/main` will **not** include AOB205 `client-experience` or spatial APIs. Should Slice 1 stay on main and treat spatial as a later graft, or is there an approved, non-reconstruction subset to cherry-pick? Recommendation: **stay on main**; salvage contracts only. **DECIDED:** stay on main; do not merge/cherry-pick spatial in Slice 1.
2. **Who is a “client” in auth?** Map onto (a) new/existing orgs, (b) `org_contacts` + magic links, (c) collaborators, (d) token-only `/portal`. **DECIDED:** reuse existing Supabase auth + org/project membership; token portal is separate, not a replacement for the authenticated portfolio; no identity migration in Slice 1.
3. **Visit entity.** Invent a unified `visits` table vs adapter over sessions/captures/spatial walkthroughs. **DECIDED:** adapter only; no `visits` table in Phase 1 foundation.
4. **Parallel route prefix.** Approve `/vnext/*` + `/preview/vnext/*` vs only preview harnesses. **DECIDED:** both prefixes approved.
5. **Owner route prefix.** `/vnext/ops` vs `/vnext/owner` vs reuse `/operations-console`. **DECIDED:** `/vnext/ops`.
6. **Thermal and Drone in Explore.** Show when published assets exist, even if capture stays CEO/internal? **DECIDED:** representations appear only when real renderable data exists; no dead Drone tab.
7. **360 source of truth.** Tours vs walk photo_360 vs twin panorama vs spatial stations. **DECIDED:** adapter later; do not pick one table in Slice 1; do not expose Tours as a client product.
8. **Billing visibility.** Hide entirely from vNext nav, including owner? **DECIDED:** billing/subscriptions/plans/seats/upgrade/app entitlements absent from both client and owner vNext primary nav.
9. **Middleware device fork.** Current production `/dashboard` and `/app` testing **is** affected by the exact-path device swap. `/vnext/*` and `/preview/vnext/*` are **not** affected (`pathname === "/dashboard"` / `pathname === "/app"` only; `resolveMobileLegacyRedirect()` does not match those trees). **CORRECTED:** do **not** modify middleware merely to support `/vnext`. No Slice 1 middleware exemption is required. Middleware remains untouched unless a later route/auth requirement demonstrates a real need. Verify responsive behavior directly on vNext.
10. **Entitlements.** Client Phase 1 should not upsell apps. Keep server file untouched; do not add upgrade UI. **DECIDED:** keep entitlements intact; no upsells/locked tiles/subscription messaging in vNext.
11. **`/portal/[token]` rebuild vs new host.** Existing portal tokens currently show a dead-end card. Rebuilding in place is high-value but production-visible. **DECIDED:** do not replace production `/portal/[token]` in early slices; build in vNext/preview; keep live token URL hosts stable.
12. **Do not merge** `feature/ui-phase-1`, `feature/dashboard-portal-alignment-2026-09`, or `feature/aob205-spatial-experience-v3` into this branch. **DECIDED:** no wholesale merges; later selective salvage requires explicit relevance and review.

---

## Appendix A — Complete `page.tsx` catalog (164)

Listed as URL-ish paths (route groups omitted). Deep-dives are in §4.

`/`, `/~offline`, `/analytics`, `/app`, `/app/tours`, `/apps/[slug]`, `/beta-pending`, `/collaborator`, `/contact`, `/content-studio`, `/content-studio-workspace`, `/coordination`, `/coordination/calendar`, `/coordination/contacts`, `/coordination/inbox`, `/dashboard`, `/deploy-check/*`, `/design-studio`, `/dev/*`, `/digital-twin`, `/digital-twin/capture`, `/digital-twin/projects`, `/digital-twin/projects/[projectId]`, `/digital-twin/review`, `/digital-twin/submit`, `/digital-twin/twins`, `/digital-twin/twins/[id]`, `/digital-twin/twins/[id]/cinematic`, `/digital-twin/twins/[id]/editor`, `/digital-twin/twins/[id]/progression`, `/digital-twin/upload`, `/digital-twins`, `/external/respond/[token]`, `/forgot-password`, `/geospatial`, `/install`, `/integrations`, `/login`, `/m/diag`, `/more`, `/more/[section]`, `/more/account`, `/more/billing`, `/my-account`, `/my-work`, `/operations-console`, `/operations-console/[section]`, `/operations-console/feedback`, `/pending-verification`, `/plans`, `/portal/[token]`, `/preview/*` (27 harnesses), `/privacy`, `/product/digital-twin`, `/product/site-walk`, `/projects`, `/projects/new`, `/projects/[projectId]`, `/projects/[projectId]/deliverables`, `/projects/[projectId]/deliverables/[id]/edit`, `/projects/[projectId]/people`, `/projects/[projectId]/photos`, `/projects/[projectId]/plans`, `/projects/[projectId]/punch-list`, `/projects/[projectId]/slatedrop`, `/projects/[projectId]/team`, `/projects/[projectId]/twins`, `/projects/[projectId]/walks`, `/reset-password`, `/settings`, `/settings/account`, `/share/[token]`, `/share/deliverable/[token]`, `/share/thermal/[token]`, `/share/twin/[token]`, `/signup`, `/site-walk`, `/site-walk/assigned-work`, `/site-walk/capture`, `/site-walk/capture-v2`, `/site-walk/capture-v2/flow`, `/site-walk/capture-v2/summary`, `/site-walk/deliverables`, `/site-walk/deliverables/new`, `/site-walk/deliverables/[id]`, `/site-walk/items/[id]/compare`, `/site-walk/progression`, `/site-walk/reports`, `/site-walk/reports/new`, `/site-walk/setup`, `/site-walk/slatedrop`, `/site-walk/walks`, `/site-walk/walks/[sessionId]`, `/site-walk-v1-preview`, `/site-walks`, `/slatedrop`, `/slatedrop/[...section]`, `/super-admin`, `/sw360/*` (login, home, projects, capture, inbox, reports, account, calendar, contacts, nested project tabs), `/terms`, `/thermal-studio`, `/thermal-studio/upload`, `/thermal-studio/report-templates`, `/thermal-studio/[sessionId]`, `/thermal-studio-v2`, `/thermal-studio-v2/[sessionId]`, `/tour-builder`, `/tours`, `/tours/view/[slug]`, `/twin-studio`, `/twin-studio/[spaceId]`, `/twin-studio/[spaceId]/preview`, `/upload/[token]`, `/unreal-studio`, `/view/[token]`, `/virtual-studio`.

Exact file paths live under `app/**/page.tsx` on this branch. Private `_dashboard-legacy` is **not** a public route.

---

## Appendix B — Other worktrees inspected (not baselines)

| Path | Branch | Use in Phase 1 |
|---|---|---|
| `C:\s360` | `feature/aob205-spatial-experience-v3` | Salvage client-experience + portal IA + PSV video walk; **do not merge reconstruction** |
| `C:\s360-dashboard-portal` | `feature/dashboard-portal-alignment-2026-09` | Salvage share-dialog notes only |
| `C:\s360-ux` | `feature/aob205-ux-polish-v3` | Spatial UX polish; do not merge |
| Reconstruction/trainer worktrees (`s360-claude-twin`, splat-lab remotes, lidar, etc.) | various | **Do not touch** |

`origin/feature/ui-phase-1` is already in `main` (app launcher / block editor era). Classify and replace; do not re-adopt.
