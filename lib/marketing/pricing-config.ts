export type BillingCadence = "monthly" | "annual";

export type MarketingPricingTier = {
  id: string;
  app: "site-walk" | "twin-360" | "bundle" | "enterprise";
  name: string;
  monthly: number | null;
  annual: number | null;
  annualEffectiveMonthly: number | null;
  badge?: string;
  features: string[];
  cta: string;
  ctaHref: string;
};

const ANNUAL_DISCOUNT = 0.17;

function annualFromMonthly(monthly: number): number {
  return Math.round(monthly * 12 * (1 - ANNUAL_DISCOUNT));
}

function effectiveMonthly(annual: number): number {
  return Math.round(annual / 12);
}

export const ANNUAL_SAVINGS_PERCENT = Math.round(ANNUAL_DISCOUNT * 100);

export const SITE_WALK_PRICING: MarketingPricingTier[] = [
  {
    id: "site-walk-basic",
    app: "site-walk",
    name: "Site Walk Basic",
    monthly: 79,
    annual: annualFromMonthly(79),
    annualEffectiveMonthly: effectiveMonthly(annualFromMonthly(79)),
    features: [
      "Walk-and-capture documentation, stop by stop",
      "Photos, voice notes, pins, and markups in one place",
      "Interactive reports clients open from a link",
      "Keeps working offline — syncs when you're back in coverage",
    ],
    cta: "Start 14-day free trial",
    ctaHref: "/signup?plan=site-walk-basic",
  },
  {
    id: "site-walk-pro",
    app: "site-walk",
    name: "Site Walk Pro",
    monthly: 149,
    annual: annualFromMonthly(149),
    annualEffectiveMonthly: effectiveMonthly(annualFromMonthly(149)),
    features: [
      "Everything in Basic",
      "Walk with your drawings — pin observations right on the plan",
      "Invite subs and collaborators into your projects",
      "Priority processing for plan uploads",
    ],
    cta: "Start 14-day free trial",
    ctaHref: "/signup?plan=site-walk-pro",
  },
];

export const TWIN_360_PRICING: MarketingPricingTier[] = [
  {
    id: "twin-360-essential",
    app: "twin-360",
    name: "Twin 360 Essential",
    monthly: 99,
    annual: annualFromMonthly(99),
    annualEffectiveMonthly: effectiveMonthly(annualFromMonthly(99)),
    features: [
      "Turn walkthrough videos into explorable 3D twins",
      "About 5 standard twins a month included (~500 credits)",
      "Viewers explore from any browser — no app, no login",
      "Uses your phone's LiDAR automatically when available",
    ],
    cta: "Start 14-day free trial",
    ctaHref: "/signup?plan=twin-360-essential",
  },
  {
    id: "twin-360-professional",
    app: "twin-360",
    name: "Twin 360 Professional",
    monthly: 249,
    annual: annualFromMonthly(249),
    annualEffectiveMonthly: effectiveMonthly(annualFromMonthly(249)),
    features: [
      "Everything in Essential",
      "About 20 standard twins a month included (~2,000 credits)",
      "Studio editing, embeds, and white-label sharing",
      "Front-of-the-line processing for big jobs",
    ],
    cta: "Start 14-day free trial",
    ctaHref: "/signup?plan=twin-360-professional",
  },
];

export const BUNDLE_PRICING: MarketingPricingTier = {
  id: "bundle",
  app: "bundle",
  name: "Site Walk + Twin 360 Bundle",
  monthly: 349,
  annual: annualFromMonthly(349),
  annualEffectiveMonthly: effectiveMonthly(annualFromMonthly(349)),
  badge: "BEST VALUE",
  features: [
    "Site Walk Pro and Twin 360 Professional together",
    "One set of projects shared across both apps",
    "Combined storage and processing for everything you capture",
    "One invoice — less than the two apps separately",
  ],
  cta: "Start 14-day free trial",
  ctaHref: "/signup?plan=bundle",
};

export const ENTERPRISE_PRICING: MarketingPricingTier = {
  id: "enterprise",
  app: "enterprise",
  name: "Enterprise",
  monthly: null,
  annual: null,
  annualEffectiveMonthly: null,
  features: [
    "Seats and pricing shaped to your team",
    "Shared storage and processing across the whole company",
    "Your logo on everything clients see",
    "A real person to get your crews onboarded",
  ],
  cta: "Contact Sales",
  ctaHref: "/contact",
};

export const DATA_PROCESSING_POINTS = [
  "Generous monthly processing credits included",
  "Transparent credit top-ups",
  "Storage add-ons",
  "Enterprise pooled credits & storage",
] as const;

export const CREDIT_EQUIVALENCE_NOTE =
  "1 standard 3D reconstruction ≈ 100 credits." as const;

export function formatPrice(amount: number): string {
  return `$${amount.toLocaleString("en-US")}`;
}

export function priceForCadence(
  tier: MarketingPricingTier,
  cadence: BillingCadence,
): { primary: string; meta?: string } | null {
  if (tier.monthly === null || tier.annual === null) return null;

  if (cadence === "monthly") {
    return { primary: `${formatPrice(tier.monthly)}/mo` };
  }

  return {
    primary: `${formatPrice(tier.annual)}/yr`,
    meta: `${formatPrice(tier.annualEffectiveMonthly ?? 0)}/mo billed annually`,
  };
}
