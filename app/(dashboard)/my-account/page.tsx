import { redirect } from "next/navigation";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import MyAccountShell from "@/components/dashboard/MyAccountShell";

export default async function MyAccountPage() {
  const { user, tier } = await resolveServerOrgContext();
  if (!user) redirect("/login?redirectTo=/my-account");

  return (
    <MyAccountShell
      user={{
        name: user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? "User",
        email: user.email ?? "",
        avatar: user.user_metadata?.avatar_url ?? undefined,
      }}
      tier={tier}
    />
  );
}
