import { resolveServerOrgContext } from "@/lib/server/org-context";
import { loadDigitalTwinHubData, loadHubTwinById } from "@/lib/digital-twin/load-hub-data";
import { TwinCaptureFlow } from "@/components/digital-twin/TwinCaptureFlow";

type PageProps = {
  searchParams: Promise<{ projectId?: string; mode?: string; spaceId?: string }>;
};

export default async function DigitalTwinCapturePage({ searchParams }: PageProps) {
  const context = await resolveServerOrgContext();
  const params = await searchParams;
  const initialProjectId = params.projectId?.trim() || null;
  const initialSpaceId = params.spaceId?.trim() || null;
  const [{ twins: listed, projects }, target] = await Promise.all([
    loadDigitalTwinHubData(context.orgId),
    initialSpaceId ? loadHubTwinById(initialSpaceId, context.orgId) : Promise.resolve(null),
  ]);
  // A twin created seconds ago by the New Scan sheet has no capture yet, so the hub
  // list (which hides empty drafts) does not contain it. Put it first explicitly.
  const twins = target && !listed.some((t) => t.id === target.id) ? [target, ...listed] : listed;
  const lockProject = (params.mode === "project" && Boolean(initialProjectId)) || Boolean(initialSpaceId);
  const quickMode = params.mode === "quick" && !initialSpaceId;

  return (
    <TwinCaptureFlow
      spaces={twins}
      projects={projects}
      initialProjectId={initialProjectId}
      initialSpaceId={initialSpaceId}
      lockProject={lockProject}
      quickMode={quickMode}
    />
  );
}
