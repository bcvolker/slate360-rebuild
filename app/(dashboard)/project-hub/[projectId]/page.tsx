import { notFound, redirect } from "next/navigation";
import ProjectDashboardGrid from "@/components/project-hub/ProjectDashboardGrid";
import { createClient } from "@/lib/supabase/server";
import { getScopedProjectForUser } from "@/lib/projects/access";

type ProjectHubProjectPageProps = {
  params: Promise<{ projectId: string }>;
};

export default async function ProjectHubProjectPage({ params }: ProjectHubProjectPageProps) {
  const { projectId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?redirectTo=${encodeURIComponent(`/project-hub/${projectId}`)}`);
  }

  const { project } = await getScopedProjectForUser(user.id, projectId, "id, name, status, metadata");

  if (!project) {
    notFound();
  }

  return <ProjectDashboardGrid projectId={projectId} project={project} />;
}
