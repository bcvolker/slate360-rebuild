// ---------------------------------------------------------------------------
// Per-App Modular Subscription Model
// ---------------------------------------------------------------------------

/** App IDs in the ecosystem. */
export type AppId = "site_walk" | "tours" | "slatedrop" | "design_studio" | "content_studio";

/** Per-app subscription tiers. */
export type AppTier = "none" | "basic" | "pro";

/** Bundle identifiers. */
export type BundleId = "field_pro" | "all_access";

/** Per-app entitlements resolved from subscription. */
export interface AppLimits {
  active: boolean;
  tier: AppTier;
  storageGB: number;
  creditsPerMonth: number;
  seats: number;
  monthlyPrice: number;
}

/** Full modular entitlements for an organization. */
export interface ModularEntitlements {
  /** Is this a trial user with no paid subscriptions? */
  isTrial: boolean;
  /** Active bundle, if any. */
  activeBundle: BundleId | null;
  /** Per-app resolved limits. */
  apps: Record<AppId, AppLimits>;
  /** Aggregated totals across all subscriptions. */
  totalStorageGB: number;
  totalCreditsPerMonth: number;
  totalSeats: number;
  totalMonthlyPrice: number;
  /** Synergy flags — unlocked when user has both apps. */
  synergy: {
    /** Has Site Walk + 360 Tours → 360 content integrates into SW deliverables */
    tours360InSiteWalk: boolean;
    /** Has Site Walk + Design Studio → model views in SW reports */
    designInSiteWalk: boolean;
    /** Has Site Walk + Content Studio → polished media in SW deliverables */
    contentInSiteWalk: boolean;
  };
  /** SlateDrop access: all paid users get SlateDrop; trial gets limited */
  slateDropAccess: "full" | "limited" | "none";
  /** Can manage team seats (pro tiers or bundles) */
  canManageSeats: boolean;
  /** Enterprise white-label */
  canWhiteLabel: boolean;
}

/** Per-app tier definitions: [basic, pro] limits. Trial is separate. */
const APP_TIER_LIMITS: Record<AppId, Record<Exclude<AppTier, "none">, Omit<AppLimits, "active" | "tier">>> = {
  site_walk: {
    basic: { storageGB: 5, creditsPerMonth: 200, seats: 1, monthlyPrice: 79 },
    pro:   { storageGB: 25, creditsPerMonth: 750, seats: 1, monthlyPrice: 129 },
  },
  tours: {
    basic: { storageGB: 3, creditsPerMonth: 100, seats: 1, monthlyPrice: 49 },
    pro:   { storageGB: 15, creditsPerMonth: 400, seats: 1, monthlyPrice: 99 },
  },
  slatedrop: {
    basic: { storageGB: 10, creditsPerMonth: 0, seats: 1, monthlyPrice: 0 },
    pro:   { storageGB: 50, creditsPerMonth: 0, seats: 1, monthlyPrice: 39 },
  },
  design_studio: {
    basic: { storageGB: 5, creditsPerMonth: 100, seats: 1, monthlyPrice: 49 },
    pro:   { storageGB: 25, creditsPerMonth: 400, seats: 1, monthlyPrice: 99 },
  },
  content_studio: {
    basic: { storageGB: 5, creditsPerMonth: 150, seats: 1, monthlyPrice: 49 },
    pro:   { storageGB: 25, creditsPerMonth: 500, seats: 1, monthlyPrice: 99 },
  },
};

/** Trial limits (tiny, keeps us on free infra tiers). */
const TRIAL_APP_LIMITS: Omit<AppLimits, "active" | "tier"> = {
  storageGB: 0.5, // 500MB total
  creditsPerMonth: 25,
  seats: 1,
  monthlyPrice: 0,
};

/** Bundle definitions: which apps are included and at what effective tier + price. */
export const BUNDLE_DEFINITIONS: Record<BundleId, {
  label: string;
  description: string;
  apps: Partial<Record<AppId, AppTier>>;
  storageGB: number;
  creditsPerMonth: number;
  seats: number;
  monthlyPrice: number;
  savings: string;
}> = {
  field_pro: {
    label: "Field Pro Bundle",
    description: "Site Walk Pro + 360 Tours Pro — field documentation powerhouse",
    apps: { site_walk: "pro", tours: "pro" },
    storageGB: 30,
    creditsPerMonth: 1000,
    seats: 1,
    monthlyPrice: 149,
    savings: "Save $79/mo vs separate",
  },
  all_access: {
    label: "All Access Bundle",
    description: "Every current app at Pro tier — full platform access",
    apps: { site_walk: "pro", tours: "pro", design_studio: "pro", content_studio: "pro" },
    storageGB: 75,
    creditsPerMonth: 2500,
    seats: 1,
    monthlyPrice: 249,
    savings: "Save $177/mo vs separate",
  },
};

/** Storage Add-on packs available for purchase. */
export const STORAGE_ADDONS = [
  { id: "storage_10gb" as const, label: "+10 GB", storageGB: 10, monthlyPrice: 9 },
  { id: "storage_50gb" as const, label: "+50 GB", storageGB: 50, monthlyPrice: 29 },
] as const;

export type StorageAddonId = (typeof STORAGE_ADDONS)[number]["id"];

/** What the org has subscribed to — stored in DB (org_app_subscriptions). */
export interface OrgAppSubscriptions {
  site_walk: AppTier;
  tours: AppTier;
  slatedrop: AppTier;
  design_studio: AppTier;
  content_studio: AppTier;
  bundle: BundleId | null;
  storageAddonGB: number;
  creditAddonBalance: number;
}

