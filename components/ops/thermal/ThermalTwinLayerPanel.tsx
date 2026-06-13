"use client";

import { useState } from "react";
import { thermalOpsTokens as t } from "@/components/ops/thermal/thermal-ops-tokens";

type Props = {
  sessionId: string;
  linkedSpaceId: string | null;
};

export function ThermalTwinLayerPanel({ sessionId, linkedSpaceId: initialLinkedSpaceId }: Props) {
  const [linkedSpaceId, setLinkedSpaceId] = useState(initialLinkedSpaceId ?? "");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function saveLink(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setNotice(null);
    setError(null);
    try {
      const res = await fetch(`/api/ops/thermal/sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          metadata: { linked_space_id: linkedSpaceId.trim() || null },
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to save twin link");
      setNotice(linkedSpaceId.trim() ? "Twin space linked." : "Twin link cleared.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={t.card}>
      <p className={t.eyebrow}>Digital Twin layer</p>
      <p className="mt-2 text-xs text-[var(--graphite-muted)]">
        Link a Digital Twin space so share links include layer context and a direct path into Twin 360.
      </p>
      <form onSubmit={saveLink} className="mt-3 flex flex-wrap items-end gap-3">
        <label className="min-w-[240px] flex-1 text-xs text-[var(--graphite-muted)]">
          Linked twin space ID
          <input
            value={linkedSpaceId}
            onChange={(event) => setLinkedSpaceId(event.target.value)}
            className="mt-1 block w-full rounded-xl border border-[var(--mobile-app-card-border)] bg-[#111827] px-3 py-2 text-sm text-white"
            placeholder="digital_twin_space uuid"
          />
        </label>
        <button type="submit" className={t.secondaryButton} disabled={busy}>
          {busy ? "Saving…" : "Save link"}
        </button>
      </form>
      {linkedSpaceId.trim() ? (
        <a
          href={`/digital-twin/twins/${linkedSpaceId.trim()}`}
          className="mt-3 inline-flex text-sm text-[var(--graphite-primary)] hover:underline"
        >
          Open linked twin →
        </a>
      ) : null}
      {linkedSpaceId.trim() ? (
        <button
          type="button"
          className={t.secondaryButton}
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setNotice(null);
            setError(null);
            try {
              const res = await fetch("/api/ops/thermal/jobs", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ session_id: sessionId, job_type: "align" }),
              });
              if (!res.ok) {
                const json = await res.json().catch(() => ({}));
                throw new Error(json.error ?? "Failed to start align");
              }
              setNotice("Twin alignment job started. Watch progress in the gallery.");
            } catch (e) {
              setError(e instanceof Error ? e.message : "Align start failed.");
            } finally {
              setBusy(false);
            }
          }}
        >
          Run twin alignment
        </button>
      ) : null}
      {notice ? <p className="mt-2 text-xs text-[var(--graphite-muted)]">{notice}</p> : null}
      {error ? <p className="mt-2 text-xs text-[#fca5a5]">{error}</p> : null}
    </div>
  );
}
