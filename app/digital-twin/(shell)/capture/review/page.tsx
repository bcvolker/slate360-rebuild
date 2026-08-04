import { TwinCaptureReviewScreen } from "@/components/digital-twin/TwinCaptureReviewScreen";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { isOwnerEmail } from "@/lib/server/beta-access";

export default async function TwinCaptureReviewPage() {
  const context = await resolveServerOrgContext();
  return <TwinCaptureReviewScreen canUseHighQuality={isOwnerEmail(context.user?.email)} />;
}
