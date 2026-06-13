import { ProjectOverviewTab } from "@/components/projects/ProjectOverviewTab";
import { loadProjectOverviewData } from "@/lib/projects/load-project-overview-data";

export default async function ProjectPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const data = await loadProjectOverviewData(projectId);

  return <ProjectOverviewTab data={data} />;
}
