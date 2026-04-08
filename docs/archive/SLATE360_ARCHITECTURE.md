# Slate360 — Immutable Architecture Reference

> Feed this file to any AI agent before it touches the codebase.
> Last verified: 2026-04-05 | Branch: `fix/critical-foundation-patch`

---

## 1. Stack

| Layer | Technology | Version |
|---|---|---|
| Framework | Next.js | 15 (App Router, RSC-first) |
| Runtime | React | 19 |
| Language | TypeScript | 5.x, `strict: true` |
| Auth + DB | Supabase | Hosted — ref `hadnfcenpcfaeclczsmm` |
| File Storage | AWS S3 | Bucket `slate360-storage`, region `us-east-2` |
| Billing | Stripe | Webhooks + Checkout Sessions |
| Hosting | Vercel | Auto-deploy from `main` |
| Error Monitoring | Sentry | `@sentry/nextjs` (client + server + edge) |
| Analytics | PostHog | `posthog-js` (privacy guard on portal routes) |
| Rate Limiting | Upstash Redis | Sliding window via `lib/server/rate-limit.ts` |
| UI Components | Shadcn UI | `new-york` style, Tailwind CSS variables |
| Icons | Lucide React | Via Shadcn |
| Fonts | Geist Sans / Geist Mono | `next/font/google` |

## 2. Auth Model

### Supabase Clients

```typescript
// Browser (client component)
import { createClient } from "@/lib/supabase/client";

// Server component / Route handler (user-scoped, respects RLS)
import { createServerSupabaseClient } from "@/lib/supabase/server";

// Service role (bypasses RLS — admin operations ONLY)
import { createAdminClient } from "@/lib/supabase/admin";
```

### Super Admin Gate

**Rule**: `is_super_admin` MUST be read from `app_metadata` ONLY.

```typescript
// CORRECT — app_metadata is admin-writable only
const isSuperAdmin = user.app_metadata?.is_super_admin === true;

// NEVER — user_metadata is user-writable via supabase.auth.updateUser()
// user.user_metadata?.is_super_admin  ← PRIVILEGE ESCALATION VECTOR
```

**Enforcement layers**:
1. `middleware.ts` — returns raw `403` for any `/super-admin` path without the flag.
2. `app/(admin)/super-admin/page.tsx` — defence-in-depth server component check.

**To grant access**: Set `is_super_admin: true` in user's `app_metadata` via Supabase Dashboard or Admin API.

### Route Auth Wrappers

```typescript
import { withAuth, withProjectAuth } from "@/lib/server/api-auth";
import { ok, badRequest, serverError } from "@/lib/server/api-response";

// Basic auth (resolves user + orgId)
export const GET = (req: NextRequest) =>
  withAuth(req, async ({ admin, user, orgId }) => {
    // ...
    return ok(data);
  });

// Project-scoped auth (resolves user + orgId + projectId + membership)
export const GET = (req: NextRequest, ctx: ProjectRouteContext) =>
  withProjectAuth(req, ctx, async ({ admin, projectId, project }) => {
    // ...
    return ok(data);
  });
```

### Access Control Routes

| Route Group | Gate |
|---|---|
| `/ceo` (internal) | `resolveServerOrgContext().canAccessCeo` |
| `/market` (internal) | `resolveServerOrgContext().canAccessMarket` |
| `/athlete360` (internal) | `resolveServerOrgContext().canAccessAthlete360` |
| Subscription features | `getEntitlements()` via `lib/entitlements.ts` |

Internal routes (`/ceo`, `/market`, `/athlete360`) are NOT subscription-tier features.

## 3. Subscription & Entitlements

### Tier Hierarchy
```
trial < creator < model < business < enterprise
```

### Entitlements Source
```typescript
import { getEntitlements } from "@/lib/entitlements";
import { resolveOrgEntitlements } from "@/lib/server/org-feature-flags";
```

`getEntitlements(tier)` returns a pure JS map of capabilities per tier.
`resolveOrgEntitlements(orgId)` merges tier entitlements + standalone app flags from DB.

