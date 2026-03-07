"use client";

import React from "react";
import MarketBuyPanel from "@/components/dashboard/market/MarketBuyPanel";
import MarketAdvancedFilters from "@/components/dashboard/market/MarketAdvancedFilters";
import MarketDirectBuyResults from "@/components/dashboard/market/MarketDirectBuyResults";
import { useMarketDirectBuyState } from "@/lib/hooks/useMarketDirectBuyState";
import type { MktTimeframe, LiveChecklist } from "@/components/dashboard/market/types";

interface MarketDirectBuyTabProps {
  paperMode: boolean;
  walletAddress?: `0x${string}`;
  liveChecklist: LiveChecklist;
}

const QUICK_TIMEFRAMES: { key: MktTimeframe; label: string }[] = [
  { key: "all", label: "All" },
  { key: "hour", label: "Next Hour" },
  { key: "today", label: "Ends Today" },
  { key: "week", label: "This Week" },
  { key: "month", label: "This Month" },
];

const fmt = (v: number) => `$${v.toFixed(2)}`;

export default function MarketDirectBuyTab({ paperMode, walletAddress, liveChecklist }: MarketDirectBuyTabProps) {
  const s = useMarketDirectBuyState({ paperMode, walletAddress, liveChecklist });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Browse &amp; Buy</h2>
          <p className="text-sm text-gray-500 mt-0.5">Search live prediction markets and place a YES or NO buy directly.</p>
        </div>
        {s.buyMarket && (
          <span className="text-xs bg-orange-100 text-orange-700 border border-orange-200 px-2.5 py-1 rounded-full font-medium">
            Trade panel open ↓
          </span>
        )}
      </div>

      {/* Buy panel */}
      {s.buyMarket && (
        <MarketBuyPanel
          market={s.buyMarket}
          outcome={s.buyOutcome}
          amount={s.buyAmount}
          takeProfitPct={20}
          stopLossPct={10}
          paper={s.buyPaper}
          submitting={s.buySubmitting}
          success={s.buySuccess}
          liveChecklist={liveChecklist}
          payloadReady={s.buyPayloadReady}
          payloadIssues={s.buyPayloadIssues}
          showTpSlControls={false}
          formatMoney={fmt}
          onOutcomeChange={s.setBuyOutcome}
          onAmountChange={s.setBuyAmount}
          onTakeProfitChange={() => { /* managed by automation tab */ }}
          onStopLossChange={() => { /* managed by automation tab */ }}
          onPaperToggle={() => s.setBuyPaper(!s.buyPaper)}
          onSubmit={s.handleBuy}
          onClose={s.closeBuyPanel}
        />
      )}

      {/* Search toolbar */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4 space-y-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={s.query}
            onChange={e => s.setQuery(e.target.value)}
            onKeyDown={e => e.key === "Enter" && s.fetchMarkets()}
            placeholder="Search markets (e.g. Bitcoin, election, construction…)"
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4D00]/30"
          />
          <button
            onClick={() => s.fetchMarkets()}
            disabled={s.loading}
            className="px-4 py-2 bg-[#FF4D00] text-white rounded-lg text-sm font-semibold hover:bg-[#e04400] disabled:opacity-50 transition"
          >
            {s.loading ? "…" : s.loaded ? "Refresh" : "Search"}
          </button>
        </div>

        {/* Quick timeframe chips */}
        <div className="flex flex-wrap gap-1.5 items-center">
          {QUICK_TIMEFRAMES.map(tf => (
            <button
              key={tf.key}
              onClick={() => s.setTimeframe(tf.key)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition ${
                s.timeframe === tf.key
                  ? "bg-[#FF4D00] text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {tf.label}
            </button>
          ))}
          <button
            onClick={() => s.setFiltersOpen(!s.filtersOpen)}
            className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition ml-auto"
          >
            {s.filtersOpen ? "▲ Fewer filters" : "▼ More filters"}
          </button>
        </div>

        {/* Advanced filters */}
        {s.filtersOpen && (
          <MarketAdvancedFilters
            minEdge={s.minEdge}
            onMinEdgeChange={s.setMinEdge}
            probMin={s.probMin}
            onProbMinChange={s.setProbMin}
            probMax={s.probMax}
            onProbMaxChange={s.setProbMax}
            sortBy={s.sortBy}
            onSortByChange={s.setSortBy}
            category={s.category}
            onCategoryChange={s.setCategory}
            availableCategories={s.availableCategories}
            riskTag={s.riskTag}
            onRiskTagChange={s.setRiskTag}
            minVolume={s.minVolume}
            onMinVolumeChange={s.setMinVolume}
            minLiquidity={s.minLiquidity}
            onMinLiquidityChange={s.setMinLiquidity}
            maxSpread={s.maxSpread}
            onMaxSpreadChange={s.setMaxSpread}
          />
        )}
      </div>

      {/* Empty / loading states */}
      {!s.loaded && !s.loading && (
        <div className="text-center py-12">
          <div className="animate-spin w-6 h-6 border-2 border-[#FF4D00] border-t-transparent rounded-full mx-auto" />
          <p className="text-xs text-gray-400 mt-2">Loading markets…</p>
        </div>
      )}

      {s.loading && (
        <div className="text-center py-12">
          <div className="animate-spin w-6 h-6 border-2 border-[#FF4D00] border-t-transparent rounded-full mx-auto" />
          <p className="text-xs text-gray-400 mt-2">Loading markets…</p>
        </div>
      )}

      {/* Results */}
      {s.loaded && !s.loading && (
        <>
          {s.loadError && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {s.loadError}
            </div>
          )}
          <div className="flex items-center justify-between text-xs text-gray-500 px-1">
            <span>
              {s.filteredCount} market{s.filteredCount !== 1 ? "s" : ""}
              {s.filteredCount !== s.pagedMarkets.length && ` · showing ${s.pagedMarkets.length}`}
            </span>
            <span>Page {s.page} of {s.totalPages}</span>
          </div>

          <MarketDirectBuyResults
            markets={s.pagedMarkets}
            sortBy={s.sortBy}
            sortDirection={s.sortDirection}
            tableInsights={s.tableInsights}
            onToggleSort={s.toggleSort}
            onBuy={s.openBuyPanel}
          />

          {/* Pagination */}
          {s.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button
                disabled={s.page <= 1}
                onClick={() => s.setPage(s.page - 1)}
                className="px-3 py-1 rounded-lg bg-gray-100 text-gray-700 text-sm disabled:opacity-40 hover:bg-gray-200 transition"
              >
                ← Prev
              </button>
              <span className="text-sm text-gray-500">{s.page} / {s.totalPages}</span>
              <button
                disabled={s.page >= s.totalPages}
                onClick={() => s.setPage(s.page + 1)}
                className="px-3 py-1 rounded-lg bg-gray-100 text-gray-700 text-sm disabled:opacity-40 hover:bg-gray-200 transition"
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
