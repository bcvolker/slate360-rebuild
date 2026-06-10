import { TwinCaptureReviewScreen } from "@/components/digital-twin/TwinCaptureReviewScreen";
import { isOwnerEmail } from "@/lib/server/beta-access";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function TwinCaptureReviewPage() {
  const context = await resolveServerOrgContext();
  const admin = createAdminClient();

  let canUseHighQuality = isOwnerEmail(context.user?.email);
  if (!canUseHighQuality && context.orgId) {
    const { data } = await admin
      .from("org_app_subscriptions")
      .select("digital_twin")
      .eq("org_id", context.orgId)
      .maybeSingle();
    canUseHighQuality = data?.digital_twin === "pro";
  }

  return <TwinCaptureReviewScreen canUseHighQuality={canUseHighQuality} />;
}
