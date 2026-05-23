export type BillingCadence = "monthly" | "annual";

export type PricingTier = {
  id: string;
  name: string;
  monthly: number;
  annual: number;
  annualEffectiveMonthly: number;
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
    features: [
      "Single-handed mobile photo and note capture",
      "Automated geolocated and weather data stamping",
      "Background offline sync queuing inside the app",
      "Full blueprint drawing layout pin drop mapping",
      "Direct subcontractor PDF report attachment lines",
      "25 GB Secure Cloud Storage Allotment",
      "1,000 Included Monthly Processing Credits",
    ],
    cta: "Start Site Walk Pro",
  },
  {
    id: "digital-twin-pro",
    name: "Digital Twin Reality Studio",
    monthly: 99,
    annual: 1990,
    annualEffectiveMonthly: 166,
    features: [
      "Immersive 3D property modeling from mobile video",
      "High-altitude aerial drone scan photogrammetry imports",
      "Fluid 360° panoramic navigation hotspot traversal",
      "Chronological before-and-after property timeline comparisons",
      "Digital coordinate measurement overlay tools on the web mesh",
      "125 GB Secure Cloud Storage Allotment",
      "4,500 Included Monthly Processing Credits",
    ],
    cta: "Start Digital Twin Pro",
  },
  {
    id: "bundle-pro",
    name: "Connected Project Bundle",
    monthly: 270,
    annual: 2690,
    annualEffectiveMonthly: 224,
    features: [
      "Site Walk Pro + Digital Twin Pro",
      "Unified project workspace",
      "Both native apps in one subscription",
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

function formatCurrency(amount: number): string {
  return amount.toLocaleString("en-US");
}

export function formatAnnualPrice(tier: PricingTier): string {
  return `$${formatCurrency(tier.annual)}/yr`;
}

export function formatEffectiveMonthly(tier: PricingTier): string {
  return `$${tier.annualEffectiveMonthly}/mo`;
}
