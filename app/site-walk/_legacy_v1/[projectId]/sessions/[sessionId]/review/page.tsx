import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { resolveProjectScope, getScopedProjectForUser } from "@/lib/projects/access";
import { SessionReviewClient } from "@/components/site-walk/SessionReviewClient";

type Props = { params: Promise<{ projectId: string; sessionId: string }> };

export default async function SessionReviewPage({ params }: Props) {
  const { projectId, sessionId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?redirectTo=/site-walk/${projectId}/sessions/${sessionId}/review`);

  const { admin, orgId } = await resolveProjectScope(user.id);
  if (!orgId) redirect("/dashboard");

  const { project } = await getScopedProjectForUser(user.id, projectId, "id, name");
  if (!project) redirect("/site-walk");
  const projectRecord = project as unknown as { id: string; name: string };

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
    .order("sort_order", { ascending: true });

  const { data: deliverables } = await admin
    .from("site_walk_deliverables")
    .select("id, title, deliverable_type, status, created_at")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false });

  const { data: profiles } = await admin
    .from("profiles")
    .select("id, display_name")
    .eq("org_id", orgId);

  return (
    <SessionReviewClient
      projectId={projectId}
      projectName={projectRecord.name}
      session={session}
      items={items ?? []}
      deliverables={deliverables ?? []}
      userId={user.id}
      orgMembers={(profiles ?? []).map((p) => ({ id: p.id, display_name: p.display_name ?? "Unknown" }))}
    />
  );
}
