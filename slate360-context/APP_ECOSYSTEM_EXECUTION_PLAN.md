# 1. EXECUTIVE VERDICT

The current repo is structurally capable of supporting shared standalone apps on one backbone, but only partially. The strongest reusable foundation is the existing org-based auth, shared project model, shared S3-backed file infrastructure, and shared Stripe customer/org billing path. The biggest problem is that the app-ecosystem architecture described in docs is ahead of the live code. The repo does not yet have a real per-app entitlement layer, a single canonical file metadata model, or a hardened standalone-route authorization model.

Top 10 blockers:
1. No app entitlement table or merge logic exists. `org_feature_flags` is referenced in docs only; no tracked migration or runtime implementation exists. Live gating is tier-only in `lib/entitlements.ts`.
2. Billing only writes back to `organizations.tier`, so Stripe currently supports platform tier upgrades, not standalone app subscriptions. See `app/api/billing/checkout/route.ts`, `app/api/stripe/webhook/route.ts`, `lib/billing.ts`.
3. File metadata is split between active `slatedrop_uploads` code paths and legacy/planned `unified_files` assumptions. See `app/api/slatedrop/upload-url/route.ts`, `app/api/slatedrop/complete/route.ts`, `app/api/projects/[projectId]/route.ts`, `slate360-context/SLATEDROP.md`.
4. Direct file sharing depends on `slate_drop_links`, but no tracked migration for that table exists in `supabase/migrations/`. Code references exist in `app/api/slatedrop/secure-send/route.ts` and `app/share/[token]/page.tsx`.
5. Standalone dashboard-tab routes are not consistently denied server-side. `app/(dashboard)/analytics/page.tsx` checks entitlements, but pages such as `app/(dashboard)/tours/page.tsx` and `app/(dashboard)/project-hub/page.tsx` only require auth and render shells.
6. 360 Tour Builder is not implemented as an app. The dashboard route is a coming-soon shell and the marketing page is not backed by tables, APIs, or storage workflows. See `components/dashboard/ToursShell.tsx` and `app/features/360-tour-builder/page.tsx`.
7. Public-link infrastructure is fragmented. `project_external_links` handles upload portals and external document responses, while direct file sharing uses a separate `slate_drop_links` concept.
8. No offline queue or service worker exists. `app/manifest.ts` exists, but there is no live service worker, IndexedDB, Dexie, or localforage implementation.
9. Some tracked migrations document pre-existing production schema rather than fully establishing it. `supabase/migrations/20260223_create_project_folders.sql` explicitly says the table already existed before migration tracking.
10. Some live code appears to depend on schema not visible in tracked migrations, which raises deployment and new-environment risk. The strongest example is `slate_drop_links`.

Top 10 reusable foundations already present:
1. Shared auth/session backbone via Supabase in `middleware.ts`, `lib/supabase/*`, `app/login/page.tsx`, `app/api/auth/signup/route.ts`, and `app/auth/callback/route.ts`.
2. Shared org/workspace resolution in `lib/server/org-context.ts` with org tier, admin role, internal-access scopes, and selected org context.
3. Shared organization bootstrap in `lib/server/org-bootstrap.ts` and fallback calls from `app/dashboard/page.tsx` and `app/api/auth/bootstrap-org/route.ts`.
4. Shared project model and scoped access helpers in `supabase/migrations/20260223_create_projects.sql` and `lib/projects/access.ts`.
5. Shared project activity logging in `supabase/migrations/20260303110000_project_activity_log.sql` and `lib/projects/activity-log.ts`.
6. Shared project folder system in `project_folders` and `lib/slatedrop/provisioning.ts` with folder creation from `app/api/projects/create/route.ts`.
7. Shared S3 upload backbone with direct-to-S3 presigned uploads in `app/api/slatedrop/upload-url/route.ts`, `app/api/slatedrop/complete/route.ts`, `lib/s3.ts`, and `lib/slatedrop/storage.ts`.
8. Shared project artifact save helper in `lib/slatedrop/projectArtifacts.ts` used by project workflows.
9. Shared org-scoped Stripe customer path in `lib/billing-server.ts`, `app/api/billing/checkout/route.ts`, `app/api/billing/portal/route.ts`, and `app/api/stripe/webhook/route.ts`.
10. Shared dashboard/app-shell primitives in `components/shared/DashboardHeader.tsx`, `components/shared/DashboardTabShell.tsx`, and `components/shared/QuickNav.tsx`.

Safest path to first revenue app launch:
- Do not launch from the current dashboard `tours` shell.
- Keep one account/org/project backbone.
- Build a minimal app entitlement layer on top of the existing org model.
- Standardize file metadata around `slatedrop_uploads` plus `project_folders` before adding Tour Builder media workflows.
- Launch 360 Tour Builder first as a narrow standalone route set under a new `/apps/tour-builder` surface while preserving shared auth, shared projects, and shared storage.

# 2. REPO STRUCTURE MAP

Important folders and files:

| Path | Current purpose | Key files | Active or legacy | Reusable for shared app infrastructure |
|---|---|---|---|---|
| `app/` | Next.js App Router pages and API routes | `app/dashboard/page.tsx`, `app/market/page.tsx`, `app/api/**`, `app/share/[token]/page.tsx`, `app/upload/[token]/page.tsx` | Active | Yes |
| `app/(dashboard)/` | Authenticated dashboard-tab pages exposed as top-level routes because route groups do not appear in URLs | `analytics/page.tsx`, `tours/page.tsx`, `project-hub/page.tsx`, `ceo/page.tsx` | Active | Yes, but current auth assumptions need tightening |
| `components/` | UI shells and clients for dashboard, SlateDrop, Project Hub, Market | `components/dashboard/*`, `components/slatedrop/*`, `components/project-hub/*`, `components/shared/*` | Active | Yes, especially shared shell components |
| `lib/` | Service layer, auth, billing, entitlements, storage, project helpers, Market runtime | `lib/server/org-context.ts`, `lib/entitlements.ts`, `lib/slatedrop/*`, `lib/projects/*`, `lib/billing*.ts`, `lib/market/*` | Active | Yes |
| `lib/hooks/` | Shared client hooks for SlateDrop, dashboard widgets, Market | `useSlateDrop*`, `useDashboard*`, `useMarket*` | Active | Partially; some business logic is still UI-coupled |
| `src/` | Minimal leftover client-side state area | `src/lib/useAnalyticsStore.ts` | Likely active but isolated; feels legacy-adjacent because most app code lives outside `src/` | Low |
| `app/api/` | Live backend surface implemented as Next route handlers | Billing, auth, projects, SlateDrop, analytics, market, contacts, calendar, ceo | Active | Yes |
| `lib/server/` | Shared server-side auth/bootstrap/response helpers | `api-auth.ts`, `api-response.ts`, `org-bootstrap.ts`, `org-context.ts` | Active | High |
| `supabase/migrations/` | Tracked database migrations | projects, folders, project tools, observations, contacts/calendar, Market tables | Active, but incomplete as a full source of truth | High |
| `public/` | Static assets and demo/uploads assets | `public/uploads/` | Active | Limited |
| `middleware.ts` | Session refresh and basic route protection | `middleware.ts` | Active | Yes, but needs expansion for future app routes |
| `package.json` | Dependencies and scripts | `package.json` | Active | Yes |

