import { Suspense } from "react";
import { redirect } from "next/navigation";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { TooltipProvider } from "@/components/ui/tooltip";
import BuildRuntimeBadge from "@/components/shared/BuildRuntimeBadge";
import { resolveServerOrgContext } from "@/lib/server/org-context";

type DashboardRouteLayoutProps = {
  children: React.ReactNode;
};

export default async function DashboardRouteLayout({ children }: DashboardRouteLayoutProps) {
  // Uses cached resolveServerOrgContext — pages nested under this layout
  // that also call resolveServerOrgContext() will get a cache hit (zero
  // duplicate DB queries).
  const { user, isBetaApproved } = await resolveServerOrgContext();
  if (!user) redirect("/login");
  if (!isBetaApproved) redirect("/beta-pending");
  return (
    <NuqsAdapter>
      <TooltipProvider>
        {children}
        <Suspense fallback={null}>
          <BuildRuntimeBadge />
        </Suspense>
      </TooltipProvider>
    </NuqsAdapter>
  );
}
