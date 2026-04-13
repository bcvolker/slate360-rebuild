import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { resolveProjectScope } from "@/lib/projects/access";
import { ProjectSelectorClient } from "@/components/site-walk/ProjectSelectorClient";

export default async function SiteWalkPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirectTo=/site-walk");

  const { admin, orgId } = await resolveProjectScope(user.id);
  if (!orgId) redirect("/dashboard");

  const { data: projects } = await admin
    .from("projects")
    .select("id, name, status, created_at")
    .eq("org_id", orgId)
    .order("name", { ascending: true });

  return <ProjectSelectorClient projects={projects ?? []} />;
}
