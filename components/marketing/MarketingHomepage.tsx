"use client";

import { MarketingFeatureSection } from "@/components/marketing-launchpad/MarketingFeatureSection";
import { MarketingFooter } from "@/components/marketing-launchpad/MarketingFooter";
import { MarketingHeader } from "@/components/marketing-launchpad/MarketingHeader";
import { MarketingHeroSection } from "@/components/marketing-launchpad/MarketingHeroSection";
import {
  DIGITAL_TWIN_TILE,
  PANORAMA_TILE,
  SITE_WALK_CAPTURE_TILE,
  SITE_WALK_MAPS_TILE,
} from "@/components/marketing-launchpad/marketing-tile-data";
import { MarketingHomepagePricing } from "@/components/marketing/MarketingHomepagePricing";
import {
  MARKETING_PAGE_ROOT,
  MARKETING_SNAP_SECTION,
  MARKETING_TAIL,
} from "@/components/marketing/marketing-homepage-styles";

const SNAP_TILES = [
  SITE_WALK_CAPTURE_TILE,
  SITE_WALK_MAPS_TILE,
  DIGITAL_TWIN_TILE,
  PANORAMA_TILE,
] as const;

/**
 * Canonical public marketing homepage.
 * Desktop: scroll-snap (proximity) on hero + four feature tiles only.
 * Mobile: normal document scroll (snap disabled via globals.css).
 * Pricing and footer follow in normal document flow.
 */
export function MarketingHomepage() {
  return (
    <div data-marketing-homepage className={MARKETING_PAGE_ROOT}>
      <MarketingHeader variant="homepage" />

      <div className="marketing-snap-track">
        <MarketingHeroSection sectionClassName={MARKETING_SNAP_SECTION} />
        {SNAP_TILES.map((tile, index) => (
          <MarketingFeatureSection
            key={tile.title}
            tile={tile}
            sectionClassName={
              index === SNAP_TILES.length - 1
                ? `${MARKETING_SNAP_SECTION} marketing-snap-section--release`
                : MARKETING_SNAP_SECTION
            }
          />
        ))}
      </div>

      <div className={`${MARKETING_TAIL} marketing-tail`}>
        <MarketingHomepagePricing />
        <MarketingFooter />
      </div>
    </div>
  );
}
