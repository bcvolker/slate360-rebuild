import { redirect } from "next/navigation";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import GeospatialShell from "@/components/dashboard/GeospatialShell";

export default async function GeospatialPage() {
  const { user, tier, isSlateCeo, canAccessCeo, canAccessMarket, canAccessAthlete360 } = await resolveServerOrgContext();
  if (!user) redirect("/login?redirectTo=/geospatial");

  return (
    <GeospatialShell
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
