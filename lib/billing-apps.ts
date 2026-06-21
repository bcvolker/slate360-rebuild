/**
 * Standalone app billing definitions.
 *
 * Tier-based subscriptions live in lib/billing.ts.
 * This file handles per-app standalone subscriptions (Phase 1B+)
 * AND the new modular per-app subscription model.
 */

import type { AppId, AppTier, BundleId, StorageAddonId } from "@/lib/entitlements-modular";

export type StandaloneAppId = "tour_builder" | "punchwalk" | "design_studio" | "content_studio" | "digital_twin";

export type AppBillingCycle = "monthly" | "annual";

/**
 * Homepage CTA slug → internal modular planKey.
 * Homepage (lib/marketing/pricing-config.ts) links to /signup?plan=<slug>,
 * which forwards to /plans?plan=<slug>. Checkout speaks planKeys, so map here.
 */
export const PLAN_SLUG_TO_KEY: Record<string, string> = {
  "site-walk-basic": "site_walk_basic",
  "site-walk-pro": "site_walk_pro",
  "twin-360-essential": "digital_twin_basic",
  "twin-360-professional": "digital_twin_pro",
  "bundle": "bundle_field_pro",
};

/** Resolve a homepage slug (or a raw planKey) to a checkout planKey. */
export function resolvePlanKey(slugOrKey: string): string {
  return PLAN_SLUG_TO_KEY[slugOrKey] ?? slugOrKey;
}

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
  digital_twin: {
    appId: "digital_twin",
    label: "Digital Twin",
    description: "Capture, process, and share interactive 3D twins",
    monthlyPriceUsd: 49,
    priceIds: {
      monthly: process.env.STRIPE_PRICE_APP_DIGITAL_TWIN_MONTHLY,
    },
  },
};

export function isStandaloneAppId(value: string | null | undefined): value is StandaloneAppId {
  return (
    value === "tour_builder" ||
    value === "punchwalk" ||
    value === "design_studio" ||
    value === "content_studio" ||
    value === "digital_twin"
  );
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
  annualPriceId?: string | undefined;
}

export const MODULAR_APP_PLANS: Record<ModularPlanKey, ModularStripePlan> = {
  site_walk_basic: {
    appId: "site_walk", tier: "basic", label: "Site Walk Standard", monthlyPriceUsd: 79,
    priceId: process.env.STRIPE_PRICE_SITEWALK_BASIC,
    annualPriceId: process.env.STRIPE_PRICE_SITEWALK_BASIC_ANNUAL,
  },
  site_walk_pro: {
    appId: "site_walk", tier: "pro", label: "Site Walk Pro", monthlyPriceUsd: 149,
    priceId: process.env.STRIPE_PRICE_SITEWALK_PRO,
    annualPriceId: process.env.STRIPE_PRICE_SITEWALK_PRO_ANNUAL,
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
  digital_twin_basic: {
    appId: "digital_twin", tier: "basic", label: "Twin 360 Essential", monthlyPriceUsd: 99,
    priceId: process.env.STRIPE_PRICE_DIGITALTWIN_BASIC,
    annualPriceId: process.env.STRIPE_PRICE_DIGITALTWIN_BASIC_ANNUAL,
  },
  digital_twin_pro: {
    appId: "digital_twin", tier: "pro", label: "Twin 360 Professional", monthlyPriceUsd: 249,
    priceId: process.env.STRIPE_PRICE_DIGITALTWIN_PRO,
    annualPriceId: process.env.STRIPE_PRICE_DIGITALTWIN_PRO_ANNUAL,
  },
};

interface BundleStripePlan {
  bundleId: BundleId;
  label: string;
  monthlyPriceUsd: number;
  priceId: string | undefined;
  annualPriceId?: string | undefined;
}

export const BUNDLE_PLANS: Record<BundleId, BundleStripePlan> = {
  field_pro: {
    bundleId: "field_pro", label: "Site Walk + Twin 360 Bundle", monthlyPriceUsd: 349,
    priceId: process.env.STRIPE_PRICE_BUNDLE_FIELD_PRO,
    annualPriceId: process.env.STRIPE_PRICE_BUNDLE_FIELD_PRO_ANNUAL,
  },
  // Retained only for the BundleId union; same sellable bundle as field_pro.
  all_access: {
    bundleId: "all_access", label: "Site Walk + Twin 360 Bundle", monthlyPriceUsd: 349,
    priceId: process.env.STRIPE_PRICE_BUNDLE_ALL_ACCESS,
    annualPriceId: process.env.STRIPE_PRICE_BUNDLE_ALL_ACCESS_ANNUAL,
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

/** Look up a modular plan Stripe price ID by app + tier + billing cycle. */
export function getModularPriceId(
  appId: AppId,
  tier: Exclude<AppTier, "none">,
  cycle: AppBillingCycle = "monthly",
): string | null {
  const key = `${appId}_${tier}` as ModularPlanKey;
  const plan = MODULAR_APP_PLANS[key];
  if (!plan) return null;
  return (cycle === "annual" ? plan.annualPriceId : plan.priceId) ?? null;
}

/** Look up a bundle Stripe price ID by bundle + billing cycle. */
export function getBundlePriceId(bundleId: BundleId, cycle: AppBillingCycle = "monthly"): string | null {
  const plan = BUNDLE_PLANS[bundleId];
  if (!plan) return null;
  return (cycle === "annual" ? plan.annualPriceId : plan.priceId) ?? null;
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
