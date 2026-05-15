import { resolveServerOrgContext } from "@/lib/server/org-context";
import { loadSiteWalkHubData } from "@/lib/site-walk/load-hub-data";
import { V1PreviewClient } from "./_components/V1PreviewClient";

export default async function SiteWalkV1PreviewPage() {
  const ctx = await resolveServerOrgContext();
  const { projects, walks, summary } = await loadSiteWalkHubData(ctx.orgId);

  const userInitial =
    ctx.user?.user_metadata?.full_name?.[0]?.toUpperCase() ??
    ctx.user?.email?.[0]?.toUpperCase() ??
    "S";

  return (
    <V1PreviewClient
      orgName={ctx.orgName}
      userInitial={userInitial}
      isAdmin={ctx.canAccessOperationsConsole}
      projects={projects}
      walks={walks}
      summary={summary}
    />
  );
}
