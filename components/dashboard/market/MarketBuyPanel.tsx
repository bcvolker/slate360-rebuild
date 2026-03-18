"use client";

import React, { useState } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { HelpTip } from "@/components/dashboard/market/MarketSharedUi";
import type { MarketListing, LiveChecklist } from "@/components/dashboard/market/types";
import { formatCents, marketChanceLabel, outcomeExplanation, outcomePlainLabel } from "@/lib/market/market-display";

export interface MarketBuyPanelProps {
  market: MarketListing;
  outcome: "YES" | "NO";
  amount: number;
  takeProfitPct: number;
  stopLossPct: number;
  paper: boolean;
  submitting: boolean;
  success: string;
  liveChecklist: LiveChecklist;
  payloadReady: boolean;
  payloadIssues: string[];
  showTpSlControls?: boolean;
  formatMoney: (usd: number) => string;
  onOutcomeChange: (o: "YES" | "NO") => void;
  onAmountChange: (a: number) => void;
  onTakeProfitChange: (p: number) => void;
  onStopLossChange: (p: number) => void;
  onPaperToggle: () => void;
  onSubmit: () => void;
  onClose: () => void;
  /** Render inline in sidebar instead of full-screen overlay */
  inline?: boolean;
  /** Navigate to results tab after successful buy */
  onOpenResults?: () => void;
}

