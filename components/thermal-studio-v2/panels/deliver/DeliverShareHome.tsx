"use client";

import { useEffect, useState } from "react";
import { createShareLink, listShareLinks, revokeShareLink, type ShareLink } from "@/components/thermal-studio-v2/lib/deliver-api";

/** Share link section — saved-deliverables home (existing links) + a compact composer (doc §1, Tab 5). */
export function DeliverShareHome({ sessionId }: { sessionId: string }) {
  const [links, setLinks] = useState<ShareLink[]>([]);
  const [role, setRole] = useState<"view" | "annotate" | "download">("view");
  const [label, setLabel] = useState("");
  const [password, setPassword] = useState("");
  const [creating, setCreating] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  function refresh() {
    void listShareLinks(sessionId).then(setLinks);
  }
  useEffect(refresh, [sessionId]);

  async function create() {
    setCreating(true);
    const result = await createShareLink(sessionId, { role, label: label || undefined, password: password || null });
    setStatus(result.message);
    setCreating(false);
    if (result.ok) {
      setLabel("");
      setPassword("");
      refresh();
    }
  }

  async function revoke(token: string) {
    if (await revokeShareLink(token)) refresh();
  }

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto">
      <div className="flex flex-col gap-2 rounded-md border border-[var(--mobile-app-card-border)] p-3">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--graphite-muted)]">New link</span>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as typeof role)}
            title="What the client can do with this link"
            className="rounded-md border border-[var(--mobile-app-card-border)] bg-transparent px-2 py-1 text-xs text-[var(--graphite-text-header)]"
          >
            <option value="view">View only</option>
            <option value="annotate">View + annotate</option>
            <option value="download">View + download</option>
          </select>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Label (optional)"
            className="min-w-0 flex-1 rounded-md border border-[var(--mobile-app-card-border)] bg-transparent px-2 py-1 text-xs text-[var(--graphite-text-header)]"
          />
        </div>
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password (optional)"
          type="password"
          className="rounded-md border border-[var(--mobile-app-card-border)] bg-transparent px-2 py-1 text-xs text-[var(--graphite-text-header)]"
        />
        <button
          type="button"
          disabled={creating}
          onClick={() => void create()}
          className="self-start rounded-md border border-[var(--mobile-app-card-border)] px-2 py-1.5 text-xs font-semibold text-[var(--graphite-text-header)] hover:border-[var(--graphite-primary)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {creating ? "Creating…" : "Create link"}
        </button>
        {status ? <span className="text-[11px] text-[var(--graphite-muted)]">{status}</span> : null}
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--graphite-muted)]">Saved links ({links.length})</span>
        {links.length === 0 ? (
          <p className="text-xs text-[var(--graphite-muted)]">No share links yet — create one above.</p>
        ) : (
          links.map((l) => (
            <div key={l.id} className="flex flex-col gap-1 rounded-md border border-[var(--mobile-app-card-border)] p-2 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate font-semibold text-[var(--graphite-text-header)]">{l.label || l.role}</span>
                <span className={l.is_revoked ? "text-red-400" : "text-[var(--graphite-muted)]"}>{l.is_revoked ? "Revoked" : l.role}</span>
              </div>
              <a href={l.url} target="_blank" rel="noreferrer" className="truncate text-[var(--graphite-primary)] underline">
                {l.url}
              </a>
              <div className="flex items-center justify-between text-[10px] text-[var(--graphite-muted)]">
                <span>{l.view_count} view{l.view_count === 1 ? "" : "s"}</span>
                {!l.is_revoked ? (
                  <button type="button" onClick={() => void revoke(l.token)} className="text-red-400 underline">
                    Revoke
                  </button>
                ) : null}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
