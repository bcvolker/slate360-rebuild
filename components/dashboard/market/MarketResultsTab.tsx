"use client";

import React from "react";

/**
 * MarketResultsTab - Clean tab for viewing portfolio, trades, and bot activity.
 * Uses shared design tokens for easy global aesthetic unification.
 * Phase 7 implementation per IMPLEMENTATION_PLAN.md.
 */

export default function MarketResultsTab({
  onNavigate,
}: {
  onNavigate: (tabId: string) => void;
}) {
  return (
    <section className="rounded-[32px] border border-slate-700 bg-slate-950/70 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.45)] mb-6">
      <h1 className="text-3xl font-black text-slate-50 mb-3">Results</h1>
      <p className="text-slate-300 text-base max-w-3xl mb-6 leading-7">
        Review your portfolio, recent trades, profit/loss metrics, and automation activity.
      </p>
      <div className="rounded-2xl border border-slate-700 bg-slate-900/50 p-5 mb-6">
        <h2 className="text-xl font-bold text-slate-200 mb-3">Portfolio Snapshot (Placeholder)</h2>
        <p className="text-slate-400 text-sm">Portfolio metrics and charts will appear here after implementation.</p>
      </div>
      <div className="rounded-2xl border border-slate-700 bg-slate-900/50 p-5 mb-6">
        <h2 className="text-xl font-bold text-slate-200 mb-3">Recent Trades (Placeholder)</h2>
        <p className="text-slate-400 text-sm">Recent trade history will appear here after implementation.</p>
      </div>
      <div className="rounded-2xl border border-slate-700 bg-slate-900/50 p-5">
        <h2 className="text-xl font-bold text-slate-200 mb-3">Bot Activity (Placeholder)</h2>
        <p className="text-slate-400 text-sm">Automation activity logs will appear here after implementation.</p>
      </div>
    </section>
  );
}
