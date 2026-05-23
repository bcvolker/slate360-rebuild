"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import type { MarketingMediaVariant } from "@/components/marketing-launchpad/MarketingMediaPanel";
import { MarketingMediaPanel } from "@/components/marketing-launchpad/MarketingMediaPanel";
import {
  STUDIO_PORTAL_CLOSE,
  STUDIO_PORTAL_FRAME,
} from "@/components/marketing-launchpad/marketing-styles";

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
    <div className={STUDIO_PORTAL_FRAME} role="dialog" aria-modal="true" aria-label="Interactive Studio">
      <button type="button" onClick={onClose} className={STUDIO_PORTAL_CLOSE}>
        [ ✕ Close Interactive Studio ]
      </button>
      <div className="relative h-full w-full overflow-hidden rounded-xl">
        <MarketingMediaPanel variant={variant} mode="fullscreen" />
      </div>
    </div>,
    document.body,
  );
}
