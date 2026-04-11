import type { AppId, BundleId } from "@/lib/entitlements-modular";

export type PlanTab = "site_walk" | "tours" | "bundles" | "addons";

export interface AppPlanDisplay {
  appId: AppId;
  tier: "basic" | "pro";
  name: string;
  price: string;
  desc: string;
  features: string[];
  highlight?: boolean;
}

export interface BundlePlanDisplay {
  bundleId: BundleId;
  name: string;
  price: string;
  savings: string;
  desc: string;
  features: string[];
  highlight?: boolean;
}

export const PLAN_TABS: { id: PlanTab; label: string }[] = [
  { id: "site_walk", label: "Site Walk" },
  { id: "tours", label: "360 Tours" },
  { id: "bundles", label: "Bundles" },
  { id: "addons", label: "Add-ons" },
];

export const SITE_WALK_PLANS: AppPlanDisplay[] = [
  {
    appId: "site_walk",
    tier: "basic",
    name: "Site Walk Basic",
    price: "$79",
    desc: "Field documentation essentials for solo professionals.",
    features: [
      "5 GB cloud storage",
      "200 processing credits/mo",
      "2 seats",
      "Clean exports (no watermark)",
      "SlateDrop file management",
      "Share links for clients",
    ],
  },
  {
    appId: "site_walk",
    tier: "pro",
    name: "Site Walk Pro",
    price: "$129",
    desc: "Full photo and field documentation for teams.",
    features: [
      "25 GB cloud storage",
      "750 processing credits/mo",
      "5 seats + team management",
      "Everything in Basic",
      "Advanced reporting",
      "Priority processing",
    ],
    highlight: true,
  },
];

export const TOURS_PLANS: AppPlanDisplay[] = [
  {
    appId: "tours",
    tier: "basic",
    name: "360 Tours Basic",
    price: "$49",
    desc: "Create and host immersive virtual tours.",
    features: [
      "3 GB cloud storage",
      "100 processing credits/mo",
      "1 seat",
      "Unlimited published tours",
      "SlateDrop file management",
      "Embed code for websites",
    ],
  },
  {
    appId: "tours",
    tier: "pro",
    name: "360 Tours Pro",
    price: "$99",
    desc: "360° tour powerhouse for teams and agencies.",
    features: [
      "15 GB cloud storage",
      "400 processing credits/mo",
      "3 seats",
      "Everything in Basic",
      "Custom branding on tours",
      "Analytics dashboard",
    ],
    highlight: true,
  },
];

export const BUNDLE_PLANS_DISPLAY: BundlePlanDisplay[] = [
  {
    bundleId: "field_pro",
    name: "Field Pro Bundle",
    price: "$149",
    savings: "Save $79/mo",
    desc: "Site Walk Pro + 360 Tours Pro — the field documentation powerhouse.",
    features: [
      "30 GB cloud storage",
      "1,000 processing credits/mo",
      "5 seats + team management",
      "360° content in Site Walk deliverables",
      "All Site Walk Pro features",
      "All 360 Tours Pro features",
    ],
    highlight: true,
  },
  {
    bundleId: "all_access",
    name: "All Access Bundle",
    price: "$249",
    savings: "Save $177/mo",
    desc: "Every current app at Pro tier — full platform access.",
    features: [
      "75 GB cloud storage",
      "2,500 processing credits/mo",
      "10 seats + team management",
      "Full cross-app synergy",
      "All current and future Pro features",
      "Priority support",
    ],
  },
];

export const ADDONS_DISPLAY = {
  slatedropPro: {
    name: "SlateDrop Pro",
    price: "$39",
    desc: "50 GB dedicated file storage with advanced sharing and audit log.",
    features: ["50 GB storage", "Unlimited share links", "Full audit log", "Folder management"],
  },
  storage: [
    { label: "+10 GB Storage", price: "$9/mo" },
    { label: "+50 GB Storage", price: "$29/mo" },
  ],
  credits: [
    { label: "500 Credits", price: "$19" },
    { label: "2,000 Credits", price: "$49" },
    { label: "5,000 Credits", price: "$99" },
  ],
};

export const PLAN_FAQS = [
  { q: "Can I switch plans anytime?", a: "Yes — upgrade or downgrade at any time. Prorated billing is handled automatically by Stripe." },
  { q: "What are processing credits?", a: "Credits are consumed for GPU-intensive tasks like 360° stitching, photogrammetry, and rendering. Credits refresh monthly." },
  { q: "Is the trial really free?", a: "Yes — no credit card required. Trial gives access to all apps with starter limits so you can explore before committing." },
  { q: "Do apps work together?", a: "Yes — when you have both Site Walk and 360 Tours, your 360° content integrates directly into Site Walk deliverables. Bundles unlock full cross-app synergy." },
  { q: "What happens if I cancel an app?", a: "Your data is never deleted. You lose access to that app's features until you resubscribe. Other apps remain active." },
  { q: "Do you offer team or enterprise pricing?", a: "Yes. Contact hello@slate360.ai for enterprise, nonprofit, and government pricing." },
];
