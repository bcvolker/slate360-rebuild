"use client";

import { useState } from "react";
import type { OperatorPatch } from "@/lib/spatial-walkthrough/types";

type ShareRow = {
  id: string;
  token: string;
  policy: string;
  is_revoked: boolean;
  expires_at: string | null;
};

type Props = {
  walkthroughId: string;
  status: string;
  operatorPatch: OperatorPatch;
  shares: ShareRow[];
  onRefresh: () => void;
};

export function StudioSharePanel({ walkthroughId, status, operatorPatch, shares, onRefresh }: Props) {
  const [policy, setPolicy] = useState<"client" | "public">("client");
  const [password, setPassword] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
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
      body: JSON.stringify({ policy, password: password || undefined, expiresAt: expiresAt || undefined }),
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

  const savePatch = async () => {
    await fetch(`/api/spatial-walkthrough/${walkthroughId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ operatorPatch }),
    });
  };

  return (
    <section className="space-y-3 border border-white/10 bg-white/[0.04] p-4">
      <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--graphite-muted)]">Share and policy</p>
      <p className="text-sm text-[var(--graphite-muted)]">
        Members sign in. Guest shares are private links. Public shares are open links.
      </p>
      <div className="grid gap-2 sm:grid-cols-3">
        <select value={policy} onChange={(e) => setPolicy(e.target.value as "client" | "public")} className="h-11 border border-white/10 bg-transparent px-2">
          <option value="client">Guest share (private link)</option>
          <option value="public">Public share</option>
        </select>
        <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Optional access code" className="h-11 border border-white/10 bg-transparent px-3" />
        <input type="datetime-local" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} className="h-11 border border-white/10 bg-transparent px-3" />
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={busy} onClick={() => void publish()} className="h-11 border border-[color-mix(in_srgb,var(--graphite-primary)_40%,transparent)] px-4 text-[var(--graphite-primary)]">
          Publish secure share
        </button>
        <a href={`/api/spatial-walkthrough/${walkthroughId}/export`} className="inline-flex h-11 items-center border border-white/10 px-4 text-sm">
          Export package
        </a>
        <button type="button" onClick={() => void savePatch()} className="h-11 border border-white/10 px-4 text-sm">
          Save operator patch
        </button>
      </div>
      {message ? <p className="break-all text-sm text-[var(--graphite-text-header)]">{message}</p> : null}
      <ul className="space-y-1 text-sm text-[var(--graphite-muted)]">
        {shares.map((s) => (
          <li key={s.id} className="flex items-center justify-between gap-2">
            <span className="truncate">{s.policy === "public" ? "Public share" : "Guest share"} · {s.is_revoked ? "revoked" : "active"} · /w/{s.token.slice(0, 8)}…</span>
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
