"use client";

import React from "react";
import { outcomePlainLabel, tradeModeLabel } from "@/lib/market/market-display";
import type { MarketTrade } from "@/components/dashboard/market/types";

function PnlValue({ value }: { value: number }) {
  const color = value > 0 ? "text-green-400" : value < 0 ? "text-red-400" : "text-slate-400";
  return <span className={`font-semibold ${color}`}>{value >= 0 ? "+" : ""}${value.toFixed(2)}</span>;
}

export default function MarketOpenPositionsPanel({ trades, onOpenTrade }: { trades: MarketTrade[]; onOpenTrade: (trade: MarketTrade) => void }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-5">
      <h3 className="text-lg font-black text-slate-100">Open positions</h3>
      <p className="text-sm text-slate-400 mt-1 mb-4">
        {trades.length === 0
          ? "Your direct buys and automation entries will appear here once they open."
          : `${trades.length} open position${trades.length !== 1 ? "s" : ""} across direct buys and automation.`}
      </p>

      {trades.length === 0 ? (
        <p className="text-sm text-slate-500 py-6 text-center">No open positions yet</p>
      ) : (
        <div className="space-y-2 max-h-[320px] overflow-y-auto">
          {trades.slice(0, 8).map((trade) => (
            <button key={trade.id} onClick={() => onOpenTrade(trade)} className="w-full rounded-2xl border border-zinc-800 bg-zinc-950/80 px-4 py-4 text-left flex items-start justify-between gap-3 transition hover:border-cyan-400/30 hover:bg-zinc-900">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-100 truncate">{trade.marketTitle}</p>
                <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-slate-400">
                  <span className={`px-2 py-0.5 rounded-lg font-medium ${trade.outcome === "YES" ? "bg-green-500/15 text-green-300" : "bg-red-500/15 text-red-300"}`}>
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
                <p className="text-[10px] text-slate-500 mt-1">Opened {new Date(trade.createdAt).toLocaleString()}</p>
                <p className="mt-2 text-[11px] font-semibold text-[#FF4D00]">Open details →</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}