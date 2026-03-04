# Slate360 — Backend, Auth, Billing & Credits Blueprint

**Last Updated:** 2026-03-04
**Context Maintenance:** Update this file whenever auth flows, billing logic, credit system, email templates, database tables, or RLS policies change.
**Cross-reference:** See `FUTURE_FEATURES.md` for the full phased build roadmap (Phases 0–7).

---

## 1. Authentication

### Supabase Auth
- Email/password signup + login
- Magic link (optional)
- Password reset via email
- Email confirmation on signup

### Auth Webhook Bootstrap (on new user signup)
```
signup → Supabase triggers webhook →
  1. Create `profiles` row
  2. Create `organizations` row
  3. Create `organization_members` row (role: "owner")
  4. Create 9 system folders in `project_folders`
  5. Grant 500 trial credits
```

Fallback implemented in app runtime:
- `app/auth/callback/route.ts` now calls `ensureUserOrganization()` after session exchange.
- `app/dashboard/page.tsx` applies a second fallback bootstrap when `orgId` resolves `null`.
- `POST /api/auth/bootstrap-org` is available for authenticated recovery calls.

### Middleware
`middleware.ts` refreshes the auth session on every request. All `/(dashboard)` routes require authentication.

### Code Files
| File | Purpose |
|---|---|
| `middleware.ts` | Session refresh |
| `app/api/auth/resend-confirmation/route.ts` | Resend confirmation email |
| `app/api/auth/signup/route.ts` | Signup handler |
| `app/api/auth/bootstrap-org/route.ts` | Authenticated org bootstrap fallback |
| `lib/supabase/client.ts` | Browser Supabase client |
| `lib/supabase/server.ts` | Server Supabase client (respects RLS) |
| `lib/supabase/admin.ts` | Admin client (bypasses RLS) |
| `lib/server/org-bootstrap.ts` | Ensure org + owner membership exists |

---

## 2. Organization & Membership

### RLS Anchor
All row-level security policies join through `organization_members`:
```
auth.uid() → organization_members.user_id → organization_members.org_id
```

### Key Tables
| Table | Purpose |
|---|---|
| `profiles` | User profile data (name, avatar, preferences) |
| `organizations` | Organization/company record |
| `organization_members` | User ↔ Org membership with role |

### Org Resolution
```typescript
import { resolveServerOrgContext } from "@/lib/server/org-context";
const { orgId, userId, role, tier, isSlateCeo } = await resolveServerOrgContext();
// Returns deterministic defaults if org membership is missing
// isSlateCeo = true when user.email === "slate360ceo@gmail.com"
```

---

## 3. Billing (Stripe)

### Subscription Flow
1. User selects plan on `/plans` page
2. `POST /api/billing/checkout` → creates Stripe Checkout session
3. Stripe redirects to success/cancel URL
4. `POST /api/stripe/webhook` handles events:
   - `checkout.session.completed` → activate subscription
   - `customer.subscription.updated` → update tier
   - `customer.subscription.deleted` → downgrade to trial
   - `invoice.payment_succeeded` → renewal
   - `invoice.payment_failed` → flag for follow-up

### Tier Configuration
Defined in `lib/billing.ts`:
```typescript
// Price IDs from Stripe (set in Vercel env vars):
// STRIPE_PRICE_CREATOR_MONTHLY, STRIPE_PRICE_CREATOR_ANNUAL
// STRIPE_PRICE_MODEL_MONTHLY, STRIPE_PRICE_MODEL_ANNUAL
// STRIPE_PRICE_BUSINESS_MONTHLY, STRIPE_PRICE_BUSINESS_ANNUAL
```

### Billing Portal
`POST /api/billing/portal` → redirects to Stripe Customer Portal for subscription management.

