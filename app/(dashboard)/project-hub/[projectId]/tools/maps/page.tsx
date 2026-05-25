import { ProjectMapsView } from "@/components/project-hub/tools/maps/ProjectMapsView";
import { loadProjectDetailMeta } from "@/lib/projects/detail-meta";
import { loadProjectMapsTabData } from "@/lib/projects/maps-tab-data";

export default async function ProjectHubMapsToolPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  await loadProjectDetailMeta(projectId, "/project-hub");
  const data = await loadProjectMapsTabData(projectId);

  return <ProjectMapsView {...data} />;
}
