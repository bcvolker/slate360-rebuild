import { resolveServerOrgContext } from "@/lib/server/org-context";
import { loadSiteWalkHubData } from "@/lib/site-walk/load-hub-data";
import { SiteWalkHomeClient } from "@/components/site-walk/SiteWalkHomeClient";

export default async function SiteWalkPage() {
  const context = await resolveServerOrgContext();
  const { projects, walks, summary } = await loadSiteWalkHubData(context.orgId);

  const userInitial =
    context.user?.user_metadata?.full_name?.[0]?.toUpperCase() ??
    context.user?.email?.[0]?.toUpperCase() ??
    "S";

  return (
    <SiteWalkHomeClient
      orgName={context.orgName}
      userInitial={userInitial}
      projects={projects}
      walks={walks}
      summary={summary}
    />
  );
}

