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
}: MarketBuyPanelProps) {
  const [showLiveConfirm, setShowLiveConfirm] = useState(false);
  const price = outcome === "YES" ? market.yesPrice : market.noPrice;
  const avgPrice = price > 0 ? price : market.probabilityPct / 100;
  const shares = amount / avgPrice;
  const payout = shares;
  const profit = payout - amount;
  const isPostBuy = success.length > 0;
  const successTone = success.startsWith("✅")
    ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-200"
    : success.includes("Live execution blocked")
      ? "border-amber-500/30 bg-amber-500/15 text-amber-200"
      : "border-rose-500/30 bg-rose-500/15 text-rose-200";

  const handleModeSwitch = () => {
    if (paper) {
      // Switching from practice to live — require confirmation
      setShowLiveConfirm(true);
    } else {
      // Switching from live back to practice — no confirmation needed
      onPaperToggle();
    }
  };

  const confirmLive = () => {
    setShowLiveConfirm(false);
    onPaperToggle();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:justify-end p-0 sm:p-4">
      <button className="absolute inset-0 bg-black/50" onClick={onClose} aria-label="Close buy panel" />
      <div className="relative w-full sm:max-w-md max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border border-slate-700 bg-slate-950 p-4 shadow-2xl space-y-4">

        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Trade ticket</p>
            <p className="mt-1 text-base font-bold text-slate-100 leading-snug line-clamp-2">{market.title}</p>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-400">
              <span className="rounded-full border border-slate-700 bg-slate-900 px-2 py-0.5">{market.category}</span>
              <span>{marketChanceLabel(market.probabilityPct)}</span>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-200 text-lg leading-none transition">×</button>
        </div>

        {/* Mode control — Practice/Live toggle */}
        <div className="rounded-xl border border-slate-700 bg-slate-900/80 p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${paper ? "bg-violet-500/20 text-violet-300 border border-violet-500/30" : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"}`}>
                {paper ? "PRACTICE" : "LIVE"}
              </span>
              <span className="text-xs text-slate-400">
                {paper ? "No real money used" : "Real USDC on Polymarket"}
              </span>
              <HelpTip content={paper ? "Practice mode simulates the trade. No real money is spent." : "Live mode will attempt to execute a real trade on Polymarket using your connected wallet."} />
            </div>
            <button onClick={handleModeSwitch}
              className={`relative w-9 h-5 rounded-full transition ${paper ? "bg-violet-600" : "bg-emerald-600"}`}>
              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${paper ? "translate-x-4" : "translate-x-0.5"}`} />
            </button>
          </div>

          {/* Live confirmation step */}
          {showLiveConfirm && (
            <div className="mt-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs text-amber-200">
              <p className="font-semibold">Switch to live mode?</p>
              <p className="mt-1 text-amber-300/80">This will use real USDC from your connected wallet. Make sure your wallet is funded and connected.</p>
              <div className="mt-2 flex gap-2">
                <button onClick={confirmLive} className="rounded-md bg-amber-600 px-3 py-1 text-[11px] font-bold text-white transition hover:bg-amber-500">Yes, switch to live</button>
                <button onClick={() => setShowLiveConfirm(false)} className="rounded-md border border-slate-600 px-3 py-1 text-[11px] text-slate-300 transition hover:bg-slate-800">Cancel</button>
              </div>
            </div>
          )}

          {/* Live checklist */}
          {!paper && (
            <div className="mt-2 grid grid-cols-2 gap-1 text-[11px] text-slate-400">
              <span>{liveChecklist.walletConnected ? "✅" : "⬜"} Wallet</span>
              <span>{liveChecklist.polygonSelected ? "✅" : "⬜"} Polygon</span>
              <span>{liveChecklist.signatureVerified ? "✅" : "⬜"} Signature</span>
              <span>{liveChecklist.usdcApproved ? "✅" : "⬜"} USDC approved</span>
            </div>
          )}
        </div>

        {/* YES / NO toggle — compact */}
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => onOutcomeChange("YES")}
            className={`rounded-xl border p-3 text-left transition ${outcome === "YES" ? "border-emerald-500/40 bg-emerald-500/15" : "border-slate-700 bg-slate-900 hover:border-slate-600"}`}>
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-slate-100">{outcomePlainLabel("YES")}</span>
              <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white">YES</span>
            </div>
            <p className="mt-1 text-lg font-black text-slate-100">{formatCents(market.yesPrice)}</p>
            <p className="text-[10px] text-slate-500">{outcomeExplanation("YES")}</p>
          </button>
          <button onClick={() => onOutcomeChange("NO")}
            className={`rounded-xl border p-3 text-left transition ${outcome === "NO" ? "border-rose-500/40 bg-rose-500/15" : "border-slate-700 bg-slate-900 hover:border-slate-600"}`}>
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-slate-100">{outcomePlainLabel("NO")}</span>
              <span className="rounded-full bg-rose-600 px-2 py-0.5 text-[10px] font-bold text-white">NO</span>
            </div>
            <p className="mt-1 text-lg font-black text-slate-100">{formatCents(market.noPrice)}</p>
            <p className="text-[10px] text-slate-500">{outcomeExplanation("NO")}</p>
          </button>
        </div>

        {/* Amount */}
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <label className="text-xs text-slate-400">Amount</label>
            <input type="number" min={5} step={5} value={amount}
              onChange={(e) => onAmountChange(Math.max(5, Number(e.target.value) || 5))}
              className="w-24 rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-sm font-semibold text-slate-100 outline-none focus:border-[#FF4D00]" />
            <span className="text-xs text-slate-500">USDC</span>
          </div>
          <input type="range" min={5} max={5000} step={5} value={amount}
            onChange={e => onAmountChange(+e.target.value)} className="w-full accent-[#FF4D00] h-1.5" />
          <div className="mt-1 flex gap-1 flex-wrap">
            {[10, 25, 50, 100, 250, 500].map(v => (
              <button key={v} onClick={() => onAmountChange(v)}
                className={`px-2 py-0.5 text-[11px] rounded-md transition ${amount === v ? "bg-[#FF4D00] text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700"}`}
              >${v}</button>
            ))}
          </div>
        </div>

        {/* Wallet impact preview — compact grid */}
        <div className="grid grid-cols-4 gap-2 rounded-xl border border-slate-700 bg-slate-900/80 p-3 text-center">
          <div>
            <p className="text-[9px] uppercase text-slate-500">Shares</p>
            <p className="text-sm font-bold text-slate-100">{shares.toFixed(1)}</p>
          </div>
          <div>
            <p className="text-[9px] uppercase text-slate-500">Max payout</p>
            <p className="text-sm font-bold text-emerald-400">{formatMoney(payout)}</p>
          </div>
          <div>
            <p className="text-[9px] uppercase text-slate-500">Profit if right</p>
            <p className={`text-sm font-bold ${profit > 0 ? "text-emerald-400" : "text-rose-400"}`}>{profit >= 0 ? "+" : ""}{formatMoney(Math.abs(profit))}</p>
          </div>
          <div>
            <p className="text-[9px] uppercase text-slate-500">Max loss</p>
            <p className="text-sm font-bold text-rose-400">-{formatMoney(amount)}</p>
          </div>
        </div>

        {/* Feedback */}
        {success && (
          <div className="space-y-2">
            <div className={`rounded-lg border px-3 py-2 text-sm font-semibold ${successTone}`}>{success}</div>
            {isPostBuy && success.startsWith("✅") && (
              <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/10 px-3 py-2 text-xs text-cyan-200">
                <p className="font-semibold">Where to verify</p>
                <p className="mt-1 text-cyan-300/80">Check <strong>Results → Open Positions</strong> for your new entry. Trade History and the Activity Log also update within a few seconds.</p>
              </div>
            )}
          </div>
        )}
        {!payloadReady && <p className="text-[11px] text-center text-rose-400">Disabled: {payloadIssues.join(", ")}</p>}

        {/* Submit */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button onClick={onSubmit} disabled={submitting || !payloadReady}
              className="w-full bg-[#FF4D00] hover:bg-orange-600 py-2.5 rounded-xl text-sm font-bold text-white transition disabled:opacity-50">
              {submitting ? "Processing…" : `Confirm ${paper ? "Practice " : ""}Buy · $${amount} ${outcome}`}
            </button>
          </TooltipTrigger>
          <TooltipContent>{paper ? "Simulate this trade in practice mode." : "Submit a real trade to Polymarket."}</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
