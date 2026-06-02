"use client";

import type { ReactNode } from "react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { InviteShareProvider, useInviteShare } from "@/components/shared/InviteShareProvider";
import type { InviteShareData } from "@/lib/types/invite";
import { MobileHeaderOverlays } from "./MobileHeaderOverlays";
import { MobileModalProvider } from "./MobileModalContext";
import { MobilePlatformBottomNav } from "./MobileBottomNav";
import { MobilePlatformHeader } from "./MobilePlatformHeader";
import { MobileShell } from "./MobileShell";
import {
  resolveMainMobileHeaderMeta,
  resolveMobileRoute,
} from "./mainMobileTabs";

const InviteShareModal = dynamic(
  () => import("@/components/shared/InviteShareModal").then((mod) => mod.InviteShareModal),
  { ssr: false },
);

/** Desktop routes that render page chrome without the mobile platform shell. */
export function shouldPassthroughDesktopShell(pathname: string): boolean {
  if (pathname === "/app") return true;
  if (
    pathname.startsWith("/projects") ||
    pathname.startsWith("/slatedrop") ||
    pathname.startsWith("/coordination") ||
    pathname.startsWith("/more") ||
    pathname.startsWith("/settings")
  ) {
    return true;
  }
  return false;
}

type MobilePlatformShellFrameProps = {
  inviteShareData: InviteShareData;
  children: ReactNode;
};

/** MobileShell + header + bottom nav + overlays. Requires InviteShareProvider ancestor. */
export function MobilePlatformShellFrame({
  inviteShareData,
  children,
}: MobilePlatformShellFrameProps) {
  const pathname = usePathname() ?? "";
  const headerMeta = resolveMainMobileHeaderMeta(pathname);
  const mobileRoute = resolveMobileRoute(pathname);
  const { open: inviteOpen, setOpen: setInviteOpen } = useInviteShare();

  return (
    <>
      <MobileShell
        mobileRoute={mobileRoute}
        header={
          <MobilePlatformHeader
            showBackToApp={headerMeta.showBackToApp}
            title={headerMeta.title}
            subtitle={headerMeta.subtitle}
            inviteShareData={inviteShareData}
          />
        }
        bottomNav={<MobilePlatformBottomNav />}
      >
        {children}
      </MobileShell>
      <MobileHeaderOverlays />
      {inviteOpen ? (
        <InviteShareModal
          open={inviteOpen}
          onOpenChange={setInviteOpen}
          {...inviteShareData}
        />
      ) : null}
    </>
  );
}

type MobilePlatformShellProps = {
  inviteShareData: InviteShareData;
  children: ReactNode;
  isMobileDevice?: boolean;
  /** When true, skip MobileShell on desktop for selected platform routes. */
  desktopPassthrough?: boolean;
};

function MobilePlatformShellInner({
  inviteShareData,
  children,
  isMobileDevice,
  desktopPassthrough,
}: MobilePlatformShellProps) {
  const pathname = usePathname() ?? "";

  if (desktopPassthrough && isMobileDevice === false && shouldPassthroughDesktopShell(pathname)) {
    return <>{children}</>;
  }

  return (
    <MobilePlatformShellFrame inviteShareData={inviteShareData}>
      {children}
    </MobilePlatformShellFrame>
  );
}

/** Authoritative platform shell for (mobile) hubs and platform nav surfaces. */
export function MobilePlatformShell({
  inviteShareData,
  children,
  isMobileDevice,
  desktopPassthrough = false,
}: MobilePlatformShellProps) {
  return (
    <InviteShareProvider inviteShareData={inviteShareData}>
      <MobileModalProvider>
        <MobilePlatformShellInner
          inviteShareData={inviteShareData}
          isMobileDevice={isMobileDevice}
          desktopPassthrough={desktopPassthrough}
        >
          {children}
        </MobilePlatformShellInner>
      </MobileModalProvider>
    </InviteShareProvider>
  );
}
