/**
 * Standalone app billing definitions.
 *
 * Tier-based subscriptions live in lib/billing.ts.
 * This file handles per-app standalone subscriptions (Phase 1B+).
 */

export type StandaloneAppId = "tour_builder" | "punchwalk";

export type AppBillingCycle = "monthly"; // annual can be added later

type StandaloneAppPlan = {
  appId: StandaloneAppId;
  label: string;
  description: string;
  monthlyPriceUsd: number; // display price in dollars
  priceIds: Partial<Record<AppBillingCycle, string>>;
};

export const STANDALONE_APP_PLANS: Record<StandaloneAppId, StandaloneAppPlan> = {
  tour_builder: {
    appId: "tour_builder",
    label: "Tour Builder",
    description: "Create and host 360° virtual tours",
    monthlyPriceUsd: 49,
    priceIds: {
      monthly: process.env.STRIPE_PRICE_APP_TOUR_BUILDER_MONTHLY,
    },
  },
  punchwalk: {
    appId: "punchwalk",
    label: "PunchWalk",
    description: "Punch list and field walkthrough app",
    monthlyPriceUsd: 49,
    priceIds: {
      monthly: process.env.STRIPE_PRICE_APP_PUNCHWALK_MONTHLY,
    },
  },
};

export function isStandaloneAppId(value: string | null | undefined): value is StandaloneAppId {
  return value === "tour_builder" || value === "punchwalk";
}

export function getAppPriceId(appId: StandaloneAppId, cycle: AppBillingCycle = "monthly"): string | null {
  const plan = STANDALONE_APP_PLANS[appId];
  return plan?.priceIds[cycle] ?? null;
}

export function getAppFromPriceId(priceId: string | null | undefined): StandaloneAppId | null {
  if (!priceId) return null;
  const match = (Object.keys(STANDALONE_APP_PLANS) as StandaloneAppId[]).find((appId) => {
    const prices = Object.values(STANDALONE_APP_PLANS[appId].priceIds).filter(Boolean) as string[];
    return prices.includes(priceId);
  });
  return match ?? null;
}
