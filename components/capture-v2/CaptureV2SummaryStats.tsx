"use client";

import type { CaptureV2SummaryStats as Stats } from "./capture-v2-summary-types";

type Props = {
  stats: Stats;
  sessionStatus: string;
};

function StatCell({ label, value, tone = "text-white" }: { label: string; value: number | string; tone?: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2.5">
      <p className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className={`mt-0.5 text-lg font-black tabular-nums ${tone}`}>{value}</p>
    </div>
  );
}

export function CaptureV2SummaryStats({ stats, sessionStatus }: Props) {
  const lastUpdatedLabel = stats.lastUpdatedAt
    ? new Date(stats.lastUpdatedAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })
    : "—";

  return (
    <section className="space-y-3" aria-label="Walk statistics">
      <div>
        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[color-mix(in_srgb,var(--graphite-primary)_80%,white)]">Session</p>
        <p className="mt-1 text-sm font-bold capitalize text-slate-300">{sessionStatus.replace(/_/g, " ")}</p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <StatCell label="Total" value={stats.totalItems} />
        <StatCell label="Saved" value={stats.savedItems} tone="text-emerald-300" />
        <StatCell label="Pending sync" value={stats.pendingItems} tone={stats.pendingItems > 0 ? "text-amber-200" : "text-white"} />
        <StatCell label="Need details" value={stats.itemsNeedingDetails} tone={stats.itemsNeedingDetails > 0 ? "text-amber-200" : "text-white"} />
        <StatCell label="With media" value={stats.itemsWithMedia} />
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2.5">
        <p className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-500">Last updated</p>
        <p className="mt-0.5 text-sm font-bold text-slate-200">{lastUpdatedLabel}</p>
      </div>
    </section>
  );
}
