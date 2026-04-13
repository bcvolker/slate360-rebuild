import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { getEntitlements, type OrgFeatureFlags, type Entitlements, type Tier } from "@/lib/entitlements";
import { resolveModularEntitlements, type OrgAppSubscriptions } from "@/lib/entitlements-modular";
import type { StandaloneAppId } from "@/lib/billing-apps";

const EMPTY_FLAGS: OrgFeatureFlags = {
  standalone_tour_builder: false,
  standalone_punchwalk: false,
  standalone_design_studio: false,
  standalone_content_studio: false,
  tour_builder_seat_limit: 0,
  tour_builder_seats_used: 0,
};

/** Maps a StandaloneAppId to its merged entitlement boolean in Entitlements. */
const APP_ENTITLEMENT_KEY: Record<StandaloneAppId, keyof Entitlements> = {
  tour_builder: "canAccessStandaloneTourBuilder",
  punchwalk: "canAccessStandalonePunchwalk",
  design_studio: "canAccessStandaloneDesignStudio",
  content_studio: "canAccessStandaloneContentStudio",
};

/**
 * Load org_feature_flags for a given organization.
 * Returns all-false defaults if no row exists or on error.
 * Uses admin client (service role) — safe for server components and API routes.
 */
export async function loadOrgFeatureFlags(orgId: string | null): Promise<OrgFeatureFlags> {
  if (!orgId) return EMPTY_FLAGS;

  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("org_feature_flags")
      .select("standalone_tour_builder, standalone_punchwalk, standalone_design_studio, standalone_content_studio, tour_builder_seat_limit, tour_builder_seats_used")
      .eq("org_id", orgId)
      .maybeSingle();

    if (error || !data) return EMPTY_FLAGS;

    return {
      standalone_tour_builder: data.standalone_tour_builder === true,
      standalone_punchwalk: data.standalone_punchwalk === true,
      standalone_design_studio: data.standalone_design_studio === true,
      standalone_content_studio: data.standalone_content_studio === true,
      tour_builder_seat_limit: Number(data.tour_builder_seat_limit) || 0,
      tour_builder_seats_used: Number(data.tour_builder_seats_used) || 0,
    };
  } catch {
    return EMPTY_FLAGS;
  }
}

/**
 * Resolve the full merged entitlements for an org by fetching:
 * 1. Their subscription tier (organizations.tier)
 * 2. Their standalone app flags (org_feature_flags)
 * 3. Their modular per-app subscriptions (org_app_subscriptions)
 *
 * Modular subscriptions widen access — if a modular purchase makes an app
 * active, the corresponding canAccessStandalone* flag is set to true.
 * This ensures modular purchases grant real page/API access.
 */
export async function resolveOrgEntitlements(orgId: string | null): Promise<Entitlements> {
  if (!orgId) return getEntitlements(null);

  const admin = createAdminClient();

  const [tierResult, flags, modularResult] = await Promise.all([
    admin.from("organizations").select("tier").eq("id", orgId).maybeSingle(),
    loadOrgFeatureFlags(orgId),
    admin
      .from("org_app_subscriptions")
      .select("site_walk, tours, slatedrop, design_studio, content_studio, bundle, storage_addon_gb, credit_addon_balance")
      .eq("org_id", orgId)
      .maybeSingle(),
  ]);

  const tier = (tierResult.data?.tier as Tier) ?? null;
  const base = getEntitlements(tier, { featureFlags: flags });

  // Merge modular subscriptions: if any modular app is active, widen access
  if (modularResult.data) {
    const subs: Partial<OrgAppSubscriptions> = {
      site_walk: modularResult.data.site_walk ?? "none",
      tours: modularResult.data.tours ?? "none",
      slatedrop: modularResult.data.slatedrop ?? "none",
      design_studio: modularResult.data.design_studio ?? "none",
      content_studio: modularResult.data.content_studio ?? "none",
      bundle: modularResult.data.bundle ?? null,
      storageAddonGB: modularResult.data.storage_addon_gb ?? 0,
      creditAddonBalance: modularResult.data.credit_addon_balance ?? 0,
    };
    const modular = resolveModularEntitlements(subs);

    // Widen standalone access flags based on modular subscriptions.
    // This is additive-only — never narrows existing tier/flag access.
    if (modular.apps.site_walk.active && !modular.isTrial) {
      base.canAccessStandalonePunchwalk = true;
    }
    if (modular.apps.tours.active && !modular.isTrial) {
      base.canAccessStandaloneTourBuilder = true;
    }
    if (modular.apps.design_studio.active && !modular.isTrial) {
      base.canAccessStandaloneDesignStudio = true;
    }
    if (modular.apps.content_studio.active && !modular.isTrial) {
      base.canAccessStandaloneContentStudio = true;
    }
  }

  return base;
}

/**
 * Returns true only if the organization has access to ALL of the specified
 * standalone apps (via tier-based access OR standalone subscription flags).
 *
 * Usage:
 *   const canBundle = await hasBundleAccess(orgId, ["tour_builder", "punchwalk"]);
 */
export async function hasBundleAccess(
  orgId: string | null,
  requiredApps: StandaloneAppId[],
): Promise<boolean> {
  if (!orgId || requiredApps.length === 0) return false;

  const entitlements = await resolveOrgEntitlements(orgId);

  return requiredApps.every((appId) => {
    const key = APP_ENTITLEMENT_KEY[appId];
    return entitlements[key] === true;
  });
}
