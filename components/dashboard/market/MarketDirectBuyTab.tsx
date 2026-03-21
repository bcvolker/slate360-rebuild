"use client";

import React, { useState } from "react";
import MarketBuyPanel from "@/components/dashboard/market/MarketBuyPanel";
import MarketAdvancedFilters from "@/components/dashboard/market/MarketAdvancedFilters";
import MarketDirectBuyResults from "@/components/dashboard/market/MarketDirectBuyResults";
import MarketListingDetailDrawer from "@/components/dashboard/market/MarketListingDetailDrawer";
import { useMarketDirectBuyState } from "@/lib/hooks/useMarketDirectBuyState";
import { useMarketWatchlist } from "@/lib/hooks/useMarketWatchlist";
import type { MarketListing, MktTimeframe, LiveChecklist } from "@/components/dashboard/market/types";

interface MarketDirectBuyTabProps {
  paperMode: boolean;
  walletAddress?: `0x${string}`;
  liveChecklist: LiveChecklist;
  onTradePlaced?: () => void | Promise<void>;
  onOpenAutomation?: () => void;
  onNavigate?: (tabId: string) => void;
}

const CATEGORIES = ["Sports", "Politics", "Crypto", "Entertainment", "Science"] as const;

const QUICK_TIMEFRAMES: { key: MktTimeframe; label: string }[] = [
  { key: "hour", label: "Next hour" },
  { key: "day", label: "Today" },
  { key: "week", label: "This week" },
  { key: "month", label: "This month" },
  { key: "year", label: "This year" },
  { key: "all", label: "Any time" },
];

const SORT_LABELS: Record<string, string> = {
  edge: "Best Opportunity", volume: "Most Active", probability: "Most Likely", endDate: "Ending Soon", title: "A–Z",
};

const fmt = (v: number) => `$${v.toFixed(2)}`;
const DEFAULT_DETAIL_AMOUNT = 50;

