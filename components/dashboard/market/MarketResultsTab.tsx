"use client";

import React, { useMemo } from "react";
import type { MarketTrade } from "@/components/dashboard/market/types";
import type { MarketSystemStatusViewModel, SchedulerHealthViewModel } from "@/lib/market/contracts";

interface MarketResultsTabProps {
  onNavigate: (tabId: string) => void;
  paperMode: boolean;
  trades: MarketTrade[];
  system: MarketSystemStatusViewModel | null;
  serverHealth: SchedulerHealthViewModel | null;
  onOpenPositions: () => void;
  onOpenAutomation: () => void;
}

export default function MarketResultsTab({
  onNavigate,
  paperMode,
  trades
}: MarketResultsTabProps) {
  const modeLabel = paperMode ? "Practice Mode" : "Live Mode";
  const modeColor = paperMode ? "bg-green-600" : "bg-amber-600";

  const stats = useMemo(() => {
    const totalTrades = trades.length;
    const openTrades = trades.filter(t => t.status === "open").length;
    const closedTrades = trades.filter(t => t.status !== "open");
    const winningTrades = closedTrades.filter(t => t.pnl > 0).length;
    const winRate = closedTrades.length > 0 ? (winningTrades / closedTrades.length * 100).toFixed(1) + "%" : "—";
    const totalPnlNum = trades.reduce((sum, t) => sum + t.pnl, 0);
    const totalPnl = totalPnlNum.toFixed(2);
    const pnlColor = totalPnlNum > 0 ? "text-green-500" : totalPnlNum < 0 ? "text-red-500" : "text-slate-400";
    return { totalTrades, openTrades, winRate, totalPnl, pnlColor };
  }, [trades]);

  const openPositions = useMemo(() => trades.filter(t => t.status === "open"), [trades]);
  const recentTrades = useMemo(() => 
    [...trades].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 10), 
    [trades]
  );

  return (
    <div className="results-tab bg-zinc-950 text-slate-200 p-6 max-w-full overflow-hidden">
      <div className="header mb-6">
        <h1 className="text-2xl font-bold text-slate-100">Results</h1>
        <p className="text-base text-slate-300">Track your trades and performance.</p>
        <div className="mode-indicator flex items-center gap-2 mt-2">
          <span className={`w-3 h-3 rounded-full ${modeColor}`}></span>
          <span className="text-sm text-slate-400">{modeLabel}</span>
        </div>
      </div>

      <div className="summary-stats grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="stat-card bg-zinc-900 rounded-2xl p-4">
          <h3 className="text-sm text-slate-400">Total Trades</h3>
          <p className="text-xl font-bold text-slate-100">{stats.totalTrades}</p>
        </div>
        <div className="stat-card bg-zinc-900 rounded-2xl p-4">
          <h3 className="text-sm text-slate-400">Open</h3>
          <p className="text-xl font-bold text-slate-100">{stats.openTrades}</p>
        </div>
        <div className="stat-card bg-zinc-900 rounded-2xl p-4">
          <h3 className="text-sm text-slate-400">Win Rate</h3>
          <p className="text-xl font-bold text-slate-100">{stats.winRate}</p>
        </div>
        <div className="stat-card bg-zinc-900 rounded-2xl p-4">
          <h3 className="text-sm text-slate-400">Total P&L</h3>
          <p className={`text-xl font-bold ${stats.pnlColor}`}>{stats.totalPnl}</p>
        </div>
      </div>

      <div className="open-positions mb-6">
        <h2 className="text-xl font-semibold text-slate-100 mb-3">Open Positions</h2>
        {openPositions.length === 0 ? (
          <div className="empty-state bg-zinc-900 rounded-2xl p-6 text-slate-400 text-center">
            <p>No open positions</p>
          </div>
        ) : (
          <div className="positions-list bg-zinc-900 rounded-2xl p-2 max-h-[300px] overflow-auto">
            {openPositions.map(trade => {
              const outcomeColor = trade.outcome === "YES" ? "bg-green-500" : "bg-red-500";
              const unrealizedPnlColor = trade.pnl > 0 ? "text-green-500" : trade.pnl < 0 ? "text-red-500" : "text-slate-400";
              return (
                <div key={trade.id} className="position-item p-2 border-b border-zinc-800 last:border-0">
                  <p className="text-base text-slate-100 truncate">{trade.marketTitle}</p>
                  <div className="details flex justify-between text-sm text-slate-400">
                    <span className={`px-2 py-1 rounded text-xs ${outcomeColor} text-slate-100`}>{trade.outcome}</span>
                    <span>Shares: {trade.shares}</span>
                    <span>Avg: ${trade.avgPrice.toFixed(2)}</span>
                    <span>Current: ${trade.currentPrice.toFixed(2)}</span>
                    <span className={unrealizedPnlColor}>P&L: ${trade.pnl.toFixed(2)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="recent-trades">
        <h2 className="text-xl font-semibold text-slate-100 mb-3">Recent Trades</h2>
        {recentTrades.length === 0 ? (
          <div className="empty-state bg-zinc-900 rounded-2xl p-6 text-slate-400 text-center">
            <p>No trades yet — browse markets to get started</p>
            <button 
              onClick={() => onNavigate("direct-buy")} 
              className="mt-2 px-4 py-2 bg-[#FF4D00] rounded-2xl text-slate-100 hover:opacity-90 transition-opacity"
            >
              Browse Markets
            </button>
          </div>
        ) : (
          <div className="trades-list bg-zinc-900 rounded-2xl p-2 max-h-[300px] overflow-auto">
            {recentTrades.map(trade => {
              const outcomeColor = trade.outcome === "YES" ? "bg-green-500" : "bg-red-500";
              const pnlColor = trade.pnl > 0 ? "text-green-500" : trade.pnl < 0 ? "text-red-500" : "text-slate-400";
              const modeBadge = trade.paperTrade ? "Practice" : "Live";
              const date = new Date(trade.createdAt).toLocaleDateString();
              return (
                <div key={trade.id} className="trade-item p-2 border-b border-zinc-800 last:border-0">
                  <p className="text-base text-slate-100 truncate">{trade.marketTitle}</p>
                  <div className="details flex justify-between text-sm text-slate-400">
                    <span className={`px-2 py-1 rounded text-xs ${outcomeColor} text-slate-100`}>{trade.outcome}</span>
                    <span>Amount: ${trade.total.toFixed(2)}</span>
                    <span className={pnlColor}>P&L: ${trade.pnl.toFixed(2)}</span>
                    <span>{date}</span>
                    <span className="px-2 py-1 rounded text-xs bg-slate-800 text-slate-300">{modeBadge}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
