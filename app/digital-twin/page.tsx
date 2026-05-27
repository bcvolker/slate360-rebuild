import { Suspense } from "react";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { loadDigitalTwinHubData } from "@/lib/digital-twin/load-hub-data";
import { DigitalTwinHomeClient } from "@/components/digital-twin/DigitalTwinHomeClient";

export default async function DigitalTwinPage() {
  const context = await resolveServerOrgContext();
  const { twins, projects } = await loadDigitalTwinHubData(context.orgId);

  return (
    <Suspense fallback={null}>
      <DigitalTwinHomeClient
        orgName={context.orgName}
        twins={twins}
        projects={projects}
      />
    </Suspense>
  );
}
