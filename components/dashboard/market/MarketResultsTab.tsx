"use client";

import React from "react";
import MarketActivityFeed from "@/components/dashboard/market/MarketActivityFeed";
import MarketOpenPositionsPanel from "@/components/dashboard/market/MarketOpenPositionsPanel";
import MarketResultsInsights from "@/components/dashboard/market/MarketResultsInsights";
import MarketTradeReplayDrawer from "@/components/dashboard/market/MarketTradeReplayDrawer";
import MarketResultsVerificationConsole, { type ResultsWalletSnapshot } from "@/components/dashboard/market/MarketResultsVerificationConsole";
import { HelpTip } from "@/components/dashboard/market/MarketSharedUi";
import { useMarketResultsState } from "@/lib/hooks/useMarketResultsState";
import { outcomePlainLabel, tradeModeLabel } from "@/lib/market/market-display";
import type { MarketTrade, MarketActivityLogEntry } from "@/components/dashboard/market/types";
import type { MarketSystemStatusViewModel } from "@/lib/market/contracts";
import type { ServerBotStatus } from "@/lib/hooks/useMarketServerStatus";

interface MarketResultsTabProps {
  trades: MarketTrade[];
  activityLogs: MarketActivityLogEntry[];
  onRefresh: () => Promise<void>;
  system: MarketSystemStatusViewModel | null;
  systemLoading: boolean;
  systemError: string | null;
  serverStatus: ServerBotStatus;
  walletSnapshot: ResultsWalletSnapshot;
  postActionContext: string | null;
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
    <div className="rounded-2xl border border-slate-700 bg-slate-900/80 p-4 text-center">
      <p className="text-[11px] text-slate-500 uppercase tracking-[0.18em] mb-1 flex items-center justify-center gap-0.5">
        {label}{tip && <HelpTip content={tip} />}
      </p>
      <div className="text-lg">{children}</div>
    </div>
  );
}

