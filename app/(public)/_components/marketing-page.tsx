"use client";

import { MarketingDataProcessing } from "@/app/(public)/_components/marketing-data-processing";
import { MarketingFooter } from "@/app/(public)/_components/marketing-footer";
import { MarketingHero } from "@/app/(public)/_components/marketing-hero";
import { MarketingHowItWorks } from "@/app/(public)/_components/marketing-how-it-works";
import { MarketingNav } from "@/app/(public)/_components/marketing-nav";
import { MarketingPricing } from "@/app/(public)/_components/marketing-pricing";
import { MarketingSalesTiles } from "@/app/(public)/_components/marketing-sales-tiles";
import { MarketingShowcase } from "@/app/(public)/_components/marketing-showcase";
import { MKT_PAGE } from "@/app/(public)/_components/marketing-styles";

/**
 * Canonical Slate360 marketing homepage — Graphite Glass, data-driven via lib/apps-config.ts.
 */
export function MarketingPage() {
  return (
    <div data-marketing-homepage className={MKT_PAGE}>
      <MarketingNav />
      <main>
        <MarketingHero />
        <MarketingShowcase />
        <MarketingSalesTiles />
        <MarketingPricing />
        <MarketingDataProcessing />
        <MarketingHowItWorks />
      </main>
      <MarketingFooter />
    </div>
  );
}
