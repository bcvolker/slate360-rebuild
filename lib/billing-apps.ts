/**
 * Standalone app billing definitions.
 *
 * Tier-based subscriptions live in lib/billing.ts.
 * This file handles per-app standalone subscriptions (Phase 1B+)
 * AND the new modular per-app subscription model.
 */

import type { AppId, AppTier, BundleId, StorageAddonId } from "@/lib/entitlements-modular";

export type StandaloneAppId = "tour_builder" | "punchwalk" | "design_studio" | "content_studio";

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
  design_studio: {
    appId: "design_studio",
    label: "Design Studio",
    description: "3D model upload, viewing, and design context",
    monthlyPriceUsd: 49,
    priceIds: {
      monthly: process.env.STRIPE_PRICE_APP_DESIGN_STUDIO_MONTHLY,
    },
  },
  content_studio: {
    appId: "content_studio",
    label: "Content Studio",
    description: "Media upload, editing, and content management",
    monthlyPriceUsd: 49,
    priceIds: {
      monthly: process.env.STRIPE_PRICE_APP_CONTENT_STUDIO_MONTHLY,
    },
  },
};

export function isStandaloneAppId(value: string | null | undefined): value is StandaloneAppId {
  return value === "tour_builder" || value === "punchwalk" || value === "design_studio" || value === "content_studio";
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

// ---------------------------------------------------------------------------
// Per-App Modular Plan Definitions (Stripe price IDs)
// ---------------------------------------------------------------------------

type ModularPlanKey = `${AppId}_${"basic" | "pro"}`;

interface ModularStripePlan {
  appId: AppId;
  tier: Exclude<AppTier, "none">;
  label: string;
  monthlyPriceUsd: number;
  priceId: string | undefined;
}

export const MODULAR_APP_PLANS: Record<ModularPlanKey, ModularStripePlan> = {
  site_walk_basic: {
    appId: "site_walk", tier: "basic", label: "Site Walk Basic", monthlyPriceUsd: 79,
    priceId: process.env.STRIPE_PRICE_SITEWALK_BASIC,
  },
  site_walk_pro: {
    appId: "site_walk", tier: "pro", label: "Site Walk Pro", monthlyPriceUsd: 129,
    priceId: process.env.STRIPE_PRICE_SITEWALK_PRO,
  },
  tours_basic: {
    appId: "tours", tier: "basic", label: "360 Tours Basic", monthlyPriceUsd: 49,
    priceId: process.env.STRIPE_PRICE_TOURS_BASIC,
  },
  tours_pro: {
    appId: "tours", tier: "pro", label: "360 Tours Pro", monthlyPriceUsd: 99,
    priceId: process.env.STRIPE_PRICE_TOURS_PRO,
  },
  slatedrop_basic: {
    appId: "slatedrop", tier: "basic", label: "SlateDrop Basic", monthlyPriceUsd: 0,
    priceId: undefined, // included with any paid app
  },
  slatedrop_pro: {
    appId: "slatedrop", tier: "pro", label: "SlateDrop Pro", monthlyPriceUsd: 39,
    priceId: process.env.STRIPE_PRICE_SLATEDROP_PRO,
  },
  design_studio_basic: {
    appId: "design_studio", tier: "basic", label: "Design Studio Basic", monthlyPriceUsd: 49,
    priceId: process.env.STRIPE_PRICE_DESIGNSTUDIO_BASIC,
  },
  design_studio_pro: {
    appId: "design_studio", tier: "pro", label: "Design Studio Pro", monthlyPriceUsd: 99,
    priceId: process.env.STRIPE_PRICE_DESIGNSTUDIO_PRO,
  },
  content_studio_basic: {
    appId: "content_studio", tier: "basic", label: "Content Studio Basic", monthlyPriceUsd: 49,
    priceId: process.env.STRIPE_PRICE_CONTENTSTUDIO_BASIC,
  },
  content_studio_pro: {
    appId: "content_studio", tier: "pro", label: "Content Studio Pro", monthlyPriceUsd: 99,
    priceId: process.env.STRIPE_PRICE_CONTENTSTUDIO_PRO,
  },
};

interface BundleStripePlan {
  bundleId: BundleId;
  label: string;
  monthlyPriceUsd: number;
  priceId: string | undefined;
}

export const BUNDLE_PLANS: Record<BundleId, BundleStripePlan> = {
  field_pro: {
    bundleId: "field_pro", label: "Field Pro Bundle", monthlyPriceUsd: 149,
    priceId: process.env.STRIPE_PRICE_BUNDLE_FIELD_PRO,
  },
  all_access: {
    bundleId: "all_access", label: "All Access Bundle", monthlyPriceUsd: 249,
    priceId: process.env.STRIPE_PRICE_BUNDLE_ALL_ACCESS,
  },
};

interface StorageAddonPlan {
  id: StorageAddonId;
  storageGB: number;
  monthlyPriceUsd: number;
  priceId: string | undefined;
}

export const STORAGE_ADDON_PLANS: Record<StorageAddonId, StorageAddonPlan> = {
  storage_10gb: {
    id: "storage_10gb", storageGB: 10, monthlyPriceUsd: 9,
    priceId: process.env.STRIPE_PRICE_STORAGE_10GB,
  },
  storage_50gb: {
    id: "storage_50gb", storageGB: 50, monthlyPriceUsd: 29,
    priceId: process.env.STRIPE_PRICE_STORAGE_50GB,
  },
};

/** Credit add-on packs (one-time purchase). */
export const CREDIT_ADDON_PACKS = [
  { id: "credits_500" as const, credits: 500, priceUsd: 19, priceId: process.env.STRIPE_PRICE_CREDITS_500 },
  { id: "credits_2000" as const, credits: 2000, priceUsd: 49, priceId: process.env.STRIPE_PRICE_CREDITS_2000 },
  { id: "credits_5000" as const, credits: 5000, priceUsd: 99, priceId: process.env.STRIPE_PRICE_CREDITS_5000 },
] as const;

export type CreditAddonId = (typeof CREDIT_ADDON_PACKS)[number]["id"];

/** Look up a modular plan Stripe price ID by app + tier. */
export function getModularPriceId(appId: AppId, tier: Exclude<AppTier, "none">): string | null {
  const key = `${appId}_${tier}` as ModularPlanKey;
  return MODULAR_APP_PLANS[key]?.priceId ?? null;
}

/** Reverse-lookup: given a Stripe priceId, find which app + tier it belongs to. */
export function getModularPlanFromPriceId(priceId: string): { appId: AppId; tier: Exclude<AppTier, "none"> } | null {
  if (!priceId) return null;
  for (const plan of Object.values(MODULAR_APP_PLANS)) {
    if (plan.priceId === priceId) return { appId: plan.appId, tier: plan.tier };
  }
  return null;
}

/** Reverse-lookup: given a Stripe priceId, find which bundle it belongs to. */
export function getBundleFromPriceId(priceId: string): BundleId | null {
  if (!priceId) return null;
  for (const plan of Object.values(BUNDLE_PLANS)) {
    if (plan.priceId === priceId) return plan.bundleId;
  }
  return null;
}
