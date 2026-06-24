"use client";

import {
  describeAnomaly,
  causeLabel,
  severityMeta,
  type DescribeUnit,
  type ThermalAnomaly,
} from "@/lib/thermal/anomaly-describe";

/**
 * Per-capture findings list — numbered, severity-chipped, with standards-aware
 * descriptions. Selecting a finding syncs with the overlay box on the image.
 */
export function ThermalFindingsPanel({
  anomalies,
  standards,
  unit,
  selectedId,
  onSelect,
}: {
  anomalies: ThermalAnomaly[];
  standards?: string[];
  unit: DescribeUnit;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const counts = anomalies.reduce<Record<string, number>>((acc, a) => {
    const k = (a.severity as string) ?? "info";
    acc[k] = (acc[k] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="rounded-xl border border-[var(--mobile-app-card-border)] p-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--graphite-muted)]">
          Findings ({anomalies.length})
        </p>
        <div className="flex items-center gap-1">
          {(["action", "watch", "info"] as const).map((s) =>
            counts[s] ? (
              <span
                key={s}
                className={`rounded border px-1.5 py-0.5 text-[10px] font-bold ${severityMeta(s).chipClass}`}
              >
                {counts[s]} {severityMeta(s).label}
              </span>
            ) : null,
          )}
        </div>
      </div>

      {anomalies.length === 0 ? (
        <p className="mt-2 text-xs text-[var(--graphite-muted)]">
          No anomalies detected in this capture. Run Analyze to scan for hot spots,
          cold bridges, and linear patterns.
        </p>
      ) : (
        <ul className="mt-2 space-y-2">
          {anomalies.map((a, i) => {
            const meta = severityMeta(a.severity);
            const selected = a.id === selectedId;
            return (
              <li key={a.id}>
                <button
                  type="button"
                  onClick={() => onSelect(selected ? null : a.id)}
                  className={`w-full rounded-lg border p-2 text-left transition-colors ${
                    selected
                      ? "border-[color-mix(in_srgb,var(--graphite-primary)_45%,transparent)] bg-[color-mix(in_srgb,var(--graphite-primary)_8%,transparent)]"
                      : "border-[var(--mobile-app-card-border)] hover:bg-[color-mix(in_srgb,var(--graphite-primary)_5%,transparent)]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-[var(--graphite-text-header)]">
                      <span
                        className="flex h-4 w-4 items-center justify-center rounded text-[9px] font-bold text-black"
                        style={{ background: meta.color }}
                      >
                        {i + 1}
                      </span>
                      Finding #{i + 1}
                    </span>
                    <span className={`rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase ${meta.chipClass}`}>
                      {meta.label}
                    </span>
                  </div>
                  <p className="mt-1.5 text-[11px] leading-relaxed text-[var(--graphite-text-body)]">
                    {a.observation || describeAnomaly(a, { standards, unit })}
                  </p>
                  {a.suggested_causes && a.suggested_causes.length > 0 ? (
                    <div className="mt-1.5 flex flex-wrap items-center gap-1">
                      <span className="text-[9px] font-semibold uppercase text-[var(--graphite-muted)]">May indicate</span>
                      {a.suggested_causes.map((c) => (
                        <span key={c} className="rounded border border-[var(--mobile-app-card-border)] px-1.5 py-0.5 text-[9px] text-[var(--graphite-text-body)]">
                          {causeLabel(c)}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  {a.ai_interpreted ? (
                    <p className="mt-1 text-[9px] italic text-[var(--graphite-muted)]">
                      AI-assisted scene reading — review before issuing.
                    </p>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
