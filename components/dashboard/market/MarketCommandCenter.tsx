"use client";

import React, { useState, useEffect } from "react";
import { useMarketDirectBuyState } from "@/lib/hooks/useMarketDirectBuyState";
import MarketDirectBuyResults from "@/components/dashboard/market/MarketDirectBuyResults";
import type { LiveChecklist, MarketTrade } from "@/components/dashboard/market/types";

interface MarketCommandCenterProps {
  paperMode: boolean;
  walletAddress?: `0x${string}`;
  liveChecklist: LiveChecklist;
  onNavigate: (tabId: string) => void;
  onTradePlaced?: () => void | Promise<void>;
  trades: MarketTrade[];
  usdcBalance: string;
  maticFormatted: string;
  isConnected: boolean;
}

const CATEGORY_FILTERS = ["All", "Sports", "Politics", "Crypto", "Entertainment", "Science"] as const;

export default function MarketCommandCenter({
  paperMode,
  walletAddress,
  liveChecklist,
  onNavigate,
  onTradePlaced,
  trades,
  usdcBalance,
  isConnected
}: MarketCommandCenterProps) {
  const modeLabel = paperMode ? "Practice" : "Live";
  const {
    query,
    setQuery,
    fetchMarkets,
    markets,
    loading,
    loaded,
    category,
    setCategory,
    sortBy,
    sortDirection,
    onToggleSort
  } = useMarketDirectBuyState({ paperMode, walletAddress, liveChecklist, onTradePlaced });

  const [searchTriggered, setSearchTriggered] = useState(false);

  useEffect(() => {
    if (searchTriggered) {
      fetchMarkets();
    }
  }, [searchTriggered, fetchMarkets]);

  const handleSearchKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      setSearchTriggered(true);
    }
  };

  const handleCategorySelect = (cat: string) => {
    setCategory(cat === "All" ? "" : cat);
    setSearchTriggered(true);
  };

  const openTrades = trades.filter(t => t.status === "open");
  const closedTrades = trades.filter(t => t.status !== "open");
  const totalPnl = trades.reduce((s, t) => s + t.pnl, 0);
  const pnlColor = totalPnl > 0 ? "text-emerald-400" : totalPnl < 0 ? "text-rose-400" : "text-zinc-400";
  const winRate = closedTrades.length > 0
    ? ((closedTrades.filter(t => t.pnl > 0).length / closedTrades.length) * 100).toFixed(0) + "%"
    : "—";
  const todayTrades = trades.filter(t => {
    const d = new Date(t.createdAt);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  });

  return (
    <div className="market-command-center bg-zinc-950 text-zinc-100 min-h-screen flex flex-col overflow-hidden">
      <div className="top-bar flex justify-between items-center p-4 border-b border-zinc-800 mb-4">
        <div className="mode-indicator flex items-center gap-2">
          <span className="text-sm text-zinc-400">Mode: {modeLabel}</span>
        </div>
        <div className="wallet-status flex items-center gap-4 text-sm text-zinc-400">
          <span>Wallet: ${usdcBalance} USDC</span>
          <span className={isConnected ? "text-emerald-400" : "text-rose-400"}>
            {isConnected ? "Connected ✓" : "Disconnected"}
          </span>
        </div>
      </div>

      <div className="main-content flex flex-col lg:flex-row gap-4 p-4 flex-grow overflow-hidden">
        <div className="performance-panel lg:w-1/3 flex flex-col gap-4 overflow-hidden">
          <div className="stats-card bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex-grow">
            <h2 className="text-lg font-semibold mb-3 text-zinc-100">Performance</h2>
            <div className="metrics grid grid-cols-2 gap-3">
              <div className="metric">
                <p className="text-sm text-zinc-400">Total Profit/Loss</p>
                <p className={`text-xl font-bold ${pnlColor}`}>${totalPnl.toFixed(2)}</p>
              </div>
              <div className="metric">
                <p className="text-sm text-zinc-400">Open Positions</p>
                <p className="text-xl font-bold text-zinc-100">{openTrades.length}</p>
              </div>
              <div className="metric">
                <p className="text-sm text-zinc-400">Win Rate</p>
                <p className="text-xl font-bold text-zinc-100">{winRate}</p>
              </div>
              <div className="metric">
                <p className="text-sm text-zinc-400">Today’s Trades</p>
                <p className="text-xl font-bold text-zinc-100">{todayTrades.length}</p>
              </div>
            </div>
          </div>

          <div className="chart-placeholder bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex-grow">
            <h3 className="text-md font-semibold mb-2 text-zinc-100">Performance Over Time</h3>
            <div className="placeholder-area h-32 flex items-center justify-center text-zinc-400 text-sm">
              <p>Chart will be available soon</p>
            </div>
          </div>

          <div className="positions-card bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex-grow">
            <h2 className="text-lg font-semibold mb-3 text-zinc-100">Open Positions</h2>
            {openTrades.length === 0 ? (
              <div className="empty-state h-24 flex items-center justify-center text-zinc-400 text-sm">
                <p>No open positions yet</p>
              </div>
            ) : (
              <div className="positions-list space-y-2">
                {openTrades.slice(0, 3).map(trade => {
                  const sideColor = trade.outcome === "YES" ? "text-emerald-400" : "text-rose-400";
                  const pnlColor = trade.pnl > 0 ? "text-emerald-400" : trade.pnl < 0 ? "text-rose-400" : "text-zinc-400";
                  return (
                    <button
                      key={trade.id}
                      onClick={() => onNavigate("results")}
                      className="position-row w-full text-left p-2 hover:bg-zinc-800 transition-colors border-b border-zinc-800 last:border-0"
                    >
                      <p className="text-sm text-zinc-100 truncate">{trade.marketTitle}</p>
                      <div className="details flex justify-between text-xs mt-1">
                        <span className={sideColor}>{trade.outcome === "YES" ? "YES side" : "NO side"}</span>
                        <span className={pnlColor}>P&L: ${trade.pnl.toFixed(2)}</span>
                      </div>
                    </button>
                  );
                })}
                {openTrades.length > 3 && (
                  <button
                    onClick={() => onNavigate("results")}
                    className="text-[#FF4D00] text-sm mt-2 hover:underline"
                  >
                    View all {openTrades.length} positions →
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="search-panel lg:w-2/3 flex flex-col overflow-hidden">
          <div className="search-area bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-4">
            <h2 className="text-lg font-semibold mb-3 text-zinc-100">Find Markets</h2>
            <input
              type="text"
              placeholder="Search markets..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={handleSearchKeyPress}
              className="w-full p-2 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-100 outline-none focus:ring-1 focus:ring-[#FF4D00] mb-3"
            />
            <div className="quick-filters flex flex-wrap gap-2">
              {CATEGORY_FILTERS.map(cat => (
                <button
                  key={cat}
                  onClick={() => handleCategorySelect(cat)}
                  className={`text-sm px-3 py-1 ${category === (cat === "All" ? "" : cat) ? "text-[#FF4D00]" : "text-zinc-400"} hover:text-[#FF4D00] transition-colors`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="results-area bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex-grow overflow-auto">
            {!loaded && !loading ? (
              <div className="empty-state h-full flex items-center justify-center text-zinc-400 text-sm">
                <p>Search to find markets</p>
              </div>
            ) : (
              <MarketDirectBuyResults
                markets={markets}
                sortBy={sortBy}
                sortDirection={sortDirection}
                onToggleSort={onToggleSort}
                isLoading={loading}
                onBuy={() => {}}
                onOpenDetails={() => {}}
                tableInsights={{}}
                savedMarketIds={[]}
                onToggleSave={() => {}}
              />
            )}
          </div>
        </div>
      </div>

      <div className="quick-actions flex justify-center gap-6 p-4 border-t border-zinc-800">
        <button
          onClick={() => onNavigate("automation")}
          className="text-[#FF4D00] text-sm hover:underline"
        >
          Set Up Auto-Buy
        </button>
        <button
          onClick={() => onNavigate("results")}
          className="text-[#FF4D00] text-sm hover:underline"
        >
          View All Results
        </button>
        <button
          onClick={() => onNavigate("live-wallet")}
          className="text-[#FF4D00] text-sm hover:underline"
        >
          Manage Wallet
        </button>
      </div>
    </div>
  );
}