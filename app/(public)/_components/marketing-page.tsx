"use client";

import { MarketingApps } from "@/app/(public)/_components/marketing-apps";
import { MarketingFaq } from "@/app/(public)/_components/marketing-faq";
import { MarketingFooter } from "@/app/(public)/_components/marketing-footer";
import { MarketingHero } from "@/app/(public)/_components/marketing-hero";
import { MarketingNav } from "@/app/(public)/_components/marketing-nav";
import { MKT_PAGE } from "@/app/(public)/_components/marketing-styles";

/**
 * Canonical Slate360 marketing homepage — Graphite Glass.
 * Section order: hero (reality→twin reveal) → app panels with live phone
 * demos → interactive-deliverable strip → FAQ + CTA. Slate360 sells a capture and
 * documentation service today; SaaS pricing is intentionally not shown.
 * Adding a future app = one entry in lib/marketing/homepage-content.ts.
 */
export function MarketingPage() {
  return (
    <div data-marketing-homepage className={MKT_PAGE}>
      <MarketingNav />
      <main>
        <MarketingHero />
        <MarketingApps />
        <MarketingFaq />
      </main>
      <MarketingFooter />
    </div>
  );
}
