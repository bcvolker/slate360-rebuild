import { resolveServerOrgContext } from "@/lib/server/org-context";
import { loadDigitalTwinHubData } from "@/lib/digital-twin/load-hub-data";
import { buildTwinProjectCards } from "@/lib/digital-twin/twin-hub-state";
import { TwinHomeProjects } from "@/components/digital-twin/home/TwinHomeProjects";

/** "All projects" — every project card, uncapped. */
export default async function DigitalTwinProjectsPage() {
  const context = await resolveServerOrgContext();
  const { twins } = await loadDigitalTwinHubData(context.orgId);
  const cards = buildTwinProjectCards(twins);
  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-2xl flex-col gap-3 px-4 pt-3 pb-3">
      <TwinHomeProjects cards={cards} limit={Number.MAX_SAFE_INTEGER} />
    </div>
  );
}
