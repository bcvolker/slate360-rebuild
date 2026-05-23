export type BillingCadence = "monthly" | "annual";
export type ProductLine = "site-walk" | "digital-twin" | "bundle";

export type PricingTier = {
  id: string;
  name: string;
  monthly: number;
  annual: number;
  features: string[];
  cta: string;
};

export type ProductPricing = {
  label: string;
  emoji: string;
  basic: PricingTier;
  pro: PricingTier;
};

export const PRODUCT_PRICING: Record<ProductLine, ProductPricing> = {
  "site-walk": {
    label: "Site Walk",
    emoji: "📷",
    basic: {
      id: "site-walk-basic",
      name: "Site Walk Basic",
      monthly: 66,
      annual: 790,
      features: [
        "Single-handed mobile photo capture",
        "Geolocated and weather data stamping",
        "Background offline sync queuing",
        "Plan drawing pinning",
      ],
      cta: "Start Basic Walk Account",
    },
    pro: {
      id: "site-walk-pro",
      name: "Site Walk Pro",
      monthly: 108,
      annual: 1290,
      features: [
        "Everything in Basic",
        "Direct subcontractor PDF distribution lines",
        "Advanced field report compilation",
        "Priority sync and storage allotment",
      ],
      cta: "Start Pro Walk Account",
    },
  },
  "digital-twin": {
    label: "Digital Twin",
    emoji: "🌐",
    basic: {
      id: "twin-basic",
      name: "Digital Twin Basic",
      monthly: 99,
      annual: 1180,
      features: [
        "3D property modeling from mobile video",
        "360° panoramic navigation hotspots",
        "Browser-based access with zero install",
        "Before-and-after timeline comparisons",
      ],
      cta: "Start Basic Twin Account",
    },
    pro: {
      id: "twin-pro",
      name: "Digital Twin Pro",
      monthly: 166,
      annual: 1990,
      features: [
        "Everything in Basic",
        "Aerial drone scan imports",
        "Digital coordinate measurement overlays",
        "Extended processing capacity",
      ],
      cta: "Start Pro Twin Account",
    },
  },
  bundle: {
    label: "Connected Bundle",
    emoji: "📦",
    basic: {
      id: "bundle-basic",
      name: "Connected Bundle Basic",
      monthly: 133,
      annual: 1590,
      features: [
        "Site Walk Basic + Digital Twin Basic",
        "Unified project workspace",
        "Cross-module capture linking",
        "Shared team member access",
      ],
      cta: "Start Basic Bundle",
    },
    pro: {
      id: "bundle-pro",
      name: "Connected Bundle Pro",
      monthly: 224,
      annual: 2690,
      features: [
        "Site Walk Pro + Digital Twin Pro",
        "Full reality intelligence pipeline",
        "Priority processing queue",
        "Advanced export and distribution",
      ],
      cta: "Start Pro Bundle",
    },
  },
};

export const ENTERPRISE_PLAN = {
  name: "Enterprise",
  features: [
    "Unlimited seats and active projects",
    "SSO / SAML and role-based access control",
    "Dedicated customer success manager",
    "Custom SLA and onboarding",
    "API access and data residency options",
    "Volume pricing for processing workflows",
  ],
  cta: "Contact Enterprise Sales",
};

export const PRODUCT_LINE_OPTIONS: { id: ProductLine; label: string }[] = [
  { id: "site-walk", label: "📷 Site Walk" },
  { id: "digital-twin", label: "🌐 Digital Twin" },
  { id: "bundle", label: "📦 Connected Bundle" },
];
