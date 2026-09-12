"use client";

import type { SplatLabTelemetry } from "@/lib/splat-lab/job-store";

function fmtEta(sec?: number): string {
  if (!sec || sec <= 0) return "—";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export function LiveViewHud({
  telemetry,
  showViewer,
  onToggleViewer,
}: {
  telemetry: SplatLabTelemetry | null;
  showViewer: boolean;
  onToggleViewer: () => void;
}) {
  const it = telemetry?.iteration ?? 0;
  const steps = telemetry?.steps ?? 0;
  const pct = steps > 0 ? Math.min(100, Math.round((it / steps) * 100)) : 0;

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 p-3">
      <div className="pointer-events-auto rounded-xl border border-white/10 bg-black/55 p-3 backdrop-blur">
        <div className="flex items-center justify-between gap-2">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--graphite-muted)]">Live View</p>
          <button onClick={onToggleViewer} className="rounded-md border border-white/10 px-2 py-1 font-mono text-[10px] text-[var(--graphite-muted)] hover:text-white">
            {showViewer ? "Hide viewer" : "Open viewer :7007"}
          </button>
        </div>
        <div className="mt-2 h-1 overflow-hidden rounded-sm bg-white/10">
          <div className="h-full bg-[var(--twin360-blue)]" style={{ width: `${pct}%` }} />
        </div>
        <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 font-mono text-[10px] text-[var(--graphite-text-body)] sm:grid-cols-5">
          <Hud label="Iter" value={steps ? `${it}/${steps}` : "—"} />
          <Hud label="Splats" value={telemetry?.splats ? `${(telemetry.splats / 1e6).toFixed(2)}M` : "—"} />
          <Hud label="it/s" value={telemetry?.itPerSec ? telemetry.itPerSec.toFixed(1) : "—"} />
          <Hud label="ETA" value={fmtEta(telemetry?.etaSec)} />
          <Hud label="GPU" value={telemetry?.gpu ?? "RTX 3090"} />
        </dl>
      </div>
    </div>
  );
}

function Hud({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="uppercase tracking-wide text-[var(--graphite-muted)]">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
