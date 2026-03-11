"use client";

import React from "react";
import type { BotConfig, MarketTrade } from "@/components/dashboard/market/types";

interface MarketTopOverviewProps {
  trades: MarketTrade[];
  botConfig: BotConfig;
  onOpenResults: () => void;
  onOpenAutomation: () => void;
}

export default function MarketTopOverview({ trades, botConfig, onOpenResults, onOpenAutomation }: MarketTopOverviewProps) {
  const openTrades = trades.filter((trade) => trade.status === "open" && !trade.closedAt);
  const openExposure = openTrades.reduce((sum, trade) => sum + trade.total, 0);
  const statusLabel = botConfig.botRunning && !botConfig.botPaused ? "Running" : botConfig.botPaused ? "Paused" : "Idle";

  // Only show when there's something useful to display
  if (openTrades.length === 0 && !botConfig.botRunning) return null;

  return (
    <div className="flex flex-wrap gap-3 mb-4 text-sm">
      {openTrades.length > 0 && (
        <button onClick={onOpenResults} className="inline-flex items-center gap-2 bg-white border border-gray-100 rounded-xl px-3 py-2 shadow-sm hover:border-[#FF4D00]/30 transition">
          <span className="font-bold text-gray-900">{openTrades.length} open</span>
          <span className="text-gray-400">${openExposure.toFixed(0)} deployed</span>
          <span className="text-[#FF4D00] text-xs font-semibold">View →</span>
        </button>
      )}
      {botConfig.botRunning && (
        <button onClick={onOpenAutomation} className="inline-flex items-center gap-2 bg-white border border-gray-100 rounded-xl px-3 py-2 shadow-sm hover:border-[#FF4D00]/30 transition">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="font-bold text-gray-900">Robot {statusLabel}</span>
          <span className="text-gray-400">${botConfig.capitalAlloc} budget</span>
        </button>
      )}
    </div>
  );
}