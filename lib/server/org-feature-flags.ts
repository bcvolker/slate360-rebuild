import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { OrgFeatureFlags } from "@/lib/entitlements";
import type { StandaloneAppId } from "@/lib/billing-apps";

const EMPTY_FLAGS: OrgFeatureFlags = {
  standalone_tour_builder: false,
  standalone_punchwalk: false,
  tour_builder_seat_limit: 0,
  tour_builder_seats_used: 0,
};

/** Maps a StandaloneAppId to its boolean column on org_feature_flags. */
const APP_FLAG_COLUMN: Record<StandaloneAppId, keyof OrgFeatureFlags> = {
  tour_builder: "standalone_tour_builder",
  punchwalk: "standalone_punchwalk",
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
      .select("standalone_tour_builder, standalone_punchwalk, tour_builder_seat_limit, tour_builder_seats_used")
      .eq("org_id", orgId)
      .maybeSingle();

    if (error || !data) return EMPTY_FLAGS;

    return {
      standalone_tour_builder: data.standalone_tour_builder === true,
      standalone_punchwalk: data.standalone_punchwalk === true,
      tour_builder_seat_limit: Number(data.tour_builder_seat_limit) || 0,
      tour_builder_seats_used: Number(data.tour_builder_seats_used) || 0,
    };
  } catch {
    return EMPTY_FLAGS;
  }
}

/**
 * Returns true only if the organization has active subscriptions
 * to ALL of the specified standalone apps.
 *
 * Usage:
 *   const canBundle = await hasBundleAccess(orgId, ["tour_builder", "punchwalk"]);
 */
export async function hasBundleAccess(
  orgId: string | null,
  requiredApps: StandaloneAppId[],
): Promise<boolean> {
  if (!orgId || requiredApps.length === 0) return false;

  const flags = await loadOrgFeatureFlags(orgId);

  return requiredApps.every((appId) => {
    const col = APP_FLAG_COLUMN[appId];
    return flags[col] === true;
  });
}
