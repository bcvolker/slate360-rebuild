"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import type { ThermalCapture, ThermalProcessingJob } from "@/lib/thermal/types";
import { formatQualityScore, scoreToBadgeTone, summarizeQualityFlags } from "@/lib/thermal/quality-scoring";
import { ThermalJobStatusBar } from "@/components/ops/thermal/ThermalJobStatusBar";
import { ThermalProbeViewer, type ThermalProbeGrid } from "@/components/ops/thermal/ThermalProbeViewer";
import { useThermalJobRealtime } from "@/hooks/useThermalJobRealtime";
import { thermalOpsTokens as t } from "@/components/ops/thermal/thermal-ops-tokens";

type CaptureView = ThermalCapture & { previewUrl: string | null };

type AnomalyRow = {
  id?: string;
  type?: string;
  severity?: string;
  delta_c?: number;
  user_mark?: string;
};

type ThermalSessionGalleryProps = {
  sessionId: string;
  sessionName: string;
  sessionStatus: string;
  captures: CaptureView[];
  initialJob: ThermalProcessingJob | null;
};

function badgeClass(tone: ReturnType<typeof scoreToBadgeTone>) {
  if (tone === "good") return t.badgeGood;
  if (tone === "bad") return t.badgeBad;
  return t.badgeWarn;
}

function formatAnomalyLine(row: AnomalyRow): string {
  const type = row.type?.replace(/_/g, " ") ?? "finding";
  const delta = row.delta_c != null ? ` · ΔT ${Number(row.delta_c).toFixed(1)}°C` : "";
  const mark = row.user_mark ? ` · ${row.user_mark}` : "";
  return `${type}${delta} · ${row.severity ?? "info"}${mark}`;
}

