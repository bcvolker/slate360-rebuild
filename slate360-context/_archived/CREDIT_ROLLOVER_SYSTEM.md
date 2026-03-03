# Credit System Updates: Rollover Credits & Usage Tracking

## Overview

This document outlines the credit system improvements implemented to support:
1. **Credit Rollover** - Purchased credits never expire and carry over indefinitely
2. **Accurate Usage Tracking** - Clear breakdown of monthly allocation vs purchased credits
3. **Subtle Credit Purchase** - Non-intrusive option to buy additional credits

---

## Database Changes

### Migration: `add_purchased_credits_rollover`

Added to the `credits` table:
- `purchased_balance` (integer) - Credits purchased that never expire
- `monthly_credits_used` (integer) - How many monthly credits consumed this period
- `monthly_reset_at` (timestamptz) - When monthly credits were last reset

Added to `credit_ledger`:
- `credit_source` (text) - 'monthly', 'purchased', 'bonus', 'refund', or 'mixed'

### New Functions

| Function | Purpose |
|----------|---------|
| `reset_monthly_credits(org_id)` | Resets monthly credits on billing cycle |
| `consume_credits(org_id, amount, ...)` | Consumes credits, prioritizing monthly first |
| `add_purchased_credits(org_id, amount, ...)` | Adds purchased credits to balance |
| `get_credit_breakdown(org_id)` | Returns detailed credit breakdown |

### View: `org_credit_summary`

Provides a convenient view of credit status:
```sql
SELECT * FROM org_credit_summary WHERE org_id = 'your-org-id';
```

Returns: `monthly_allocation`, `monthly_credits_used`, `monthly_remaining`, `purchased_balance`, `total_available`, `monthly_reset_at`

---

## Credit Consumption Logic

When credits are consumed, the system:

1. **First uses monthly allocation credits** (which reset each billing period)
2. **Then uses purchased credits** (which never expire)

This ensures users get maximum value from their subscription while preserving purchased credits for overages.

---

## API Changes

### `/api/dashboard/usage` (GET)

Now returns enhanced credit breakdown:

```typescript
{
  storage: { used, limit, percent },
  compute: { used, limit, percent },
  bandwidth: { used, limit, percent },
  credits: {
    // Legacy fields (backwards compatible)
    balance: number,
    used: number,
    limit: number,
    // NEW breakdown fields
    monthlyAllocation: number,   // Credits from subscription
    monthlyUsed: number,         // Monthly credits consumed
    monthlyRemaining: number,    // Monthly credits left
    purchasedBalance: number,    // Purchased credits (never expire)
    totalAvailable: number,      // Total credits available
    daysUntilReset: number,      // Days until monthly reset
  },
  daysRemaining: number,
  updatedAt: string
}
```

### `/api/credits/purchase` (POST)

Creates Stripe checkout session for purchasing credit packs:

```typescript
// Request
{
  packId: 'starter' | 'pro' | 'enterprise',
  computeUnits: number,
  storageMb?: number,
  priceUsd: number
}

// Response
{
  url: string  // Stripe Checkout URL
}
```

---

## New Components

### `EnhancedUsageTracker`

Location: `src/components/dashboard/EnhancedUsageTracker.tsx`

A comprehensive usage widget showing:
- Storage used/remaining with progress bar
- Monthly credits used/remaining with reset countdown
- Purchased credits balance (highlighted, never expires)
- Total available credits
- Subtle "Need more credits?" link

Usage:
```tsx
<EnhancedUsageTracker />                    // Full version
<EnhancedUsageTracker compact />            // Compact for sidebar
<EnhancedUsageTracker showPurchaseOption={false} />  // Hide purchase link
```

### `SubtleCreditPurchase`

Location: `src/components/credits/SubtleCreditPurchase.tsx`

A deliberately subtle credit purchase dialog:
- Available as link, button, or badge trigger
- Shows credit packs with prices
- Emphasizes that credits never expire
- Non-pushy design to avoid "hidden fee" perception

Usage:
```tsx
<SubtleCreditPurchase />                    // Default link style
<SubtleCreditPurchase trigger="button" />   // Button style
<SubtleCreditPurchase trigger="badge" label="Top up" />  // Badge style
```

### `CreditIndicator`

Location: `src/components/credits/SubtleCreditPurchase.tsx`

Mini credit display for headers/toolbars:
```tsx
<CreditIndicator 
  credits={250} 
  showPurchaseOnLow    // Show "Top up" badge when low
  lowThreshold={50}    // When to consider "low"
/>
```

### `CreditWarning`

Location: `src/components/credits/SubtleCreditPurchase.tsx`

Warning banner for when credits might run out:
```tsx
<CreditWarning
  remainingCredits={45}
  daysRemaining={12}
  averageDailyUsage={5}  // Optional: for projection
/>
```

---

## Credit Packs Available

| Pack | Credits | Storage | Price |
|------|---------|---------|-------|
| Starter | 100 | 5GB | $9.99 |
| Pro | 500 | 25GB | $39.99 |
| Enterprise | 2,000 | 100GB | $99.99 |

---

## Key Design Decisions

### Why Subtle Credit Purchasing?

Per user request: "I don't want to draw a lot of attention to the option to buy credits because it can create suspicion that there will be additional charges or hidden fees."

The credit purchase is:
- Not prominently displayed
- Only shown when relevant (approaching limit)
- Framed as "top up" rather than upsell
- Emphasizes that credits never expire

### Monthly vs Purchased Priority

Monthly credits are used first because:
- They reset anyway (use it or lose it)
- Purchased credits represent user investment
- This maximizes value for subscribers

### Rollover Guarantee

Purchased credits explicitly never expire:
- Stored separately from monthly allocation
- No TTL or expiration logic
- Clearly communicated in UI tooltips

---

## Migration Notes

Existing credit balances will be treated as monthly credits. To migrate existing purchased credits (if any were tracked differently), run:

```sql
-- Example: Move 500 credits from generic balance to purchased_balance
UPDATE credits 
SET purchased_balance = 500, balance = balance 
WHERE org_id = 'your-org-id';
```

---

## Testing

1. **View current credits**: Check dashboard for accurate breakdown
2. **Consume credits**: Run a job and verify monthly used first
3. **Purchase credits**: Complete checkout flow
4. **Verify rollover**: Ensure purchased credits don't reset with monthly
5. **Monthly reset**: Test `reset_monthly_credits()` function
