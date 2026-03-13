"use client";

import React, { type ComponentProps } from "react";
import MarketDirectBuyTab from "@/components/dashboard/market/MarketDirectBuyTab";
import MarketSavedMarketsTab from "@/components/dashboard/market/MarketSavedMarketsTab";

interface MarketMarketsSectionProps extends ComponentProps<typeof MarketDirectBuyTab> {
  onNavigate: (tabId: string) => void;
}

export default function MarketMarketsSection({ onNavigate, ...directBuyProps }: MarketMarketsSectionProps) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_360px] xl:items-start">
        <MarketDirectBuyTab {...directBuyProps} />

        <section className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
          <MarketSavedMarketsTab onNavigate={onNavigate} />
        </section>
      </div>
    </div>
  );
}