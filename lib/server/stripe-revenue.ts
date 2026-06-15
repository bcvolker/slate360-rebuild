import "server-only";

import type Stripe from "stripe";
import { getStripeClient } from "@/lib/stripe";
import type { RevenueSnapshot } from "@/lib/ops-console/types";

const NOT_CONFIGURED: RevenueSnapshot = {
  configured: false,
  mrr: 0,
  arr: 0,
  activeSubscribers: 0,
  trialingSubscribers: 0,
  currency: "usd",
};

/** Normalize a recurring price's amount to a monthly figure (in cents). */
function monthlyCents(item: Stripe.SubscriptionItem): number {
  const price = item.price;
  const unit = price.unit_amount ?? 0; // tiered/usage prices report null — treated as 0
  const qty = item.quantity ?? 1;
  const recurring = price.recurring;
  if (!recurring) return 0;
  const gross = unit * qty;
  const count = recurring.interval_count || 1;
  switch (recurring.interval) {
    case "year":
      return gross / (12 * count);
    case "week":
      return (gross * 52) / (12 * count);
    case "day":
      return (gross * 365) / (12 * count);
    case "month":
    default:
      return gross / count;
  }
}

/**
 * Computes live MRR/ARR from Stripe subscriptions. MRR counts only `active`
 * subscriptions (trials are reported separately as future revenue). Returns a
 * not-configured snapshot when there's no Stripe key, and never throws — on any
 * Stripe error it logs and returns not-configured so the console still renders.
 */
export async function computeStripeRevenue(): Promise<RevenueSnapshot> {
  if (!process.env.STRIPE_SECRET_KEY) return NOT_CONFIGURED;

  try {
    const stripe = getStripeClient();
    let mrrCents = 0;
    let active = 0;
    let trialing = 0;
    let currency = "usd";

    const params: Stripe.SubscriptionListParams = {
      status: "all",
      limit: 100,
      expand: ["data.items.data.price"],
    };

    for await (const sub of stripe.subscriptions.list(params)) {
      if (sub.status === "active") {
        active += 1;
        for (const item of sub.items.data) {
          mrrCents += monthlyCents(item);
          if (item.price.currency) currency = item.price.currency;
        }
      } else if (sub.status === "trialing") {
        trialing += 1;
      }
    }

    const mrr = Math.round(mrrCents / 100);
    return {
      configured: true,
      mrr,
      arr: mrr * 12,
      activeSubscribers: active,
      trialingSubscribers: trialing,
      currency,
    };
  } catch (err) {
    console.error("[stripe-revenue] failed to compute MRR:", err);
    return NOT_CONFIGURED;
  }
}
