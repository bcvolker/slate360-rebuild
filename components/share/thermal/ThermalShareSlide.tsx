"use client";

import { useEffect, useRef, useState } from "react";
import {
  describeAnomaly,
  severityMeta,
  type ThermalAnomaly,
} from "@/lib/thermal/anomaly-describe";

type Capture = {
  id: string;
  filename?: string | null;
  previewUrl?: string | null;
  anomalies?: unknown[] | null;
  qualityMetrics?: Record<string, unknown> | null;
  gpsPosition?: Record<string, unknown> | null;
};

function dataRows(q: Record<string, unknown>, gps: Record<string, unknown>): [string, string][] {
  const num = (v: unknown, s = "") =>
    typeof v === "number" && Number.isFinite(v) ? `${v.toFixed(1)}${s}` : null;
  const rows: [string, string | null][] = [
    ["Camera", (q.sensor_make as string) ?? null],
    ["Sensor", (q.sensor_model as string) ?? (q.parser_id as string) ?? null],
    ["Max temp", num(q.max_temp_c, "°C")],
    ["Min temp", num(q.min_temp_c, "°C")],
    ["Avg temp", num(q.avg_temp_c, "°C")],
    ["Emissivity", num(q.emissivity_used)],
    [
      "GPS",
      gps.lat != null && (gps.lon ?? gps.lng) != null
        ? `${Number(gps.lat).toFixed(4)}, ${Number(gps.lon ?? gps.lng).toFixed(4)}`
        : null,
    ],
  ];
  return rows.filter((r): r is [string, string] => r[1] !== null);
}

/** One inspection image — large preview with anomaly call-outs, findings, and data. */
export function ThermalShareSlide({ capture }: { capture: Capture }) {
  const [nat, setNat] = useState<{ w: number; h: number } | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  // Cached images can already be `complete` before onLoad attaches — read dims directly.
  useEffect(() => {
    setNat(null);
    const img = imgRef.current;
    if (img?.complete && img.naturalWidth) setNat({ w: img.naturalWidth, h: img.naturalHeight });
  }, [capture.previewUrl]);

  const anomalies = (capture.anomalies as ThermalAnomaly[]) ?? [];
  const q = (capture.qualityMetrics ?? {}) as Record<string, unknown>;
  const gps = (capture.gpsPosition ?? {}) as Record<string, unknown>;
  const rows = dataRows(q, gps);
  const pct = (v: number, total: number) => `${(v / (total || 1)) * 100}%`;

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
      <div className="relative overflow-hidden rounded-xl border border-[var(--mobile-app-card-border)] bg-[#111827]">
        {capture.previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            ref={imgRef}
            src={capture.previewUrl}
            alt={capture.filename ?? "Thermal capture"}
            className="block w-full"
            onLoad={(e) => setNat({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
          />
        ) : (
          <div className="flex aspect-[4/3] items-center justify-center text-xs text-[var(--graphite-muted)]">
            Preview unavailable
          </div>
        )}
        {nat
          ? anomalies.map((a, i) => {
              if (!a.bbox) return null;
              const meta = severityMeta(a.severity);
              return (
                <span
                  key={a.id ?? i}
                  className="absolute flex items-start border-2"
                  style={{
                    left: pct(a.bbox.x, nat.w),
                    top: pct(a.bbox.y, nat.h),
                    width: pct(a.bbox.w, nat.w),
                    height: pct(a.bbox.h, nat.h),
                    borderColor: meta.color,
                  }}
                >
                  <span
                    className="-translate-y-[55%] rounded px-1 text-[9px] font-bold text-black"
                    style={{ background: meta.color }}
                  >
                    {i + 1}
                  </span>
                </span>
              );
            })
          : null}
      </div>

      <div className="space-y-3">
        <div className="rounded-xl border border-[var(--mobile-app-card-border)] p-3">
          <p className="truncate text-sm font-semibold text-[var(--graphite-text-header)]">
            {capture.filename ?? "Capture"}
          </p>
          <dl className="mt-2 space-y-1 text-xs">
            {rows.map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3">
                <dt className="text-[var(--graphite-muted)]">{k}</dt>
                <dd className="text-right font-medium text-[var(--graphite-text-body)]">{v}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="rounded-xl border border-[var(--mobile-app-card-border)] p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--graphite-muted)]">
            Findings ({anomalies.length})
          </p>
          {anomalies.length === 0 ? (
            <p className="mt-1 text-xs text-[var(--graphite-muted)]">No anomalies flagged on this image.</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {anomalies.map((a, i) => {
                const meta = severityMeta(a.severity);
                return (
                  <li key={a.id ?? i} className="text-[11px] leading-relaxed text-[var(--graphite-text-body)]">
                    <span
                      className="mr-1 inline-flex h-4 w-4 items-center justify-center rounded text-[9px] font-bold text-black"
                      style={{ background: meta.color }}
                    >
                      {i + 1}
                    </span>
                    {describeAnomaly(a)}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
