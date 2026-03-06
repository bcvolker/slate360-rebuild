"use client";

import React from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { HelpTip } from "@/components/dashboard/market/MarketSharedUi";
import { FOCUS_AREAS } from "@/components/dashboard/market/market-constants";
import type { WhaleActivityViewModel } from "@/components/dashboard/market/types";

interface MarketWhaleWatchTabProps {
  whaleData: WhaleActivityViewModel[];
  loadingWhales: boolean;
  whaleFilter: string;
  paperMode: boolean;
  onFilterChange: (f: string) => void;
  onRefresh: () => void;
  onCopyTrade: (whale: WhaleActivityViewModel) => void;
}

export default function MarketWhaleWatchTab({
  whaleData,
  loadingWhales,
  whaleFilter,
  paperMode,
  onFilterChange,
  onRefresh,
  onCopyTrade,
}: MarketWhaleWatchTabProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-700 flex items-center gap-1">
          🐋 Whale Activity
          <HelpTip content="Large ($5k+) buys from sophisticated Polymarket wallets. Following whales is one of the most profitable strategies." />
        </h3>
        <div className="flex gap-2 items-center">
          <select value={whaleFilter} onChange={e => onFilterChange(e.target.value)}
            className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-xs text-gray-900 outline-none focus:border-[#FF4D00]">
            <option value="all">All Categories</option>
            {FOCUS_AREAS.map(a => <option key={a} value={a.toLowerCase()}>{a}</option>)}
          </select>
          <button onClick={onRefresh} disabled={loadingWhales}
            className="bg-gray-100 hover:bg-gray-200 border border-gray-200 px-3 py-1.5 rounded-lg text-xs text-gray-700 transition disabled:opacity-50">
            {loadingWhales ? "Loading…" : "↻ Refresh"}
          </button>
        </div>
      </div>

      {loadingWhales ? (
        <div className="text-center py-12 text-gray-400">Fetching whale activity…</div>
      ) : whaleData.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-8 text-center">
          <p className="text-gray-500 text-sm mb-3">No whale activity loaded yet</p>
          <button onClick={onRefresh} className="bg-[#1E3A8A] hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition">
            🐋 Load Whale Data
          </button>
        </div>
      ) : (
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr className="text-gray-500">
                  <th className="px-4 py-3 text-left font-medium">Whale</th>
                  <th className="px-4 py-3 text-left font-medium">Market</th>
                  <th className="px-3 py-3 text-center font-medium">Outcome</th>
                  <th className="px-3 py-3 text-right font-medium">Shares</th>
                  <th className="px-3 py-3 text-right font-medium">Amount</th>
                  <th className="px-3 py-3 text-right font-medium">Time</th>
                  <th className="px-3 py-3 text-center font-medium">Copy</th>
                </tr>
              </thead>
              <tbody>
                {whaleData
                  .filter(w => whaleFilter === "all" || w.category.toLowerCase() === whaleFilter)
                  .map((w, i) => (
                    <tr key={i} className="border-t border-gray-100 hover:bg-gray-100/30">
                      <td className="px-4 py-3 font-mono text-[#1E3A8A] font-semibold">{w.whaleAddress}</td>
                      <td className="px-4 py-3 max-w-[200px] truncate text-gray-700">{w.marketTitle}</td>
                      <td className="px-3 py-3 text-center">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${w.outcome === "YES" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                          {w.outcome}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right font-mono text-gray-700">{Number(w.shares).toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                      <td className="px-3 py-3 text-right font-mono text-gray-900 font-bold">${Number(w.amountUsd).toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                      <td className="px-3 py-3 text-right text-gray-400">{new Date(w.timestamp).toLocaleTimeString()}</td>
                      <td className="px-3 py-3 text-center">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => onCopyTrade(w)}
                              className="text-xs bg-blue-50 hover:bg-blue-100 text-[#1E3A8A] border border-blue-200 px-2 py-0.5 rounded transition"
                            >
                              {paperMode ? "Paper Copy" : "Copy"}
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>Queue a copy of this whale&apos;s trade for the next scan.</TooltipContent>
                        </Tooltip>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
