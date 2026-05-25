"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Bell, Bug, QrCode, User } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { BetaFeedbackModal } from "@/components/shared/BetaFeedbackModal";
import { useInviteShare } from "@/components/shared/InviteShareProvider";
import { cn } from "@/lib/utils";
import type { InviteShareData } from "@/lib/types/invite";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://slate360.ai";

const iconButtonClass = cn(
  "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
  "border border-white/[0.06] bg-white/[0.03] text-[#A3AED0]",
  "transition-colors hover:border-[#6EA7A0]/25 hover:bg-white/[0.06] hover:text-[#FFFFFF]",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6EA7A0]/40",
);

type StudioMobileHeaderActionsProps = {
  inviteShareData: InviteShareData;
};

export function StudioMobileHeaderActions({ inviteShareData }: StudioMobileHeaderActionsProps) {
  const { setOpen: openInviteShare } = useInviteShare();
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const qrAnchorRef = useRef<HTMLDivElement>(null);

  const inviteLink = `${APP_URL}/signup?ref=${encodeURIComponent(inviteShareData.userId)}&launch=1`;

  return (
    <>
      <div className="flex shrink-0 items-center gap-1.5">
        <Link href="/more/account" className={iconButtonClass} aria-label="Account settings">
          <User className="h-[18px] w-[18px]" strokeWidth={1.75} />
        </Link>

        <Link
          href="/coordination/inbox"
          className={iconButtonClass}
          aria-label="Notifications and alerts"
        >
          <Bell className="h-[18px] w-[18px]" strokeWidth={1.75} />
        </Link>

        <button
          type="button"
          className={iconButtonClass}
          aria-label="Report a bug or suggest a feature"
          onClick={() => setFeedbackOpen(true)}
        >
          <Bug className="h-[18px] w-[18px]" strokeWidth={1.75} />
        </button>

        <div ref={qrAnchorRef} className="relative">
          <button
            type="button"
            className={iconButtonClass}
            aria-label="Share project invite QR code"
            aria-expanded={qrOpen}
            onClick={() => setQrOpen((open) => !open)}
          >
            <QrCode className="h-[18px] w-[18px]" strokeWidth={1.75} />
          </button>

          {qrOpen ? (
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
                className="absolute right-0 top-[calc(100%+8px)] z-50 w-[min(280px,calc(100vw-2rem))] rounded-xl border border-white/10 bg-[#0B0F15]/95 p-4 shadow-[0_12px_40px_rgba(0,0,0,0.55)] backdrop-blur-md"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#A3AED0]">
                  Field invite QR
                </p>
                <div className="mt-3 flex justify-center rounded-xl border border-white/[0.06] bg-white p-3">
                  <QRCodeSVG value={inviteLink} size={168} level="M" includeMargin={false} />
                </div>
                <p className="mt-3 text-center text-[11px] leading-snug text-[#A3AED0]">
                  Scan or share to sync project contacts on-site.
                </p>
                <button
                  type="button"
                  className="mt-3 flex h-10 w-full items-center justify-center rounded-xl border border-[#6EA7A0]/30 bg-[#6EA7A0]/10 text-sm font-medium text-[#6EA7A0] transition-colors hover:bg-[#6EA7A0]/15"
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
