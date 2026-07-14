import { loadProjectDeliverablesTabData } from "@/lib/projects/load-project-deliverables-data";
import { SW360ReportsTabClient } from "@/components/sw360/SW360ReportsTabClient";

export default async function SW360ProjectReportsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const data = await loadProjectDeliverablesTabData(projectId);
  return <SW360ReportsTabClient data={data} />;
}
