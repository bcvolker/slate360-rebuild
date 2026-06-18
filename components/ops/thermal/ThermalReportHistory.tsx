"use client";

import { useCallback, useEffect, useState } from "react";
import { thermalOpsTokens as t } from "@/components/ops/thermal/thermal-ops-tokens";

type ReportRow = {
  id: string;
  title: string;
  template_id: string;
  storage_key: string | null;
  html_storage_key: string | null;
  generated_at: string | null;
  created_at: string;
};

/** Lists generated reports for the session with re-download links. */
export function ThermalReportHistory({
  sessionId,
  refreshKey = 0,
}: {
  sessionId: string;
  refreshKey?: number;
}) {
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  const load = useCallback(() => {
    setState("loading");
    fetch(`/api/ops/thermal/sessions/${sessionId}/reports`)
      .then(async (res) => {
        if (!res.ok) throw new Error("load failed");
        const json = await res.json();
        return (json.data?.reports ?? json.reports ?? []) as ReportRow[];
      })
      .then((rows) => {
        setReports(rows);
        setState("ready");
      })
      .catch(() => setState("error"));
  }, [sessionId]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  return (
    <div className={t.card}>
      <div className="flex items-center justify-between">
        <p className={t.eyebrow}>Report history</p>
        <button
          type="button"
          onClick={load}
          className="text-xs text-[var(--graphite-muted)] hover:text-[var(--graphite-text-header)]"
        >
          Refresh
        </button>
      </div>

      {state === "loading" ? (
        <p className="mt-3 text-xs text-[var(--graphite-muted)]">Loading reports…</p>
      ) : state === "error" ? (
        <p className="mt-3 text-xs text-[#fca5a5]">Could not load reports.</p>
      ) : reports.length === 0 ? (
        <p className="mt-3 text-xs text-[var(--graphite-muted)]">
          No reports yet. Generate one above — it will appear here for re-download.
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {reports.map((r) => {
            const when = r.generated_at ?? r.created_at;
            return (
              <li
                key={r.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-[var(--mobile-app-card-border)] p-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-[var(--graphite-text-header)]">{r.title}</p>
                  <p className="text-[11px] text-[var(--graphite-muted)]">
                    {r.template_id} · {new Date(when).toLocaleString()}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {r.storage_key ? (
                    <a
                      href={`/api/ops/thermal/sessions/${sessionId}/reports?download=${r.id}&fmt=pdf`}
                      className="rounded-lg border border-[var(--mobile-app-card-border)] px-2 py-1 text-xs text-[var(--graphite-text-body)] hover:border-[color-mix(in_srgb,var(--graphite-primary)_28%,transparent)]"
                    >
                      PDF
                    </a>
                  ) : null}
                  {r.html_storage_key ? (
                    <a
                      href={`/api/ops/thermal/sessions/${sessionId}/reports?download=${r.id}&fmt=html`}
                      className="rounded-lg border border-[var(--mobile-app-card-border)] px-2 py-1 text-xs text-[var(--graphite-text-body)] hover:border-[color-mix(in_srgb,var(--graphite-primary)_28%,transparent)]"
                    >
                      HTML
                    </a>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
