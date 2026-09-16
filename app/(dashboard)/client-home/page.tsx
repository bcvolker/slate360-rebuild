import { redirect } from "next/navigation";
import { ClientHomeContent } from "@/components/dashboard-desktop/ClientHomeContent";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { loadClientHomeData } from "@/lib/dashboard/load-client-home-data";
import { resolveClientSurfaceFlags } from "@/lib/spatial-walkthrough/access";
import { isSpatialOnlyPortal } from "@/lib/spatial-walkthrough/client-surface";

export const metadata = {
  title: "Your Projects — Slate360",
};

export default async function ClientHomePage() {
  const { user, orgId, isSlateCeo } = await resolveServerOrgContext();
  if (!user) redirect("/login?redirectTo=/client-home");

  const flags = await resolveClientSurfaceFlags(orgId, Boolean(isSlateCeo));
  if (!isSpatialOnlyPortal(flags)) {
    redirect("/dashboard");
  }

  const data = await loadClientHomeData(orgId);

  return <ClientHomeContent projects={data.projects} />;
}
