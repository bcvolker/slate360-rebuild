"use client";

import React from "react";
import { MarketOpportunityBadge } from "@/components/dashboard/market/MarketSharedUi";
import type { MarketListing } from "@/components/dashboard/market/types";
import { formatCents, marketChanceLabel, marketResolutionLabel, outcomeExplanation, outcomePlainLabel } from "@/lib/market/market-display";

interface MarketListingDetailDrawerProps {
  market: MarketListing | null;
  isSaved: boolean;
  onClose: () => void;
  onToggleSave: (market: MarketListing) => void;
  onBuy: (market: MarketListing, outcome: "YES" | "NO") => void;
}

export default function MarketListingDetailDrawer({ market, isSaved, onClose, onToggleSave, onBuy }: MarketListingDetailDrawerProps) {
  if (!market) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-slate-950/35 backdrop-blur-[1px]" />
      <div className="relative h-full w-full max-w-2xl overflow-y-auto border-l border-white/50 bg-[radial-gradient(circle_at_top_left,rgba(255,117,24,0.12),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.98),rgba(244,247,250,0.98))] p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">Market detail</p>
            <h3 className="mt-2 text-2xl font-black leading-tight text-slate-900">{market.title}</h3>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span className="rounded-full border border-slate-200 bg-white/80 px-3 py-1 font-semibold text-slate-700">{market.category}</span>
              <span>Resolves {marketResolutionLabel(market)}</span>
              <MarketOpportunityBadge market={market} />
            </div>
          </div>
          <button onClick={onClose} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-sm text-slate-500 transition hover:border-slate-300 hover:text-slate-900">
            Close
          </button>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[1.2fr,0.8fr]">
          <div className="rounded-[28px] border border-slate-200 bg-white/85 p-5 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">What the market is pricing</p>
            <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-200">
              <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-emerald-400 to-sky-400" style={{ width: `${market.probabilityPct}%` }} />
            </div>
            <div className="mt-3 flex items-end justify-between gap-4">
              <div>
                <p className="text-3xl font-black text-slate-900">{market.probabilityPct}%</p>
                <p className="mt-1 text-sm text-slate-500">Implied chance the event resolves YES</p>
              </div>
              <p className="max-w-[220px] text-right text-sm text-slate-500">{marketChanceLabel(market.probabilityPct)}</p>
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-slate-950 p-5 text-white shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/55">Trading conditions</p>
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
            onClick={() => onBuy(market, "YES")}
          />
          <OutcomePanel
            title={outcomePlainLabel("NO")}
            badge="NO"
            price={formatCents(market.noPrice)}
            subtitle={outcomeExplanation("NO")}
            tone="rose"
            onClick={() => onBuy(market, "NO")}
          />
        </div>

        <div className="mt-6 rounded-[28px] border border-slate-200 bg-white/85 p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Quick read</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Buying a share costs the current market price. If your side is correct at resolution, that share pays out $1. Your maximum loss is what you spend to enter the trade.
              </p>
            </div>
            <button
              onClick={() => onToggleSave(market)}
              className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${isSaved ? "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100" : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"}`}
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
    <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-2 last:border-none last:pb-0">
      <span className="text-white/65">{label}</span>
      <span className="font-semibold text-white">{value}</span>
    </div>
  );
}

function OutcomePanel({ title, badge, price, subtitle, tone, onClick }: { title: string; badge: string; price: string; subtitle: string; tone: "emerald" | "rose"; onClick: () => void }) {
  const toneClasses = tone === "emerald"
    ? "border-emerald-200 bg-emerald-50 hover:border-emerald-300 hover:bg-emerald-100/70"
    : "border-rose-200 bg-rose-50 hover:border-rose-300 hover:bg-rose-100/70";
  const badgeClasses = tone === "emerald" ? "bg-emerald-600 text-white" : "bg-rose-600 text-white";

  return (
    <button onClick={onClick} className={`rounded-[28px] border p-5 text-left shadow-sm transition ${toneClasses}`}>
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-lg font-black text-slate-900">{title}</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">{subtitle}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-bold tracking-[0.16em] ${badgeClasses}`}>{badge}</span>
      </div>
      <div className="mt-4 flex items-end justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Current entry price</p>
          <p className="mt-1 text-3xl font-black text-slate-900">{price}</p>
        </div>
        <span className="rounded-full border border-slate-200 bg-white/85 px-4 py-2 text-sm font-semibold text-slate-700">Open trade</span>
      </div>
    </button>
  );
}