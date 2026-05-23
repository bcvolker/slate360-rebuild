export type Billing = "monthly" | "annual";
export type ProductLine = "site-walk" | "digital-twin" | "bundle";

export type PlanTier = {
  id: string;
  name: string;
  monthly: number;
  annualMonthly: number;
  annualTotal: number;
  features: string;
  button: string;
};

export const PRODUCT_TABS: { id: ProductLine; label: string }[] = [
  { id: "site-walk", label: "📷 Site Walk" },
  { id: "digital-twin", label: "🌐 Digital Twin" },
  { id: "bundle", label: "📦 Connected Bundle" },
];

export const PLAN_CATALOG: Record<ProductLine, PlanTier[]> = {
  "site-walk": [
    {
      id: "site-walk-basic",
      name: "Site Walk Basic",
      monthly: 79,
      annualMonthly: 66,
      annualTotal: 790,
      features:
        "Single-handed mobile photo and note capture, automated geolocated and weather data stamping, and AI-formatted PDF reports.",
      button: "Start Basic Walk Account",
    },
    {
      id: "site-walk-pro",
      name: "Site Walk Pro",
      monthly: 130,
      annualMonthly: 108,
      annualTotal: 1290,
      features:
        "Up to 3 collaborators, full blueprint drawing pin drop mapping, background offline sync queuing, and direct subcontractor PDF attachment lines.",
      button: "Start Pro Walk Account",
    },
  ],
  "digital-twin": [
    {
      id: "twin-basic",
      name: "Digital Twin Basic",
      monthly: 118,
      annualMonthly: 99,
      annualTotal: 1180,
      features:
        "3D property modeling streams from mobile video, aerial drone scan imports, and browser-based mesh exploring.",
      button: "Start Basic Twin Account",
    },
    {
      id: "twin-pro",
      name: "Digital Twin Pro",
      monthly: 199,
      annualMonthly: 166,
      annualTotal: 1990,
      features:
        "360° panoramic navigation hotspot traversal, before-and-after chronological timeline comparisons, and digital coordinate measurement overlay tools.",
      button: "Start Pro Twin Account",
    },
  ],
  bundle: [
    {
      id: "bundle-basic",
      name: "Connected Project Bundle Basic",
      monthly: 159,
      annualMonthly: 133,
      annualTotal: 1590,
      features: "Unlocks both native applications in a single subscription file at the Basic tier.",
      button: "Start Basic Bundle Account",
    },
    {
      id: "bundle-pro",
      name: "Connected Project Bundle Pro",
      monthly: 269,
      annualMonthly: 224,
      annualTotal: 2690,
      features: "Unlocks both native applications in a single subscription file at the Pro tier.",
      button: "Start Pro Bundle Account",
    },
  ],
};

export function formatPlanPrice(tier: PlanTier, billing: Billing) {
  if (billing === "monthly") return `$${tier.monthly}/mo`;
  return `$${tier.annualMonthly}/mo billed annually ($${tier.annualTotal.toLocaleString()}/yr)`;
}
