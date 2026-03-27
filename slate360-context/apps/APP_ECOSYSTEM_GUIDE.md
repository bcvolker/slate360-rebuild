# App Ecosystem — Master Strategy Guide

Last Updated: 2026-03-27
Status: Planning guide. Execute phase by phase.

Read this before starting ANY work that touches standalone app subscriptions, Stripe products, the `org_feature_flags` table, PWA infrastructure, or Capacitor/app store delivery.

---

## 1. Where We Are Right Now

### What Is Live And Working

- Platform auth, org, project, and file backbone: fully live.
- Stripe billing exists for platform tiers (`creator`, `model`, `business`, `enterprise`).
- Business Stripe account is connected. The connection and webhook have NOT been smoke-tested end-to-end.
- SlateDrop file backbone: working (`slatedrop_uploads` + `project_folders`).
- Project Hub: built, 9 tool pages need size extraction (covered in `PROJECT_HUB_REFACTOR_GUIDE.md`).
- Punch list data model: `project_punch_items` table already exists in production (confirmed in migration tracking).
- Tour Builder: marketing page + dashboard shell only. No backend, no tables.
- Manifest exists, but no service worker, no install prompt, no offline capability.

### What Is Missing Before Any App Can Be Subscribed To

| Gap | How Serious | Blocks What |
|---|---|---|
| Stripe not smoke-tested end-to-end | **Critical** | No app can take money until this is verified |
| No standalone app Stripe products | **Critical** | Tour Builder and PunchWalk cannot charge |
| No `org_feature_flags` table | **Critical** | Cannot persist per-app entitlements |
| No `getEntitlements()` app flag merge | **Critical** | Cannot gate app routes by subscription |
| No `/apps/` directory or app landing pages | High | No new subscriber can find or buy the apps |
| No new-user-to-app-subscriber funnel | High | Can't convert new visitors who only want one app |
| No PWA service worker | Medium for web, **Critical for app stores** | iOS/Android install requires at least PWA |
| No Capacitor setup | Medium (optional, post-PWA) | Native iOS/Android app store listing |
| Middleware doesn't protect standalone app routes | Medium | App routes accessible without entitlement |
| Tour Builder has no backend | **Critical** | It must be built before it can be sold |
| PunchWalk has no standalone route | **Critical** | It must be built before it can be sold |

### Revenue-First Build Order

Per `APP_ECOSYSTEM_EXECUTION_PLAN.md` and `FUTURE_FEATURES.md` Section 3D:

1. **Stripe smoke test + foundation** (this file, Phase 1) — ~5 prompts
2. **360 Tour Builder MVP** (`tour-builder/BUILD_GUIDE.md`, 8 prompts) + standalone subscription (~3 prompts) = **11 prompts to live and billable**
3. **PunchWalk MVP** (`apps/PUNCHWAIK_BUILD_GUIDE.md`, ~10 prompts) + PWA + subscription (~5 prompts) = **15 prompts to live and billable**
4. **Capacitor / App Store wrapping** (~6 prompts, works for both apps simultaneously)
5. Further apps (Photo Log, SlateDrop Standalone, Plan Review) follow the same template

---

## 2. Phase 1 — Stripe Connection Testing and Setup

**Do this first, before building any app.** If Stripe is broken, no app can take money.

### Phase 1A — Smoke-Test Existing Platform Billing

#### Step 1: Confirm environment variables exist

In Vercel env (or `.env.local` for dev), verify:
- `STRIPE_SECRET_KEY` — starts with `sk_live_` (production) or `sk_test_` (test mode)
- `STRIPE_WEBHOOK_SECRET` — starts with `whsec_`
- `STRIPE_PRICE_CREATOR_MONTHLY`
- `STRIPE_PRICE_CREATOR_ANNUAL`
- `STRIPE_PRICE_MODEL_MONTHLY`
- `STRIPE_PRICE_MODEL_ANNUAL`
- `STRIPE_PRICE_BUSINESS_MONTHLY`
- `STRIPE_PRICE_BUSINESS_ANNUAL`

If any are missing → go to Stripe Dashboard → Products → copy the live price IDs.

#### Step 2: Test checkout flow end-to-end