Folder-level conclusions:
- `app/` is the real execution surface.
- `components/` and `lib/` contain most reusable app-foundation code.
- `src/` is not a primary app root; current architecture is not centered there.
- `supabase/migrations/` is necessary but not sufficient as the full schema truth because some runtime tables appear to predate tracking or are absent.

Auth/billing/storage related files worth treating as canonical:
- Auth: `middleware.ts`, `app/login/page.tsx`, `app/api/auth/signup/route.ts`, `app/auth/callback/route.ts`, `lib/server/org-context.ts`, `lib/server/org-bootstrap.ts`
- Billing: `app/api/billing/checkout/route.ts`, `app/api/billing/portal/route.ts`, `app/api/billing/credits/checkout/route.ts`, `app/api/stripe/webhook/route.ts`, `lib/billing.ts`, `lib/billing-server.ts`, `lib/stripe.ts`
- Storage: `app/api/slatedrop/*`, `lib/s3.ts`, `lib/slatedrop/storage.ts`, `lib/slatedrop/projectArtifacts.ts`, `lib/slatedrop/provisioning.ts`

# 3. AUTH / USER / ORG / RBAC AUDIT

Sign up / sign in / session flow:
- Email signup uses `app/api/auth/signup/route.ts`, which calls Supabase admin `generateLink` and sends branded email via Resend.
- Email login uses `app/login/page.tsx` with `supabase.auth.signInWithPassword`.
- OAuth login uses `app/login/page.tsx` with `supabase.auth.signInWithOAuth`.
- Auth callback uses `app/auth/callback/route.ts`, which calls `exchangeCodeForSession` and then `ensureUserOrganization(user)`.
- Middleware refreshes session and guards only `/dashboard`, `/slatedrop`, and `/project-hub` in `middleware.ts`.

Org/workspace model:
- The repo is org-centered, not user-isolated.
- `lib/server/org-context.ts` selects from `organization_members` joined to `organizations` and picks one org based on role ranking.
- `lib/server/org-bootstrap.ts` creates an `organizations` row and an `organization_members` row when missing.

Role model:
- Org-wide roles come from `organization_members.role`.
- Project roles come from `project_members`. Migrations show `role`; some runtime code also uses `role_id` payload fallback. See `supabase/migrations/20260223_create_projects.sql`, `app/api/projects/create/route.ts`.
- Internal platform access comes from `slate360_staff.access_scope` and CEO email checks in `lib/server/org-context.ts`.

Subscription tier checks:
- Tier-based entitlements are centralized in `lib/entitlements.ts`.
- Tiers are `trial`, `creator`, `model`, `business`, `enterprise`.
- The entitlement model is module-level and tier-only.

App-level access checks:
- No generalized standalone-app entitlement layer exists.
- Internal-only app access exists for `/market`, `/ceo`, and `/athlete360` via `canAccessMarket`, `canAccessCeo`, and `canAccessAthlete360` from `lib/server/org-context.ts`.

Feature flags:
- No live `org_feature_flags` table or merge logic exists.
- References exist only in docs such as `slate360-context/BACKEND.md`, `slate360-context/GUARDRAILS.md`, and `slate360-context/FUTURE_FEATURES.md`.

Middleware guards:
- `middleware.ts` only guards `/dashboard`, `/slatedrop`, and `/project-hub`.
- Standalone top-level routes produced from the route group, such as `/tours`, `/design-studio`, `/content-studio`, `/geospatial`, `/virtual-studio`, and `/analytics`, are not protected by middleware directly.
- Most of those pages still redirect on missing auth inside the server page, but that is a second line of defense, not uniform route middleware.

Dashboard route protection:
- Explicit entitlement denial exists in `app/(dashboard)/analytics/page.tsx`.
- Explicit internal denial exists in `app/market/page.tsx` and `app/(dashboard)/ceo/page.tsx`.
- Several scaffolded app pages only check auth and then render shells. See `app/(dashboard)/tours/page.tsx`, `app/(dashboard)/project-hub/page.tsx`, `app/(dashboard)/design-studio/page.tsx`, `app/(dashboard)/content-studio/page.tsx`, `app/(dashboard)/geospatial/page.tsx`, `app/(dashboard)/virtual-studio/page.tsx`.

Answers:
- Can one user have multiple app entitlements: not in live code. A user can have one org context, one org tier, and separate internal staff scopes, but there is no app-entitlement table or merge logic.
- Is there already an `org_feature_flags` or equivalent concept: no live equivalent for customer apps. The closest live concept is `slate360_staff.access_scope`, but that is internal staff access only.
- Is there a clean place to add app entitlements: yes. The cleanest insertion point is org-scoped feature flags merged into `getEntitlements()` and resolved alongside `resolveServerOrgContext()`.
- Are there hardcoded assumptions that every user is a full platform user: yes, in practice. Many dashboard-tab pages render after auth without a server-side entitlement denial, and Stripe maps subscriptions directly to org tier rather than app access.

# 4. BILLING / SUBSCRIPTIONS / STRIPE AUDIT

Current billing surface:
- Checkout: `app/api/billing/checkout/route.ts`
- Billing portal: `app/api/billing/portal/route.ts`
- Credit packs: `app/api/billing/credits/checkout/route.ts`
- Webhook: `app/api/stripe/webhook/route.ts`
- Stripe client/origin: `lib/stripe.ts`
- Price mapping: `lib/billing.ts`
- Org lookup/customer creation: `lib/billing-server.ts`

Current model:
- Checkout is org-scoped. Metadata written to Stripe includes `org_id`, `user_id`, `target_tier`, and `billing_cycle` in `app/api/billing/checkout/route.ts`.
- `findOrCreateStripeCustomer()` in `lib/billing-server.ts` keys customers by email plus matching `customer.metadata.org_id`.
- Webhooks update `organizations.tier` or fallback `organizations.plan` in `app/api/stripe/webhook/route.ts`.
- Credit packs update `organizations.credits_balance` in the same webhook file.

