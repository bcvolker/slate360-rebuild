/**
 * SlateDropActiveLinks — lists the current user's active share links for a file
 * inside the Secure Send dialog, with copy + revoke. Self-contained: fetches on
 * mount and manages its own list state. `refreshKey` re-fetches when a new link
 * is minted by the parent dialog.
 */
"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Copy, Loader2, Trash2 } from "lucide-react";

type ShareLink = {
  id: string;
  token: string;
  role: "view" | "download";
  expiresAt: string | null;
  createdAt: string | null;
};

function expiryLabel(expiresAt: string | null): string {
  if (!expiresAt) return "No expiry";
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return "Expired";
  const days = Math.round(ms / (24 * 60 * 60 * 1000));
  if (days >= 1) return `Expires in ${days} day${days === 1 ? "" : "s"}`;
  const hours = Math.max(1, Math.round(ms / (60 * 60 * 1000)));
  return `Expires in ${hours} hour${hours === 1 ? "" : "s"}`;
}

export default function SlateDropActiveLinks({ fileId, refreshKey }: { fileId: string; refreshKey: number }) {
  const [links, setLinks] = useState<ShareLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/slatedrop/links?fileId=${encodeURIComponent(fileId)}`);
      const data = await res.json().catch(() => ({}));
      setLinks(res.ok && Array.isArray(data.links) ? data.links : []);
    } catch {
      setLinks([]);
    } finally {
      setLoading(false);
    }
  }, [fileId]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  const copy = async (token: string) => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/share/${token}`);
      setCopiedToken(token);
      setTimeout(() => setCopiedToken((current) => (current === token ? null : current)), 1500);
    } catch {
      // ignore — clipboard may be blocked
    }
  };

  const revoke = async (token: string) => {
    setRevoking(token);
    try {
      const res = await fetch("/api/slatedrop/links", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      if (res.ok) setLinks((current) => current.filter((link) => link.token !== token));
    } catch {
      // ignore
    } finally {
      setRevoking(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-1 py-3 text-xs text-[var(--graphite-muted)]">
        <Loader2 size={13} className="animate-spin" /> Loading active links…
      </div>
    );
  }

  if (links.length === 0) return null;

  return (
    <div className="pt-1">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--graphite-muted)]">
        Active links · {links.length}
      </p>
      <ul className="space-y-1.5">
        {links.map((link) => (
          <li
            key={link.id}
            className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2"
          >
            <span className="min-w-0 flex-1">
              <span className="block text-xs font-medium text-[var(--graphite-text-body)]">
                {link.role === "download" ? "View & download" : "View only"}
              </span>
              <span className="block text-[10px] text-[var(--graphite-muted)]">{expiryLabel(link.expiresAt)}</span>
            </span>
            <button
              type="button"
              onClick={() => copy(link.token)}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--graphite-muted)] hover:bg-white/[0.06] hover:text-[var(--graphite-text-body)]"
              aria-label="Copy link"
            >
              {copiedToken === link.token ? <Check size={13} className="text-[var(--graphite-primary)]" /> : <Copy size={13} />}
            </button>
            <button
              type="button"
              onClick={() => revoke(link.token)}
              disabled={revoking === link.token}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-red-400 hover:bg-red-500/10 disabled:opacity-50"
              aria-label="Revoke link"
            >
              {revoking === link.token ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
