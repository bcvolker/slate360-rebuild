"use client";

import React from "react";
import { outcomePlainLabel, tradeModeLabel } from "@/lib/market/market-display";
import type { MarketTrade } from "@/components/dashboard/market/types";

function PnlValue({ value }: { value: number }) {
  const color = value > 0 ? "text-green-600" : value < 0 ? "text-red-600" : "text-gray-600";
  return <span className={`font-semibold ${color}`}>{value >= 0 ? "+" : ""}${value.toFixed(2)}</span>;
}

export default function MarketOpenPositionsPanel({ trades, onOpenTrade }: { trades: MarketTrade[]; onOpenTrade: (trade: MarketTrade) => void }) {
  return (
    <div className="rounded-[28px] border border-slate-200 bg-white/90 p-5 shadow-sm">
      <h3 className="text-lg font-black text-slate-900">Open positions</h3>
      <p className="text-sm text-slate-500 mt-1 mb-4">
        {trades.length === 0
          ? "Your direct buys and automation entries will appear here once they open."
          : `${trades.length} open position${trades.length !== 1 ? "s" : ""} across direct buys and automation.`}
      </p>

      {trades.length === 0 ? (
        <p className="text-sm text-gray-400 py-6 text-center">No open positions yet</p>
      ) : (
        <div className="space-y-2 max-h-[320px] overflow-y-auto">
          {trades.slice(0, 8).map((trade) => (
            <button key={trade.id} onClick={() => onOpenTrade(trade)} className="w-full rounded-[24px] border border-slate-200 bg-[linear-gradient(135deg,rgba(255,255,255,0.94),rgba(246,248,251,0.94))] px-4 py-4 text-left flex items-start justify-between gap-3 transition hover:border-[#FF4D00]/30 hover:shadow-sm">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-800 truncate">{trade.marketTitle}</p>
                <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-slate-500">
                  <span className={`px-2 py-0.5 rounded-full font-medium ${trade.outcome === "YES" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                    {outcomePlainLabel(trade.outcome)}
                  </span>
                  <span>{tradeModeLabel(trade)}</span>
                  <span>{trade.shares.toFixed(1)} shares</span>
                  <span>@ ${trade.avgPrice.toFixed(3)}</span>
                  <span>${trade.total.toFixed(2)} deployed</span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <PnlValue value={trade.pnl ?? 0} />
                <p className="text-[10px] text-slate-400 mt-1">Opened {new Date(trade.createdAt).toLocaleString()}</p>
                <p className="mt-2 text-[11px] font-semibold text-[#FF4D00]">Open details →</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}