"use client";

import Link from "next/link";
import { Bell, Bug, QrCode, User } from "lucide-react";
import { useInviteShare, useInviteShareData } from "@/components/shared/InviteShareProvider";
import { cn } from "@/lib/utils";
import { useMobileModal } from "./MobileModalContext";
import { mobileTokens } from "./mobileTokens";
import type { InviteShareData } from "@/lib/types/invite";

type MobileHeaderActionsProps = {
  inviteShareData?: InviteShareData;
  className?: string;
};

/**
 * Header icon cluster — visual order left-to-right: Share/QR → Bug → Bell → Profile.
 * Modals render via MobileHeaderOverlays at shell level (MobileModalContext).
 */
export function MobileHeaderActions({ inviteShareData: inviteShareDataProp, className }: MobileHeaderActionsProps) {
  const inviteShareDataFromContext = useInviteShareData();
  const inviteShareData = inviteShareDataProp ?? inviteShareDataFromContext;
  const { setOpen: openInviteShare } = useInviteShare();
  const { openFeedback, toggleQr } = useMobileModal();

  const iconButtonClass = cn(mobileTokens.mobileHeaderIconButton, mobileTokens.focusRing);

  return (
    <div className={cn(mobileTokens.mobileHeaderActionsRow, className)}>
      <button
        type="button"
        className={iconButtonClass}
        aria-label="Share project invite QR code"
        onClick={() => {
          if (!inviteShareData) {
            openInviteShare(true);
            return;
          }
          toggleQr();
        }}
      >
        <QrCode className={mobileTokens.mobileHeaderIconSize} strokeWidth={1.75} />
      </button>

      <button
        type="button"
        className={iconButtonClass}
        aria-label="Report a bug or suggest a feature"
        onClick={openFeedback}
      >
        <Bug className={mobileTokens.mobileHeaderIconSize} strokeWidth={1.75} />
      </button>

      <Link href="/coordination/inbox" className={iconButtonClass} aria-label="Notifications and alerts">
        <Bell className={mobileTokens.mobileHeaderIconSize} strokeWidth={1.75} />
      </Link>

      <Link href="/more/account" className={iconButtonClass} aria-label="Account settings">
        <User className={mobileTokens.mobileHeaderIconSize} strokeWidth={1.75} />
      </Link>
    </div>
  );
}