export default function MarketBuyPanel({
  market,
  outcome,
  amount,
  paper,
  submitting,
  success,
  liveChecklist,
  payloadReady,
  payloadIssues,
  formatMoney,
  onOutcomeChange,
  onAmountChange,
  onPaperToggle,
  onSubmit,
  onClose,
  inline,
  onOpenResults,
}: MarketBuyPanelProps) {
  const [showLiveConfirm, setShowLiveConfirm] = useState(false);
  const price = outcome === "YES" ? market.yesPrice : market.noPrice;
  const avgPrice = price > 0 ? price : market.probabilityPct / 100;
  const shares = amount / avgPrice;
  const payout = shares;
  const profit = payout - amount;
  const isSuccess = success.startsWith("✅");
  const successTone = isSuccess
    ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-200"
    : success.includes("Live execution blocked")
      ? "border-amber-500/30 bg-amber-500/15 text-amber-200"
      : "border-rose-500/30 bg-rose-500/15 text-rose-200";

  const handleModeSwitch = () => {
    if (paper) { setShowLiveConfirm(true); } else { onPaperToggle(); }
  };
  const confirmLive = () => { setShowLiveConfirm(false); onPaperToggle(); };

  const panelContent = (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] uppercase tracking-[0.15em] text-slate-500">Trade ticket</p>
          <p className="mt-0.5 text-sm font-bold text-slate-100 leading-snug line-clamp-2">{market.title}</p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] text-slate-400">
            <span className="rounded-full border border-slate-700 bg-slate-900 px-2 py-0.5">{market.category}</span>
            <span>{marketChanceLabel(market.probabilityPct)}</span>
          </div>
        </div>
        <button onClick={onClose} className="text-slate-500 hover:text-slate-200 text-sm leading-none transition">×</button>
      </div>

      {/* Mode selector — compact */}
      <div className="rounded-lg border border-slate-700 bg-slate-900/80 p-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${paper ? "bg-violet-500/20 text-violet-300 border border-violet-500/30" : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"}`}>
              {paper ? "PRACTICE" : "LIVE"}
            </span>
            <span className="text-[10px] text-slate-400">{paper ? "Simulated" : "Real USDC"}</span>
            <HelpTip content={paper ? "Practice mode simulates the trade. No real money is spent." : "Live mode executes on Polymarket using your wallet."} />
          </div>
          <button onClick={handleModeSwitch}
            className={`relative w-8 h-4.5 rounded-full transition ${paper ? "bg-violet-600" : "bg-emerald-600"}`}>
            <span className={`absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white shadow transition-transform ${paper ? "translate-x-4" : "translate-x-0.5"}`} />
          </button>
        </div>
        {showLiveConfirm && (
          <div className="mt-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-2 text-[11px] text-amber-200">
            <p className="font-semibold">Switch to live?</p>
            <p className="mt-0.5 text-amber-300/80">Uses real USDC from your wallet.</p>
            <div className="mt-1.5 flex gap-1.5">
              <button onClick={confirmLive} className="rounded bg-amber-600 px-2 py-0.5 text-[10px] font-bold text-white hover:bg-amber-500">Confirm</button>
              <button onClick={() => setShowLiveConfirm(false)} className="rounded border border-slate-600 px-2 py-0.5 text-[10px] text-slate-300 hover:bg-slate-800">Cancel</button>
            </div>
          </div>
        )}
        {!paper && (
          <div className="mt-1.5 grid grid-cols-2 gap-1 text-[10px] text-slate-400">
            <span>{liveChecklist.walletConnected ? "✅" : "⬜"} Wallet</span>
            <span>{liveChecklist.polygonSelected ? "✅" : "⬜"} Polygon</span>
            <span>{liveChecklist.signatureVerified ? "✅" : "⬜"} Signature</span>
            <span>{liveChecklist.usdcApproved ? "✅" : "⬜"} USDC</span>
          </div>
        )}
      </div>

      {/* YES / NO */}
      <div className="grid grid-cols-2 gap-2">
        <button onClick={() => onOutcomeChange("YES")}
          className={`rounded-lg border p-2 text-left transition ${outcome === "YES" ? "border-emerald-500/40 bg-emerald-500/15" : "border-slate-700 bg-slate-900 hover:border-slate-600"}`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-100">{outcomePlainLabel("YES")}</span>
            <span className="rounded-full bg-emerald-600 px-1.5 py-0.5 text-[9px] font-bold text-white">YES</span>
          </div>
          <p className="mt-0.5 text-base font-black text-slate-100">{formatCents(market.yesPrice)}</p>
          <p className="text-[9px] text-slate-500">{outcomeExplanation("YES")}</p>
        </button>
        <button onClick={() => onOutcomeChange("NO")}
          className={`rounded-lg border p-2 text-left transition ${outcome === "NO" ? "border-rose-500/40 bg-rose-500/15" : "border-slate-700 bg-slate-900 hover:border-slate-600"}`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-100">{outcomePlainLabel("NO")}</span>
            <span className="rounded-full bg-rose-600 px-1.5 py-0.5 text-[9px] font-bold text-white">NO</span>
          </div>
          <p className="mt-0.5 text-base font-black text-slate-100">{formatCents(market.noPrice)}</p>
          <p className="text-[9px] text-slate-500">{outcomeExplanation("NO")}</p>
        </button>
      </div>

      {/* Amount */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <label className="text-[11px] text-slate-400">Amount</label>
          <input type="number" min={5} step={5} value={amount}
            onChange={(e) => onAmountChange(Math.max(5, Number(e.target.value) || 5))}
            className="w-20 rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-sm font-semibold text-slate-100 outline-none focus:border-[#FF4D00]" />
          <span className="text-[10px] text-slate-500">USDC</span>
        </div>
        <div className="flex gap-1 flex-wrap">
          {[10, 25, 50, 100, 250].map(v => (
            <button key={v} onClick={() => onAmountChange(v)}
              className={`px-1.5 py-0.5 text-[10px] rounded transition ${amount === v ? "bg-[#FF4D00] text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700"}`}
            >${v}</button>
          ))}
        </div>
      </div>

      {/* Wallet impact — compact */}
      <div className="grid grid-cols-2 gap-2 rounded-lg border border-slate-700 bg-slate-900/80 p-2 text-center">
        <div>
          <p className="text-[9px] uppercase text-slate-500">Payout</p>
          <p className="text-sm font-bold text-emerald-400">{formatMoney(payout)}</p>
        </div>
        <div>
          <p className="text-[9px] uppercase text-slate-500">Profit</p>
          <p className={`text-sm font-bold ${profit > 0 ? "text-emerald-400" : "text-rose-400"}`}>{profit >= 0 ? "+" : ""}{formatMoney(Math.abs(profit))}</p>
        </div>
        <div>
          <p className="text-[9px] uppercase text-slate-500">Shares</p>
          <p className="text-sm font-bold text-slate-100">{shares.toFixed(1)}</p>
        </div>
        <div>
          <p className="text-[9px] uppercase text-slate-500">Max loss</p>
          <p className="text-sm font-bold text-rose-400">-{formatMoney(amount)}</p>
        </div>
      </div>

      {/* Feedback — prominent success state */}
      {success && (
        <div className="space-y-2">
          <div className={`rounded-lg border px-3 py-2.5 text-sm font-semibold ${successTone}`}>{success}</div>
          {isSuccess && (
            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3">
              <p className="text-xs font-bold text-emerald-200">
                {paper ? "✓ Paper trade saved" : "✓ Trade submitted"}
              </p>
              <p className="mt-1 text-[11px] text-emerald-300/80">
                {paper
                  ? "This practice trade is saved. Check Results → Open Positions to see it."
                  : "Your trade has been submitted. Check Results → Open Positions for status."}
              </p>
              {onOpenResults && (
                <button onClick={onOpenResults}
                  className="mt-2 w-full rounded-lg border border-emerald-500/30 bg-emerald-600/20 px-3 py-2 text-xs font-bold text-emerald-100 transition hover:bg-emerald-600/30">
                  Open Results → View Positions
                </button>
              )}
            </div>
          )}
        </div>
      )}
      {!payloadReady && <p className="text-[10px] text-center text-rose-400">Disabled: {payloadIssues.join(", ")}</p>}

      {/* Submit */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button onClick={onSubmit} disabled={submitting || !payloadReady}
            className="w-full bg-[#FF4D00] hover:bg-orange-600 py-2 rounded-xl text-sm font-bold text-white transition disabled:opacity-50">
            {submitting ? "Processing…" : `${paper ? "Practice " : ""}Buy · $${amount} ${outcome}`}
          </button>
        </TooltipTrigger>
        <TooltipContent>{paper ? "Simulate this trade in practice mode." : "Submit a real trade to Polymarket."}</TooltipContent>
      </Tooltip>
    </div>
  );

  if (inline) {
    return (
      <div className="rounded-xl border border-slate-700 bg-slate-950 p-3 shadow-lg">
        {panelContent}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:justify-end p-0 sm:p-4">
      <button className="absolute inset-0 bg-black/50" onClick={onClose} aria-label="Close buy panel" />
      <div className="relative w-full sm:max-w-md max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border border-slate-700 bg-slate-950 p-4 shadow-2xl">
        {panelContent}
      </div>
    </div>
  );
}
