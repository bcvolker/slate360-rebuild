import { ProjectDocumentsPanel } from "@/components/spatial-walkthrough/ProjectDocumentsPanel";

export default async function ProjectDocumentsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  return <ProjectDocumentsPanel projectId={projectId} />;
}
