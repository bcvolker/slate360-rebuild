import { loadProjectWalksTabData } from "@/lib/projects/load-project-walks-data";
import { ProjectWalksTab } from "@/components/projects/ProjectWalksTab";

export default async function ProjectWalksPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const data = await loadProjectWalksTabData(projectId);
  return <ProjectWalksTab data={data} />;
}