Plan tables / price ids / fields:
- Price envs used by `lib/billing.ts`:
  - `STRIPE_PRICE_CREATOR_MONTHLY`
  - `STRIPE_PRICE_CREATOR_ANNUAL`
  - `STRIPE_PRICE_MODEL_MONTHLY`
  - `STRIPE_PRICE_MODEL_ANNUAL`
  - `STRIPE_PRICE_BUSINESS_MONTHLY`
  - `STRIPE_PRICE_BUSINESS_ANNUAL`
  - `STRIPE_PRICE_CREDITS_STARTER`
  - `STRIPE_PRICE_CREDITS_GROWTH`
  - `STRIPE_PRICE_CREDITS_PRO`
- Webhook secret env: `STRIPE_WEBHOOK_SECRET`
- Secret key env: `STRIPE_SECRET_KEY`

Tier enforcement in UI/backend:
- UI/server pages use `getEntitlements(tier)`.
- Billing itself does not understand app SKUs; it only understands tier SKUs and credit packs.

Answers:
- Can current billing support standalone app subscriptions plus full platform subscriptions: not safely as-is. It can support one org-level Stripe customer and platform tiers, but not multiple app entitlements merged with a platform plan.
- Is the billing model user-level, org-level, or mixed: mostly org-level for platform billing, mixed only because checkout records `user_id` metadata and Market tables are user-level for internal tooling.
- What exact changes are needed for app-based entitlements:
  - add an org-scoped entitlement table such as `org_feature_flags`
  - add standalone Stripe product/price mapping separate from tier mapping
  - add webhook logic that writes app entitlements instead of only setting `organizations.tier`
  - update `getEntitlements()` to merge platform tier plus app flags
  - add UI/account surfaces showing active apps per org
- What is missing for monthly/yearly standalone app billing:
  - standalone app price envs and mapping
  - entitlement persistence table
  - webhook writeback for app entitlements
  - upgrade-resolution rules when full platform tier and app SKU overlap
  - plan presentation and purchase API for app subscriptions

# 5. FILE / STORAGE / DELIVERY / SHARE AUDIT

Live storage and upload backbone:
- S3 client and bucket config: `lib/s3.ts`
- Bucket env: `SLATEDROP_S3_BUCKET` fallback `slate360-storage`
- S3 auth envs: `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`
- Upload reserve: `app/api/slatedrop/upload-url/route.ts`
- Upload finalize: `app/api/slatedrop/complete/route.ts`
- File list: `app/api/slatedrop/files/route.ts`
- Download: `app/api/slatedrop/download/route.ts`
- Delete: `app/api/slatedrop/delete/route.ts`
- Rename/move: `app/api/slatedrop/rename/route.ts`, `app/api/slatedrop/move/route.ts`
- ZIP export: `app/api/slatedrop/zip/route.ts`

Canonical file table in live code:
- Live code currently treats `slatedrop_uploads` as the active file record table.
- `app/api/slatedrop/upload-url/route.ts`, `app/api/slatedrop/complete/route.ts`, `app/api/slatedrop/files/route.ts`, `app/api/slatedrop/download/route.ts`, `app/api/slatedrop/delete/route.ts`, `app/api/slatedrop/zip/route.ts`, project management routes, and dashboard summary routes all read/write `slatedrop_uploads`.

Folder model:
- Canonical live folder table is `project_folders` from `supabase/migrations/20260223_create_project_folders.sql`.
- Docs and code both say new folder writes must use `project_folders`, not `file_folders`.

Legacy or split file model:
- `unified_files` is still referenced by docs and project-delete cleanup, but not by the main current SlateDrop upload flow.
- `file_folders` is still referenced defensively and in docs as a migration residue.

SlateDrop-related tables/routes/components:
- Routes: `app/api/slatedrop/*`, `app/slatedrop/page.tsx`, `app/(dashboard)/project-hub/[projectId]/slatedrop/page.tsx`
- Components: `components/slatedrop/*`

Share links:
- Direct file shares use `slate_drop_links` in `app/api/slatedrop/secure-send/route.ts` and `app/share/[token]/page.tsx`.
- Upload request links use `project_external_links` in `app/api/slatedrop/request-link/route.ts` and `app/upload/[token]/page.tsx`.
- External response links also use `project_external_links` in `app/api/external/respond/route.ts` and `app/external/respond/[token]/page.tsx`.

Upload request links:
- Implemented via `project_external_links` with `folder_id`, `token`, and `expires_at` in `app/api/slatedrop/request-link/route.ts`.
- Public upload page exists at `app/upload/[token]/page.tsx`.

Deliverable packs:
- No true deliverable pack table exists.
- Closest current behavior is ad hoc ZIP export in `app/api/slatedrop/zip/route.ts` and project audit package generation in `app/api/slatedrop/project-audit-export/route.ts`.

Version history:
- No live version-history baseline is implemented on `slatedrop_uploads`.
- Docs still describe future `unified_files.version`, `version_group_id`, `is_latest` work, but that is not live.

Public viewers:
- Direct file viewer: `app/share/[token]/page.tsx`
- Upload portal: `app/upload/[token]/page.tsx`
- External response form: `app/external/respond/[token]/page.tsx`

Audit/download/view tracking:
- No dedicated immutable file audit table is present in tracked migrations.
- `project_activity_log` exists, but that is project activity, not a general file-share/view/download audit log.
- `project-audit-export` generates a manifest ZIP, not a live audit log table.

Answers:
- Is there already a shared storage backbone suitable for all apps: partially yes. S3 plus `project_folders` plus `slatedrop_uploads` is the best real foundation in the repo.
- Can tours, punch photos, photo logs, reports, and deliverables all ride on the same file model: potentially yes if `slatedrop_uploads` becomes the canonical cross-app file table and gets origin/version/share metadata. Not yes in the current split state.
- What needs to be normalized first:
  - settle `slatedrop_uploads` versus `unified_files`
  - finish `file_folders` to `project_folders` migration cleanup
  - unify share token models
  - add origin metadata and versioning baseline
- What pieces already exist for tokenized public links:
  - upload tokens via `project_external_links`
  - external response tokens via `project_external_links`
  - direct file share tokens via `slate_drop_links` code paths, though migration evidence is missing

# 6. PROJECT / ENTITY MODEL AUDIT

Core project model:
- `projects` and `project_members` in `supabase/migrations/20260223_create_projects.sql`
- Project metadata column added in `supabase/migrations/20260223_upgrade_projects.sql`
- Scoped project access helper in `lib/projects/access.ts`

