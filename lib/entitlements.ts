export type Tier = "trial" | "creator" | "model" | "business" | "enterprise";

/** Row shape of the public.org_feature_flags table. */
export interface OrgFeatureFlags {
  standalone_tour_builder: boolean;
  standalone_punchwalk: boolean;
  tour_builder_seat_limit: number;
  tour_builder_seats_used: number;
}

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
  // NOTE: canAccessCeo is intentionally absent — CEO Command Center is a platform-admin tab,
  // NOT a subscription tier feature. Access is controlled by isSlateCeo (resolveServerOrgContext)
  // and future slate360_staff grants from the CEO tab. Never gate CEO tab via entitlements.
  canManageSeats: boolean;
  canWhiteLabel: boolean; // enterprise only — white-label branding on deliverables
  canViewSlateDropWidget: boolean;
  maxCredits: number;
  maxStorageGB: number;
  maxSeats: number;
  monthlyPrice: number;
  annualPrice: number;

  // Standalone app entitlements (merged from org_feature_flags)
  canAccessStandaloneTourBuilder: boolean;
  canAccessStandalonePunchwalk: boolean;
  tourBuilderSeatLimit: number;
  tourBuilderSeatsUsed: number;
}

/** Standalone app fields are excluded — they come from org_feature_flags, not tiers. */
type TierEntitlements = Omit<Entitlements, "tier" | "canAccessStandaloneTourBuilder" | "canAccessStandalonePunchwalk" | "tourBuilderSeatLimit" | "tourBuilderSeatsUsed">;

const TIER_MAP: Record<Tier, TierEntitlements> = {
  trial: {
    label: "Trial",
    // Trial: full access to all tabs with tight limits, restrictions, and watermarks
    canAccessHub: true,
    canAccessDesignStudio: true,
    canAccessContent: true,
    canAccessTourBuilder: true,
    canAccessGeospatial: true,
    canAccessVirtual: true,
    canAccessAnalytics: true,
    canAccessReports: true,
    canManageSeats: false,
    canWhiteLabel: false,
    canViewSlateDropWidget: true,
    maxCredits: 500,
    maxStorageGB: 5,
    maxSeats: 1,
    monthlyPrice: 0,
    annualPrice: 0,
  },
  creator: {
    label: "Creator",
    canAccessHub: true,
    canAccessDesignStudio: false,
    canAccessContent: true,
    canAccessTourBuilder: true,
    canAccessGeospatial: false,
    canAccessVirtual: false,
    canAccessAnalytics: false,
    canAccessReports: false,
    canManageSeats: false,
    canWhiteLabel: false,
    canViewSlateDropWidget: true,
    maxCredits: 6000,
    maxStorageGB: 40,
    maxSeats: 1,
    monthlyPrice: 79,
    annualPrice: 790,
  },
  model: {
    label: "Model",
    canAccessHub: true,
    canAccessDesignStudio: true,
    canAccessContent: true,
    canAccessTourBuilder: true,
    canAccessGeospatial: true,
    canAccessVirtual: true,
    canAccessAnalytics: false,
    canAccessReports: false,
    canManageSeats: false,
    canWhiteLabel: false,
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
    canManageSeats: true,
    canWhiteLabel: false,
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
    canManageSeats: true,   // seat management for org admins
    canWhiteLabel: true,    // white-label branding on deliverables
    canViewSlateDropWidget: true,
    maxCredits: 100000,
    maxStorageGB: 5000,
    maxSeats: 999,
    monthlyPrice: 0,
    annualPrice: 0,
  },
};

export function getEntitlements(
  rawTier?: string | null,
  options?: { isSlateCeo?: boolean; featureFlags?: Partial<OrgFeatureFlags> },
): Entitlements {
  const isCeo = options?.isSlateCeo ?? false;
  const flags = options?.featureFlags;

  const tier: Tier = isCeo
    ? "enterprise"
    : rawTier && rawTier in TIER_MAP
      ? (rawTier as Tier)
      : "trial";

  const base = TIER_MAP[tier];

  return {
    tier,
    ...base,
    // Standalone app access: tier-based Tour Builder OR standalone flag
    canAccessStandaloneTourBuilder:
      base.canAccessTourBuilder || flags?.standalone_tour_builder === true,
    canAccessStandalonePunchwalk:
      flags?.standalone_punchwalk === true,
    tourBuilderSeatLimit: flags?.tour_builder_seat_limit ?? 0,
    tourBuilderSeatsUsed: flags?.tour_builder_seats_used ?? 0,
  };
}

const TIER_ORDER: Tier[] = ["trial", "creator", "model", "business", "enterprise"];

/** Returns true when `current` tier is at or above `required` tier. */
export function tierMeetsRequirement(current: Tier, required: Tier): boolean {
  return TIER_ORDER.indexOf(current) >= TIER_ORDER.indexOf(required);
}
