"use client";

interface MarketConsoleHeaderStripProps {
  activeTabLabel: string;
  runtimeStatus: string;
  configSourceLabel: string;
  blockerCount: number;
  liveReady: boolean;
  openPositionsCount: number;
  lastRunLabel: string;
}

function toneClass(liveReady: boolean, blockerCount: number): string {
  if (liveReady && blockerCount === 0) {
    return "border-emerald-400/30 bg-emerald-500/10 text-emerald-100";
  }
  if (blockerCount > 0) {
    return "border-amber-400/30 bg-amber-500/10 text-amber-100";
  }
  return "border-cyan-400/30 bg-cyan-500/10 text-cyan-100";
}

export default function MarketConsoleHeaderStrip({
  activeTabLabel,
  runtimeStatus,
  configSourceLabel,
  blockerCount,
  liveReady,
  openPositionsCount,
  lastRunLabel,
}: MarketConsoleHeaderStripProps) {
  return (
    <section className="rounded-[28px] border border-cyan-500/20 bg-[linear-gradient(135deg,rgba(8,15,31,0.96),rgba(15,23,42,0.96))] px-4 py-3 shadow-[0_20px_60px_rgba(2,6,23,0.45)]">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-center gap-3">
          <span className="rounded-full border border-cyan-400/25 bg-cyan-400/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-cyan-100">
            Market Robot Console
          </span>
          <span className="text-sm font-semibold text-slate-200">{activeTabLabel}</span>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
          <Metric label="Runtime" value={runtimeStatus} />
          <Metric label="Config Source" value={configSourceLabel} />
          <Metric label="Open Positions" value={String(openPositionsCount)} />
          <Metric label="Last Run" value={lastRunLabel} />
          <div className={`rounded-2xl border px-3 py-2 ${toneClass(liveReady, blockerCount)}`}>
            <p className="text-[10px] uppercase tracking-[0.2em] opacity-70">Live Readiness</p>
            <p className="mt-1 text-sm font-semibold">{liveReady ? "Ready" : `${blockerCount} blocker${blockerCount === 1 ? "" : "s"}`}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/80 px-3 py-2 text-slate-100">
      <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  );
}