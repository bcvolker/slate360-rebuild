"use client";

import { MarketingApps } from "@/app/(public)/_components/marketing-apps";
import { MarketingFaq } from "@/app/(public)/_components/marketing-faq";
import { MarketingFooter } from "@/app/(public)/_components/marketing-footer";
import { MarketingHero } from "@/app/(public)/_components/marketing-hero";
import { MarketingNav } from "@/app/(public)/_components/marketing-nav";
import { MarketingPricing } from "@/app/(public)/_components/marketing-pricing";
import { MKT_PAGE } from "@/app/(public)/_components/marketing-styles";

/**
 * Canonical Slate360 marketing homepage — Graphite Glass.
 * Section order: hero (reality→twin reveal) → app panels with live phone
 * demos → interactive-deliverable strip → compact pricing → FAQ + CTA.
 * Adding a future app = one entry in lib/marketing/homepage-content.ts.
 */
export function MarketingPage() {
  return (
    <div data-marketing-homepage className={MKT_PAGE}>
      <MarketingNav />
      <main>
        <MarketingHero />
        <MarketingApps />
        <MarketingPricing />
        <MarketingFaq />
      </main>
      <MarketingFooter />
    </div>
  );
}
