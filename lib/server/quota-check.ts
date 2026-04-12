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
  const maxSessions = ent.apps.site_walk.maxSessions ?? Infinity;
  const current = countResult.count ?? 0;

  if (!ent.apps.site_walk.active) {
    return { allowed: false, reason: "Site Walk is not active on your plan" };
  }

  if (current >= maxSessions) {
    return {
      allowed: false,
      reason: `Session limit reached (${current}/${maxSessions})`,
      currentUsage: current,
      limit: maxSessions,
    };
  }

  return { allowed: true, currentUsage: current, limit: maxSessions };
}

/** Check if the org has storage remaining for an upload */
export async function checkStorageQuota(
  admin: SupabaseClient,
  orgId: string,
  fileSizeBytes: number,
): Promise<QuotaResult> {
  const [subsResult, usageResult] = await Promise.all([
    admin
      .from("org_app_subscriptions")
      .select("site_walk")
      .eq("org_id", orgId)
      .single(),
    admin
      .from("site_walk_items")
      .select("metadata")
      .eq("org_id", orgId)
      .not("photo_s3_key", "is", null),
  ]);

  const subs = (subsResult.data ?? {}) as Partial<OrgAppSubscriptions>;
  const ent = resolveModularEntitlements(subs);
  const maxStorageGB = ent.apps.site_walk.maxStorageGB ?? Infinity;
  const maxBytes = maxStorageGB * 1024 * 1024 * 1024;

  // Rough estimate: count items with photos, assume avg 2MB each
  // In production, track actual byte usage in a storage_used column
  const photoCount = usageResult.data?.length ?? 0;
  const estimatedUsed = photoCount * 2 * 1024 * 1024;

  if (estimatedUsed + fileSizeBytes > maxBytes) {
    return {
      allowed: false,
      reason: `Storage limit reached (${(estimatedUsed / 1024 / 1024 / 1024).toFixed(1)}GB / ${maxStorageGB}GB)`,
      currentUsage: estimatedUsed,
      limit: maxBytes,
    };
  }

  return { allowed: true, currentUsage: estimatedUsed, limit: maxBytes };
}
