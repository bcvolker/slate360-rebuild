"use client";

import React from "react";
import MarketActivityFeed from "@/components/dashboard/market/MarketActivityFeed";
import MarketOpenPositionsPanel from "@/components/dashboard/market/MarketOpenPositionsPanel";
import MarketTradeReplayDrawer from "@/components/dashboard/market/MarketTradeReplayDrawer";
import { HelpTip } from "@/components/dashboard/market/MarketSharedUi";
import { useMarketResultsState } from "@/lib/hooks/useMarketResultsState";
import { outcomePlainLabel, tradeModeLabel } from "@/lib/market/market-display";
import type { MarketTrade, MarketActivityLogEntry } from "@/components/dashboard/market/types";

interface MarketResultsTabProps {
  trades: MarketTrade[];
  activityLogs: MarketActivityLogEntry[];
}

function formatDuration(ms: number): string {
  if (ms <= 0) return "—";
  const mins = Math.round(ms / 60_000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.round(hrs / 24)}d`;
}

function PnlValue({ value, prefix = "" }: { value: number; prefix?: string }) {
  const color = value > 0 ? "text-green-600" : value < 0 ? "text-red-600" : "text-gray-600";
  return <span className={`font-bold ${color}`}>{prefix}{value >= 0 ? "+" : ""}${value.toFixed(2)}</span>;
}

function StatCard({ label, children, tip }: { label: string; children: React.ReactNode; tip?: string }) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-white/90 p-4 text-center shadow-sm">
      <p className="text-[11px] text-slate-400 uppercase tracking-[0.18em] mb-1 flex items-center justify-center gap-0.5">
        {label}{tip && <HelpTip content={tip} />}
      </p>
      <div className="text-lg">{children}</div>
    </div>
  );
}

export default function MarketResultsTab({ trades, activityLogs }: MarketResultsTabProps) {
  const openPositions = trades.filter((trade) => trade.status === "open" && !trade.closedAt);
  const {
    analytics, sortedTrades, sortKey, sortDir, filterMode,
    setSortKey, toggleSortDir, setFilterMode,
    selectedReplay, openReplay, closeReplay, recentLogs,
  } = useMarketResultsState(trades, activityLogs);

  const { realizedPnl, unrealizedPnl, feeAdjustedPnl, expectancy, profitFactor, winRate, avgHoldTimeMs, totalTrades, openTrades, closedTrades, pnlByCategory, paperVsLive } = analytics;

  return (
    <div className="space-y-5">
      <div className="rounded-[32px] border border-slate-200 bg-[radial-gradient(circle_at_top_left,rgba(255,124,32,0.12),transparent_26%),linear-gradient(135deg,rgba(255,255,255,0.96),rgba(244,247,251,0.96))] p-5 shadow-sm">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Performance workspace</p>
        <h2 className="mt-2 text-3xl font-black text-slate-900">See what the robot and your positions are actually doing</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">Track open exposure, review closed trades, and inspect why any position exists. Open positions and history rows now drill into a dedicated detail drawer instead of stopping at a summary card.</p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        <StatCard label="Realized P/L" tip="Profit or loss from closed trades"><PnlValue value={realizedPnl} /></StatCard>
        <StatCard label="Unrealized P/L" tip="Current P/L on open positions"><PnlValue value={unrealizedPnl} /></StatCard>
        <StatCard label="Fee-Adj P/L" tip="Total P/L minus estimated 2% fees"><PnlValue value={feeAdjustedPnl} /></StatCard>
        <StatCard label="Win Rate"><span className="font-bold text-gray-900">{winRate}%</span></StatCard>
        <StatCard label="Expectancy" tip="Average P/L per trade"><PnlValue value={expectancy} /></StatCard>
        <StatCard label="Profit Factor" tip="Gross wins / gross losses. Above 1.0 = profitable">
          <span className={`font-bold ${profitFactor >= 1 ? "text-green-600" : "text-red-600"}`}>{profitFactor >= 999 ? "∞" : profitFactor.toFixed(2)}</span>
        </StatCard>
      </div>

      {/* Secondary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Total Trades"><span className="font-bold text-gray-900">{totalTrades}</span></StatCard>
        <StatCard label="Open"><span className="font-bold text-blue-600">{openTrades}</span></StatCard>
        <StatCard label="Closed"><span className="font-bold text-gray-700">{closedTrades}</span></StatCard>
        <StatCard label="Avg Hold Time"><span className="font-bold text-gray-900">{formatDuration(avgHoldTimeMs)}</span></StatCard>
      </div>

      {/* P/L by Category + Paper vs Live */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-[28px] border border-slate-200 bg-white/90 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">P/L by Category</h3>
          {pnlByCategory.length === 0
            ? <p className="text-sm text-gray-400 py-4 text-center">No trades yet</p>
            : (
              <div className="space-y-2">
                {pnlByCategory.map((c) => (
                  <div key={c.category} className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">{c.category} <span className="text-gray-400">({c.count})</span></span>
                    <PnlValue value={c.pnl} />
                  </div>
                ))}
              </div>
            )}
        </div>

        <div className="rounded-[28px] border border-slate-200 bg-white/90 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Paper vs Live</h3>
          <div className="space-y-3">
            {paperVsLive.map((row) => (
              <div key={row.mode} className="flex items-center justify-between text-sm">
                <div>
                  <span className={`inline-block w-3 h-3 rounded-full mr-2 ${row.mode === "paper" ? "bg-purple-500" : "bg-green-500"}`} />
                  <span className="text-gray-700 capitalize">{row.mode}</span>
                  <span className="text-gray-400 ml-1">({row.count} trades, {row.winRate.toFixed(1)}% win)</span>
                </div>
                <PnlValue value={row.pnl} />
              </div>
            ))}
          </div>
        </div>
      </div>

      <MarketOpenPositionsPanel trades={openPositions} onOpenTrade={openReplay} />

      {/* Trade list */}
      <div className="rounded-[28px] border border-slate-200 bg-white/90 p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <h3 className="text-lg font-black text-slate-900">Trade history</h3>
          <div className="flex items-center gap-2">
            {(["all", "paper", "live"] as const).map((m) => (
              <button key={m} onClick={() => setFilterMode(m)}
                className={`px-3 py-1 text-xs rounded-full font-medium transition ${filterMode === m ? "bg-[#FF4D00] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                {m === "all" ? "All" : m === "paper" ? "Paper" : "Live"}
              </button>
            ))}
            <select value={sortKey} onChange={(e) => setSortKey(e.target.value as typeof sortKey)}
              className="text-xs bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 text-gray-700 outline-none">
              <option value="date">Sort: Date</option>
              <option value="pnl">Sort: P/L</option>
              <option value="category">Sort: Category</option>
            </select>
            <button onClick={toggleSortDir} className="text-xs text-gray-500 hover:text-gray-700 px-1">
              {sortDir === "desc" ? "↓" : "↑"}
            </button>
          </div>
        </div>

        {sortedTrades.length === 0
          ? <p className="text-sm text-gray-400 py-8 text-center">No trades match current filters</p>
          : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {sortedTrades.slice(0, 50).map((t) => (
                <button key={t.id} onClick={() => openReplay(t)}
                  className="w-full text-left rounded-[24px] border border-slate-200 bg-[linear-gradient(135deg,rgba(255,255,255,0.94),rgba(246,248,251,0.94))] px-4 py-4 flex items-center justify-between gap-3 transition hover:border-[#FF4D00]/30 hover:shadow-sm">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-slate-800 font-semibold truncate">{t.marketTitle}</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {outcomePlainLabel(t.outcome)} · {t.shares} shares @ ${t.avgPrice.toFixed(3)} · {t.category ?? "—"}
                      <span className="ml-1 text-slate-500">· {tradeModeLabel(t)}</span>
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <PnlValue value={t.pnl ?? 0} />
                    <p className="text-[10px] text-slate-400">{new Date(t.createdAt).toLocaleDateString()}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
      </div>

      <MarketActivityFeed logs={recentLogs} title="Robot activity and execution log" emptyLabel="No scans, plan syncs, or trade events are visible yet." />

      {/* Trade replay drawer */}
      {selectedReplay && <MarketTradeReplayDrawer replay={selectedReplay} onClose={closeReplay} />}
    </div>
  );
}