export default function MarketDirectBuyTab({
  paperMode, walletAddress, liveChecklist, onTradePlaced, onNavigate,
}: MarketDirectBuyTabProps) {
  const s = useMarketDirectBuyState({ paperMode, walletAddress, liveChecklist, onTradePlaced });
  const watchlist = useMarketWatchlist();
  const [detailMarket, setDetailMarket] = useState<MarketListing | null>(null);
  const [detailAmount, setDetailAmount] = useState(DEFAULT_DETAIL_AMOUNT);
  const [expertMode, setExpertMode] = useState(false);

  const hasBuy = Boolean(s.buyMarket);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") s.fetchMarkets();
  };

  const handleCategoryPick = (cat: string) => {
    s.setCategory(cat);
    s.fetchMarkets();
  };

  /* ---------- Empty state (before first search) ---------- */
  const emptyState = (
    <div className="flex flex-col items-center justify-center py-16 gap-6 text-slate-400">
      <p className="text-sm">Search for prediction markets above, or pick a category to get started.</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full max-w-md">
        {CATEGORIES.map((cat) => (
          <button key={cat} onClick={() => handleCategoryPick(cat)}
            className="rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm font-medium text-slate-200 transition hover:border-[#FF4D00] hover:bg-[#FF4D00]/10">
            {cat}
          </button>
        ))}
      </div>
    </div>
  );

  /* ---------- Active filter chips ---------- */
  const chips: { label: string; clear: () => void }[] = [
    s.query.trim() ? { label: `"${s.query.trim()}"`, clear: () => s.setQuery("") } : null,
    s.timeframe !== "all" ? { label: `Time: ${QUICK_TIMEFRAMES.find(t => t.key === s.timeframe)?.label ?? s.timeframe}`, clear: () => s.setTimeframe("all") } : null,
    s.category !== "all" ? { label: `Topic: ${s.category}`, clear: () => s.setCategory("all") } : null,
    s.sortBy !== "edge" ? { label: `Sort: ${SORT_LABELS[s.sortBy] ?? s.sortBy}`, clear: () => s.setSortBy("edge") } : null,
    s.minEdge > 0 ? { label: `Value ≥${s.minEdge}%`, clear: () => s.setMinEdge(0) } : null,
    s.minVolume > 0 ? { label: `Activity ≥$${s.minVolume.toLocaleString()}`, clear: () => s.setMinVolume(0) } : null,
    s.minLiquidity > 0 ? { label: `Depth ≥$${s.minLiquidity.toLocaleString()}`, clear: () => s.setMinLiquidity(0) } : null,
    s.maxSpread < 100 ? { label: `Gap ≤${s.maxSpread}%`, clear: () => s.setMaxSpread(100) } : null,
    s.riskTag !== "all" ? { label: s.riskTag, clear: () => s.setRiskTag("all") } : null,
    (s.probMin > 0 || s.probMax < 100) ? { label: `${s.probMin}–${s.probMax}%`, clear: () => { s.setProbMin(0); s.setProbMax(100); } } : null,
  ].filter((c): c is { label: string; clear: () => void } => c !== null);

  return (
    <div className="text-slate-100">
      {/* ---- Header: search + filters ---- */}
      <div className="mb-5 space-y-3 rounded-2xl border border-zinc-800 bg-zinc-950/80 p-4">
        <div className="flex gap-2">
          <input type="text" value={s.query} onChange={e => s.setQuery(e.target.value)} onKeyDown={handleKeyDown}
            placeholder="Search markets (e.g. election, bitcoin, weather)"
            className="flex-1 rounded-lg border border-zinc-800 bg-zinc-900/90 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#FF4D00]/40" />
          <button onClick={() => s.fetchMarkets()} disabled={s.loading}
            className="rounded-lg bg-[#FF4D00] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#e04400] disabled:opacity-50">
            {s.loading ? "…" : s.loaded ? "Refresh" : "Search"}
          </button>
        </div>

        {/* Basic filters row */}
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-[11px] text-slate-400">
            Time
            <select value={s.timeframe} onChange={e => s.setTimeframe(e.target.value as MktTimeframe)}
              className="mt-0.5 block w-28 rounded-md border border-zinc-800 bg-zinc-900/90 px-2 py-1 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#FF4D00]/30">
              {QUICK_TIMEFRAMES.map(tf => <option key={tf.key} value={tf.key}>{tf.label}</option>)}
            </select>
          </label>
          <label className="text-[11px] text-slate-400">
            Topic
            <select value={s.category} onChange={e => s.setCategory(e.target.value)}
              className="mt-0.5 block w-28 rounded-md border border-zinc-800 bg-zinc-900/90 px-2 py-1 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#FF4D00]/30">
              <option value="all">All</option>
              {s.availableCategories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <label className="text-[11px] text-slate-400">
            Sort
            <select value={s.sortBy} onChange={e => s.setSortBy(e.target.value as typeof s.sortBy)}
              className="mt-0.5 block w-32 rounded-md border border-zinc-800 bg-zinc-900/90 px-2 py-1 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#FF4D00]/30">
              {Object.entries(SORT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </label>
          <button onClick={() => setExpertMode(!expertMode)}
            className="rounded-md bg-zinc-900 px-2 py-1 text-[11px] font-medium text-slate-300 transition hover:bg-zinc-800">
            {expertMode ? "− Expert" : "+ Expert"}
          </button>
          <button onClick={s.clearFilters}
            className="rounded-md bg-zinc-900 px-2 py-1 text-[11px] font-medium text-slate-300 transition hover:bg-zinc-800">Reset</button>
        </div>

        {/* Expert-mode advanced filters */}
        {expertMode && (
          <MarketAdvancedFilters
            minEdge={s.minEdge} onMinEdgeChange={s.setMinEdge}
            probMin={s.probMin} onProbMinChange={s.setProbMin}
            probMax={s.probMax} onProbMaxChange={s.setProbMax}
            sortBy={s.sortBy} onSortByChange={s.setSortBy}
            category={s.category} onCategoryChange={s.setCategory}
            availableCategories={s.availableCategories}
            riskTag={s.riskTag} onRiskTagChange={s.setRiskTag}
            minVolume={s.minVolume} onMinVolumeChange={s.setMinVolume}
            minLiquidity={s.minLiquidity} onMinLiquidityChange={s.setMinLiquidity}
            maxSpread={s.maxSpread} onMaxSpreadChange={s.setMaxSpread}
          />
        )}

        {/* Filter chips */}
        {chips.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-slate-400">
            {chips.map(c => (
              <button key={c.label} onClick={c.clear}
                className="group flex items-center gap-1 rounded-lg border border-cyan-500/25 bg-cyan-500/10 px-2 py-0.5 text-cyan-200 hover:border-cyan-400/40">
                {c.label} <span className="text-cyan-400/40 group-hover:text-cyan-200">×</span>
              </button>
            ))}
            <span className="rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-0.5">
              {s.filteredCount}/{s.loadedMarketCount.toLocaleString()}
            </span>
          </div>
        )}
      </div>

      {/* ---- Content: empty state OR results + buy panel ---- */}
      {!s.loaded && !s.loading ? emptyState : (
        <div className="grid grid-cols-12 gap-4 items-start">
          {/* Left: results */}
          <div className={`space-y-3 ${hasBuy ? "col-span-12 lg:col-span-8" : "col-span-12"}`}>
            {s.loading && (
              <div className="flex items-center justify-center gap-2 py-6">
                <div className="animate-spin w-4 h-4 border-2 border-[#FF4D00] border-t-transparent rounded-full" />
                <span className="text-xs text-slate-400">Loading markets…</span>
              </div>
            )}
            {s.loaded && !s.loading && (
              <>
                {s.loadError && (
                  <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-2 text-sm text-amber-100">{s.loadError}</div>
                )}
                <div className="flex items-center justify-between px-1 text-xs text-slate-400">
                  <span>{s.filteredCount} market{s.filteredCount !== 1 ? "s" : ""}</span>
                </div>
                <MarketDirectBuyResults
                  markets={s.filteredMarkets} sortBy={s.sortBy} sortDirection={s.sortDirection}
                  tableInsights={s.tableInsights} onToggleSort={s.toggleSort}
                  savedMarketIds={watchlist.items.map(i => i.marketId)} onToggleSave={m => void watchlist.toggleSave(m)}
                  onBuy={s.openBuyPanel} onOpenDetails={(m) => { setDetailMarket(m); setDetailAmount(DEFAULT_DETAIL_AMOUNT); }}
                />
              </>
            )}
          </div>

          {/* Right sidebar: buy panel (lg+) */}
          {hasBuy && s.buyMarket && (
            <aside className="hidden lg:block col-span-4 sticky top-4 space-y-3">
              <MarketBuyPanel
                market={s.buyMarket} outcome={s.buyOutcome} amount={s.buyAmount} paper={s.buyPaper}
                submitting={s.buySubmitting} success={s.buySuccess} liveChecklist={liveChecklist}
                payloadReady={s.buyPayloadReady} payloadIssues={s.buyPayloadIssues} formatMoney={fmt}
                onOutcomeChange={s.setBuyOutcome} onAmountChange={s.setBuyAmount}
                onPaperToggle={() => s.setBuyPaper(!s.buyPaper)} onSubmit={s.handleBuy} onClose={s.closeBuyPanel}
                inline onOpenResults={onNavigate ? () => onNavigate("results") : undefined}
              />
            </aside>
          )}
        </div>
      )}

      {/* Mobile buy panel overlay (below lg) */}
      {s.buyMarket && (
        <div className="lg:hidden mt-3">
          <MarketBuyPanel
            market={s.buyMarket} outcome={s.buyOutcome} amount={s.buyAmount} paper={s.buyPaper}
            submitting={s.buySubmitting} success={s.buySuccess} liveChecklist={liveChecklist}
            payloadReady={s.buyPayloadReady} payloadIssues={s.buyPayloadIssues} formatMoney={fmt}
            onOutcomeChange={s.setBuyOutcome} onAmountChange={s.setBuyAmount}
            onPaperToggle={() => s.setBuyPaper(!s.buyPaper)} onSubmit={s.handleBuy} onClose={s.closeBuyPanel}
            onOpenResults={onNavigate ? () => onNavigate("results") : undefined}
          />
        </div>
      )}

      {/* Detail drawer */}
      <MarketListingDetailDrawer
        market={detailMarket} paperMode={paperMode} draftAmount={detailAmount}
        onDraftAmountChange={setDetailAmount}
        isSaved={detailMarket ? watchlist.isSaved(detailMarket.id) : false}
        onClose={() => setDetailMarket(null)}
        onToggleSave={m => void watchlist.toggleSave(m)}
        onBuy={(m, outcome, amount) => { setDetailMarket(null); s.openBuyPanel(m, outcome, amount); }}
      />
    </div>
  );
}

