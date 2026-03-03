import { notFound, redirect } from "next/navigation";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import CeoCommandCenterClient from "@/components/dashboard/CeoCommandCenterClient";

export const metadata = {
  title: "CEO Command Center — Slate360",
};

export default async function CeoPage() {
  const { user, tier, isSlateCeo } = await resolveServerOrgContext();
  if (!user) redirect("/login");

  // CEO Command Center is a platform-admin tab — NOT gated by subscription tier.
  // Access requires isSlateCeo (slate360ceo@gmail.com) or future slate360_staff grants.
  if (!isSlateCeo) {
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
    />
  );
}