Use a real test mode card (Stripe test card: `4242 4242 4242 4242`, any future expiry, any CVC):

1. Sign in as a trial org.
2. Navigate to `/plans` and attempt to upgrade to `creator`.
3. Stripe checkout session should open.
4. Complete payment with test card.
5. After redirect, confirm the org tier updated in Supabase (`organizations.tier = 'creator'`).

If step 5 fails → the webhook is not firing or not correctly writing back. Debug in `app/api/stripe/webhook/route.ts`.

#### Step 3: Test webhook delivery

In Stripe Dashboard → Webhooks → click the webhook endpoint → view recent events. Look for `checkout.session.completed` events. If the event shows but the DB didn't update, the webhook handler has a bug.

For local testing: use `stripe listen --forward-to localhost:3000/api/stripe/webhook` to forward events to your local dev server.

#### Phase 1A Exit Criteria

- Checkout session opens from `/plans`.
- Payment completes with test card.
- Webhook fires and updates `organizations.tier`.
- Billing portal opens from account settings.
- Downgrade/cancellation updates tier on next period end.

### Phase 1B — Add Standalone App Stripe Products

After platform billing is confirmed working, add standalone app products.

#### Products to create in Stripe Dashboard

Create products for each app, each with monthly and annual price variants:

| App | Monthly Price | Annual Price | Stripe Product Name |
|---|---|---|---|
| 360 Tour Builder | $25/mo | $250/yr | `Slate360 — 360 Tour Builder` |
| PunchWalk | $19/mo | $190/yr | `Slate360 — PunchWalk` |

For each product → create a `Price` for monthly (recurring, monthly interval) and a `Price` for annual (recurring, yearly interval).

Copy the resulting Price IDs into environment variables:

```
STRIPE_PRICE_TOUR_BUILDER_MONTHLY=price_...
STRIPE_PRICE_TOUR_BUILDER_ANNUAL=price_...
STRIPE_PRICE_PUNCHWALIK_MONTHLY=price_...
STRIPE_PRICE_PUNCHWALIK_ANNUAL=price_...
```

Add these to Vercel environment variables AND `.env.local`.

#### Phase 1B Exit Criteria

- Both products visible in Stripe Dashboard.
- All 4 price IDs set in environment variables.
- Price IDs load correctly in `lib/billing.ts`.

---

## 3. Phase 2 — org_feature_flags and Entitlement Merge

### Phase 2A — Create the `org_feature_flags` Table

This table stores per-org app entitlements. When a user subscribes to a standalone app, the webhook writes a row here. When the app page loads, this row tells the server the user can access the app.

#### Migration

```sql
-- supabase/migrations/YYYYMMDDHHMMSS_org_feature_flags.sql
CREATE TABLE org_feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  feature_key TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  source TEXT NOT NULL DEFAULT 'stripe',         -- 'stripe' | 'manual' | 'trial'
  stripe_subscription_id TEXT,
  stripe_price_id TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, feature_key)
);

ALTER TABLE org_feature_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members can read their flags"
  ON org_feature_flags FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "service role can write flags"
  ON org_feature_flags FOR ALL
  USING (true)
  WITH CHECK (true);
```

Apply with: `supabase db push` or add directly via Supabase migration system.

#### Feature Keys (Canonical List)

```typescript
// lib/types/feature-flags.ts
export const FEATURE_KEYS = {
  TOUR_BUILDER: 'standalone_tour_builder',
  PUNCHWAIK:    'standalone_punch_walk',
  PHOTO_LOG:    'standalone_photo_log',
  PLAN_REVIEW:  'standalone_plan_review',
  SLATEDROP_STANDALONE: 'standalone_slatedrop',
} as const;

export type FeatureKey = typeof FEATURE_KEYS[keyof typeof FEATURE_KEYS];
```

### Phase 2B — Update `getEntitlements()` to Merge App Flags

The function currently returns only tier-based entitlements. Update it to optionally accept the org's active feature flags and merge them in.

**Target file:** `lib/entitlements.ts`

**Pattern:**

