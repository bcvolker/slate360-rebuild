import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { AppShell } from "@/components/dashboard/AppShell";

/**
 * AuthedAppShell — server component that fetches user/org context and
 * wraps children in the shared AppShell (sidebar + topbar).
 *
 * Use this in any top-level authenticated route layout where the user
 * should see the standard navigation chrome.
 */
export default async function AuthedAppShell({ children }: { children: ReactNode }) {
  const { user, hasOperationsConsoleAccess } = await resolveServerOrgContext();
  if (!user) redirect("/login");

  const userName =
    (user.user_metadata?.name as string | undefined) ??
    user.email ??
    "";

  return (
    <AppShell userName={userName} hasOperationsConsoleAccess={hasOperationsConsoleAccess}>
      {children}
    </AppShell>
  );
}
