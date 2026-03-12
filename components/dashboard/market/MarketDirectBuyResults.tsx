"use client";

import { MarketOpportunityBadge, MarketTableLegend } from "@/components/dashboard/market/MarketSharedUi";
import type { MarketListing, MarketSortDirection, MarketSortKey } from "@/components/dashboard/market/types";
import { formatCents, marketResolutionLabel } from "@/lib/market/market-display";

type TableInsights = {
  signalCounts: { premium: number; strong: number; watch: number; thin: number; speculative: number };
  topEdge: number;
  averageVolume: number;
  tightMarkets: number;
};

type Props = {
  markets: MarketListing[];
  sortBy: MarketSortKey;
  sortDirection: MarketSortDirection;
  tableInsights: TableInsights;
  onToggleSort: (key: MarketSortKey) => void;
  onBuy: (market: MarketListing, outcome: "YES" | "NO") => void;
  onOpenDetails: (market: MarketListing) => void;
  savedMarketIds?: string[];
  onToggleSave?: (market: MarketListing) => void;
};

const SORT_OPTIONS: Array<{ key: MarketSortKey; label: string }> = [
  { key: "edge", label: "Best value" },
  { key: "volume", label: "Most active" },
  { key: "probability", label: "Highest confidence" },
  { key: "endDate", label: "Ending soon" },
  { key: "title", label: "A to Z" },
];

export default function MarketDirectBuyResults({ markets, sortBy, sortDirection, tableInsights, onToggleSort, onBuy, onOpenDetails, savedMarketIds = [], onToggleSave }: Props) {
  const highQualityCount = tableInsights.signalCounts.premium + tableInsights.signalCounts.strong;

  return (
    <>
      <MarketTableLegend />

      <div className="mt-4 flex flex-col gap-3 rounded-[28px] border border-slate-800 bg-slate-950/80 p-4 shadow-[0_18px_45px_rgba(2,6,23,0.35)] lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-300">
          <span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 font-semibold text-slate-100">{markets.length} setups</span>
          <span>{highQualityCount} high-quality ideas</span>
          <span>Top edge {tableInsights.topEdge.toFixed(1)}%</span>
          <span>Avg volume ${Math.round(tableInsights.averageVolume).toLocaleString()}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {SORT_OPTIONS.map((option) => (
            <button
              key={option.key}
              onClick={() => onToggleSort(option.key)}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${sortBy === option.key ? "border-cyan-400/40 bg-cyan-500/20 text-cyan-100" : "border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-500 hover:text-slate-100"}`}
            >
              {option.label}{sortBy === option.key ? ` ${sortDirection === "asc" ? "↑" : "↓"}` : ""}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-[28px] border border-slate-800 bg-slate-950/85 shadow-[0_20px_55px_rgba(2,6,23,0.4)]">
        {markets.length === 0 ? (
          <p className="py-12 text-center text-sm text-slate-400">No markets match your filters.</p>
        ) : (
          <div className="max-h-[560px] overflow-auto">
            <table className="min-w-full text-left text-sm text-slate-200">
              <thead className="sticky top-0 z-10 bg-slate-900/95 text-xs uppercase tracking-[0.16em] text-slate-400">
                <tr>
                  <th className="px-4 py-3">Market</th>
                  <th className="px-3 py-3">YES</th>
                  <th className="px-3 py-3">NO</th>
                  <th className="px-3 py-3">Prob</th>
                  <th className="px-3 py-3">Edge</th>
                  <th className="px-3 py-3">Volume</th>
                  <th className="px-3 py-3">Ends</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {markets.map((market) => (
                  <MarketRow
                    key={market.id}
                    market={market}
                    onBuy={onBuy}
                    onOpenDetails={onOpenDetails}
                    isSaved={savedMarketIds.includes(market.id)}
                    onToggleSave={onToggleSave}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

function MarketRow({ market, onBuy, onOpenDetails, isSaved, onToggleSave }: { market: MarketListing; onBuy: (market: MarketListing, outcome: "YES" | "NO") => void; onOpenDetails: (market: MarketListing) => void; isSaved: boolean; onToggleSave?: (market: MarketListing) => void }) {
  return (
    <tr className="border-t border-slate-800/80 bg-slate-950/20 transition hover:bg-slate-900/40" onClick={() => onOpenDetails(market)}>
      <td className="px-4 py-3 align-top">
        <div className="space-y-1">
          <p className="line-clamp-2 max-w-[460px] font-semibold text-slate-100">{market.title}</p>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
            <span className="rounded-full border border-slate-700 bg-slate-900 px-2 py-0.5">{market.category}</span>
            <MarketOpportunityBadge market={market} />
          </div>
        </div>
      </td>
      <td className="px-3 py-3 font-semibold text-emerald-300">{formatCents(market.yesPrice)}</td>
      <td className="px-3 py-3 font-semibold text-rose-300">{formatCents(market.noPrice)}</td>
      <td className="px-3 py-3">{market.probabilityPct}%</td>
      <td className="px-3 py-3">{market.edgePct.toFixed(1)}%</td>
      <td className="px-3 py-3">${Math.round(market.volume24hUsd).toLocaleString()}</td>
      <td className="px-3 py-3 text-xs text-slate-400">{marketResolutionLabel(market)}</td>
      <td className="px-4 py-3" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-end gap-1.5">
          <button onClick={() => onToggleSave?.(market)} className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition ${isSaved ? "border-amber-400/35 bg-amber-500/20 text-amber-100" : "border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-500 hover:text-slate-100"}`}>
            {isSaved ? "Saved" : "Save"}
          </button>
          <button onClick={() => onBuy(market, "YES")} className="rounded-full border border-emerald-400/35 bg-emerald-500/15 px-2.5 py-1 text-[11px] font-semibold text-emerald-100 transition hover:bg-emerald-500/25">Buy YES</button>
          <button onClick={() => onBuy(market, "NO")} className="rounded-full border border-rose-400/35 bg-rose-500/15 px-2.5 py-1 text-[11px] font-semibold text-rose-100 transition hover:bg-rose-500/25">Buy NO</button>
        </div>
      </td>
    </tr>
  );
}