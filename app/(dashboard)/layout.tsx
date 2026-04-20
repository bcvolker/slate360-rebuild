import { Suspense } from "react";
import { redirect } from "next/navigation";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { TooltipProvider } from "@/components/ui/tooltip";
import BuildRuntimeBadge from "@/components/shared/BuildRuntimeBadge";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { AppShell } from "@/components/dashboard/AppShell";
import { buildInviteShareData } from "@/lib/server/invite-share-data";
import { isBetaMode } from "@/lib/beta-mode";

type DashboardRouteLayoutProps = {
  children: React.ReactNode;
};

export default async function DashboardRouteLayout({ children }: DashboardRouteLayoutProps) {
  const ctx = await resolveServerOrgContext();
  const { user, isBetaApproved, hasOperationsConsoleAccess, orgId, isSlateCeo, isSlateStaff } = ctx;
  if (!user) redirect("/login");
  if (!isBetaApproved) redirect("/beta-pending");

  const userName =
    (user.user_metadata?.name as string | undefined) ??
    user.email ??
    "";

  const inviteShareData = await buildInviteShareData(user, orgId);
  const isBetaEligible = isBetaMode() || isBetaApproved || isSlateCeo || isSlateStaff;

  return (
    <NuqsAdapter>
      <TooltipProvider>
        <AppShell
          userName={userName}
          hasOperationsConsoleAccess={hasOperationsConsoleAccess}
          inviteShareData={inviteShareData}
          isBetaEligible={isBetaEligible}
        >
          {children}
        </AppShell>
        <Suspense fallback={null}>
          <BuildRuntimeBadge />
        </Suspense>
      </TooltipProvider>
    </NuqsAdapter>
  );
}
