import { redirect } from "next/navigation";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { getEntitlements } from "@/lib/entitlements";
import PlansClient from "@/components/dashboard/plans/PlansClient";

export const metadata = { title: "Plans & Pricing — Slate360" };

export default async function PlansPage() {
  const ctx = await resolveServerOrgContext();
  if (!ctx.user) redirect("/login?redirectTo=/plans");

  const ent = getEntitlements(ctx.tier, { isSlateCeo: ctx.isSlateCeo });

  return (
    <PlansClient
      currentTier={ctx.tier}
      currentLabel={ent.label}
      isAdmin={ctx.isAdmin}
    />
  );
}
