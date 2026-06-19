import { resolveServerOrgContext } from "@/lib/server/org-context";
import { loadDigitalTwinHubData } from "@/lib/digital-twin/load-hub-data";
import { TwinUploadPanel } from "@/components/digital-twin/TwinUploadPanel";

type PageProps = {
  searchParams: Promise<{ projectId?: string; mode?: string; capture?: string }>;
};

export default async function DigitalTwinUploadPage({ searchParams }: PageProps) {
  const context = await resolveServerOrgContext();
  const { twins, projects } = await loadDigitalTwinHubData(context.orgId);
  const params = await searchParams;
  const initialProjectId = params.projectId?.trim() || null;
  const initialCaptureId = params.capture?.trim() || null;
  const lockProject = params.mode === "project" && Boolean(initialProjectId);

  return (
    <TwinUploadPanel
      spaces={twins}
      projects={projects}
      initialProjectId={initialProjectId}
      initialCaptureId={initialCaptureId}
      lockProject={lockProject}
    />
  );
}