```typescript
export interface Entitlements {
  // ... existing fields ...
  canAccessStandaloneTourBuilder: boolean;
  canAccessStandalonePunchWalk: boolean;
  canAccessStandalonePhotoLog: boolean;
}

export function getEntitlements(
  tier: SubscriptionTier,
  opts: {
    isSlateCeo?: boolean;
    featureFlags?: Record<string, boolean>;
  } = {}
): Entitlements {
  const flags = opts.featureFlags ?? {};
  const base = getBaseEntitlements(tier, opts.isSlateCeo);

  return {
    ...base,
    // Platform tiers include the integrated app versions.
    // Standalone subscriptions grant standalone access.
    canAccessTours: base.canAccessTours || flags['standalone_tour_builder'] === true,
    canAccessStandaloneTourBuilder: flags['standalone_tour_builder'] === true,
    canAccessStandalonePunchWalk: flags['standalone_punch_walk'] === true,
    canAccessStandalonePhotoLog: flags['standalone_photo_log'] === true,
  };
}
```

**Load flags in server pages:**

```typescript
// In a server page or server component:
const flags = await loadOrgFeatureFlags(orgId); // new helper
const entitlements = getEntitlements(org.tier, { featureFlags: flags });
```

### Phase 2C — Update Webhook to Write App Entitlements

**Target file:** `app/api/stripe/webhook/route.ts`

When a standalone app checkout completes, write a flag row instead of (or in addition to) updating `organizations.tier`:

```typescript
// In checkout.session.completed handler:
if (priceId === process.env.STRIPE_PRICE_TOUR_BUILDER_MONTHLY
    || priceId === process.env.STRIPE_PRICE_TOUR_BUILDER_ANNUAL) {
  await adminClient.from('org_feature_flags').upsert({
    org_id: orgId,
    feature_key: 'standalone_tour_builder',
    enabled: true,
    source: 'stripe',
    stripe_subscription_id: session.subscription,
    stripe_price_id: priceId,
  }, { onConflict: 'org_id,feature_key' });
}
```

Also handle `customer.subscription.deleted` to disable flags when cancelled.

### Phase 2D — Protect Standalone App Routes in Middleware

Add standalone app routes to `middleware.ts` to enforce auth:

```typescript
// middleware.ts — add to the protected routes list:
const protectedRoutes = [
  '/dashboard',
  '/slatedrop',
  '/project-hub',
  '/apps',          // new: all app routes
  '/tour-builder',  // new: standalone tour builder
  '/punch-walk',    // new: standalone punch walk
];
```

Then in each page's server component, add entitlement denial:

```typescript
// app/apps/tour-builder/page.tsx
const ctx = await resolveServerOrgContext();
const flags = await loadOrgFeatureFlags(ctx.org.id);
const ent = getEntitlements(ctx.org.tier, { featureFlags: flags });

if (!ent.canAccessTours && !ent.canAccessStandaloneTourBuilder) {
  redirect('/apps/tour-builder/subscribe');
}
```

### Phase 2 Exit Criteria

- `org_feature_flags` table exists with RLS.
- `getEntitlements()` accepts and merges feature flags.
- Webhook writes flag rows for app subscriptions.
- Webhook disables flags on subscription cancellation.
- Standalone app routes redirect non-subscribers to the subscribe page.
- Platform tier users still access the integrated versions without any extra step.

---

## 4. Phase 3 — App Landing Pages and New-User Subscription Flow

### The New User Journey (App-Only Subscriber)

This is the flow for someone who just wants Tour Builder, not the whole platform:

```
1. User finds Slate360 via search / referral / app store
2. Lands on https://www.slate360.ai/apps/tour-builder (new)
3. Sees feature summary, screenshots, pricing
4. Clicks "Subscribe" → Stripe checkout for TOUR_BUILDER_MONTHLY
5. Completes payment → webhook fires → org_feature_flags row written
6. Post-checkout redirect to /apps/tour-builder/onboarding
7. If no account: prompted to sign up (linked to the org from step 4)
8. If already has account: signs in → lands directly in the app
9. App loads with tour builder access
```

### Pages to Build

```
app/apps/
  page.tsx                          ← App directory (all apps grid)
  tour-builder/
    page.tsx                        ← Tour Builder landing + pricing
    subscribe/page.tsx              ← Triggers Stripe checkout
    onboarding/page.tsx             ← Post-checkout welcome + project setup
  punch-walk/
    page.tsx                        ← PunchWalk landing + pricing
    subscribe/page.tsx
    onboarding/page.tsx
```