### Key Files
| File | Purpose |
|---|---|
| `lib/stripe.ts` | Stripe client singleton |
| `lib/billing.ts` | Tier/price config, credit packs |
| `lib/billing-server.ts` | Server-side billing operations |
| `app/api/billing/checkout/route.ts` | Checkout session creation |
| `app/api/billing/portal/route.ts` | Customer portal redirect |
| `app/api/billing/credits/checkout/route.ts` | Credit pack purchase |
| `app/api/stripe/webhook/route.ts` | Webhook handler |

---

## 4. Credit System

### Credit Allocation by Tier
| Tier | Credits/Month | Storage |
|---|---|---|
| trial | 500 | 5 GB |
| creator | 6,000 | 40 GB |
| model | 15,000 | 150 GB |
| business | 30,000 | 750 GB |
| enterprise | 100,000 | 5 TB |

### Consumption Priority
`consume_credits(org_id, amount)` Supabase RPC:
1. **First:** Monthly allocation (`monthly_credits_used` incremented)
2. **Then:** Purchased balance (`purchased_balance` decremented)

### Database Columns (on `organizations`)
- `purchased_balance` — purchased credits remaining
- `monthly_credits_used` — credits used this billing cycle
- `monthly_reset_at` — next monthly reset timestamp

### Supabase RPCs
| Function | Purpose |
|---|---|
| `consume_credits(org_id, amount)` | Consume credits (monthly first) |
| `add_purchased_credits(org_id, amount)` | Add purchased credits |
| `reset_monthly_credits(org_id)` | Reset monthly counter |
| `get_credit_breakdown(org_id)` | Get detailed credit status |

### Credit Packs (Stripe)
| Pack | Credits | Price |
|---|---|---|
| Starter | 100 | $9.99 |
| Pro | 500 | $39.99 |
| Enterprise | 2,000 | $99.99 |

### Per-Job Credit Costs (GPU Processing)
| Job Type | Credits |
|---|---|
| Gaussian Splat | 150–500 |
| NeRF reconstruction | 200–800 |
| Mesh export | 50–200 |
| Video render (30s) | 100–300 |
| Orthomosaic | 300–1,000 |

### UI Components
- `SubtleCreditPurchase` — inline prompt, shown only at ≤20% remaining (never modal)
- `CreditIndicator` — header bar credit display
- `CreditWarning` — low balance warning
- `EnhancedUsageTracker` — detailed usage breakdown widget

---

## 5. Entitlements (Single Source of Truth)

```typescript
// lib/entitlements.ts — 5 tiers, 18 entitlement flags
import { getEntitlements, type Tier } from "@/lib/entitlements";

// Standard usage:
const e = getEntitlements(user.tier);

// CEO override — returns enterprise entitlements regardless of DB tier:
const e = getEntitlements(user.tier, { isSlateCeo: true });
```

### CEO All-Access Override
`getEntitlements()` accepts an optional second parameter: `options?: { isSlateCeo?: boolean }`. When `isSlateCeo` is `true`, the function returns enterprise-level entitlements regardless of the org's database tier. This ensures the CEO account (`slate360ceo@gmail.com`) always has full platform module access.

**Important distinction:**
- `isSlateCeo` override → affects module entitlements (analytics, hub, studio access, etc.)
- Internal platform tabs (`/ceo`, `/market`, `/athlete360`) → gated by `hasInternalAccess` (CEO or Slate360 staff), NOT via entitlements. These are platform-admin surfaces, never subscription features.

**Flow:**
1. `resolveServerOrgContext()` returns `isSlateCeo` (hardcoded email check: `user.email === "slate360ceo@gmail.com"`)
2. Server pages pass `isSlateCeo` as `isCeo` prop to client components
3. Client components call `getEntitlements(tier, { isSlateCeo: isCeo })` → gets enterprise entitlements
4. All nav items and feature gates use the resolved entitlements
5. CEO/internal tabs check `hasInternalAccess` at the server page level

Key flags: `canAccessHub`, `canAccessDesignStudio`, `canAccessContent`, `canAccessTourBuilder`, `canAccessGeospatial`, `canAccessVirtual`, `canAccessAnalytics`, `canAccessReports`, `canManageSeats`, `canWhiteLabel`, `canViewSlateDropWidget`, `maxStorageGB`, `maxCredits`, `maxSeats`

