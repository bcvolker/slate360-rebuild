"use client";

import React from "react";

/**
 * MarketStartHereTab - First screen for Market Robot.
 * Explains the tool, paper vs live mode, and routes to direct buy or automation.
 * Clean design with shared CSS tokens for easy global aesthetic changes.
 */

export default function MarketStartHereTab({
  onNavigate,
  onApplyRecommendation,
  onQuickStart,
  onStopBot,
  paperMode,
  serverStatus,
  serverConfirmed,
  serverHealth,
}: {
  onNavigate: (tabId: string) => void;
  onApplyRecommendation?: (plan: any) => void;
  onQuickStart?: () => void;
  onStopBot?: () => void;
  paperMode: boolean;
  serverStatus: string;
  serverConfirmed: boolean;
  serverHealth: any;
}) {
  return (
    <section className="rounded-[32px] border border-slate-700 bg-slate-950/70 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.45)] mb-6">
      <h1 className="text-3xl font-black text-slate-50 mb-3">Market Robot</h1>
      <p className="text-slate-300 text-base max-w-3xl mb-6 leading-7">
        Automate trading or make direct buys on Polymarket. Start with <strong>practice mode</strong> to test strategies, then switch to <strong>real money</strong> when ready.
      </p>
      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <div className="rounded-2xl border border-violet-500/30 bg-violet-950/20 p-5">
          <h2 className="text-xl font-bold text-violet-200 mb-2">Practice Mode {paperMode && <span className="text-xs bg-violet-600 text-white px-2 py-1 rounded-full">Active</span>}</h2>
          <p className="text-violet-100 text-sm leading-6">Test strategies with virtual funds. No risk, full learning.</p>
        </div>
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-5">
          <h2 className="text-xl font-bold text-emerald-200 mb-2">Live Mode {!paperMode && <span className="text-xs bg-emerald-600 text-white px-2 py-1 rounded-full">Active</span>}</h2>
          <p className="text-emerald-100 text-sm leading-6">Trade with real money. Requires wallet connection and backend readiness.</p>
        </div>
      </div>
      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <button
          onClick={() => onNavigate("direct-buy")}
          className="px-6 py-4 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-base rounded-xl transition shadow-[0_8px_24px_rgba(6,182,212,0.4)] hover:shadow-[0_12px_32px_rgba(6,182,212,0.5)]"
        >
          Go to Direct Buy
        </button>
        <button
          onClick={() => onNavigate("automation")}
          className="px-6 py-4 bg-orange-600 hover:bg-orange-500 text-white font-semibold text-base rounded-xl transition shadow-[0_8px_24px_rgba(253,101,41,0.4)] hover:shadow-[0_12px_32px_rgba(253,101,41,0.5)]"
        >
          Set Up Automation
        </button>
      </div>
      <div className="text-slate-400 text-xs italic">Current runtime status: {serverStatus}. {serverConfirmed ? "Confirmed by server." : "Awaiting server confirmation."}</div>
    </section>
  );
}
