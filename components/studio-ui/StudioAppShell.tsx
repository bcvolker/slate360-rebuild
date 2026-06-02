"use client";

import type { ReactNode } from "react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import {
  MobileHeaderOverlays,
  MobileModalProvider,
  MobilePlatformShellFrame,
} from "@/components/mobile-system";
import { InviteShareProvider, useInviteShare } from "@/components/shared/InviteShareProvider";
import { isSiteWalkPassthroughShellPath } from "@/lib/site-walk/site-walk-shell-paths";
import {
  isDigitalTwinPassthroughShellPath,
  isDigitalTwinPlatformBypassPath,
} from "@/lib/digital-twin/digital-twin-shell-paths";
import type { InviteShareData } from "@/lib/types/invite";

/** Site Walk sub-routes keep their own chrome; module home uses (mobile)/MobilePlatformShell. */
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
  const { open: inviteOpen, setOpen: setInviteOpen } = useInviteShare();

  if (fullBleed) {
    return (
      <>
        <div className="fixed inset-0 h-[100dvh] w-full overflow-hidden bg-[#0B0F15]">
          {children}
        </div>
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

  return (
    <MobilePlatformShellFrame inviteShareData={inviteShareData}>
      {children}
    </MobilePlatformShellFrame>
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
