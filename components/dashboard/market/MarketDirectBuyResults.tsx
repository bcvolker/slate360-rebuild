"use client";

import MarketSortHeader from "@/components/dashboard/market/MarketSortHeader";
import { MarketOpportunityBadge, MarketTableLegend } from "@/components/dashboard/market/MarketSharedUi";
import type { MarketListing, MarketSortDirection, MarketSortKey } from "@/components/dashboard/market/types";

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
  savedMarketIds?: string[];
  onToggleSave?: (market: MarketListing) => void;
};

export default function MarketDirectBuyResults({ markets, sortBy, sortDirection, tableInsights, onToggleSort, onBuy, savedMarketIds = [], onToggleSave }: Props) {
  const highQualityCount = tableInsights.signalCounts.premium + tableInsights.signalCounts.strong;

  return (
    <>
      <MarketTableLegend />

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3">
          <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">High-quality setups</p>
          <p className="mt-1 text-2xl font-black text-gray-900">{highQualityCount}</p>
          <p className="mt-1 text-xs text-gray-500">Premium and Strong combine edge, tighter pricing, and healthier activity.</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3">
          <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">Best edge in view</p>
          <p className="mt-1 text-2xl font-black text-[#FF4D00]">{tableInsights.topEdge.toFixed(1)}%</p>
          <p className="mt-1 text-xs text-gray-500">Edge is an estimated pricing advantage, not a guaranteed return after fills and timing.</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3">
          <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">Tight spreads</p>
          <p className="mt-1 text-2xl font-black text-[#1E3A8A]">{tableInsights.tightMarkets}</p>
          <p className="mt-1 text-xs text-gray-500">These markets are more likely to fill cleanly. Avg volume ${Math.round(tableInsights.averageVolume).toLocaleString()}.</p>
        </div>
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-x-auto">
        {markets.length === 0 ? (
          <p className="text-center text-sm text-gray-400 py-10">No markets match your filters.</p>
        ) : (
          <table className="w-full text-sm min-w-[760px]">
            <thead>
              <tr className="border-b border-gray-100 text-[11px] text-gray-400 uppercase tracking-wide">
                <th className="px-4 py-3 text-left">
                  <MarketSortHeader label="Market" help="Sort alphabetically by market title." active={sortBy === "title"} direction={sortDirection} onClick={() => onToggleSort("title")} align="left" />
                </th>
                <th className="px-3 py-3 text-right">
                  <MarketSortHeader label="YES¢" help="Current cost per YES share. Lower prices can increase upside, but only if your thesis is right." active={sortBy === "yesPrice"} direction={sortDirection} onClick={() => onToggleSort("yesPrice")} />
                </th>
                <th className="px-3 py-3 text-right">
                  <MarketSortHeader label="NO¢" help="Current cost per NO share. Useful when the stronger view is that the event will not happen." active={sortBy === "noPrice"} direction={sortDirection} onClick={() => onToggleSort("noPrice")} />
                </th>
                <th className="px-3 py-3 text-right">
                  <MarketSortHeader label="Prob" help="Implied YES probability based on current market pricing." active={sortBy === "probability"} direction={sortDirection} onClick={() => onToggleSort("probability")} />
                </th>
                <th className="px-3 py-3 text-right hidden sm:table-cell">
                  <MarketSortHeader label="Edge" help="Estimated pricing advantage versus fair value. Higher can be better, but quality still depends on liquidity and spread." active={sortBy === "edge"} direction={sortDirection} onClick={() => onToggleSort("edge")} />
                </th>
                <th className="px-3 py-3 text-center hidden md:table-cell">
                  <MarketSortHeader label="Signal" help="Composite quality cue based on edge, spread, liquidity, and activity." active={sortBy === "signal"} direction={sortDirection} onClick={() => onToggleSort("signal")} align="center" />
                </th>
                <th className="px-3 py-3 text-right hidden md:table-cell">
                  <MarketSortHeader label="Volume" help="24-hour trading volume. Higher volume usually means easier fills." active={sortBy === "volume"} direction={sortDirection} onClick={() => onToggleSort("volume")} />
                </th>
                <th className="px-3 py-3 text-right hidden lg:table-cell">
                  <MarketSortHeader label="Ends" help="Resolution timing for the contract. Earlier markets appear first when sorted." active={sortBy === "endDate"} direction={sortDirection} onClick={() => onToggleSort("endDate")} />
                </th>
                <th className="px-3 py-3 text-center font-medium">Save</th>
                <th className="px-3 py-3 text-center font-medium">Buy</th>
              </tr>
            </thead>
            <tbody>
              {markets.map((market) => (
                <MarketRow key={market.id} market={market} onBuy={onBuy} isSaved={savedMarketIds.includes(market.id)} onToggleSave={onToggleSave} />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

function MarketRow({ market, onBuy, isSaved, onToggleSave }: { market: MarketListing; onBuy: (market: MarketListing, outcome: "YES" | "NO") => void; isSaved: boolean; onToggleSave?: (market: MarketListing) => void }) {
  return (
    <tr className="border-b border-gray-50 hover:bg-gray-50/60 transition">
      <td className="px-4 py-3">
        <p className="font-medium text-gray-900 text-sm leading-snug line-clamp-2 max-w-[300px]">{market.title}</p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <p className="text-[11px] text-gray-400">{market.category}</p>
          <span className="text-[11px] text-gray-300">•</span>
          <span className="text-[11px] text-gray-500">{market.riskTag ? market.riskTag.replace(/-/g, " ") : "standard"}</span>
        </div>
      </td>
      <td className="px-3 py-3 text-right">
        <span className="font-mono text-green-700 font-semibold text-xs">{(market.yesPrice * 100).toFixed(0)}¢</span>
      </td>
      <td className="px-3 py-3 text-right">
        <span className="font-mono text-red-700 font-semibold text-xs">{(market.noPrice * 100).toFixed(0)}¢</span>
      </td>
      <td className="px-3 py-3 text-right">
        <span className="text-gray-700 text-xs font-medium">{market.probabilityPct}%</span>
      </td>
      <td className="px-3 py-3 text-right hidden sm:table-cell">
        <span className={`text-xs font-bold ${market.edgePct > 10 ? "text-[#FF4D00]" : market.edgePct > 5 ? "text-amber-600" : "text-gray-400"}`}>
          {market.edgePct.toFixed(1)}%
        </span>
      </td>
      <td className="px-3 py-3 text-center hidden md:table-cell">
        <MarketOpportunityBadge market={market} />
      </td>
      <td className="px-3 py-3 text-right hidden md:table-cell">
        <span className="text-xs text-gray-500">${(market.volume24hUsd / 1000).toFixed(0)}k</span>
      </td>
      <td className="px-3 py-3 text-right hidden lg:table-cell">
        <span className="text-xs text-gray-400">{market.endDateLabel ?? "—"}</span>
      </td>
      <td className="px-3 py-3 text-center">
        <button
          onClick={() => onToggleSave?.(market)}
          className={`px-2 py-1 rounded text-xs font-bold border transition ${isSaved ? "bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100" : "bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100"}`}
        >
          {isSaved ? "Saved" : "Save"}
        </button>
      </td>
      <td className="px-3 py-3">
        <div className="flex gap-1 justify-center">
          <button onClick={() => onBuy(market, "YES")} className="px-2 py-1 bg-green-50 border border-green-200 text-green-700 rounded text-xs font-bold hover:bg-green-100 transition">
            YES
          </button>
          <button onClick={() => onBuy(market, "NO")} className="px-2 py-1 bg-red-50 border border-red-200 text-red-700 rounded text-xs font-bold hover:bg-red-100 transition">
            NO
          </button>
        </div>
      </td>
    </tr>
  );
}