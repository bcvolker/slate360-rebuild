"use client";

import React from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { RISK_COLORS } from "@/components/dashboard/market/market-constants";
import MarketBuyPanel from "@/components/dashboard/market/MarketBuyPanel";
import MarketFiltersPanel from "@/components/dashboard/market/MarketFiltersPanel";
import type { MarketListing, LiveChecklist, MktTimeframe, MktRiskTag, MarketSortKey } from "@/components/dashboard/market/types";

type QuickPreset = "construction" | "high-volume" | "mispriced" | "closing-soon" | "crypto";

interface MarketExplorerTabProps {
  // Markets state
  pagedMarkets: MarketListing[];
  filteredMarketsCount: number;
  marketsLoaded: boolean;
  loadingMarkets: boolean;
  marketsPage: number;
  marketsTotalPages: number;
  wsConnected: boolean;
  bookmarks: Set<string>;
  watchlist: Set<string>;
  previewSummary: { marketsScanned: number; opportunitiesFound: number; decisions: number } | null;
  // Filter state
  marketSearch: string;
  mktTimeframe: MktTimeframe;
  mktCategory: string;
  mktProbMin: number;
  mktProbMax: number;
  mktMinVol: number;
  mktMinEdge: number;
  mktRiskTag: MktRiskTag;
  mktSortBy: MarketSortKey;
  mktSortDir: "asc" | "desc";
  filtersExpanded: boolean;
  // Buy panel
  buyMarket: MarketListing | null;
  buyOutcome: "YES" | "NO";
  buyAmount: number;
  buyTakeProfitPct: number;
  buyStopLossPct: number;
  buyPaper: boolean;
  buySubmitting: boolean;
  buySuccess: string;
  liveChecklist: LiveChecklist;
  buyPayloadReady: boolean;
  buyPayloadIssues: string[];
  formatMoney: (usd: number) => string;
  // Filter handlers
  onSearchChange: (q: string) => void;
  onSearch: (kw?: string) => void;
  onTimeframeChange: (tf: MktTimeframe) => void;
  onCategoryChange: (c: string) => void;
  onProbMinChange: (v: number) => void;
  onProbMaxChange: (v: number) => void;
  onMinVolChange: (v: number) => void;
  onMinEdgeChange: (v: number) => void;
  onRiskTagChange: (t: MktRiskTag) => void;
  onSortByChange: (k: MarketSortKey) => void;
  onFiltersToggle: () => void;
  onApplyPreset: (p: QuickPreset) => void;
  onClearMarkets: () => void;
  onPageChange: (p: number) => void;
  // Table handlers
  onToggleBookmark: (id: string) => void;
  onToggleWatchlist: (m: MarketListing) => void;
  onExclude: (id: string) => void;
  onOpenBuyPanel: (m: MarketListing, o: "YES" | "NO") => void;
  // Buy panel handlers
  onBuyMarketClose: () => void;
  onBuyOutcomeChange: (o: "YES" | "NO") => void;
  onBuyAmountChange: (a: number) => void;
  onBuyTakeProfitChange: (p: number) => void;
  onBuyStopLossChange: (p: number) => void;
  onBuyPaperToggle: () => void;
  onBuySubmit: () => void;
}

