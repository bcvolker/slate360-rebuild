"use client";

import React from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
} from "recharts";
import { HelpTip } from "@/components/dashboard/market/MarketSharedUi";
import MarketBotConfigPanel from "@/components/dashboard/market/MarketBotConfigPanel";
import MarketWalletCard from "@/components/dashboard/market/MarketWalletCard";
import MarketActivityLog from "@/components/dashboard/market/MarketActivityLog";
import type {
  BotConfig, MarketTrade, PnlPoint, LiveChecklist,
} from "@/components/dashboard/market/types";
import type { MarketSummaryViewModel, SchedulerHealthViewModel } from "@/lib/market/contracts";
import type { Chain } from "viem";
import type { MarketActivityLogEntry } from "@/components/dashboard/market/types";

export interface DashboardTabProps {
  // Bot config
  config: BotConfig;
  appliedConfig: Record<string, unknown> | null;
  onApplyPreset: (p: "starter" | "balanced" | "active") => void;
  onPaperModeToggle: () => void;
  onSaveSimRun: () => void;
  onCapitalChange: (v: number) => void;
  onMaxPositionsChange: (v: number) => void;
  onMinEdgeChange: (v: number) => void;
  onMinVolumeChange: (v: number) => void;
  onMinProbLowChange: (v: number) => void;
  onMinProbHighChange: (v: number) => void;
  onRiskMixChange: (v: "conservative" | "balanced" | "aggressive") => void;
  onWhaleFollowToggle: () => void;
  onToggleFocus: (area: string) => void;
  onStartBot: () => void;
  onPauseBot: () => void;
  onStopBot: () => void;
  onRunScan: () => void;
  // Trade data
  trades: MarketTrade[];
  openTrades: MarketTrade[];
  pnlChart: PnlPoint[];
  loadingTrades: boolean;
  totalPnl: number;
  winRate: string;
  summary: MarketSummaryViewModel | null;
  loadingSummary: boolean;
  summaryError: string | null;
  schedulerHealth: SchedulerHealthViewModel | null;
  loadingSchedulerHealth: boolean;
  schedulerHealthError: string | null;
  schedulerStatus: string;
  schedulerStatusTone: string;
  activityLogs: MarketActivityLogEntry[];
  scanLog: string[];
  logRef: React.RefObject<HTMLDivElement | null>;
  formatMoney: (v: number) => string;
  onFetchTrades: () => void;
  onFetchSummary: () => void;
  onFetchSchedulerHealth: () => void;
  onOpenWalletTab: () => void;
  // Wallet
  isConnected: boolean;
  address: `0x${string}` | undefined;
  chain: Chain | undefined;
  usdcBalance: string | null;
  maticData: { value: bigint; decimals: number } | undefined;
  isConnecting: boolean;
  isApproving: boolean;
  waitingApproveReceipt: boolean;
  approveSuccess: boolean;
  walletVerified: boolean;
  walletChoice: string;
  liveChecklist: LiveChecklist;
  polymarketSpender: string;
  onConnectWallet: () => void;
  onApproveUsdc: () => void;
  onDisconnect: () => void;
  onClearVerified: () => void;
}

