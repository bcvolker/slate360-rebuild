import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { resolveProjectScope, getScopedProjectForUser } from "@/lib/projects/access";
import { SessionListClient } from "@/components/site-walk/SessionListClient";

type Props = { params: Promise<{ projectId: string }> };

export default async function SessionsPage({ params }: Props) {
  const { projectId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?redirectTo=/site-walk/${projectId}/sessions`);

  const { admin, orgId } = await resolveProjectScope(user.id);
  if (!orgId) redirect("/dashboard");

  const { project } = await getScopedProjectForUser(user.id, projectId, "id, name");
  if (!project) redirect("/site-walk");
  const projectRecord = project as unknown as { id: string; name: string };

  const { data: sessions } = await admin
    .from("site_walk_sessions")
    .select("id, title, status, started_at, completed_at, created_at")
    .eq("project_id", projectId)
    .eq("org_id", orgId)
    .neq("status", "archived")
    .order("created_at", { ascending: false });

  return (
    <SessionListClient
      projectId={projectId}
      projectName={projectRecord.name}
      sessions={sessions ?? []}
    />
  );
}
