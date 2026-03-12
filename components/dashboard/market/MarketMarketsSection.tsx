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
      <section className="rounded-[32px] border border-cyan-500/20 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.12),transparent_22%),linear-gradient(180deg,#020617,#111827)] p-5 shadow-[0_24px_80px_rgba(2,6,23,0.5)]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-cyan-300/80">Markets</p>
        <h2 className="mt-2 text-3xl font-black text-slate-50">Find opportunities, then keep your shortlist close</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
          Search and manual trading stay here. Saved Markets is re-homed below the browser so watchlist access stays one click away.
        </p>
      </section>

      <MarketDirectBuyTab {...directBuyProps} />

      <section className="rounded-[32px] border border-slate-800 bg-slate-950/70 p-4 shadow-[0_20px_60px_rgba(15,23,42,0.45)]">
        <MarketSavedMarketsTab onNavigate={onNavigate} />
      </section>
    </div>
  );
}