Project tool tables found in migrations:
- `project_rfis`, `project_submittals`, `project_budgets`, `project_tasks` in `supabase/migrations/20260224_project_core_tools.sql`
- `project_punch_items`, `project_daily_logs` and enhancements in `supabase/migrations/20260225_project_tools_enhancement.sql`
- `project_observations` in `supabase/migrations/20260303_project_observations.sql`
- `project_stakeholders`, `project_contracts` in `supabase/migrations/20260227_management_tables.sql`
- `project_notifications` in `supabase/migrations/20260224_notifications.sql`
- `project_activity_log` in `supabase/migrations/20260303110000_project_activity_log.sql`

Files attached to projects:
- Files are tied to project folders and S3 prefixes via `project_folders` plus `slatedrop_uploads`.
- Contracts also reference `file_upload_id` added in `supabase/migrations/20260227_management_file_link_fix.sql` and used in `app/api/projects/[projectId]/management/contracts/analyze/route.ts`.

Comments/audit trail entities:
- There is no generic comments system.
- Audit-like tracking exists in `project_activity_log` and notification-style events in `project_notifications`.

Tag/metadata/origin linkage:
- Projects have `metadata`.
- Individual tool tables often have dedicated columns or JSON arrays such as `photos`.
- No general linked-entity pattern exists for files or cross-app artifacts beyond `project_id` and some targeted foreign keys.

Answers:
- What can become the shared project/entity backbone: `projects` plus `project_members`, `project_folders`, and `project_activity_log` are the strongest current backbone.
- Can Site Walk or Photo Log attach cleanly to current project structures: yes, more easily than Tour Builder. `project_punch_items`, `project_daily_logs`, `project_observations`, and `photo-report` flows already sit in the project model.
- Is there a generic linked-entity pattern already present: only partially. The nearest reusable pattern is `project_id` plus targeted entity tables; there is no universal polymorphic entity-link table.
- Where would tour records connect to projects without causing duplication: create a dedicated `project_tours` or `tour_scenes` family keyed by `project_id`, with files stored in project folders such as `360 Tours`, instead of duplicating project or file records.

# 7. APP SHELL / ROUTING AUDIT

Current route structure:
- Platform homepage and marketing: `app/page.tsx`, `app/features/*`
- Dashboard home: `app/dashboard/page.tsx`
- Dashboard-tab routes under route group but exposed as top-level URLs: `/analytics`, `/tours`, `/design-studio`, `/content-studio`, `/geospatial`, `/virtual-studio`, `/my-account`, `/integrations`, `/project-hub`
- Standalone top-level routes already exist for `/slatedrop`, `/market`, `/athlete360`, `/plans`, `/share/[token]`, `/upload/[token]`, `/external/respond/[token]`

Dashboard-only assumptions:
- Shared shells assume dashboard navigation and `DashboardTabShell` in many modules.
- Scaffolded modules are still written primarily as dashboard tabs, not productized standalone apps.

Public app pages:
- No true `/apps` directory exists.
- There are marketing pages in `app/features/`, including `app/features/360-tour-builder/page.tsx`.

Public share pages:
- `app/share/[token]/page.tsx`
- `app/upload/[token]/page.tsx`
- `app/external/respond/[token]/page.tsx`

Install/download surfaces:
- There is a PWA manifest in `app/manifest.ts`.
- There are no dedicated install/download app directory surfaces.

Answers:
- Can the repo safely add an `/apps` directory and standalone routes: yes. App Router structure is flexible enough, and top-level modules already coexist. The bigger issue is entitlement hardening, not routing capability.
- What routing collisions or auth assumptions will break:
  - middleware does not yet protect all top-level app routes
  - many standalone-capable pages are implemented as dashboard-tab shells
  - some tab routes rely on nav gating instead of strong page-level access denial
- Where should standalone app pages live: a new top-level `app/apps/` subtree is the cleanest choice for future standalone app shells, onboarding, pricing, and PWA-specific install surfaces.
- Where should public share pages live: keep them top-level and public, but normalize around `app/share/*`, `app/upload/*`, and `app/external/*` or consolidate under a dedicated public access namespace later.

# 8. STATE MANAGEMENT / SHARED SERVICE LAYER AUDIT

Observed global/shared state:
- Zustand is barely used; the clear example is `src/lib/useAnalyticsStore.ts`.
- Most module state is local component state or custom hooks in `lib/hooks/`.

Shared services already present:
- Org/auth context: `lib/server/org-context.ts`
- API auth wrappers: `lib/server/api-auth.ts`
- Project access: `lib/projects/access.ts`
- Project activity logging: `lib/projects/activity-log.ts`
- SlateDrop storage/path helpers: `lib/slatedrop/storage.ts`, `lib/slatedrop/helpers.ts`, `lib/slatedrop/projectArtifacts.ts`
- Billing: `lib/billing.ts`, `lib/billing-server.ts`
- Market runtime helpers: `lib/market/*`

Duplication / UI coupling:
- A lot of project-tool business logic still lives directly inside long page components under `app/(dashboard)/project-hub/[projectId]/*/page.tsx`.
- `DashboardClient.tsx`, `MarketClient.tsx`, and several project tool pages are still large, stateful, and UI-coupled.
- Analytics state sits under `src/lib/`, unlike most repo code.

Upload/file/share duplication:
- SlateDrop has strong hook extraction for upload/mutation/transfer flows in `lib/hooks/useSlateDrop*`.
- Share-link logic is still split across different route families and table models.

API client patterns:
- Most client code uses `fetch()` directly.
- There is no shared typed API client layer.

Answers:
- Which shared services already exist: org context, project access, project activity logging, file path/storage helpers, Stripe customer resolution, and Market runtime helpers.
- What business logic is too coupled to UI right now: project tool CRUD forms/tables, analytics fetching/state, some dashboard widgets, and the scaffolded app-tab shells.
- What must be extracted before multiple apps can be built safely:
  - standalone entitlement resolution service
  - canonical file/share service layer
  - app registration/module config layer
  - API client abstractions for reusable app modules

# 9. PWA / MOBILE / OFFLINE AUDIT

What exists:
- Manifest exists at `app/manifest.ts`.
- It sets `display: "standalone"`, `start_url: "/"`, and a single SVG icon.

What does not exist in live code:
- No service worker
- No install prompt handling (`beforeinstallprompt` not found)
- No offline queue
- No IndexedDB, Dexie, or localforage implementation
- No background sync

Mobile readiness observations:
- Upload flows are browser-based and could work on mobile browsers.
- `app/upload/[token]/page.tsx` and the external response portal are plausible mobile surfaces.
- Project Hub field modules such as punch, observations, photos, and daily logs are closer to PWA-first candidates than Tour Builder.

