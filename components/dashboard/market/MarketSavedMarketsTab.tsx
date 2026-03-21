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
          <h2 className="text-lg font-bold text-slate-100">Saved Markets</h2>
          <p className="mt-0.5 text-sm text-slate-400">Markets you want to revisit quickly for practice or live trading.</p>
        </div>
        <button
          onClick={() => onNavigate("direct-buy")}
          className="rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-400/20"
        >
          Browse markets
        </button>
      </div>

      {watchlist.loading && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-10 text-center text-sm text-slate-500">
          Loading saved markets…
        </div>
      )}

      {!watchlist.loading && watchlist.items.length === 0 && (
        <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/80 p-10 text-center">
          <div className="mb-3 text-3xl">🔖</div>
          <h2 className="mb-1 text-lg font-semibold text-slate-100">No saved markets yet</h2>
          <p className="text-sm text-slate-400">Save markets from Direct Buy to build a reusable shortlist.</p>
        </div>
      )}

      {!watchlist.loading && watchlist.items.length > 0 && (
        <div className="grid gap-3">
          {watchlist.items.map((item) => (
            <div key={item.id} className="rounded-[24px] border border-zinc-800 bg-zinc-900/80 p-4 shadow-[0_16px_35px_rgba(9,9,11,0.24)]">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-100">{item.title}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {item.category ?? "General"}
                    {item.probability != null && ` · ${item.probability}% implied chance`}
                  </p>
                  <p className="mt-2 text-xs text-slate-400">
                    YES {item.yesPrice != null ? `${Math.round(item.yesPrice * 100)}¢` : "—"}
                    {" · "}
                    NO {item.noPrice != null ? `${Math.round(item.noPrice * 100)}¢` : "—"}
                  </p>
                </div>
                <button
                  onClick={() => void watchlist.removeSaved(item.marketId)}
                  className="rounded-lg border border-rose-400/30 bg-rose-500/10 px-2.5 py-1.5 text-xs font-medium text-rose-200 transition hover:bg-rose-500/20"
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
