/**
 * Bundle pricing tiers — mirrors project_bundle / studio_bundle / total
 * in lib/billing/cost-model.ts. Enterprise is custom-priced (sales-led).
 */
import type { BundlePricing } from "@/components/home/pricing-data";

export const BUNDLE_PRICING: BundlePricing[] = [
  {
    id: "project",
    name: "Project Bundle",
    tagline: "Site Walk + 360 Tours",
    appsIncluded: ["Site Walk", "360 Tours"],
    basic: {
      label: "Basic",
      monthlyUsd: 159,
      annualUsd: 1590,
      storageGB: 30,
      monthlyCredits: 1200,
      collaboratorsIncluded: 0,
      features: [
        "Site Walk Basic + 360 Tours Basic",
        "Pin Site Walk findings inside immersive scenes",
        "Project creation enabled",
        "30 GB storage · 1,200 credits / mo",
      ],
    },
    pro: {
      label: "Pro",
      monthlyUsd: 269,
      annualUsd: 2690,
      storageGB: 125,
      monthlyCredits: 4500,
      collaboratorsIncluded: 5,
      features: [
        "Site Walk Pro + 360 Tours Pro",
        "Up to 5 collaborators",
        "Full project management + leadership view",
        "125 GB storage · 4,500 credits / mo",
      ],
    },
    features: [],
  },
  {
    id: "studio",
    name: "Studio Bundle",
    tagline: "Design Studio + Content Studio",
    appsIncluded: ["Design Studio", "Content Studio"],
    basic: {
      label: "Basic",
      monthlyUsd: 199,
      annualUsd: 1990,
      storageGB: 65,
      monthlyCredits: 1500,
      collaboratorsIncluded: 0,
      features: [
        "Design Studio Basic + Content Studio Basic",
        "Cross-app asset hand-off",
        "65 GB storage · 1,500 credits / mo",
      ],
    },
    pro: {
      label: "Pro",
      monthlyUsd: 339,
      annualUsd: 3390,
      storageGB: 260,
      monthlyCredits: 6000,
      collaboratorsIncluded: 5,
      features: [
        "Design Studio Pro + Content Studio Pro",
        "Up to 5 collaborators",
        "Project-bound mode",
        "260 GB storage · 6,000 credits / mo",
      ],
    },
    features: [],
  },
  {
    id: "total",
    name: "Total Platform",
    tagline: "All four apps",
    appsIncluded: ["Site Walk", "360 Tours", "Design Studio", "Content Studio"],
    basic: {
      label: "Basic",
      monthlyUsd: 309,
      annualUsd: 3090,
      storageGB: 95,
      monthlyCredits: 2500,
      collaboratorsIncluded: 0,
      features: [
        "All four apps at Basic tier",
        "Project creation enabled",
        "95 GB storage · 2,500 credits / mo",
      ],
    },
    pro: {
      label: "Pro",
      monthlyUsd: 519,
      annualUsd: 5190,
      storageGB: 385,
      monthlyCredits: 10000,
      collaboratorsIncluded: 5,
      features: [
        "All four apps at Pro tier",
        "Up to 5 collaborators",
        "Full project management + leadership view",
        "385 GB storage · 10,000 credits / mo",
      ],
    },
    features: [],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    tagline: "Custom for organizations 25+ seats",
    appsIncluded: [],
    basic: null,
    pro: null,
    enterpriseCustom: true,
    features: [
      "Everything in Total Platform Pro",
      "SSO / SCIM provisioning",
      "White-label deliverables and viewer",
      "Dedicated processing capacity",
      "Custom data and credit caps",
      "Priority support + onboarding",
    ],
  },
];
