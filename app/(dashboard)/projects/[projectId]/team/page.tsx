import { ProjectTeamTab } from "@/components/projects/ProjectTeamTab";
import { loadProjectTeamTabData } from "@/lib/projects/team-tab-data";
import { resolveServerOrgContext } from "@/lib/server/org-context";

export default async function ProjectTeamPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const [data, context] = await Promise.all([
    loadProjectTeamTabData(projectId),
    resolveServerOrgContext(),
  ]);

  return (
    <ProjectTeamTab
      data={data}
      basePath="/projects"
      canManage={!context.isViewer}
    />
  );
}
