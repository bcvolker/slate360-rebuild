"use client";

import React from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { RISK_COLORS } from "@/components/dashboard/market/market-constants";
import MarketBuyPanel from "@/components/dashboard/market/MarketBuyPanel";
import type { MarketListing, LiveChecklist } from "@/components/dashboard/market/types";

const HOT_OPP_TABS = ["All", "High Potential", "High Risk-High Reward", "Bookmarked", "Watchlist", "Construction"] as const;

interface MarketHotOppsTabProps {
  markets: MarketListing[];
  hotFiltered: MarketListing[];
  hotTab: string;
  loadingMarkets: boolean;
  bookmarks: Set<string>;
  watchlist: Set<string>;
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
  onHotTabChange: (tab: string) => void;
  onToggleBookmark: (id: string) => void;
  onToggleWatchlist: (m: MarketListing) => void;
  onOpenBuyPanel: (m: MarketListing, o: "YES" | "NO") => void;
  onBuyMarketClose: () => void;
  onBuyOutcomeChange: (o: "YES" | "NO") => void;
  onBuyAmountChange: (a: number) => void;
  onBuyTakeProfitChange: (p: number) => void;
  onBuyStopLossChange: (p: number) => void;
  onBuyPaperToggle: () => void;
  onBuySubmit: () => void;
}

export default function MarketHotOppsTab({
  hotFiltered,
  hotTab,
  loadingMarkets,
  bookmarks,
  watchlist,
  buyMarket,
  buyOutcome,
  buyAmount,
  buyTakeProfitPct,
  buyStopLossPct,
  buyPaper,
  buySubmitting,
  buySuccess,
  liveChecklist,
  buyPayloadReady,
  buyPayloadIssues,
  formatMoney,
  onHotTabChange,
  onToggleBookmark,
  onToggleWatchlist,
  onOpenBuyPanel,
  onBuyMarketClose,
  onBuyOutcomeChange,
  onBuyAmountChange,
  onBuyTakeProfitChange,
  onBuyStopLossChange,
  onBuyPaperToggle,
  onBuySubmit,
}: MarketHotOppsTabProps) {
  return (
    <div className="space-y-4">
      {buyMarket && (
        <MarketBuyPanel
          market={buyMarket}
          outcome={buyOutcome}
          amount={buyAmount}
          takeProfitPct={buyTakeProfitPct}
          stopLossPct={buyStopLossPct}
          paper={buyPaper}
          submitting={buySubmitting}
          success={buySuccess}
          liveChecklist={liveChecklist}
          payloadReady={buyPayloadReady}
          payloadIssues={buyPayloadIssues}
          showTpSlControls={false}
          formatMoney={formatMoney}
          onOutcomeChange={onBuyOutcomeChange}
          onAmountChange={onBuyAmountChange}
          onTakeProfitChange={onBuyTakeProfitChange}
          onStopLossChange={onBuyStopLossChange}
          onPaperToggle={onBuyPaperToggle}
          onSubmit={onBuySubmit}
          onClose={onBuyMarketClose}
        />
      )}

      {/* Hot tabs sub-bar */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {HOT_OPP_TABS.map(t => (
          <button key={t} onClick={() => onHotTabChange(t)}
            className={`px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition ${hotTab === t ? "bg-[#FF4D00] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
            {t}
          </button>
        ))}
      </div>

      {loadingMarkets ? (
        <div className="text-center py-12 text-gray-400">Loading…</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {hotFiltered.map(m => (
            <div key={m.id} className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4 hover:border-gray-200 transition">
              <div className="flex items-start justify-between gap-2 mb-3">
                <p className="text-sm text-gray-900 font-medium line-clamp-2 flex-1">{m.title}</p>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => onToggleBookmark(m.id)}
                    className={`text-lg ${bookmarks.has(m.id) ? "text-yellow-400" : "text-slate-700 hover:text-yellow-400"}`}>
                    {bookmarks.has(m.id) ? "★" : "☆"}
                  </button>
                  <button onClick={() => onToggleWatchlist(m)} title={watchlist.has(m.id) ? "Remove from Watchlist" : "Save to Watchlist"}
                    className={`text-base ${watchlist.has(m.id) ? "text-orange-400" : "text-gray-400 hover:text-orange-400"}`}>
                    {watchlist.has(m.id) ? "🔔" : "🔕"}
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                {m.riskTag && (
                  <span style={{ background: RISK_COLORS[m.riskTag] + "25", color: RISK_COLORS[m.riskTag], borderColor: RISK_COLORS[m.riskTag] + "60" }}
                    className="text-[10px] px-2 py-0.5 rounded-full font-bold border uppercase">
                    {m.riskTag.replace("-", " ")}
                  </span>
                )}
                <span className="text-xs text-gray-500">{m.category}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 mb-3 text-center">
                <div className="bg-gray-100 rounded-lg p-2">
                  <p className="text-[10px] text-gray-400">Prob.</p>
                  <p className={`text-sm font-bold ${m.probabilityPct > 60 ? "text-green-600" : m.probabilityPct < 40 ? "text-red-600" : "text-gray-900"}`}>{m.probabilityPct}%</p>
                </div>
                <div className="bg-gray-100 rounded-lg p-2">
                  <p className="text-[10px] text-gray-400">Advantage</p>
                  <p className="text-sm font-bold text-[#FF4D00]">{m.edgePct}%</p>
                </div>
                <div className="bg-gray-100 rounded-lg p-2">
                  <p className="text-[10px] text-gray-400">Vol 24h</p>
                  <p className="text-sm font-bold text-gray-900">${(m.volume24hUsd / 1000).toFixed(0)}k</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button onClick={() => onOpenBuyPanel(m, "YES")}
                      className="flex-1 bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 text-xs py-1.5 rounded-lg font-medium transition">
                      Buy YES @ {(m.yesPrice * 100).toFixed(0)}¢
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Open buy panel for YES outcome on this market.</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button onClick={() => onOpenBuyPanel(m, "NO")}
                      className="flex-1 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs py-1.5 rounded-lg font-medium transition">
                      Buy NO @ {(m.noPrice * 100).toFixed(0)}¢
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Queue a NO buy on this market.</TooltipContent>
                </Tooltip>
              </div>
            </div>
          ))}
          {hotFiltered.length === 0 && (
            <div className="col-span-3 text-center py-12 text-gray-400">
              No opportunities in this category yet. Try refreshing markets.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