### Checkout API for Standalone App

Add a new checkout endpoint alongside the platform tier checkout:

```
app/api/apps/[appKey]/subscribe/route.ts
```

This endpoint:
- Creates/finds the Stripe customer for the org (same as platform billing).
- Creates a checkout session with the app-specific price ID.
- Sets `metadata: { org_id, user_id, app_key }`.
- Points `success_url` to `/apps/{appKey}/onboarding?session_id={CHECKOUT_SESSION_ID}`.

### Phase 3 Exit Criteria

- App directory page exists at `/apps`.
- Tour Builder landing page exists with pricing.
- PunchWalk landing page exists with pricing.
- Checkout flow works for both apps (test cards only).
- Post-checkout onboarding page loads correctly.
- New user can sign up, pay, and access the app in one session.

---

## 5. Phase 4 — PWA Infrastructure

This phase makes the web apps installable (Add to Home Screen on iOS/Android, Install on desktop).

### What Is Needed

| Component | File | Status |
|---|---|---|
| Web app manifest | `app/manifest.ts` | Exists — needs icon updates |
| App icons | `public/icons/` | Missing — need 192px and 512px PNGs |
| Service worker | `public/sw.js` or via `next-pwa` | Missing entirely |
| Install prompt component | `components/pwa/InstallPrompt.tsx` | Missing |
| iOS meta tags | `app/layout.tsx` | Partially present |

### Service Worker Strategy

Use `@ducanh2912/next-pwa` (active fork of `next-pwa`):

```bash
npm install @ducanh2912/next-pwa
```

Configure in `next.config.ts`:

```typescript
import withPWA from '@ducanh2912/next-pwa';

export default withPWA({
  dest: 'public',
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: false,
  disable: process.env.NODE_ENV === 'development',
})(nextConfig);
```

Caching strategy:
- Cache static assets and fonts aggressively.
- Cache project list and recent projects for offline display.
- Do NOT cache file upload or download routes — those must be online.
- For PunchWalk: cache the current project's punch items list for offline viewing.

### Install Prompt Component

```
components/pwa/
  InstallPrompt.tsx    ← handles beforeinstallprompt event + iOS guidance
```

Show the install prompt contextually:
- After Tour Builder: show after the first tour is published ("Install to use as desktop app").
- For PunchWalk: show on first load on mobile ("Install for site use").

### Manifest Updates

Each app may have its own manifest or the shared manifest. Simplest approach for now: one shared manifest with the platform branding. PWA display mode: `standalone`.

Update `app/manifest.ts`:
- `name`: "Slate360"
- `short_name`: "Slate360"
- `icons`: at minimum 192px and 512px maskable PNGs
- `theme_color`: `#FF4D00`
- `background_color`: `#FFFFFF`
- `display`: `standalone`
- `start_url`: `/apps` (or `/tour-builder` for app-specific PWA)

### Phase 4 Exit Criteria

- Lighthouse PWA audit score is 90+.
- On Android Chrome: "Add to Home Screen" prompt appears.
- On iOS Safari: user can manually add to home screen; icons display correctly.
- Installed PWA opens in standalone mode (no browser chrome).
- Offline: project list and recent punch items display from cache.
- File upload/download routes require connectivity (fail gracefully offline).

---

## 6. Phase 5 — Capacitor (iOS and Android App Stores)

Capacitor wraps the Next.js web app in a native shell that can be submitted to the App Store and Google Play. This is the path to being "downloadable from the app stores."

### Prerequisites (Must Be True Before Starting Capacitor)

- [ ] PWA audit score 90+ (Phase 4 complete).
- [ ] Service worker is stable — no race conditions or cache corruption on any tested flow.
- [ ] Install prompt works.
- [ ] App has its own `/apps/tour-builder` and `/apps/punch-walk` routes working without the dashboard shell.
- [ ] Stripe subscription works end-to-end.
- [ ] Entitlement gating works for both apps.

If any of these are not true, Capacitor will amplify the bugs without adding value.

### Capacitor Setup (Do This Once, Applies To Both Apps)

