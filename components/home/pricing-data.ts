/**
 * Pricing types + add-on / disclaimer data.
 *
 * Source of truth for SKU numbers: lib/billing/cost-model.ts.
 * Tier and bundle arrays live in:
 *   - components/home/pricing/app-tiers.ts
 *   - components/home/pricing/bundle-tiers.ts
 *
 * Terminology rules:
 *  - Use "geolocated" — never "GPS".
 *  - Apps are treated equally; no app takes precedence in copy or layout.
 *  - Site Walk Basic includes branded deliverables.
 */

export type BillingPeriod = "monthly" | "annual";

export interface AppTier {
  label: "Basic" | "Pro";
  monthlyUsd: number;
  annualUsd: number; // total per year (≈ monthly × 10)
  storageGB: number;
  monthlyCredits: number;
  collaboratorsIncluded: number;
  features: string[];
}

export interface AppPricing {
  id: "site_walk" | "tours" | "design_studio" | "content_studio";
  name: string;
  tagline: string;
  basic: AppTier;
  pro: AppTier;
}

export interface BundlePricing {
  id: "project" | "studio" | "total" | "enterprise";
  name: string;
  tagline: string;
  appsIncluded: string[];
  basic: AppTier | null; // null for enterprise (custom-priced)
  pro: AppTier | null;
  enterpriseCustom?: boolean;
  features: string[]; // used only for enterprise summary
}

export interface CreditPackOption {
  label: string;
  credits: number;
  priceUsd: number;
  detail: string;
}

export interface StorageAddonOption {
  label: string;
  storageGB: number;
  monthlyUsd: number;
}

export interface CollaboratorAddonOption {
  label: string;
  count: number;
  monthlyUsd: number;
}

// ──────────────────────────────────────────────────────────────────────────────
// Add-ons
// ──────────────────────────────────────────────────────────────────────────────

export const CREDIT_PACK_OPTIONS: CreditPackOption[] = [
  { label: "Starter", credits: 1000, priceUsd: 10, detail: "Top up processing" },
  { label: "Pro", credits: 5000, priceUsd: 45, detail: "Most popular" },
  { label: "Power", credits: 25000, priceUsd: 200, detail: "Heavy use" },
];

export const STORAGE_ADDON_OPTIONS: StorageAddonOption[] = [
  { label: "+10 GB", storageGB: 10, monthlyUsd: 9 },
  { label: "+50 GB", storageGB: 50, monthlyUsd: 29 },
];

export const COLLABORATOR_ADDON_OPTIONS: CollaboratorAddonOption[] = [
  { label: "+5 collaborators", count: 5, monthlyUsd: 25 },
  { label: "+10 collaborators", count: 10, monthlyUsd: 45 },
  { label: "+25 collaborators", count: 25, monthlyUsd: 99 },
];

export const PRICING_DISCLAIMER =
  "Foundational Release: self-serve billing may not be available until enabled for your account. " +
  "Reference pricing above applies to Site Walk when paid plans launch. Usage-based charges, storage, and credits " +
  "will be visible in-product before any overage applies. Prices are USD and exclude applicable taxes.";

// Re-export tier arrays for convenience.
export { APP_PRICING } from "./pricing/app-tiers";
export { BUNDLE_PRICING } from "./pricing/bundle-tiers";
