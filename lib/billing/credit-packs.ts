/**
 * Single source of truth for credit-pack pricing — web (Stripe) and native
 * (StoreKit IAP) both read from here. Never hardcode a pack price elsewhere.
 */
export type CreditPackId = "starter" | "growth" | "pro";

export type CreditPack = {
  id: CreditPackId;
  credits: number;
  priceUsdCents: number;
  /** Name of the env var holding the Stripe price ID (looked up at use-site, not stored resolved). */
  stripePriceEnvVar: string;
  /** StoreKit/Play product ID for the native IAP consumable (see docs/specs/STORE_IAP_ENTITLEMENTS.md). */
  iapProductId: string;
};

export const CREDIT_PACKS: Record<CreditPackId, CreditPack> = {
  starter: {
    id: "starter",
    credits: 500,
    priceUsdCents: 2799,
    // Matches what's actually configured in Vercel prod (verified via
    // `vercel env ls production`) — NOT *_STARTER, which doesn't exist and
    // was silently making credit checkout return "missing Stripe price".
    stripePriceEnvVar: "STRIPE_PRICE_CREDITS_500",
    iapProductId: "slate360.credits.starter",
  },
  growth: {
    id: "growth",
    credits: 2000,
    priceUsdCents: 6999,
    stripePriceEnvVar: "STRIPE_PRICE_CREDITS_2000",
    iapProductId: "slate360.credits.growth",
  },
  pro: {
    id: "pro",
    credits: 5000,
    priceUsdCents: 13999,
    stripePriceEnvVar: "STRIPE_PRICE_CREDITS_5000",
    iapProductId: "slate360.credits.pro",
  },
};

export function isCreditPackId(value: string | null | undefined): value is CreditPackId {
  return value === "starter" || value === "growth" || value === "pro";
}

export function getCreditPack(id: string | null | undefined): CreditPack | null {
  return isCreditPackId(id) ? CREDIT_PACKS[id] : null;
}

export function formatCreditPackPrice(pack: CreditPack): string {
  return `$${(pack.priceUsdCents / 100).toFixed(2)}`;
}

/** Cheapest pack — used for "packs start at $X" copy. */
export function cheapestCreditPack(): CreditPack {
  return Object.values(CREDIT_PACKS).reduce((min, pack) =>
    pack.priceUsdCents < min.priceUsdCents ? pack : min,
  );
}
