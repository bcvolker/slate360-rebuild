import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { AppShell } from "@/components/dashboard/AppShell";
import { buildInviteShareData } from "@/lib/server/invite-share-data";
import { isBetaMode } from "@/lib/beta-mode";

/**
 * AuthedAppShell — server component that fetches user/org context and
 * wraps children in the shared AppShell (sidebar + topbar).
 *
 * Use this in any top-level authenticated route layout where the user
 * should see the standard navigation chrome.
 */
export default async function AuthedAppShell({ children }: { children: ReactNode }) {
  const ctx = await resolveServerOrgContext();
  if (!ctx.user) redirect("/login");

  const userName =
    (ctx.user.user_metadata?.name as string | undefined) ??
    ctx.user.email ??
    "";

  const inviteShareData = await buildInviteShareData(ctx.user, ctx.orgId);
  const isBetaEligible = isBetaMode() || ctx.isBetaApproved || ctx.isSlateCeo || ctx.isSlateStaff;

  return (
    <AppShell
      userName={userName}
      hasOperationsConsoleAccess={ctx.hasOperationsConsoleAccess}
      inviteShareData={inviteShareData}
      isBetaEligible={isBetaEligible}
    >
      {children}
    </AppShell>
  );
}
