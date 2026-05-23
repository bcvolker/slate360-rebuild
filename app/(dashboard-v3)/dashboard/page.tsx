import { DashboardV3Shell } from "@/components/dashboard-v3/DashboardV3Shell";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  const { user, orgName } = await resolveServerOrgContext();
  if (!user) redirect("/login");

  return <DashboardV3Shell workspaceName={orgName} />;
}
