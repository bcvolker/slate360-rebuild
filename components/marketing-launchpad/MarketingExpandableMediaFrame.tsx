"use client";

import { useState } from "react";
import type { MarketingMediaVariant } from "@/components/marketing-launchpad/MarketingMediaPanel";
import { MarketingMediaPanel } from "@/components/marketing-launchpad/MarketingMediaPanel";
import { MarketingMobileStudioPortal } from "@/components/marketing-launchpad/MarketingMobileStudioPortal";
import {
  MEDIA_COLUMN,
  MOBILE_CANVAS,
  MOBILE_EXPAND_LABEL,
} from "@/components/marketing-launchpad/marketing-styles";

type MarketingExpandableMediaFrameProps = {
  variant: MarketingMediaVariant;
};

export function MarketingExpandableMediaFrame({ variant }: MarketingExpandableMediaFrameProps) {
  const [portalOpen, setPortalOpen] = useState(false);

  return (
    <>
      <div className={`${MEDIA_COLUMN} hidden lg:flex`}>
        <MarketingMediaPanel variant={variant} />
      </div>

      <div className="lg:hidden">
        <button
          type="button"
          className={MOBILE_CANVAS}
          onClick={() => setPortalOpen(true)}
          aria-label="Expand fullscreen interactive studio"
        >
          <div className="absolute inset-0 overflow-hidden rounded-xl">
            <MarketingMediaPanel variant={variant} mode="preview" />
          </div>
          <span className={MOBILE_EXPAND_LABEL}>✦ Tap to Expand Fullscreen Interactive Studio</span>
        </button>
        <MarketingMobileStudioPortal
          open={portalOpen}
          onClose={() => setPortalOpen(false)}
          variant={variant}
        />
      </div>
    </>
  );
}

export function HeroMediaFrame() {
  return <MarketingExpandableMediaFrame variant="hero-model" />;
}
