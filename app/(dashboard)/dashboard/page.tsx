import { redirect } from "next/navigation";
import { CreatorHome } from "@/components/product-shell/CreatorHome";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { loadDashboardHomeData } from "@/lib/dashboard/load-dashboard-home-data";
import { resolveClientSurfaceFlags } from "@/lib/spatial-walkthrough/access";
import { isSpatialOnlyPortal, portalHomeHref } from "@/lib/spatial-walkthrough/client-surface";

export const metadata = {
  title: "Dashboard — Slate360",
};

export default async function DashboardHomePage() {
  const { user, orgId, isSlateCeo } = await resolveServerOrgContext();
  if (!user) redirect("/login?redirectTo=/dashboard");

  const flags = await resolveClientSurfaceFlags(orgId, Boolean(isSlateCeo));
  if (isSpatialOnlyPortal(flags)) {
    redirect(portalHomeHref(flags));
  }

  const data = await loadDashboardHomeData(orgId, user.id);

  return (
    <CreatorHome
      recentProjects={data.recentProjects}
      recentWalks={data.recentWalks}
      needsAttention={data.needsAttention}
    />
  );
}
