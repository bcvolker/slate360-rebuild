"use client";

import React from "react";
import { MarketOpportunityBadge } from "@/components/dashboard/market/MarketSharedUi";
import type { MarketListing } from "@/components/dashboard/market/types";
import { formatCents, marketChanceLabel, marketResolutionLabel, outcomeExplanation, outcomePlainLabel } from "@/lib/market/market-display";

interface MarketListingDetailDrawerProps {
  market: MarketListing | null;
  paperMode: boolean;
  draftAmount: number;
  onDraftAmountChange: (amount: number) => void;
  isSaved: boolean;
  onClose: () => void;
  onToggleSave: (market: MarketListing) => void;
  onBuy: (market: MarketListing, outcome: "YES" | "NO", amount: number) => void;
}

export default function MarketListingDetailDrawer({
  market,
  paperMode,
  draftAmount,
  onDraftAmountChange,
  isSaved,
  onClose,
  onToggleSave,
  onBuy,
}: MarketListingDetailDrawerProps) {
  if (!market) return null;

  const yesShares = draftAmount / Math.max(0.01, market.yesPrice || market.probabilityPct / 100);
  const noShares = draftAmount / Math.max(0.01, market.noPrice || 1 - market.probabilityPct / 100);
  const yesPayout = yesShares;
  const noPayout = noShares;
  const yesProfit = yesPayout - draftAmount;
  const noProfit = noPayout - draftAmount;

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-zinc-950/35 backdrop-blur-[1px]" />
      <div className="relative h-full w-full max-w-2xl overflow-y-auto border-l border-zinc-800 bg-[radial-gradient(circle_at_top_left,rgba(255,117,24,0.12),transparent_28%),linear-gradient(180deg,rgba(24,24,27,0.98),rgba(9,9,11,0.98))] p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">Market detail</p>
            <h3 className="mt-2 text-2xl font-black leading-tight text-slate-100">{market.title}</h3>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span className="rounded-lg border border-zinc-800 bg-zinc-900/80 px-3 py-1 font-semibold text-slate-300">{market.category}</span>
              <span>Resolves {marketResolutionLabel(market)}</span>
              <MarketOpportunityBadge market={market} />
              <span className={`rounded-lg border px-3 py-1 font-semibold ${paperMode ? "border-violet-500/30 bg-violet-500/15 text-violet-300" : "border-emerald-500/30 bg-emerald-500/15 text-emerald-300"}`}>
                {paperMode ? "Practice mode" : "Live mode requested"}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="rounded-full border border-zinc-800 bg-slate-800 px-3 py-1 text-sm text-slate-400 transition hover:border-zinc-700 hover:text-slate-200">
            Close
          </button>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[1.2fr,0.8fr]">
          <div className="rounded-[28px] border border-zinc-800 bg-zinc-900/80 p-5 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">What the market is pricing</p>
            <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-800">
              <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-emerald-400 to-sky-400" style={{ width: `${market.probabilityPct}%` }} />
            </div>
            <div className="mt-3 flex items-end justify-between gap-4">
              <div>
                <p className="text-3xl font-black text-slate-100">{market.probabilityPct}%</p>
                <p className="mt-1 text-sm text-slate-400">Implied chance the event resolves YES</p>
              </div>
              <p className="max-w-[220px] text-right text-sm text-slate-400">{marketChanceLabel(market.probabilityPct)}</p>
            </div>
          </div>

          <div className="rounded-[28px] border border-zinc-800 bg-zinc-900/80 p-5 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Trading conditions</p>
            <div className="mt-4 space-y-3 text-sm">
              <Metric label="Pricing edge" value={`${market.edgePct.toFixed(1)}%`} />
              <Metric label="24h volume" value={`$${Math.round(market.volume24hUsd).toLocaleString()}`} />
              <Metric label="Liquidity" value={`$${Math.round(market.liquidityUsd).toLocaleString()}`} />
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <OutcomePanel
            title={outcomePlainLabel("YES")}
            badge="YES"
            price={formatCents(market.yesPrice)}
            subtitle={outcomeExplanation("YES")}
            tone="emerald"
            onClick={() => onBuy(market, "YES", draftAmount)}
          />
          <OutcomePanel
            title={outcomePlainLabel("NO")}
            badge="NO"
            price={formatCents(market.noPrice)}
            subtitle={outcomeExplanation("NO")}
            tone="rose"
            onClick={() => onBuy(market, "NO", draftAmount)}
          />
        </div>

        <div className="mt-6 rounded-[28px] border border-zinc-800 bg-zinc-900/80 p-5 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Wallet impact preview</p>
          <div className="mt-3 flex items-center gap-3">
            <label className="text-xs text-slate-400">Ticket size (USDC)</label>
            <input
              type="number"
              min={5}
              step={5}
              value={draftAmount}
              onChange={(event) => onDraftAmountChange(Math.max(5, Number(event.target.value) || 5))}
              className="w-28 rounded-lg border border-zinc-800 bg-zinc-950/80 px-2.5 py-1.5 text-sm font-semibold text-slate-100"
            />
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <PreviewCard title="YES scenario" shares={yesShares} maxLoss={draftAmount} payout={yesPayout} profit={yesProfit} />
            <PreviewCard title="NO scenario" shares={noShares} maxLoss={draftAmount} payout={noPayout} profit={noProfit} />
          </div>
        </div>

        <div className="mt-6 rounded-[28px] border border-zinc-800 bg-zinc-900/80 p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Quick read</p>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Buying a share costs the current market price. If your side is correct at resolution, that share pays out $1. Your maximum loss is what you spend to enter the trade.
              </p>
            </div>
            <button
              onClick={() => onToggleSave(market)}
              className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${isSaved ? "border-amber-500/30 bg-amber-500/15 text-amber-300 hover:bg-amber-500/25" : "border-zinc-800 bg-slate-800 text-slate-300 hover:border-zinc-700 hover:bg-zinc-800"}`}
            >
              {isSaved ? "Saved to shortlist" : "Save to shortlist"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-zinc-800/50 pb-2 last:border-none last:pb-0">
      <span className="text-slate-400">{label}</span>
      <span className="font-semibold text-slate-100">{value}</span>
    </div>
  );
}

function OutcomePanel({ title, badge, price, subtitle, tone, onClick }: { title: string; badge: string; price: string; subtitle: string; tone: "emerald" | "rose"; onClick: () => void }) {
  const toneClasses = tone === "emerald"
    ? "border-emerald-500/30 bg-emerald-500/15 hover:border-emerald-500/50 hover:bg-emerald-500/20"
    : "border-rose-500/30 bg-rose-500/15 hover:border-rose-500/50 hover:bg-rose-500/20";
  const badgeClasses = tone === "emerald" ? "bg-emerald-600 text-white" : "bg-rose-600 text-white";

  return (
    <button onClick={onClick} className={`rounded-[28px] border p-5 text-left shadow-sm transition ${toneClasses}`}>
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-lg font-black text-slate-100">{title}</p>
          <p className="mt-2 text-sm leading-6 text-slate-400">{subtitle}</p>
        </div>
        <span className={`rounded-lg px-3 py-1 text-xs font-bold tracking-[0.16em] ${badgeClasses}`}>{badge}</span>
      </div>
      <div className="mt-4 flex items-end justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Current entry price</p>
          <p className="mt-1 text-3xl font-black text-slate-100">{price}</p>
        </div>
        <span className="rounded-full border border-zinc-800 bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-300">Open trade</span>
      </div>
    </button>
  );
}

function PreviewCard({ title, shares, maxLoss, payout, profit }: { title: string; shares: number; maxLoss: number; payout: number; profit: number }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-4 text-sm text-slate-400">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{title}</p>
      <div className="mt-2 space-y-1">
        <p>Shares: <span className="font-semibold text-slate-100">{shares.toFixed(2)}</span></p>
        <p>Max loss: <span className="font-semibold text-rose-400">-${maxLoss.toFixed(2)}</span></p>
        <p>Potential payout: <span className="font-semibold text-emerald-400">${payout.toFixed(2)}</span></p>
        <p>Potential profit: <span className={`font-semibold ${profit >= 0 ? "text-emerald-400" : "text-rose-400"}`}>{profit >= 0 ? "+" : "-"}${Math.abs(profit).toFixed(2)}</span></p>
      </div>
    </div>
  );
}