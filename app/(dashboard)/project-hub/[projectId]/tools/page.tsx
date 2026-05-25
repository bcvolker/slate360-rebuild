import { ProjectHubToolsLanding } from "@/components/project-hub/ProjectHubToolsLanding";
import { loadProjectDetailMeta } from "@/lib/projects/detail-meta";

export default async function ProjectHubToolsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  await loadProjectDetailMeta(projectId, "/project-hub");

  return <ProjectHubToolsLanding projectId={projectId} />;
}
