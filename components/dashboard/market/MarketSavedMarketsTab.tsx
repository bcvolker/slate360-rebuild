"use client";

import React from "react";
import { useMarketWatchlist } from "@/lib/hooks/useMarketWatchlist";

interface MarketSavedMarketsTabProps {
  onNavigate: (tabId: string) => void;
}

export default function MarketSavedMarketsTab({ onNavigate }: MarketSavedMarketsTabProps) {
  const watchlist = useMarketWatchlist();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Saved Markets</h2>
          <p className="text-sm text-gray-500 mt-0.5">Markets you want to revisit quickly for paper or live trading.</p>
        </div>
        <button
          onClick={() => onNavigate("direct-buy")}
          className="px-4 py-2 bg-[#FF4D00] text-white rounded-lg text-sm font-semibold hover:bg-[#e04400] transition"
        >
          Browse markets
        </button>
      </div>

      {watchlist.loading && (
        <div className="rounded-xl border border-gray-200 bg-white p-10 text-center text-sm text-gray-400">
          Loading saved markets…
        </div>
      )}

      {!watchlist.loading && watchlist.items.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-200 bg-white p-10 text-center">
          <div className="text-3xl mb-3">🔖</div>
          <h2 className="text-lg font-semibold text-gray-900 mb-1">No saved markets yet</h2>
          <p className="text-sm text-gray-500">Save markets from Direct Buy to build a reusable shortlist.</p>
        </div>
      )}

      {!watchlist.loading && watchlist.items.length > 0 && (
        <div className="grid gap-3">
          {watchlist.items.map((item) => (
            <div key={item.id} className="rounded-2xl border border-gray-100 bg-white shadow-sm p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-900 truncate">{item.title}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {item.category ?? "General"}
                    {item.probability != null && ` · ${item.probability}% implied chance`}
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    YES {item.yesPrice != null ? `${Math.round(item.yesPrice * 100)}¢` : "—"}
                    {" · "}
                    NO {item.noPrice != null ? `${Math.round(item.noPrice * 100)}¢` : "—"}
                  </p>
                </div>
                <button
                  onClick={() => void watchlist.removeSaved(item.marketId)}
                  className="px-2.5 py-1.5 rounded-lg bg-red-50 text-red-600 border border-red-200 text-xs font-medium hover:bg-red-100 transition"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
