import { redirect } from "next/navigation";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { getEntitlements } from "@/lib/entitlements";
import MyAccountShell from "@/components/dashboard/MyAccountShell";

export const metadata = { title: "My Account — Slate360" };

export default async function MyAccountPage() {
  const ctx = await resolveServerOrgContext();
  if (!ctx.user) redirect("/login?redirectTo=/my-account");

  const ent = getEntitlements(ctx.tier, { isSlateCeo: ctx.isSlateCeo });

  return (
    <MyAccountShell
      user={{
        id: ctx.user.id,
        name: ctx.user.user_metadata?.full_name ?? ctx.user.email?.split("@")[0] ?? "User",
        email: ctx.user.email ?? "",
        avatar: ctx.user.user_metadata?.avatar_url ?? undefined,
      }}
      orgName={ctx.orgName ?? ""}
      tier={ctx.tier}
      role={ctx.role ?? "member"}
      isAdmin={ctx.isAdmin}
      isCeo={ctx.isSlateCeo}
      entitlements={{
        label: ent.label,
        maxCredits: ent.maxCredits,
        maxStorageGB: ent.maxStorageGB,
        maxSeats: ent.maxSeats,
        canManageSeats: ent.canManageSeats,
      }}
      internalAccess={{ ceo: ctx.canAccessCeo, market: ctx.canAccessMarket, athlete360: ctx.canAccessAthlete360 }}
    />
  );
}
