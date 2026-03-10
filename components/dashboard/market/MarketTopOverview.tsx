"use client";

import React from "react";
import type { BotConfig, MarketActivityLogEntry, MarketTrade } from "@/components/dashboard/market/types";

interface MarketTopOverviewProps {
  trades: MarketTrade[];
  botConfig: BotConfig;
  activityLogs: MarketActivityLogEntry[];
  onOpenResults: () => void;
  onOpenAutomation: () => void;
}

export default function MarketTopOverview({ trades, botConfig, activityLogs, onOpenResults, onOpenAutomation }: MarketTopOverviewProps) {
  const openTrades = trades.filter((trade) => trade.status === "open" && !trade.closedAt);
  const openExposure = openTrades.reduce((sum, trade) => sum + trade.total, 0);
  const latestLog = activityLogs[0] ?? null;
  const automationLabel = botConfig.botRunning && !botConfig.botPaused ? "Running" : botConfig.botPaused ? "Paused" : "Idle";

  return (
    <div className="grid grid-cols-1 gap-4 mb-6 xl:grid-cols-[1fr_1fr_1.2fr]">
      <button onClick={onOpenResults} className="text-left overflow-hidden rounded-[28px] border border-slate-200 bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(242,247,255,0.94))] p-5 shadow-sm transition hover:border-[#FF4D00]/30 hover:shadow-md">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Active positions</p>
        <div className="mt-3 flex items-end justify-between gap-3">
          <div>
            <p className="text-3xl font-black text-slate-900">{openTrades.length}</p>
            <p className="text-sm text-slate-500 mt-1">${openExposure.toFixed(2)} currently deployed</p>
          </div>
          <span className="text-sm font-semibold text-[#FF4D00]">Open results →</span>
        </div>
      </button>

      <button onClick={onOpenAutomation} className="text-left overflow-hidden rounded-[28px] border border-slate-200 bg-[radial-gradient(circle_at_top_left,rgba(255,124,32,0.12),transparent_30%),linear-gradient(135deg,rgba(255,255,255,0.96),rgba(255,247,240,0.94))] p-5 shadow-sm transition hover:border-[#FF4D00]/30 hover:shadow-md">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Automation status</p>
        <div className="mt-3 flex items-end justify-between gap-3">
          <div>
            <p className="text-3xl font-black text-slate-900">{automationLabel}</p>
            <p className="text-sm text-slate-500 mt-1">
              ${botConfig.capitalAlloc} budget · {botConfig.maxTradesPerDay}/day · {botConfig.maxPositions} max open
            </p>
          </div>
          <span className="text-sm font-semibold text-[#FF4D00]">Watch robot →</span>
        </div>
      </button>

      <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-slate-950 p-5 text-white shadow-sm">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/50">Robot monitor</p>
        {latestLog ? (
          <>
            <p className="mt-3 text-sm font-semibold leading-6 text-white">{latestLog.message}</p>
            <p className="mt-3 text-xs text-white/60">{new Date(latestLog.created_at).toLocaleString()}</p>
          </>
        ) : (
          <p className="mt-3 text-sm leading-6 text-white/65">No automation events are visible yet. Once scans or buys run, the latest robot activity will surface here.</p>
        )}
      </div>
    </div>
  );
}