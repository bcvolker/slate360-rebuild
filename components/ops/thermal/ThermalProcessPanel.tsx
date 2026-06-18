"use client";

import { useState } from "react";
import { thermalOpsTokens as t } from "@/components/ops/thermal/thermal-ops-tokens";

type Scope = "selected" | "all";

/**
 * Plain-language cloud-processing control. The user picks WHAT to do (decode /
 * find problems / build report) and the SCOPE (selected vs all), sees a one-line
 * summary of exactly what will run, then submits. No job-type jargon.
 */
export function ThermalProcessPanel({
  sessionId,
  allIds,
  selectedIds,
}: {
  sessionId: string;
  allIds: string[];
  selectedIds: string[];
}) {
  const [scope, setScope] = useState<Scope>(selectedIds.length ? "selected" : "all");
  const [decode, setDecode] = useState(true);
  const [find, setFind] = useState(true);
  const [report, setReport] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const targetIds = scope === "selected" ? selectedIds : allIds;

  // "Find problems" needs decoded data; keep the toggles consistent.
  function setFindSafe(v: boolean) {
    setFind(v);
    if (v) setDecode(true);
    if (!v) setReport(false);
  }
  function setReportSafe(v: boolean) {
    setReport(v);
    if (v) { setFind(true); setDecode(true); }
  }

  let jobType: "extract" | "analyze" | "report" | "full_pipeline" = "full_pipeline";
  let extraNote = "";
  if (decode && find && report) jobType = "full_pipeline";
  else if (decode && find && !report) { jobType = "full_pipeline"; extraNote = " (a report is produced as part of a full scan)"; }
  else if (find && !decode) jobType = "analyze";
  else if (report && !find) jobType = "report";
  else if (decode && !find) jobType = "extract";

  const steps = [
    decode ? "decode temperatures" : null,
    find ? "find thermal problems" : null,
    report || jobType === "full_pipeline" ? "build a report" : null,
  ].filter(Boolean);
  const summary = `This will ${steps.join(", ")} for ${targetIds.length} image${targetIds.length === 1 ? "" : "s"}.`;

  async function submit() {
    if (!targetIds.length) return;
    setBusy(true);
    setNotice(null);
    setError(null);
    try {
      const res = await fetch("/api/ops/thermal/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId, job_type: jobType, capture_ids: targetIds }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Could not start processing");
      setNotice(`Started for ${targetIds.length} image${targetIds.length === 1 ? "" : "s"} — watch progress in the status bar above; results appear on each image.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start");
    } finally {
      setBusy(false);
    }
  }

  const opt = (on: boolean, set: (v: boolean) => void, label: string, desc: string, locked = false) => (
    <label className={`flex gap-2 rounded-lg border p-2 ${on ? "border-[color-mix(in_srgb,var(--graphite-primary)_35%,transparent)] bg-[color-mix(in_srgb,var(--graphite-primary)_7%,transparent)]" : "border-[var(--mobile-app-card-border)]"} ${locked ? "opacity-70" : "cursor-pointer"}`}>
      <input type="checkbox" checked={on} disabled={locked} onChange={(e) => set(e.target.checked)} className="mt-0.5 accent-[var(--graphite-primary)]" />
      <span>
        <span className="block text-xs font-semibold text-[var(--graphite-text-header)]">{label}</span>
        <span className="block text-[11px] text-[var(--graphite-muted)]">{desc}</span>
      </span>
    </label>
  );

  return (
    <div className={t.card}>
      <p className={t.eyebrow}>Process images</p>

      <div className="mt-2 inline-flex rounded-lg border border-[var(--mobile-app-card-border)] p-0.5 text-xs">
        <button type="button" disabled={!selectedIds.length} onClick={() => setScope("selected")}
          className={`rounded px-2 py-1 font-semibold disabled:opacity-40 ${scope === "selected" ? "bg-[color-mix(in_srgb,var(--graphite-primary)_18%,transparent)] text-[var(--graphite-text-header)]" : "text-[var(--graphite-muted)]"}`}>
          Selected ({selectedIds.length})
        </button>
        <button type="button" onClick={() => setScope("all")}
          className={`rounded px-2 py-1 font-semibold ${scope === "all" ? "bg-[color-mix(in_srgb,var(--graphite-primary)_18%,transparent)] text-[var(--graphite-text-header)]" : "text-[var(--graphite-muted)]"}`}>
          All ({allIds.length})
        </button>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        {opt(decode, (v) => setDecode(find ? true : v), "Decode temperatures", "Read radiometric data so images can be tuned and probed.", find)}
        {opt(find, setFindSafe, "Find thermal problems", "Scan for hot spots, damp/cold areas, and linear traces.")}
        {opt(report, setReportSafe, "Build report", "Produce a PDF from the findings.")}
      </div>

      <p className="mt-3 text-xs text-[var(--graphite-text-body)]">{summary}{extraNote}</p>
      <p className="text-[11px] text-[var(--graphite-muted)]">Runs in the cloud (usually under a couple of minutes); progress shows in the status bar above.</p>

      <div className="mt-3 flex items-center gap-3">
        <button type="button" className={t.primaryButton} disabled={busy || targetIds.length === 0} onClick={submit}>
          {busy ? "Starting…" : "Start processing"}
        </button>
        {notice ? <span className="text-xs text-[var(--graphite-muted)]">{notice}</span> : null}
        {error ? <span className="text-xs text-[#fca5a5]">{error}</span> : null}
      </div>
    </div>
  );
}
