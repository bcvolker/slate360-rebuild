import { resolveServerOrgContext } from "@/lib/server/org-context";
import { redirect } from "next/navigation";
import WalledGardenDashboard from "@/components/walled-garden-dashboard";
import { ensureUserOrganization } from "@/lib/server/org-bootstrap";
import { resolveOrgEntitlements } from "@/lib/server/org-feature-flags";

export const metadata = {
  title: "Slate360 — Home",
};

export default async function DashboardPage() {
  const {
    user,
    orgId,
    orgName,
    isSlateCeo,
  } = await resolveServerOrgContext();
  if (!user) redirect("/login");

  if (!orgId) {
    try {
      await ensureUserOrganization(user);
    } catch (error) {
      console.error("[dashboard] org bootstrap fallback failed", error);
    }
  }

  const entitlements = await resolveOrgEntitlements(orgId ?? null);

  return (
    <WalledGardenDashboard
      entitlements={entitlements}
      isSlateCeo={isSlateCeo}
    />
  );
}
