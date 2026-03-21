"use client";

import React from "react";
import type { SchedulerHealthViewModel } from "@/lib/market/contracts";
import type { AutomationPlan } from "@/components/dashboard/market/types";

interface MarketStartHereTabProps {
  onNavigate: (tabId: string) => void;
  onApplyRecommendation?: (plan: AutomationPlan) => void;
  onQuickStart?: () => void;
  onStopBot?: () => void;
  paperMode: boolean;
  serverStatus: string; // "running" | "paused" | "stopped" | "paper" | "unknown"
  serverConfirmed: boolean;
  serverHealth: SchedulerHealthViewModel | null;
}

export default function MarketStartHereTab({
  onNavigate,
  paperMode,
  serverStatus,
  serverConfirmed
}: MarketStartHereTabProps) {
  const getServerStatusLabel = () => {
    if (!serverConfirmed) return "Connecting...";
    switch (serverStatus) {
      case "running": return "Active";
      case "paper": return "Practice Active";
      case "paused": return "Paused";
      case "stopped": return "Idle";
      default: return "Checking...";
    }
  };

  const getServerStatusColor = () => {
    if (!serverConfirmed) return "bg-slate-400";
    switch (serverStatus) {
      case "running":
      case "paper": return "bg-green-500";
      case "paused": return "bg-yellow-500";
      default: return "bg-slate-400";
    }
  };

  const modeLabel = paperMode ? "Practice Mode" : "Live Mode";
  const modeColor = paperMode ? "bg-green-600" : "bg-amber-600";

  return (
    <div className="start-here-tab bg-zinc-950 text-slate-200 p-6 max-w-full overflow-hidden">
      <div className="welcome-section mb-6">
        <h1 className="text-2xl font-bold mb-2 text-slate-100">Welcome to Prediction Markets</h1>
        <p className="text-base text-slate-300">
          Prediction markets let you trade on real-world outcomes — elections, sports, crypto, and more. 
          Browse markets to find opportunities, or let automation do the work.
        </p>
        <div className="status-indicators flex gap-4 mt-4">
          <div className="mode-indicator flex items-center gap-2">
            <span className={`w-3 h-3 rounded-full ${modeColor}`}></span>
            <span className="text-sm text-slate-400">{modeLabel}</span>
          </div>
          <div className="server-status flex items-center gap-2">
            <span className={`w-3 h-3 rounded-full ${getServerStatusColor()}`}></span>
            <span className="text-sm text-slate-400">{getServerStatusLabel()}</span>
          </div>
        </div>
      </div>

      <div className="quick-actions grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <button 
          onClick={() => onNavigate("direct-buy")} 
          className="action-card bg-zinc-900 rounded-2xl p-4 text-left hover:bg-zinc-800 transition-colors"
        >
          <div className="icon mb-2 text-[#FF4D00]">🔍</div>
          <h2 className="text-lg font-semibold text-slate-100">Browse Markets</h2>
          <p className="text-sm text-slate-400">Find and trade on current opportunities</p>
        </button>
        <button 
          onClick={() => onNavigate("automation")} 
          className="action-card bg-zinc-900 rounded-2xl p-4 text-left hover:bg-zinc-800 transition-colors"
        >
          <div className="icon mb-2 text-[#FF4D00]">⚙️</div>
          <h2 className="text-lg font-semibold text-slate-100">Set Up Automation</h2>
          <p className="text-sm text-slate-400">Let the system trade for you</p>
        </button>
        <button 
          onClick={() => onNavigate("results")} 
          className="action-card bg-zinc-900 rounded-2xl p-4 text-left hover:bg-zinc-800 transition-colors"
        >
          <div className="icon mb-2 text-[#FF4D00]">📊</div>
          <h2 className="text-lg font-semibold text-slate-100">View Results</h2>
          <p className="text-sm text-slate-400">Track your trades and performance</p>
        </button>
      </div>

      <div className="getting-started mb-6">
        <h2 className="text-xl font-semibold mb-3 text-slate-100">Getting Started</h2>
        <ol className="list-decimal list-inside text-slate-300 space-y-2 text-base">
          <li>Search for markets you're interested in</li>
          <li>Place trades manually or set up automated rules</li>
          <li>Track your results and adjust your strategy</li>
        </ol>
      </div>
    </div>
  );
}
