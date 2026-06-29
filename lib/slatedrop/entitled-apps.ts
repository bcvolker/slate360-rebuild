import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  resolveModularEntitlements,
  ALL_APP_IDS,
  type AppId,
  type OrgAppSubscriptions,
} from "@/lib/entitlements-modular";
import { isBetaMode } from "@/lib/beta-mode";

/**
 * The set of apps whose SlateDrop branch should be provisioned for an org's
 * projects. Shared folder roots (Project_Info / PM_Documents / Team_Shared) carry
 * no app tag and always provision; the per-app branches (Site Walk, Twin 360, …)
 * provision only for the apps in this set.
 *
 * Driven by the modular subscription model (`org_app_subscriptions` →
 * `resolveModularEntitlements`), with two explicit overrides the modular resolver
 * does NOT encode (per the Jun 29 entitlements audit):
 *  - **Beta (pre-launch):** everyone can use every app, so every app provisions
 *    (keeps provisioning unchanged from today until launch — low risk).
 *  - **CEO:** the owner gets every app.
 *
 * Trial orgs resolve to `active: true, tier: "none"`; the `tier !== "none"` test
 * excludes them so a trial doesn't over-provision. Canceling an app flips its
 * column to `'none'` (the row is never deleted), so a downgrade simply stops
 * future provisioning — existing folders are left untouched by design.
 */
export async function resolveEntitledAppsForProvisioning(
  admin: SupabaseClient,
  orgId: string | null,
  opts?: { isSlateCeo?: boolean },
): Promise<Set<AppId>> {
  if (isBetaMode() || opts?.isSlateCeo) return new Set(ALL_APP_IDS);
  if (!orgId) return new Set();

  const { data } = await admin
    .from("org_app_subscriptions")
    .select(
      "site_walk, tours, slatedrop, design_studio, content_studio, digital_twin, bundle, storage_addon_gb, credit_addon_balance",
    )
    .eq("org_id", orgId)
    .maybeSingle();
  if (!data) return new Set();

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
  const modular = resolveModularEntitlements(subs);

  // `tier !== "none"` excludes trial's active-but-unpaid apps; bundles are already
  // widened into per-app tiers by resolveModularEntitlements.
  return new Set(ALL_APP_IDS.filter((id) => modular.apps[id].active && modular.apps[id].tier !== "none"));
}
