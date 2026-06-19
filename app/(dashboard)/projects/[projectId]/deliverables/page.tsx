import { notFound, redirect } from "next/navigation";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { getScopedProjectForUser } from "@/lib/projects/access";
import { loadProjectDeliverablesTabData } from "@/lib/projects/load-project-deliverables-data";
import { ProjectDeliverablesTab } from "@/components/projects/ProjectDeliverablesTab";

export default async function ProjectDeliverablesPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const { user, isViewer } = await resolveServerOrgContext();
  if (!user) redirect(`/login?redirectTo=${encodeURIComponent(`/projects/${projectId}/deliverables`)}`);

  const { project } = await getScopedProjectForUser(user.id, projectId, "id");
  if (!project) notFound();

  const data = await loadProjectDeliverablesTabData(projectId);

  return <ProjectDeliverablesTab data={data} canManage={!isViewer} />;
}
