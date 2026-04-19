import { Suspense } from "react";
import { redirect } from "next/navigation";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { TooltipProvider } from "@/components/ui/tooltip";
import BuildRuntimeBadge from "@/components/shared/BuildRuntimeBadge";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { AppShell } from "@/components/dashboard/AppShell";

type DashboardRouteLayoutProps = {
  children: React.ReactNode;
};

export default async function DashboardRouteLayout({ children }: DashboardRouteLayoutProps) {
  const { user, isBetaApproved, hasOperationsConsoleAccess } = await resolveServerOrgContext();
  if (!user) redirect("/login");
  if (!isBetaApproved) redirect("/beta-pending");

  const userName =
    (user.user_metadata?.name as string | undefined) ??
    user.email ??
    "";

  return (
    <NuqsAdapter>
      <TooltipProvider>
        <AppShell userName={userName} hasOperationsConsoleAccess={hasOperationsConsoleAccess}>
          {children}
        </AppShell>
        <Suspense fallback={null}>
          <BuildRuntimeBadge />
        </Suspense>
      </TooltipProvider>
    </NuqsAdapter>
  );
}