> **Note:** `canAccessCeo` does NOT exist in entitlements. The CEO Command Center (`/ceo`), Market Robot (`/market`), and Athlete360 (`/athlete360`) are Slate360-internal platform-admin tabs — access is gated by `hasInternalAccess` from `resolveServerOrgContext()` (`isSlateCeo || isSlateStaff`).

### Never Inline Tier Checks
```typescript
// ❌ WRONG
if (tier === 'business' || tier === 'enterprise') { ... }

// ✅ CORRECT
const e = getEntitlements(tier);
if (e.canAccessHub) { ... }

// ✅ CORRECT (with CEO override)
const e = getEntitlements(tier, { isSlateCeo });
if (e.canAccessHub) { ... }

// ✅ CORRECT (CEO/internal tabs — bypass entitlements entirely)
if (!hasInternalAccess) notFound(); // never use entitlements for /ceo, /market, /athlete360
```

---

## 6. API Auth Middleware

### Server-Side Auth Wrappers
```typescript
// lib/server/api-auth.ts
import { withAuth } from "@/lib/server/api-auth";        // Basic auth check
import { withProjectAuth } from "@/lib/server/api-auth";  // Auth + project scoping

// lib/server/api-response.ts
import { ok, badRequest, unauthorized, notFound, serverError } from "@/lib/server/api-response";
```

### Project Scoping
```typescript
// lib/projects/access.ts
import { listScopedProjectsForUser, getScopedProjectForUser } from "@/lib/projects/access";
```

---

## 7. Email (Resend)

### Sending
```typescript
// lib/email.ts
import { sendEmail } from "@/lib/email";
await sendEmail({ to, subject, html });
// From: Slate360 <noreply@slate360.ai>
```

### Supabase Email Templates
5 templates configured in Supabase dashboard:
1. **Confirm Signup** — `{{ .ConfirmationURL }}`
2. **Magic Link** — `{{ .ConfirmationURL }}`
3. **Reset Password** — `{{ .ConfirmationURL }}`
4. **Invite User** — `{{ .ConfirmationURL }}`
5. **Email Change** — `{{ .ConfirmationURL }}`

Template variables: `{{ .ConfirmationURL }}`, `{{ .Token }}`, `{{ .SiteURL }}`

Full HTML templates preserved in `slate360-context/SUPABASE_EMAIL_TEMPLATES.md`.

---

## 8. Known Database Tables

### Core
`profiles`, `organizations`, `organization_members`

### Projects
`projects`, `project_members`, `project_folders`, `project_rfis`, `project_submittals`, `project_tasks`, `project_budget_items`, `project_milestones`, `project_history_events`, `project_observations`

### Audit
`project_activity_log`

### Files
`unified_files`, `file_folders` (legacy — migrating to `project_folders`), `external_response_links`

### Billing
`subscriptions`, `usage_snapshots`

### Market
`market_listings`, `market_trades`, `market_bot_settings`

### Notifications
`notifications`

**Rule:** Never invent new columns without verifying they exist in the production schema. Check this list first.

---

## 8b. Planned Database Tables (Not Yet Created)

These tables are required by Phases 1–3 in `FUTURE_FEATURES.md`. Do **not** create them ad-hoc — use the SQL migrations documented in FUTURE_FEATURES.md §Phase 3E.

| Table | Phase | Purpose |
|---|---|---|
| `project_activity_log` | 1 | Immutable activity feed for Project Hub |
| `slate360_staff` | CEO tab | Slate360 employee emails granted CEO/internal tab access |
| `slatedrop_audit_log` | 3E | File access/download audit trail |
| `slatedrop_shares` | 3E | Shareable file/folder links with expiry |
| `slatedrop_packs` | 3E | Downloadable project export packages |
| `org_feature_flags` | 3 | Per-org feature overrides for standalone app subscriptions |
| `org_credits` | 3 | Dedicated credit tracking (supplements `organizations` columns) |
| `credits_ledger` | 3 | Append-only credit transaction log |