Answers:
- Which apps are realistic as PWA first: Site Walk, Photo Log, and lightweight external-response/upload workflows.
- Is there any current offline/upload queue foundation: no live foundation beyond the manifest.
- What is missing for Site Walk / Photo Log mobile-first behavior:
  - offline queue and retry persistence
  - camera-first capture and background upload resiliency
  - low-connectivity cache for project lists and recent work
  - explicit mobile UX shells independent from dashboard tab chrome

# 10. 360 TOUR BUILDER READINESS AUDIT

Existing routes/components:
- Dashboard tab route: `app/(dashboard)/tours/page.tsx`
- Dashboard shell: `components/dashboard/ToursShell.tsx`
- Marketing/feature page: `app/features/360-tour-builder/page.tsx`

What exists now:
- `components/dashboard/ToursShell.tsx` is a coming-soon placeholder.
- `app/features/360-tour-builder/page.tsx` is a marketing page with a demo iframe using Pannellum CDN and a local demo asset.

What does not exist now:
- No tour tables
- No scene model
- No hotspot model
- No autosave or save APIs
- No panorama upload pipeline specialized for tours
- No public tour share/viewer route
- No quota enforcement specific to tours
- No analytics for tours beyond generic planned analytics copy

Viewer tech:
- Marketing demo uses Pannellum via CDN iframe in `app/features/360-tour-builder/page.tsx`.

Answers:
- What is already real vs just UI: almost entirely UI/marketing. There is no live Tour Builder application backend.
- What is broken or placeholder: the dashboard route is a placeholder; the feature page is promotional and does not represent production Tour Builder capability.
- What exact backend/storage/share systems are missing before first launch:
  - dedicated tour tables
  - scene/hotspot persistence
  - upload/processing flows for 360 assets
  - public/shareable viewer routes
  - entitlement and quota checks
  - linkage into projects and file organization
- Which parts should be reused vs rebuilt:
  - reuse shared auth, org/project access, `project_folders`, `slatedrop_uploads`, Stripe customer path, and public-link patterns
  - rebuild the actual tour domain model, authoring UI, viewer routes, and sharing logic

# 11. MARKET ROBOT ISOLATION CHECK

Current market routes/components/services/tables:
- Page: `app/market/page.tsx`
- Main client: `components/dashboard/MarketClient.tsx`
- Subcomponents: `components/dashboard/market/*`
- Hooks: `lib/hooks/useMarket*`
- Services/runtime: `lib/market/*`
- APIs: `app/api/market/*`
- Cron: `/api/market/scheduler/tick` in `vercel.json`
- Tables/migrations: `market_bot_runtime`, `market_bot_runtime_state`, `market_trades`, `market_watchlist`, `market_tab_prefs`, `market_plans`, `market_scheduler_lock`, and related enhancements in `supabase/migrations/20260224*`, `20260305_market_enhancements.sql`, `20260309_market_plans.sql`

State summary:
- Market is architecturally separate from customer app-ecosystem work.
- Access is internal-only through `canAccessMarket`, not product entitlements.
- It has its own user-level runtime, scheduler, and trading integrations.

Could it conflict with shared app infrastructure:
- Only lightly. It shares auth, Supabase, and Next routes, but it does not currently share billing or customer-facing entitlements.
- Scheduler and external API usage raise operational complexity, but not direct conflict with app modularization.

Top blockers:
1. Large, complex UI/client surface in `components/dashboard/MarketClient.tsx`
2. Significant env/dependency surface for Polymarket and wallet flows
3. Background scheduler and trading logic add ops risk

Risk of touching now vs later:
- Risk of touching now: medium to high because it has scheduler, runtime state, wallet, and external trading dependencies.
- Risk of leaving it isolated and fixing later: low for app-ecosystem work. It is sufficiently isolated to defer while building shared customer app foundations.

# 12. DATABASE / SCHEMA / MIGRATIONS MAP

Current canonical tables visible in tracked migrations:
- Org/auth-related assumed by runtime: `organizations`, `organization_members`, `profiles`
- Project core: `projects`, `project_members`
- Project tooling: `project_rfis`, `project_submittals`, `project_budgets`, `project_tasks`, `project_punch_items`, `project_daily_logs`, `project_observations`, `project_stakeholders`, `project_contracts`, `project_notifications`, `project_activity_log`
- File/folder: `project_folders`, `project_external_links`
- Contacts/calendar: `org_contacts`, `contact_projects`, `contact_files`, `calendar_events`
- Market: `market_bot_runtime`, `market_bot_runtime_state`, `market_watchlist`, `market_tab_prefs`, `market_plans`, plus additional market tables in other market migrations

Suspected canonical runtime tables not fully represented in tracked migrations:
- `slatedrop_uploads` is clearly live in code but not found in the tracked migration files reviewed here.
- `slate_drop_links` is used in live code but no tracked migration was found.

Suspected legacy or split concepts:
- `unified_files`
- `file_folders`
- Potential old `plan` fallback column on `organizations` instead of `tier`

Missing tables needed for app ecosystem foundation:
- `org_feature_flags` or equivalent app entitlement table
- canonical app registry or app subscription table if not using feature flags only
- tour-specific tables (`project_tours`, `tour_scenes`, `tour_hotspots`, or similar)
- file audit/share/version tables if `slatedrop_uploads` remains canonical

Recommended do-not-touch-yet tables:
- Market runtime tables, because they are isolated and operationally sensitive
- `project_external_links`, until its dual-use contract is explicitly normalized
- Any undocumented runtime file tables until the canonical file model is chosen

# 13. ENV / INFRA / PROCESSING AUDIT

Infrastructure in live code:
- Supabase: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- S3: `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `SLATEDROP_S3_BUCKET`
- Stripe: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_*`
- Resend: `RESEND_API_KEY`, `EMAIL_FROM`, `NEXT_PUBLIC_APP_URL`
- Google Maps: `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`, `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID`
- Market/Polymarket: `NEXT_PUBLIC_POLYMARKET_SPENDER`, `POLYMARKET_API_KEY`, `POLYMARKET_API_SECRET`, `POLYMARKET_API_PASSPHRASE`, `POLYMARKET_CLOB_HOST`, `POLYMARKET_CLOB_ORDER_PATH`, `POLYMARKET_CLOB_ORDER_TYPE`, `POLYMARKET_CLOB_FEE_RATE_BPS`, `MARKET_SCHEDULER_SECRET`, `CRON_SECRET`, multiple `MARKET_*` tuning envs
- OpenAI: `OPENAI_API_KEY`