export default function MarketDashboardTab({
  config, appliedConfig, onApplyPreset, onPaperModeToggle, onSaveSimRun,
  onCapitalChange, onMaxPositionsChange, onMinEdgeChange, onMinVolumeChange,
  onMinProbLowChange, onMinProbHighChange, onRiskMixChange, onWhaleFollowToggle, onToggleFocus,
  onStartBot, onPauseBot, onStopBot, onRunScan,
  trades, openTrades, pnlChart, loadingTrades, totalPnl, winRate,
  summary, loadingSummary, schedulerHealth, loadingSchedulerHealth,
  schedulerHealthError, schedulerStatus, schedulerStatusTone,
  activityLogs, scanLog, logRef, formatMoney,
  onFetchTrades, onFetchSummary, onFetchSchedulerHealth, onOpenWalletTab,
  isConnected, address, chain, usdcBalance, maticData,
  isConnecting, isApproving, waitingApproveReceipt, approveSuccess,
  walletVerified, walletChoice, liveChecklist, polymarketSpender,
  onConnectWallet, onApproveUsdc, onDisconnect, onClearVerified,
}: DashboardTabProps) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      {/* Left: Config + Controls */}
      <div className="xl:col-span-1">
        <MarketBotConfigPanel
          config={config} appliedConfig={appliedConfig} trades={trades}
          onApplyPreset={onApplyPreset} onPaperModeToggle={onPaperModeToggle} onSaveSimRun={onSaveSimRun}
          onCapitalChange={onCapitalChange} onMaxPositionsChange={onMaxPositionsChange}
          onMinEdgeChange={onMinEdgeChange} onMinVolumeChange={onMinVolumeChange}
          onMinProbLowChange={onMinProbLowChange} onMinProbHighChange={onMinProbHighChange}
          onRiskMixChange={onRiskMixChange} onWhaleFollowToggle={onWhaleFollowToggle} onToggleFocus={onToggleFocus}
          onStartBot={onStartBot} onPauseBot={onPauseBot} onStopBot={onStopBot} onRunScan={onRunScan}
        />
      </div>

      {/* Right: Stats + Chart + Wallet + Log + Positions */}
      <div className="xl:col-span-2 space-y-4">

        {/* Control Center */}
        <div className="bg-gradient-to-r from-gray-50 to-white border border-gray-200 rounded-2xl shadow-sm p-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-gray-900 flex items-center">
              Control Center <HelpTip content="Command summary for current bot mode, performance, and scheduler state." />
            </p>
            <p className="text-xs text-gray-500 mt-1">Core performance + scheduler health in one place.</p>
            <div className="mt-2 flex items-center gap-4 text-[11px] text-gray-500">
              <span className="flex items-center gap-1">
                Today P/L <HelpTip content="Net realized and unrealized profit/loss for today." />:
                <span className={`font-semibold ${(summary?.todayProfitLossUsd ?? 0) >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {summary ? formatMoney(summary.todayProfitLossUsd) : "—"}
                </span>
              </span>
              <span>Win Rate: <span className="font-semibold text-gray-800">{summary ? `${summary.winRatePct.toFixed(1)}%` : "—"}</span></span>
              <span>Balance: <span className="font-semibold text-gray-900">{summary ? formatMoney(summary.currentBalanceUsd) : "—"}</span></span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onOpenWalletTab}
              className="bg-[#1E3A8A] hover:bg-blue-700 text-white text-xs font-semibold px-3 py-2 rounded-lg transition">
              Open Wallet &amp; Performance
            </button>
            <button onClick={() => { onFetchSummary(); onFetchSchedulerHealth(); }}
              className="text-xs text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg px-3 py-2 transition">
              Refresh Overview
            </button>
          </div>
        </div>

        {/* Scheduler Health */}
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-gray-800 flex items-center">
                Scheduler Health <HelpTip content="Server-side automation heartbeat for directive-driven scans and execution." />
              </h3>
              <p className="text-xs text-gray-500 mt-1">Autopilot cadence, daily run totals, and latest runtime state.</p>
            </div>
            <span className={`text-[11px] px-2.5 py-1 rounded-full border font-semibold ${schedulerStatusTone}`}>
              {schedulerStatus.toUpperCase()}
            </span>
          </div>
          {schedulerHealthError ? (
            <p className="text-xs text-red-600 mt-3">{schedulerHealthError}</p>
          ) : loadingSchedulerHealth && !schedulerHealth ? (
            <p className="text-xs text-gray-400 mt-3">Loading scheduler health…</p>
          ) : (
            <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Runs Today", value: schedulerHealth?.runsToday ?? 0, tip: "How many scheduler cycles were attempted today." },
                { label: "Trades Today", value: schedulerHealth?.tradesToday ?? 0, tip: "Trades executed by scheduler automation today." },
                { label: "Target Freq.", value: `${schedulerHealth?.runFrequencySeconds ?? 0}s`, tip: "Planned interval between scheduler runs." },
                {
                  label: "Next Eligible",
                  value: schedulerHealth?.nextEligibleRunIso
                    ? new Date(schedulerHealth.nextEligibleRunIso).toLocaleTimeString() : "—",
                  tip: "Earliest time the scheduler can run again.",
                },
              ].map(s => (
                <div key={s.label} className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                  <p className="text-[11px] text-gray-500 flex items-center">{s.label} <HelpTip content={s.tip} /></p>
                  <p className="text-lg font-semibold text-gray-900">{s.value}</p>
                </div>
              ))}
            </div>
          )}
          {schedulerHealth?.lastError && (
            <p className="mt-3 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              Last error: {schedulerHealth.lastError}
            </p>
          )}
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total P/L", value: `${totalPnl >= 0 ? "+" : ""}$${totalPnl.toFixed(2)}`, color: totalPnl >= 0 ? "text-green-600" : "text-red-600" },
            { label: "Open Positions", value: openTrades.length, color: "text-gray-900" },
            { label: "Win Rate", value: `${winRate}%`, color: parseFloat(winRate) >= 50 ? "text-green-600" : "text-red-600" },
            { label: "Total Trades", value: trades.length, color: "text-gray-900" },
          ].map(s => (
            <div key={s.label} className="bg-white border border-gray-100 rounded-2xl shadow-sm p-3">
              <p className="text-xs text-gray-500">{s.label}</p>
              <p className={`text-xl font-bold mt-1 ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* PnL chart */}
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm text-gray-800">Profit and Loss Over Time</h3>
            <button onClick={onFetchTrades} className="text-xs text-gray-400 hover:text-gray-700 transition">↻ Refresh</button>
          </div>
          {pnlChart.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={pnlChart} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="pnlGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FF4D00" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#FF4D00" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#6b7280" }} />
                <YAxis tick={{ fontSize: 10, fill: "#6b7280" }} tickFormatter={v => `$${v}`} />
                <RechartsTooltip
                  contentStyle={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 8, color: "#111827" }}
                  formatter={(v: number | undefined) => [`$${(v ?? 0).toFixed(2)}`, "P/L"]}
                />
                <Area type="monotone" dataKey="cumPnl" stroke="#FF4D00" fill="url(#pnlGrad)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-gray-400 text-sm">
              {loadingTrades ? "Loading trade data…" : "No trades yet — run a scan to populate this chart"}
            </div>
          )}
        </div>

        {/* Wallet card */}
        <MarketWalletCard
          isConnected={isConnected} address={address} chain={chain}
          usdcBalance={usdcBalance} maticData={maticData}
          isConnecting={isConnecting} isApproving={isApproving}
          waitingApproveReceipt={waitingApproveReceipt} approveSuccess={approveSuccess}
          walletVerified={walletVerified} walletChoice={walletChoice}
          liveChecklist={liveChecklist} polymarketSpender={polymarketSpender}
          onConnect={onConnectWallet} onApproveUsdc={onApproveUsdc}
          onDisconnect={onDisconnect} onClearVerified={onClearVerified}
        />

        {/* Activity log */}
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4">
          <h3 className="font-semibold text-sm text-gray-700 mb-2">What the Bot Is Doing</h3>
          <div ref={logRef} className="bg-gray-50 border border-gray-100 rounded-lg p-3 h-80 overflow-y-auto text-xs space-y-0.5">
            <MarketActivityLog activityLogs={activityLogs} scanLog={scanLog} emptyText="No actions yet. Start the bot or run a test scan." />
          </div>
        </div>

        {/* Open positions */}
        {openTrades.length > 0 && (
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4">
            <h3 className="font-semibold text-sm text-gray-700 mb-3">Open Positions</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-gray-400 border-b border-gray-200">
                    <th className="pb-2 text-left font-medium">Market</th>
                    <th className="pb-2 text-left font-medium">Outcome</th>
                    <th className="pb-2 text-right font-medium">Shares</th>
                    <th className="pb-2 text-right font-medium">Avg Price</th>
                    <th className="pb-2 text-right font-medium">Current</th>
                    <th className="pb-2 text-right font-medium">P/L</th>
                  </tr>
                </thead>
                <tbody>
                  {openTrades.map(t => (
                    <tr key={t.id} className="border-b border-gray-200/50">
                      <td className="py-2 pr-2 max-w-[180px] truncate text-gray-700">{t.marketTitle}</td>
                      <td className="py-2 pr-2">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${t.outcome === "YES" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                          {t.outcome}
                        </span>
                      </td>
                      <td className="py-2 text-right font-mono">{Number(t.shares).toFixed(1)}</td>
                      <td className="py-2 text-right font-mono">${Number(t.avgPrice).toFixed(3)}</td>
                      <td className="py-2 text-right font-mono">${Number(t.currentPrice).toFixed(3)}</td>
                      <td className={`py-2 text-right font-mono font-bold ${t.pnl >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {t.pnl >= 0 ? "+" : ""}${Number(t.pnl).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
