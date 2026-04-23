"use client";

/**
 * ==========================================================================
 * SLATE360 MARKETING HOMEPAGE
 * ==========================================================================
 *
 * Ultra-premium light-themed marketing page (Linear / Vercel / Stripe aesthetic).
 * Rebuilt 2026 — delegates to modular components in /components/marketing/.
 *
 * ==========================================================================
 */

import MarketingHeader from "@/components/marketing/MarketingHeader";
import HeroSection from "@/components/marketing/HeroSection";
import AppShowcase from "@/components/marketing/AppShowcase";
import PricingSection from "@/components/marketing/PricingSection";
import MarketingFooter from "@/components/marketing/MarketingFooter";

export default function MarketingHomepage({ isLoggedIn = false }: { isLoggedIn?: boolean }) {
  return (
    <div className="min-h-screen overflow-x-hidden bg-white text-slate-900">
      <MarketingHeader isLoggedIn={isLoggedIn} />
      <main>
        <HeroSection />
        <AppShowcase />
        <PricingSection />
      </main>
      <MarketingFooter />
    </div>
  );
}
