export type Tier = "trial" | "creator" | "model" | "business" | "enterprise";

export interface Entitlements {
  tier: Tier;
  label: string;
  canAccessHub: boolean;
  canAccessDesignStudio: boolean;
  canAccessContent: boolean;
  canAccessTourBuilder: boolean;
  canAccessGeospatial: boolean;
  canAccessVirtual: boolean;
  canAccessAnalytics: boolean;
  canAccessReports: boolean;
  canAccessCeo: boolean;
  canManageSeats: boolean;
  canViewSlateDropWidget: boolean;
  maxCredits: number;
  maxStorageGB: number;
  maxSeats: number;
  monthlyPrice: number;
  annualPrice: number;
}

const TIER_MAP: Record<Tier, Omit<Entitlements, "tier">> = {
  trial: {
    label: "Trial",
    canAccessHub: true,
    canAccessDesignStudio: true,
    canAccessContent: true,
    canAccessTourBuilder: true,
    canAccessGeospatial: true,
    canAccessVirtual: true,
    canAccessAnalytics: true,
    canAccessReports: true,
    canAccessCeo: false,
    canManageSeats: false,
    canViewSlateDropWidget: true,
    maxCredits: 500,
    maxStorageGB: 5,
    maxSeats: 1,
    monthlyPrice: 0,
    annualPrice: 0,
  },
  creator: {
    label: "Creator",
    canAccessHub: false,
    canAccessDesignStudio: false,
    canAccessContent: true,
    canAccessTourBuilder: true,
    canAccessGeospatial: false,
    canAccessVirtual: false,
    canAccessAnalytics: false,
    canAccessReports: false,
    canAccessCeo: false,
    canManageSeats: false,
    canViewSlateDropWidget: true,
    maxCredits: 6000,
    maxStorageGB: 40,
    maxSeats: 1,
    monthlyPrice: 79,
    annualPrice: 790,
  },
  model: {
    label: "Model",
    canAccessHub: false,
    canAccessDesignStudio: true,
    canAccessContent: true,
    canAccessTourBuilder: true,
    canAccessGeospatial: true,
    canAccessVirtual: true,
    canAccessAnalytics: false,
    canAccessReports: false,
    canAccessCeo: false,
    canManageSeats: false,
    canViewSlateDropWidget: true,
    maxCredits: 15000,
    maxStorageGB: 150,
    maxSeats: 1,
    monthlyPrice: 199,
    annualPrice: 1990,
  },
  business: {
    label: "Business",
    canAccessHub: true,
    canAccessDesignStudio: true,
    canAccessContent: true,
    canAccessTourBuilder: true,
    canAccessGeospatial: true,
    canAccessVirtual: true,
    canAccessAnalytics: true,
    canAccessReports: true,
    canAccessCeo: false,
    canManageSeats: true,
    canViewSlateDropWidget: true,
    maxCredits: 30000,
    maxStorageGB: 750,
    maxSeats: 25,
    monthlyPrice: 499,
    annualPrice: 4990,
  },
  enterprise: {
    label: "Enterprise",
    canAccessHub: true,
    canAccessDesignStudio: true,
    canAccessContent: true,
    canAccessTourBuilder: true,
    canAccessGeospatial: true,
    canAccessVirtual: true,
    canAccessAnalytics: true,
    canAccessReports: true,
    canAccessCeo: true,
    canManageSeats: true,
    canViewSlateDropWidget: true,
    maxCredits: 100000,
    maxStorageGB: 5000,
    maxSeats: 999,
    monthlyPrice: 0,
    annualPrice: 0,
  },
};

export function getEntitlements(rawTier?: string | null): Entitlements {
  const tier: Tier =
    rawTier && rawTier in TIER_MAP ? (rawTier as Tier) : "trial";
  return { tier, ...TIER_MAP[tier] };
}
