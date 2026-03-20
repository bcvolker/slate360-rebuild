"use client";

import React from "react";

/**
 * MarketDirectBuyTab - Clean tab for searching markets and placing manual trades.
 * Uses shared design tokens for easy global aesthetic unification.
 * Phase 5 implementation per IMPLEMENTATION_PLAN.md.
 */

export default function MarketDirectBuyTab({
  onNavigate,
}: {
  onNavigate: (tabId: string) => void;
}) {
  return (
    <section className="rounded-[32px] border border-slate-700 bg-slate-950/70 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.45)] mb-6">
      <h1 className="text-3xl font-black text-slate-50 mb-3">Direct Buy</h1>
      <p className="text-slate-300 text-base max-w-3xl mb-6 leading-7">
        Search for markets, filter by category or time, and place manual trades on Polymarket. Start with practice mode or go live.
      </p>
      <div className="rounded-2xl border border-slate-700 bg-slate-900/50 p-5 mb-6">
        <h2 className="text-xl font-bold text-slate-200 mb-3">Search Markets</h2>
        <input
          type="text"
          placeholder="Search markets, events, or keywords..."
          className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
        />
        <div className="grid md:grid-cols-3 gap-3 mt-4">
          <select className="px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500">
            <option>Category</option>
            <option>Politics</option>
            <option>Sports</option>
            <option>Finance</option>
          </select>
          <select className="px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500">
            <option>Timeframe</option>
            <option>Today</option>
            <option>This Week</option>
            <option>This Month</option>
          </select>
          <select className="px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500">
            <option>Sort By</option>
            <option>Volume</option>
            <option>Newest</option>
            <option>Edge</option>
          </select>
        </div>
        <button className="mt-4 px-6 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold rounded-lg transition shadow-[0_4px_12px_rgba(6,182,212,0.3)]">
          Search
        </button>
      </div>
      <div className="rounded-2xl border border-slate-700 bg-slate-900/50 p-5">
        <h2 className="text-xl font-bold text-slate-200 mb-3">Market Results (Placeholder)</h2>
        <p className="text-slate-400 text-sm">Market data will appear here after search implementation.</p>
      </div>
    </section>
  );
}