### Planned Column Additions (`unified_files`)
| Column | Purpose |
|---|---|
| `origin_tab` | Source module (slatedrop, design-studio, etc.) |
| `origin_route` | Page route where file was created |
| `origin_entity_id` | Linked entity (RFI, submittal, etc.) |
| `logical_id` | Groups file versions together |
| `version` | Integer version counter |
| `version_group_id` | UUID linking all versions of one file |
| `is_latest` | Boolean flag for current version |
| `tags` | `text[]` searchable tags |

---

## 8c. App Ecosystem Subscription Flow (Phase 3)

Slate360 modules will be available as **standalone apps** subscribable independently from the full platform. This uses a merged entitlements model.

### How It Works
1. User signs up at `/apps/{app-slug}` or from the app directory at `/apps`
2. `POST /api/apps/subscribe` creates a Stripe Checkout for the standalone product
3. Webhook updates `org_feature_flags` row for that org + feature key
4. `getEntitlements(tier)` is extended to merge `org_feature_flags` overrides with tier defaults
5. User accesses the module at its standalone route (e.g., `/tour-builder`, `/design-studio`)

### Planned API Routes
| Route | Method | Purpose |
|---|---|---|
| `/api/apps/directory` | GET | List available standalone apps with pricing |
| `/api/apps/subscribe` | POST | Create Stripe Checkout for standalone app |
| `/api/apps/status` | GET | Check user's active standalone subscriptions |
| `/api/credits/estimate` | POST | Estimate credit cost before processing |
| `/api/credits/balance` | GET | Detailed credit breakdown (monthly + purchased) |

### Entitlements Merge Pattern
```typescript
// Future pattern — do NOT implement until Phase 3
function getEntitlements(tier: Tier, featureFlags?: Record<string, boolean>) {
  const base = TIER_MAP[tier];
  if (!featureFlags) return base;
  return { ...base, ...featureFlags }; // flags override tier defaults
}
```

---

## 9. AWS S3 Configuration

- **Bucket:** `slate360-storage`
- **Region:** `us-east-2`
- **Key pattern:** `{orgId}/{folderId}/{filename}`
- **IAM Policy:** PutObject, GetObject, DeleteObject, ListBucket on `slate360-storage/*`
- **CORS:** Allow origins `https://www.slate360.ai`, `http://localhost:3000`

### Presigned URL Flow
```typescript
// lib/s3.ts — S3 client
import { s3Client } from "@/lib/s3";
// app/api/slatedrop/upload-url — generates presigned PUT URL (expires 60min)
// Client PUTs directly to S3
// app/api/slatedrop/complete — creates DB record
```

---

## 9b. Google Maps Platform

**API Key:** `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` (env var) — used client-side only  
**Map ID:** `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID` (env var) — required for AdvancedMarker  
**Note:** Key restrictions and enabled APIs are managed in Google Cloud Console.

### Enabled APIs on `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` (confirmed Mar 4 2026)

