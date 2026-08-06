import { TwinStudioIndexContent } from "@/components/dashboard-desktop/TwinStudioIndexContent";
import { loadDigitalTwinHubData } from "@/lib/digital-twin/load-hub-data";
import { resolveServerOrgContext } from "@/lib/server/org-context";

export const metadata = {
  title: "Twin Studio — Slate360",
};

export default async function TwinStudioIndexPage() {
  const { orgId } = await resolveServerOrgContext();
  const { twins } = await loadDigitalTwinHubData(orgId);

  return <TwinStudioIndexContent twins={twins} />;
}
