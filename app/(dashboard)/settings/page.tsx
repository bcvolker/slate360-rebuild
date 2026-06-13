import { redirect } from "next/navigation";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { AccountSettingsClient } from "@/components/settings/AccountSettingsClient";
import { settingsTokens } from "@/components/settings/settings-tokens";

export default async function SettingsPage() {
  const ctx = await resolveServerOrgContext();

  if (!ctx.user) redirect("/login?redirectTo=/settings");

  const userName =
    (ctx.user.user_metadata?.full_name as string | undefined) ??
    (ctx.user.user_metadata?.name as string | undefined) ??
    ctx.user.email?.split("@")[0] ??
    "User";

  return (
    <main className={settingsTokens.pageScroll}>
      <header className="shrink-0 px-0.5">
        <p className={settingsTokens.eyebrow}>Settings</p>
        <h1 className={settingsTokens.title}>My account</h1>
        <p className={settingsTokens.subtitle}>
          Profile, security, notifications, organization branding, billing, team, and account deletion.
        </p>
      </header>
      <AccountSettingsClient
        email={ctx.user.email ?? ""}
        orgName={ctx.orgName}
        orgId={ctx.orgId}
        role={ctx.role ?? "member"}
        userId={ctx.user.id}
        userName={userName}
        avatarUrl={(ctx.user.user_metadata?.avatar_url as string | undefined) ?? null}
        isAdmin={ctx.isAdmin}
        isSlateCeo={ctx.isSlateCeo}
        canEditOrg={ctx.canEditOrg}
      />
    </main>
  );
}
