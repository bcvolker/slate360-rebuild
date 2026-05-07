# Billing — Build File

Last Updated: 2026-04-14
Module Status: **Active — partially unified**
Doctrine Source: `docs/SLATE360_MASTER_BUILD_PLAN.md` (this file must align)

## Purpose

Billing handles Stripe checkout, webhooks, subscription management, entitlements resolution, credit tracking, and per-app pricing for all Slate360 modules.

## Phase 1 Doctrine Alignment

### Pricing Is NOT the Phase 1 Priority

The doctrine explicitly states:
- We are NOT optimizing first for final public pricing, all bundles, or app-store rollout
- All user-facing pricing should show "TBD" (already done as of commit 1ffaac7)
- Backend billing code has hardcoded prices ($79/mo, $149/mo, etc.) — these are placeholders and must not be treated as final
- No modular bundle checkout is needed for Phase 1

### Individual-First Licensing (CONFLICT)

The doctrine says each user has one seat / one license and users are independent by default. The current billing system ties subscriptions to organizations (org_app_subscriptions table). For Phase 1, the "org" will be reframed as a personal workspace (see master build plan Section 2). Subscriptions still resolve at the org level in the DB, but users should not see "organization" language.

### Phase 1 Billing Scope

For beta, billing needs to support ONLY:
1. Site Walk subscription checkout (one plan — standard or pro TBD)
2. Webhook processing to activate Site Walk entitlement
3. Basic subscription status display in My Account

NOT needed for Phase 1:
- Bundle checkout
- Storage addon checkout
- Credit pack purchase
- Subscription upgrade/downgrade/cancel UI
- Invoice history
- Multi-module checkout
- Usage-based billing

### Collaborator Seat Model

Collaborators are NOT billed users. They do not have their own subscriptions.

**Key billing rules for collaborators:**
- Collaborator access is a benefit of the subscriber's tier — not a separate purchase
- **Site Walk Standard**: 0 collaborator seats (solo use)
- **Site Walk Pro**: up to 3 collaborator seats
- Collaborator count is per-subscriber, not per-project (a subscriber with 3 collaborator seats can assign them across multiple projects)
- If a subscriber downgrades to a tier with fewer collaborator seats, excess collaborators are removed or frozen (policy TBD)
- No billing events for collaborator actions — collaborator usage is covered by the subscriber's plan
- The entitlement resolver must track how many collaborators a subscriber has active and enforce the tier limit

**Implementation note:** The `org_app_subscriptions` table (or equivalent) must store the collaborator seat limit per subscription tier. A new `project_collaborators` table will track active collaborator invitations. The entitlement resolver needs a `maxCollaborators` field derived from the subscriber's tier.

## Current Real Implementation State

### What Works (Real)
- Stripe webhook handler (app/api/stripe/webhook/route.ts — 178 lines)
  - Handles: standalone_app, modular_*, storage_addon, legacy tier, credits
  - Idempotency-safe credit processing
- Modular subscription upsert (lib/server/webhook-helpers.ts — handleModularSubscription())
- Unified entitlements resolver (lib/server/org-feature-flags.ts — resolveOrgEntitlements())
  - 3 parallel fetches: organizations (tier), org_feature_flags, org_app_subscriptions
- App-specific pricing matrix (lib/billing-apps.ts — 204 lines)
- Legacy tier entitlements (lib/entitlements.ts — 190 lines)
- Modular entitlements (lib/entitlements-modular.ts — 264 lines)
- Credit idempotency (lib/credits/idempotency.ts — 168 lines)

### What Is Partial
- TIER_MAP gating — all app booleans are true for every tier (cosmetic-only gating)
- Legacy to modular migration — old tier logic still active alongside new system
- Bundle/storage addon checkout — defined but untested

### What Is Missing for Phase 1 Beta
- **Beta access gate** — billing-adjacent: need a flag that says "this user has beta access"
- **Checkout actually wired for Site Walk** — Stripe products exist (prod_UK... / price_1TL...) but checkout UI-to-webhook-to-entitlement chain needs E2E verification
- **Subscription status display** — My Account billing tab needs to show current plan clearly

## Architecture

