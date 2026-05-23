import { Suspense } from "react";
import { redirect } from "next/navigation";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { TooltipProvider } from "@/components/ui/tooltip";
import BuildRuntimeBadge from "@/components/shared/BuildRuntimeBadge";
import OverflowProbe from "@/components/shared/OverflowProbe";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { StudioAppShell } from "@/components/studio-ui/StudioAppShell";
import { buildInviteShareData } from "@/lib/server/invite-share-data";
import { isBetaMode } from "@/lib/beta-mode";

type DashboardRouteLayoutProps = {
  children: React.ReactNode;
};

export default async function DashboardRouteLayout({ children }: DashboardRouteLayoutProps) {
  const ctx = await resolveServerOrgContext();
  const { user, isBetaApproved, orgId, orgName, isSlateCeo, isSlateStaff } = ctx;
  if (!user) redirect("/login");
  if (!isBetaApproved) redirect("/beta-pending");

  const userName =
    (user.user_metadata?.name as string | undefined) ??
    user.email ??
    "";

  const inviteShareData = await buildInviteShareData(user, orgId);
  const isBetaEligible = isBetaMode() || isBetaApproved || isSlateCeo || isSlateStaff;
  void isBetaEligible;

  return (
    <NuqsAdapter>
      <TooltipProvider>
        <StudioAppShell
          userName={userName}
          workspaceName={orgName ?? "Slate360"}
          inviteShareData={inviteShareData}
        >
          {children}
        </StudioAppShell>
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
