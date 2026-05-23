import { resolveServerOrgContext } from "@/lib/server/org-context";
import { ensureUserOrganization } from "@/lib/server/org-bootstrap";
import { resolveOrgEntitlements } from "@/lib/server/org-feature-flags";
import WalledGardenDashboard from "@/components/walled-garden-dashboard";

export const metadata = {
  title: "Slate360 — Home",
};

export default async function MobileAppRootPage() {
  const { user, orgId, orgName, isSlateCeo } = await resolveServerOrgContext();

  if (!orgId && user) {
    try {
      await ensureUserOrganization(user);
    } catch (error) {
      console.error("[app] org bootstrap fallback failed", error);
    }
  }

  const entitlements = await resolveOrgEntitlements(orgId ?? null);
  void entitlements;
  void isSlateCeo;

  return <WalledGardenDashboard workspaceName={orgName} />;
}
