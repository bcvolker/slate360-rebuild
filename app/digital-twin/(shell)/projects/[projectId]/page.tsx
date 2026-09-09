import { resolveServerOrgContext } from "@/lib/server/org-context";
import { loadDigitalTwinHubData } from "@/lib/digital-twin/load-hub-data";
import { UNFILED_PROJECT_KEY } from "@/lib/digital-twin/twin-hub-state";
import { TwinProjectScreen } from "@/components/digital-twin/project/TwinProjectScreen";

type Props = { params: Promise<{ projectId: string }> };

/** S2 — one project's twins. `unfiled` is the Quick Scans bucket. */
export default async function DigitalTwinProjectPage({ params }: Props) {
  const { projectId: raw } = await params;
  const key = decodeURIComponent(raw);
  const projectId = key === UNFILED_PROJECT_KEY ? null : key;
  const context = await resolveServerOrgContext();
  const { twins, projects } = await loadDigitalTwinHubData(context.orgId);

  const mine = twins.filter((t) => (projectId ? t.projectId === projectId : t.projectId === null));
  const projectName = projectId
    ? projects.find((p) => p.id === projectId)?.name ?? mine[0]?.projectName ?? "Project"
    : "Quick Scans · unfiled";

  return <TwinProjectScreen projectId={projectId} projectName={projectName} twins={mine} projects={projects} />;
}
