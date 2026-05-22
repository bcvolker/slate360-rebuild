/**
 * Public marketing pricing — Site Walk only during Foundational Release.
 * Full SKU catalog lives in lib/billing/cost-model.ts for in-app billing.
 */
import type { AppPricing } from "@/components/home/pricing-data";

export const APP_PRICING: AppPricing[] = [
  {
    id: "site_walk",
    name: "Site Walk",
    tagline: "Field capture → AI deliverables → multi-channel share",
    basic: {
      label: "Basic",
      monthlyUsd: 79,
      annualUsd: 790,
      storageGB: 5,
      monthlyCredits: 300,
      collaboratorsIncluded: 0,
      features: [
        "Photo, video, voice-note, and text capture",
        "Geolocated, time-stamped, weather-tagged metadata",
        "AI-formatted PDF deliverables",
        "Branded deliverables (logo, colors, signature)",
        "Hosted-viewer share link + inline-image email",
        "5 GB storage · 300 credits / mo",
      ],
    },
    pro: {
      label: "Pro",
      monthlyUsd: 129,
      annualUsd: 1290,
      storageGB: 25,
      monthlyCredits: 1000,
      collaboratorsIncluded: 3,
      features: [
        "Everything in Basic",
        "Up to 3 collaborators",
        "Project-bound mode + leadership view",
        "Full project management",
        "PDF-attachment email channel",
        "25 GB storage · 1,000 credits / mo",
      ],
    },
  },
];
