import { redirect } from "next/navigation";
import { DashboardHomeContent } from "@/components/dashboard-desktop/DashboardHomeContent";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { loadDashboardHomeData } from "@/lib/dashboard/load-dashboard-home-data";

export const metadata = {
  title: "Dashboard — Slate360",
};

export default async function DashboardHomePage() {
  const { user, orgId, orgName, canAccessOperationsConsole } = await resolveServerOrgContext();
  if (!user) redirect("/login?redirectTo=/dashboard");

  const data = await loadDashboardHomeData(orgId);

  return (
    <DashboardHomeContent
      workspaceName={orgName ?? "Workspace"}
      counts={data.counts}
      recentProjects={data.recentProjects}
      recentWalks={data.recentWalks}
      recentTwins={data.recentTwins}
      showOpsConsole={Boolean(canAccessOperationsConsole)}
    />
  );
}
