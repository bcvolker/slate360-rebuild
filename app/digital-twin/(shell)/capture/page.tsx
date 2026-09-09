import { resolveServerOrgContext } from "@/lib/server/org-context";
import { loadDigitalTwinHubData } from "@/lib/digital-twin/load-hub-data";
import { TwinCaptureFlow } from "@/components/digital-twin/TwinCaptureFlow";

type PageProps = {
  searchParams: Promise<{ projectId?: string; mode?: string; spaceId?: string }>;
};

export default async function DigitalTwinCapturePage({ searchParams }: PageProps) {
  const context = await resolveServerOrgContext();
  const { twins, projects } = await loadDigitalTwinHubData(context.orgId);
  const params = await searchParams;
  const initialProjectId = params.projectId?.trim() || null;
  const initialSpaceId = params.spaceId?.trim() || null;
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