Queue/background processing:
- No generalized queue system is present.
- Market scheduler uses cron hitting `app/api/market/scheduler/tick/route.ts`.
- ZIP and audit exports are synchronous request-time operations.

Image/video/360 processing tools:
- No dedicated image/video/transcoding pipeline was found.
- Tour Builder demo only embeds a viewer.

GPU-heavy assumptions:
- None found in live code.

Answers:
- What current infrastructure can support thousands of users if quotas are controlled:
  - Supabase auth/data for moderate SaaS scale
  - S3 for file storage
  - Stripe org-level billing
  - Next/Vercel for standard web/API workloads
  - only if expensive synchronous file packaging and ad hoc AI/Market operations are controlled
- What likely cost bombs exist:
  - synchronous ZIP/audit pack generation
  - uncontrolled file storage growth
  - public share bandwidth
  - OpenAI contract analysis
  - Market external API/scheduler churn
- What should be usage-metered or delayed:
  - large ZIP exports
  - high-frequency public sharing/downloads
  - AI analysis jobs
  - future 360 media hosting/processing

# 14. COST-CONTROL / MARGIN-CONTROL AUDIT

Top 15 cost risks:
1. Raw S3 storage growth through `slatedrop_uploads` with no retention tiers or archive lifecycle visible.
2. Large folder ZIP generation in `app/api/slatedrop/zip/route.ts`, which downloads every file and recompresses in-process.
3. Project audit export in `app/api/slatedrop/project-audit-export/route.ts`, which fetches every project file and builds ZIPs synchronously.
4. Public file sharing through `/share/[token]` can amplify bandwidth without quota enforcement.
5. Upload portals can increase inbound storage without strict app-level quotas.
6. No file-version lifecycle means future versioning could double or triple storage unless controlled.
7. Tour Builder would be storage-heavy the moment 360 assets are added.
8. Contract analysis in `app/api/projects/[projectId]/management/contracts/analyze/route.ts` uses OpenAI when `OPENAI_API_KEY` is present.
9. Market scheduler/API calls may become noisy if env caps are loosened.
10. No generic app usage-metering layer exists today.
11. Share/download audit is not canonical, making abuse hard to monitor.
12. Contact files create a second file-like storage surface through `contact_files`.
13. Google Maps and geospatial surfaces can become cost drivers if high-volume map rendering grows.
14. No cold-storage/archive strategy is visible for older project assets.
15. Database growth from logs, notifications, shares, and project tools is currently unmanaged by retention policy.

Recommended controls:
- Shared infrastructure controls:
  - org/app storage quotas
  - download/export rate limits
  - archive lifecycle and retention policies
  - public token expiry defaults
  - AI usage quotas
  - per-org export size thresholds
- Per-app controls:
  - Tour Builder storage and share-view quotas
  - Site Walk/Photo Log upload caps and retention windows
  - per-app overage/upgrade messaging

# 15. FOUNDATION GAP LIST

| Foundation Capability | Exists / Partial / Missing / Broken | Evidence | Why It Matters | Safest Implementation Location | Dependency Order |
|---|---|---|---|---|---|
| `org_feature_flags` or app entitlement model | Missing | docs only; no migration/runtime implementation | Enables standalone app subscriptions | `supabase/migrations/` + `lib/entitlements.ts` + `lib/server/org-context.ts` | 1 |
| Shared billing entitlement merge | Missing | Stripe only updates `organizations.tier` in `app/api/stripe/webhook/route.ts` | Required for app SKU plus platform tier coexistence | `lib/billing.ts`, webhook, new app billing routes | 2 |
| `/apps` directory | Missing | no `app/apps/` subtree | Clean standalone app shelling | `app/apps/` | 3 |
| Dashboard app-control widget | Missing | no current “your apps” control surface | Needed for visibility and upgrades | dashboard/account area | 4 |
| Shared file backbone | Partial | live `slatedrop_uploads` + `project_folders`, but split with `unified_files` assumptions | All apps need one artifact backbone | `app/api/slatedrop/*`, `lib/slatedrop/*`, schema | 1 |
| Tokenized share links | Partial | upload/external links exist; direct file shares use undocumented `slate_drop_links` | Public delivery is core app surface | normalize around one share service | 2 |
| Upload request links | Exists | `app/api/slatedrop/request-link/route.ts`, `app/upload/[token]/page.tsx`, `project_external_links` | Reusable cross-app inbound workflow | current SlateDrop/public upload flow | 2 |
| Deliverable packs | Partial | ZIP export and audit export exist, no curated pack model | Needed for SlateDrop/deliverables monetization | SlateDrop service layer + new tables | 4 |
| Version history baseline | Missing | no live version model on canonical file table | Needed for safe shared file backbone | file schema + service layer | 3 |
| Shared audit/event logging | Partial | `project_activity_log` exists, no file/share audit log | Needed for support/debugging/security | `lib/projects/activity-log.ts` plus file audit table | 2 |
| Public share routes | Partial | `/share/[token]`, `/upload/[token]`, `/external/respond/[token]` exist but fragmented | Core external collaboration surface | keep top-level public routes but unify token model | 2 |
| Project-to-app linkage model | Missing | no app registry or generic app asset linkage table | Needed for upgrade continuity | new app domain tables keyed by `project_id` | 3 |
| PWA install support | Partial | `app/manifest.ts` exists, no install flow | Needed for field-first apps | shared app shell/pwa layer | 5 |
| Offline upload queue | Missing | no service worker or IndexedDB implementation | Required for field capture apps | shared upload client infrastructure | 6 |
| App usage metrics / quota enforcement | Missing | tier limits exist, app-specific quotas do not | Protects margins | entitlement + billing + usage tables | 3 |
| App-to-platform upgrade continuity | Partial | shared org/project/file backbone exists, but no app entitlement merge | Central business requirement | org entitlement layer + canonical file model | 2 |
| 360 Tour Builder MVP launch prerequisites | Missing | only scaffold and marketing page exist | First paid app cannot launch without this | new tour domain under shared foundations | 4 |

# 16. SAFE BUILD ORDER

Phase 0: architecture cleanup/prep
- Likely touched files:
  - `lib/entitlements.ts`
  - `lib/server/org-context.ts`
  - `middleware.ts`
  - `app/(dashboard)/*/page.tsx`
  - `app/api/slatedrop/*`
  - `app/share/[token]/page.tsx`
  - `app/api/slatedrop/secure-send/route.ts`
- New files likely needed:
  - entitlement merge helper
  - canonical share-link service
  - schema notes / context doc updates
- Must test before continuing:
  - auth redirects
  - dashboard route denials
  - SlateDrop upload/list/download/share
- Must NOT refactor yet:
  - Market runtime
  - broad dashboard UI decomposition unrelated to access/storage

