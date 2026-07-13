import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveModularEntitlements, type OrgAppSubscriptions } from "@/lib/entitlements-modular";
import { isBetaMode } from "@/lib/beta-mode";

/**
 * Server-side gate for walks-with-plans (Pro-only per the pricing model). Plan
 * walks — dropping/using pins on a drawing — were reachable at every tier because
 * nothing outside the client checked entitlements; this is the check.
 */
export async function canOrgWalkWithPlans(
  admin: SupabaseClient,
  orgId: string | null,
  opts?: { isSlateCeo?: boolean },
): Promise<boolean> {
  if (isBetaMode() || opts?.isSlateCeo) return true;
  if (!orgId) return false;

  const { data } = await admin
    .from("org_app_subscriptions")
    .select(
      "site_walk, tours, slatedrop, design_studio, content_studio, digital_twin, bundle, storage_addon_gb, credit_addon_balance",
    )
    .eq("org_id", orgId)
    .maybeSingle();
  if (!data) return false;

  const subs: Partial<OrgAppSubscriptions> = {
    site_walk: data.site_walk ?? "none",
    tours: data.tours ?? "none",
    slatedrop: data.slatedrop ?? "none",
    design_studio: data.design_studio ?? "none",
    content_studio: data.content_studio ?? "none",
    digital_twin: data.digital_twin ?? "none",
    bundle: data.bundle ?? null,
    storageAddonGB: data.storage_addon_gb ?? 0,
    creditAddonBalance: data.credit_addon_balance ?? 0,
  };
  return resolveModularEntitlements(subs).siteWalk.canWalkWithPlans;
}
