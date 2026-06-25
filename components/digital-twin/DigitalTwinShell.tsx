"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import {
  MobileAppShell,
  MobilePlatformBottomNav,
  MobilePlatformHeader,
} from "@/components/mobile-system";
import {
  DIGITAL_TWIN_MOBILE_ROUTE,
  isDigitalTwinPassthroughShellPath,
} from "@/lib/digital-twin/digital-twin-shell-paths";
import { resolveDigitalTwinRouteTitle } from "./DigitalTwinModuleNav";

/** Digital Twin sub-route shell — mobile viewport for capture, upload, twins, and more. */
export function DigitalTwinShell({
  children,
  orgName,
}: {
  children: ReactNode;
  orgName?: string | null;
}) {
  const pathname = usePathname() ?? "";

  if (isDigitalTwinPassthroughShellPath(pathname)) {
    // Flex propagation only — do NOT nest a second `fixed inset-0 h-[100dvh]` inside
    // StudioAppShell's full-bleed wrapper. iOS WKWebView offsets nested fixed+dvh
    // shells below the status bar while env(safe-area-inset-*) still applies inside.
    return (
      <div
        data-mobile-route={DIGITAL_TWIN_MOBILE_ROUTE}
        className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-[var(--graphite-canvas)]"
      >
        {children}
      </div>
    );
  }

  return (
    <MobileAppShell
      className="fixed inset-0 z-50"
      mobileRoute={DIGITAL_TWIN_MOBILE_ROUTE}
      header={
        <MobilePlatformHeader
          backHref="/digital-twin"
          title={resolveDigitalTwinRouteTitle(pathname)}
          subtitle={orgName ?? "Reality capture workspace"}
        />
      }
      bottomNav={<MobilePlatformBottomNav />}
      mainClassName="min-h-0"
    >
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
    </MobileAppShell>
  );
}
