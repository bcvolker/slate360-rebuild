"use client";

import { useEffect, useState } from "react";
import { useOpsConsoleStore } from "@/lib/stores/useOpsConsoleStore";
import { opsConsoleTokens as t } from "@/components/ops/console/ops-console-tokens";

function money(n: number): string {
  return `$${n.toLocaleString()}`;
}

/**
 * Live MRR/ARR computed from Stripe (active subscriptions, annual normalized to
 * monthly). When Stripe isn't configured yet, shows a setup note instead of
 * fabricated numbers. Also offers a manual pricing what-if calculator.
 */
export function RevenueTab() {
  const { simFactor, setSimFactor, revenue, revenueLoaded, fetchRevenue } = useOpsConsoleStore();
  const [baselineMrr, setBaselineMrr] = useState(0);

  useEffect(() => {
    void fetchRevenue();
  }, [fetchRevenue]);

  // Seed the simulator baseline from live MRR once it loads.
  useEffect(() => {
    if (revenue?.configured && revenue.mrr > 0) setBaselineMrr(revenue.mrr);
  }, [revenue]);

  const projected = Math.round(baselineMrr * simFactor);

  return (
    <div className="space-y-5">
      {revenue?.configured ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div className={t.card}>
            <div className={t.statValue}>{money(revenue.mrr)}</div>
            <div className={t.statLabel}>MRR</div>
          </div>
          <div className={t.card}>
            <div className={t.statValue}>{money(revenue.arr)}</div>
            <div className={t.statLabel}>ARR (run-rate)</div>
          </div>
          <div className={t.card}>
            <div className={t.statValue}>{revenue.activeSubscribers}</div>
            <div className={t.statLabel}>Active subscribers</div>
          </div>
          <div className={t.card}>
            <div className={t.statValue}>{revenue.trialingSubscribers}</div>
            <div className={t.statLabel}>On trial</div>
          </div>
        </div>
      ) : (
        <div className={t.card}>
          <p className={t.eyebrow}>Revenue</p>
          <p className="mt-2 text-sm text-[var(--graphite-text-body)]">
            Live MRR/ARR are computed from Stripe subscriptions.
          </p>
          <p className={`mt-1 ${t.emptyNote}`}>
            {revenueLoaded
              ? "Stripe is not configured — add the secret key + webhook (see System Health) to enable live metrics."
              : "Loading live revenue from Stripe…"}
          </p>
        </div>
      )}

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
