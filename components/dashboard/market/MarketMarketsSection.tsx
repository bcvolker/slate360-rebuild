"use client";

import React, { type ComponentProps } from "react";
import MarketDirectBuyTab from "@/components/dashboard/market/MarketDirectBuyTab";
import MarketSavedMarketsTab from "@/components/dashboard/market/MarketSavedMarketsTab";

interface MarketMarketsSectionProps extends ComponentProps<typeof MarketDirectBuyTab> {
  onNavigate: (tabId: string) => void;
}

export default function MarketMarketsSection({ onNavigate, ...directBuyProps }: MarketMarketsSectionProps) {
  return (
    <div className="space-y-6">
      <section className="rounded-[32px] border border-cyan-500/20 bg-[linear-gradient(135deg,rgba(8,15,31,0.96),rgba(15,23,42,0.96))] p-5 shadow-[0_24px_80px_rgba(2,6,23,0.5)]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-cyan-300/80">Markets</p>
        <h2 className="mt-2 text-2xl font-black text-slate-50">Terminal workspace for search, detail, and shortlist flow</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
          Search and manual trading stay here. Saved Markets now sits beside the browser as a persistent shortlist instead of a separate light card block below it.
        </p>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_360px] xl:items-start">
        <MarketDirectBuyTab {...directBuyProps} />

        <section className="rounded-[32px] border border-slate-800 bg-slate-950/70 p-4 shadow-[0_20px_60px_rgba(15,23,42,0.45)]">
          <MarketSavedMarketsTab onNavigate={onNavigate} />
        </section>
      </div>
    </div>
  );
}