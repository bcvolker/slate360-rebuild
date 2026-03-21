"use client";

import React from "react";
import type { LiveChecklist } from "@/components/dashboard/market/types";
import type { MarketSystemStatusViewModel } from "@/lib/market/contracts";
import MarketSystemStatusCard from "@/components/dashboard/market/MarketSystemStatusCard";

interface WalletSnapshot {
  address: string;
  isConnected: boolean;
  usdcBalance: string;
  maticFormatted: string;
  walletVerified: boolean;
}

interface MarketLiveWalletTabProps {
  onNavigate: (tabId: string) => void;
  paperMode: boolean;
  liveChecklist: LiveChecklist;
  walletSnapshot: WalletSnapshot;
  system: MarketSystemStatusViewModel | null;
  onOpenAutomation: () => void;
}

const CHECKLIST_ITEMS: { key: keyof LiveChecklist; label: string; hint: string }[] = [
  { key: "walletConnected", label: "Wallet Connected", hint: "Connect MetaMask, Coinbase, or Trust Wallet" },
  { key: "polygonSelected", label: "Polygon Network", hint: "Switch to Polygon (Matic) chain" },
  { key: "usdcFunded", label: "USDC Funded", hint: "Deposit USDC to your Polygon wallet" },
  { key: "signatureVerified", label: "Signature Verified", hint: "Sign a message to verify wallet ownership" },
  { key: "usdcApproved", label: "USDC Approved", hint: "Approve USDC spending for Polymarket" },
];

export default function MarketLiveWalletTab({
  onNavigate,
  paperMode,
  liveChecklist,
  walletSnapshot,
  system,
  onOpenAutomation,
}: MarketLiveWalletTabProps) {
  const passedCount = CHECKLIST_ITEMS.filter(c => liveChecklist[c.key]).length;
  const allPassed = passedCount === CHECKLIST_ITEMS.length;

  return (
    <div className="live-wallet-tab bg-zinc-950 text-slate-200 p-6 max-w-full overflow-hidden">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-2xl font-bold text-slate-50">Wallet &amp; Live Trading</h1>
          <span className={`rounded-lg px-2.5 py-0.5 text-xs font-semibold ${
            paperMode
              ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
              : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
          }`}>
            {paperMode ? "Practice Mode" : "Live Mode"}
          </span>
        </div>
        <p className="text-sm text-slate-400 max-w-2xl">
          Connect your wallet, complete the readiness checklist, and manage balances for live trading on Polymarket.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Left column: Connection + Balances */}
        <div className="space-y-5">
          {/* Wallet status card */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-3">Wallet</h2>
            {walletSnapshot.isConnected ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-sm font-medium text-emerald-300">Connected</span>
                </div>
                <p className="font-mono text-xs text-slate-400 break-all">{walletSnapshot.address}</p>
                {walletSnapshot.walletVerified && (
                  <span className="inline-block rounded-lg bg-emerald-500/15 border border-emerald-500/25 px-2 py-0.5 text-[11px] font-semibold text-emerald-300">
                    Verified
                  </span>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-slate-600" />
                  <span className="text-sm text-slate-400">Not connected</span>
                </div>
                <p className="text-xs text-slate-500">
                  Use the Connect Wallet button in the navigation bar to get started.
                </p>
              </div>
            )}
          </div>

          {/* Balances card */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-3">Balances</h2>
            {walletSnapshot.isConnected ? (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500 mb-1">USDC (Polygon)</p>
                  <p className="text-lg font-bold text-slate-100">${walletSnapshot.usdcBalance}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">MATIC</p>
                  <p className="text-lg font-bold text-slate-100">{walletSnapshot.maticFormatted}</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-500">Connect your wallet to view balances.</p>
            )}
          </div>

          {/* System status */}
          <MarketSystemStatusCard
            title="System Status"
            system={system}
            loading={false}
            error={null}
          />
        </div>

        {/* Right column: Live Readiness Checklist */}
        <div className="space-y-5">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">Live Readiness</h2>
              <span className="text-xs font-medium text-slate-400">{passedCount}/{CHECKLIST_ITEMS.length}</span>
            </div>

            {/* Progress bar */}
            <div className="h-1.5 rounded-full bg-slate-800 mb-5 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#FF4D00] to-orange-400 transition-all duration-500"
                style={{ width: `${(passedCount / CHECKLIST_ITEMS.length) * 100}%` }}
              />
            </div>

            {/* Checklist items */}
            <ul className="space-y-3">
              {CHECKLIST_ITEMS.map(item => {
                const passed = liveChecklist[item.key];
                return (
                  <li key={item.key} className="flex items-start gap-3">
                    <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      passed
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                        : "bg-slate-800 text-slate-600 border border-zinc-800"
                    }`}>
                      {passed ? "✓" : ""}
                    </span>
                    <div>
                      <p className={`text-sm font-medium ${passed ? "text-slate-200" : "text-slate-400"}`}>{item.label}</p>
                      {!passed && <p className="text-xs text-slate-500 mt-0.5">{item.hint}</p>}
                    </div>
                  </li>
                );
              })}
            </ul>

            {allPassed && (
              <div className="mt-5 rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-3 text-center">
                <p className="text-sm font-semibold text-emerald-300">All checks passed — you're ready for live trading</p>
              </div>
            )}
          </div>

          {/* Quick actions */}
          <div className="flex gap-3">
            <button
              onClick={onOpenAutomation}
              className="flex-1 rounded-xl border border-zinc-800 bg-slate-800/60 px-4 py-3 text-sm font-medium text-slate-300 transition hover:border-zinc-700 hover:text-slate-100"
            >
              Set Up Automation →
            </button>
            <button
              onClick={() => onNavigate("direct-buy")}
              className="flex-1 rounded-xl border border-[#FF4D00]/30 bg-[#FF4D00]/10 px-4 py-3 text-sm font-medium text-[#FF4D00] transition hover:bg-[#FF4D00]/20"
            >
              Browse Markets →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
