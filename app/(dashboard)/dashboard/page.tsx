import { resolveServerOrgContext } from "@/lib/server/org-context";
import { redirect } from "next/navigation";
import DashboardClient from "@/components/dashboard/DashboardClient";
import { ensureUserOrganization } from "@/lib/server/org-bootstrap";

export const metadata = {
  title: "Dashboard — Slate360",
};

export default async function DashboardPage() {
  let {
    user,
    tier,
    orgId,
    isSlateCeo,
    isSlateStaff,
    canAccessCeo,
    canAccessMarket,
    canAccessAthlete360,
  } = await resolveServerOrgContext();
  if (!user) redirect("/login");

  if (!orgId) {
    try {
      await ensureUserOrganization(user);
      // Re-resolve so the page renders with the freshly-created org context
      const fresh = await resolveServerOrgContext();
      tier = fresh.tier;
      orgId = fresh.orgId;
      isSlateCeo = fresh.isSlateCeo;
      isSlateStaff = fresh.isSlateStaff;
      canAccessCeo = fresh.canAccessCeo;
      canAccessMarket = fresh.canAccessMarket;
      canAccessAthlete360 = fresh.canAccessAthlete360;
    } catch (error) {
      console.error("[dashboard] org bootstrap fallback failed", error);
    }
  }

  return (
    <DashboardClient
      user={{
        name:
          user.user_metadata?.full_name ??
          user.email?.split("@")[0] ??
          "User",
        email: user.email ?? "",
        avatar: user.user_metadata?.avatar_url ?? undefined,
      }}
      tier={tier}
      isSlateCeo={isSlateCeo}
      isSlateStaff={isSlateStaff}
      canAccessCeo={canAccessCeo}
      canAccessMarket={canAccessMarket}
      canAccessAthlete360={canAccessAthlete360}
    />
  );
}