Entitlements are **never defined inline** — always import from `lib/entitlements.ts`.

### Standalone Apps (Walled Garden)

Standalone app purchases (`tour_builder`, `punchwalk`) are stored in `org_feature_flags` table.
Users with standalone apps but no platform subscription (`tier === "trial"`) are walled into their app routes only.

**Middleware enforcement** (`middleware.ts`):
1. Queries `org_feature_flags` for ALL authenticated users (tier-independent).
2. Sets `isStandaloneOnly = true` when user has standalone flags AND `(!orgTier || orgTier === "trial")`.
3. Redirects standalone-only users away from platform routes (`/dashboard`, `/project-hub`, etc.) to their allowed app routes.

## 4. Billing (Stripe as SSOT)

Stripe is the **single source of truth** for all billing state.

### Webhook Flow (`app/api/stripe/webhook/route.ts`)

1. Signature verification via `stripe.webhooks.constructEvent()`.
2. **Event INSERT first** — `stripe_events` table with PK dedup (`code === "23505"` = already processed).
3. **Then** process mutations in switch block.
4. Handled events: `checkout.session.completed`, `customer.subscription.created/updated/deleted`.

### Key Functions

| Function | What It Does |
|---|---|
| `updateOrganizationTier(orgId, tier)` | Sets tier + storage_limit_bytes on organizations table |
| `addPurchasedCredits(orgId, amount)` | **Atomic** RPC — `SET credits_balance = credits_balance + amount` |
| `upsertAppFlag(orgId, appId, active)` | Sets standalone app flag in `org_feature_flags` |
| `resolveOrgIdFromCustomer(stripe, customerId)` | Resolves org_id from Stripe customer metadata |

### Credits
- Column: `organizations.credits_balance` (integer, default 0)
- Increment: Supabase RPC `add_purchased_credits(p_org_id, p_amount)` — atomic, TOCTOU-safe.
- **Never** read-then-write credits in application code.

## 5. File Storage (S3 + Presigned URLs)

### Pattern

```
Client → POST /api/slatedrop/upload-url → Server generates presigned PUT URL
Client → PUT directly to S3 presigned URL → S3
Server → records file metadata in Supabase
```

### Key Files

| File | Purpose |
|---|---|
| `lib/s3.ts` | S3 client singleton, bucket constant, `buildS3Key()` |
| `lib/s3-utils.ts` | `deleteS3Object()`, `deleteS3Objects()`, `recoverOrgStorage()` |
| `app/api/slatedrop/upload-url/route.ts` | Presigned URL generator with quota enforcement |
| `lib/uploads/validate-upload-permissions.ts` | Shared upload permission + quota validation |

### S3 Key Structure
```
orgs/{orgId}/{folderId}/{timestamp}_{sanitized_filename}
```

### Upload Workflow
1. Client calls `/api/slatedrop/upload-url` with filename, size, contentType.
2. Server validates auth, checks quota (`storage_used_bytes < storage_limit_bytes`).
3. Server generates presigned PUT URL (15 min expiry) via `@aws-sdk/s3-request-presigner`.
4. Client uploads directly to S3 using the presigned URL.
5. Server inserts a pending record in `slatedrop_uploads`.

### Security Rules
- S3 key is sanitized: `filename.replace(/[^a-zA-Z0-9._\-() ]/g, "_")` — prevents path traversal.
- Download URLs are presigned GET URLs with short expiry (5–60 min).
- Bucket is NOT publicly readable.

## 6. Deliverable Portal (Token-Gated Access)

### Route: `/portal/[token]`

Public, unauthenticated page for sharing deliverables (tours, reports, walks).

### Atomic View Claiming
- Uses Supabase RPC `claim_deliverable_view(p_token)` — single atomic UPDATE.
- Checks `is_revoked`, `expires_at`, `max_views` in the WHERE clause.
- Increments `view_count` and sets `last_viewed_at` in one operation.
- Returns the updated row on success, empty set on denial.
- **Never** read-then-check-then-update views in application code.

