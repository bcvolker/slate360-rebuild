"use client";

import {
  resolveTwinQualityStatus,
  type TwinQualityMetrics,
} from "@/lib/digital-twin/twin-quality-status";

export function TwinQualityBadge({ metrics }: { metrics?: TwinQualityMetrics }) {
  const status = resolveTwinQualityStatus(metrics);
  const registration =
    typeof metrics?.registrationPct === "number" ? metrics.registrationPct : null;
  const reprojection =
    typeof metrics?.meanReprojectionError === "number"
      ? metrics.meanReprojectionError
      : null;

  return (
    <div
      aria-label={`Twin quality ${status}`}
      className="pointer-events-none max-w-[min(18rem,calc(100vw-2rem))] border border-white/10 bg-[color-mix(in_srgb,var(--graphite-canvas)_88%,transparent)] px-3 py-2 text-[10px] text-zinc-200 shadow-lg backdrop-blur-md"
    >
      <div className="font-mono uppercase tracking-[0.16em] text-zinc-400">Model confidence</div>
      <div className="mt-1 font-semibold tracking-wide text-[var(--twin360-blue)]">{status}</div>
      {registration !== null || reprojection !== null ? (
        <div className="mt-1 space-y-0.5 text-zinc-400">
          {registration !== null ? <div>Registered {registration.toFixed(1)}%</div> : null}
          {reprojection !== null ? <div>Reprojection {reprojection.toFixed(3)} px</div> : null}
        </div>
      ) : null}
    </div>
  );
}
