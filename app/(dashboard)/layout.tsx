import { Suspense } from "react";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { TooltipProvider } from "@/components/ui/tooltip";
import BuildRuntimeBadge from "@/components/shared/BuildRuntimeBadge";

type DashboardRouteLayoutProps = {
  children: React.ReactNode;
};

export default function DashboardRouteLayout({ children }: DashboardRouteLayoutProps) {
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
