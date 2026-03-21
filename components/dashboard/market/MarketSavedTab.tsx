"use client";

import React from "react";
import { useMarketWatchlist } from "@/lib/hooks/useMarketWatchlist";

interface MarketSavedTabProps {
  onNavigate: (tabId: string) => void;
}

export default function MarketSavedTab({ onNavigate }: MarketSavedTabProps) {
  const { items, loading, removeSaved, refresh } = useMarketWatchlist();

  return (
    <div className="saved-tab bg-zinc-950 text-slate-200 p-6 max-w-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-50">Saved Markets</h1>
          <p className="text-sm text-slate-400 mt-1">
            Markets you've bookmarked for quick access. {items.length > 0 && `${items.length} saved`}
          </p>
        </div>
        {items.length > 0 && (
          <button
            onClick={() => void refresh()}
            className="rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-1.5 text-xs font-medium text-slate-400 transition hover:text-slate-200 hover:border-slate-600"
          >
            Refresh
          </button>
        )}
      </div>

      {/* Loading state */}
      {loading && items.length === 0 && (
        <div className="flex items-center justify-center py-16">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-700 border-t-[#FF4D00]" />
        </div>
      )}

      {/* Empty state */}
      {!loading && items.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-700 bg-slate-900/30 py-16 px-6 text-center">
          <p className="text-slate-400 text-sm mb-1">No saved markets yet</p>
          <p className="text-slate-500 text-xs mb-5 max-w-xs">
            Browse markets and tap the bookmark icon to save them here for quick access.
          </p>
          <button
            onClick={() => onNavigate("direct-buy")}
            className="rounded-xl bg-[#FF4D00] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#e04400]"
          >
            Browse Markets
          </button>
        </div>
      )}

      {/* Saved market cards */}
      {items.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map(item => (
            <div
              key={item.id}
              className="group rounded-xl border border-slate-700 bg-slate-900/60 p-4 transition hover:border-slate-600"
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <h3 className="text-sm font-medium text-slate-200 leading-snug line-clamp-2">
                  {item.title}
                </h3>
                <button
                  onClick={() => void removeSaved(item.marketId)}
                  className="shrink-0 rounded-md p-1 text-slate-600 transition hover:bg-red-500/10 hover:text-red-400"
                  title="Remove from saved"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {item.category && (
                <span className="inline-block rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-medium text-slate-400 mb-3">
                  {item.category}
                </span>
              )}

              <div className="flex items-center gap-4 text-xs text-slate-500">
                {item.yesPrice != null && (
                  <span>Yes <span className="font-semibold text-emerald-400">{(item.yesPrice * 100).toFixed(0)}¢</span></span>
                )}
                {item.noPrice != null && (
                  <span>No <span className="font-semibold text-red-400">{(item.noPrice * 100).toFixed(0)}¢</span></span>
                )}
                {item.probability != null && (
                  <span>Prob <span className="font-semibold text-slate-300">{item.probability.toFixed(0)}%</span></span>
                )}
              </div>

              <p className="mt-2 text-[10px] text-slate-600">
                Saved {new Date(item.createdAt).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
