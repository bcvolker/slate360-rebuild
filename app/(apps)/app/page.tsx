import { resolveServerOrgContext } from "@/lib/server/org-context";
import { ensureUserOrganization } from "@/lib/server/org-bootstrap";
import { DashboardV3Shell } from "@/components/dashboard-v3/DashboardV3Shell";

export const metadata = {
  title: "Slate360 — Home",
};

export default async function MobileAppRootPage() {
  const { user, orgId, orgName } = await resolveServerOrgContext();

  if (!orgId && user) {
    try {
      await ensureUserOrganization(user);
    } catch (error) {
      console.error("[app] org bootstrap fallback failed", error);
    }
  }

  return <DashboardV3Shell workspaceName={orgName} />;
}
