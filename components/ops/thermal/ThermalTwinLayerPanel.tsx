"use client";

import { useState } from "react";
import { thermalOpsTokens as t } from "@/components/ops/thermal/thermal-ops-tokens";

type Props = {
  sessionId: string;
  linkedSpaceId: string | null;
};

/**
 * Twin workspace — link a Digital Twin space and run GPS alignment. The full
 * pixel-onto-splat overlay is a separate engineering track; this surface does the
 * real linking + alignment and is honest about what ships today.
 */
export function ThermalTwinLayerPanel({ sessionId, linkedSpaceId: initialLinkedSpaceId }: Props) {
  const [linkedSpaceId, setLinkedSpaceId] = useState(initialLinkedSpaceId ?? "");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const linked = linkedSpaceId.trim();

  async function saveLink(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setNotice(null);
    setError(null);
    try {
      const res = await fetch(`/api/ops/thermal/sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ metadata: { linked_space_id: linked || null } }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to save twin link");
      setNotice(linked ? "Twin space linked." : "Twin link cleared.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function runAlign() {
    setBusy(true);
    setNotice(null);
    setError(null);
    try {
      const res = await fetch("/api/ops/thermal/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId, job_type: "align" }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Failed to start align");
      setNotice("Alignment job started — progress shows in the status bar.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Align start failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto grid h-full max-w-5xl content-center items-start gap-4 overflow-y-auto lg:grid-cols-2">
      <div className={t.card}>
        <p className={t.eyebrow}>Link a Digital Twin</p>
        <p className="mt-2 text-xs text-[var(--graphite-muted)]">
          Link a twin space so share links carry layer context and a path into Twin 360.
        </p>
        <form onSubmit={saveLink} className="mt-3 space-y-2">
          <label className="block text-xs text-[var(--graphite-muted)]">
            Twin space ID
            <input
              value={linkedSpaceId}
              onChange={(e) => setLinkedSpaceId(e.target.value)}
              className="mt-1 block w-full rounded-xl border border-[var(--mobile-app-card-border)] bg-[#111827] px-3 py-2 text-sm text-white"
              placeholder="digital_twin_space uuid"
            />
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <button type="submit" className={t.secondaryButton} disabled={busy}>
              {busy ? "Saving…" : "Save link"}
            </button>
            {linked ? (
              <a href={`/digital-twin/twins/${linked}`} className="text-sm text-[var(--graphite-primary)] hover:underline">
                Open twin →
              </a>
            ) : null}
            {linked ? (
              <button type="button" className={t.secondaryButton} disabled={busy} onClick={runAlign}>
                Run alignment
              </button>
            ) : null}
          </div>
        </form>
        {notice ? <p className="mt-2 text-xs text-[var(--graphite-muted)]">{notice}</p> : null}
        {error ? <p className="mt-2 text-xs text-[#fca5a5]">{error}</p> : null}
      </div>

      <div className={t.card}>
        <p className={t.eyebrow}>How the twin overlay works</p>
        <ul className="mt-2 space-y-2 text-xs text-[var(--graphite-muted)]">
          <li>
            <strong className="text-[var(--graphite-text-body)]">Today:</strong> alignment uses each capture&apos;s
            GPS to anchor it approximately to the linked space and writes a manifest.
          </li>
          <li>
            <strong className="text-[var(--graphite-text-body)]">Next:</strong> camera-pose solve (COLMAP) + LiDAR
            depth to project thermal pixels onto the Gaussian splat surface as a toggleable layer.
          </li>
          <li>
            The interactive splat overlay renders in the Digital Twin viewer — not here — once that track ships.
          </li>
        </ul>
      </div>
    </div>
  );
}
