"use client";

import { useState } from "react";

type ShareRow = {
  id: string;
  token_prefix?: string | null;
  token?: string;
  policy: string;
  is_revoked: boolean;
  expires_at: string | null;
  allow_download?: boolean;
};

type Props = {
  walkthroughId: string;
  status: string;
  shares: ShareRow[];
  chapters?: Array<{ id: string; name: string }>;
  onRefresh: () => void;
  onExport: () => void;
};

export function StudioSharePanel({ walkthroughId, status, shares, chapters = [], onRefresh, onExport }: Props) {
  const [policy, setPolicy] = useState<"client" | "public">("client");
  const [password, setPassword] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [allowDownload, setAllowDownload] = useState(false);
  const [chapterId, setChapterId] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const publish = async () => {
    setBusy(true);
    setMessage(null);
    if (status !== "ready" && status !== "published") {
      await fetch(`/api/spatial-walkthrough/${walkthroughId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "ready" }),
      });
    }
    const res = await fetch(`/api/spatial-walkthrough/${walkthroughId}/share`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        policy,
        password: password || undefined,
        expiresAt: expiresAt || undefined,
        allowDownload,
        chapterId: chapterId || undefined,
      }),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) {
      setMessage(json.error || "Could not create share");
      return;
    }
    setMessage(json.shareUrl);
    onRefresh();
  };

  return (
    <section className="space-y-3 border border-white/10 bg-white/[0.04] p-4">
      <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--graphite-muted)]">Share and policy</p>
      <p className="text-sm text-[var(--graphite-muted)]">
        Members sign in. Guest shares are private links. Public shares are open links. Download and reshare are set per link.
      </p>
      <div className="grid gap-2 sm:grid-cols-3">
        <select value={policy} onChange={(e) => setPolicy(e.target.value as "client" | "public")} className="h-11 min-h-11 border border-white/10 bg-transparent px-2">
          <option value="client">Guest share (private link)</option>
          <option value="public">Public share</option>
        </select>
        <select value={chapterId} onChange={(e) => setChapterId(e.target.value)} className="h-11 min-h-11 border border-white/10 bg-transparent px-2">
          <option value="">Entire Walk</option>
          {chapters.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Optional access code" className="h-11 border border-white/10 bg-transparent px-3" />
        <input type="datetime-local" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} className="h-11 border border-white/10 bg-transparent px-3" />
      </div>
      <label className="flex h-11 items-center gap-2 text-sm">
        <input type="checkbox" checked={allowDownload} onChange={(e) => setAllowDownload(e.target.checked)} />
        Allow downloads (enforced on the file API)
      </label>
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={busy} onClick={() => void publish()} className="h-11 border border-[color-mix(in_srgb,var(--graphite-primary)_40%,transparent)] px-4 text-[var(--graphite-primary)]">
          Publish secure share
        </button>
        <button type="button" onClick={onExport} className="h-11 border border-white/10 px-4 text-sm">
          Export package
        </button>
      </div>
      {message ? <p className="break-all text-sm text-[var(--graphite-text-header)]">{message}</p> : null}
      <ul className="space-y-1 text-sm text-[var(--graphite-muted)]">
        {shares.map((s) => (
          <li key={s.id} className="flex items-center justify-between gap-2">
            <span className="truncate">
              {s.policy === "public" ? "Public share" : "Guest share"} · {s.is_revoked ? "revoked" : "active"} · /w/{s.token_prefix ?? s.token?.slice(0, 8) ?? "••••"}…
            </span>
            {!s.is_revoked ? (
              <button
                type="button"
                className="text-[var(--graphite-primary)]"
                onClick={async () => {
                  await fetch(`/api/spatial-walkthrough/${walkthroughId}/share/${s.id}/revoke`, { method: "POST" });
                  onRefresh();
                }}
              >
                Revoke
              </button>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
