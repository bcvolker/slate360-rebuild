"use client";

import { useState } from "react";
import { thermalOpsTokens as t } from "@/components/ops/thermal/thermal-ops-tokens";
import {
  listProfiles,
  saveProfile,
  deleteProfile,
  type InspectionProfile,
} from "@/lib/thermal/inspection-profiles";

/**
 * Batch inspection profiles — apply a named preset (decode params + anomaly
 * thresholds + report template) to a selection in one click, or save the current
 * defaults as a new profile.
 */
export function ThermalInspectionProfiles({
  sessionId,
  targetIds,
}: {
  sessionId: string;
  /** Captures the profile's decode params apply to (selection, else all). */
  targetIds: string[];
}) {
  const [profiles, setProfiles] = useState<InspectionProfile[]>(() => listProfiles());
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");

  async function apply(p: InspectionProfile) {
    setBusy(p.id);
    setNotice(null);
    try {
      // Session-level: detection thresholds + default report template.
      await fetch(`/api/ops/thermal/sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          metadata: {
            analysis_params: {
              hot_delta_c: p.thresholds.hot_delta_c,
              cold_delta_c: p.thresholds.cold_delta_c,
              min_area_px: p.thresholds.min_area_px,
            },
            ...(p.report_template_id ? { report_template_id: p.report_template_id } : {}),
          },
        }),
      }).catch(() => {});
      // Per-capture: decode params (+ palette) across the target set.
      await Promise.all(
        targetIds.map((id) =>
          fetch(`/api/ops/thermal/captures/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              tuning: {
                emissivity: p.decode.emissivity,
                reflected_c: p.decode.reflected_c,
                ...(p.decode.distance_m != null ? { distance_m: p.decode.distance_m } : {}),
                ...(p.decode.humidity_pct != null ? { humidity_pct: p.decode.humidity_pct } : {}),
              },
            }),
          }).catch(() => {}),
        ),
      );
      setNotice(`Applied "${p.name}" to ${targetIds.length} image${targetIds.length === 1 ? "" : "s"}.`);
    } finally {
      setBusy(null);
    }
  }

  function create() {
    if (!name.trim()) return;
    // Seed a new profile from sensible defaults — the operator edits thresholds in
    // Detection settings and decode in tuning, then re-saves as needed.
    setProfiles(
      saveProfile({
        name: name.trim(),
        decode: { emissivity: 0.95, reflected_c: 20 },
        thresholds: { hot_delta_c: 8, cold_delta_c: 6, min_area_px: 12 },
      }),
    );
    setName("");
    setCreating(false);
  }

  function remove(id: string) {
    setProfiles(deleteProfile(id));
  }

  return (
    <div className={t.card}>
      <div className="flex items-center justify-between">
        <p className={t.eyebrow}>Inspection profiles</p>
        <button
          type="button"
          onClick={() => setCreating((v) => !v)}
          className="text-[11px] text-[var(--graphite-muted)] hover:text-[var(--graphite-text-header)]"
        >
          {creating ? "Cancel" : "New"}
        </button>
      </div>

      {creating ? (
        <div className="mt-2 flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Profile name"
            className="flex-1 rounded-lg border border-[var(--mobile-app-card-border)] bg-[#111827] px-2 py-1 text-xs text-white"
          />
          <button type="button" onClick={create} className="rounded-lg border border-[var(--mobile-app-card-border)] px-2 py-1 text-xs font-semibold text-[var(--graphite-text-body)] hover:text-[var(--graphite-text-header)]">
            Save
          </button>
        </div>
      ) : null}

      <ul className="mt-2 space-y-1.5">
        {profiles.map((p) => (
          <li key={p.id} className="flex items-center gap-2 rounded-lg border border-[var(--mobile-app-card-border)] p-2">
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs font-semibold text-[var(--graphite-text-header)]">{p.name}</span>
              <span className="block text-[10px] text-[var(--graphite-muted)]">
                ε {p.decode.emissivity.toFixed(2)} · ΔT {p.thresholds.hot_delta_c}° · min {p.thresholds.min_area_px}px
              </span>
            </span>
            <button
              type="button"
              onClick={() => apply(p)}
              disabled={busy !== null || targetIds.length === 0}
              className="rounded border border-[var(--mobile-app-card-border)] px-2 py-1 text-[11px] font-semibold text-[var(--graphite-text-body)] hover:text-[var(--graphite-text-header)] disabled:opacity-40"
            >
              {busy === p.id ? "Applying…" : `Apply (${targetIds.length})`}
            </button>
            {p.id.startsWith("seed-") ? null : (
              <button type="button" onClick={() => remove(p.id)} className="text-[11px] text-[var(--graphite-muted)] hover:text-[#fca5a5]" title="Delete">
                ✕
              </button>
            )}
          </li>
        ))}
      </ul>
      {notice ? <p className="mt-2 text-[11px] text-[var(--graphite-muted)]">{notice}</p> : null}
    </div>
  );
}
