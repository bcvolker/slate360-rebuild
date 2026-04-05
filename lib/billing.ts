import type { Tier } from "@/lib/entitlements";

export type BillingCycle = "monthly" | "annual";
export type PaidTier = Exclude<Tier, "trial" | "enterprise">;
export type CreditPackId = "starter" | "growth" | "pro";

type SubscriptionPlan = {
  tier: PaidTier;
  label: string;
  priceIds: Partial<Record<BillingCycle, string>>;
};

type CreditPack = {
  id: CreditPackId;
  label: string;
  credits: number;
  priceId?: string;
};

export const SUBSCRIPTION_PLANS: Record<PaidTier, SubscriptionPlan> = {
  creator: {
    tier: "creator",
    label: "Creator",
    priceIds: {
      monthly: process.env.STRIPE_PRICE_CREATOR_MONTHLY,
      annual: process.env.STRIPE_PRICE_CREATOR_ANNUAL,
    },
  },
  model: {
    tier: "model",
    label: "Model",
    priceIds: {
      monthly: process.env.STRIPE_PRICE_MODEL_MONTHLY,
      annual: process.env.STRIPE_PRICE_MODEL_ANNUAL,
    },
  },
  business: {
    tier: "business",
    label: "Business",
    priceIds: {
      monthly: process.env.STRIPE_PRICE_BUSINESS_MONTHLY,
      annual: process.env.STRIPE_PRICE_BUSINESS_ANNUAL,
    },
  },
};

export const CREDIT_PACKS: Record<CreditPackId, CreditPack> = {
  starter: {
    id: "starter",
    label: "Starter Pack",
    credits: 5000,
    priceId: process.env.STRIPE_PRICE_CREDITS_STARTER,
  },
  growth: {
    id: "growth",
    label: "Growth Pack",
    credits: 15000,
    priceId: process.env.STRIPE_PRICE_CREDITS_GROWTH,
  },
  pro: {
    id: "pro",
    label: "Pro Pack",
    credits: 50000,
    priceId: process.env.STRIPE_PRICE_CREDITS_PRO,
  },
};

export function isPaidTier(value: string | null | undefined): value is PaidTier {
  return value === "creator" || value === "model" || value === "business";
}

export function getSubscriptionPriceId(tier: PaidTier, cycle: BillingCycle): string | null {
  const plan = SUBSCRIPTION_PLANS[tier];
  return plan?.priceIds[cycle] ?? null;
}

export function getTierFromPriceId(priceId: string | null | undefined): PaidTier | null {
  if (!priceId) return null;

  const match = (Object.keys(SUBSCRIPTION_PLANS) as PaidTier[]).find((tier) => {
    const prices = Object.values(SUBSCRIPTION_PLANS[tier].priceIds).filter(Boolean) as string[];
    return prices.includes(priceId);
  });

  return match ?? null;
}

export function getCreditPack(packId: string | null | undefined): CreditPack | null {
  if (!packId) return null;
  if (packId === "starter" || packId === "growth" || packId === "pro") {
    return CREDIT_PACKS[packId];
  }
  return null;
}

export function recommendedUpgradeTier(currentTier: Tier): PaidTier {
  switch (currentTier) {
    case "trial":
      return "creator";
    case "creator":
      return "model";
    case "model":
    case "business":
    case "enterprise":
    default:
      return "business";
  }
}

/* ────────────────────────────────────────────────────────
   Centralized upgrade URL builder
   
   Returns a Stripe Payment Link when a STRIPE_UPGRADE_LINK env var
   is configured (prefilled with orgId + appId metadata), otherwise
   falls back to the in-app signup route.
   
   Usage:
     getUpgradeUrl()                         → "/signup"
     getUpgradeUrl({ appId: "tour_builder" })→ "/signup?app=tour_builder"
     (with STRIPE_UPGRADE_LINK set)          → "https://buy.stripe.com/…?client_reference_id=org_123"
   ──────────────────────────────────────────────────────── */

export type AppId = "tour_builder" | "punchwalk";

interface UpgradeUrlOptions {
  orgId?: string;
  appId?: AppId;
}

export function getUpgradeUrl(options?: UpgradeUrlOptions): string {
  const { orgId, appId } = options ?? {};

  // If a Stripe Payment Link is configured, use it with metadata query params
  const stripeLink = typeof window === "undefined"
    ? process.env.STRIPE_UPGRADE_LINK
    : undefined; // Payment Links should only resolve server-side

  if (stripeLink) {
    const url = new URL(stripeLink);
    if (orgId) url.searchParams.set("client_reference_id", orgId);
    if (appId) url.searchParams.set("prefilled_promo_code", appId); // Stripe PL metadata
    return url.toString();
  }

  // Fallback: in-app signup route
  const params = new URLSearchParams();
  if (appId) params.set("app", appId);
  const qs = params.toString();
  return qs ? `/signup?${qs}` : "/signup";
}