```bash
npm install @capacitor/core @capacitor/cli @capacitor/ios @capacitor/android
npx cap init "Slate360" "ai.slate360" --web-dir=out
```

Note: Capacitor works best with a static export or a server that can be accessed by the native shell. For Next.js, you need either `next export` or a hybrid approach where the Capacitor WebView points to the live web URL.

**Recommended approach for Next.js + Capacitor:** Use the hosted URL approach — the native app loads your Vercel-hosted web app in a full-screen WebView. This is simpler than static export and means app updates don't require a new app store submission.

Add platforms:
```bash
npx cap add ios
npx cap add android
```

### iOS App Store Requirements

Before submitting to the Apple App Store:
- Apple Developer Program membership ($99/yr).
- App privacy disclosure (what data is collected).
- App screenshots in required sizes.
- Support URL (can be slate360.ai/support).
- Review the App Store Review Guidelines — construction apps generally have no issues, but camera and photo library permissions need justification.
- Permissions strings in `Info.plist`:
  - Camera: "Used to capture photos for punch items"
  - Photo Library: "Used to attach photos to punch items and site reports"
  - Location (if used): "Used to record the site location for punch items"

### Google Play Store Requirements

- Google Play Developer Account ($25 one-time).
- App privacy policy URL.
- Content rating questionnaire.
- Data safety declaration.
- Target SDK must be Android 14 (API level 34) as of 2024+ submissions.

### Push Notifications (Optional But Recommended)

Both apps benefit from push notifications (punch item assigned, tour published, etc.):
- Capacitor Push Notifications plugin: `@capacitor/push-notifications`
- For web: use the Web Push API + Supabase Realtime or external push service.
- Defer until after initial app store launch.

### Phase 5 Exit Criteria

- Both apps build and run on iOS Simulator and Android Emulator.
- Auth flow works inside the native shell.
- File upload and camera capture work inside the native shell.
- Both apps submitted to app stores (review may take 1–7 days for initial submission).

---

## 7. Platform Foundation Phases vs App Build Phases

This table clarifies what must be done in what order, and where the refactor guides fit in:

| Phase | Description | Prompt Count | Blocking Deps |
|---|---|---|---|
| **Platform Phase 0 (Refactors)** | useDashboardState split, LocationMap BUG-018, file_folders migration | ~8 prompts (see refactor guides) | **BUG-018 is May 2026 deadline** |
| **App Phase 1** | Stripe smoke test + standalone products setup | ~2 prompts | Platform billing must work |
| **App Phase 2** | org_feature_flags + entitlement merge + webhook | ~3 prompts | Phase 1 complete |
| **App Phase 3** | App landing pages + new user subscription funnel + /apps directory | ~3 prompts | Phase 2 complete |
| **Tour Builder MVP** (8 prompts) | Core app implementation (see tour-builder/BUILD_GUIDE.md) | 8 prompts | Phase 2 complete (needs entitlement gating) |
| **Tour Builder Standalone** | Standalone route, Tour Builder app landing page | ~2 prompts | Tour Builder MVP + Phase 3 |
| **PunchWalk MVP** (Phase A) | Core web app — punch item walk, photo capture, assignments | ~6 prompts | Phase 2 complete |
| **PunchWalk PWA** (Phase B) | Service worker, offline queue, install prompt | ~3 prompts | PunchWalk MVP + Phase 4 |
| **App Phase 4** | PWA infrastructure (shared across both apps) | ~3 prompts | PunchWalk ready for PWA |
| **PunchWalk Subscription** | Standalone route, landing page, subscription flow | ~2 prompts | Phase 3 + PunchWalk MVP |
| **Capacitor / App Stores** | iOS + Android wrapping, submissions | ~6 prompts | PWA complete, both apps stable |

**Estimated total prompts to have both Tour Builder and PunchWalk live in app stores: ~46 prompts**. This assumes no major rework. Each gap (Stripe issues, schema surprises, Capacitor weirdness) adds 2–5 prompts.

**Fastest path to first revenue:** Get Tour Builder live and billable first (~16 prompts total). That alone justifies the ecosystem work and generates early signal before investing in PunchWalk and Capacitor.

---

## 8. Memory Maintenance Protocol (Cross-Chat Context)

