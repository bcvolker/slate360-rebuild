import { thermalOpsTokens as t } from "@/components/ops/thermal/thermal-ops-tokens";

type Props = {
  summary: Record<string, unknown>;
};

export function ThermalSessionSummaryBar({ summary }: Props) {
  return (
    <div className={`${t.card} grid gap-3 sm:grid-cols-2 lg:grid-cols-4`}>
      <div>
        <p className="text-xs text-[var(--graphite-muted)]">Captures</p>
        <p className="text-lg font-semibold text-[var(--graphite-text-header)]">
          {String(summary.total_captures ?? "—")}
        </p>
      </div>
      <div>
        <p className="text-xs text-[var(--graphite-muted)]">Radiometric</p>
        <p className="text-lg font-semibold text-[var(--graphite-text-header)]">
          {String(summary.radiometric_captures ?? "—")}
        </p>
      </div>
      <div>
        <p className="text-xs text-[var(--graphite-muted)]">Action anomalies</p>
        <p className="text-lg font-semibold text-[var(--graphite-text-header)]">
          {String(summary.critical_anomalies ?? 0)}
        </p>
      </div>
      <div>
        <p className="text-xs text-[var(--graphite-muted)]">Max temp</p>
        <p className="text-lg font-semibold text-[var(--graphite-text-header)]">
          {summary.max_detected_temp_c != null ? `${summary.max_detected_temp_c}°C` : "—"}
        </p>
      </div>
    </div>
  );
}
