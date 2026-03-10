"use client";

import { MarketOpportunityBadge, MarketTableLegend } from "@/components/dashboard/market/MarketSharedUi";
import type { MarketListing, MarketSortDirection, MarketSortKey } from "@/components/dashboard/market/types";
import { formatCents, marketChanceLabel } from "@/lib/market/market-display";

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

      <div className="mt-4 flex flex-col gap-3 rounded-[28px] border border-slate-200 bg-white/80 p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-semibold text-slate-700">{markets.length} live setups</span>
          <span>{highQualityCount} high-quality ideas</span>
          <span>Best pricing edge {tableInsights.topEdge.toFixed(1)}%</span>
          <span>Avg volume ${Math.round(tableInsights.averageVolume).toLocaleString()}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {SORT_OPTIONS.map((option) => (
            <button
              key={option.key}
              onClick={() => onToggleSort(option.key)}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${sortBy === option.key ? "border-[#FF4D00] bg-[#FF4D00] text-white" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900"}`}
            >
              {option.label}{sortBy === option.key ? ` ${sortDirection === "asc" ? "↑" : "↓"}` : ""}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {markets.length === 0 ? (
          <p className="rounded-[28px] border border-dashed border-slate-200 bg-white/80 py-10 text-center text-sm text-slate-400 shadow-sm">No markets match your filters.</p>
        ) : (
          markets.map((market) => (
            <MarketRow
              key={market.id}
              market={market}
              onBuy={onBuy}
              onOpenDetails={onOpenDetails}
              isSaved={savedMarketIds.includes(market.id)}
              onToggleSave={onToggleSave}
            />
          ))
        )}
      </div>
    </>
  );
}

function MarketRow({ market, onBuy, onOpenDetails, isSaved, onToggleSave }: { market: MarketListing; onBuy: (market: MarketListing, outcome: "YES" | "NO") => void; onOpenDetails: (market: MarketListing) => void; isSaved: boolean; onToggleSave?: (market: MarketListing) => void }) {
  return (
    <article className="overflow-hidden rounded-[30px] border border-slate-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.92))] p-5 shadow-sm transition hover:border-[#FF4D00]/30 hover:shadow-md">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{market.category}</span>
            <MarketOpportunityBadge market={market} />
            {market.endDateLabel && <span className="text-xs text-slate-400">Resolves {market.endDateLabel}</span>}
          </div>
          <button onClick={() => onOpenDetails(market)} className="mt-3 block text-left text-xl font-black leading-tight text-slate-900 transition hover:text-[#FF4D00]">
            {market.title}
          </button>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">{marketChanceLabel(market.probabilityPct)}. Current pricing edge is {market.edgePct.toFixed(1)}%, with ${Math.round(market.volume24hUsd).toLocaleString()} traded over the last 24 hours.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3 xl:w-[420px]">
          <MetricBox label="Implied chance" value={`${market.probabilityPct}%`} caption="Chance of YES" accent="text-sky-700" />
          <MetricBox label="YES entry" value={formatCents(market.yesPrice)} caption="Back happens" accent="text-emerald-700" />
          <MetricBox label="NO entry" value={formatCents(market.noPrice)} caption="Back does not happen" accent="text-rose-700" />
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-3 border-t border-slate-200/80 pt-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <span className="rounded-full border border-slate-200 bg-white px-3 py-1">Edge {market.edgePct.toFixed(1)}%</span>
          <span className="rounded-full border border-slate-200 bg-white px-3 py-1">Liquidity ${Math.round(market.liquidityUsd).toLocaleString()}</span>
          <span className="rounded-full border border-slate-200 bg-white px-3 py-1">Volume ${Math.round(market.volume24hUsd).toLocaleString()}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => onToggleSave?.(market)} className={`rounded-full border px-4 py-2 text-xs font-semibold transition ${isSaved ? "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900"}`}>
            {isSaved ? "Saved" : "Save"}
          </button>
          <button onClick={() => onOpenDetails(market)} className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50">
            Details
          </button>
          <button onClick={() => onBuy(market, "YES")} className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-bold text-emerald-700 transition hover:bg-emerald-100">
            Back happens · {formatCents(market.yesPrice)}
          </button>
          <button onClick={() => onBuy(market, "NO")} className="rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-bold text-rose-700 transition hover:bg-rose-100">
            Back does not happen · {formatCents(market.noPrice)}
          </button>
        </div>
      </div>
    </article>
  );
}

function MetricBox({ label, value, caption, accent }: { label: string; value: string; caption: string; accent: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white/90 p-4">
      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <p className={`mt-2 text-2xl font-black ${accent}`}>{value}</p>
      <p className="mt-1 text-xs text-slate-500">{caption}</p>
    </div>
  );
}