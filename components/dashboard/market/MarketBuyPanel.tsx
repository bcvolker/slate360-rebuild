"use client";

import React, { useState } from "react";
import type { MarketListing, LiveChecklist } from "./types";
import { formatCents, marketChanceLabel, outcomeExplanation } from "@/lib/market/market-display";

export interface MarketBuyPanelProps {
  market: MarketListing;
  outcome: "YES" | "NO";
  amount: number;
  paper: boolean;
  submitting: boolean;
  success: string;
  liveChecklist: LiveChecklist;
  payloadReady: boolean;
  payloadIssues: string[];
  formatMoney: (usd: number) => string;
  onOutcomeChange: (o: "YES" | "NO") => void;
  onAmountChange: (a: number) => void;
  onPaperToggle: () => void;
  onSubmit: () => void;
  onClose: () => void;
  inline?: boolean;
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

  const handleModeSwitch = () => {
    if (paper) setShowLiveConfirm(true);
    else onPaperToggle();
  };

  const confirmLive = () => {
    setShowLiveConfirm(false);
    onPaperToggle();
  };

  const panelContent = (
    <div className="space-y-6">
      <div className="flex justify-between">
        <div>
          <p className="text-xs tracking-[1px] text-slate-500">BUY ORDER</p>
          <p className="font-semibold text-slate-100 mt-1 leading-tight">{market.title}</p>
        </div>
        <button onClick={onClose} className="text-3xl text-slate-500 hover:text-white leading-none">×</button>
      </div>

      {/* MODE SELECTOR - VERY PROMINENT */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-1">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className={`px-5 py-2 rounded-xl text-sm font-bold ${
              paper 
                ? "bg-emerald-500 text-black" 
                : "bg-rose-500 text-white"
            }`}>
              {paper ? "PRACTICE" : "LIVE"}
            </div>
            <div className="text-sm text-slate-400">
              {paper ? "No real money at risk" : "Real USDC on Polymarket"}
            </div>
          </div>
          
          <button
            onClick={handleModeSwitch}
            className={`w-12 h-7 rounded-full relative transition-colors ${
              paper ? "bg-emerald-600" : "bg-rose-600"
            }`}
          >
            <div className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-all ${
              paper ? "translate-x-6" : "translate-x-1"
            }`} />
          </button>
        </div>
      </div>

      {/* YES / NO */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => onOutcomeChange("YES")}
          className={`p-5 rounded-3xl border-2 transition-all ${
            outcome === "YES" 
              ? "border-emerald-400 bg-emerald-500/10" 
              : "border-zinc-800 hover:border-zinc-700"
          }`}
        >
          <div className="text-emerald-400 text-xs font-bold mb-2">YES</div>
          <div className="text-4xl font-black text-slate-100">{formatCents(market.yesPrice)}</div>
        </button>

        <button
          onClick={() => onOutcomeChange("NO")}
          className={`p-5 rounded-3xl border-2 transition-all ${
            outcome === "NO" 
              ? "border-rose-400 bg-rose-500/10" 
              : "border-zinc-800 hover:border-zinc-700"
          }`}
        >
          <div className="text-rose-400 text-xs font-bold mb-2">NO</div>
          <div className="text-4xl font-black text-slate-100">{formatCents(market.noPrice)}</div>
        </button>
      </div>

      {/* Amount */}
      <div>
        <label className="text-xs text-slate-400 block mb-3">How much would you like to invest?</label>
        <div className="flex gap-2">
          {[10, 25, 50, 100, 250].map(v => (
            <button
              key={v}
              onClick={() => onAmountChange(v)}
              className={`flex-1 py-4 rounded-2xl text-sm font-semibold transition-all ${
                amount === v 
                  ? "bg-[#FF4D00] text-white shadow-lg shadow-orange-500/30" 
                  : "bg-slate-800 hover:bg-zinc-800"
              }`}
            >
              ${v}
            </button>
          ))}
        </div>
      </div>

      {/* Summary */}
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 grid grid-cols-2 gap-6 text-center">
        <div>
          <div className="text-xs text-slate-400">IF YOU WIN</div>
          <div className="text-2xl font-bold text-emerald-400 mt-1">{formatMoney(payout)}</div>
        </div>
        <div>
          <div className="text-xs text-slate-400">MAX LOSS</div>
          <div className="text-2xl font-bold text-rose-400 mt-1">-{formatMoney(amount)}</div>
        </div>
      </div>

      {/* Success Message */}
      {success && (
        <div className={`rounded-2xl p-5 border text-center ${
          isSuccess 
            ? "border-emerald-500/30 bg-emerald-500/10" 
            : "border-amber-500/30 bg-amber-500/10"
        }`}>
          <p className="font-semibold text-lg">{success}</p>
          {isSuccess && onOpenResults && (
            <button
              onClick={onOpenResults}
              className="mt-4 w-full py-3 bg-emerald-600 hover:bg-emerald-500 rounded-2xl text-sm font-bold transition"
            >
              VIEW IN RESULTS →
            </button>
          )}
        </div>
      )}

      {/* Submit Button */}
      <button
        onClick={onSubmit}
        disabled={submitting || !payloadReady}
        className="w-full py-4 rounded-2xl bg-[#FF4D00] hover:bg-orange-600 disabled:opacity-50 font-bold text-lg transition-all active:scale-95"
      >
        {submitting 
          ? "SUBMITTING..." 
          : `${paper ? "Practice " : ""}Buy $${amount} ${outcome}`}
      </button>

      {!payloadReady && payloadIssues.length > 0 && (
        <p className="text-xs text-center text-rose-400">
          {payloadIssues.join(", ")}
        </p>
      )}
    </div>
  );

  if (inline) {
    return <div className="p-6 border border-zinc-800 rounded-3xl bg-zinc-950">{panelContent}</div>;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-md max-h-[92vh] overflow-auto">
        <div className="p-6">{panelContent}</div>
      </div>
    </div>
  );
}
