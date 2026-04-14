# Billing — Prompt Backlog

Last Updated: 2026-04-14
Doctrine Source: docs/SLATE360_MASTER_BUILD_PLAN.md

## Phase A — Pre-Design (Before Beta)

### B-A1: Verify Site Walk Checkout E2E
- Test: pricing page → select Site Walk → Stripe checkout → webhook fires → org_app_subscriptions updated → page access granted
- Must work for at least one plan (standard or pro)
- **Why now:** CRITICAL for beta — users need to be able to subscribe to Site Walk

### B-A2: Add Beta Access Flag
- Add beta_access boolean to org_feature_flags (or new column)
- CEO can toggle via /ceo page
- Middleware checks flag before granting workspace access
- **Why now:** CRITICAL — no gate exists

### B-A3: Verify Account Billing Tab
- My Account billing tab must show: current plan, status, next billing date
- If no subscription: show prompt to subscribe
- **Why now:** MODERATE — testers need to see their status

### B-A4: Add Collaborator Seat Limit to Entitlements
- Entitlement resolver must return maxCollaborators based on subscriber tier
- Add maxCollaborators field to resolveOrgEntitlements() output
- Enforce limit when subscriber tries to invite beyond their tier
- **Why now:** MODERATE — needed before collaborator invite flow can be built

## Phase B — After Beta Stable

### B-B1: Fix TIER_MAP Trial Differentiation
- Update TIER_MAP so trial tier has app booleans false
- Trial users should see the platform shell but not access modules until they subscribe
- **After P-A1:** once placeholder modules are hidden, trial gating matters less

### B-B2: Stripe Product Audit
- List all Stripe products/prices via API
- Cross-reference with env vars
- Identify mismatches
- **Not Phase 1 blocking** — only Site Walk checkout matters for beta

### B-B3: Bundle Checkout Testing
- Test Field Pro Bundle purchase
- Test All Access Bundle purchase
- **Not Phase 1** — bundles are future

### B-B4: Collaborator Downgrade Policy
- Define behavior when subscriber downgrades to tier with fewer collaborator seats
- Options: freeze excess collaborators, notify and remove after grace period, or block downgrade
- **Not Phase 1 blocking** — needed before tier changes are live

## Deprioritized (Not Phase 1)

### B-X1: Subscription Management UI
- Upgrade/downgrade/cancel — after beta

### B-X2: Invoice History
- Past invoices from Stripe — after beta

### B-X3: Credit System E2E
- Credit pack purchase and consumption — after beta

### B-X4: Storage Addon Checkout
- Storage tier purchase — after beta

### B-X5: Annual vs Monthly Toggle
- Pricing page toggle — after beta

### B-X6: Team/Seat Billing
- Per-seat pricing for enterprise — future
