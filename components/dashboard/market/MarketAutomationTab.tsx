"use client";

import React from "react";

/**
 * MarketAutomationTab - Clean tab for building and running automation plans.
 * Uses shared design tokens for easy global aesthetic unification.
 * Phase 6 implementation per IMPLEMENTATION_PLAN.md.
 */

export default function MarketAutomationTab({
  onNavigate,
}: {
  onNavigate: (tabId: string) => void;
}) {
  return (
    <section className="rounded-[32px] border border-slate-700 bg-slate-950/70 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.45)] mb-6">
      <h1 className="text-3xl font-black text-slate-50 mb-3">Automation</h1>
      <p className="text-slate-300 text-base max-w-3xl mb-6 leading-7">
        Build, save, and run automation plans to trade on Polymarket without manual intervention. Start with practice mode to test strategies.
      </p>
      <div className="rounded-2xl border border-slate-700 bg-slate-900/50 p-5 mb-6">
        <h2 className="text-xl font-bold text-slate-200 mb-3">Create Automation Plan</h2>
        <div className="grid md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1">Plan Name</label>
            <input
              type="text"
              placeholder="e.g., Political Events Edge"
              className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Market Category</label>
            <select className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500">
              <option>Any Category</option>
              <option>Politics</option>
              <option>Sports</option>
              <option>Finance</option>
            </select>
          </div>
        </div>
        <div className="mb-4">
          <label className="block text-sm text-slate-400 mb-1">Search Terms (optional)</label>
          <input
            type="text"
            placeholder="e.g., election, candidate name"
            className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>
        <button className="px-6 py-2 bg-orange-600 hover:bg-orange-500 text-white font-semibold rounded-lg transition shadow-[0_4px_12px_rgba(253,101,41,0.3)]">
          Save Plan
        </button>
      </div>
      <div className="rounded-2xl border border-slate-700 bg-slate-900/50 p-5">
        <h2 className="text-xl font-bold text-slate-200 mb-3">Saved Plans (Placeholder)</h2>
        <p className="text-slate-400 text-sm">Saved automation plans will appear here after implementation.</p>
      </div>
    </section>
  );
}
