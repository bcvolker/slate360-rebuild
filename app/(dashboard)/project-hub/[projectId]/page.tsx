import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ProjectDashboardGrid from "@/components/project-hub/ProjectDashboardGrid";
import { getScopedProjectForUser } from "@/lib/projects/access";

export default async function ProjectOverviewPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    notFound();
  }

  const { project: scopedProject } = await getScopedProjectForUser(user.id, projectId, "id, name, status, metadata");
  const project = scopedProject as { id: string; name: string; status: string; metadata: Record<string, unknown> | null } | null;

  if (!project) {
    notFound();
  }

  return <ProjectDashboardGrid projectId={projectId} project={project} />;
}
