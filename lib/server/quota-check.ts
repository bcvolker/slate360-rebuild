/**
 * lib/server/quota-check.ts
 * Lightweight quota enforcement for Site Walk operations.
 * Called from API routes before creating sessions or uploading files.
 */
import { SupabaseClient } from "@supabase/supabase-js";
import {
  resolveModularEntitlements,
  type OrgAppSubscriptions,
} from "@/lib/entitlements-modular";

interface QuotaResult {
  allowed: boolean;
  reason?: string;
  currentUsage?: number;
  limit?: number;
}

/** Check if the org can create another Site Walk session */
export async function checkSessionQuota(
  admin: SupabaseClient,
  orgId: string,
): Promise<QuotaResult> {
  const [subsResult, countResult] = await Promise.all([
    admin
      .from("org_app_subscriptions")
      .select("site_walk")
      .eq("org_id", orgId)
      .single(),
    admin
      .from("site_walk_sessions")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId),
  ]);

  const subs = (subsResult.data ?? {}) as Partial<OrgAppSubscriptions>;
  const ent = resolveModularEntitlements(subs);
  const current = countResult.count ?? 0;

  if (!ent.apps.site_walk.active) {
    return { allowed: false, reason: "Site Walk is not active on your plan" };
  }

  return { allowed: true, currentUsage: current };
}

// NOTE: the former checkStorageQuota() used a fabricated 2 MB-per-photo estimate and
// had zero callers — removed (billing audit #4). Authoritative storage gating uses the
// real org_storage_used_bytes counter: lib/twin/storage-quota.ts (assertStorageQuota,
// reads the get_storage_used RPC), lib/site-walk/metering.ts (checkStorageLimit), and the
// inline gate in app/api/slatedrop/upload-url/route.ts.
