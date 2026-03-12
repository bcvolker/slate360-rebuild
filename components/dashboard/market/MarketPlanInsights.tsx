"use client";

import type { AutomationPlan } from "@/components/dashboard/market/types";

function planHealthTone(warnings: number) {
  if (warnings >= 3) return "text-red-400 bg-red-500/15 border-red-500/30";
  if (warnings >= 1) return "text-amber-400 bg-amber-500/15 border-amber-500/30";
  return "text-emerald-400 bg-emerald-500/15 border-emerald-500/30";
}

export default function MarketPlanInsights({ draft }: { draft: AutomationPlan }) {
  const budgetPerPosition = draft.budget / Math.max(1, draft.maxOpenPositions);
  const hoursBetweenTrades = 24 / Math.max(1, draft.maxTradesPerDay);
  const warnings: string[] = [];

  if (budgetPerPosition < 8) warnings.push("Budget per position is very small. Fees and slippage can dominate tiny positions.");
  if (draft.maxTradesPerDay > draft.maxOpenPositions * 6) warnings.push("Daily trade cap is much higher than open-position capacity, which can cause churn.");
  if (draft.maxDailyLoss > draft.budget * 0.45) warnings.push("Daily loss cap is loose relative to total budget.");
  if (draft.mode === "real" && draft.budget < 100) warnings.push("Live mode with a very small budget often feels inconsistent after fees and fills.");
  if (draft.riskLevel === "aggressive" && draft.maxTradesPerDay > 25) warnings.push("Aggressive risk plus high frequency increases variance quickly.");

  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-900/80 p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Plan sanity check</p>
          <p className="mt-1 text-sm text-slate-400">A quick read on whether this plan is likely to feel stable and understandable.</p>
        </div>
        <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${planHealthTone(warnings.length)}`}>
          {warnings.length === 0 ? "Healthy" : warnings.length === 1 ? "Watch" : "Risky"}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-3">
          <p className="text-xs text-slate-400">Budget per position</p>
          <p className="mt-1 text-lg font-bold text-slate-100">${budgetPerPosition.toFixed(2)}</p>
        </div>
        <div className="rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-3">
          <p className="text-xs text-slate-400">Average trade cadence</p>
          <p className="mt-1 text-lg font-bold text-slate-100">{hoursBetweenTrades >= 1 ? `${hoursBetweenTrades.toFixed(1)}h` : `${Math.round(hoursBetweenTrades * 60)}m`}</p>
        </div>
        <div className="rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-3">
          <p className="text-xs text-slate-400">Capital protection</p>
          <p className="mt-1 text-lg font-bold text-slate-100">${draft.maxDailyLoss.toFixed(0)} / day</p>
        </div>
      </div>

      {warnings.length > 0 ? (
        <div className="mt-3 space-y-2">
          {warnings.map((warning) => (
            <p key={warning} className="rounded-xl border border-amber-500/30 bg-amber-500/15 px-3 py-2 text-xs text-amber-300">{warning}</p>
          ))}
        </div>
      ) : (
        <p className="mt-3 rounded-xl border border-emerald-500/30 bg-emerald-500/15 px-3 py-2 text-xs text-emerald-300">
          This plan has reasonable capital spacing and guardrails for a first pass. Run one paper scan and verify the Results trail before increasing risk.
        </p>
      )}
    </div>
  );
}