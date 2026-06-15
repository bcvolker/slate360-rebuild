"use client";

import { useState } from "react";
import { useOpsConsoleStore } from "@/lib/stores/useOpsConsoleStore";
import { opsConsoleTokens as t } from "@/components/ops/console/ops-console-tokens";

/**
 * Revenue/MRR is not wired to Stripe yet (see Health tab). Rather than fabricate
 * numbers, this tab is honest about that and offers a manual what-if calculator:
 * enter a baseline MRR and a pricing factor to see the projected MRR.
 */
export function RevenueTab() {
  const { simFactor, setSimFactor } = useOpsConsoleStore();
  const [baselineMrr, setBaselineMrr] = useState(0);
  const projected = Math.round(baselineMrr * simFactor);

  return (
    <div className="space-y-5">
      <div className={t.card}>
        <p className={t.eyebrow}>Revenue</p>
        <p className="mt-2 text-sm text-[var(--graphite-text-body)]">
          Live MRR, churn, and net-new revenue will appear here once Stripe billing is connected.
        </p>
        <p className={`mt-1 ${t.emptyNote}`}>
          Status: not connected — add the Stripe keys + webhook (see System Health) to enable live metrics.
        </p>
      </div>

      <div className={t.card}>
        <p className={t.eyebrow}>Pricing what-if (manual)</p>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className={t.statLabel}>Baseline MRR ($)</span>
            <input
              type="number"
              min={0}
              value={baselineMrr}
              onChange={(e) => setBaselineMrr(Number(e.target.value) || 0)}
              className={`mt-1 ${t.input}`}
            />
          </label>
          <div className="block">
            <span className={t.statLabel}>Pricing factor: {simFactor.toFixed(2)}×</span>
            <input
              type="range"
              min={0.8}
              max={1.5}
              step={0.05}
              value={simFactor}
              onChange={(e) => setSimFactor(Number(e.target.value))}
              className="mt-3 w-full accent-[var(--graphite-primary)]"
              aria-label="Pricing factor"
            />
          </div>
        </div>
        <div className={`mt-4 ${t.row}`}>
          <span className="text-sm text-[var(--graphite-text-body)]">Projected MRR</span>
          <span className="text-lg font-semibold text-[var(--graphite-text-header)]">
            ${projected.toLocaleString()}
          </span>
        </div>
        <p className={`mt-2 ${t.emptyNote}`}>
          Estimate only — does not change live pricing. Edit canonical prices in lib/marketing/pricing-config.ts.
        </p>
      </div>
    </div>
  );
}
