"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import type { MarketingMediaVariant } from "@/components/marketing-launchpad/MarketingMediaPanel";
import { MarketingMediaPanel } from "@/components/marketing-launchpad/MarketingMediaPanel";
import { STUDIO_PORTAL_CLOSE } from "@/components/marketing-launchpad/marketing-styles";
import { cn } from "@/lib/utils";

type MarketingMobileStudioPortalProps = {
  open: boolean;
  onClose: () => void;
  variant: MarketingMediaVariant;
};

export function MarketingMobileStudioPortal({
  open,
  onClose,
  variant,
}: MarketingMobileStudioPortalProps) {
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[5000] flex h-[100dvh] w-screen flex-col bg-[#0B0F15]"
      role="dialog"
      aria-modal="true"
      aria-label="Interactive Studio"
    >
      <div
        className="fixed inset-0 z-[5005] bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className="relative z-[5001] flex h-full w-full flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <MarketingMediaPanel variant={variant} mode="fullscreen" />
      </div>
      <button
        type="button"
        onClick={onClose}
        className={cn(
          STUDIO_PORTAL_CLOSE,
          "fixed right-4 top-[max(1rem,env(safe-area-inset-top))] z-[5010] pointer-events-auto",
        )}
      >
        [ ✕ Close Interactive Studio ]
      </button>
    </div>,
    document.body,
  );
}
