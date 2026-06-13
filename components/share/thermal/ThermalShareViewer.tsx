"use client";

import { useState } from "react";
import Image from "next/image";
import type { ThermalShareViewerData } from "@/lib/thermal/share-viewer-types";

type AnomalyRow = {
  id?: string;
  type?: string;
  severity?: string;
  delta_c?: number;
  bbox?: any;
};

type Props = {
  data: ThermalShareViewerData | null;
  token?: string;
  tokenState?: "invalid" | "expired" | "revoked" | "max_views" | "unavailable";
  embed?: boolean;
};

function anomalyLabel(row: AnomalyRow): string {
  const type = row.type?.replace(/_/g, " ") ?? "finding";
  const delta = row.delta_c != null ? ` · ΔT ${Number(row.delta_c).toFixed(1)}°C` : "";
  return `${type}${delta} · ${row.severity ?? "info"}`;
}

export function ThermalShareViewer({ data, token, tokenState, embed = false }: Props) {
  const [annotateBusy, setAnnotateBusy] = useState<string | null>(null);
  const [annotateNote, setAnnotateNote] = useState<string | null>(null);

  if (tokenState) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--graphite-canvas)] px-6">
        <p className="text-sm text-[var(--graphite-muted)]">This thermal share link is {tokenState}.</p>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--graphite-canvas)] px-6">
        <p className="text-sm text-[var(--graphite-muted)]">Unable to load thermal inspection.</p>
      </main>
    );
  }

  const branding = data.branding;
  const summary = data.summaryMetrics;
  const canDownload = data.role === "download" && token;
  const canExport = canDownload;
  const canAnnotate = (data.role === "annotate" || data.role === "download") && token;

  async function markAnomaly(captureId: string, anomalyId: string, mark: "confirmed" | "false_positive") {
    if (!token) return;
    setAnnotateBusy(`${captureId}:${anomalyId}`);
    setAnnotateNote(null);
    try {
      const res = await fetch(`/api/share/thermal/${token}/annotate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ captureId, anomalyId, mark }),
      });
      if (res.ok) {
        setAnnotateNote("Annotation recorded. Ops will review.");
      } else {
        setAnnotateNote("Could not record annotation.");
      }
    } catch {
      setAnnotateNote("Network error while annotating.");
    } finally {
      setAnnotateBusy(null);
    }
  }

  return (
    <main
      className={`bg-[var(--graphite-canvas)] text-[var(--graphite-text-body)] ${embed ? "p-4" : "min-h-screen px-4 py-8"}`}
    >
      <div className="mx-auto max-w-5xl">
        <header className="mb-6 border-b border-[var(--mobile-app-card-border)] pb-4">
          <p className="text-xs uppercase tracking-[0.12em] text-[var(--graphite-muted)]">
            {branding.company_name || "Thermal inspection report"}
          </p>
          <h1 className="mt-2 text-2xl font-bold text-[var(--graphite-text-header)]">{data.sessionName}</h1>
          {branding.show_metrics !== false ? (
            <div className="mt-3 flex flex-wrap gap-4 text-sm text-[var(--graphite-muted)]">
              <span>Captures: {String(summary.total_captures ?? data.captures.length)}</span>
              <span>Radiometric: {String(summary.radiometric_captures ?? "—")}</span>
              <span>Max temp: {summary.max_detected_temp_c != null ? `${summary.max_detected_temp_c}°C` : "—"}</span>
              <span>Action items: {String(summary.critical_anomalies ?? 0)}</span>
            </div>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-3">
            {canDownload ? (
              <a
                href={`/api/share/thermal/${token}/report`}
                className="inline-flex rounded-full bg-[var(--graphite-primary)] px-4 py-2 text-sm font-semibold text-[#0B0F15]"
              >
                Download PDF report
              </a>
            ) : null}
            {canExport ? (
              <>
                <a
                  href={`/api/share/thermal/${token}/export?format=csv`}
                  className="inline-flex rounded-full border border-[var(--mobile-app-card-border)] px-4 py-2 text-sm font-semibold text-[var(--graphite-text-body)]"
                >
                  Export anomalies (CSV)
                </a>
                <a
                  href={`/api/share/thermal/${token}/export?format=json`}
                  className="inline-flex rounded-full border border-[var(--mobile-app-card-border)] px-4 py-2 text-sm font-semibold text-[var(--graphite-text-body)]"
                >
                  Export (JSON)
                </a>
                <a
                  href={`/api/share/thermal/${token}/export?format=geojson`}
                  className="inline-flex rounded-full border border-[var(--mobile-app-card-border)] px-4 py-2 text-sm font-semibold text-[var(--graphite-text-body)]"
                >
                  Export (GeoJSON)
                </a>
              </>
            ) : null}
          </div>
          {data.linkedSpaceId ? (
            <p className="mt-3 text-xs text-[var(--graphite-muted)]">
              Thermal layer available in the linked Digital Twin viewer (toggle in Desktop Twin 360 Studio).
            </p>
          ) : null}
        </header>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.captures.map((capture) => {
            const anomalies = (capture.anomalies as AnomalyRow[]) ?? [];
            return (
              <article
                key={capture.id}
                className="overflow-hidden rounded-2xl border border-[var(--mobile-app-card-border)] bg-[color-mix(in_srgb,var(--graphite-canvas)_76%,transparent)]"
              >
                <div className="relative aspect-[4/3] bg-[#111827]">
                  {capture.previewUrl ? (
                    <Image
                      src={capture.previewUrl}
                      alt={capture.filename ?? "Thermal"}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-[var(--graphite-muted)]">
                      Preview unavailable
                    </div>
                  )}
                </div>
                <div className="p-3 text-sm">
                  <p className="truncate font-medium text-[var(--graphite-text-header)]">
                    {capture.filename ?? "Capture"}
                  </p>
                  <p className="mt-1 text-xs text-[var(--graphite-muted)]">
                    {capture.qualityMetrics?.min_temp_c != null
                      ? `${Number(capture.qualityMetrics.min_temp_c).toFixed(1)}°C – ${Number(capture.qualityMetrics.max_temp_c).toFixed(1)}°C`
                      : "Temperature pending"}
                  </p>
                  {anomalies.length ? (
                    <ul className="mt-2 space-y-1 text-xs text-[var(--graphite-muted)]">
                      {anomalies.slice(0, 5).map((row, index) => {
                        const aid = row.id || `${capture.id}-${index}`;
                        const busy = annotateBusy === `${capture.id}:${aid}`;
                        return (
                          <li key={aid} className="flex items-start gap-2">
                            <span className="text-[var(--graphite-primary)]">»</span>
                            <span>{anomalyLabel(row)}</span>
                            {canAnnotate ? (
                              <span className="ml-auto flex gap-1 text-[10px]">
                                <button
                                  className="rounded border border-[var(--graphite-primary)] px-1 text-[var(--graphite-primary)] disabled:opacity-50"
                                  disabled={!!busy}
                                  onClick={() => markAnomaly(capture.id, aid, "confirmed")}
                                >
                                  ✓
                                </button>
                                <button
                                  className="rounded border px-1 text-[var(--graphite-muted)] disabled:opacity-50"
                                  disabled={!!busy}
                                  onClick={() => markAnomaly(capture.id, aid, "false_positive")}
                                >
                                  ✕
                                </button>
                              </span>
                            ) : null}
                          </li>
                        );
                      })}
                    </ul>
                  ) : null}

                  {data.linkedSpaceId ? (
                    <p className="mt-2 text-[10px] text-[var(--graphite-muted)]">
                      Linked to Digital Twin space {data.linkedSpaceId.slice(0, 8)}… — open Twin 360 for spatial context.
                    </p>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>

        {annotateNote ? <p className="mt-4 text-xs text-[var(--graphite-muted)]">{annotateNote}</p> : null}

        {branding.custom_footer ? (
          <footer className="mt-8 text-xs text-[var(--graphite-muted)]">{branding.custom_footer}</footer>
        ) : null}
      </div>
    </main>
  );
}
