import { resolveServerOrgContext } from "@/lib/server/org-context";
import { notFound, redirect } from "next/navigation";
import ClientPage from "./ClientPage";

export const metadata = {
  title: "Integrations Hub — Slate360",
};

export default async function IntegrationsHubServerPage() {
  const { user, tier, isSlateCeo, canAccessOperationsConsole } = await resolveServerOrgContext();

  if (!user) redirect("/login");
  // Not built yet + not linked from any nav. Keep the "In Development" stub out of the
  // app-review surface (App Store auto-rejects coming-soon/in-development UI) by gating
  // it to the CEO until it's a real feature.
  if (!isSlateCeo) notFound();

  return (
    <ClientPage
      user={{
        name: user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? "User",
        email: user.email ?? "",
        avatar: user.user_metadata?.avatar_url ?? undefined,
      }}
      tier={tier}
      isCeo={isSlateCeo}
      internalAccess={{ operationsConsole: canAccessOperationsConsole }}
    />
  );
}