Phase 1: shared foundation
- Build:
  - org-scoped app entitlements
  - billing-to-entitlement webhook merge
  - canonical file/share model decision
  - app-control/account surface
- Likely touched files:
  - `lib/entitlements.ts`
  - `app/api/billing/checkout/route.ts`
  - `app/api/stripe/webhook/route.ts`
  - `lib/billing.ts`
  - `lib/billing-server.ts`
  - `app/api/slatedrop/secure-send/route.ts`
  - `app/share/[token]/page.tsx`
  - migrations
- Must test:
  - org upgrade/downgrade flows
  - app entitlement resolution
  - public token flows

Phase 2: 360 Tour Builder launch prep
- Build:
  - tour tables and APIs
  - project linkage
  - 360 asset upload/storage path
  - public viewer/share route
- Likely touched files:
  - new `app/apps/tour-builder/*`
  - new `app/api/tours/*`
  - `lib/slatedrop/projectArtifacts.ts` or adjacent tour storage helpers
  - new migrations
- Must test:
  - upload and save
  - project attachment
  - public viewer and entitlement gating
- Must NOT refactor yet:
  - whole dashboard module system

Phase 3: Site Walk / Photo Log shared capture backbone
- Build:
  - mobile-first app shells
  - shared capture entity patterns
  - optional offline queue after core online workflows are stable
- Likely touched files:
  - project tool routes/components
  - new capture-focused app routes
  - shared upload client infrastructure
- Must test:
  - mobile upload flows
  - cross-linking into project records

Phase 4: app directory / subscriptions / install flows
- Build:
  - `/apps` landing and install surfaces
  - standalone pricing/subscription purchase flows
  - PWA install UX where justified
- Likely touched files:
  - new `app/apps/page.tsx`
  - app-specific plan pages and subscription routes
  - `app/manifest.ts` and future service worker files
- Must test:
  - guest-to-app signup
  - standalone-to-platform upgrade continuity
  - route authorization across app surfaces

# 17. DEBUGGABILITY / MAINTAINABILITY PLAN

Recommendations:
- Shared contracts/types should live under `lib/types/` and be organized by app domain, not only by dashboard page.
- App service layers should live under `lib/` by domain, similar to `lib/slatedrop/`, `lib/projects/`, and `lib/market/`.
- UI shells should live under `components/apps/` for future standalone apps and under existing `components/shared/` for common chrome.
- First tests should target auth guards, entitlement resolution, shared upload/share flows, and billing webhook behavior.
- Feature flags/app entitlements should be enforced server-side first in page routes and APIs, not only in nav or client shells.
- Avoid tight coupling by making dashboard tabs wrappers around app-domain services and reusable components, not the primary home of business logic.
- Naming/folder conventions to adopt now:
  - `app/apps/<app-key>/` for standalone app shells
  - `app/api/<domain>/` for domain APIs
  - `lib/<domain>/` for domain services
  - `lib/types/<domain>.ts` for domain types
  - one canonical file/share service, not parallel upload/share implementations

# 18. FINAL DELIVERABLES

A. Current readiness score: 56/100 for app ecosystem launch

B. Fastest path to first paid app:
- keep shared auth/org/project/storage backbone
- add org-scoped app entitlements and billing merge
- normalize canonical file/share model
- build a narrow Tour Builder MVP as a real standalone route set instead of expanding the current dashboard placeholder

C. Highest-risk architectural debt:
- split file/share model across `slatedrop_uploads`, `unified_files`, `file_folders`, `project_folders`, `project_external_links`, and undocumented `slate_drop_links`

D. Minimal foundation package to build next:
1. `org_feature_flags` or equivalent app entitlement table
2. webhook + `getEntitlements()` merge logic
3. canonical file/share model decision and cleanup
4. hard server-side route enforcement for app access
5. `/apps` shell and app-control/account UI

E. Questions that only runtime/manual testing can answer:
- Does the production database actually contain all runtime tables implied by code, especially `slate_drop_links` and `slatedrop_uploads` schema details not visible in tracked migrations?
- Which dashboard-tab routes are currently reachable by authenticated users who lack implied entitlements, beyond what static source inspection shows?
- How reliable are current public token flows under expiry, reuse, and org-boundary edge cases?
- What are the actual upload and ZIP performance limits on Vercel for large project folders?
- Are there production data dependencies on `unified_files` that source inspection alone cannot see?

# 19. APPENDIX A: AUDITED ROUTES AND FILE SURFACES

This appendix lists the major route and backend surfaces inspected during the audit so a follow-on assistant can quickly resume from source-backed context instead of re-mapping the repo from scratch.

Audited page routes:
- `app/page.tsx`
- `app/dashboard/page.tsx`
- `app/market/page.tsx`
- `app/slatedrop/page.tsx`
- `app/share/[token]/page.tsx`
- `app/upload/[token]/page.tsx`
- `app/external/respond/[token]/page.tsx`
- `app/features/360-tour-builder/page.tsx`
- `app/(dashboard)/analytics/page.tsx`
- `app/(dashboard)/ceo/page.tsx`
- `app/(dashboard)/content-studio/page.tsx`
- `app/(dashboard)/design-studio/page.tsx`
- `app/(dashboard)/geospatial/page.tsx`
- `app/(dashboard)/integrations/page.tsx`
- `app/(dashboard)/my-account/page.tsx`
- `app/(dashboard)/project-hub/page.tsx`
- `app/(dashboard)/project-hub/[projectId]/layout.tsx`
- `app/(dashboard)/tours/page.tsx`
- `app/(dashboard)/virtual-studio/page.tsx`

Audited auth and org files:
- `middleware.ts`
- `app/login/page.tsx`
- `app/api/auth/signup/route.ts`
- `app/api/auth/bootstrap-org/route.ts`
- `app/auth/callback/route.ts`
- `lib/server/org-context.ts`
- `lib/server/org-bootstrap.ts`
- `lib/server/api-auth.ts`
- `lib/projects/access.ts`

Audited billing files:
- `app/api/billing/checkout/route.ts`
- `app/api/billing/portal/route.ts`
- `app/api/billing/credits/checkout/route.ts`
- `app/api/stripe/webhook/route.ts`
- `lib/billing.ts`
- `lib/billing-server.ts`
- `lib/stripe.ts`

