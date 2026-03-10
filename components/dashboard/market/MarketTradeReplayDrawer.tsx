"use client";

import React from "react";
import type { TradeReplay } from "@/components/dashboard/market/types";
import { outcomeExplanation, outcomePlainLabel, tradeModeLabel } from "@/lib/market/market-display";

function PnlValue({ value }: { value: number }) {
  const color = value > 0 ? "text-emerald-600" : value < 0 ? "text-rose-600" : "text-slate-600";
  return <span className={`font-bold ${color}`}>{value >= 0 ? "+" : ""}${value.toFixed(2)}</span>;
}

export default function MarketTradeReplayDrawer({ replay, onClose }: { replay: TradeReplay; onClose: () => void }) {
  const { trade, reasoning, exitReason, matchedConstraints } = replay;
  const outcomeLabel = outcomePlainLabel(trade.outcome);

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-slate-950/35 backdrop-blur-[1px]" />
      <div className="relative h-full w-full max-w-xl overflow-y-auto border-l border-white/50 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(246,248,251,0.98))] p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">Position detail</p>
            <h3 className="mt-2 text-xl font-black text-slate-900">{trade.marketTitle}</h3>
            <p className="mt-2 text-sm text-slate-500">{tradeModeLabel(trade)}. You backed <span className="font-semibold text-slate-900">{outcomeLabel}</span>.</p>
          </div>
          <button onClick={onClose} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-sm text-slate-500 transition hover:border-slate-300 hover:text-slate-900">
            Close
          </button>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <DetailStat label="Position" value={outcomeLabel} tone={trade.outcome === "YES" ? "emerald" : "rose"} />
          <DetailStat label="Status" value={trade.status} tone="slate" />
          <DetailStat label="Entry price" value={`$${trade.avgPrice.toFixed(3)}`} tone="slate" />
          <DetailStat label="Current price" value={`$${trade.currentPrice.toFixed(3)}`} tone="slate" />
          <DetailStat label="Capital used" value={`$${trade.total.toFixed(2)}`} tone="slate" />
          <DetailStat label="Shares owned" value={trade.shares.toFixed(1)} tone="slate" />
        </div>

        <div className="mt-5 rounded-3xl border border-slate-200/80 bg-white/80 p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Current result</p>
              <p className="mt-1 text-sm text-slate-500">{outcomeExplanation(trade.outcome)}</p>
            </div>
            <div className="text-right">
              <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">P/L</p>
              <div className="mt-1 text-lg"><PnlValue value={trade.pnl ?? 0} /></div>
            </div>
          </div>
        </div>

        {reasoning && (
          <Section title="Why the trade was taken">
            <p className="text-sm leading-6 text-slate-600">{reasoning}</p>
          </Section>
        )}

        {matchedConstraints.length > 0 && (
          <Section title="Automation checks that matched">
            <div className="flex flex-wrap gap-2">
              {matchedConstraints.map((constraint) => (
                <span key={constraint} className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
                  {constraint}
                </span>
              ))}
            </div>
          </Section>
        )}

        {exitReason && (
          <Section title="Exit reason">
            <p className="text-sm leading-6 text-slate-600">{exitReason}</p>
          </Section>
        )}

        <div className="mt-6 border-t border-slate-200 pt-4 text-xs text-slate-400">
          Opened: {new Date(trade.createdAt).toLocaleString()}
          {trade.closedAt ? ` · Closed: ${new Date(trade.closedAt).toLocaleString()}` : " · Position still open"}
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-5 rounded-3xl border border-slate-200/80 bg-white/80 p-5 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">{title}</p>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function DetailStat({ label, value, tone }: { label: string; value: string; tone: "emerald" | "rose" | "slate" }) {
  const toneClass = tone === "emerald" ? "text-emerald-700 bg-emerald-50 border-emerald-200" : tone === "rose" ? "text-rose-700 bg-rose-50 border-rose-200" : "text-slate-900 bg-white border-slate-200";

  return (
    <div className={`rounded-2xl border p-4 ${toneClass}`}>
      <p className="text-[11px] uppercase tracking-[0.2em] opacity-60">{label}</p>
      <p className="mt-2 text-base font-black">{value}</p>
    </div>
  );
}