import { redirect } from "next/navigation";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { AccountSettingsClient } from "@/components/settings/AccountSettingsClient";

export default async function SettingsPage() {
  const ctx = await resolveServerOrgContext();

  if (!ctx.user) redirect("/login?redirectTo=/settings");

  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="mb-6 text-2xl font-bold">Settings</h1>
      <AccountSettingsClient
        email={ctx.user.email ?? ""}
        tier={ctx.tier}
        orgName={ctx.orgName}
      />
    </main>
  );
}
