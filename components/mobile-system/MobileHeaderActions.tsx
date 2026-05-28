"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Bell, Bug, QrCode, User } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { BetaFeedbackModal } from "@/components/shared/BetaFeedbackModal";
import { useInviteShare, useInviteShareData } from "@/components/shared/InviteShareProvider";
import { cn } from "@/lib/utils";
import { mobileTokens } from "./mobileTokens";
import type { InviteShareData } from "@/lib/types/invite";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://slate360.ai";

type MobileHeaderActionsProps = {
  inviteShareData?: InviteShareData;
  className?: string;
};

export function MobileHeaderActions({ inviteShareData: inviteShareDataProp, className }: MobileHeaderActionsProps) {
  const inviteShareDataFromContext = useInviteShareData();
  const inviteShareData = inviteShareDataProp ?? inviteShareDataFromContext;
  const { setOpen: openInviteShare } = useInviteShare();
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const qrAnchorRef = useRef<HTMLDivElement>(null);

  const inviteLink = inviteShareData
    ? `${APP_URL}/signup?ref=${encodeURIComponent(inviteShareData.userId)}&launch=1`
    : null;
  const iconButtonClass = cn(mobileTokens.mobileHeaderIconButton, mobileTokens.focusRing);

  return (
    <>
      <div className={cn(mobileTokens.mobileHeaderActionsRow, className)}>
        <Link href="/more/account" className={iconButtonClass} aria-label="Account settings">
          <User className={mobileTokens.mobileHeaderIconSize} strokeWidth={1.75} />
        </Link>

        <Link href="/coordination/inbox" className={iconButtonClass} aria-label="Notifications and alerts">
          <Bell className={mobileTokens.mobileHeaderIconSize} strokeWidth={1.75} />
        </Link>

        <button
          type="button"
          className={iconButtonClass}
          aria-label="Report a bug or suggest a feature"
          onClick={() => setFeedbackOpen(true)}
        >
          <Bug className={mobileTokens.mobileHeaderIconSize} strokeWidth={1.75} />
        </button>

        <div ref={qrAnchorRef} className="relative">
          <button
            type="button"
            className={iconButtonClass}
            aria-label="Share project invite QR code"
            aria-expanded={qrOpen}
            disabled={!inviteLink}
            onClick={() => {
              if (!inviteLink) {
                openInviteShare(true);
                return;
              }
              setQrOpen((open) => !open);
            }}
          >
            <QrCode className={mobileTokens.mobileHeaderIconSize} strokeWidth={1.75} />
          </button>

          {qrOpen && inviteLink ? (
            <>
              <button
                type="button"
                className="fixed inset-0 z-40"
                aria-label="Close QR share popover"
                onClick={() => setQrOpen(false)}
              />
              <div
                role="dialog"
                aria-label="Invite QR code"
                className={mobileTokens.mobileHeaderPopover}
              >
                <p className={mobileTokens.mobileHeaderPopoverLabel}>Field invite QR</p>
                <div className="mt-3 flex justify-center rounded-xl border border-white/[0.06] bg-white p-3">
                  <QRCodeSVG value={inviteLink} size={168} level="M" includeMargin={false} />
                </div>
                <p className={mobileTokens.mobileHeaderPopoverSubtext}>
                  Scan or share to sync project contacts on-site.
                </p>
                <button
                  type="button"
                  className={cn(mobileTokens.mobileHeaderPopoverCta, mobileTokens.focusRing)}
                  onClick={() => {
                    setQrOpen(false);
                    openInviteShare(true);
                  }}
                >
                  Open share options
                </button>
              </div>
            </>
          ) : null}
        </div>
      </div>

      <BetaFeedbackModal open={feedbackOpen} onOpenChange={setFeedbackOpen} />
    </>
  );
}
