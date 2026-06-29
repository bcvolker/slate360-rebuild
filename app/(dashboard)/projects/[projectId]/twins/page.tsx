import { loadProjectTwinsTabData } from "@/lib/projects/load-project-twins-data";
import { ProjectTwinsTab } from "@/components/projects/ProjectTwinsTab";

export default async function ProjectTwinsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const data = await loadProjectTwinsTabData(projectId);
  return <ProjectTwinsTab data={data} projectId={projectId} />;
}
