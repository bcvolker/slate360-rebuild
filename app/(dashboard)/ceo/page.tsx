import { notFound, redirect } from "next/navigation";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import CeoCommandCenterClient from "@/components/dashboard/CeoCommandCenterClient";

export const metadata = {
  title: "CEO Command Center — Slate360",
};

export default async function CeoPage() {
  const { user, tier, isSlateCeo, canAccessCeo, canAccessMarket, canAccessAthlete360 } = await resolveServerOrgContext();
  if (!user) redirect("/login");

  // CEO Command Center is a Slate360 platform-admin tab — NOT a subscription tier feature.
  // Access remains exclusive to the owner account: slate360ceo@gmail.com.
  if (!canAccessCeo) {
    notFound();
  }

  return (
    <CeoCommandCenterClient
      user={{
        name: user.user_metadata?.full_name ?? user.email ?? "User",
        email: user.email ?? "",
        avatar: user.user_metadata?.avatar_url,
      }}
      tier={tier}
      isCeo={isSlateCeo}
      internalAccess={{ ceo: canAccessCeo, market: canAccessMarket, athlete360: canAccessAthlete360 }}
    />
  );
}
