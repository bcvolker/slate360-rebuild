export type BillingCadence = "monthly" | "annual";

export type TierLimits = {
  storageGb: number;
  monthlyCredits: number;
};

export type PricingTier = {
  id: string;
  app: "site-walk" | "digital-twin";
  tier: "basic" | "pro";
  name: string;
  monthly: number;
  annual: number;
  annualEffectiveMonthly: number;
  limits: TierLimits;
  features: string[];
  cta: string;
};

export const SITE_WALK_TIERS: PricingTier[] = [
  {
    id: "site-walk-basic",
    app: "site-walk",
    tier: "basic",
    name: "Site Walk Basic",
    monthly: 49,
    annual: 490,
    annualEffectiveMonthly: 41,
    limits: {
      storageGb: 10,
      monthlyCredits: 400,
    },
    features: [
      "Worksite-based field capture and note workflows",
      "Mobile photo capture with automatic timestamp metadata",
      "Branded PDF reports and secure share links",
      "Offline capture queue with sync when reconnected",
    ],
    cta: "Start Site Walk Basic",
  },
  {
    id: "site-walk-pro",
    app: "site-walk",
    tier: "pro",
    name: "Site Walk Pro",
    monthly: 66,
    annual: 1290,
    annualEffectiveMonthly: 108,
    limits: {
      storageGb: 25,
      monthlyCredits: 1000,
    },
    features: [
      "Everything in Basic, plus full Project workspaces",
      "Blueprint plan pinning with ghost overlay alignment",
      "Advanced deliverable templates and audit trails",
      "Priority processing for plan rasterization jobs",
    ],
    cta: "Start Site Walk Pro",
  },
];

export const DIGITAL_TWIN_TIERS: PricingTier[] = [
  {
    id: "digital-twin-basic",
    app: "digital-twin",
    tier: "basic",
    name: "Digital Twin Basic",
    monthly: 79,
    annual: 790,
    annualEffectiveMonthly: 66,
    limits: {
      storageGb: 50,
      monthlyCredits: 1500,
    },
    features: [
      "360° panorama capture and hotspot navigation",
      "Browser-based immersive room-to-room traversal",
      "Secure share links for remote stakeholders",
      "Timeline comparisons across capture sessions",
    ],
    cta: "Start Digital Twin Basic",
  },
  {
    id: "digital-twin-pro",
    app: "digital-twin",
    tier: "pro",
    name: "Digital Twin Pro",
    monthly: 99,
    annual: 1990,
    annualEffectiveMonthly: 166,
    limits: {
      storageGb: 125,
      monthlyCredits: 4500,
    },
    features: [
      "Everything in Basic, plus photogrammetry mesh generation",
      "Drone photogrammetry import for exterior coverage",
      "Browser-based 3D inspection and measurement tools",
      "Priority GPU processing queues for heavy workloads",
    ],
    cta: "Start Digital Twin Pro",
  },
];

/** @deprecated Use SITE_WALK_TIERS / DIGITAL_TWIN_TIERS — kept for legacy signup links */
export const PRICING_TIERS: PricingTier[] = [...SITE_WALK_TIERS, ...DIGITAL_TWIN_TIERS];

export const ENTERPRISE_PLAN = {
  name: "Enterprise",
  features: [
    "Custom volume seat allocations for organizations 25+",
    "Negotiated storage pools and priority processing channels",
    "White-label client deliverables and custom viewer branding",
    "Dedicated onboarding and flexible infrastructure caps",
  ],
  cta: "Contact Sales",
};

export const PROCESSING_CREDIT_USES = [
  "Photogrammetry and mesh generation",
  "360° panorama stitching and hotspot processing",
  "Plan PDF rasterization and blueprint tile generation",
  "GPU-intensive rendering and export pipelines",
] as const;

export const BUNDLE_COMPARISON = {
  headline: "Running both apps",
  body:
    "Site Walk Pro and Digital Twin Pro can be subscribed independently or combined. Each app includes its own storage and processing pool — subscribe to both when your team needs field documentation and spatial inspection in the same portfolio.",
} as const;

export const FAIR_USAGE = {
  headline: "Fair usage & billing cycle resets",
  body:
    "Included storage and processing credits reset on your billing date each cycle — unused allotments do not roll over. Fair usage policies prevent automated abuse of GPU pipelines; typical field and studio workflows stay well within included limits. Enterprise plans negotiate custom reset windows and volume caps.",
} as const;

export const TOP_UP_POLICY = {
  headline: "At-cost top-ups — no markup",
  body:
    "Every plan includes monthly storage and processing credits that reset on your billing cycle. When you exceed included allotments, purchase additional storage or processing credits at direct infrastructure cost. Slate360 passes through cloud compute and storage charges with zero corporate markup.",
  creditNote:
    "Processing credits are consumed per GPU job — heavier workloads (large scans, high-resolution meshes) use more credits than lightweight tasks.",
} as const;

function formatCurrency(amount: number): string {
  return amount.toLocaleString("en-US");
}

export function formatStorageLimit(gb: number): string {
  return `${formatCurrency(gb)} GB cloud storage`;
}

export function formatCreditLimit(credits: number): string {
  return `${formatCurrency(credits)} processing credits / month`;
}

export function formatAnnualPrice(tier: PricingTier): string {
  return `$${formatCurrency(tier.annual)}/yr`;
}

export function formatEffectiveMonthly(tier: PricingTier): string {
  return `$${tier.annualEffectiveMonthly}/mo`;
}

export function formatMonthlyPrice(tier: PricingTier): string {
  return `$${tier.monthly}`;
}