### Branding
Portal pages apply org branding via CSS custom properties:
```typescript
style={{
  "--brand-primary": branding.primary_color,
  "--brand-accent": branding.accent_color,
  "--brand-font": branding.font_family,
}}
```

## 7. Middleware Stack (`middleware.ts`)

Execution order:
1. Create Supabase server client, refresh session.
2. **Walled Garden check** — query `org_feature_flags` for all authed users, determine `isStandaloneOnly`.
3. **Super admin gate** — `/super-admin` paths require `app_metadata.is_super_admin`.
4. **Auth-protected routes** — redirect unauthenticated users to `/login`.
5. **Walled Garden enforcement** — redirect standalone-only users away from platform routes.
6. **Portal CSP** — add `frame-ancestors 'none'` on portal routes.

## 8. Security Posture

### Headers (via `next.config.ts`)
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
- Full `Content-Security-Policy` with explicit `connect-src`, `script-src`, `frame-src`

### PII Scrubbing
Sentry `beforeSend` hooks strip: `Authorization` headers, `Cookie` headers, and any field named `token`, `secret`, `password`, or `authorization`.

PostHog has a privacy guard — disabled on `/portal` routes.

### Rate Limiting
Infrastructure: Upstash Redis sliding window (`lib/server/rate-limit.ts`).
Currently applied to: `/api/auth/signup` (5/15min), `/api/auth/resend-confirmation` (3/15min).

## 9. Project Structure Conventions

```
app/                    # Next.js App Router pages
  (dashboard)/          # Auth-protected dashboard routes
  (admin)/              # Admin-only routes (super-admin)
  (public)/             # Public routes (portal)
  api/                  # API route handlers
  apps/                 # Standalone app routes (Walled Garden)
components/
  ui/                   # Shadcn UI primitives (DO NOT EDIT)
  shared/               # Cross-module shared components
  dashboard/            # Dashboard-specific components
  project-hub/          # Project Hub components
  slatedrop/            # SlateDrop components
lib/
  types/                # Shared TypeScript types (single source)
  server/               # Server-only utilities (auth, branding, etc.)
  supabase/             # Supabase client factories
  hooks/                # React hooks
  market/               # Market Robot utilities
  projects/             # Project access/scoping
supabase/
  migrations/           # SQL migration files (timestamped)
ops/                    # Operational configs (bug registry, manifests)
```

### Import Rules
- Imports flow **downward**: `lib/` → `components/` → `app/`
- Types from `lib/types/` — never redefine inline.
- One component per file. One hook per file.
- No file over 300 lines — extract before adding logic.

## 10. Database (Supabase) Conventions

### Table Ownership
- Folder writes use `project_folders` (not `file_folders`).
- Column renames: `punchwalk_*` → `site_walk_*` (completed 2026-04).

### RPC Functions (Atomic Operations)
| Function | Purpose |
|---|---|
| `claim_deliverable_view(p_token)` | Atomic portal view increment |
| `add_purchased_credits(p_org_id, p_amount)` | Atomic credit balance increment |
| `increment_org_storage(target_org_id, bytes_delta)` | Atomic storage quota adjustment |
| `count_org_seats(target_org_id)` | Atomic seat counting |

### Dedup Pattern (Stripe Events)
```sql
INSERT INTO stripe_events (id, type) VALUES ($1, $2);
-- On PK conflict (code 23505): event already claimed → skip processing.
-- On success: proceed with mutations.
```

## 11. Environment Variables

All env vars are documented in `.env.example`.
Secrets that exist only in Vercel (never in `.env.local`): Stripe keys, Sentry auth token.
Required env groups: Supabase, AWS, Stripe, Sentry, PostHog, Google Maps, Resend/SendGrid.

## 12. Commands

```bash
npm run dev              # Start dev server
npm run typecheck        # Full TypeScript check (must pass before push)
npm run build            # Production build
npm run verify:release   # Full release gate check
bash scripts/check-file-size.sh  # Enforce 300-line limit
```
