import { ProjectItemsPage } from "@/components/spatial-walkthrough/items/ProjectItemsPage";

export default async function ProjectItemsRoutePage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  return <ProjectItemsPage projectId={projectId} />;
}