Audited SlateDrop/storage/share files:
- `app/api/slatedrop/upload-url/route.ts`
- `app/api/slatedrop/complete/route.ts`
- `app/api/slatedrop/files/route.ts`
- `app/api/slatedrop/folders/route.ts`
- `app/api/slatedrop/project-folders/route.ts`
- `app/api/slatedrop/provision/route.ts`
- `app/api/slatedrop/download/route.ts`
- `app/api/slatedrop/delete/route.ts`
- `app/api/slatedrop/rename/route.ts`
- `app/api/slatedrop/move/route.ts`
- `app/api/slatedrop/zip/route.ts`
- `app/api/slatedrop/request-link/route.ts`
- `app/api/slatedrop/secure-send/route.ts`
- `app/api/slatedrop/project-audit-export/route.ts`
- `lib/slatedrop/projectArtifacts.ts`
- `lib/slatedrop/provisioning.ts`
- `lib/slatedrop/storage.ts`
- `lib/slatedrop/folderTree.ts`

Audited project and Project Hub APIs:
- `app/api/projects/create/route.ts`
- `app/api/projects/route.ts`
- `app/api/projects/summary/route.ts`
- `app/api/projects/[projectId]/route.ts`
- `app/api/projects/[projectId]/recent-files/route.ts`
- `app/api/projects/[projectId]/records/route.ts`
- `app/api/projects/[projectId]/external-links/route.ts`
- `app/api/projects/[projectId]/rfis/route.ts`
- `app/api/projects/[projectId]/submittals/route.ts`
- `app/api/projects/[projectId]/budget/route.ts`
- `app/api/projects/[projectId]/budget/snapshot/route.ts`
- `app/api/projects/[projectId]/schedule/route.ts`
- `app/api/projects/[projectId]/schedule/snapshot/route.ts`
- `app/api/projects/[projectId]/daily-logs/route.ts`
- `app/api/projects/[projectId]/punch-list/route.ts`
- `app/api/projects/[projectId]/observations/route.ts`
- `app/api/projects/[projectId]/photo-report/route.ts`
- `app/api/projects/[projectId]/management/contracts/route.ts`
- `app/api/projects/[projectId]/management/contracts/analyze/route.ts`
- `app/api/projects/[projectId]/management/reports/route.ts`
- `app/api/projects/[projectId]/management/stakeholders/route.ts`

Audited analytics and shared dashboard APIs:
- `app/api/dashboard/summary/route.ts`
- `app/api/dashboard/widgets/route.ts`
- `app/api/analytics/summary/route.ts`
- `app/api/analytics/reports/route.ts`
- `app/api/analytics/export/route.ts`
- `app/api/analytics/ai-insight/route.ts`

Audited Market files:
- `app/api/market/*`
- `app/api/market/scheduler/tick/route.ts`
- `components/dashboard/MarketClient.tsx`
- `components/dashboard/market/*`
- `lib/market/*`
- `lib/hooks/useMarket*`

Audited major migrations:
- `supabase/migrations/20260223_create_projects.sql`
- `supabase/migrations/20260223_upgrade_projects.sql`
- `supabase/migrations/20260223_create_project_folders.sql`
- `supabase/migrations/20260224_project_core_tools.sql`
- `supabase/migrations/20260225_project_tools_enhancement.sql`
- `supabase/migrations/20260227_management_tables.sql`
- `supabase/migrations/20260227_document_control_workflow.sql`
- `supabase/migrations/20260224_notifications.sql`
- `supabase/migrations/20260303110000_project_activity_log.sql`
- `supabase/migrations/20260303_project_observations.sql`
- `supabase/migrations/20260305_contacts_calendar.sql`
- `supabase/migrations/20260224_external_response_links.sql`
- `supabase/migrations/20260305_market_enhancements.sql`
- `supabase/migrations/20260309_market_plans.sql`

# 20. APPENDIX B: PHASE 0 BUILD-READY CHECKLIST

This is the concrete pre-app foundation checklist implied by the report. It is intentionally narrow and ordered so a follow-on implementation chat can work through it without broad refactors.

Phase 0A. Harden entitlement enforcement
- Add server-side page gating to `app/(dashboard)/tours/page.tsx`.
- Add server-side page gating to `app/(dashboard)/project-hub/page.tsx`.
- Review and align `app/(dashboard)/design-studio/page.tsx`, `app/(dashboard)/content-studio/page.tsx`, `app/(dashboard)/geospatial/page.tsx`, and `app/(dashboard)/virtual-studio/page.tsx` so they deny access server-side instead of relying on navigation visibility.
- Expand `middleware.ts` only if route-level auth consistency needs to move earlier in the request path.
- Test: auth redirect behavior, denied-module behavior, internal-only route behavior.

Phase 0B. Lock the canonical file backbone decision
- Choose `slatedrop_uploads` as the canonical active file table unless runtime evidence disproves that.
- Audit every remaining `unified_files` and `file_folders` reference in live code and classify each as delete, compatibility cleanup, or migration target.
- Keep `project_folders` as the canonical folder table.
- Test: upload, list, move, rename, delete, download, ZIP export, project delete.

Phase 0C. Normalize public token systems
- Document the contract difference between `project_external_links` and `slate_drop_links`.
- Verify whether `slate_drop_links` exists in production schema; if not, create tracked migration before relying on it further.
- Decide whether upload links, external response links, and direct share links remain separate models or unify under one token service.
- Test: `/share/[token]`, `/upload/[token]`, `/external/respond/[token]` expiry, org scoping, and one-time-use behavior.

Phase 0D. Prepare app entitlement foundation
- Add tracked migration for `org_feature_flags` or equivalent app entitlement table.
- Design merge flow from `organizations.tier` plus app flags into `getEntitlements()`.
- Expose resolved app access in `lib/server/org-context.ts` so both pages and APIs can enforce it consistently.
- Test: org with platform tier only, org with app flag only, org with both.

Phase 0E. Prepare billing merge points without broad billing rewrite
- Extend billing mapping so standalone app products can be added without breaking tier subscriptions.
- Add webhook handling that writes app entitlements instead of only `organizations.tier`.
- Preserve current org-level Stripe customer model.
- Test: existing tier checkout, portal flow, webhook replay, future app entitlement writeback path.

Phase 0F. Add foundation visibility in account/dashboard UX
- Add an account/dashboard surface showing current org plan, app access, and locked apps.
- Do not build full `/apps` marketplace UI yet; build just enough visibility to support entitlement debugging and future purchases.
- Test: owner/admin experience, non-admin experience, locked app messaging.

Phase 0G. Guardrails for implementation chat
- Do not refactor Market Robot while doing Phase 0.
- Do not build Tour Builder domain tables yet until file/share/entitlement choices are settled.
- Do not introduce a second auth or billing system.
- Do not broad-refactor Project Hub UI just to satisfy architecture cleanup.
- Prefer targeted server-side access, schema normalization, and service extraction only where required for app readiness.