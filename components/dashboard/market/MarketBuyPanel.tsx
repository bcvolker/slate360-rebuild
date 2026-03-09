"use client";

import React from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { HelpTip } from "@/components/dashboard/market/MarketSharedUi";
import type { MarketListing, LiveChecklist } from "@/components/dashboard/market/types";

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
  takeProfitPct,
  stopLossPct,
  paper,
  submitting,
  success,
  liveChecklist,
  payloadReady,
  payloadIssues,
  showTpSlControls = true,
  formatMoney,
  onOutcomeChange,
  onAmountChange,
  onTakeProfitChange,
  onStopLossChange,
  onPaperToggle,
  onSubmit,
  onClose,
}: MarketBuyPanelProps) {
  const price = outcome === "YES" ? market.yesPrice : market.noPrice;
  const avgPrice = price > 0 ? price : market.probabilityPct / 100;
  const shares = amount / avgPrice;
  const payout = shares;
  const profit = payout - amount;
  const targetExitPrice = Math.min(0.99, avgPrice * 1.1);
  const targetExitPnl = shares * (targetExitPrice - avgPrice);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:justify-end p-0 sm:p-6">
      <button className="absolute inset-0 bg-black/30" onClick={onClose} aria-label="Close buy panel" />
      <div className="relative w-full sm:max-w-xl max-h-[92vh] overflow-y-auto bg-white border-2 border-[#FF4D00]/40 rounded-t-2xl sm:rounded-2xl p-5 space-y-4 shadow-2xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Buying on</p>
          <p className="text-sm font-semibold text-gray-900 leading-snug">{market.title}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-gray-500">{market.category}</span>
            <span className="text-xs text-gray-400">·</span>
            <span className="text-xs text-gray-500">Prob: {market.probabilityPct}%</span>
            <span className="text-xs text-gray-400">·</span>
            <span className={`text-xs font-bold ${market.edgePct > 10 ? "text-[#FF4D00]" : "text-gray-500"}`}>
              Advantage: {market.edgePct}%
            </span>
          </div>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-800 text-lg leading-none transition">×</button>
      </div>

      {/* YES / NO toggle */}
      <div>
        <label className="text-xs text-gray-500 mb-2 block">Outcome</label>
        <div className="flex gap-2">
          <button
            onClick={() => onOutcomeChange("YES")}
            className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition ${outcome === "YES" ? "bg-green-700 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
          >
            YES &nbsp;<span className="font-mono text-xs opacity-80">@ {(market.yesPrice * 100).toFixed(0)}¢</span>
          </button>
          <button
            onClick={() => onOutcomeChange("NO")}
            className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition ${outcome === "NO" ? "bg-red-700 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
          >
            NO &nbsp;<span className="font-mono text-xs opacity-80">@ {(market.noPrice * 100).toFixed(0)}¢</span>
          </button>
        </div>
      </div>

      {/* Amount */}
      <div>
        <label className="text-xs text-gray-500 mb-1 block flex items-center">
          Amount (USDC): <span className="text-gray-900 font-semibold font-mono ml-1">${amount}</span>
          <HelpTip content="How much USDC to spend on this trade." />
        </label>
        <p className="text-[11px] text-gray-400 mb-2">Display value: {formatMoney(amount)}</p>
        <input
          type="range" min={5} max={5000} step={5} value={amount}
          onChange={e => onAmountChange(+e.target.value)}
          className="w-full accent-[#FF4D00] mb-2"
        />
        <div className="flex gap-1 flex-wrap">
          {[10, 25, 50, 100, 250, 500, 1000].map(v => (
            <button key={v} onClick={() => onAmountChange(v)}
              className={`px-2 py-1 text-xs rounded transition ${amount === v ? "bg-[#FF4D00] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
            >${v}</button>
          ))}
        </div>
      </div>

      {/* TP/SL controls */}
      {showTpSlControls && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Take Profit %</label>
            <input type="range" min={5} max={100} value={takeProfitPct}
              onChange={e => onTakeProfitChange(Number(e.target.value))} className="w-full accent-[#22c55e]" />
            <p className="text-[11px] text-gray-500">{takeProfitPct}%</p>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Stop Loss %</label>
            <input type="range" min={2} max={50} value={stopLossPct}
              onChange={e => onStopLossChange(Number(e.target.value))} className="w-full accent-[#ef4444]" />
            <p className="text-[11px] text-gray-500">{stopLossPct}%</p>
          </div>
        </div>
      )}

      {/* Preview */}
      <div className="space-y-2 bg-gray-100/50 rounded-lg p-3">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
          <div>
            <p className="text-[10px] text-gray-400 mb-1">Shares</p>
            <p className="text-sm font-bold text-gray-900">{shares.toFixed(1)}</p>
          </div>
          <div>
            <p className="text-[10px] text-gray-400 mb-1">Max Payout</p>
            <p className="text-sm font-bold text-green-600">{formatMoney(payout)}</p>
          </div>
          <div>
            <p className="text-[10px] text-gray-400 mb-1">Max Profit</p>
            <p className={`text-sm font-bold ${profit > 0 ? "text-green-600" : "text-red-600"}`}>
              {profit >= 0 ? "+" : ""}{formatMoney(Math.abs(profit))}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-gray-400 mb-1">Max Loss</p>
            <p className="text-sm font-bold text-red-600">-{formatMoney(amount)}</p>
          </div>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-600 space-y-1">
          <p className="font-semibold text-gray-700">What-if scenarios</p>
          <p>If {outcome} resolves true: <span className="font-semibold text-green-600">+{formatMoney(profit)}</span></p>
          <p>If {outcome === "YES" ? "NO" : "YES"} resolves true: <span className="font-semibold text-red-600">-{formatMoney(amount)}</span></p>
          <p>If price rises 10% and you exit early: <span className={`font-semibold ${targetExitPnl >= 0 ? "text-green-600" : "text-red-600"}`}>{targetExitPnl >= 0 ? "+" : "-"}{formatMoney(Math.abs(targetExitPnl))}</span></p>
        </div>
      </div>

      {/* Paper mode toggle */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-700 flex items-center gap-1">
          Paper Mode <HelpTip content="Paper mode saves the trade without spending real money. Ideal for testing." />
        </span>
        <button onClick={onPaperToggle}
          className={`relative w-10 h-5 rounded-full transition ${paper ? "bg-purple-600" : "bg-green-700"}`}>
          <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${paper ? "translate-x-5" : "translate-x-0.5"}`} />
        </button>
      </div>
      <p className="text-xs text-center text-gray-400">
        {paper ? "📝 This will be saved as a paper (simulated) trade" : "⚠️ This will attempt a LIVE buy on Polymarket"}
      </p>

      {/* Live checklist */}
      {!paper && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-2 text-[11px] text-amber-700 space-y-1">
          <p className="font-semibold">Live trade checklist</p>
          <p>{liveChecklist.walletConnected ? "✅" : "⬜"} Wallet connected</p>
          <p>{liveChecklist.polygonSelected ? "✅" : "⬜"} Polygon selected</p>
          <p>{liveChecklist.signatureVerified ? "✅" : "⬜"} Signature verified</p>
          <p>{liveChecklist.usdcApproved ? "✅" : "⬜"} USDC approved</p>
        </div>
      )}

      {success && (
        <p className={`text-sm text-center font-medium ${success.startsWith("✅") ? "text-green-600" : "text-red-600"}`}>{success}</p>
      )}
      {!payloadReady && (
        <p className="text-xs text-center text-red-500">Disabled: {payloadIssues.join(", ")}</p>
      )}

      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={onSubmit}
            disabled={submitting || !payloadReady}
            className="w-full bg-[#FF4D00] hover:bg-orange-600 py-3 rounded-xl text-sm font-bold text-white transition disabled:opacity-50"
          >
            {submitting ? "Processing…" : `Confirm ${paper ? "Paper " : ""}Buy — $${amount} ${outcome}`}
          </button>
        </TooltipTrigger>
        <TooltipContent>Submit trade to Polymarket (or simulate in paper mode).</TooltipContent>
      </Tooltip>
      </div>
    </div>
  );
}
