import { notFound, redirect } from "next/navigation";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import CeoCommandCenterClient from "@/components/dashboard/CeoCommandCenterClient";

export const metadata = {
  title: "CEO Command Center — Slate360",
};

export default async function CeoPage() {
  const { user, tier, isSlateCeo, hasInternalAccess } = await resolveServerOrgContext();
  if (!user) redirect("/login");

  // CEO Command Center is a Slate360 platform-admin tab — NOT a subscription tier feature.
  // Access requires: slate360ceo@gmail.com OR an employee granted access via CEO tab (slate360_staff table).
  if (!hasInternalAccess) {
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
    />
  );
}
