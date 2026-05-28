"use client";

import { createPortal } from "react-dom";
import { QRCodeSVG } from "qrcode.react";
import { BetaFeedbackModal } from "@/components/shared/BetaFeedbackModal";
import { useInviteShare, useInviteShareData } from "@/components/shared/InviteShareProvider";
import { cn } from "@/lib/utils";
import { useMobileModal } from "./MobileModalContext";
import { mobileTokens } from "./mobileTokens";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://slate360.ai";

/** Shell-level overlays for header actions — rendered outside header stacking context. */
export function MobileHeaderOverlays() {
  const { feedbackOpen, closeFeedback, qrOpen, closeQr } = useMobileModal();
  const inviteShareData = useInviteShareData();
  const { setOpen: openInviteShare } = useInviteShare();

  const inviteLink = inviteShareData
    ? `${APP_URL}/signup?ref=${encodeURIComponent(inviteShareData.userId)}&launch=1`
    : null;

  return (
    <>
      <BetaFeedbackModal open={feedbackOpen} onOpenChange={(open) => !open && closeFeedback()} />

      {qrOpen && typeof document !== "undefined"
        ? createPortal(
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Invite QR code"
              className={mobileTokens.mobileModalOverlay}
              onClick={(event) => event.target === event.currentTarget && closeQr()}
            >
              <div className={mobileTokens.mobileModalPanel}>
                <p className={mobileTokens.mobileHeaderPopoverLabel}>Field invite QR</p>
                {inviteLink ? (
                  <div className="mt-3 flex justify-center rounded-xl border border-white/[0.06] bg-white p-3">
                    <QRCodeSVG value={inviteLink} size={168} level="M" includeMargin={false} />
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-zinc-300">Share options are available for signed-in accounts.</p>
                )}
                <p className={mobileTokens.mobileHeaderPopoverSubtext}>
                  Scan or share to sync project contacts on-site.
                </p>
                <button
                  type="button"
                  className={cn(mobileTokens.mobileHeaderPopoverCta, mobileTokens.focusRing)}
                  onClick={() => {
                    closeQr();
                    openInviteShare(true);
                  }}
                >
                  Open share options
                </button>
                <button
                  type="button"
                  className={cn(
                    "mt-2 flex h-10 w-full items-center justify-center rounded-xl text-sm font-medium text-zinc-400 transition-colors hover:bg-white/[0.05] hover:text-zinc-200",
                    mobileTokens.focusRing,
                  )}
                  onClick={closeQr}
                >
                  Close
                </button>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
