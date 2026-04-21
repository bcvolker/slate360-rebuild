import { redirect } from "next/navigation";
import { MapPinned } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { resolveProjectScope } from "@/lib/projects/access";
import { resolveOrgEntitlements } from "@/lib/server/org-feature-flags";
import { ComingSoonEmptyState } from "@/components/shared/ComingSoonEmptyState";

/**
 * /site-walk landing.
 *
 * The real Site Walk surfaces live at /site-walk/board and
 * /site-walk/[projectId]. This index is intentionally minimal — no
 * placeholder marketing content — so the chrome (sidebar + topbar from
 * AuthedAppShell) carries the page identity.
 */
export default async function SiteWalkPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?redirectTo=/site-walk");

  const { orgId } = await resolveProjectScope(user.id);
  const entitlements = await resolveOrgEntitlements(orgId);

  if (!entitlements.canAccessStandalonePunchwalk) {
    redirect("/dashboard?error=no_punchwalk");
  }

  // PR #27a moved the Site Walk landing experience to the 5-tab shell at
  // /site-walk/walks (Walks · Deliverables · Capture · More · Account).
  // The legacy session board still lives at /site-walk/board for now.
  redirect("/site-walk/walks");

  // Unreachable — kept so the file always returns JSX.
  return <ComingSoonEmptyState title="Site Walk" icon={MapPinned} />;
}
