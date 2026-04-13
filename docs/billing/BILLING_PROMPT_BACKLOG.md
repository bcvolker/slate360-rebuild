# Billing — Prompt Backlog

Last Updated: 2026-04-13

## Do Now (Safe, No Dependencies)

### B-P1: Fix Page Gates for DS/CS
- Design Studio: change `canAccessDesignStudio` → `canAccessStandaloneDesignStudio`
- Content Studio: change `canAccessContent` → `canAccessStandaloneContent`
- Add these keys to `resolveOrgEntitlements()` / `resolveModularEntitlements()` if missing
- **Why now:** P0 — any trial user can access DS/CS pages

### B-P2: Fix Site Walk API Gating
- Migrate all 31 `/api/site-walk/` routes from `withAuth()` to `withAppAuth("punchwalk")`
- **Why now:** P0 — any authenticated user can call SW APIs without subscription

### B-P3: Fix TIER_MAP Trial Differentiation
- Update `TIER_MAP` in `lib/entitlements.ts` so trial tier has app booleans `false`
- This makes client-side nav gating functional
- **Why now:** P1 — nav gating currently decorative

### B-P4: Deduplicate STRIPE_WEBHOOK_SECRET
- Check if the duplicate in `.env` causes issues
- Remove the duplicate if values are identical
- **Why now:** Potential webhook signature failure

## After Gating Hardening

### B-P5: Stripe Product/Price Audit
- Use Stripe API to list all products and prices
- Cross-reference with the 22+ `STRIPE_PRICE_*` env vars
- Identify any missing or mismatched products
- **Requires:** Stripe API access (available via secret key)

### B-P6: Checkout Flow E2E Test
- Test: select plan → Stripe checkout → webhook → subscription active → page accessible
- Test for Site Walk (the only fully sellable app)
- Document the exact flow and any failures

### B-P7: Verify withAppAuth for All App Modules
- Audit all API routes across all 4 app modules
- Ensure each uses `withAppAuth(app_id)` not just `withAuth()`
- Create a matrix: route → auth wrapper → expected behavior

## After Billing Fully Unified

### B-P8: Subscription Management UI
- Add upgrade/downgrade/cancel actions to Account Billing Tab
- Show current plan, next billing date, usage
- Stripe Customer Portal integration (simplest approach)

### B-P9: Bundle Checkout Testing
- Test Field Pro Bundle purchase
- Test All Access Bundle purchase
- Verify webhook correctly activates multiple apps

### B-P10: Credit System E2E
- Test credit pack purchase
- Verify idempotent writes
- Test credit consumption and balance display

## After Dashboard Rewrite

### B-P11: Usage Dashboard
- Display current credit usage, storage usage, seat count
- Per-app usage breakdown
- Upgrade prompts when approaching limits

### B-P12: Invoice History
- Display past invoices from Stripe
- Download invoice PDFs
- Payment method management

## Future / Roadmap

### B-P13: Annual vs Monthly Toggle
- Pricing page shows both options
- Smooth switch between annual/monthly
- Pro-rate calculations

### B-P14: Team/Seat Billing
- Per-seat pricing for business/enterprise
- Seat management UI
- Invitation flow with seat allocation
