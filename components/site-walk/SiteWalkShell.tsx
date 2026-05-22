"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { MobileAppShell } from "@/components/mobile-system";
import { isSiteWalkPassthroughShellPath } from "@/lib/site-walk/site-walk-shell-paths";
import { SiteWalkSubRouteHeader } from "./SiteWalkModuleNav";

/**
 * Site Walk sub-route shell — mobile app viewport for setup, walks, outputs, and more.
 *
 * Uses the same MobileAppShell contract as SiteWalkV1Shell on `/site-walk` home:
 * fixed full viewport, internal scroll only, safe-area aware bottom padding in pages.
 *
 * Capture routes overlay this shell with their own fixed task layout (unchanged).
 */
export function SiteWalkShell({
  children,
  orgName,
}: {
  children: ReactNode;
  userInitials?: string;
  orgName?: string | null;
}) {
  const pathname = usePathname() ?? "";

  if (isSiteWalkPassthroughShellPath(pathname)) {
    return (
      <div className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-[#0B0F15]">
        {children}
      </div>
    );
  }

  return (
    <MobileAppShell
      className="fixed inset-0 z-50"
      mobileRoute="site-walk"
      header={<SiteWalkSubRouteHeader orgName={orgName} />}
      mainClassName="min-h-0"
    >
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
    </MobileAppShell>
  );
}
