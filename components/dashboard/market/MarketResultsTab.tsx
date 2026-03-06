"use client";

import React from "react";
import { HelpTip } from "@/components/dashboard/market/MarketSharedUi";
import { useMarketResultsState } from "@/lib/hooks/useMarketResultsState";
import type { MarketTrade, MarketActivityLogEntry, TradeReplay } from "@/components/dashboard/market/types";

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
    <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-4 text-center">
      <p className="text-[11px] text-gray-400 uppercase tracking-wider mb-1 flex items-center justify-center gap-0.5">
        {label}{tip && <HelpTip content={tip} />}
      </p>
      <div className="text-lg">{children}</div>
    </div>
  );
}

export default function MarketResultsTab({ trades, activityLogs }: MarketResultsTabProps) {
  const {
    analytics, sortedTrades, sortKey, sortDir, filterMode,
    setSortKey, toggleSortDir, setFilterMode,
    selectedReplay, openReplay, closeReplay, recentLogs,
  } = useMarketResultsState(trades, activityLogs);

  const { realizedPnl, unrealizedPnl, feeAdjustedPnl, expectancy, profitFactor, winRate, avgHoldTimeMs, totalTrades, openTrades, closedTrades, pnlByCategory, paperVsLive } = analytics;

  return (
    <div className="space-y-5">
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
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5">
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

        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5">
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

      {/* Trade list */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <h3 className="text-sm font-semibold text-gray-700">Trade History</h3>
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
                  className="w-full text-left bg-gray-50 hover:bg-gray-100 rounded-xl px-4 py-3 flex items-center justify-between gap-3 transition">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-gray-800 font-medium truncate">{t.marketTitle}</p>
                    <p className="text-xs text-gray-400">
                      {t.outcome} · {t.shares} shares @ ${t.avgPrice.toFixed(3)} · {t.category ?? "—"}
                      {t.paperTrade && <span className="ml-1 text-purple-500">[Paper]</span>}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <PnlValue value={t.pnl ?? 0} />
                    <p className="text-[10px] text-gray-400">{new Date(t.createdAt).toLocaleDateString()}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
      </div>

      {/* Activity log */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Activity Log</h3>
        {recentLogs.length === 0
          ? <p className="text-sm text-gray-400 py-4 text-center">No activity recorded yet</p>
          : (
            <div className="space-y-1 max-h-[250px] overflow-y-auto text-xs font-mono text-gray-600">
              {recentLogs.map((log) => (
                <div key={log.id} className="flex gap-2">
                  <span className="text-gray-400 shrink-0">{new Date(log.created_at).toLocaleTimeString()}</span>
                  <span>{log.message}</span>
                </div>
              ))}
            </div>
          )}
      </div>

      {/* Trade replay drawer */}
      {selectedReplay && <ReplayDrawer replay={selectedReplay} onClose={closeReplay} />}
    </div>
  );
}

function ReplayDrawer({ replay, onClose }: { replay: TradeReplay; onClose: () => void }) {
  const { trade, reasoning, exitReason, matchedConstraints } = replay;
  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30" />
      <div className="relative w-full max-w-md bg-white shadow-2xl h-full overflow-y-auto p-6"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-gray-900">Trade Replay</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl">&times;</button>
        </div>

        <div className="space-y-4">
          <div>
            <p className="text-sm font-semibold text-gray-800">{trade.marketTitle}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {trade.outcome} · {trade.shares} shares · ${trade.total.toFixed(2)} total ·{" "}
              {trade.paperTrade ? "Paper" : "Live"}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-[10px] text-gray-400 uppercase">Entry Price</p>
              <p className="text-sm font-bold text-gray-900">${trade.avgPrice.toFixed(3)}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-[10px] text-gray-400 uppercase">Current Price</p>
              <p className="text-sm font-bold text-gray-900">${trade.currentPrice.toFixed(3)}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-[10px] text-gray-400 uppercase">P/L</p>
              <PnlValue value={trade.pnl ?? 0} />
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-[10px] text-gray-400 uppercase">Status</p>
              <p className="text-sm font-bold text-gray-900 capitalize">{trade.status}</p>
            </div>
          </div>

          {reasoning && (
            <div>
              <p className="text-xs text-gray-500 font-semibold uppercase mb-1">Reasoning</p>
              <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">{reasoning}</p>
            </div>
          )}

          {exitReason && (
            <div>
              <p className="text-xs text-gray-500 font-semibold uppercase mb-1">Exit Reason</p>
              <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">{exitReason}</p>
            </div>
          )}

          {matchedConstraints.length > 0 && (
            <div>
              <p className="text-xs text-gray-500 font-semibold uppercase mb-1">Matched Constraints</p>
              <div className="flex flex-wrap gap-1.5">
                {matchedConstraints.map((c) => (
                  <span key={c} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{c}</span>
                ))}
              </div>
            </div>
          )}

          <div className="text-xs text-gray-400 pt-2 border-t border-gray-100">
            Opened: {new Date(trade.createdAt).toLocaleString()}
            {trade.closedAt && <> · Closed: {new Date(trade.closedAt).toLocaleString()}</>}
          </div>
        </div>
      </div>
    </div>
  );
}
