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
import { isSiteWalkPassthroughShellPath } from "@/lib/site-walk/site-walk-shell-paths";
import {
  isDigitalTwinPassthroughShellPath,
  isDigitalTwinPlatformBypassPath,
} from "@/lib/digital-twin/digital-twin-shell-paths";
import type { InviteShareData } from "@/lib/types/invite";

/** Site Walk sub-routes and task surfaces keep their own chrome; home stays in platform shell. */
function isSiteWalkPlatformBypassPath(pathname: string): boolean {
  if (pathname === "/site-walk") return false;
  return pathname.startsWith("/site-walk/");
}

const InviteShareModal = dynamic(
  () => import("@/components/shared/InviteShareModal").then((mod) => mod.InviteShareModal),
  { ssr: false },
);

type StudioAppShellProps = {
  userName: string;
  workspaceName?: string | null;
  inviteShareData: InviteShareData;
  children: ReactNode;
};

function StudioAppShellInner({ inviteShareData, children }: StudioAppShellProps) {
  const pathname = usePathname() ?? "";
  const fullBleed =
    isSiteWalkPlatformBypassPath(pathname) ||
    isSiteWalkPassthroughShellPath(pathname) ||
    isDigitalTwinPlatformBypassPath(pathname) ||
    isDigitalTwinPassthroughShellPath(pathname);
  const isModuleHome = pathname === "/site-walk" || pathname === "/digital-twin";
  const mobileRoute = pathname.startsWith("/site-walk")
    ? "site-walk"
    : pathname.startsWith("/digital-twin")
      ? "digital-twin"
      : "app";
  const { open: inviteOpen, setOpen: setInviteOpen } = useInviteShare();

  const content = fullBleed ? (
    <div className="fixed inset-0 h-[100dvh] w-full overflow-hidden bg-[#0B0F15]">{children}</div>
  ) : (
    <MobileShell
      mobileRoute={mobileRoute}
      header={<MobilePlatformHeader showBackToApp={isModuleHome} inviteShareData={inviteShareData} />}
      bottomNav={<MobilePlatformBottomNav />}
    >
      {children}
    </MobileShell>
  );

  return (
    <>
      {content}
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

export function StudioAppShell(props: StudioAppShellProps) {
  return (
    <InviteShareProvider inviteShareData={props.inviteShareData}>
      <MobileModalProvider>
        <StudioAppShellInner {...props} />
      </MobileModalProvider>
    </InviteShareProvider>
  );
}
