import { Suspense } from "react";
import { redirect } from "next/navigation";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { TooltipProvider } from "@/components/ui/tooltip";
import BuildRuntimeBadge from "@/components/shared/BuildRuntimeBadge";
import OverflowProbe from "@/components/shared/OverflowProbe";
import { DashboardDesktopShell } from "@/components/dashboard-desktop/DashboardDesktopShell";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { StudioAppShell } from "@/components/studio-ui/StudioAppShell";
import { buildInviteShareData } from "@/lib/server/invite-share-data";
import { isMobileServerLayout } from "@/lib/server/device-layout";
import { isBetaMode } from "@/lib/beta-mode";

type DashboardRouteLayoutProps = {
  children: React.ReactNode;
};

export default async function DashboardRouteLayout({ children }: DashboardRouteLayoutProps) {
  const isMobile = await isMobileServerLayout();
  const ctx = await resolveServerOrgContext();
  const { user, isBetaApproved, orgId, orgName, isSlateCeo, isSlateStaff, canAccessOperationsConsole } = ctx;
  if (!user) redirect("/login");
  if (!isBetaApproved) redirect("/beta-pending");

  const userName =
    (user.user_metadata?.name as string | undefined) ??
    user.email ??
    "";

  const inviteShareData = await buildInviteShareData(user, orgId);
  const isBetaEligible = isBetaMode() || isBetaApproved || isSlateCeo || isSlateStaff;
  void isBetaEligible;

  const chrome = isMobile ? (
    <StudioAppShell
      userName={userName}
      workspaceName={orgName ?? "Slate360"}
      inviteShareData={inviteShareData}
    >
      {children}
    </StudioAppShell>
  ) : (
    <DashboardDesktopShell
      userName={userName}
      workspaceName={orgName ?? "Slate360"}
      inviteShareData={inviteShareData}
      showOpsConsole={Boolean(canAccessOperationsConsole)}
      isCeo={Boolean(isSlateCeo)}
    >
      {children}
    </DashboardDesktopShell>
  );

  return (
    <NuqsAdapter>
      <TooltipProvider>
        {chrome}
        <Suspense fallback={null}>
          <BuildRuntimeBadge />
        </Suspense>
        <Suspense fallback={null}>
          <OverflowProbe />
        </Suspense>
      </TooltipProvider>
    </NuqsAdapter>
  );
}
