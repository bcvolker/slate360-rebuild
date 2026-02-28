import { notFound, redirect } from "next/navigation";
import { getEntitlements } from "@/lib/entitlements";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import CeoCommandCenterClient from "@/components/dashboard/CeoCommandCenterClient";

export const metadata = {
  title: "CEO Command Center — Slate360",
};

export default async function CeoPage() {
  const { user, tier, isSlateCeo } = await resolveServerOrgContext();
  if (!user) redirect("/login");

  const entitlements = getEntitlements(tier);
  if (!entitlements.canAccessCeo && !isSlateCeo) {
    notFound();
  }

  return <CeoCommandCenterClient />;
}
