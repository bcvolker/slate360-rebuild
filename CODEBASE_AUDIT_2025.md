# Slate360 — Comprehensive Codebase Audit

**Generated:** 2025-07-24 (automated, factual — no aspirational content)
**Repo:** `bcvolker/slate360-rebuild`
**Commit:** `4ecd518` (HEAD of `main`)
**Runtime:** Node 20.19.2 / npm 10.8.2

---

## 1. Repo Structure Overview

```
slate360-rebuild/                 # Single Next.js app (NOT a monorepo)
├── app/                          # 31 page routes + 99 API routes
│   ├── (admin)/                  # /ceo, /super-admin (internal admin tools)
│   ├── (apps)/                   # /tour-builder, /site-walk (standalone entitlement-gated apps)
│   ├── (dashboard)/              # /dashboard, /analytics, /plans, /my-account, /integrations, /tours, etc.
│   ├── (public)/                 # /portal/[token] (public deliverable viewer)
│   ├── api/                      # 99 server-side API routes
│   ├── athlete360/               # /athlete360 (internal only — placeholder)
│   ├── auth/                     # /auth/callback (Supabase OAuth callback)
│   ├── external/                 # /external/respond/[token] (external form response)
│   ├── login/ signup/ forgot-password/  # Auth pages
│   ├── market/                   # /market (Market Robot — Polymarket trading)
│   ├── share/                    # /share/[token] (SlateDrop share links)
│   ├── slatedrop/                # /slatedrop (SlateDrop file manager — CURRENTLY SAME AS /dashboard)
│   ├── site-walk/                # /site-walk/[projectId]/deliverables/new (BlockEditor — NO PERSISTENCE)
│   └── upload/                   # /upload/[token] (external file upload portal)
├── components/                   # React components (dashboard/, project-hub/, slatedrop/, ui/, widgets/, etc.)
├── lib/                          # Business logic, hooks, types, Supabase clients, S3, Stripe, market
├── supabase/                     # 48 migration files, seed data
├── scripts/                      # Diagnostic, smoke test, and ops scripts
├── e2e/                          # 4 Playwright E2E test files
├── ops/                          # Operational manifests (bug-registry, module-manifest, release-gates)
├── slate360-context/             # 50+ markdown context/planning docs (NOT code)
├── _archived_docs/               # Archived planning docs
├── docs/                         # Additional reference docs
├── public/                       # Static assets
└── v0-staging/                   # v0 design import staging area
```

**Total files:** 574 TypeScript/TSX files

---

## 2. Framework & Dependency Inventory

### Core Stack

| Layer | Package | Version | Notes |
|-------|---------|---------|-------|
| Framework | Next.js | 15.0.5 | App Router. Pages router exists but deprecated (`pages/` folder). |
| React | React + React DOM | 19.0.1 | Latest concurrent features available. |
| Language | TypeScript | 5.x | Strict mode enabled in tsconfig. |
| Styling | Tailwind CSS | 4.x | PostCSS pipeline. Custom theme in globals.css. |
| UI Kit | shadcn/ui | (components in `components/ui/`) | ~30 primitives (button, card, dialog, sidebar, etc.) |
| State (client) | Zustand | 5.0.11 | Used for dashboard widget state, tour builder state. |
| Server state | TanStack React Query | 5.90.21 | Used for data fetching + cache. |
| URL state | nuqs | 2.8.9 | Query-string state management. |
| Validation | Zod | 3.25.76 | Schema validation for API inputs. |

### Backend / Infrastructure

| Service | Package | Version | Usage |
|---------|---------|---------|-------|
| Database / Auth | Supabase SSR + JS | 0.8.0 / 2.97.0 | Postgres DB, Row-Level Security, Auth, real-time (not used). Project: `hadnfcenpcfaeclczsmm` |
| Payments | Stripe | 20.3.1 | Checkout, webhooks, customer portal, 4-tier subscription + per-app billing. |
| File Storage | AWS S3 (client-s3) | 3.995.0 | Presigned uploads/downloads. Bucket: `slate360-storage`, region: `us-east-2`. |
| Email | Resend | 6.9.2 | Invite, notification, deliverable emails. Sender: `noreply@slate360.ai`. |
| Email (backup) | Nodemailer | 8.0.1 | Configured, likely legacy. |
| Rate Limiting | Upstash Redis | 2.0.8 / 1.37.0 | Rate-limit API endpoints (auth, market). |
| Error Tracking | Sentry | 10.47.0 | Client + server + edge configs. |
| Analytics | PostHog | 1.364.7 | Product analytics (provider installed). |
| Maps | @vis.gl/react-google-maps | 1.7.1 | Google Maps for project locations, weather widget. |

### Feature-Specific

