"use client";

import {
  SITE_WALK_PRICING,
  TWIN_360_PRICING,
  BUNDLE_PRICING,
  type MarketingPricingTier,
} from "@/lib/marketing/pricing-config";
import { opsConsoleTokens as t } from "@/components/ops/console/ops-console-tokens";

const ALL_PLANS: MarketingPricingTier[] = [...SITE_WALK_PRICING, ...TWIN_360_PRICING, BUNDLE_PRICING];

export function PlansTab() {
  return (
    <div className="space-y-4">
      <div className={t.card}>
        <p className={t.eyebrow}>Plans &amp; pricing</p>
        <p className={`mt-1 ${t.emptyNote}`}>
          Read-only. Canonical source of truth is the homepage (lib/marketing/pricing-config.ts);
          Stripe price IDs are managed via scripts/ops/stripe-sync-catalog.mjs.
        </p>
        <ul className="mt-4 space-y-2">
          {ALL_PLANS.map((plan) => (
            <li key={plan.id} className={t.row}>
              <span className="text-sm font-medium text-[var(--graphite-text-header)]">{plan.name}</span>
              <span className="text-sm text-[var(--graphite-text-body)]">
                {plan.monthly !== null ? `$${plan.monthly.toLocaleString()}/mo` : "Contact sales"}
                {plan.annual !== null ? ` · $${plan.annual.toLocaleString()}/yr` : ""}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
