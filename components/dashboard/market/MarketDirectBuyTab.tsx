"use client";

import React, { useState } from "react";
import MarketBuyPanel from "@/components/dashboard/market/MarketBuyPanel";
import MarketAdvancedFilters from "@/components/dashboard/market/MarketAdvancedFilters";
import MarketDirectBuyResults from "@/components/dashboard/market/MarketDirectBuyResults";
import MarketListingDetailDrawer from "@/components/dashboard/market/MarketListingDetailDrawer";
import MarketQuickSearchPills from "@/components/dashboard/market/MarketQuickSearchPills";
import { useMarketDirectBuyState } from "@/lib/hooks/useMarketDirectBuyState";
import { useMarketWatchlist } from "@/lib/hooks/useMarketWatchlist";
import type { MarketListing, MktTimeframe, LiveChecklist } from "@/components/dashboard/market/types";

interface MarketDirectBuyTabProps {
  paperMode: boolean;
  walletAddress?: `0x${string}`;
  liveChecklist: LiveChecklist;
  onTradePlaced?: () => void | Promise<void>;
}

const QUICK_TIMEFRAMES: { key: MktTimeframe; label: string }[] = [
  { key: "hour", label: "Next hour" },
  { key: "day", label: "Today" },
  { key: "week", label: "This week" },
  { key: "month", label: "This month" },
  { key: "year", label: "This year" },
  { key: "all", label: "Any time" },
];

const fmt = (v: number) => `$${v.toFixed(2)}`;

export default function MarketDirectBuyTab({ paperMode, walletAddress, liveChecklist, onTradePlaced }: MarketDirectBuyTabProps) {
  const s = useMarketDirectBuyState({ paperMode, walletAddress, liveChecklist, onTradePlaced });
  const watchlist = useMarketWatchlist();
  const [detailMarket, setDetailMarket] = useState<MarketListing | null>(null);

  const applyPreset = (presetId: string) => {
    s.clearFilters();
    if (presetId === "weather-hour") {
      s.setQuery("weather"); s.setTimeframe("hour"); s.setSortBy("endDate");
    } else if (presetId === "bitcoin-month") {
      s.setQuery("bitcoin"); s.setTimeframe("month"); s.setSortBy("volume");
    } else if (presetId === "election-week") {
      s.setQuery("election"); s.setTimeframe("week"); s.setSortBy("volume");
    } else if (presetId === "closing-soon") {
      s.setTimeframe("day"); s.setSortBy("endDate"); s.setMinVolume(5000);
    } else if (presetId === "high-liquidity") {
      s.setSortBy("volume"); s.setMinVolume(50000); s.setMinLiquidity(50000);
    } else if (presetId === "moonshots") {
      s.setTimeframe("month"); s.setSortBy("edge"); s.setProbMin(5); s.setProbMax(35); s.setMinVolume(1000);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="overflow-hidden rounded-[32px] border border-slate-200 bg-[radial-gradient(circle_at_top_left,rgba(255,124,32,0.12),transparent_25%),linear-gradient(135deg,#ffffff,#f4f7fb)] p-5 shadow-sm">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">Manual trading workspace</p>
          <h2 className="mt-2 text-3xl font-black text-slate-900">Browse prediction markets</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">Search events, filter by topic and time, then open a market to review pricing and place a trade.</p>
        </div>
        <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-500">
          <span className="rounded-full border border-slate-200 bg-white/80 px-3 py-1 font-semibold text-slate-700">Mode: {paperMode ? "Practice by default" : "Live-ready by default"}</span>
          <span className="rounded-full border border-slate-200 bg-white/80 px-3 py-1">{s.fetchModeLabel}</span>
          {s.buyMarket && <span className="rounded-full border border-orange-200 bg-orange-50 px-3 py-1 font-semibold text-orange-700">Trade ticket open</span>}
        </div>
        <div className="mt-4">
          <MarketQuickSearchPills onApplyPreset={applyPreset} />
        </div>
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
            placeholder="Search events (example: election, bitcoin, weather)"
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

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <label className="text-xs text-gray-600">
            Time range
            <select
              value={s.timeframe}
              onChange={(e) => s.setTimeframe(e.target.value as MktTimeframe)}
              className="mt-1 w-full border border-gray-200 rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4D00]/30"
            >
              {QUICK_TIMEFRAMES.map((tf) => (
                <option key={tf.key} value={tf.key}>{tf.label}</option>
              ))}
            </select>
          </label>
          <label className="text-xs text-gray-600">
            Topic
            <select
              value={s.category}
              onChange={(e) => s.setCategory(e.target.value)}
              className="mt-1 w-full border border-gray-200 rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4D00]/30"
            >
              <option value="all">All topics</option>
              {s.availableCategories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </label>
          <label className="text-xs text-gray-600">
            Sort results by
            <select
              value={s.sortBy}
              onChange={(e) => s.setSortBy(e.target.value as typeof s.sortBy)}
              className="mt-1 w-full border border-gray-200 rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4D00]/30"
            >
              <option value="edge">Best value</option>
              <option value="volume">Most active</option>
              <option value="probability">Most likely</option>
              <option value="endDate">Ending soon</option>
              <option value="title">Name A-Z</option>
            </select>
          </label>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => s.setFiltersOpen(!s.filtersOpen)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition"
          >
            {s.filtersOpen ? "Hide extra filters" : "Show extra filters"}
          </button>
          <button
            onClick={s.clearFilters}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition"
          >
            Reset filters
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
              {s.filteredCount > 0 && " · showing all matches"}
            </span>
            <span>{s.fetchModeLabel}</span>
          </div>

          <MarketDirectBuyResults
            markets={s.filteredMarkets}
            sortBy={s.sortBy}
            sortDirection={s.sortDirection}
            tableInsights={s.tableInsights}
            onToggleSort={s.toggleSort}
            savedMarketIds={watchlist.items.map((item) => item.marketId)}
            onToggleSave={(market) => void watchlist.toggleSave(market)}
            onBuy={s.openBuyPanel}
            onOpenDetails={setDetailMarket}
          />
        </>
      )}

      <MarketListingDetailDrawer
        market={detailMarket}
        isSaved={detailMarket ? watchlist.isSaved(detailMarket.id) : false}
        onClose={() => setDetailMarket(null)}
        onToggleSave={(market) => void watchlist.toggleSave(market)}
        onBuy={(market, outcome) => {
          setDetailMarket(null);
          s.openBuyPanel(market, outcome);
        }}
      />
    </div>
  );
}