export default function MarketResultsTab({
  trades,
  activityLogs,
  onRefresh,
  system,
  systemLoading,
  systemError,
  serverStatus,
  walletSnapshot,
  postActionContext,
}: MarketResultsTabProps) {
  const openPositions = trades.filter((trade) => trade.status === "open" && !trade.closedAt);
  const [showAdvanced, setShowAdvanced] = React.useState(false);
  const recentTradeCount = Math.min(trades.length, 10);
  const recentActivityCount = Math.min(activityLogs.length, 10);
  const {
    analytics, sortedTrades, sortKey, sortDir, filterMode,
    setSortKey, toggleSortDir, setFilterMode,
    selectedReplay, openReplay, closeReplay, recentLogs,
  } = useMarketResultsState(trades, activityLogs);

  const { realizedPnl, unrealizedPnl, feeAdjustedPnl, expectancy, profitFactor, winRate, avgHoldTimeMs, totalTrades, openTrades, closedTrades, pnlByCategory, paperVsLive } = analytics;

  return (
    <div className="space-y-5">
      <div className="rounded-[32px] border border-cyan-500/20 bg-[linear-gradient(135deg,rgba(8,15,31,0.96),rgba(15,23,42,0.96))] p-5 shadow-[0_24px_80px_rgba(2,6,23,0.55)]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-300/80">Results Verification Surface</p>
        <h2 className="mt-2 text-3xl font-black text-slate-50">Verify outcomes after every action</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">Use this as your operator console: open positions, latest history, recent activity, wallet snapshot, and live blockers in one place.</p>
      </div>
      <MarketResultsVerificationConsole
        openPositionsCount={openPositions.length}
        recentTradeCount={recentTradeCount}
        recentActivityCount={recentActivityCount}
        system={system}
        systemLoading={systemLoading}
        systemError={systemError}
        serverStatus={serverStatus}
        walletSnapshot={walletSnapshot}
        postActionContext={postActionContext}
      />

      {/* Key stats — 3 essential cards */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Total Profit / Loss" tip="How much you've made or lost from closed trades"><PnlValue value={realizedPnl} /></StatCard>
        <StatCard label="Win Rate" tip="Percentage of trades that were profitable"><span className="font-bold text-slate-100">{winRate}%</span></StatCard>
        <StatCard label="Trades"><span className="font-bold text-slate-100">{totalTrades} <span className="text-sm font-normal text-slate-500">({openTrades} open)</span></span></StatCard>
      </div>

      <MarketResultsInsights analytics={analytics} />

      {/* Expandable advanced metrics */}
      <button
        onClick={() => setShowAdvanced(v => !v)}
        className="text-xs font-medium text-slate-500 hover:text-slate-300 transition"
      >
        {showAdvanced ? "▲ Hide detailed stats" : "▼ Show detailed stats"}
      </button>
      {showAdvanced && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="Open P/L" tip="Current profit/loss on positions not yet resolved"><PnlValue value={unrealizedPnl} /></StatCard>
            <StatCard label="After Fees" tip="Total profit/loss minus estimated 2% trading fees"><PnlValue value={feeAdjustedPnl} /></StatCard>
            <StatCard label="Avg per Trade" tip="Average profit/loss per trade"><PnlValue value={expectancy} /></StatCard>
            <StatCard label="Win/Loss Ratio" tip="Total winnings divided by total losses — above 1.0 means profitable overall">
              <span className={`font-bold ${profitFactor >= 1 ? "text-green-400" : "text-red-400"}`}>{profitFactor >= 999 ? "∞" : profitFactor.toFixed(2)}</span>
            </StatCard>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <StatCard label="Closed"><span className="font-bold text-slate-200">{closedTrades}</span></StatCard>
            <StatCard label="Avg Hold Time"><span className="font-bold text-slate-100">{formatDuration(avgHoldTimeMs)}</span></StatCard>
          </div>

          {/* P/L by Category + Practice vs Live */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-slate-700 bg-slate-900/80 p-5">
              <h3 className="text-sm font-semibold text-slate-200 mb-3">Profit/Loss by Topic</h3>
              {pnlByCategory.length === 0
                ? <p className="text-sm text-slate-500 py-4 text-center">No trades yet</p>
                : (
                  <div className="space-y-2">
                    {pnlByCategory.map((c) => (
                      <div key={c.category} className="flex items-center justify-between text-sm">
                        <span className="text-slate-300">{c.category} <span className="text-slate-500">({c.count})</span></span>
                        <PnlValue value={c.pnl} />
                      </div>
                    ))}
                  </div>
                )}
            </div>

            <div className="rounded-2xl border border-slate-700 bg-slate-900/80 p-5">
              <h3 className="text-sm font-semibold text-slate-200 mb-3">Practice vs Live</h3>
              <div className="space-y-3">
                {paperVsLive.map((row) => (
                  <div key={row.mode} className="flex items-center justify-between text-sm">
                    <div>
                      <span className={`inline-block w-3 h-3 rounded-full mr-2 ${row.mode === "paper" ? "bg-purple-500" : "bg-green-500"}`} />
                      <span className="text-slate-200 capitalize">{row.mode === "paper" ? "Practice" : "Live"}</span>
                      <span className="text-slate-500 ml-1">({row.count} trades, {row.winRate.toFixed(1)}% win)</span>
                    </div>
                    <PnlValue value={row.pnl} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      <MarketOpenPositionsPanel trades={openPositions} onOpenTrade={openReplay} />

      <div className="flex justify-end">
        <button
          onClick={() => { void onRefresh(); }}
          className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-900/80 text-xs font-semibold text-slate-200 hover:bg-slate-800 transition"
        >
          Refresh results
        </button>
      </div>

      {/* Trade list */}
      <div className="rounded-2xl border border-slate-700 bg-slate-900/80 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <h3 className="text-lg font-black text-slate-100">Trade history</h3>
          <div className="flex items-center gap-2">
            {(["all", "paper", "live"] as const).map((m) => (
              <button key={m} onClick={() => setFilterMode(m)}
                className={`px-3 py-1 text-xs rounded-full font-medium transition ${filterMode === m ? "bg-[#FF4D00] text-white" : "bg-slate-800 text-slate-300 hover:bg-slate-700"}`}>
                {m === "all" ? "All" : m === "paper" ? "Practice" : "Live"}
              </button>
            ))}
            <select value={sortKey} onChange={(e) => setSortKey(e.target.value as typeof sortKey)}
              className="text-xs bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-slate-200 outline-none">
              <option value="date">Sort: Date</option>
              <option value="pnl">Sort: P/L</option>
              <option value="category">Sort: Category</option>
            </select>
            <button onClick={toggleSortDir} className="text-xs text-slate-400 hover:text-slate-200 px-1">
              {sortDir === "desc" ? "↓" : "↑"}
            </button>
          </div>
        </div>

        {sortedTrades.length === 0
          ? <p className="text-sm text-slate-500 py-8 text-center">No trades match current filters</p>
          : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {sortedTrades.slice(0, 50).map((t) => (
                <button key={t.id} onClick={() => openReplay(t)}
                  className="w-full text-left rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-4 flex items-center justify-between gap-3 transition hover:border-cyan-400/30 hover:bg-slate-900">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-slate-100 font-semibold truncate">{t.marketTitle}</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {outcomePlainLabel(t.outcome)} · {t.shares} shares @ ${t.avgPrice.toFixed(3)} · {t.category ?? "—"}
                      <span className="ml-1 text-slate-500">· {tradeModeLabel(t)}</span>
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <PnlValue value={t.pnl ?? 0} />
                    <p className="text-[10px] text-slate-500">{new Date(t.createdAt).toLocaleDateString()}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
      </div>

      <MarketActivityFeed logs={recentLogs} compact title="Robot activity and execution log" emptyLabel="No scans, plan syncs, or trade events are visible yet." />

      {/* Trade replay drawer */}
      {selectedReplay && <MarketTradeReplayDrawer replay={selectedReplay} onClose={closeReplay} />}
    </div>
  );
}