export default function MarketExplorerTab({
  pagedMarkets, filteredMarketsCount, marketsLoaded, loadingMarkets, marketsPage,
  marketsTotalPages, wsConnected, bookmarks, watchlist, previewSummary,
  marketSearch, mktTimeframe, mktCategory, mktProbMin, mktProbMax,
  mktMinVol, mktMinEdge, mktRiskTag, mktSortBy, mktSortDir, filtersExpanded,
  buyMarket, buyOutcome, buyAmount, buyTakeProfitPct, buyStopLossPct,
  buyPaper, buySubmitting, buySuccess, liveChecklist, buyPayloadReady, buyPayloadIssues,
  formatMoney, onSearchChange, onSearch, onTimeframeChange, onCategoryChange,
  onProbMinChange, onProbMaxChange, onMinVolChange, onMinEdgeChange, onRiskTagChange,
  onSortByChange, onFiltersToggle, onApplyPreset, onClearMarkets, onPageChange,
  onToggleBookmark, onToggleWatchlist, onExclude, onOpenBuyPanel,
  onBuyMarketClose, onBuyOutcomeChange, onBuyAmountChange, onBuyTakeProfitChange,
  onBuyStopLossChange, onBuyPaperToggle, onBuySubmit,
}: MarketExplorerTabProps) {
  return (
    <div className="space-y-4">
      {buyMarket && (
        <MarketBuyPanel
          market={buyMarket} outcome={buyOutcome} amount={buyAmount}
          takeProfitPct={buyTakeProfitPct} stopLossPct={buyStopLossPct}
          paper={buyPaper} submitting={buySubmitting} success={buySuccess}
          liveChecklist={liveChecklist} payloadReady={buyPayloadReady}
          payloadIssues={buyPayloadIssues} formatMoney={formatMoney}
          onOutcomeChange={onBuyOutcomeChange} onAmountChange={onBuyAmountChange}
          onTakeProfitChange={onBuyTakeProfitChange} onStopLossChange={onBuyStopLossChange}
          onPaperToggle={onBuyPaperToggle} onSubmit={onBuySubmit} onClose={onBuyMarketClose}
        />
      )}

      <MarketFiltersPanel
        marketSearch={marketSearch} mktTimeframe={mktTimeframe} mktCategory={mktCategory}
        mktProbMin={mktProbMin} mktProbMax={mktProbMax} mktMinVol={mktMinVol}
        mktMinEdge={mktMinEdge} mktRiskTag={mktRiskTag} mktSortBy={mktSortBy}
        mktSortDir={mktSortDir} filtersExpanded={filtersExpanded} wsConnected={wsConnected}
        marketsLoaded={marketsLoaded} loadingMarkets={loadingMarkets}
        filteredMarketsCount={filteredMarketsCount} previewSummary={previewSummary}
        onSearchChange={onSearchChange} onSearch={onSearch} onTimeframeChange={onTimeframeChange}
        onCategoryChange={onCategoryChange} onProbMinChange={onProbMinChange}
        onProbMaxChange={onProbMaxChange} onMinVolChange={onMinVolChange}
        onMinEdgeChange={onMinEdgeChange} onRiskTagChange={onRiskTagChange}
        onSortByChange={onSortByChange} onFiltersToggle={onFiltersToggle}
        onApplyPreset={onApplyPreset} onClearMarkets={onClearMarkets}
      />

      {!marketsLoaded && !loadingMarkets && (
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-12 text-center">
          <p className="text-3xl mb-3">🔍</p>
          <p className="text-gray-700 font-medium mb-1">Search Polymarket</p>
          <p className="text-gray-400 text-sm mb-5">Enter a keyword above and click Search to browse live prediction markets</p>
          <button onClick={() => onSearch("")} className="bg-[#1E3A8A] hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg text-sm font-semibold transition">
            Load Top Markets
          </button>
        </div>
      )}

      {marketsLoaded && (
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100 text-xs text-gray-500">
            <span>Page {marketsPage} of {marketsTotalPages}</span>
            <div className="flex items-center gap-2">
              <button onClick={() => onPageChange(Math.max(1, marketsPage - 1))} disabled={marketsPage <= 1}
                className="px-2 py-1 rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-40">Prev</button>
              <button onClick={() => onPageChange(Math.min(marketsTotalPages, marketsPage + 1))} disabled={marketsPage >= marketsTotalPages}
                className="px-2 py-1 rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-40">Next</button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr className="text-gray-500">
                  <th className="px-4 py-3 text-left font-medium">
                    <button onClick={() => onSortByChange("title")} className="hover:text-gray-700 transition">Market {mktSortBy === "title" ? (mktSortDir === "asc" ? "↑" : "↓") : ""}</button>
                  </th>
                  <th className="px-3 py-3 text-center font-medium">Cat.</th>
                  <th className="px-3 py-3 text-right font-medium">
                    <button onClick={() => onSortByChange("probability")} className="hover:text-gray-700 transition">YES / NO {mktSortBy === "probability" ? (mktSortDir === "asc" ? "↑" : "↓") : ""}</button>
                  </th>
                  <th className="px-3 py-3 text-right font-medium">
                    <button onClick={() => onSortByChange("volume")} className="hover:text-gray-700 transition">Vol 24h {mktSortBy === "volume" ? (mktSortDir === "asc" ? "↑" : "↓") : ""}</button>
                  </th>
                  <th className="px-3 py-3 text-right font-medium">
                    <button onClick={() => onSortByChange("endDate")} className="hover:text-gray-700 transition">Ends {mktSortBy === "endDate" ? (mktSortDir === "asc" ? "↑" : "↓") : ""}</button>
                  </th>
                  <th className="px-3 py-3 text-right font-medium">
                    <button onClick={() => onSortByChange("edge")} className="hover:text-gray-700 transition">Edge {mktSortBy === "edge" ? (mktSortDir === "asc" ? "↑" : "↓") : ""}</button>
                  </th>
                  <th className="px-3 py-3 text-center font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loadingMarkets ? (
                  <tr><td colSpan={7} className="text-center py-10 text-gray-400">Searching markets…</td></tr>
                ) : pagedMarkets.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-10 text-gray-400">No markets match — try a different search or fewer filters</td></tr>
                ) : (
                  pagedMarkets.map(m => (
                    <tr key={m.id} className="border-t border-gray-100 hover:bg-gray-100/30">
                      <td className="px-4 py-3 max-w-[260px]">
                        <div className="flex items-start gap-2">
                          {m.riskTag && (
                            <span style={{ background: RISK_COLORS[m.riskTag] + "30", color: RISK_COLORS[m.riskTag] }}
                              className="text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase whitespace-nowrap mt-0.5">
                              {m.riskTag.replace("-", " ")}
                            </span>
                          )}
                          <span className="text-gray-900 line-clamp-2">{m.title}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-center text-gray-500 text-[11px]">{m.category.slice(0, 12)}</td>
                      <td className="px-3 py-3 text-right">
                        <div className="flex flex-col items-end gap-0.5">
                          <span className={`text-xs font-semibold ${m.probabilityPct > 60 ? "text-green-600" : m.probabilityPct < 40 ? "text-red-600" : "text-gray-700"}`}>
                            Y: {(m.yesPrice * 100).toFixed(0)}¢
                          </span>
                          <span className="text-[10px] text-gray-400">N: {(m.noPrice * 100).toFixed(0)}¢</span>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right text-gray-500 text-[11px]">${m.volume24hUsd >= 1000 ? `${(m.volume24hUsd/1000).toFixed(0)}k` : m.volume24hUsd.toFixed(0)}</td>
                      <td className="px-3 py-3 text-right text-gray-400 text-[10px]">{m.endDateLabel ?? "—"}</td>
                      <td className="px-3 py-3 text-right">
                        <span className={m.edgePct > 15 ? "text-[#FF4D00] font-bold" : m.edgePct > 8 ? "text-yellow-600" : "text-gray-500"}>
                          {m.edgePct}%
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex justify-center items-center gap-1.5 flex-wrap">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button onClick={() => onToggleBookmark(m.id)}
                                className={`text-base leading-none transition ${bookmarks.has(m.id) ? "text-yellow-400" : "text-gray-400 hover:text-yellow-400"}`}>
                                {bookmarks.has(m.id) ? "★" : "☆"}
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>{bookmarks.has(m.id) ? "Unfollow market" : "Follow market"}</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button onClick={() => onToggleWatchlist(m)}
                                className={`text-base leading-none transition ${watchlist.has(m.id) ? "text-orange-400" : "text-gray-400 hover:text-orange-400"}`}>
                                {watchlist.has(m.id) ? "🔔" : "🔕"}
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>{watchlist.has(m.id) ? "Remove from saved watchlist" : "Save to watchlist (persists)"}</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button onClick={() => onOpenBuyPanel(m, "YES")}
                                className="text-xs bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 px-2 py-1 rounded-lg font-medium transition">
                                Buy YES
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>Open buy panel for YES outcome.</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button onClick={() => onOpenBuyPanel(m, "NO")}
                                className="text-xs bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 px-2 py-1 rounded-lg font-medium transition">
                                Buy NO
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>Open buy panel for NO outcome.</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button onClick={() => onExclude(m.id)}
                                className="text-xs bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 px-2 py-1 rounded-lg font-medium transition">
                                Exclude
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>Hide this market from current lists.</TooltipContent>
                          </Tooltip>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
