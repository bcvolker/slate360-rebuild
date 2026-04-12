import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { getEntitlements, type OrgFeatureFlags, type Entitlements, type Tier } from "@/lib/entitlements";
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
 * Resolve the full merged entitlements for an org by fetching both their
 * subscription tier and their standalone app flags, then running them
 * through the single source of truth: getEntitlements().
 */
export async function resolveOrgEntitlements(orgId: string | null): Promise<Entitlements> {
  if (!orgId) return getEntitlements(null);

  const admin = createAdminClient();

  const [tierResult, flags] = await Promise.all([
    admin.from("organizations").select("tier").eq("id", orgId).maybeSingle(),
    loadOrgFeatureFlags(orgId),
  ]);

  const tier = (tierResult.data?.tier as Tier) ?? null;
  return getEntitlements(tier, { featureFlags: flags });
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
