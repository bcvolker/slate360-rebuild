import React from "react";
import type { MarketSummaryViewModel } from "@/lib/market/contracts";
import { StatusBadge } from "@/components/dashboard/market/MarketSharedUi";
import MarketActivityLog from "@/components/dashboard/market/MarketActivityLog";
import type { MarketActivityLogEntry } from "@/components/dashboard/market/types";

type RecentOutcome = {
  id: string;
  marketTitle: string;
  status: string;
  pnl: number | null;
  createdAt: string;
};

type MarketWalletPerformanceTabProps = {
  summaryMode: "paper" | "live";
  botRunning: boolean;
  botPaused: boolean;
  isConnected: boolean;
  usdcBalance: string | null;
  summaryError: string | null;
  summary: MarketSummaryViewModel | null;
  loadingSummary: boolean;
  recentOutcomes: RecentOutcome[];
  activityLogs: MarketActivityLogEntry[];
  scanLog: string[];
  formatMoney: (usd: number) => string;
  onRefreshSummary: () => void;
};

export default function MarketWalletPerformanceTab({
  summaryMode,
  botRunning,
  botPaused,
  isConnected,
  usdcBalance,
  summaryError,
  summary,
  loadingSummary,
  recentOutcomes,
  activityLogs,
  scanLog,
  formatMoney,
  onRefreshSummary,
}: MarketWalletPerformanceTabProps) {
  return (
    <div className="space-y-4">
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4 flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`text-[11px] px-2.5 py-1 rounded-full border font-semibold ${
                summaryMode === "paper"
                  ? "bg-purple-100 text-purple-700 border-purple-200"
                  : "bg-green-100 text-green-700 border-green-200"
              }`}
            >
              {summaryMode === "paper" ? "Paper Mode" : "Live Mode"}
            </span>
            <StatusBadge status={botPaused ? "idle" : botRunning ? "running" : "idle"} />
          </div>
          <p className="text-sm font-medium text-gray-800">
            {summaryMode === "paper" ? "Paper trading: safe practice" : "Live trading: connected"}
          </p>
          {summaryMode === "live" && (!isConnected || usdcBalance == null) && (
            <p className="text-xs text-amber-600 mt-1">Live balance not connected yet.</p>
          )}
        </div>
        <button
          onClick={onRefreshSummary}
          className="text-xs text-gray-500 hover:text-gray-800 border border-gray-200 rounded-lg px-3 py-1.5"
        >
          ↻ Refresh Summary
        </button>
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4">
        <h3 className="text-sm font-semibold text-gray-800 mb-2">Live Wallet Setup (5 Steps)</h3>
        <ol className="text-xs text-gray-600 space-y-1 list-decimal pl-4">
          <li>Download MetaMask (or Coinbase Wallet / Trust Wallet).</li>
          <li>Create your wallet and safely back up the recovery phrase.</li>
          <li>Switch network to Polygon.</li>
          <li>Fund with USDC + a small MATIC balance for gas.</li>
          <li>Connect wallet, verify signature, and approve USDC for trading.</li>
        </ol>
        <div className="mt-3 flex gap-2 flex-wrap">
          <a
            href="https://global.transak.com/?defaultCryptoCurrency=USDC&network=polygon"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs bg-gray-100 hover:bg-gray-200 border border-gray-200 px-3 py-1.5 rounded-lg"
          >
            Buy USDC via Transak
          </a>
          <a
            href="https://ramp.network/buy/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs bg-gray-100 hover:bg-gray-200 border border-gray-200 px-3 py-1.5 rounded-lg"
          >
            Buy USDC via Ramp
          </a>
        </div>
      </div>

      {summaryError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">{summaryError}</div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4 space-y-3">
          <h3 className="text-sm font-semibold text-gray-800">Wallet Snapshot</h3>
          {loadingSummary && !summary ? (
            <p className="text-sm text-gray-400">Loading wallet snapshot…</p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                <p className="text-xs text-gray-500">Starting Balance</p>
                <p className="text-lg font-semibold text-gray-900">
                  {formatMoney(summary?.startingBalanceUsd ?? 0)}
                </p>
              </div>
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                <p className="text-xs text-gray-500">Current Balance</p>
                <p className="text-lg font-semibold text-gray-900">
                  {formatMoney(summary?.currentBalanceUsd ?? 0)}
                </p>
              </div>
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                <p className="text-xs text-gray-500">Available Cash</p>
                <p className="text-lg font-semibold text-gray-900">
                  {formatMoney(summary?.availableCashUsd ?? 0)}
                </p>
              </div>
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                <p className="text-xs text-gray-500">Total Profit / Loss</p>
                <p
                  className={`text-lg font-semibold ${(summary?.totalProfitLossUsd ?? 0) >= 0 ? "text-green-600" : "text-red-600"}`}
                >
                  {(summary?.totalProfitLossUsd ?? 0) >= 0 ? "+" : ""}
                  {formatMoney(summary?.totalProfitLossUsd ?? 0)}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4 space-y-3">
          <h3 className="text-sm font-semibold text-gray-800">Performance Metrics</h3>
          {loadingSummary && !summary ? (
            <p className="text-sm text-gray-400">Loading performance metrics…</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                <p className="text-xs text-gray-500">Today Profit / Loss</p>
                <p className={`font-semibold ${(summary?.todayProfitLossUsd ?? 0) >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {formatMoney(summary?.todayProfitLossUsd ?? 0)}
                </p>
              </div>
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                <p className="text-xs text-gray-500">Open Positions</p>
                <p className="font-semibold text-gray-900">{summary?.openPositions ?? 0}</p>
              </div>
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                <p className="text-xs text-gray-500">Total Trades</p>
                <p className="font-semibold text-gray-900">{summary?.totalTrades ?? 0}</p>
              </div>
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                <p className="text-xs text-gray-500">Win Rate</p>
                <p className="font-semibold text-gray-900">{(summary?.winRatePct ?? 0).toFixed(1)}%</p>
              </div>
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                <p className="text-xs text-gray-500">Average Trade Size</p>
                <p className="font-semibold text-gray-900">{formatMoney(summary?.averageTradeUsd ?? 0)}</p>
              </div>
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                <p className="text-xs text-gray-500">Average Profit per Trade</p>
                <p className="font-semibold text-gray-900">{formatMoney(summary?.averageProfitUsd ?? 0)}</p>
              </div>
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                <p className="text-xs text-gray-500">Best Day</p>
                <p className="font-semibold text-green-600">{formatMoney(summary?.bestDayUsd ?? 0)}</p>
              </div>
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                <p className="text-xs text-gray-500">Worst Day</p>
                <p className="font-semibold text-red-600">{formatMoney(summary?.worstDayUsd ?? 0)}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4">
          <h3 className="text-sm font-semibold text-gray-800 mb-3">Recent Outcomes</h3>
          {recentOutcomes.length === 0 ? (
            <p className="text-sm text-gray-400">No trades yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-gray-400 border-b border-gray-200">
                    <th className="pb-2 text-left font-medium">Market</th>
                    <th className="pb-2 text-left font-medium">Result</th>
                    <th className="pb-2 text-right font-medium">Profit / Loss</th>
                    <th className="pb-2 text-right font-medium">When</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOutcomes.map((trade) => (
                    <tr key={trade.id} className="border-b border-gray-100">
                      <td className="py-2 pr-2 max-w-[220px] truncate text-gray-700">{trade.marketTitle}</td>
                      <td className="py-2 pr-2 text-gray-600">{trade.status === "closed" ? "Closed" : "Open"}</td>
                      <td className={`py-2 text-right font-mono ${(trade.pnl ?? 0) >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {(trade.pnl ?? 0) >= 0 ? "+" : ""}
                        {formatMoney(trade.pnl ?? 0)}
                      </td>
                      <td className="py-2 text-right text-gray-400">{new Date(trade.createdAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4">
          <h3 className="text-sm font-semibold text-gray-800 mb-3">What the Bot Did Recently</h3>
          <div className="bg-gray-50 border border-gray-100 rounded-lg p-3 h-80 overflow-y-auto text-xs space-y-1">
            <MarketActivityLog
              activityLogs={activityLogs}
              scanLog={scanLog}
              emptyText="No recent bot actions yet."
              maxScanRows={100}
            />
          </div>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-gray-600">
              Last Run: {summary?.lastRunIso ? new Date(summary.lastRunIso).toLocaleString() : "Not available"}
            </div>
            <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-gray-600">
              Run Frequency: {summary?.runFrequencySeconds != null ? `${summary.runFrequencySeconds}s` : "Not enough history"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
