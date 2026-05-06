import { redirect } from "next/navigation";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { AccountSettingsClient } from "@/components/settings/AccountSettingsClient";

export default async function SettingsPage() {
  const ctx = await resolveServerOrgContext();

  if (!ctx.user) redirect("/login?redirectTo=/settings");

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 pb-24 text-slate-50 sm:px-6 lg:px-8">
      <header className="mb-5">
        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-amber-400">Settings</p>
        <h1 className="mt-1 text-2xl font-black text-white">Account workspace</h1>
      </header>
      <AccountSettingsClient
        email={ctx.user.email ?? ""}
        tier={ctx.tier}
        orgName={ctx.orgName}
      />
    </main>
  );
}
