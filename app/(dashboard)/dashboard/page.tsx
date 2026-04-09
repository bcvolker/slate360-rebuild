import { resolveServerOrgContext } from "@/lib/server/org-context";
import { redirect } from "next/navigation";
import WalledGardenDashboard from "@/components/walled-garden-dashboard";
import { ensureUserOrganization } from "@/lib/server/org-bootstrap";

export const metadata = {
  title: "Dashboard — Slate360",
};

export default async function DashboardPage() {
  const {
    user,
    orgId,
  } = await resolveServerOrgContext();
  if (!user) redirect("/login");

  if (!orgId) {
    try {
      await ensureUserOrganization(user);
    } catch (error) {
      console.error("[dashboard] org bootstrap fallback failed", error);
    }
  }

  return <WalledGardenDashboard />;
}
