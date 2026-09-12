"use client";

import type { SplatLabTelemetry } from "@/lib/splat-lab/job-store";

function fmtEta(sec?: number): string {
  if (!sec || sec <= 0) return "—";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export function LiveRow({ telemetry, elapsedS }: { telemetry: SplatLabTelemetry | null; elapsedS?: number }) {
  const it = telemetry?.iteration ?? 0;
  const steps = telemetry?.steps ?? 0;
  const pct = steps > 0 ? Math.min(100, Math.round((it / steps) * 100)) : 0;

  return (
    <div className="rounded-md border border-white/10 bg-[var(--graphite-canvas)] p-3">
      <div className="h-1 overflow-hidden rounded-sm bg-white/10">
        <div className="h-full bg-[var(--twin360-blue)] transition-all" style={{ width: `${pct}%` }} />
      </div>
      <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 font-mono text-[10px] text-[var(--graphite-text-body)] sm:grid-cols-5">
        <Item label="Iter" value={steps ? `${it.toLocaleString()}/${steps.toLocaleString()}` : "—"} />
        <Item label="Splats" value={telemetry?.splats ? `${(telemetry.splats / 1e6).toFixed(2)}M` : "—"} />
        <Item label="it/s" value={telemetry?.itPerSec ? telemetry.itPerSec.toFixed(1) : "—"} />
        <Item label="ETA" value={fmtEta(telemetry?.etaSec)} />
        <Item label="Elapsed" value={elapsedS ? fmtEta(elapsedS) : "—"} />
      </dl>
    </div>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="uppercase tracking-wide text-[var(--graphite-muted)]">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
