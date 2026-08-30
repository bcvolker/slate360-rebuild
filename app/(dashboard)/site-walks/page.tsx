import { redirect } from "next/navigation";
import { DashboardSiteWalksContent } from "@/components/dashboard-desktop/DashboardSiteWalksContent";
import { loadSiteWalkHubData } from "@/lib/site-walk/load-hub-data";
import { requireClientAppPage } from "@/lib/spatial-walkthrough/require-client-app";

export const metadata = {
  title: "Site Walks — Slate360",
};

export default async function DashboardSiteWalksPage() {
  const { user, orgId } = await resolveServerOrgContext();
  if (!user) redirect("/login?redirectTo=/site-walks");
  await requireClientAppPage("site-walk");

  const { walks } = await loadSiteWalkHubData(orgId);

  return <DashboardSiteWalksContent walks={walks} />;
}
