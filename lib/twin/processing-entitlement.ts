import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { isBetaMode } from "@/lib/beta-mode";
import { isOwnerEmail } from "@/lib/server/beta-access";

type AdminClient = SupabaseClient;

export type DigitalTwinEntitlementSource = "ceo" | "beta" | "approved" | "org_flag" | "none";

export type DigitalTwinEntitlement = {
  allowed: boolean;
  source: DigitalTwinEntitlementSource;
  subscriptionTier: "none" | "basic" | "pro";
};

/**
 * Resolves whether an org/user may use Digital Twin APIs and enqueue processing.
 * CEO email, profile approval, or org standalone_digital_twin flag grants access.
 */
export async function resolveDigitalTwinEntitlement(
  admin: AdminClient,
  params: {
    userId: string;
    userEmail?: string | null;
    orgId: string | null;
  },
): Promise<DigitalTwinEntitlement> {
  if (isOwnerEmail(params.userEmail)) {
    return { allowed: true, source: "ceo", subscriptionTier: "pro" };
  }

  if (isBetaMode()) {
    return { allowed: true, source: "beta", subscriptionTier: "pro" };
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("is_digital_twin_approved")
    .eq("id", params.userId)
    .maybeSingle();

  if (profile?.is_digital_twin_approved === true) {
    return { allowed: true, source: "approved", subscriptionTier: "pro" };
  }

  if (!params.orgId) {
    return { allowed: false, source: "none", subscriptionTier: "none" };
  }

  const [flagsResult, subResult] = await Promise.all([
    admin
      .from("org_feature_flags")
      .select("standalone_digital_twin")
      .eq("org_id", params.orgId)
      .maybeSingle(),
    admin
      .from("org_app_subscriptions")
      .select("digital_twin")
      .eq("org_id", params.orgId)
      .maybeSingle(),
  ]);

  const tier = (subResult.data?.digital_twin ?? "none") as "none" | "basic" | "pro";
  const hasFlag = flagsResult.data?.standalone_digital_twin === true;

  if (hasFlag) {
    return { allowed: true, source: "org_flag", subscriptionTier: tier };
  }

  return { allowed: false, source: "none", subscriptionTier: tier };
}

/**
 * Fail-closed gate before inserting digital_twin_processing_jobs.
 */
export async function assertDigitalTwinProcessingEntitlement(
  admin: AdminClient,
  params: {
    orgId: string;
    userId: string;
    userEmail?: string | null;
    captureId: string;
  },
): Promise<DigitalTwinEntitlement> {
  const entitlement = await resolveDigitalTwinEntitlement(admin, {
    userId: params.userId,
    userEmail: params.userEmail,
    orgId: params.orgId,
  });

  if (!entitlement.allowed) {
    throw new Error("Digital Twin access required to enqueue processing");
  }

  const { data: capture, error: captureError } = await admin
    .from("digital_twin_captures")
    .select("id, org_id, deleted_at")
    .eq("id", params.captureId)
    .eq("org_id", params.orgId)
    .is("deleted_at", null)
    .maybeSingle();

  if (captureError) {
    throw new Error(captureError.message);
  }
  if (!capture) {
    throw new Error("Capture not found or deleted");
  }

  const { data: activeJob, error: jobError } = await admin
    .from("digital_twin_processing_jobs")
    .select("id, status")
    .eq("capture_id", params.captureId)
    .eq("org_id", params.orgId)
    .is("deleted_at", null)
    .in("status", ["queued", "processing"])
    .limit(1)
    .maybeSingle();

  if (jobError) {
    throw new Error(jobError.message);
  }
  if (activeJob) {
    throw new Error(
      `Processing already active for capture (job=${activeJob.id}, status=${activeJob.status})`,
    );
  }

  return entitlement;
}
