import { notFound, redirect } from "next/navigation";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import MarketClient from "@/components/dashboard/MarketClient";
import MarketRouteShell from "@/components/dashboard/market/MarketRouteShell";
import MarketProviders from "./MarketProviders";

export const metadata = {
  title: "Market Robot — Slate360",
};

export default async function MarketPage() {
  const { user, tier, hasInternalAccess } = await resolveServerOrgContext();

  if (!user) redirect("/login");

  if (!hasInternalAccess) {
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
        isCeo={hasInternalAccess}
      >
        <MarketClient />
      </MarketRouteShell>
    </MarketProviders>
  );
}
