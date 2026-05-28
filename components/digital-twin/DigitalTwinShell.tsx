"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { MobileAppShell, MobilePlatformHeader } from "@/components/mobile-system";
import { isDigitalTwinPassthroughShellPath } from "@/lib/digital-twin/digital-twin-shell-paths";
import { resolveDigitalTwinRouteTitle } from "./DigitalTwinModuleNav";

/**
 * Digital Twin sub-route shell — mobile viewport for capture, upload, twins, and more.
 *
 * Uses the same MobileAppShell contract as module home:
 * fixed full viewport, internal scroll only, safe-area aware padding in pages.
 */
export function DigitalTwinShell({
  children,
  orgName,
}: {
  children: ReactNode;
  orgName?: string | null;
}) {
  const pathname = usePathname() ?? "";

  if (isDigitalTwinPassthroughShellPath(pathname)) {
    return (
      <div className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-[#0B0F15]">
        {children}
      </div>
    );
  }

  return (
    <MobileAppShell
      className="fixed inset-0 z-50"
      mobileRoute="digital-twin"
      header={
        <MobilePlatformHeader
          backHref="/digital-twin"
          title={resolveDigitalTwinRouteTitle(pathname)}
          subtitle={orgName ?? "Reality capture workspace"}
        />
      }
      mainClassName="min-h-0"
    >
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
    </MobileAppShell>
  );
}
