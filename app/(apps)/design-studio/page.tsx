import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { resolveProjectScope } from "@/lib/projects/access";
import { resolveOrgEntitlements } from "@/lib/server/org-feature-flags";
import { createAdminClient } from "@/lib/supabase/admin";
import { DesignStudioShell } from "@/components/design-studio/DesignStudioShell";

export default async function DesignStudioPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?redirectTo=/design-studio");

  const { orgId } = await resolveProjectScope(user.id);
  const entitlements = await resolveOrgEntitlements(orgId);

  if (!entitlements.canAccessStandaloneDesignStudio) {
    redirect("/dashboard?error=no_design_studio");
  }

  // Fetch org's projects for the project selector
  const admin = createAdminClient();
  const { data: projects } = await admin
    .from("projects")
    .select("id, name")
    .eq("org_id", orgId)
    .order("name", { ascending: true });

  return <DesignStudioShell projects={projects ?? []} />;
}
