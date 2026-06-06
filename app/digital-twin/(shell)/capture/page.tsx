import { resolveServerOrgContext } from "@/lib/server/org-context";
import { loadDigitalTwinHubData } from "@/lib/digital-twin/load-hub-data";
import { TwinCaptureFlow } from "@/components/digital-twin/TwinCaptureFlow";

export default async function DigitalTwinCapturePage() {
  const context = await resolveServerOrgContext();
  const { twins, projects } = await loadDigitalTwinHubData(context.orgId);

  return <TwinCaptureFlow spaces={twins} projects={projects} />;
}
