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

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
      <button onClick={onOpenResults} className="text-left bg-white border border-gray-100 rounded-2xl shadow-sm p-4 hover:border-[#FF4D00]/30 transition">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Open Positions</p>
        <div className="flex items-end justify-between mt-2 gap-3">
          <div>
            <p className="text-2xl font-black text-gray-900">{openTrades.length}</p>
            <p className="text-sm text-gray-500 mt-1">${openExposure.toFixed(2)} currently deployed</p>
          </div>
          <span className="text-sm font-semibold text-[#FF4D00]">View positions →</span>
        </div>
      </button>

      <button onClick={onOpenAutomation} className="text-left bg-white border border-gray-100 rounded-2xl shadow-sm p-4 hover:border-[#FF4D00]/30 transition">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Automation Programmed</p>
        <div className="flex items-end justify-between mt-2 gap-3">
          <div>
            <p className="text-2xl font-black text-gray-900">{botConfig.botRunning && !botConfig.botPaused ? "Running" : botConfig.botPaused ? "Paused" : "Idle"}</p>
            <p className="text-sm text-gray-500 mt-1">
              ${botConfig.capitalAlloc} budget · {botConfig.maxTradesPerDay}/day · {botConfig.maxPositions} max open
            </p>
          </div>
          <span className="text-sm font-semibold text-[#FF4D00]">Open automation →</span>
        </div>
      </button>
    </div>
  );
}