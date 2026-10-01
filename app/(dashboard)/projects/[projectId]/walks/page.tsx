import { loadProjectWalksTabData } from "@/lib/projects/load-project-walks-data";
import { ProjectWalksTab } from "@/components/projects/ProjectWalksTab";
import { requireClientAppPage } from "@/lib/spatial-walkthrough/require-client-app";

export default async function ProjectWalksPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  await requireClientAppPage("site-walk");
  const { projectId } = await params;
  const data = await loadProjectWalksTabData(projectId);
  return <ProjectWalksTab data={data} />;
}
