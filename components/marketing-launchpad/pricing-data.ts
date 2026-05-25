export type BillingCadence = "monthly" | "annual";

export type TierLimits = {
  storageGb: number;
  monthlyCredits: number;
};

export type PricingTier = {
  id: string;
  name: string;
  monthly: number;
  annual: number;
  annualEffectiveMonthly: number;
  limits: TierLimits;
  features: string[];
  cta: string;
};

export const PRICING_TIERS: PricingTier[] = [
  {
    id: "site-walk-pro",
    name: "Site Walk Workspace Pro",
    monthly: 66,
    annual: 1290,
    annualEffectiveMonthly: 108,
    limits: {
      storageGb: 25,
      monthlyCredits: 1000,
    },
    features: [
      "Single-handed mobile photo and note capture",
      "Automated geolocated and weather data stamping",
      "Background offline sync queuing inside the app",
      "Full blueprint drawing layout pin drop mapping",
      "Direct subcontractor PDF report attachment lines",
    ],
    cta: "Start Site Walk Pro",
  },
  {
    id: "digital-twin-pro",
    name: "Digital Twin Reality Studio",
    monthly: 99,
    annual: 1990,
    annualEffectiveMonthly: 166,
    limits: {
      storageGb: 125,
      monthlyCredits: 4500,
    },
    features: [
      "Immersive 3D property modeling from mobile video",
      "High-altitude aerial drone scan photogrammetry imports",
      "Fluid 360° panoramic navigation hotspot traversal",
      "Chronological before-and-after property timeline comparisons",
      "Digital coordinate measurement overlay tools on the web mesh",
    ],
    cta: "Start Digital Twin Pro",
  },
  {
    id: "bundle-pro",
    name: "Connected Project Bundle",
    monthly: 270,
    annual: 2690,
    annualEffectiveMonthly: 224,
    limits: {
      storageGb: 150,
      monthlyCredits: 5500,
    },
    features: [
      "Site Walk Pro + Digital Twin Pro in one subscription",
      "Unified project workspace across both native apps",
      "Combined storage and processing allotments from both tiers",
    ],
    cta: "Start Connected Bundle",
  },
];

export const ENTERPRISE_PLAN = {
  name: "Enterprise Custom",
  features: [
    "Custom volume seat allocations for organizations 25+",
    "Dedicated project onboarding and priority data processing channels",
    "White-label client deliverables and custom viewer branding",
    "Volume pricing and flexible infrastructure caps tailored to your portfolio",
  ],
  cta: "Contact Enterprise Sales for Bulk Seat Quotes",
};

export const PROCESSING_CREDIT_USES = [
  "Photogrammetry and mesh generation",
  "360° panorama stitching and hotspot processing",
  "Plan PDF rasterization and blueprint tile generation",
  "GPU-intensive rendering and export pipelines",
] as const;

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
