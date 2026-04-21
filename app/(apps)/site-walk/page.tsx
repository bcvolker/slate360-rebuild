import { redirect } from "next/navigation";
import { MapPinned } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { resolveProjectScope } from "@/lib/projects/access";
import { resolveOrgEntitlements } from "@/lib/server/org-feature-flags";
import { isBetaMode } from "@/lib/beta-mode";
import { ComingSoonEmptyState } from "@/components/shared/ComingSoonEmptyState";

/**
 * /site-walk landing.
 *
 * The real Site Walk surfaces live at /site-walk/walks (the new 5-tab shell
 * from PR #27a). This index gates access then redirects.
 */
export default async function SiteWalkPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?redirectTo=/site-walk");

  const { orgId } = await resolveProjectScope(user.id);
  const entitlements = await resolveOrgEntitlements(orgId);

  // In beta mode, every beta-approved user gets Site Walk access regardless
  // of paid entitlements. Outside beta, gate on canAccessStandalonePunchwalk.
  if (!isBetaMode() && !entitlements.canAccessStandalonePunchwalk) {
    redirect("/dashboard?error=no_punchwalk");
  }

  // PR #27a moved the Site Walk landing experience to the 5-tab shell.
  // Phase 1 redesign (PR #27g) introduces /site-walk/home as the new
  // landing surface; legacy /walks remains active.
  redirect("/site-walk/home");

  // Unreachable — kept so the file always returns JSX.
  return <ComingSoonEmptyState title="Site Walk" icon={MapPinned} />;
}
