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
  MARKETING_SURFACE_ALT,
  MARKETING_SURFACE_BASE,
  MARKETING_TAIL,
} from "@/components/marketing/marketing-homepage-styles";
import { cn } from "@/lib/utils";

const SNAP_TILES = [
  SITE_WALK_CAPTURE_TILE,
  SITE_WALK_MAPS_TILE,
  DIGITAL_TWIN_TILE,
  PANORAMA_TILE,
] as const;

function snapSectionClass(index: number, isLast: boolean) {
  const surface = index % 2 === 0 ? MARKETING_SURFACE_ALT : MARKETING_SURFACE_BASE;
  return cn(
    MARKETING_SNAP_SECTION,
    surface,
    isLast && "marketing-snap-section--release",
  );
}

/**
 * Canonical public marketing homepage.
 * Desktop: scroll-snap (proximity) on hero + four feature tiles only.
 * Mobile: normal document scroll (snap disabled via globals.css).
 * Pricing and footer follow in normal document flow with subtle surface shifts.
 */
export function MarketingHomepage() {
  return (
    <div data-marketing-homepage className={MARKETING_PAGE_ROOT}>
      <MarketingHeader variant="homepage" />

      <div className="marketing-snap-track">
        <MarketingHeroSection
          sectionClassName={cn(MARKETING_SNAP_SECTION, MARKETING_SURFACE_BASE)}
        />
        {SNAP_TILES.map((tile, index) => (
          <MarketingFeatureSection
            key={tile.title}
            tile={tile}
            sectionClassName={snapSectionClass(index, index === SNAP_TILES.length - 1)}
          />
        ))}
      </div>

      <div className={cn(MARKETING_TAIL, MARKETING_SURFACE_ALT, "marketing-tail")}>
        <MarketingHomepagePricing />
        <MarketingFooter />
      </div>
    </div>
  );
}
