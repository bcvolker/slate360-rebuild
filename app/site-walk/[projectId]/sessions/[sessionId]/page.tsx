import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { resolveProjectScope, getScopedProjectForUser } from "@/lib/projects/access";
import { SessionCaptureClient } from "@/components/site-walk/SessionCaptureClient";

type Props = { params: Promise<{ projectId: string; sessionId: string }> };

export default async function SessionDetailPage({ params }: Props) {
  const { projectId, sessionId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?redirectTo=/site-walk/${projectId}/sessions/${sessionId}`);

  const { admin, orgId } = await resolveProjectScope(user.id);
  if (!orgId) redirect("/dashboard");

  const project = await getScopedProjectForUser(user.id, projectId, "id, name");
  if (!project) redirect("/site-walk");

  const { data: session } = await admin
    .from("site_walk_sessions")
    .select("*")
    .eq("id", sessionId)
    .eq("org_id", orgId)
    .single();

  if (!session) redirect(`/site-walk/${projectId}/sessions`);

  const { data: items } = await admin
    .from("site_walk_items")
    .select("*")
    .eq("session_id", sessionId)
    .eq("org_id", orgId)
    .order("sort_order", { ascending: true });

  return (
    <SessionCaptureClient
      projectId={projectId}
      projectName={project.name}
      session={session}
      initialItems={items ?? []}
    />
  );
}
