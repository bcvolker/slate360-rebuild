"use client";

import React from "react";
import type { MarketTrade } from "@/components/dashboard/market/types";
import type { MarketSystemStatusViewModel, SchedulerHealthViewModel } from "@/lib/market/contracts";
import type { ServerBotStatus } from "@/lib/hooks/useMarketServerStatus";

interface MarketTopOverviewProps {
  trades: MarketTrade[];
  system: MarketSystemStatusViewModel | null;
  serverStatus: ServerBotStatus;
  serverHealth: SchedulerHealthViewModel | null;
  onOpenResults: () => void;
  onOpenAutomation: () => void;
  onOpenWallet: () => void;
}

function runtimeLabel(status: ServerBotStatus): string {
  if (status === "unknown") return "Unavailable";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function cardTone(isAlert: boolean): string {
  return isAlert
    ? "border-amber-500/30 bg-amber-500/10 text-amber-50"
    : "border-cyan-500/20 bg-zinc-950/70 text-slate-50";
}

export default function MarketTopOverview({
  trades,
  system,
  serverStatus,
  serverHealth,
  onOpenResults,
  onOpenAutomation,
  onOpenWallet,
}: MarketTopOverviewProps) {
  const openTrades = trades.filter((trade) => trade.status === "open" && !trade.closedAt);
  const openExposure = openTrades.reduce((sum, trade) => sum + trade.total, 0);
  const blockerLabel =
    system == null ? "Unavailable" : system.blockers.length === 0 ? "None" : `${system.blockers.length} blocker(s)`;

  return (
    <div className="mb-6 grid grid-cols-1 gap-4 xl:grid-cols-4">
      <button onClick={onOpenResults} className={`rounded-[28px] border p-4 text-left shadow-[0_18px_40px_rgba(9,9,11,0.22)] transition hover:border-cyan-400/30 ${cardTone(false)}`}>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Open Positions</p>
        <div className="flex items-end justify-between mt-2 gap-3">
          <div>
            <p className="text-2xl font-black text-slate-50">{openTrades.length}</p>
            <p className="mt-1 text-sm text-slate-400">${openExposure.toFixed(2)} currently deployed</p>
          </div>
          <span className="text-sm font-semibold text-cyan-200">View positions →</span>
        </div>
      </button>

      <button onClick={onOpenAutomation} className={`rounded-[28px] border p-4 text-left shadow-[0_18px_40px_rgba(9,9,11,0.22)] transition hover:border-cyan-400/30 ${cardTone(false)}`}>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Last Known Runtime</p>
        <div className="flex items-end justify-between mt-2 gap-3">
          <div>
            <p className="text-2xl font-black text-slate-50">{runtimeLabel(serverStatus)}</p>
            <p className="mt-1 text-sm text-slate-400">
              Last run: {serverHealth?.lastRunIso ? new Date(serverHealth.lastRunIso).toLocaleTimeString() : "Unavailable"}
            </p>
          </div>
          <span className="text-sm font-semibold text-cyan-200">Open automation →</span>
        </div>
      </button>

      <button onClick={onOpenAutomation} className={`rounded-[28px] border p-4 text-left shadow-[0_18px_40px_rgba(9,9,11,0.22)] transition hover:border-cyan-400/30 ${cardTone(false)}`}>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Config Source</p>
        <div className="mt-2 flex items-end justify-between gap-3">
          <div>
            <p className="text-2xl font-black text-slate-50">{system?.configSourceLabel ?? "Unavailable"}</p>
            <p className="mt-1 text-sm text-slate-400">Runs today: {system?.runsToday ?? "Unavailable"}</p>
          </div>
          <span className="text-sm font-semibold text-cyan-200">Review automation →</span>
        </div>
      </button>

      <button onClick={onOpenWallet} className={`rounded-[28px] border p-4 text-left shadow-[0_18px_40px_rgba(9,9,11,0.22)] transition hover:border-amber-400/30 ${cardTone((system?.blockers.length ?? 0) > 0)}`}>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Live Blockers</p>
        <div className="mt-2 flex items-end justify-between gap-3">
          <div>
            <p className="text-2xl font-black text-slate-50">{blockerLabel}</p>
            <p className="mt-1 text-sm text-slate-400">{system?.liveServerReady ? "Server ready" : "Wallet or backend still blocked"}</p>
          </div>
          <span className="text-sm font-semibold text-amber-200">Open readiness →</span>
        </div>
      </button>
    </div>
  );
}