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

  if (!entitlements.canAccessDesignStudio) {
    redirect("/dashboard?error=no_design_studio");
  }

  // Fetch org's projects for the project selector
  const admin = createAdminClient();
  const { data: projects } = await admin
    .from("projects")
    .select("id, name")
    .eq("org_id", orgId)
    .order("name", { ascending: true });

  return (
    <main className="flex min-h-screen flex-col p-6">
      <h1 className="mb-6 text-2xl font-bold">Design Studio</h1>
      <DesignStudioShell projects={projects ?? []} />
    </main>
  );
}
