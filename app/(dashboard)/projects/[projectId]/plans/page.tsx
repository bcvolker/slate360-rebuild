import { loadProjectPlansTabData } from "@/lib/projects/plans-tab-data";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { ProjectPlansTab } from "@/components/projects/ProjectPlansTab";

export default async function ProjectPlansPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const [data, context] = await Promise.all([
    loadProjectPlansTabData(projectId),
    resolveServerOrgContext(),
  ]);

  return <ProjectPlansTab data={data} canManage={!context.isViewer} />;
}
