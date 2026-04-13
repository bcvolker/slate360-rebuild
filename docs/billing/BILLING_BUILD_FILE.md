# Billing — Build File

Last Updated: 2026-04-13
Module Status: **Active — recently unified (commit 2383dee)**

## Purpose

Billing handles Stripe checkout, webhooks, subscription management, entitlements resolution, credit tracking, and per-app/bundle pricing for all Slate360 modules.

## Current Real Implementation State

### What Works (Real)
- Stripe webhook handler (`app/api/stripe/webhook/route.ts` — 178 lines)
  - Handles: `standalone_app`, `modular_*`, `storage_addon`, legacy tier, credits
  - Idempotency-safe credit processing
- Modular subscription upsert (`lib/server/webhook-helpers.ts` — `handleModularSubscription()`)
  - Regex-based plan key parsing → `org_app_subscriptions` upsert
- Unified entitlements resolver (`lib/server/org-feature-flags.ts` — `resolveOrgEntitlements()`)
  - 3 parallel fetches: `organizations` (tier), `org_feature_flags`, `org_app_subscriptions`
  - Runs `resolveModularEntitlements()` → widens `canAccessStandalone*` flags additively
- App-specific pricing matrix (`lib/billing-apps.ts` — 204 lines)
  - Per-app tiers (basic/standard/pro), bundles (field_pro, all_access), storage addons
- Legacy tier entitlements (`lib/entitlements.ts` — 190 lines)
  - `TIER_MAP` for `trial | standard | business | enterprise`
  - `getEntitlements()` for tier-based feature access
- Modular entitlements (`lib/entitlements-modular.ts` — 264 lines)
  - `resolveModularEntitlements()` — reads `org_app_subscriptions` and returns feature flags
- Billing server helpers (`lib/billing-server.ts` — 91 lines)
- Stripe client setup (`lib/stripe.ts` — 25 lines)
- Credit idempotency (`lib/credits/idempotency.ts` — 168 lines)
- Account billing tab (`components/dashboard/my-account/AccountBillingTab.tsx`)

### What Is Partial
- `TIER_MAP` gating — all app booleans are `true` for every tier including trial (cosmetic-only gating)
- Legacy → modular migration — `LegacyAppId` type renamed but old tier logic still active
- Bundle checkout — pricing defined but checkout flow untested for bundles
- Storage addon checkout — pricing defined, webhook handler exists, flow untested

### What Is Missing
- Real `TIER_MAP` differentiation (trial tier should restrict app access)
- Checkout UI for per-app subscriptions (billing tab shows plans but may not have working checkout links)
- Subscription management UI (upgrade, downgrade, cancel)
- Invoice history display
- Usage-based billing / credit consumption dashboard

## Architecture

```
Checkout → Stripe → Webhook → handleModularSubscription() → org_app_subscriptions
                                                                      ↓
resolveOrgEntitlements() ← reads 3 tables ← organizations + org_feature_flags + org_app_subscriptions
         ↓
canAccessStandalone* flags → withAppAuth() → API route gating
                           → page gates → route access
                           → nav/sidebar → UI visibility
```

## Key Files (8 files, 1261 lines total)

| File | Lines | Purpose |
|------|-------|---------|
| `lib/entitlements-modular.ts` | 264 | Modular feature resolution |
| `lib/billing-apps.ts` | 204 | App pricing matrix |
| `lib/entitlements.ts` | 190 | Legacy tier mapping |
| `app/api/stripe/webhook/route.ts` | 178 | Webhook handler |
| `lib/credits/idempotency.ts` | 168 | Credit safety |
| `lib/billing.ts` | 141 | Plan definitions |
| `lib/billing-server.ts` | 91 | Server billing ops |
| `lib/stripe.ts` | 25 | Stripe client |

## Database Tables

| Table | Purpose |
|-------|---------|
| `organizations` | Tier, Stripe customer ID, purchased credits |
| `org_app_subscriptions` | Per-app subscription tracking (app_id, tier, status) |
| `org_feature_flags` | Feature toggles per org |
| `org_stripe_customer_id` | Stripe customer mapping |
| `credit_transactions` | Credit usage tracking (idempotent) |

## Pricing Structure

### Platform Tiers (Legacy)
- Trial: $0 (all tabs, tight limits)
- Standard: $149/mo
- Business: custom
- Enterprise: custom

### Per-App Tiers
- Basic/Standard: varies by app
- Pro: varies by app

### Bundles
- Field Pro Bundle: Site Walk Pro + Tour Builder Pro ($149/mo)
- All Access: All apps ($TBD)

### Add-ons
- Storage: 10GB, 50GB tiers
- Credits: Starter, Growth, Pro packs

## Biggest Blockers

1. **P0: Design Studio/Content Studio page gates check tier-level booleans** (always true) — bypass subscription entirely
2. **P0: Site Walk API routes use `withAuth()` not `withAppAuth()`** — no subscription check on APIs
3. **P1: `TIER_MAP` all-true for every tier** — nav gating is decorative line
4. **P1: No subscription management UI** — users can't upgrade/downgrade/cancel from the app
5. **P2: Bundle/storage checkout untested** — defined but never exercised end-to-end

## Verification Checklist

- [ ] Stripe webhook receives and processes `checkout.session.completed`
- [ ] `handleModularSubscription()` upserts correct app_id + tier
- [ ] `resolveOrgEntitlements()` reads all 3 tables and returns correct flags
- [ ] `withAppAuth()` blocks unsubscribed users (after gating fixes)
- [ ] Credit purchase → idempotent write to `credit_transactions`
- [ ] Account billing tab displays current plan
- [ ] No double-charge on webhook replay
