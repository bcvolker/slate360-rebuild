# Billing — Env & Tool Matrix

Last Updated: 2026-04-13

## Environment Variables

### Core Stripe
| Variable | Where Referenced | Required? | Status |
|----------|-----------------|-----------|--------|
| `STRIPE_SECRET_KEY` | `lib/stripe.ts`, webhook route | Yes | Present in `.env` |
| `STRIPE_WEBHOOK_SECRET` | `app/api/stripe/webhook/route.ts` | Yes | Present in `.env` (appears twice — potential issue) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Client-side Stripe.js | Yes | Present in `.env` |

### Plan Price IDs (22+ variables)
| Variable Pattern | Purpose | Status |
|-----------------|---------|--------|
| `STRIPE_PRICE_STANDARD_MONTHLY/ANNUAL` | Platform tier pricing | Present |
| `STRIPE_PRICE_BUSINESS_MONTHLY/ANNUAL` | Business tier pricing | Present |
| `STRIPE_PRICE_APP_*_MONTHLY` | Per-app pricing (tour_builder, punchwalk, design_studio, content_studio) | Present |
| `STRIPE_PRICE_SITEWALK_BASIC/PRO` | Site Walk app tiers | Present |
| `STRIPE_PRICE_TOURS_BASIC/PRO` | Tours app tiers | Present |
| `STRIPE_PRICE_DESIGNSTUDIO_BASIC/PRO` | Design Studio tiers | Present |
| `STRIPE_PRICE_CONTENTSTUDIO_BASIC/PRO` | Content Studio tiers | Present |
| `STRIPE_PRICE_SLATEDROP_PRO` | SlateDrop pro tier | Present |
| `STRIPE_PRICE_BUNDLE_FIELD_PRO` | Field Pro Bundle | Present |
| `STRIPE_PRICE_BUNDLE_ALL_ACCESS` | All Access Bundle | Present |
| `STRIPE_PRICE_STORAGE_10GB/50GB` | Storage add-ons | Present |
| `STRIPE_PRICE_CREDITS_*` | Credit packs | Present |

## External Services

| Service | Purpose | Access | Status |
|---------|---------|--------|--------|
| Stripe | Payment processing, subscriptions, webhooks | API via `STRIPE_SECRET_KEY` | **Active** — verified via API |
| Supabase | Subscription state in `organizations`, `org_app_subscriptions` | Via service role | **Active** |

## What Can Be Verified From Repo Only

- Webhook handler logic and plan key parsing
- Entitlements resolver logic
- Price ID variable references
- Billing UI component structure
- Type definitions for plans, tiers, entitlements

## What Requires Live External Access

- Stripe product/price existence (do the price IDs actually exist in Stripe?)
- Webhook endpoint configuration in Stripe dashboard
- Checkout session creation and completion
- Subscription lifecycle (upgrade, downgrade, cancel)
- Invoice generation and payment processing

## Operational Risks

1. **STRIPE_WEBHOOK_SECRET appears twice in `.env`** — could cause signature verification failures if values differ
2. **22+ price ID env vars** — any mismatch between `.env` and Stripe dashboard breaks checkout
3. **No Stripe CLI** in workspace — cannot test webhooks locally without `stripe listen`
4. **Bundle pricing untested** — field_pro and all_access bundles may not have matching Stripe products
5. **Dual email provider** (Resend + SendGrid) — billing emails may go through wrong provider
