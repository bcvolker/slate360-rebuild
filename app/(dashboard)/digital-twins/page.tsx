import { redirect } from "next/navigation";
import { DashboardTwinsContent } from "@/components/dashboard-desktop/DashboardTwinsContent";
import { APP_STORE_MODE } from "@/lib/app-store-mode";
import { loadDigitalTwinHubData } from "@/lib/digital-twin/load-hub-data";
import { resolveServerOrgContext } from "@/lib/server/org-context";

export const metadata = {
  title: "Digital Twins — Slate360",
};

export default async function DashboardDigitalTwinsPage() {
  // Twin module stays hidden in authenticated nav for the Site-Walk-only release (AGENTS.md).
  if (APP_STORE_MODE) redirect("/dashboard");

  const { user, orgId } = await resolveServerOrgContext();
  if (!user) redirect("/login?redirectTo=/digital-twins");

  const { twins } = await loadDigitalTwinHubData(orgId);

  return <DashboardTwinsContent twins={twins} />;
}
