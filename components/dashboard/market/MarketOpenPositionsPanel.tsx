"use client";

import React from "react";
import type { MarketTrade } from "@/components/dashboard/market/types";

function PnlValue({ value }: { value: number }) {
  const color = value > 0 ? "text-green-600" : value < 0 ? "text-red-600" : "text-gray-600";
  return <span className={`font-semibold ${color}`}>{value >= 0 ? "+" : ""}${value.toFixed(2)}</span>;
}

export default function MarketOpenPositionsPanel({ trades }: { trades: MarketTrade[] }) {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5">
      <h3 className="text-sm font-semibold text-gray-700">Open Positions</h3>
      <p className="text-xs text-gray-400 mt-1 mb-4">
        {trades.length === 0
          ? "Your direct buys and automation entries will appear here once they open."
          : `${trades.length} open position${trades.length !== 1 ? "s" : ""} across direct buys and automation.`}
      </p>

      {trades.length === 0 ? (
        <p className="text-sm text-gray-400 py-6 text-center">No open positions yet</p>
      ) : (
        <div className="space-y-2 max-h-[320px] overflow-y-auto">
          {trades.slice(0, 8).map((trade) => (
            <div key={trade.id} className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-800 truncate">{trade.marketTitle}</p>
                <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-gray-500">
                  <span className={`px-2 py-0.5 rounded-full font-medium ${trade.outcome === "YES" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                    {trade.outcome}
                  </span>
                  <span>{trade.paperTrade ? "Paper" : "Live"}</span>
                  <span>{trade.shares.toFixed(1)} shares</span>
                  <span>@ ${trade.avgPrice.toFixed(3)}</span>
                  <span>${trade.total.toFixed(2)} deployed</span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <PnlValue value={trade.pnl ?? 0} />
                <p className="text-[10px] text-gray-400 mt-1">Opened {new Date(trade.createdAt).toLocaleString()}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}