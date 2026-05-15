import { resolveServerOrgContext } from "@/lib/server/org-context";
import { loadSiteWalkHubData } from "@/lib/site-walk/load-hub-data";
import { SiteWalkHub } from "./_components/SiteWalkHub";

export default async function SiteWalkPage() {
  const context = await resolveServerOrgContext();
  const { projects, walks, summary } = await loadSiteWalkHubData(context.orgId);

  return (
    <main className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-[radial-gradient(circle_at_top,rgba(245,158,11,0.07),transparent_34%),#0B0F15] px-3 py-2 text-slate-50 sm:px-6 sm:py-3 lg:px-8">
      <div className="mx-auto flex min-h-0 w-full max-w-6xl flex-1">
        <SiteWalkHub projects={projects} walks={walks} summary={summary} />
      </div>
    </main>
  );
}
