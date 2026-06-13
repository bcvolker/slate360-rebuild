import { redirect } from "next/navigation";
import { DashboardSiteWalksContent } from "@/components/dashboard-desktop/DashboardSiteWalksContent";
import { loadSiteWalkHubData } from "@/lib/site-walk/load-hub-data";
import { resolveServerOrgContext } from "@/lib/server/org-context";

export const metadata = {
  title: "Site Walks — Slate360",
};

export default async function DashboardSiteWalksPage() {
  const { user, orgId } = await resolveServerOrgContext();
  if (!user) redirect("/login?redirectTo=/site-walks");

  const { walks } = await loadSiteWalkHubData(orgId);

  return <DashboardSiteWalksContent walks={walks} />;
}
