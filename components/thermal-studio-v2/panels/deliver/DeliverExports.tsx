"use client";

import { useEffect, useState } from "react";

type ReportRow = { id: string; title: string; generated_at: string | null };

/** Report downloads (S7 history) + Data exports (existing CSV/JSON/GeoJSON routes) — doc §1, Tab 5. */
export function DeliverExports({ sessionId, mode }: { sessionId: string; mode: "reports" | "exports" }) {
  const [reports, setReports] = useState<ReportRow[]>([]);

  useEffect(() => {
    if (mode !== "reports") return;
    void fetch(`/api/ops/thermal/sessions/${sessionId}/reports`)
      .then((r) => (r.ok ? r.json() : null))
      .then((json: { reports?: ReportRow[] } | null) => setReports(json?.reports ?? []))
      .catch(() => {});
  }, [sessionId, mode]);

  if (mode === "reports") {
    return (
      <div className="flex h-full flex-col gap-2 overflow-y-auto">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--graphite-muted)]">Generated reports ({reports.length})</span>
        {reports.length === 0 ? (
          <p className="text-xs text-[var(--graphite-muted)]">No reports generated yet — build one in the Report tab.</p>
        ) : (
          reports.map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-2 rounded-md border border-[var(--mobile-app-card-border)] p-2 text-xs">
              <span className="truncate text-[var(--graphite-text-header)]">{r.title}</span>
              <div className="flex shrink-0 gap-2">
                <a href={`/api/ops/thermal/sessions/${sessionId}/reports?download=${r.id}&fmt=pdf`} target="_blank" rel="noreferrer" className="text-[var(--graphite-primary)] underline">
                  PDF
                </a>
                <a href={`/api/ops/thermal/sessions/${sessionId}/reports?download=${r.id}&fmt=html`} target="_blank" rel="noreferrer" className="text-[var(--graphite-primary)] underline">
                  HTML
                </a>
              </div>
            </div>
          ))
        )}
      </div>
    );
  }

  const formats: { id: string; label: string; hint: string }[] = [
    { id: "csv", label: "Spreadsheet (.csv)", hint: "One row per finding — opens in Excel/Sheets" },
    { id: "json", label: "Raw data (.json)", hint: "Every capture + anomaly, machine-readable" },
    { id: "geojson", label: "Map data (.geojson)", hint: "GPS-tagged findings for GIS tools" },
  ];
  return (
    <div className="flex h-full flex-col gap-2">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--graphite-muted)]">Export findings</span>
      {formats.map((f) => (
        <a
          key={f.id}
          href={`/api/ops/thermal/sessions/${sessionId}/export?format=${f.id}`}
          className="flex flex-col rounded-md border border-[var(--mobile-app-card-border)] p-2 text-xs hover:border-[var(--graphite-primary)]"
        >
          <span className="font-semibold text-[var(--graphite-text-header)]">{f.label}</span>
          <span className="text-[10px] text-[var(--graphite-muted)]">{f.hint}</span>
        </a>
      ))}
    </div>
  );
}
