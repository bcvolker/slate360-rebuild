import { Suspense } from "react";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { TooltipProvider } from "@/components/ui/tooltip";
import BuildRuntimeBadge from "@/components/shared/BuildRuntimeBadge";
import OverflowProbe from "@/components/shared/OverflowProbe";

export default function DashboardV3Layout({ children }: { children: React.ReactNode }) {
  return (
    <NuqsAdapter>
      <TooltipProvider>
        {children}
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
