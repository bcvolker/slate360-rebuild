"use client";

import { useMemo, useState } from "react";
import { estimateThermalJobCredits } from "@/lib/thermal/cost-estimate";
import { thermalOpsTokens as t } from "@/components/ops/thermal/thermal-ops-tokens";

type Props = {
  sessionId: string;
  captureCount: number;
};

type ShareRole = "view" | "annotate" | "download";
type JobType = "extract" | "analyze" | "report" | "full_pipeline";

async function startJob(sessionId: string, jobType: JobType) {
  const res = await fetch("/api/ops/thermal/jobs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id: sessionId, job_type: jobType }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? `Failed to start ${jobType} job`);
}

export function ThermalSessionActions({ sessionId, captureCount }: Props) {
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [sharePassword, setSharePassword] = useState("");
  const [shareRole, setShareRole] = useState<ShareRole>("view");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pendingJob, setPendingJob] = useState<JobType>("full_pipeline");

  const costEstimate = useMemo(
    () => estimateThermalJobCredits(captureCount, pendingJob),
    [captureCount, pendingJob],
  );

  async function createShareLink() {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/ops/thermal/share/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          role: shareRole,
          password: sharePassword.trim() || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to create share link");
      setShareUrl(json.share_url);
      setNotice(json.password_protected ? "Password-protected link created." : "Share link created.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Share failed");
    } finally {
      setBusy(false);
    }
  }

  async function runJob(jobType: JobType, label: string) {
    setBusy(true);
    setError(null);
    setNotice(null);
    const jobEstimate = estimateThermalJobCredits(captureCount, jobType);
    try {
      await startJob(sessionId, jobType);
      setNotice(`${label} started — progress updates below. ${jobEstimate.note}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Job failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={t.card}>
      <p className={t.eyebrow}>Processing</p>
      <p className="mt-2 text-xs text-[var(--graphite-muted)]">{costEstimate.note}</p>
      <div className="mt-3 flex flex-wrap gap-3">
        <button
          type="button"
          className={t.secondaryButton}
          disabled={busy}
          onClick={() => {
            setPendingJob("extract");
            runJob("extract", "Extraction");
          }}
        >
          Re-run extraction
        </button>
        <button
          type="button"
          className={t.secondaryButton}
          disabled={busy}
          onClick={() => {
            setPendingJob("analyze");
            runJob("analyze", "Analysis");
          }}
        >
          Run anomaly analysis
        </button>
        <button
          type="button"
          className={t.secondaryButton}
          disabled={busy}
          onClick={() => {
            setPendingJob("report");
            runJob("report", "PDF report");
          }}
        >
          Generate PDF report
        </button>
        <button
          type="button"
          className={t.primaryButton}
          disabled={busy}
          onClick={() => {
            setPendingJob("full_pipeline");
            runJob("full_pipeline", "Full pipeline");
          }}
        >
          Run full pipeline
        </button>
      </div>

      <p className={`${t.eyebrow} mt-6`}>Exports</p>
      <div className="mt-3 flex flex-wrap gap-3">
        <a href={`/api/ops/thermal/sessions/${sessionId}/export?format=csv`} className={t.secondaryButton}>
          Anomalies CSV
        </a>
        <a href={`/api/ops/thermal/sessions/${sessionId}/export?format=json`} className={t.secondaryButton}>
          Anomalies JSON
        </a>
        <a href={`/api/ops/thermal/sessions/${sessionId}/export?format=geojson`} className={t.secondaryButton}>
          Anomalies GeoJSON
        </a>
      </div>

      <p className={`${t.eyebrow} mt-6`}>Deliverables</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="text-xs text-[var(--graphite-muted)]">
          Share role
          <select
            value={shareRole}
            onChange={(event) => setShareRole(event.target.value as ShareRole)}
            className="mt-1 block w-full rounded-xl border border-[var(--mobile-app-card-border)] bg-[#111827] px-3 py-2 text-sm text-white"
          >
            <option value="view">View only</option>
            <option value="annotate">View + annotate</option>
            <option value="download">View + PDF + exports</option>
          </select>
        </label>
        <label className="text-xs text-[var(--graphite-muted)]">
          Optional password
          <input
            type="password"
            value={sharePassword}
            onChange={(event) => setSharePassword(event.target.value)}
            className="mt-1 block w-full rounded-xl border border-[var(--mobile-app-card-border)] bg-[#111827] px-3 py-2 text-sm text-white"
            placeholder="Leave blank for open link"
          />
        </label>
      </div>
      <div className="mt-3">
        <button type="button" className={t.primaryButton} disabled={busy} onClick={createShareLink}>
          Create share link
        </button>
      </div>

      {shareUrl ? (
        <p className="mt-3 break-all text-xs text-[var(--graphite-primary)]">{shareUrl}</p>
      ) : null}
      {notice ? <p className="mt-2 text-xs text-[var(--graphite-muted)]">{notice}</p> : null}
      {error ? <p className="mt-2 text-xs text-[#fca5a5]">{error}</p> : null}
    </div>
  );
}
