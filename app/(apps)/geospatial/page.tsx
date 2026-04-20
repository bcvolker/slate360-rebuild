import { redirect } from "next/navigation";
import { Globe } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { resolveProjectScope } from "@/lib/projects/access";
import { resolveOrgEntitlements } from "@/lib/server/org-feature-flags";
import { ComingSoonEmptyState } from "@/components/shared/ComingSoonEmptyState";

export default async function GeospatialPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?redirectTo=/geospatial");

  const { orgId } = await resolveProjectScope(user.id);
  const entitlements = await resolveOrgEntitlements(orgId);

  if (!entitlements.canAccessGeospatial) {
    redirect("/dashboard?error=no_geospatial");
  }

  return <ComingSoonEmptyState title="Geospatial & Robotics" icon={Globe} />;
}
