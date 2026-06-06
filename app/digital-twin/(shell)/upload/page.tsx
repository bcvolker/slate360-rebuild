import { resolveServerOrgContext } from "@/lib/server/org-context";
import { loadDigitalTwinHubData } from "@/lib/digital-twin/load-hub-data";
import { TwinUploadPanel } from "@/components/digital-twin/TwinUploadPanel";

export default async function DigitalTwinUploadPage() {
  const context = await resolveServerOrgContext();
  const { twins, projects } = await loadDigitalTwinHubData(context.orgId);

  return <TwinUploadPanel spaces={twins} projects={projects} />;
}