const EMPTY_SUBSCRIPTIONS: OrgAppSubscriptions = {
  site_walk: "none",
  tours: "none",
  slatedrop: "none",
  design_studio: "none",
  content_studio: "none",
  bundle: null,
  storageAddonGB: 0,
  creditAddonBalance: 0,
};

/** All app IDs for iteration. */
export const ALL_APP_IDS: AppId[] = ["site_walk", "tours", "slatedrop", "design_studio", "content_studio"];

/**
 * Resolve modular entitlements from per-app subscriptions.
 * Bundle subscriptions override individual app tiers for included apps.
 */
export function resolveModularEntitlements(
  subs?: Partial<OrgAppSubscriptions> | null,
): ModularEntitlements {
  const s: OrgAppSubscriptions = { ...EMPTY_SUBSCRIPTIONS, ...subs };
  const bundle = s.bundle ? BUNDLE_DEFINITIONS[s.bundle] : null;

  // Resolve effective tier per app (bundle overrides individual)
  const effectiveTiers: Record<AppId, AppTier> = {
    site_walk: maxTier(s.site_walk, bundle?.apps.site_walk),
    tours: maxTier(s.tours, bundle?.apps.tours),
    slatedrop: maxTier(s.slatedrop, bundle?.apps.slatedrop),
    design_studio: maxTier(s.design_studio, bundle?.apps.design_studio),
    content_studio: maxTier(s.content_studio, bundle?.apps.content_studio),
  };

  const isTrial = Object.values(effectiveTiers).every((t) => t === "none") && !bundle;

  // Build per-app limits
  const apps = {} as Record<AppId, AppLimits>;
  for (const appId of ALL_APP_IDS) {
    const tier = effectiveTiers[appId];
    if (isTrial) {
      apps[appId] = { active: true, tier: "none", ...TRIAL_APP_LIMITS };
    } else if (tier === "none") {
      apps[appId] = { active: false, tier: "none", storageGB: 0, creditsPerMonth: 0, seats: 0, monthlyPrice: 0 };
    } else {
      const limits = APP_TIER_LIMITS[appId][tier];
      apps[appId] = { active: true, tier, ...limits };
    }
  }

  // If user has bundle, use bundle totals; otherwise sum individual apps
  let totalStorageGB: number;
  let totalCreditsPerMonth: number;
  let totalSeats: number;
  let totalMonthlyPrice: number;

  if (bundle) {
    totalStorageGB = bundle.storageGB;
    totalCreditsPerMonth = bundle.creditsPerMonth;
    totalSeats = bundle.seats;
    totalMonthlyPrice = bundle.monthlyPrice;

    // Add any individual apps NOT covered by the bundle
    for (const appId of ALL_APP_IDS) {
      if (!bundle.apps[appId] && effectiveTiers[appId] !== "none") {
        const a = apps[appId];
        totalStorageGB += a.storageGB;
        totalCreditsPerMonth += a.creditsPerMonth;
        totalSeats = Math.max(totalSeats, a.seats);
        totalMonthlyPrice += a.monthlyPrice;
      }
    }
  } else if (isTrial) {
    totalStorageGB = TRIAL_APP_LIMITS.storageGB;
    totalCreditsPerMonth = TRIAL_APP_LIMITS.creditsPerMonth;
    totalSeats = 1;
    totalMonthlyPrice = 0;
  } else {
    totalStorageGB = 0;
    totalCreditsPerMonth = 0;
    totalSeats = 0;
    totalMonthlyPrice = 0;
    for (const a of Object.values(apps)) {
      if (a.active && a.tier !== "none") {
        totalStorageGB += a.storageGB;
        totalCreditsPerMonth += a.creditsPerMonth;
        totalSeats = Math.max(totalSeats, a.seats);
        totalMonthlyPrice += a.monthlyPrice;
      }
    }
  }

  // Add storage add-ons
  totalStorageGB += s.storageAddonGB;

  const hasSiteWalk = effectiveTiers.site_walk !== "none" || isTrial;
  const hasTours = effectiveTiers.tours !== "none" || isTrial;
  const hasDesign = effectiveTiers.design_studio !== "none";
  const hasContent = effectiveTiers.content_studio !== "none";

  // Any paid subscription → full SlateDrop access
  const anyPaid = !isTrial && Object.values(effectiveTiers).some((t) => t !== "none");

  return {
    isTrial,
    activeBundle: s.bundle,
    apps,
    totalStorageGB,
    totalCreditsPerMonth,
    totalSeats,
    totalMonthlyPrice,
    synergy: {
      tours360InSiteWalk: hasSiteWalk && hasTours && !isTrial,
      designInSiteWalk: hasSiteWalk && hasDesign,
      contentInSiteWalk: hasSiteWalk && hasContent,
    },
    slateDropAccess: anyPaid ? "full" : isTrial ? "limited" : "none",
    canManageSeats: totalSeats >= 3,
    canWhiteLabel: false, // enterprise only — negotiated
  };
}

/** Pick the higher of two app tiers. */
function maxTier(a: AppTier, b?: AppTier): AppTier {
  const order: AppTier[] = ["none", "basic", "pro"];
  return order.indexOf(b ?? "none") > order.indexOf(a) ? (b ?? "none") : a;
}