```
Checkout → Stripe → Webhook → handleModularSubscription() → org_app_subscriptions
                                                                      │
resolveOrgEntitlements() ← reads 3 tables ← organizations + org_feature_flags + org_app_subscriptions
         │
canAccessStandalone* flags → withAppAuth() → API route gating
                           → page gates → route access
                           → nav/sidebar → UI visibility
```

## Key Files

| File | Lines | Purpose |
|------|-------|---------|
| lib/entitlements-modular.ts | 264 | Modular feature resolution |
| lib/billing-apps.ts | 204 | App pricing matrix (hardcoded — treat as placeholders) |
| lib/entitlements.ts | 190 | Legacy tier mapping + TIER_MAP |
| app/api/stripe/webhook/route.ts | 178 | Webhook handler |
| lib/credits/idempotency.ts | 168 | Credit safety |
| lib/billing.ts | 141 | Plan definitions |
| lib/billing-server.ts | 91 | Server billing ops |
| lib/stripe.ts | 25 | Stripe client |

## Database Tables

| Table | Purpose |
|-------|---------|
| organizations | Tier, Stripe customer ID, purchased credits |
| org_app_subscriptions | Per-app subscription tracking |
| org_feature_flags | Feature toggles per org (standalone_punchwalk, etc.) |
| org_stripe_customer_id | Stripe customer mapping |
| credit_transactions | Credit usage tracking (idempotent) |

## Stripe Products (Created)

| App | Product ID | Price ID | Amount |
|-----|-----------|----------|--------|
| Site Walk | In Stripe | In Stripe | TBD — do not treat current prices as final |
| Design Studio | prod_UKR4p1NZfdXtkg | price_1TLmCSJCrjGbeotHDwqs7bqn | TBD |
| Content Studio | prod_UKR4RK9EixZlf0 | price_1TLmCaJCrjGbeotHe74bwSye | TBD |
| Tours | In Stripe | In Stripe | TBD |

Note: These Stripe products exist in test mode. Prices are placeholders. Do not ship these to real customers without owner-approved pricing.

## Codebase Conflicts with Phase 1 Doctrine

| # | Severity | Issue | Action Needed |
|---|----------|-------|--------------|
| 1 | MODERATE | TIER_MAP sets all app booleans to true for all tiers | Trial should restrict; standard should only enable purchased apps |
| 2 | MODERATE | billing-apps.ts has hardcoded prices | These are backend-only; user-facing already shows TBD. Mark as placeholders in code comments. |
| 3 | LOW | 12 modular plan env vars have no Stripe products | Not needed for Phase 1 (only Site Walk checkout matters) |
| 4 | LOW | No subscription management UI (upgrade/downgrade/cancel) | Not needed for Phase 1 beta |
| 5 | MODERATE | No collaborator seat tracking in entitlements | Entitlement resolver needs maxCollaborators per tier |
| 6 | LOW | No collaborator downgrade policy | Define what happens to excess collaborators on tier downgrade |

## Phase 1 Implementation Needed

1. **Verify Site Walk checkout E2E**: Select plan → Stripe checkout → webhook → subscription active → page accessible. This chain must work for at least one plan.
2. **Beta flag mechanism**: Add a field (either in org_feature_flags or a new beta_access column) that middleware checks. CEO can toggle this for individual users.
3. **Account billing tab clarity**: Show current plan status clearly in My Account so testers know if their subscription is active.

## What Must Be Decided Before Implementation

1. **Beta pricing**: Free for beta testers? Or real checkout with test pricing?
2. **Beta access mechanism**: Flag in DB? Invite code? Approval queue?
3. **TIER_MAP cleanup**: Should trial users see locked app cards, or nothing at all?
4. **Collaborator seat limits per tier**: Recommended: Standard=0, Pro=3 (owner confirm)
5. **Collaborator downgrade policy**: What happens to active collaborators when subscriber downgrades from Pro to Standard?

## Verification Checklist

- [ ] Stripe webhook receives and processes checkout.session.completed
- [ ] handleModularSubscription() upserts correct app_id + tier
- [ ] resolveOrgEntitlements() returns correct flags after purchase
- [ ] withAppAuth("punchwalk") blocks unsubscribed users
- [ ] Account billing tab shows current plan
- [ ] Beta flag (once implemented) correctly gates access
- [ ] No double-charge on webhook replay
