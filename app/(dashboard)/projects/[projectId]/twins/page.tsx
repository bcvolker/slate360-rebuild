import { loadProjectTwinsTabData } from "@/lib/projects/load-project-twins-data";
import { ProjectTwinsTab } from "@/components/projects/ProjectTwinsTab";
import { requireClientAppPage } from "@/lib/spatial-walkthrough/require-client-app";

export default async function ProjectTwinsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  await requireClientAppPage("twin360");
  const { projectId } = await params;
  const data = await loadProjectTwinsTabData(projectId);
  return <ProjectTwinsTab data={data} projectId={projectId} />;
}
