/**
 * MobileActionGrid — 2-column grid wrapper for MobileActionCard instances.
 *
 * Server-safe: no client state or event handlers.
 * Used by /app and /site-walk action grids.
 *
 * Slice 1: component created only. No consumers changed yet.
 */

import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface MobileActionGridProps {
  children: ReactNode;
  className?: string;
  "data-testid"?: string;
}

export function MobileActionGrid({
  children,
  className,
  "data-testid": dataTestId,
}: MobileActionGridProps) {
  return (
    <div data-testid={dataTestId} className={cn("grid grid-cols-2 gap-3", className)}>
      {children}
    </div>
  );
}