| Feature | Package | Version | Usage |
|---------|---------|---------|-------|
| 360 Panorama | @photo-sphere-viewer/* | 5.14.1 | Tour scene viewer + hotspot navigation. |
| PDF Generation | jsPDF + html2canvas | 4.2.0 / 1.4.1 | Site Walk deliverable export (planned). |
| PDF Viewing | pdfjs-dist + react-pdf | 5.4.624 / 10.4.0 | Document viewer in Project Hub. |
| ZIP | JSZip | 3.10.1 | Multi-file download compression. |
| Charts | Recharts | 3.7.0 | Analytics dashboard charts. |
| Crypto Wallet | Viem + Wagmi + MetaMask SDK | 2.46.3 / 3.5.0 / 0.33.1 | Market Robot wallet connection. |
| Prediction Market | @polymarket/clob-client | 5.2.4 | Market Robot Polymarket trading. |
| Speech (types only) | @types/react-speech-recognition | 3.9.6 | Installed but NO implementation exists. |
| AI | OpenAI (via fetch) | N/A (no SDK) | Contract analysis endpoint uses raw API call. |

### Dev Tooling

| Tool | Version | Notes |
|------|---------|-------|
| Playwright | 1.54.2 | E2E testing. |
| Vitest | 4.1.2 | Unit testing (severely underutilized). |
| ESLint | flat config (eslint.config.mjs) | |
| Husky + lint-staged | 9.1.7 / 16.4.0 | Pre-commit hooks. |

---

## 3. App Modules — Status Map

| Module | Route(s) | Status | Auth Gate | Subscription Gate | Notes |
|--------|----------|--------|-----------|-------------------|-------|
| **Dashboard** | `/dashboard` | ✅ REAL | `resolveServerOrgContext()` | Tier-based limits | Widget grid, org overview. 3 monolith components (see §14). |
| **Project Hub** | `/project-hub/[id]/*` | ✅ REAL | `resolveServerOrgContext()` | Tier limits projects | 10 management tabs (RFIs, submittals, budget, schedule, etc.). Each tab is a large page file. |
| **SlateDrop** | `/slatedrop`, `/share/[token]`, `/upload/[token]` | ✅ REAL | Auth + token-based public | Quota-based | File management, presigned S3 uploads, share links, external upload portals. |
| **Tour Builder** | `/tour-builder` | ✅ REAL | `resolveOrgEntitlements()` | `org_feature_flags` | 360 panorama scene editor with hotspots. DB tables: `project_tours`, `tour_scenes`. |
| **Site Walk** | `/site-walk/[id]/deliverables/new` | 🟡 PARTIAL | `resolveOrgEntitlements()` | `org_feature_flags` | BlockEditor UI exists (4 components). **NO API routes. NO persistence. NO offline.** |
| **Market Robot** | `/market` | ✅ REAL | `canAccessMarket` | Internal only | Polymarket trading bot. Scheduler cron. Live wallet integration. 3131-line monolith. |
| **CEO Command** | `/ceo` | ✅ REAL | `canAccessCeo` | Internal only | Platform admin dashboard (org metrics, user stats). |
| **Super Admin** | `/super-admin` | ✅ REAL | `canAccessCeo` | Internal only | Raw Supabase data explorer. |
| **Athlete360** | `/athlete360` | 🟡 PLACEHOLDER | `canAccessAthlete360` | Internal only | Route exists, minimal content. |
| **Analytics** | `/analytics` | ✅ REAL | `resolveServerOrgContext()` | Tier-gated | Dashboard analytics tab with charts. |
| **Plans** | `/plans` | ✅ REAL | Auth | N/A | Pricing page. All prices currently show "TBD". |
| **My Account** | `/my-account` | ✅ REAL | Auth | N/A | Account settings, org management. |
| **Integrations** | `/integrations` | ✅ REAL | Auth | N/A | Integration cards — all "Coming Soon" (no real connections). |
| **Design Studio** | `/design-studio` | ❌ NO PAGE | N/A | N/A | Dashboard tab exists in navigation but `page.tsx` does **not** exist. |
| **Content Studio** | `/content-studio` | ❌ NO PAGE | N/A | N/A | Dashboard tab exists in navigation but `page.tsx` does **not** exist. |
| **Virtual Studio** | `/virtual-studio` | ❌ NO PAGE | N/A | N/A | Dashboard tab exists in navigation but `page.tsx` does **not** exist. |
| **Geospatial** | `/geospatial` | ❌ NO PAGE | N/A | N/A | Dashboard tab exists in navigation but `page.tsx` does **not** exist. |

---

## 4. Core Platform Audit (Auth → Billing → Storage → Navigation)

### 4a. Authentication

**Status: ✅ FULLY WORKING**

| Component | File | Notes |
|-----------|------|-------|
| Middleware | `middleware.ts` (139 lines) | Super-admin gate → auth check → callback passthrough → walled garden redirect. |
| Signup | `app/signup/page.tsx` | Email/password signup → Supabase auth → org bootstrap (auto-creates org + membership). |
| Login | `app/login/page.tsx` | Email/password → `supabase.auth.signInWithPassword()`. |
| Callback | `app/auth/callback/route.ts` | Exchange auth code → create session → redirect to dashboard. |
| Forgot Password | `app/forgot-password/page.tsx` | Supabase password reset flow. |
| Session Resolver | `lib/server/resolve-org.ts` | `resolveServerOrgContext()` — returns org, membership, tier, entitlements. Used by all server components. |
| API Auth | `lib/server/api-auth.ts` | `withAuth()` and `withProjectAuth()` wrappers for API routes. |
| Supabase Clients | `lib/supabase/{client,server,admin}.ts` | Browser client, server client (cookies), admin client (service role). |

**Auth flow:** Signup → Supabase creates user → `after_signup_trigger` DB function bootstraps org + profile → Callback route sets session → Middleware redirects to `/dashboard`.

### 4b. Billing

**Status: ✅ FULLY WORKING (prices currently TBD)**

| Component | File | Notes |
|-----------|------|-------|
| Tier System | `lib/entitlements.ts` | 4 tiers: `trial` → `standard` → `business` → `enterprise`. Returns limits (projects, storage, members, widgets). |
| Stripe Integration | `lib/stripe.ts` + `lib/billing.ts` | Checkout session creation, customer portal, price ID mapping. |
| App Billing | `lib/billing-apps.ts` | Standalone app purchases (Tour Builder $49/mo, PunchWalk $49/mo) via `org_feature_flags`. |
| Webhook | `app/api/stripe/webhook/route.ts` | Handles: `checkout.session.completed`, `customer.subscription.updated/deleted`, `invoice.payment_failed`. Updates org tier + credits atomically. past_due grace → hard downgrade. |
| Checkout API | `app/api/stripe/checkout/route.ts` | Creates Stripe Checkout session for tier upgrades or app purchases. |
| Portal API | `app/api/stripe/portal/route.ts` | Redirects to Stripe Customer Portal for subscription management. |
| Seat Enforcement | `app/api/org/members/invite/route.ts` | Checks `entitlements.maxMembers` before allowing invites. |

**Stripe products (all REAL in Stripe, but UI shows TBD):**
- Standard Monthly/Annual — price IDs in env vars
- Business Monthly/Annual — price IDs in env vars
- Tour Builder — `STRIPE_PRICE_APP_TOUR_BUILDER_MONTHLY`
- PunchWalk — `STRIPE_PRICE_APP_PUNCHWALK_MONTHLY`
- Credit packs (Starter/Growth/Pro) — price IDs in env vars

### 4c. File Storage

**Status: ✅ FULLY WORKING**

| Component | File | Notes |
|-----------|------|-------|
| S3 Client | `lib/s3.ts` | AWS S3 client, bucket: `slate360-storage`, region: `us-east-2`. |
| Presigned URLs | `lib/s3-utils.ts` | PUT (15min TTL) for uploads, GET (1hr TTL) for downloads. |
| Upload Validation | `lib/uploads/validate-upload-permissions.ts` | Checks quota, file type, file size before generating presigned URL. |
| Folder Management | `app/api/slatedrop/folders/route.ts` | CRUD for `project_folders` table. Auto-provisions 16 system folders per project. |
| Share Links | `app/api/slatedrop/secure-send/route.ts` | Generates time-limited share tokens for file access. |
| External Upload | `app/upload/[token]/page.tsx` + API | Token-gated upload portal for external users (no auth required). |

**Storage limits by tier:**
- Trial: 500MB
- Standard: 5GB
- Business: 25GB
- Enterprise: 100GB

### 4d. Navigation

**Status: ✅ WORKING but contains stale entries**

| Component | File | Notes |
|-----------|------|-------|
| Navbar | `components/Navbar.tsx` (316 lines) | Main top navigation. |
| Sidebar | Dashboard sidebar in `DashboardClient.tsx` | Lists all dashboard tabs including ones with NO page (Design Studio, Content Studio, Virtual Studio, Geospatial). |
| Walled Garden | Middleware enforces auth on all `/dashboard/*`, `/project-hub/*`, `/slatedrop/*` routes. |

**Issue:** Navigation links exist for `/design-studio`, `/content-studio`, `/virtual-studio`, `/geospatial` but these pages don't exist → user would see 404.

---

## 5. Site Walk Audit

### What EXISTS

| Layer | Component | File | Lines | Status |
|-------|-----------|------|-------|--------|
| DB | `site_walk_sessions` table | `supabase/migrations/20250409...` | — | ✅ Table exists with RLS. Columns: id, org_id, project_id, created_by, title, status, started_at, completed_at, metadata. |
| DB | `site_walk_items` table | — | — | ❌ **DOES NOT EXIST** |
| DB | `site_walk_deliverables` table | — | — | ❌ **DOES NOT EXIST** |
| UI | Block Editor | `components/site-walk/BlockEditor.tsx` | 118 | ✅ Rich text editor with block types (text, photo, observation, measurement). **No persistence** — state is local-only. |
| UI | Block Renderer | `components/site-walk/BlockRenderer.tsx` | 196 | ✅ Renders block types to visual output. |
| UI | Block Toolbar | `components/site-walk/BlockToolbar.tsx` | 51 | ✅ Add-block toolbar. |
| Types | Block types | `components/site-walk/types/blocks.ts` | 52 | ✅ TypeScript types for block data model. |
| Route | Deliverable editor | `app/site-walk/[projectId]/deliverables/new/page.tsx` | ~50 | ✅ Server component that renders BlockEditor. |
| Entitlement | Feature flag | `lib/entitlements.ts` | — | ✅ `canAccessStandalonePunchwalk` gated via `org_feature_flags`. |
| Billing | Stripe product | `lib/billing-apps.ts` | — | ✅ `STRIPE_PRICE_APP_PUNCHWALK_MONTHLY` ($49/mo). |

### What DOES NOT EXIST

| Layer | Component | Impact |
|-------|-----------|--------|
| **DB** | `site_walk_items` table | Cannot store individual walk items (photos, observations, measurements). |
| **DB** | `site_walk_deliverables` table | Cannot store generated deliverable reports. |
| **API** | Session CRUD (`/api/site-walk/sessions`) | No way to create/list/update/delete walk sessions. |
| **API** | Item capture (`/api/site-walk/items`) | No way to save captured data from the field. |
| **API** | Deliverable generation (`/api/site-walk/deliverables`) | No way to compile items into a deliverable report. |
| **API** | PDF export | No server-side PDF generation (jsPDF installed but not wired). |
| **Offline** | Service Worker | App does not work offline AT ALL. |
| **Offline** | IndexedDB / local cache | No local data persistence. If network drops, ALL data is lost. |
| **Camera** | Camera capture API | No `getUserMedia()` call. `Permissions-Policy` header currently BLOCKS camera. |
| **GPS** | Location tagging for items | Geolocation used only for weather widget, not for site walk item capture. |
| **Background Sync** | Queue for offline submissions | No background sync API usage. |
| **Mobile** | Native camera/GPS integration | No Capacitor, Expo, or TWA. |

### Site Walk Build Gap Summary

To ship a functional Site Walk app, ALL of the above "does not exist" items must be built. The existing UI components are a starting point for the deliverable editor only — the core capture-in-the-field workflow has zero implementation.

---

## 6. Database & Migrations

### Migration Count: 48 files in `supabase/migrations/`

### Key Tables (grouped by module)

**Core Platform:**
| Table | RLS | Purpose |
|-------|-----|---------|
| `organizations` | ✅ | Orgs with name, slug, tier, stripe IDs. |
| `organization_members` | ✅ | User-org membership (role: owner/admin/member). |
| `profiles` | ✅ | User profiles (display_name, avatar_url, bio). |
| `projects` | ✅ | Projects with name, org_id, location, status. |
| `project_members` | ✅ | User-project membership + role. |
| `project_folders` | ✅ | Hierarchical file folders per project (16 auto-provisioned). |
| `project_activity_log` | ✅ | Audit log for project events. |

**Project Hub Management:**
| Table | RLS | Purpose |
|-------|-----|---------|
| `project_rfis` | ✅ | Requests for Information. |
| `project_submittals` | ✅ | Submittal tracking. |
| `project_budgets` | ✅ | Budget line items. |
| `project_tasks` | ✅ | Task management. |
| `project_punch_items` | ✅ | Punch list items. |
| `project_daily_logs` | ✅ | Daily field logs. |
| `project_observations` | ✅ | Observation records. |

**Site Walk:**
| Table | RLS | Purpose |
|-------|-----|---------|
| `site_walk_sessions` | ✅ | Walk session metadata. **Table exists, but no API reads/writes it.** |

**Tours:**
| Table | RLS | Purpose |
|-------|-----|---------|
| `project_tours` | ✅ | Tour metadata (name, description, project_id). |
| `tour_scenes` | ✅ | Individual 360° scenes with hotspot data. **Note:** Code references `file_size_bytes` column but migration may not include it. |

**Market Robot:**
| Table | RLS | Purpose |
|-------|-----|---------|
| `market_bot_settings` | — | Legacy bot config. |
| `market_bot_runtime` | ✅ | Per-user runtime configuration. |
| `market_bot_runtime_state` | ✅ | Current runtime state (scanning, idle, etc.). |
| `market_trades` | ✅ | Trade history. |
| `market_plans` | ✅ | Trading plan definitions. |
| `market_directives` | ✅ | AI directives for market decisions. |
| `market_activity_log` | ✅ | Market action audit trail. |
| `market_scheduler_lock` | ✅ | Prevents concurrent scheduler runs. |
| `market_watchlist` | ✅ | User's watched markets. |
| `market_tab_prefs` | ✅ | UI tab preferences per user. |

**Billing & Access:**
| Table | RLS | Purpose |
|-------|-----|---------|
| `stripe_events` | — | Idempotent webhook event log. |
| `stripe_subscriptions` | — | Subscription state mirror. |
| `org_feature_flags` | ✅ | Per-org feature flags (app access, seats, limits). |
| `deliverable_access_tokens` | ✅ | Share link tokens with expiry. |
| `deliverable_cleanup_queue` | — | Scheduled cleanup of expired tokens. |

**SlateDrop (⚠ WARNING):**
| Table | RLS | Purpose |
|-------|-----|---------|
| `slatedrop_uploads` | ? | File upload records. **NO TRACKED MIGRATION** — may have been created manually or via Supabase dashboard. |
| `slate_drop_links` | ? | Share link records. **NO TRACKED MIGRATION** — same concern. |

### Schema Risks

1. **slatedrop_uploads / slate_drop_links** — No migration file exists for these tables. If they were created manually, they cannot be reproduced in a fresh environment. This is a deployment/recovery risk.
2. **tour_scenes.file_size_bytes** — Code may reference a column that doesn't exist in the migration. Needs verification.
3. **site_walk_items / site_walk_deliverables** — Referenced in planning docs but never created. Must be built for Site Walk.

---

## 7. API Routes Inventory

### Total: 99 API routes

**Auth & Account (8 routes):**
- `POST /api/auth/signup` — Email/password signup
- `POST /api/auth/callback` — OAuth callback
- `GET/POST /api/account/overview` — Account data
- `POST /api/org/members/invite` — Invite member (seat-enforced)
- `DELETE /api/org/members/[id]` — Remove member
- `GET /api/org/members` — List members
- `POST /api/org/update` — Update org settings
- `POST /api/org/bootstrap` — Initial org setup

**Stripe / Billing (4 routes):**
- `POST /api/stripe/checkout` — Create checkout session
- `POST /api/stripe/portal` — Customer portal redirect
- `POST /api/stripe/webhook` — Stripe webhook handler
- `GET /api/stripe/subscription` — Current subscription status

**SlateDrop / Storage (~12 routes):**
- `GET/POST /api/slatedrop/folders` — Folder CRUD
- `POST /api/slatedrop/upload` — Presigned upload URL
- `GET /api/slatedrop/download/[fileId]` — Presigned download URL
- `POST /api/slatedrop/secure-send` — Generate share link
- `POST /api/slatedrop/external-upload` — External upload processing
- `GET /api/slatedrop/quota` — Storage quota check
- Plus several more for file operations, batch operations, etc.

**Project Hub (~15 routes):**
- CRUD for: RFIs, submittals, budgets, tasks, punch items, daily logs, observations, schedule items
- `GET/POST /api/projects` — Project CRUD
- `POST /api/projects/[id]/members` — Project member management
- `POST /api/projects/[id]/management/contracts/analyze` — AI contract analysis (OpenAI)

**Market Robot (~20 routes):**
- `POST /api/market/buy` — Direct buy order
- `GET /api/market/scan` — Market scan
- `GET /api/market/polymarket` — Polymarket data proxy
- `POST /api/market/scheduler/tick` — Cron scheduler (Vercel cron, every 5 min)
- `GET /api/market/scheduler/health` — Scheduler health check
- `GET /api/market/whales` — Whale tracking
- `GET /api/market/system-status` — System status
- Plus: directives, plans, runtime, watchlist, trades, activity log CRUD

**Dashboard (~8 routes):**
- `GET/POST /api/dashboard/widgets` — Widget configuration CRUD
- `GET /api/dashboard/analytics` — Analytics data
- `GET /api/weather` — Weather widget data

**Tours (~6 routes):**
- CRUD for tours and scenes
- `POST /api/tours/scenes/upload` — Scene image upload

**Site Walk: ❌ ZERO API ROUTES**

**Deploy / Diagnostic (3 routes):**
- `GET /api/deploy-info` — Build + deployment metadata
- `GET /api/static-map` — Static map image proxy
- `GET /api/health` — Health check

---

## 8. File Storage Architecture

**Provider:** AWS S3
**Bucket:** `slate360-storage`
**Region:** `us-east-2`
**Access pattern:** Presigned URLs (never direct client→S3)

| Operation | TTL | Auth | File |
|-----------|-----|------|------|
| Upload (PUT) | 15 minutes | `withAuth()` + quota check | `lib/s3-utils.ts` |
| Download (GET) | 1 hour | Token-based or `withAuth()` | `lib/s3-utils.ts` |
| External Upload | Token-scoped | `deliverable_access_tokens` table | `app/upload/[token]` |

**Key path structure:** `orgs/{orgId}/projects/{projectId}/{folderId}/{filename}`

**Quota enforcement:**
- Pre-upload check against tier limits (500MB → 100GB)
- File type validation (allowlist per folder type)
- File size validation

**Missing:**
- No CDN (CloudFront) in front of S3
- No image optimization pipeline
- No thumbnail generation
- No virus scanning

---

## 9. PWA & Mobile Status

### What EXISTS

| Capability | Status | File |
|------------|--------|------|
| Web App Manifest | ✅ | `app/manifest.ts` — display: standalone, orientation: portrait, categories: business+productivity |
| Apple Web App | ✅ | `app/layout.tsx` — apple-mobile-web-app-capable: yes, status-bar-style: default |
| Viewport meta | ✅ | Standard responsive viewport |
| Safe area insets | ✅ | CSS handles notch/safe-area |
| Theme color | ✅ | #000000 (dark mode) |

### What DOES NOT EXIST

| Capability | Status | Impact |
|------------|--------|--------|
| **Service Worker** | ❌ MISSING | App has ZERO offline capability. Cannot cache assets, routes, or data. |
| **IndexedDB** | ❌ MISSING | No local data persistence. No offline data queue. |
| **Camera API** | ❌ MISSING | No `getUserMedia()` anywhere. Plus `Permissions-Policy` header currently BLOCKS camera. |
| **Push Notifications** | ❌ MISSING | No PushManager, no web-push, no notification backend. |
| **Background Sync** | ❌ MISSING | No sync queue for offline-captured data. |
| **Wake Lock** | ❌ MISSING | Screen may dim during active field use. |
| **GPS Tagging** | 🟡 PARTIAL | Geolocation used for weather widget only. Not wired for item capture. |
| **Install Prompt** | ❌ MISSING | No custom install UX (relies on browser-native prompt). |
| **Native Packaging** | ❌ MISSING | No Capacitor, Expo, TWA, or any native wrapper. |

### PWA Gap Summary

The app is currently a **responsive web app** with a manifest, NOT a functional PWA. To work as a field tool (Site Walk), it requires: service worker, IndexedDB, camera access, GPS tagging, background sync, and ideally wake lock. None of these exist.

---

## 10. Realtime & Collaboration

### Status: ❌ NOT IMPLEMENTED

| Capability | Status | Notes |
|------------|--------|-------|
| Supabase Realtime Channels | ❌ | Supabase JS client is installed but `channel()` / `.on()` is never called for user data sync. |
| WebSocket connections | 🟡 | Market Robot connects to Polymarket WebSocket (`wss://`) for price feeds — this is EXTERNAL data only, not collaborative. |
| Push Notifications | ❌ | No backend, no service worker subscription. |
| Collaborative editing | ❌ | No CRDTs, no operational transform, no shared cursors. |
| Activity feed (live) | ❌ | `project_activity_log` is write-only audit trail. No live subscription. Displayed via polling. |
| Presence indicators | ❌ | No "user is online" / "user is viewing this page" features. |

### What would be needed

For live collaboration (e.g., two people on a site walk seeing each other's updates), you would need:
1. Supabase Realtime channel subscriptions on relevant tables
2. Optimistic UI updates with conflict resolution
3. Presence tracking via Supabase Presence or custom WebSocket

---

## 11. Billing & Subscription Architecture

### Tier System

| Tier | Slug | Projects | Storage | Members | Widgets | Price |
|------|------|----------|---------|---------|---------|-------|
| Free Trial | `trial` | 1 | 500MB | 2 | 4 | $0 |
| Standard | `standard` | 10 | 5GB | 10 | 8 | TBD |
| Business | `business` | 50 | 25GB | 50 | 16 | TBD |
| Enterprise | `enterprise` | Unlimited | 100GB | Unlimited | Unlimited | Custom |

**Implementation:** `lib/entitlements.ts` → `getEntitlements(tier)` returns structured limits object.

### Standalone App Billing

| App | Price | Gate | DB Column |
|-----|-------|------|-----------|
| Tour Builder | $49/mo | `org_feature_flags.can_tour_builder` | `can_tour_builder` |
| PunchWalk (Site Walk) | $49/mo | `org_feature_flags.can_punchwalk` | `can_punchwalk` |

These are independent of the tier system. An org on Free Trial can buy Tour Builder access separately.

### Webhook Flow

```
Stripe Event → /api/stripe/webhook
  → Validates signature (STRIPE_WEBHOOK_SECRET)
  → Checks idempotency (stripe_events table)
  → checkout.session.completed → Updates org.tier + org.stripe_customer_id
  → customer.subscription.updated → Syncs tier changes
  → customer.subscription.deleted → Downgrades to trial
  → invoice.payment_failed → Sets past_due flag → grace period → hard downgrade
```

### Billing Risks

1. All UI prices show "TBD" — checkout is disabled for Standard/Business until prices are set.
2. Credit pack billing exists in code but is not exposed in any UI.
3. Enterprise tier has no self-serve checkout (Contact Us only).

---

## 12. Environment Variables

### Total: 112+ unique variables

**Grouped by criticality:**

**CRITICAL (app won't function without these):**
- `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` — DB access
- `SUPABASE_SERVICE_ROLE_KEY` — Admin DB access
- `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` — Payments
- `AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY` — File storage
- `NEXT_PUBLIC_APP_URL` — Redirect URLs

**IMPORTANT (features degrade without these):**
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` — Maps won't load
- `RESEND_API_KEY` — Emails won't send
- `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` — Rate limiting disabled
- `NEXT_PUBLIC_SENTRY_DSN` — Error tracking disabled
- `NEXT_PUBLIC_POSTHOG_KEY` — Analytics disabled
- All `STRIPE_PRICE_*` vars — Specific product checkout fails

**MARKET ROBOT SPECIFIC (15+ vars):**
- `POLYMARKET_API_KEY/SECRET/PASSPHRASE` — Trading auth
- `NEXT_PUBLIC_POLYMARKET_SPENDER` — Wallet approval
- `MARKET_SCHEDULER_SECRET` — Cron auth
- 10+ tuning variables (intervals, limits, capital)

**LEGACY / UNUSED (configured but not referenced in code):**
- `NEXT_PUBLIC_MAPBOX_TOKEN` — Mapbox (not used)
- `ANTHROPIC_API_KEY` — Referenced in .env.example but not in any code
- `SENDGRID_API_KEY` — .env.example only (Resend is active provider)
- `POSTGRES_*` vars — Direct Postgres (app uses Supabase client, not direct connections)
- `GPU_WORKER_SECRET_KEY` / `WORKER_SECRET_KEY` — No worker implementation exists

**Full inventory:** See companion data (112+ vars with exact file references).

---

## 13. Testing Infrastructure

### Test Matrix

| Type | Framework | Files | Coverage |
|------|-----------|-------|----------|
| E2E | Playwright | 4 specs | Auth flows, route health, mobile smoke, maps diagnostic |
| Unit | Vitest | 1 file | Upload permission validation only |
| Smoke Scripts | Node.js (custom) | 6 scripts | Auth guards, Stripe flows, market runtime, mobile endpoints, account paths, market burst |

### What's NOT Tested

- ❌ Dashboard widget rendering / state management
- ❌ Project Hub CRUD operations
- ❌ SlateDrop file operations
- ❌ Market Robot trading logic
- ❌ Tour Builder scene management
- ❌ API route business logic (unit level)
- ❌ Utility functions in `lib/`
- ❌ Hook logic in `lib/hooks/`
- ❌ Billing webhook edge cases
- ❌ Entitlements / tier gating
- ❌ Component rendering (no React Testing Library)

### Test Coverage Estimate: ~15-20% of core flows

The codebase relies heavily on manual testing and smoke scripts rather than automated test suites. Vitest is installed but has exactly 1 test file.

---

## 14. Tech Debt & Risk Inventory

### CRITICAL: File Size Violations

The project's own rule: **No production file over 300 lines.** Current violations:

| File | Lines | Severity |
|------|-------|----------|
| `components/dashboard/MarketClient.tsx` | **3,131** | 🔴 10x over limit |
| `components/dashboard/DashboardClient.tsx` | **1,961** | 🔴 6.5x over limit |
| `components/dashboard/LocationMap.tsx` | **1,892** | 🔴 6.3x over limit |
| `app/(dashboard)/project-hub/[projectId]/management/page.tsx` | **931** | 🔴 3x over limit |
| `app/page.tsx` (marketing homepage) | **780** | 🔴 2.6x over limit |
| `components/ui/sidebar.tsx` | **726** | 🟡 shadcn primitive (less actionable) |
| `app/(dashboard)/project-hub/[projectId]/photos/page.tsx` | **599** | 🟡 2x over |
| `app/(dashboard)/project-hub/[projectId]/submittals/page.tsx` | **580** | 🟡 2x over |
| `components/project-hub/ProjectDashboardGrid.tsx` | **560** | 🟡 1.9x over |
| `components/dashboard/DashboardWidgetRenderer.tsx` | **513** | 🟡 1.7x over |
| + ~24 more files between 300-500 lines | | |

**Total files over 300 lines: ~34**

### HIGH: Missing Migrations

- `slatedrop_uploads` and `slate_drop_links` tables have no tracked migration files. If the production DB were recreated from migrations alone, these tables would be missing. This is a data loss risk for disaster recovery.

### HIGH: Stale Navigation

Dashboard sidebar contains links to pages that don't exist:
- `/design-studio` — no `page.tsx`
- `/content-studio` — no `page.tsx`
- `/virtual-studio` — no `page.tsx`
- `/geospatial` — no `page.tsx`

Users clicking these links see a 404 or blank page.

### MEDIUM: Legacy Code

1. **Pages Router remnant:** `pages/` directory exists with files. Should be fully migrated to App Router or removed.
2. **Creator/Model tier references:** Old 5-tier system references may still exist in some context docs (code has been cleaned to 4-tier).
3. **`@types/react-speech-recognition`** installed but no speech-to-text implementation exists.
4. **Mapbox token** configured in `.env.example` but not used anywhere in code.
5. **Nodemailer** installed alongside Resend — unclear which is primary.

### MEDIUM: Security Concerns

1. **Permissions-Policy blocks camera** — if Site Walk needs camera, this header must be changed.
2. **No CSRF protection** — relies on Supabase auth tokens + same-origin (standard for SPAs, but worth noting).
3. **No virus scanning** on uploaded files.
4. **OpenAI API key** sent via server-side fetch (acceptable, but no request signing).

### LOW: Optimization

1. No image optimization pipeline (no CDN, no thumbnails, no WebP conversion).
2. No ISR or static generation — all pages are dynamic server-rendered.
3. No bundle analysis configured.

---

## 15. Recommended Build Slices (Priority Order)

Based on what exists vs. what's claimed, here are honest build slices:

### Slice 0: Foundation Cleanup (prerequisite)
- Fix stale navigation (remove or stub /design-studio, /content-studio, /virtual-studio, /geospatial links)
- Create tracked migrations for `slatedrop_uploads` and `slate_drop_links`
- Set real Stripe prices and re-enable checkout
- Remove Pages Router remnants

### Slice 1: Site Walk — Core MVP
**Pre-req:** All of Slice 0
1. Create `site_walk_items` table (migration + RLS)
2. Create `site_walk_deliverables` table (migration + RLS)
3. Build Session CRUD API (`/api/site-walk/sessions`)
4. Build Item Capture API (`/api/site-walk/items`) with photo upload to S3
5. Wire BlockEditor to persistence (save/load blocks via API)
6. Build deliverable generation (compile blocks → PDF via jsPDF)
7. Build deliverable share (reuse SlateDrop token-based share system)

### Slice 2: Site Walk — Field-Ready PWA
**Pre-req:** Slice 1 complete
1. Add service worker (Workbox or Serwist) with asset caching
2. Add IndexedDB layer (Dexie.js) for offline data queue
3. Implement camera capture (`getUserMedia()` + fix Permissions-Policy)
4. Add GPS tagging on captured items
5. Add background sync (queue offline items → sync when online)
6. Add wake lock for active field sessions
7. Test on iOS Safari + Android Chrome

### Slice 3: Tour Builder Polish
- Verify `tour_scenes.file_size_bytes` column exists
- Add scene reordering UX
- Add tour sharing/embedding

### Slice 4: Design Studio + Content Studio foundations
- Create page routes
- Define data models
- Build initial UI

### Slice 5: Monolith Extraction
- Split MarketClient.tsx (3131 → ~6 components)
- Split DashboardClient.tsx (1961 → ~5 components)
- Split LocationMap.tsx (1892 → ~4 components)

---

## 16. Truth Table — What's Real vs. What's Not

| Claim | Reality | Evidence |
|-------|---------|----------|
| "Next.js 15 App Router" | ✅ TRUE | `package.json`: next 15.0.5. App Router is primary. |
| "Supabase auth + RLS" | ✅ TRUE | 48 migrations with RLS policies. Auth flow is complete. |
| "Stripe billing with 4 tiers" | ✅ TRUE | Webhook, checkout, portal all work. Prices are TBD in UI. |
| "S3 file storage with quotas" | ✅ TRUE | Presigned URLs, quota enforcement, file validation all implemented. |
| "Site Walk app" | 🟡 PARTIAL | DB session table + 4 UI components exist. ZERO APIs, ZERO offline, ZERO camera, ZERO persistence. Maybe 10% done. |
| "Tour Builder" | ✅ MOSTLY TRUE | DB tables, UI, APIs all exist. Some polish items missing (scene reordering, sharing). ~80% done. |
| "Design Studio" | ❌ FALSE | No `page.tsx`, no API, no DB tables. Navigation link exists but leads to 404. 0% done. |
| "Content Studio" | ❌ FALSE | Same as Design Studio. 0% done. |
| "Virtual Studio" | ❌ FALSE | Same as Design Studio. 0% done. |
| "Geospatial" | ❌ FALSE | LocationMap.tsx exists as a dashboard widget, but `/geospatial` page doesn't exist. Widget ≠ standalone app. |
| "PWA / mobile app" | 🟡 MINIMAL | Has manifest + Apple web app meta (can "Add to Home Screen"). NO service worker, NO offline, NO camera, NO push. It's a responsive website, not a PWA. |
| "Realtime collaboration" | ❌ FALSE | No Supabase channels, no WebSocket for user data, no presence. Market WS is external price feed only. |
| "AI-powered features" | 🟡 MINIMAL | One endpoint: contract analysis via OpenAI. No other AI features implemented. Speech recognition types installed but not used. |
| "Market Robot (Polymarket)" | ✅ TRUE | Full trading bot: scheduler, wallet, execution, risk limits, activity log. Works but is internal-only. |
| "Project Hub" | ✅ TRUE | 10 management tabs with full CRUD: RFIs, submittals, budget, schedule, punch list, daily logs, photos, drawings, observations, tasks. |
| "SlateDrop" | ✅ TRUE | File management with S3, folders, shares, external uploads. Tables may lack migration files (risk). |
| "Email notifications" | ✅ TRUE | Resend integration sends invites, share links, notifications. |
| "Rate limiting" | ✅ TRUE | Upstash Redis rate limiting on auth and market endpoints. |
| "Error tracking" | ✅ TRUE | Sentry client + server + edge configured. |
| "Analytics" | ✅ TRUE | PostHog provider installed. Analytics dashboard with Recharts. |

---

## 17. What Another AI Would Need Next

### If given this audit + a new build plan, the next AI needs:

1. **The new build plan** — which apps are being built, in what order, with what capabilities.

2. **Stripe pricing decisions** — actual dollar amounts for Standard and Business tiers to re-enable checkout.

3. **Site Walk scope definition** — specifically:
   - What data types are captured in the field? (photos, notes, measurements, locations?)
   - What does "offline-first" mean? (Full offline queue? Or just graceful degradation?)
   - What deliverable format? (PDF? Interactive web report? Both?)
   - Who is the end user? (Field worker on a phone? Office worker reviewing on desktop? Both?)

4. **Design Studio / Content Studio / 360 Tour scope** — what do these apps actually DO? There are planning docs but contradictory/aspirational content across 50+ files.

5. **Which planning docs are canonical** — 80+ markdown files contain build plans, roadmaps, and implementation guides. Many contradict each other. The next AI needs to know which 3-5 files represent the CURRENT plan.

6. **Navigation decisions** — should the 4 non-existent pages be removed from nav? Or stubbed with "Coming Soon"?

7. **Migration remediation** — should `slatedrop_uploads` and `slate_drop_links` get retroactive migration files? This is a DevOps question.

8. **Monolith extraction priority** — are the 3 monolith files (MarketClient 3131, DashboardClient 1961, LocationMap 1892) blocking new work? Or can they be deferred?

9. **Testing strategy** — the codebase has near-zero unit tests. Should new features ship with tests? What coverage target?

10. **The entitlements for new apps** — will Design Studio / Content Studio be standalone app purchases (like Tour Builder at $49/mo) or included in tier subscriptions?

---

## Build Plan File Map (for consolidation)

### ACTIVE (likely current intent)

| File | Lines | Content |
|------|-------|---------|
| `slate360-context/SITE_WALK_BUILD_PLAN.md` | 878 | Site Walk implementation plan |
| `slate360-context/APP_ECOSYSTEM_EXECUTION_PLAN.md` | 856 | App ecosystem vision + phased rollout |
| `slate360-context/PLATFORM_ARCHITECTURE_PLAN.md` | 674 | Platform-level architecture decisions |
| `slate360-context/MASTER_BUILD_SEQUENCE.md` | 726 | Ordered build sequence across all modules |
| `slate360-context/REVENUE_ROADMAP.md` | 486 | Monetization strategy + pricing model |
| `slate360-context/apps/APP_ECOSYSTEM_GUIDE.md` | 605 | App ecosystem guide |
| `slate360-context/apps/PUNCHWALK_BUILD_GUIDE.md` | 679 | PunchWalk (Site Walk) build guide |

### PER-MODULE IMPLEMENTATION PLANS

| File | Lines | Module |
|------|-------|--------|
| `slate360-context/dashboard-tabs/tour-builder/BUILD_GUIDE.md` | 1,212 | Tour Builder (most detailed) |
| `slate360-context/dashboard-tabs/content-studio/BUILD_GUIDE.md` | 671 | Content Studio |
| `slate360-context/dashboard-tabs/design-studio/BUILD_GUIDE.md` | 610 | Design Studio |
| `slate360-context/dashboard-tabs/market-robot/IMPLEMENTATION_PLAN.md` | 324 | Market Robot |
| `slate360-context/dashboard-tabs/market-robot/ONGOING_BUILD_TRACKER.md` | 757 | Market Robot tracker |
| `slate360-context/dashboard-tabs/*/IMPLEMENTATION_PLAN.md` | 39-71 each | All other modules (short summaries) |
| `slate360-context/dashboard-tabs/*/START_HERE.md` | 102-150 each | Quick-start guides |

### SUPPORT DOCS

| File | Lines | Content |
|------|-------|---------|
| `slate360-context/DASHBOARD.md` | 276 | Dashboard architecture |
| `slate360-context/BACKEND.md` | 161 | Backend quick reference |
| `slate360-context/SLATEDROP.md` | 259 | SlateDrop architecture |
| `slate360-context/ONGOING_ISSUES.md` | 261 | Active bugs/issues |
| `slate360-context/GUARDRAILS.md` | 180 | Development guardrails |
| `slate360-context/FUTURE_FEATURES.md` | 1,093 | Feature wishlist (aspirational) |
| `slate360-context/FUTURE_MODULES.md` | 334 | Future module concepts |
| `slate360-context/UI_CONSISTENCY.md` | 452 | UI/UX standards |

### ARCHIVED (legacy — conflicts with current plans)

| Folder | Files | Notes |
|--------|-------|-------|
| `_archived_docs/` | 11 files | Old PROJECT_HUB plans, refactor plans, diagnostic handoffs |
| `slate360-context/_archived/` | 7+ files | Old blueprints superseded by current docs |
| `docs/archive/` | Multiple | Historical reference |

### RECOMMENDATION

For consolidation: read the 7 "ACTIVE" files. These represent the most recent planning intent. Everything else is either per-module detail (read on-demand) or archived. The per-module `IMPLEMENTATION_PLAN.md` files (39-71 lines each) are short summaries that could be merged into a single module registry.

**Critical warning:** Many of these docs describe features as "in progress" or "nearly complete" that are actually 0% implemented (Design Studio, Content Studio, Virtual Studio). The truth table in §16 above should be used to calibrate any plan derived from these docs.
