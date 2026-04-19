export type Tier = "trial" | "standard" | "business" | "enterprise";

/** Legacy tier names still stored in some org rows. Mapped to current tiers at runtime. */
const LEGACY_TIER_MAP: Record<string, Tier> = {
  creator: "standard",
  model: "standard",
};

/** Row shape of the public.org_feature_flags table. */
export interface OrgFeatureFlags {
  standalone_tour_builder: boolean;
  standalone_punchwalk: boolean;
  standalone_design_studio: boolean;
  standalone_content_studio: boolean;
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
  // NOTE: canAccessOperationsConsole is intentionally absent — Operations Console is a
  // platform-admin tab, NOT a subscription tier feature. Access is controlled by
  // isSlateCeo (resolveServerOrgContext) and future slate360_staff grants. Never gate
  // Operations Console via entitlements.
  canManageSeats: boolean;
  canWhiteLabel: boolean; // enterprise only — white-label branding on deliverables
  canViewSlateDropWidget: boolean;
  maxCredits: number;
  maxStorageGB: number;
  maxSeats: number;
  /** Maximum number of project collaborators (non-subscriber outside contributors)
   *  this subscriber may have active across all projects they own. Counted as
   *  active project_members.role='collaborator' + pending invites. */
  maxCollaborators: number;
  monthlyPrice: number;
  annualPrice: number;

  // Standalone app entitlements (merged from org_feature_flags)
  canAccessStandaloneTourBuilder: boolean;
  canAccessStandalonePunchwalk: boolean;
  canAccessStandaloneDesignStudio: boolean;
  canAccessStandaloneContentStudio: boolean;
  tourBuilderSeatLimit: number;
  tourBuilderSeatsUsed: number;
}

/** Standalone app fields are excluded — they come from org_feature_flags, not tiers. */
type TierEntitlements = Omit<Entitlements, "tier" | "canAccessStandaloneTourBuilder" | "canAccessStandalonePunchwalk" | "canAccessStandaloneDesignStudio" | "canAccessStandaloneContentStudio" | "tourBuilderSeatLimit" | "tourBuilderSeatsUsed">;

const TIER_MAP: Record<Tier, TierEntitlements> = {
  trial: {
    label: "Trial",
    canAccessHub: true,
    canAccessDesignStudio: false,
    canAccessContent: false,
    canAccessTourBuilder: false,
    canAccessGeospatial: false,
    canAccessVirtual: false,
    canAccessAnalytics: false,
    canAccessReports: false,
    canManageSeats: false,
    canWhiteLabel: false,
    canViewSlateDropWidget: true,
    maxCredits: 250,
    maxStorageGB: 2,
    maxSeats: 1,
    maxCollaborators: 0,
    monthlyPrice: 0,
    annualPrice: 0,
  },
  standard: {
    label: "Standard",
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
    maxCredits: 5000,
    maxStorageGB: 25,
    maxSeats: 3,
    maxCollaborators: 3,
    monthlyPrice: 149,
    annualPrice: 1490,
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
    maxCredits: 25000,
    maxStorageGB: 100,
    maxSeats: 15,
    maxCollaborators: 10,
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
    canManageSeats: true,
    canWhiteLabel: true,
    canViewSlateDropWidget: true,
    maxCredits: 100000,
    maxStorageGB: 500,
    maxSeats: 999,
    maxCollaborators: Number.POSITIVE_INFINITY,
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

  // Map legacy tier names (creator, model) to current tiers
  const resolved = rawTier ? (LEGACY_TIER_MAP[rawTier] ?? rawTier) : null;
  const tier: Tier = isCeo
    ? "enterprise"
    : resolved && resolved in TIER_MAP
      ? (resolved as Tier)
      : "trial";

  const base = TIER_MAP[tier];

  return {
    tier,
    ...base,
    // Standalone app access: purchase-only (org_feature_flags or modular subscription).
    // Tier-based fields (canAccessTourBuilder, etc.) control dashboard visibility;
    // standalone fields control actual app activation after purchase.
    canAccessStandaloneTourBuilder:
      flags?.standalone_tour_builder === true,
    canAccessStandalonePunchwalk:
      flags?.standalone_punchwalk === true,
    canAccessStandaloneDesignStudio:
      flags?.standalone_design_studio === true,
    canAccessStandaloneContentStudio:
      flags?.standalone_content_studio === true,
    tourBuilderSeatLimit: flags?.tour_builder_seat_limit ?? 0,
    tourBuilderSeatsUsed: flags?.tour_builder_seats_used ?? 0,
  };
}

const TIER_ORDER: Tier[] = ["trial", "standard", "business", "enterprise"];

/** Returns true when `current` tier is at or above `required` tier. */
export function tierMeetsRequirement(current: Tier, required: Tier): boolean {
  return TIER_ORDER.indexOf(current) >= TIER_ORDER.indexOf(required);
}

// ---------------------------------------------------------------------------
// Per-App Modular Subscription Model — re-exported from dedicated module
// ---------------------------------------------------------------------------
export {
  type AppId,
  type AppTier,
  type BundleId,
  type AppLimits,
  type ModularEntitlements,
  type OrgAppSubscriptions,
  type StorageAddonId,
  BUNDLE_DEFINITIONS,
  STORAGE_ADDONS,
  ALL_APP_IDS,
  resolveModularEntitlements,
} from "./entitlements-modular";