Each chat that touches ecosystem work must:

1. **Start by reading:**
   - `SLATE360_PROJECT_MEMORY.md` → latest session handoff
   - `slate360-context/apps/APP_ECOSYSTEM_GUIDE.md` → this file, phase tracker section
   - Only the specific phase being worked on

2. **Before writing code:**
   - Run `mcp_gitnexus_impact` on any shared file (`lib/entitlements.ts`, `lib/billing.ts`, `middleware.ts`)
   - Check `ops/bug-registry.json` for active bugs in modules being touched

3. **After each prompt:**
   - Update the Phase Completion Tracker below
   - Update `SLATE360_PROJECT_MEMORY.md` session handoff
   - Run `mcp_gitnexus_detect_changes`
   - Run `get_errors` on all changed files
   - Run `npm run typecheck` if TypeScript touched

4. **Before starting a new chat to continue work:**
   - The handoff from the prior chat is in `SLATE360_PROJECT_MEMORY.md`.
   - Re-read only the phase you are currently on — do not re-read completed phases.

---

## 9. Phase Completion Tracker

Update this table at the end of every session that touches ecosystem work.

| Phase | Description | Status | Notes |
|---|---|---|---|
| Platform 0A | useDashboardState split (775 → sub-hooks) | ⬜ Not started | See DASHBOARD_REFACTOR_GUIDE.md |
| Platform 0B | LocationMap BUG-018 (May 2026 deadline) | ⬜ Not started | CRITICAL deadline — do before Tour Builder |
| Platform 0C | file_folders migration | ⬜ Not started | See SLATEDROP_REFACTOR_GUIDE.md Phase 1 |
| App Phase 1A | Stripe platform billing smoke test | ⬜ Not started | Use test card |
| App Phase 1B | Add Tour Builder + PunchWalk Stripe products | ⬜ Not started | Create products in Stripe Dashboard |
| App Phase 2A | `org_feature_flags` migration | ⬜ Not started | — |
| App Phase 2B | `getEntitlements()` merge logic | ⬜ Not started | — |
| App Phase 2C | Webhook writes app entitlement flags | ⬜ Not started | — |
| App Phase 2D | Middleware protects standalone app routes | ⬜ Not started | — |
| App Phase 3 | App landing pages + /apps directory + new user funnel | ⬜ Not started | — |
| Tour Builder MVP | 8-prompt sequence (see tour-builder/BUILD_GUIDE.md) | ⬜ Not started | — |
| Tour Builder Standalone | Standalone route + app landing page wired to subscription | ⬜ Not started | — |
| PunchWalk MVP | Core web app (see PUNCHWAIK_BUILD_GUIDE.md Phases 1–5) | ⬜ Not started | — |
| App Phase 4 | PWA service worker + install prompt | ⬜ Not started | — |
| PunchWalk PWA | Offline queue + camera + PWA shells (see PUNCHWAIK_BUILD_GUIDE.md Phase 6) | ⬜ Not started | — |
| Capacitor iOS | Build + simulator test + App Store submission | ⬜ Not started | — |
| Capacitor Android | Build + emulator test + Google Play submission | ⬜ Not started | — |

---

## 10. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Stripe webhook not delivering in production | Medium | High | Test with `stripe listen` locally first; check Vercel function logs |
| `org_feature_flags` RLS accidentally blocks webhook writes | Medium | High | Service role key bypasses RLS — use `createAdminClient()` in webhook handler |
| `getEntitlements()` change breaks existing platform tier gating | Medium | High | Run full typecheck + test all 5 tiers before merging |
| Capacitor breaks auth (cookies, CORS, Supabase session) | High | High | Plan WebView cookie/storage configuration before Capacitor step; test auth first |
| PWA service worker caches stale auth token | Medium | Medium | Never cache API responses that carry auth tokens; use network-first for auth routes |
| App Store rejection (camera permissions) | Low | Medium | Provide clear permission usage strings; test on physical device before submission |
| Stripe checkout works in test but fails in production | Low | High | Use same price IDs in both environments with separate test/live keys |
| Missed billing edge case: user cancels mid-month | Medium | Medium | Test `customer.subscription.deleted` webhook via Stripe CLI; confirm flag disabled |
