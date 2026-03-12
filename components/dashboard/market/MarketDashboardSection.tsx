"use client";

import React, { useState } from "react";
import MarketStartHereTab from "@/components/dashboard/market/MarketStartHereTab";
import MarketTopOverview from "@/components/dashboard/market/MarketTopOverview";
import type { SchedulerHealthViewModel, MarketSystemStatusViewModel } from "@/lib/market/contracts";
import type { MarketServerStatus } from "@/lib/hooks/useMarketServerStatus";
import type { AutomationPlan, MarketTrade } from "@/components/dashboard/market/types";

interface MarketDashboardSectionProps {
  trades: MarketTrade[];
  paperMode: boolean;
  system: MarketSystemStatusViewModel | null;
  serverStatus: MarketServerStatus;
  onNavigate: (tabId: string) => void;
  onApplyRecommendation: (plan: AutomationPlan) => void;
  onQuickStart?: () => void;
  onStopBot?: () => void;
  walletPanel: React.ReactNode;
}

function statusLabel(status: MarketServerStatus["status"]): string {
  if (status === "unknown") return "Unavailable";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export default function MarketDashboardSection({
  trades,
  paperMode,
  system,
  serverStatus,
  onNavigate,
  onApplyRecommendation,
  onQuickStart,
  onStopBot,
  walletPanel,
}: MarketDashboardSectionProps) {
  const [walletOpen, setWalletOpen] = useState(false);
  const blockerCount = system?.blockers.length ?? 0;
  const lastRunLabel = serverStatus.health?.lastRunIso
    ? new Date(serverStatus.health.lastRunIso).toLocaleTimeString()
    : "Unavailable";

  return (
    <div className="space-y-6">
      <section className="rounded-[32px] border border-cyan-500/20 bg-[linear-gradient(135deg,rgba(8,15,31,0.96),rgba(15,23,42,0.96))] p-5 shadow-[0_24px_80px_rgba(2,6,23,0.55)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-cyan-300/80">Dashboard</p>
            <h2 className="mt-2 text-2xl font-black text-slate-50">Operator command deck</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
              Visible status here is grounded only in trades, bot-status, scheduler health, and system-status.
              When the server cannot confirm a value, the UI stays neutral instead of inferring from local config.
            </p>
          </div>
          <button
            onClick={() => setWalletOpen((value) => !value)}
            className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-cyan-100 transition hover:bg-cyan-400/20"
          >
            {walletOpen ? "Hide Wallet Readiness" : "Open Wallet Readiness"}
          </button>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-950/55 px-4 py-3">
            <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Config Source</p>
            <p className="mt-2 text-sm font-semibold text-slate-100">{system?.configSourceLabel ?? "Unavailable"}</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-950/55 px-4 py-3">
            <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Runtime</p>
            <p className="mt-2 text-sm font-semibold text-slate-100">{statusLabel(serverStatus.status)}</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-950/55 px-4 py-3">
            <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Live Blockers</p>
            <p className="mt-2 text-sm font-semibold text-slate-100">{blockerCount > 0 ? String(blockerCount) : "None"}</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-950/55 px-4 py-3">
            <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Last Known Run</p>
            <p className="mt-2 text-sm font-semibold text-slate-100">{lastRunLabel}</p>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.9fr)] xl:items-start">
        <MarketStartHereTab
          onNavigate={onNavigate}
          onApplyRecommendation={onApplyRecommendation}
          onQuickStart={onQuickStart}
          onStopBot={onStopBot}
          paperMode={paperMode}
          serverStatus={serverStatus.status}
          serverConfirmed={serverStatus.isConfirmed}
          serverHealth={serverStatus.health}
        />

        <div className="space-y-6">
          <MarketTopOverview
            trades={trades}
            system={system}
            serverStatus={serverStatus.status}
            serverHealth={serverStatus.health as SchedulerHealthViewModel | null}
            onOpenResults={() => onNavigate("results")}
            onOpenAutomation={() => onNavigate("automation")}
            onOpenWallet={() => setWalletOpen(true)}
          />

          {walletOpen && (
            <section className="rounded-[32px] border border-slate-800 bg-slate-950/70 p-4 shadow-[0_20px_60px_rgba(15,23,42,0.45)]">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Wallet And Live Readiness</p>
                  <p className="mt-1 text-sm text-slate-300">
                    Live mode remains blocked until both wallet prerequisites and backend readiness are green.
                  </p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${paperMode ? "bg-violet-500/20 text-violet-200" : "bg-emerald-500/20 text-emerald-200"}`}>
                  {paperMode ? "Practice Default" : "Live Default"}
                </span>
              </div>
              {walletPanel}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}