# Slate360 Platform — Build File

Last Updated: 2026-04-13
Module Status: **Active — production infrastructure**

## Purpose

The platform is the shared shell that hosts all Slate360 app modules. It provides authentication, organization management, the dashboard, project hub, navigation, middleware, billing integration, and shared UI primitives.

## Current Real Implementation State

### What Works (Real)
- Auth flow: signup → email confirmation → org bootstrap → dashboard
- Supabase auth with 3 client types (browser, server, admin)
- Organization context resolution (`lib/server/org-context.ts` — 202 lines)
- API auth wrappers: `withAuth()`, `withProjectAuth()`, `withAppAuth()` (`lib/server/api-auth.ts` — 189 lines)
- Feature flags: `resolveOrgEntitlements()` reads 3 sources (tier, flags, app subscriptions)
- Middleware: auth redirect + route protection (`middleware.ts` — 139 lines)
- Rate limiting via Upstash Redis (`lib/server/rate-limit.ts` — 70 lines)
- Response helpers (`lib/server/api-response.ts` — 47 lines)
- Org bootstrap on first login (`lib/server/org-bootstrap.ts` — 167 lines)
- Branding per org (`lib/server/branding.ts` — 84 lines)
- Dashboard with widget grid (10+ widget types)
- Project Hub with 14 sub-tab pages
- My Account with 5 tabs (profile, billing, security, notifications, data tracker)
- Marketing homepage with app showcase + pricing
- Walled garden dashboard (authenticated shell)
- PWA manifest and installability
- Sentry error tracking (client, server, edge configs)
- E2E tests with Playwright (4 spec files)

### What Is Partial
- Nav gating: `DashboardHeader`/`MobileModuleBar` use `getEntitlements(tier)` but `TIER_MAP` has all booleans true for all tiers — gating is cosmetic
- Dashboard sidebars: hard-coded links, no entitlements-aware rendering
- `WalledGardenDashboard` does not pass entitlements to children
- Project Hub sub-pages (9 of 14 exceed 300-line limit — need extraction)
- Athlete360 route (stub only)
- Super Admin (stub only)

### What Is Missing
- Real nav gating — sidebars should show/hide based on subscription
- `TIER_MAP` differentiation — trial should not have all features enabled
- Offline sync infrastructure for PWA (`lib/offline-queue.ts` exists but not integrated broadly)

## Auth Routes

| Route | File | Purpose |
|-------|------|---------|
| `/login` | `app/login/page.tsx` | Login page |
| `/signup` | `app/signup/page.tsx` | Signup page |
| `/forgot-password` | `app/forgot-password/page.tsx` | Password reset |
| `/auth/callback` | `app/auth/callback/route.ts` | OAuth callback |
| `/auth/confirm` | `app/auth/confirm/route.ts` | Email confirmation |

## Auth API Routes

| Endpoint | Purpose |
|----------|---------|
| `POST /api/auth/signup` | User registration |
| `POST /api/auth/bootstrap-org` | Create org on first login |
| `POST /api/auth/resend-confirmation` | Resend email |

## Dashboard Routes (62+ pages)

| Area | Key Routes |
|------|-----------|
| Dashboard | `/dashboard` — main overview with widgets |
| My Account | `/my-account` — 5 tabs |
| Project Hub | `/project-hub` — list + `/[projectId]/` with 14 sub-tabs |
| Tours | `/tours` — tour list (dashboard context) |
| Integrations | `/integrations` — third-party connections |

## Server Utilities (11 files, 1380 lines)

| File | Lines | Purpose |
|------|-------|---------|
| `lib/server/org-context.ts` | 202 | Org context resolution |
| `lib/server/api-auth.ts` | 189 | Auth wrappers |
| `lib/server/org-bootstrap.ts` | 167 | First-login org setup |
| `middleware.ts` | 139 | Route protection |
| `lib/server/webhook-helpers.ts` | 138 | Stripe webhook processing |
| `lib/server/org-feature-flags.ts` | 136 | Entitlements resolver |
| `lib/server/quota-check.ts` | 86 | Usage quota enforcement |
| `lib/server/branding.ts` | 84 | Org branding |
| `lib/server/rate-limit.ts` | 70 | Upstash rate limiting |
| `lib/server/validate.ts` | 65 | Request validation |
| `lib/server/api-response.ts` | 47 | Response helpers |

## Supabase Clients

| File | Purpose |
|------|---------|
| `lib/supabase/client.ts` (8 lines) | Browser client |
| `lib/supabase/server.ts` (27 lines) | Server component client |
| `lib/supabase/admin.ts` (22 lines) | Service role client |

## Key Dashboard Components

| Component | Purpose | Status |
|-----------|---------|--------|
| `DashboardClient.tsx` (264 lines) | Main dashboard orchestrator | Under limit |
| `DashboardOverview.tsx` | Overview section | Active |
| `DashboardWidgetGrid.tsx` | Widget layout | Active |
| `DashboardWidgetRenderer.tsx` | Widget type dispatch | Active |
| `DashboardHeader.tsx` (286 lines) | Top nav | Under limit, gating cosmetic |
| `walled-garden-dashboard.tsx` (82 lines) | Auth shell | Extracted, under limit |

## Core Database Tables

| Table | Purpose |
|-------|---------|
| `organizations` | Orgs with tier, branding, subscription |
| `organization_members` | Roles and permissions |
| `org_stripe_customer_id` | Stripe link |
| `org_app_subscriptions` | Per-app subscriptions |
| `org_branding` | Custom branding |
| `org_feature_flags` | Feature toggles |
| `projects` | Project records |
| `project_activity_log` | Audit trail |
| `project_notifications` | User notifications |
| `credit_transactions` | Credit usage |

## Known Monolith Files (Exceed 300-line limit)

| File | Lines | Status |
|------|-------|--------|
| `project-hub/[projectId]/management/page.tsx` | 931 | Needs extraction |
| `project-hub/[projectId]/photos/page.tsx` | 599 | Needs extraction |
| `project-hub/[projectId]/submittals/page.tsx` | 579 | Needs extraction |
| `project-hub/[projectId]/schedule/page.tsx` | 465 | Needs extraction |
| `project-hub/[projectId]/drawings/page.tsx` | 448 | Needs extraction |
| `project-hub/[projectId]/budget/page.tsx` | 421 | Needs extraction |
| `project-hub/[projectId]/punch-list/page.tsx` | 403 | Needs extraction |
| `project-hub/[projectId]/daily-logs/page.tsx` | 358 | Needs extraction |
| `project-hub/[projectId]/rfis/page.tsx` | 339 | Needs extraction |

## Biggest Blockers

1. **P1: Nav gating cosmetic** — `TIER_MAP` has all app booleans true for all tiers, sidebars are hard-coded
2. **P1: 9 monolith files in Project Hub** — all exceed 300-line limit
3. **P2: WalledGardenDashboard doesn't pass entitlements** — children can't gate based on subscription
4. **P2: Dashboard demo data** — `lib/dashboard/demo-data.ts` exists, unclear if used in production

## Verification Checklist

- [ ] Auth flow works: signup → confirm → login → dashboard
- [ ] Org bootstrap creates correct DB records
- [ ] Dashboard loads with widgets for authenticated users
- [ ] My Account tabs all functional
- [ ] Project Hub CRUD works
- [ ] Middleware redirects unauthenticated users
- [ ] Rate limiting active on API routes
- [ ] No console errors on any platform page
