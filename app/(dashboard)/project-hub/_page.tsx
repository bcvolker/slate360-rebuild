import { resolveServerOrgContext } from "@/lib/server/org-context";
import { redirect } from "next/navigation";
import ClientPage from "./ClientPage";

export const metadata = {
  title: "Project Hub — Slate360",
};

export default async function ProjectHubServerPage() {
  const { user, tier, isSlateCeo, canAccessCeo, canAccessMarket, canAccessAthlete360 } = await resolveServerOrgContext();

  if (!user) redirect("/login");

  return (
    <ClientPage
      user={{
        name: user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? "User",
        email: user.email ?? "",
        avatar: user.user_metadata?.avatar_url ?? undefined,
      }}
      tier={tier}
      isCeo={isSlateCeo}
      internalAccess={{ ceo: canAccessCeo, market: canAccessMarket, athlete360: canAccessAthlete360 }}
    />
  );
}
