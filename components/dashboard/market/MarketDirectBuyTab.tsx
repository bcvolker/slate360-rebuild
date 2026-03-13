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
  onOpenAutomation?: () => void;
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
const DEFAULT_DETAIL_AMOUNT = 50;

export default function MarketDirectBuyTab({ paperMode, walletAddress, liveChecklist, onTradePlaced }: MarketDirectBuyTabProps) {
  const s = useMarketDirectBuyState({ paperMode, walletAddress, liveChecklist, onTradePlaced });
  const watchlist = useMarketWatchlist();
  const [detailMarket, setDetailMarket] = useState<MarketListing | null>(null);
  const [detailAmount, setDetailAmount] = useState(DEFAULT_DETAIL_AMOUNT);

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

  const searchTerm = s.query.trim();
  const activeFilters = [
    s.timeframe !== "all" ? `Time: ${QUICK_TIMEFRAMES.find((tf) => tf.key === s.timeframe)?.label ?? s.timeframe}` : null,
    s.category !== "all" ? `Topic: ${s.category}` : null,
    s.minEdge > 0 ? `Min edge: ${s.minEdge}%` : null,
    s.minVolume > 0 ? `Min volume: $${s.minVolume.toLocaleString()}` : null,
    s.minLiquidity > 0 ? `Min liquidity: $${s.minLiquidity.toLocaleString()}` : null,
    s.maxSpread < 100 ? `Spread <= ${s.maxSpread}%` : null,
    s.riskTag !== "all" ? `Risk tag: ${s.riskTag}` : null,
    s.probMin > 0 || s.probMax < 100 ? `Prob: ${s.probMin}% to ${s.probMax}%` : null,
  ].filter((chip): chip is string => chip !== null);

  const openDetails = (market: MarketListing) => {
    setDetailMarket(market);
    setDetailAmount(DEFAULT_DETAIL_AMOUNT);
  };

  return (
    <div className="space-y-3 text-slate-100">
      {/* Compact header strip */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-2.5">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-bold text-slate-100">Market Search</h2>
          <span className="rounded-full border border-slate-700 bg-slate-900 px-2.5 py-0.5 text-[10px] text-slate-400">Keyword matching</span>
          <span className="rounded-full border border-slate-700 bg-slate-900 px-2.5 py-0.5 text-[10px] text-slate-400">{s.fetchModeLabel}</span>
        </div>
        <MarketQuickSearchPills onApplyPreset={applyPreset} />
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
      <div className="space-y-2 rounded-xl border border-slate-800 bg-slate-950/80 p-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={s.query}
            onChange={e => s.setQuery(e.target.value)}
            placeholder="Search events (example: election, bitcoin, weather)"
            className="flex-1 rounded-lg border border-slate-700 bg-slate-900/90 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400/30"
          />
          <button
            onClick={() => s.fetchMarkets()}
            disabled={s.loading}
            className="rounded-lg bg-[#FF4D00] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#e04400] disabled:opacity-50"
          >
            {s.loading ? "…" : s.loaded ? "Refresh" : "Search"}
          </button>
        </div>

        <div className="flex flex-wrap items-end gap-2">
          <label className="text-[11px] text-slate-400">
            Time
            <select value={s.timeframe} onChange={(e) => s.setTimeframe(e.target.value as MktTimeframe)} className="mt-0.5 block w-28 rounded-md border border-slate-700 bg-slate-900/90 px-2 py-1.5 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-cyan-400/30">
              {QUICK_TIMEFRAMES.map((tf) => <option key={tf.key} value={tf.key}>{tf.label}</option>)}
            </select>
          </label>
          <label className="text-[11px] text-slate-400">
            Topic
            <select value={s.category} onChange={(e) => s.setCategory(e.target.value)} className="mt-0.5 block w-28 rounded-md border border-slate-700 bg-slate-900/90 px-2 py-1.5 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-cyan-400/30">
              <option value="all">All topics</option>
              {s.availableCategories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <label className="text-[11px] text-slate-400">
            Sort
            <select value={s.sortBy} onChange={(e) => s.setSortBy(e.target.value as typeof s.sortBy)} className="mt-0.5 block w-28 rounded-md border border-slate-700 bg-slate-900/90 px-2 py-1.5 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-cyan-400/30">
              <option value="edge">Best value</option>
              <option value="volume">Most active</option>
              <option value="probability">Most likely</option>
              <option value="endDate">Ending soon</option>
              <option value="title">Name A-Z</option>
            </select>
          </label>
          <button onClick={() => s.setFiltersOpen(!s.filtersOpen)} className="rounded-md bg-slate-900 px-2.5 py-1.5 text-[11px] font-medium text-slate-300 transition hover:bg-slate-800">
            {s.filtersOpen ? "− Filters" : "+ Filters"}
          </button>
          <button onClick={s.clearFilters} className="rounded-md bg-slate-900 px-2.5 py-1.5 text-[11px] font-medium text-slate-300 transition hover:bg-slate-800">Reset</button>
        </div>

        {/* Active filter chips – compact inline */}
        {(searchTerm.length > 0 || activeFilters.length > 0) && (
          <div className="flex flex-wrap gap-1.5 text-[10px] text-slate-400">
            {searchTerm.length > 0 && <span className="rounded-full border border-slate-700 bg-slate-950 px-2 py-0.5">&ldquo;{searchTerm}&rdquo;</span>}
            {activeFilters.map((f) => <span key={f} className="rounded-full border border-cyan-500/25 bg-cyan-500/10 px-2 py-0.5 text-cyan-200">{f}</span>)}
            <span className="rounded-full border border-slate-700 bg-slate-950 px-2 py-0.5">{s.filteredCount}/{s.loadedMarketCount.toLocaleString()}</span>
          </div>
        )}

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

      {/* Loading state */}
      {(!s.loaded || s.loading) && (
        <div className="flex items-center justify-center gap-2 py-6">
          <div className="animate-spin w-4 h-4 border-2 border-[#FF4D00] border-t-transparent rounded-full" />
          <span className="text-xs text-slate-400">Loading markets…</span>
        </div>
      )}

      {/* Results */}
      {s.loaded && !s.loading && (
        <>
          {s.loadError && (
            <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
              {s.loadError}
            </div>
          )}
          <div className="flex items-center justify-between px-1 text-xs text-slate-400">
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
            onOpenDetails={openDetails}
          />
        </>
      )}

      <MarketListingDetailDrawer
        market={detailMarket}
        paperMode={paperMode}
        draftAmount={detailAmount}
        onDraftAmountChange={setDetailAmount}
        isSaved={detailMarket ? watchlist.isSaved(detailMarket.id) : false}
        onClose={() => setDetailMarket(null)}
        onToggleSave={(market) => void watchlist.toggleSave(market)}
        onBuy={(market, outcome, amount) => {
          setDetailMarket(null);
          s.openBuyPanel(market, outcome, amount);
        }}
      />
    </div>
  );
}
