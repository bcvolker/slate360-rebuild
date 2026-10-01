"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { projectDetailTokens as t } from "@/components/projects/project-detail-tokens";

type Row = { id: string; label: string; included: boolean; ready: boolean; note: string };
type PanelData = { enabled: boolean; canPreview?: boolean; deliverables?: Row[] };

/**
 * Operator panel: which deliverables this project's client portal includes. Renders
 * nothing unless packaging is enabled for the org and the viewer can author.
 */
export function ClientPortalPanel({ projectId }: { projectId: string }) {
  const [data, setData] = useState<PanelData | null>(null);
  const [chosen, setChosen] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/projects/${projectId}/portal-package`, { cache: "no-store" });
    if (!res.ok) return setData(null);
    const json = (await res.json()) as PanelData;
    setData(json);
    setChosen(new Set((json.deliverables ?? []).filter((d) => d.included).map((d) => d.id)));
  }, [projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  const saved = useMemo(
    () => new Set((data?.deliverables ?? []).filter((d) => d.included).map((d) => d.id)),
    [data],
  );
  const dirty = saved.size !== chosen.size || [...chosen].some((id) => !saved.has(id));

  if (!data?.enabled || !data.deliverables) return null;

  const toggle = (id: string) => {
    setMessage(null);
    setChosen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const save = async () => {
    setSaving(true);
    const res = await fetch(`/api/projects/${projectId}/portal-package`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deliverables: [...chosen] }),
    });
    setSaving(false);
    if (!res.ok) return setMessage("Could not save. Try again.");
    setMessage("Saved. The client portal updates on the next page load.");
    await load();
  };

  const preview = async () => {
    // Open synchronously so the browser treats it as a user action, then point it at the token.
    const tab = window.open("about:blank", "_blank");
    const res = await fetch(`/api/projects/${projectId}/portal-preview`, { method: "POST" });
    const json = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
    if (!res.ok || !json.url) {
      tab?.close();
      return setMessage(json.error || "Could not open a preview.");
    }
    if (tab) tab.location.href = json.url;
    else window.location.href = json.url;
  };

  return (
    <section className={t.sectionCard} data-testid="client-portal-panel">
      <p className={t.eyebrow}>Client portal</p>
      <p className="mt-2 text-sm text-[var(--graphite-muted)]">
        Check what this client bought. Anything still waiting stays hidden from them until it is ready.
      </p>
      <ul className="mt-3 space-y-1">
        {data.deliverables.map((row) => (
          <li key={row.id}>
            <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl px-3 py-2 hover:bg-[color-mix(in_srgb,var(--graphite-primary)_6%,transparent)]">
              <input
                type="checkbox"
                className="h-5 w-5 shrink-0 accent-[var(--graphite-primary)]"
                checked={chosen.has(row.id)}
                onChange={() => toggle(row.id)}
                aria-label={`${row.label}: included for this client`}
                data-testid={`portal-deliverable-${row.id}`}
              />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-[var(--graphite-text-header)]">{row.label}</span>
                <span className="block text-xs text-[var(--graphite-muted)]">{row.note}</span>
              </span>
              {/* Readiness is separate from "sold": a checked row that is waiting is not broken. */}
              <span
                className={`shrink-0 rounded-lg px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide ${
                  row.ready ? "text-[var(--graphite-text-header)] ring-1 ring-inset ring-[var(--mobile-app-card-border)]" : "text-[var(--graphite-muted)]"
                }`}
                data-testid={`portal-readiness-${row.id}`}
              >
                {row.ready ? "Ready" : "Waiting"}
              </span>
            </label>
          </li>
        ))}
      </ul>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {dirty ? (
          <button type="button" className={t.primaryButton} onClick={save} disabled={saving} data-testid="portal-package-save">
            {saving ? "Saving…" : "Save"}
          </button>
        ) : null}
        {dirty ? null : data.canPreview ? (
          <button type="button" className={t.secondaryButton} onClick={preview} data-testid="portal-preview">
            Preview as client
          </button>
        ) : (
          <p className="text-xs text-[var(--graphite-muted)]">Preview opens once a walkthrough is ready to share.</p>
        )}
      </div>
      {message ? <p className="mt-3 text-xs text-[var(--graphite-muted)]" role="status">{message}</p> : null}
    </section>
  );
}
