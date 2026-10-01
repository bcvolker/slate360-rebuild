import { ProjectWalkthroughLibrary } from "@/components/spatial-walkthrough/ProjectWalkthroughLibrary";

export default async function ProjectWalkthroughsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  return <ProjectWalkthroughLibrary projectId={projectId} />;
}
