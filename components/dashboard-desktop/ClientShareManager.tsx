"use client";

import { useCallback, useEffect, useState } from "react";
import { Copy, Link2, X } from "lucide-react";

export type ShareLink = {
  id: string;
  label: string | null;
  token_prefix?: string | null;
  is_revoked: boolean;
  expires_at: string | null;
  view_count?: number;
  last_viewed_at?: string | null;
  created_at?: string;
  has_password?: boolean;
};

type Props = {
  projectId: string;
  walkthroughId: string;
  chapterTitle: string;
  defaultLabel: string;
  onClose: () => void;
  /** Preview harness only: skip the network and keep links in memory. */
  mock?: boolean;
};

function when(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const field = "h-11 w-full rounded-lg border border-[var(--mkt-line)] bg-[var(--mkt-surface)] px-3 text-sm text-[var(--mkt-ink)] placeholder:text-[var(--mkt-ink-muted)] focus:border-[var(--mkt-accent-line)] focus:outline-none";

/**
 * Contractor-facing controlled links for one chapter: create (access code,
 * expiry), copy, see views, revoke. Recipients land on the view-only viewer.
 */
export function ClientShareManager({ projectId, walkthroughId, chapterTitle, defaultLabel, onClose, mock }: Props) {
  const [links, setLinks] = useState<ShareLink[]>([]);
  const [label, setLabel] = useState(defaultLabel);
  const [code, setCode] = useState("");
  const [expires, setExpires] = useState("");
  const [created, setCreated] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    if (mock) return;
    const res = await fetch(`/api/spatial-walkthrough/shares?projectId=${encodeURIComponent(projectId)}`);
    if (!res.ok) return;
    const json = (await res.json()) as { shares?: Array<ShareLink & { walkthrough_id: string }> };
    setLinks((json.shares ?? []).filter((s) => s.walkthrough_id === walkthroughId));
  }, [mock, projectId, walkthroughId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const create = async () => {
    setBusy(true);
    setError(null);
    setCreated(null);
    if (mock) {
      const id = String(Date.now());
      setLinks((l) => [{ id, label, is_revoked: false, expires_at: expires || null, view_count: 0, created_at: new Date().toISOString(), has_password: Boolean(code), token_prefix: "demo" }, ...l]);
      setCreated(`https://www.slate360.ai/w/demo-${id.slice(-4)}`);
      setCode("");
      setBusy(false);
      return;
    }
    const res = await fetch(`/api/spatial-walkthrough/${walkthroughId}/share`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        policy: "client",
        label,
        password: code || undefined,
        expiresAt: expires ? new Date(expires).toISOString() : undefined,
      }),
    });
    const json = (await res.json().catch(() => ({}))) as { shareUrl?: string; error?: string };
    setBusy(false);
    if (!res.ok || !json.shareUrl) {
      setError(json.error ?? "Could not create the link.");
      return;
    }
    setCreated(json.shareUrl);
    setCode("");
    void refresh();
  };

  const revoke = async (id: string) => {
    if (mock) {
      setLinks((l) => l.map((s) => (s.id === id ? { ...s, is_revoked: true } : s)));
      return;
    }
    await fetch(`/api/spatial-walkthrough/${walkthroughId}/share/${id}/revoke`, { method: "POST" });
    void refresh();
  };

  const copy = async () => {
    if (!created) return;
    try {
      await navigator.clipboard.writeText(created);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable — the URL is visible to select */
    }
  };

  const active = links.filter((l) => !l.is_revoked);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[var(--mkt-ink)]/30 sm:items-center" onClick={onClose}>
      <div
        role="dialog"
        aria-label={`Share ${chapterTitle}`}
        className="max-h-[90dvh] w-full overflow-y-auto rounded-t-2xl border border-[var(--mkt-line)] bg-[var(--mkt-canvas)] p-5 sm:max-w-lg sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--mkt-ink-muted)]">Share</p>
            <h2 className="text-lg font-semibold text-[var(--mkt-ink)]">{chapterTitle}</h2>
            <p className="mt-1 text-sm text-[var(--mkt-ink-muted)]">
              Anyone with the link can look around, call out a spot, and ask questions. They can&rsquo;t change anything or see the rest of the project.
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[var(--mkt-ink-muted)] hover:text-[var(--mkt-ink)]">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-col gap-2">
          <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Who is this for? (e.g. Owner's rep)" className={field} />
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Access code (optional)" className={field} autoComplete="off" />
            <input type="date" value={expires} onChange={(e) => setExpires(e.target.value)} aria-label="Expires on" className={field} />
          </div>
          <button type="button" disabled={busy} onClick={() => void create()} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[var(--mkt-accent)] px-4 text-sm font-semibold text-white disabled:opacity-60">
            <Link2 className="h-4 w-4" aria-hidden /> Create link
          </button>
          {error ? <p className="text-sm text-[var(--mkt-ink)]">{error}</p> : null}
          {created ? (
            <div className="flex items-center gap-2 rounded-lg border border-[var(--mkt-accent-line)] bg-[var(--mkt-accent-soft)] px-3 py-2">
              <span className="min-w-0 flex-1 truncate text-sm text-[var(--mkt-ink)]">{created}</span>
              <button type="button" onClick={() => void copy()} className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md bg-[var(--mkt-surface)] px-2.5 text-xs font-semibold text-[var(--mkt-accent)]">
                <Copy className="h-3.5 w-3.5" aria-hidden /> {copied ? "Copied" : "Copy"}
              </button>
            </div>
          ) : null}
        </div>

        {active.length > 0 ? (
          <div className="mt-5">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--mkt-ink-muted)]">Active links</p>
            <ul className="flex flex-col gap-1.5">
              {active.map((l) => (
                <li key={l.id} className="flex min-h-12 items-center justify-between gap-3 rounded-lg border border-[var(--mkt-line)] bg-[var(--mkt-surface)] px-3 py-2">
                  <span className="min-w-0">
                    <span className="block truncate text-sm text-[var(--mkt-ink)]">{l.label || "Link"}</span>
                    <span className="block text-xs text-[var(--mkt-ink-muted)]">
                      {l.view_count ?? 0} view{(l.view_count ?? 0) === 1 ? "" : "s"}
                      {l.last_viewed_at ? ` · last ${when(l.last_viewed_at)}` : ""}
                      {l.has_password ? " · access code" : ""}
                      {l.expires_at ? ` · until ${when(l.expires_at)}` : ""}
                    </span>
                  </span>
                  <button type="button" onClick={() => void revoke(l.id)} className="shrink-0 text-xs font-semibold text-[var(--mkt-ink-muted)] hover:text-[var(--mkt-ink)]">
                    Turn off
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  );
}
