"use client";

import { MarketingHeader } from "@/components/marketing-launchpad/MarketingHeader";
import { MarketingHeroSection } from "@/components/marketing-launchpad/MarketingHeroSection";
import { MarketingFeatureSection } from "@/components/marketing-launchpad/MarketingFeatureSection";
import { MarketingPricingSection } from "@/components/marketing-launchpad/MarketingPricingSection";
import { MarketingFooter } from "@/components/marketing-launchpad/MarketingFooter";
import {
  SITE_WALK_CAPTURE_TILE,
  SITE_WALK_MAPS_TILE,
  DIGITAL_TWIN_TILE,
  PANORAMA_TILE,
} from "@/components/marketing-launchpad/marketing-tile-data";
import { MARKETING_TAIL } from "@/components/marketing-launchpad/marketing-styles";

/** Homepage marketing shell — natural document scroll (no snap container). */
export function MarketingLaunchpad() {
  return (
    <div className="h-auto w-full bg-[#0B0F15]">
      <MarketingHeader />
      <MarketingHeroSection />
      <MarketingFeatureSection tile={SITE_WALK_CAPTURE_TILE} />
      <MarketingFeatureSection tile={SITE_WALK_MAPS_TILE} />
      <MarketingFeatureSection tile={DIGITAL_TWIN_TILE} />
      <MarketingFeatureSection tile={PANORAMA_TILE} />
      <div className={MARKETING_TAIL}>
        <MarketingPricingSection />
        <MarketingFooter />
      </div>
    </div>
  );
}
