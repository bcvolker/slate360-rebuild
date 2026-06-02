import type { ReactNode } from "react";
import { MobilePlatformShell } from "@/components/mobile-system/MobilePlatformShell";
import type { InviteShareData } from "@/lib/types/invite";

type MobilePlatformLayoutProps = {
  inviteShareData: InviteShareData;
  isMobileDevice: boolean;
  children: ReactNode;
};

/** Server layout boundary for the (mobile) route group — delegates to MobilePlatformShell. */
export function MobilePlatformLayout({
  inviteShareData,
  isMobileDevice,
  children,
}: MobilePlatformLayoutProps) {
  return (
    <MobilePlatformShell
      inviteShareData={inviteShareData}
      isMobileDevice={isMobileDevice}
      desktopPassthrough
    >
      {children}
    </MobilePlatformShell>
  );
}
