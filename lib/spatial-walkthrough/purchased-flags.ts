import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { resolveModularEntitlements, type OrgAppSubscriptions } from "@/lib/entitlements-modular";
import { isBetaMode } from "@/lib/beta-mode";
import type { ClientSurfaceFlags } from "./client-surface";
import { mergeClientSurfaceFlags, type PurchasedClientFlags } from "./client-surface";

const EMPTY: PurchasedClientFlags = {
  spatialWalkthrough: false,
  siteWalk: false,
  twin360: false,
  slatedrop: false,
  designStudio: false,
  contentStudio: false,
};

/**
 * Purchase truth for client-facing surfaces. Ignores beta-mode entitlement widening
 * so a Spatial Walkthrough-only org never inherits Site Walk / Twin / Thermal.
 */
export async function loadPurchasedClientFlags(orgId: string | null): Promise<PurchasedClientFlags> {
  if (!orgId) return EMPTY;

  try {
    const admin = createAdminClient();
    const [flagsRes, subsRes] = await Promise.all([
      admin
        .from("org_feature_flags")
        .select(
          "standalone_spatial_walkthrough, standalone_punchwalk, standalone_digital_twin, standalone_design_studio, standalone_content_studio",
        )
        .eq("org_id", orgId)
        .maybeSingle(),
      admin
        .from("org_app_subscriptions")
        .select("site_walk, tours, slatedrop, design_studio, content_studio, digital_twin, bundle, storage_addon_gb, credit_addon_balance")
        .eq("org_id", orgId)
        .maybeSingle(),
    ]);

    const row = flagsRes.data;
    let purchased: PurchasedClientFlags = {
      spatialWalkthrough: row?.standalone_spatial_walkthrough === true,
      siteWalk: row?.standalone_punchwalk === true,
      twin360: row?.standalone_digital_twin === true,
      slatedrop: false,
      designStudio: row?.standalone_design_studio === true,
      contentStudio: row?.standalone_content_studio === true,
    };

    if (subsRes.data) {
      const subs: Partial<OrgAppSubscriptions> = {
        site_walk: subsRes.data.site_walk ?? "none",
        tours: subsRes.data.tours ?? "none",
        slatedrop: subsRes.data.slatedrop ?? "none",
        design_studio: subsRes.data.design_studio ?? "none",
        content_studio: subsRes.data.content_studio ?? "none",
        digital_twin: subsRes.data.digital_twin ?? "none",
        bundle: subsRes.data.bundle ?? null,
        storageAddonGB: subsRes.data.storage_addon_gb ?? 0,
        creditAddonBalance: subsRes.data.credit_addon_balance ?? 0,
      };
      const modular = resolveModularEntitlements(subs);
      if (modular.apps.site_walk.active && !modular.isTrial) purchased = { ...purchased, siteWalk: true };
      if (modular.apps.digital_twin.active && !modular.isTrial) purchased = { ...purchased, twin360: true };
      if (modular.apps.slatedrop.active && !modular.isTrial) purchased = { ...purchased, slatedrop: true };
      if (modular.apps.design_studio.active && !modular.isTrial) purchased = { ...purchased, designStudio: true };
      if (modular.apps.content_studio.active && !modular.isTrial) purchased = { ...purchased, contentStudio: true };
    }

    return purchased;
  } catch {
    return EMPTY;
  }
}

export async function loadClientSurfaceFlags(orgId: string | null, isCeo: boolean): Promise<ClientSurfaceFlags> {
  const purchased = await loadPurchasedClientFlags(orgId);
  return mergeClientSurfaceFlags({ isCeo, purchased, betaMode: isBetaMode() });
}