export function ThermalSessionGallery({
  sessionId,
  sessionName,
  sessionStatus,
  captures,
  initialJob,
}: ThermalSessionGalleryProps) {
  const { job, connected } = useThermalJobRealtime(sessionId);
  const activeJob = job ?? initialJob;
  const [selectedId, setSelectedId] = useState<string | null>(captures[0]?.id ?? null);

  const selected = useMemo(
    () => captures.find((c) => c.id === selectedId) ?? captures[0] ?? null,
    [captures, selectedId],
  );

  const selectedAnomalies = (selected?.anomalies as AnomalyRow[] | undefined) ?? [];
  const alignment = (
    (selected?.telemetry as Record<string, unknown> | undefined)?.alignment as
      | { quality?: string }
      | undefined
  );

  return (
    <div className="space-y-6">
      <div className={t.card}>
        <p className={t.eyebrow}>Session</p>
        <h2 className="mt-1 text-xl font-bold text-[var(--graphite-text-header)]">{sessionName}</h2>
        <p className="mt-1 text-sm capitalize text-[var(--graphite-muted)]">
          {sessionStatus} · {captures.length} capture{captures.length === 1 ? "" : "s"}
        </p>
      </div>

      <ThermalJobStatusBar job={activeJob} connected={connected} />

      <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
        <div className="space-y-2">
          {captures.map((capture) => {
            const tone = scoreToBadgeTone(capture.quality_metrics?.confidence_score);
            const anomalyCount = ((capture.anomalies as AnomalyRow[] | undefined) ?? []).length;
            return (
              <button
                key={capture.id}
                type="button"
                onClick={() => setSelectedId(capture.id)}
                className={`w-full rounded-xl border p-2 text-left transition-colors ${
                  selected?.id === capture.id
                    ? "border-[color-mix(in_srgb,var(--graphite-primary)_40%,transparent)] bg-[color-mix(in_srgb,var(--graphite-primary)_8%,transparent)]"
                    : "border-[var(--mobile-app-card-border)] hover:border-[color-mix(in_srgb,var(--graphite-primary)_24%,transparent)]"
                }`}
              >
                <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-[#111827]">
                  {capture.previewUrl ? (
                    <Image
                      src={capture.previewUrl}
                      alt={capture.filename ?? "Thermal capture"}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-[var(--graphite-muted)]">
                      Pending extract
                    </div>
                  )}
                </div>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <span className="truncate text-xs text-[var(--graphite-text-body)]">
                    {capture.filename ?? "Capture"}
                  </span>
                  <span className={badgeClass(tone)}>{formatQualityScore(capture.quality_metrics)}</span>
                </div>
                {anomalyCount ? (
                  <p className="mt-1 text-[10px] text-[var(--graphite-muted)]">{anomalyCount} anomal{anomalyCount === 1 ? "y" : "ies"}</p>
                ) : null}
              </button>
            );
          })}
        </div>

        <div className={t.card}>
          {selected ? (
            <>
              <CaptureProbe
                captureId={selected.id}
                filename={selected.filename ?? "Capture"}
                previewUrl={selected.previewUrl}
              />
              <div className="mt-4 grid gap-2 text-sm text-[var(--graphite-text-body)]">
                <p>Quality: {formatQualityScore(selected.quality_metrics)}</p>
                <p>
                  Temperature range:{" "}
                  {selected.quality_metrics?.min_temp_c !== undefined
                    ? `${selected.quality_metrics.min_temp_c.toFixed(1)}°C – ${selected.quality_metrics.max_temp_c?.toFixed(1)}°C`
                    : "—"}
                </p>
                <p>
                  Radiometric:{" "}
                  {selected.quality_metrics?.is_radiometric ? "Yes" : "No / pending"}
                  {selected.quality_metrics?.absolute_celsius === false ? " (relative scale)" : ""}
                </p>
                {alignment?.quality ? (
                  <p>Twin alignment: {alignment.quality}</p>
                ) : null}
                {summarizeQualityFlags(selected.quality_metrics).map((flag) => (
                  <p key={flag} className="text-[var(--graphite-muted)]">
                    » {flag}
                  </p>
                ))}
                {selectedAnomalies.length ? (
                  <div className="mt-2">
                    <p className="font-semibold text-[var(--graphite-text-header)]">Anomalies</p>
                    <ul className="mt-2 space-y-1 text-xs text-[var(--graphite-muted)]">
                      {selectedAnomalies.slice(0, 8).map((row, index) => (
                        <li key={row.id ?? index} className="flex items-start gap-2">
                          <span className="text-[var(--graphite-primary)]">»</span>
                          <span>{formatAnomalyLine(row)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            </>
          ) : (
            <p className="text-sm text-[var(--graphite-muted)]">No captures uploaded yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Renders the interactive per-pixel probe when a temperature grid is available
 * (e.g. HIKMICRO radiometric files), otherwise falls back to the static preview.
 */
function CaptureProbe({
  captureId,
  filename,
  previewUrl,
}: {
  captureId: string;
  filename: string;
  previewUrl: string | null;
}) {
  const [grid, setGrid] = useState<ThermalProbeGrid | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "unavailable">("loading");

  useEffect(() => {
    let cancelled = false;
    setGrid(null);
    setState("loading");
    fetch(`/api/ops/thermal/captures/${captureId}/grid`)
      .then(async (res) => {
        if (!res.ok) throw new Error(String(res.status));
        const json = await res.json();
        const data = (json.data ?? json) as ThermalProbeGrid;
        if (!cancelled) {
          setGrid(data);
          setState("idle");
        }
      })
      .catch(() => {
        if (!cancelled) setState("unavailable");
      });
    return () => {
      cancelled = true;
    };
  }, [captureId]);

  if (grid) {
    return <ThermalProbeViewer grid={grid} title={filename} />;
  }

  return (
    <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-[#111827]">
      {previewUrl ? (
        <Image src={previewUrl} alt={filename} fill className="object-contain" unoptimized />
      ) : (
        <div className="flex h-full items-center justify-center text-sm text-[var(--graphite-muted)]">
          Preview will appear after extraction completes.
        </div>
      )}
      {state === "loading" ? (
        <div className="absolute bottom-2 left-2 rounded bg-black/70 px-2 py-0.5 text-[10px] text-white">
          Checking for per-pixel data…
        </div>
      ) : null}
    </div>
  );
}
