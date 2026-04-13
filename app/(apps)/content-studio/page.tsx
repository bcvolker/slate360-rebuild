import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { resolveProjectScope } from "@/lib/projects/access";
import { resolveOrgEntitlements } from "@/lib/server/org-feature-flags";
import { createAdminClient } from "@/lib/supabase/admin";
import { ContentStudioShell } from "@/components/content-studio/ContentStudioShell";

export default async function ContentStudioPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?redirectTo=/content-studio");

  const { orgId } = await resolveProjectScope(user.id);
  const entitlements = await resolveOrgEntitlements(orgId);

  if (!entitlements.canAccessStandaloneContentStudio) {
    redirect("/dashboard?error=no_content_studio");
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
      <h1 className="mb-6 text-2xl font-bold">Content Studio</h1>
      <ContentStudioShell projects={projects ?? []} />
    </main>
  );
}
