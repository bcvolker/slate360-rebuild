import { resolveServerOrgContext } from "@/lib/server/org-context";
import { redirect } from "next/navigation";
import WalledGardenDashboard from "@/components/walled-garden-dashboard";
import { ensureUserOrganization } from "@/lib/server/org-bootstrap";
import { getEntitlements } from "@/lib/entitlements";

export const metadata = {
  title: "Dashboard — Slate360",
};

export default async function DashboardPage() {
  const {
    user,
    orgId,
    orgName,
    tier,
  } = await resolveServerOrgContext();
  if (!user) redirect("/login");

  if (!orgId) {
    try {
      await ensureUserOrganization(user);
    } catch (error) {
      console.error("[dashboard] org bootstrap fallback failed", error);
    }
  }

  const entitlements = getEntitlements(tier);

  return (
    <WalledGardenDashboard
      userName={user.user_metadata?.name ?? user.email ?? ""}
      orgName={orgName ?? ""}
      storageLimitGb={entitlements.maxStorageGB}
    />
  );
}
