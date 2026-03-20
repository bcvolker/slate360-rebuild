import { notFound, redirect } from "next/navigation";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import MarketClient from "@/components/dashboard/market/MarketClient";
import MarketRouteShell from "@/components/dashboard/market/MarketRouteShell";
import MarketProviders from "./MarketProviders";

export const metadata = {
  title: "Market Robot — Slate360",
};

export default async function MarketPage() {
  const { user, tier, isSlateCeo, canAccessCeo, canAccessMarket, canAccessAthlete360 } = await resolveServerOrgContext();

  if (!user) redirect("/login");

  if (!canAccessMarket) {
    notFound();
  }

  return (
    <MarketProviders>
      <MarketRouteShell
        user={{
          name: user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? "User",
          email: user.email ?? "",
          avatar: user.user_metadata?.avatar_url,
        }}
        tier={tier}
        isCeo={isSlateCeo}
        internalAccess={{ ceo: canAccessCeo, market: canAccessMarket, athlete360: canAccessAthlete360 }}
      >
        <MarketClient />
      </MarketRouteShell>
    </MarketProviders>
  );
}
