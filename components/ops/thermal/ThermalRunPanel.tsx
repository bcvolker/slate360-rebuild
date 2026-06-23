"use client";

import { useState } from "react";
import { thermalOpsTokens as t } from "@/components/ops/thermal/thermal-ops-tokens";

type Scope = "selected" | "all";
type Preset = "full" | "prepare" | "find" | "report";

/**
 * The ONE automated-processing control. The user picks a plain-language preset and
 * a scope (selected vs all) and presses Run — no decode/find/report jargon, no
 * second processing button anywhere. Presets map to DB-allowed job types only
 * (full_pipeline / extract / analyze / report) so a default run never trips the
 * job_type CHECK constraint.
 */
const PRESETS: { id: Preset; label: string; help: string; job: string }[] = [
  { id: "full", label: "Full inspection", help: "Decode temperatures, find problems, prep report data.", job: "full_pipeline" },
  { id: "prepare", label: "Prepare images only", help: "Decode radiometric temperatures so images can be tuned and probed.", job: "extract" },
  { id: "find", label: "Find problems only", help: "Re-scan decoded images for anomalies.", job: "analyze" },
  { id: "report", label: "Refresh report data", help: "Rebuild report inputs from current findings.", job: "report" },
];

export function ThermalRunPanel({
  sessionId,
  allIds,
  selectedIds,
}: {
  sessionId: string;
  allIds: string[];
  selectedIds: string[];
}) {
  const [scope, setScope] = useState<Scope>(selectedIds.length ? "selected" : "all");
  const [preset, setPreset] = useState<Preset>("full");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const targetIds = scope === "selected" ? selectedIds : allIds;
  const def = PRESETS.find((p) => p.id === preset)!;

  async function run() {
    if (!targetIds.length) return;
    setBusy(true);
    setNotice(null);
    setError(null);
    try {
      const res = await fetch("/api/ops/thermal/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId, job_type: def.job, capture_ids: targetIds }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Could not start");
      setNotice(`Started on ${targetIds.length} image${targetIds.length === 1 ? "" : "s"} — watch the status above; results appear on each image.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={t.card}>
      <p className={t.eyebrow}>Run analysis (automated · cloud)</p>

      {/* Scope */}
      <div className="mt-2 inline-flex rounded-lg border border-[var(--mobile-app-card-border)] p-0.5 text-xs">
        <button
          type="button"
          disabled={!selectedIds.length}
          title={selectedIds.length ? "" : "Select images in the grid first"}
          onClick={() => setScope("selected")}
          className={`rounded px-2 py-1 font-semibold disabled:opacity-40 ${scope === "selected" ? "bg-[color-mix(in_srgb,var(--graphite-primary)_18%,transparent)] text-[var(--graphite-text-header)]" : "text-[var(--graphite-muted)]"}`}
        >
          Selected ({selectedIds.length})
        </button>
        <button
          type="button"
          onClick={() => setScope("all")}
          className={`rounded px-2 py-1 font-semibold ${scope === "all" ? "bg-[color-mix(in_srgb,var(--graphite-primary)_18%,transparent)] text-[var(--graphite-text-header)]" : "text-[var(--graphite-muted)]"}`}
        >
          All ({allIds.length})
        </button>
      </div>

      {/* Preset */}
      <label className="mt-3 block text-[11px] font-semibold text-[var(--graphite-muted)]">What to run</label>
      <select
        value={preset}
        onChange={(e) => setPreset(e.target.value as Preset)}
        className="mt-1 w-full rounded-lg border border-[var(--mobile-app-card-border)] bg-transparent px-2 py-1.5 text-xs text-[var(--graphite-text-header)]"
      >
        {PRESETS.map((p) => (
          <option key={p.id} value={p.id}>{p.label}</option>
        ))}
      </select>
      <p className="mt-1 text-[11px] text-[var(--graphite-muted)]">{def.help}</p>

      <p className="mt-2 text-xs text-[var(--graphite-text-body)]">
        {def.label} on {targetIds.length} image{targetIds.length === 1 ? "" : "s"}. Runs in the cloud (usually under a couple of minutes).
      </p>

      <div className="mt-3 flex items-center gap-3">
        <button type="button" className={t.primaryButton} disabled={busy || targetIds.length === 0} onClick={run}>
          {busy ? "Starting…" : "Run analysis"}
        </button>
        {notice ? <span className="text-xs text-[var(--graphite-muted)]">{notice}</span> : null}
        {error ? <span className="text-xs text-[#fca5a5]">{error}</span> : null}
      </div>
    </div>
  );
}
