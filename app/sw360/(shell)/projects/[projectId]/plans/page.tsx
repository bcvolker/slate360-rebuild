import { loadProjectPlansTabData } from "@/lib/projects/plans-tab-data";
import { SW360PlansTabClient } from "@/components/sw360/SW360PlansTabClient";

export default async function SW360ProjectPlansPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const data = await loadProjectPlansTabData(projectId);
  return <SW360PlansTabClient data={data} />;
}
