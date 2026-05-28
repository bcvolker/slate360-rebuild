"use client";

import type { ReactNode } from "react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import {
  MobileHeaderOverlays,
  MobileModalProvider,
  MobilePlatformBottomNav,
  MobilePlatformHeader,
  MobileShell,
} from "@/components/mobile-system";
import { InviteShareProvider, useInviteShare } from "@/components/shared/InviteShareProvider";
import type { InviteShareData } from "@/lib/types/invite";

const InviteShareModal = dynamic(
  () => import("@/components/shared/InviteShareModal").then((mod) => mod.InviteShareModal),
  { ssr: false },
);

type MobilePlatformLayoutProps = {
  inviteShareData: InviteShareData;
  isMobileDevice: boolean;
  children: ReactNode;
};

function MobilePlatformLayoutInner({
  inviteShareData,
  isMobileDevice,
  children,
}: MobilePlatformLayoutProps) {
  const pathname = usePathname() ?? "";
  const isModuleHome = pathname === "/site-walk" || pathname === "/digital-twin";
  const mobileRoute = pathname.startsWith("/site-walk")
    ? "site-walk"
    : pathname.startsWith("/digital-twin")
      ? "digital-twin"
      : "app";
  const { open: inviteOpen, setOpen: setInviteOpen } = useInviteShare();

  if (!isMobileDevice && pathname === "/app") {
    return <>{children}</>;
  }

  return (
    <>
      <MobileShell
        mobileRoute={mobileRoute}
        header={
          <MobilePlatformHeader
            showBackToApp={isModuleHome}
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

/** Clean mobile platform shell for /app, /site-walk, and /digital-twin home surfaces. */
export function MobilePlatformLayout({
  inviteShareData,
  isMobileDevice,
  children,
}: MobilePlatformLayoutProps) {
  return (
    <InviteShareProvider inviteShareData={inviteShareData}>
      <MobileModalProvider>
        <MobilePlatformLayoutInner
          inviteShareData={inviteShareData}
          isMobileDevice={isMobileDevice}
        >
          {children}
        </MobilePlatformLayoutInner>
      </MobileModalProvider>
    </InviteShareProvider>
  );
}