| API | Used In | Notes |
|---|---|---|
| Maps JavaScript API | `WizardLocationPicker`, `LocationMap`, `@vis.gl/react-google-maps` | Core map rendering |
| Places API (New) | `WizardLocationPicker`, `LocationMap` | `AutocompleteSuggestion.fetchAutocompleteSuggestions()` — replaces deprecated AutocompleteService |
| Places API | `WizardLocationPicker`, `LocationMap` | Legacy; kept for backward compat |
| Places UI Kit | Available | For future rich place UI components |
| Geocoding API | `WizardLocationPicker`, `LocationMap` | Reverse geocode on map click; geocode on address search |
| Maps Static API | Dashboard project cards | Satellite thumbnail for project cards |
| Directions API | `LocationMap` | OSRM fallback in use — Routes API not currently routed through this key |
| Routes API | Available | Not yet wired (key restriction previously blocked) — can replace OSRM |
| Distance Matrix API | Available | For future travel-time / logistics features |
| Street View Static API | Available | For future site street-view previews |
| Street View Publish API | Available | For future 360° site uploads |
| Maps Elevation API | Available | For future terrain/survey features in Geospatial module |
| Maps Embed API | Available | For future embedded map iframes |
| Time Zone API | Available | For schedule/weather features |
| Roads API | Available | For future route snapping in Geospatial |
| Aerial View API | Available | For future aerial site previews |
| Maps 3D SDK for Android | Available | For future native mobile app (Phase 6) |
| Maps 3D SDK for iOS | Available | For future native mobile app (Phase 6) |
| Navigation SDK | Available | For future native mobile navigation |
| Maps Platform Datasets API | Available | For future GIS dataset integration |
| Weather API | Available | For future weather widgets |

### Google Cloud Services (also available on this project)
> BigQuery, Cloud Storage, Cloud SQL, Cloud Logging, Cloud Monitoring, Dataform, Cloud Datastore, Cloud Trace — available for future server-side analytics, audit logging, and data pipeline work when Phase 4+ features are implemented.

### Key Usage Patterns
```typescript
// Always use @vis.gl/react-google-maps in React components:
import { APIProvider, Map, AdvancedMarker } from "@vis.gl/react-google-maps";
// Libraries to load: ["places", "geocoding"] — NEVER load "drawing" (deprecated May 2026)

// Places Autocomplete (confirmed working with Places API New enabled):
const g = (window as any).google?.maps?.places;
if (g?.AutocompleteSuggestion) {
  const response = await g.AutocompleteSuggestion.fetchAutocompleteSuggestions({ input });
}

// Static satellite map for project cards:
`https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=17&size=600x256&maptype=satellite&key=${key}`

// Routes API (newly available — use instead of OSRM for directions):
// POST https://routes.googleapis.com/directions/v2:computeRoutes
// Header: X-Goog-Api-Key + X-Goog-FieldMask
```

### DrawingManager Deprecation (Action Required by May 2026)
`LocationMap.tsx` still uses `useMapsLibrary("drawing")` + `DrawingManager`. This produces the console deprecation warning and will BREAK in May 2026 when Google removes the library. Migration to custom `google.maps.Polyline`/`Polygon` click-based drawing (already done in `WizardLocationPicker.tsx`) is required before May 2026. See BUG-018 in `ONGOING_ISSUES.md`.

---

## 10. Security Headers (CSP)

Configured in `next.config.ts`. Required directives:
- `connect-src`: includes `https://api.open-meteo.com`, `https://*.amazonaws.com`, `data:`, `https://maps.gstatic.com`
- `worker-src`: `'self' blob:`
- Standard `script-src`, `style-src`, `img-src` for Google Maps, Supabase, etc.

---

## 11. GPU Worker Pipeline (Phase 5)

Full deployment spec preserved in `slate360-context/GPU_WORKER_DEPLOYMENT.md`.

Architecture: `Next.js API → Redis Queue → EC2 GPU Worker → S3`
- Worker processes: COLMAP, OpenMVS, PDAL, gltf-pipeline, py3dtiles
- Cost estimate: $105–$300/month (g4dn.xlarge spot instances)
- Not yet deployed — blocked on Phase 2 (Design Studio) completion
- Credit consumption: `consume_credits()` BEFORE enqueuing any job

---

## 12. Context Maintenance Checklist

When making backend changes, update this file if:
- [ ] Auth flow or middleware changes
- [ ] Billing/Stripe integration changes
- [ ] Credit system (RPCs, packs, allocation) changes
- [ ] Email templates change
- [ ] Database tables or columns are added
- [ ] RLS policies change
- [ ] S3 configuration changes
- [ ] CSP headers change
- [ ] API auth middleware (`withAuth`, `withProjectAuth`) changes
