import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { getEntitlements } from "@/lib/entitlements";

type AdminClient = SupabaseClient;

export class StorageQuotaExceededError extends Error {
  constructor(
    message: string,
    readonly usedBytes: number,
    readonly limitBytes: number,
    readonly attemptedBytes: number,
  ) {
    super(message);
    this.name = "StorageQuotaExceededError";
  }
}

export async function getOrgStorageLimitBytes(
  admin: AdminClient,
  orgId: string,
): Promise<number> {
  const { data: org, error } = await admin
    .from("organizations")
    .select("tier")
    .eq("id", orgId)
    .single();

  if (error) throw new Error(error.message);

  const { data: flags } = await admin
    .from("org_feature_flags")
    .select("*")
    .eq("org_id", orgId)
    .maybeSingle();

  const entitlements = getEntitlements(org?.tier ?? "trial", { featureFlags: flags ?? {} });
  const maxGb = entitlements.maxStorageGB || 5;
  return maxGb * 1024 * 1024 * 1024;
}

export async function assertStorageQuota(
  admin: AdminClient,
  orgId: string,
  additionalBytes: number,
): Promise<void> {
  if (additionalBytes <= 0) return;

  const [{ data: usedBytes, error: usedError }, limitBytes] = await Promise.all([
    admin.rpc("get_storage_used", { p_org_id: orgId }),
    getOrgStorageLimitBytes(admin, orgId),
  ]);

  if (usedError) throw new Error(usedError.message);

  const used = Number(usedBytes) || 0;
  if (used + additionalBytes > limitBytes) {
    throw new StorageQuotaExceededError(
      "Storage limit exceeded. Please upgrade your plan.",
      used,
      limitBytes,
      additionalBytes,
    );
  }
}
