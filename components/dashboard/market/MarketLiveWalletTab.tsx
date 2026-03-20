"use client";

import React from "react";
import MarketSystemStatusCard from "@/components/dashboard/market/MarketSystemStatusCard";

/**
 * MarketLiveWalletTab - Connect, verify, approve, and understand live-readiness.
 * Updated to accept required props from MarketClient.tsx.
 */

export default function MarketLiveWalletTab({
  onNavigate,
  paperMode,
  liveChecklist,
  walletSnapshot,
  system,
  onOpenAutomation,
}: {
  onNavigate: (tabId: string) => void;
  paperMode: boolean;
  liveChecklist: any;
  walletSnapshot: any;
  system: any;
  onOpenAutomation: () => void;
}) {
  return (
    <section className="rounded-[32px] border border-slate-700 bg-slate-950/70 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.45)] mb-6">
      <h1 className="text-3xl font-black text-slate-50 mb-3">Live Wallet</h1>
      <p className="text-slate-300 text-base max-w-3xl mb-6 leading-7">
        Connect your wallet, verify signatures, and confirm live readiness to trade with real money on Polymarket.
      </p>

      <MarketSystemStatusCard
        title="Live Trading Readiness"
        mode="live"
        paperMode={paperMode}
        liveChecklist={liveChecklist}
        system={system}
        serverStatus="unknown"
        extraBlockers={[]}
        extraWarnings={[]}
        onGoLive={() => console.log("Go live triggered")}
      />

      <div className="rounded-2xl border border-slate-700 bg-slate-900/50 p-5 mb-6 mt-6">
        <h2 className="text-xl font-bold text-slate-200 mb-3">Wallet Connection</h2>
        <button className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg transition shadow-[0_4px_12px_rgba(16,185,129,0.3)] mb-3">
          Connect Wallet
        </button>
        <p className="text-slate-400 text-sm">Wallet status will appear here after implementation.</p>
      </div>
      <div className="rounded-2xl border border-slate-700 bg-slate-900/50 p-5 mb-6">
        <h2 className="text-xl font-bold text-slate-200 mb-3">Live Readiness Checklist (Placeholder)</h2>
        <p className="text-slate-400 text-sm">Readiness steps (signature, approvals) will appear here after implementation.</p>
      </div>
      <div className="rounded-2xl border border-slate-700 bg-slate-900/50 p-5">
        <h2 className="text-xl font-bold text-slate-200 mb-3">Wallet Balances (Placeholder)</h2>
        <p className="text-slate-400 text-sm">USDC and other balances will appear here after implementation.</p>
      </div>
    </section>
  );
}
