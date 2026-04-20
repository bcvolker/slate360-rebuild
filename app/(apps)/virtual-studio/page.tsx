import { redirect } from "next/navigation";
import { Film } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { resolveProjectScope } from "@/lib/projects/access";
import { resolveOrgEntitlements } from "@/lib/server/org-feature-flags";
import { ComingSoonEmptyState } from "@/components/shared/ComingSoonEmptyState";

export default async function VirtualStudioPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?redirectTo=/virtual-studio");

  const { orgId } = await resolveProjectScope(user.id);
  const entitlements = await resolveOrgEntitlements(orgId);

  if (!entitlements.canAccessVirtual) {
    redirect("/dashboard?error=no_virtual_studio");
  }

  return <ComingSoonEmptyState title="Virtual Studio" icon={Film} />;
}
