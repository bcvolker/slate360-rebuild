"use client";

import React from "react";

/**
 * MarketSavedTab - Unified saved/followed market list with alerts.
 * Uses shared design tokens for easy global aesthetic unification.
 * Phase 8 implementation per IMPLEMENTATION_PLAN.md.
 */

export default function MarketSavedTab({
  onNavigate,
}: {
  onNavigate: (tabId: string) => void;
}) {
  return (
    <section className="rounded-[32px] border border-slate-700 bg-slate-950/70 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.45)] mb-6">
      <h1 className="text-3xl font-black text-slate-50 mb-3">Saved Markets</h1>
      <p className="text-slate-300 text-base max-w-3xl mb-6 leading-7">
        View and manage your saved markets and set alerts for price changes or events on Polymarket.
      </p>
      <div className="rounded-2xl border border-slate-700 bg-slate-900/50 p-5 mb-6">
        <h2 className="text-xl font-bold text-slate-200 mb-3">Saved Markets List (Placeholder)</h2>
        <p className="text-slate-400 text-sm">Your saved markets will appear here after implementation.</p>
      </div>
      <div className="rounded-2xl border border-slate-700 bg-slate-900/50 p-5">
        <h2 className="text-xl font-bold text-slate-200 mb-3">Alerts (Placeholder)</h2>
        <p className="text-slate-400 text-sm">Set and manage alerts for saved markets after implementation.</p>
      </div>
    </section>
  );
}
