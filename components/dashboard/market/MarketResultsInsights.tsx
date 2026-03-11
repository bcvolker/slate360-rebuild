"use client";

import type { ResultsAnalytics } from "@/components/dashboard/market/types";

export default function MarketResultsInsights({ analytics }: { analytics: ResultsAnalytics }) {
  const bestCategory = [...analytics.pnlByCategory].sort((left, right) => right.pnl - left.pnl)[0];
  const bestMode = [...analytics.paperVsLive].sort((left, right) => right.pnl - left.pnl)[0];
  const coachNote = analytics.winRate >= 55 && analytics.totalPnl > 0
    ? "Your current mix is profitable. Protect that edge by increasing size slowly rather than increasing trade count sharply."
    : analytics.openTrades > analytics.closedTrades
      ? "You have more open risk than closed feedback. Resolve a few cycles before changing the strategy aggressively."
      : "You are still gathering signal. Keep sizing steady and use Practice mode to test new categories before scaling.";

  return (
    <div className="grid gap-3 lg:grid-cols-3">
      <div className="rounded-[24px] border border-slate-200 bg-white/90 p-4 shadow-sm">
        <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Best topic</p>
        <p className="mt-2 text-lg font-black text-slate-900">{bestCategory?.category ?? "Not enough data"}</p>
        <p className="mt-1 text-xs text-slate-500">{bestCategory ? `${bestCategory.count} trades · ${bestCategory.pnl >= 0 ? "+" : ""}$${bestCategory.pnl.toFixed(2)}` : "Place and settle more trades to find your strongest lane."}</p>
      </div>
      <div className="rounded-[24px] border border-slate-200 bg-white/90 p-4 shadow-sm">
        <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Best mode</p>
        <p className="mt-2 text-lg font-black text-slate-900">{bestMode ? (bestMode.mode === "paper" ? "Practice" : "Live") : "Not enough data"}</p>
        <p className="mt-1 text-xs text-slate-500">{bestMode ? `${bestMode.count} trades · ${bestMode.winRate.toFixed(1)}% win rate` : "Use Practice mode to compare ideas before increasing live exposure."}</p>
      </div>
      <div className="rounded-[24px] border border-slate-200 bg-white/90 p-4 shadow-sm">
        <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Coach note</p>
        <p className="mt-2 text-sm leading-6 text-slate-600">{coachNote}</p>
      </div>
    </div>
  );
}