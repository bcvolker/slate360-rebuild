import { resolveServerOrgContext } from "@/lib/server/org-context";
import { redirect } from "next/navigation";
import DashboardClient from "@/components/dashboard/DashboardClient";

export const metadata = {
  title: "Dashboard — Slate360",
};

export default async function DashboardPage() {
  const { user, tier } = await resolveServerOrgContext();
  if (!user) redirect("/login");

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
    />
  );
}
