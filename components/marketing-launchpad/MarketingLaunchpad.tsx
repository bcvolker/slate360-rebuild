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

export function MarketingLaunchpad() {
  return (
    <div className="h-[100dvh] snap-y snap-mandatory overflow-y-scroll scroll-smooth bg-[#0B0F15]">
      <MarketingHeader />
      <MarketingHeroSection />
      <MarketingFeatureSection tile={SITE_WALK_CAPTURE_TILE} />
      <MarketingFeatureSection tile={SITE_WALK_MAPS_TILE} />
      <MarketingFeatureSection tile={DIGITAL_TWIN_TILE} />
      <MarketingFeatureSection tile={PANORAMA_TILE} />
      <MarketingPricingSection />
      <MarketingFooter />
    </div>
  );
}
