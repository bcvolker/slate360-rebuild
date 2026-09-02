"use client";

import { useState } from "react";
import { X, Copy, Check } from "lucide-react";
import { projectDetailTokens as t } from "@/components/projects/project-detail-tokens";

type CreateResponse = { portalUrl: string; expiresAt: string | null };

/**
 * Creator-side "Invite client" flow. Mints a project-level portal share
 * (server-side, hashed token) and shows the link once — matching the
 * spatial-walkthrough share-token pattern, where the raw secret is never
 * persisted in the client or re-fetchable after creation.
 */
export function SharePortalDialog({ projectId, onClose }: { projectId: string; onClose: () => void }) {
  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [password, setPassword] = useState("");
  const [allowDownload, setAllowDownload] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CreateResponse | null>(null);
  const [copied, setCopied] = useState(false);

  async function create() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientName: recipientName || null,
          recipientEmail: recipientEmail || null,
          password: password || null,
          allowDownload,
        }),
      });
      if (!res.ok) throw new Error("Could not create the portal link");
      setResult(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create the portal link");
    } finally {
      setBusy(false);
    }
  }

  function copyLink() {
    if (!result) return;
    navigator.clipboard?.writeText(result.portalUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true" aria-label="Share client portal">
      <div className={`${t.sectionCard} w-full max-w-md`}>
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-[var(--graphite-text-header)]">Share client portal</p>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded p-1 text-[var(--graphite-muted)] hover:text-[var(--graphite-text-header)]">
            <X className="h-4 w-4" />
          </button>
        </div>

        {result ? (
          <div className="mt-4 space-y-3">
            <p className="text-sm text-[var(--graphite-muted)]">
              Link created. This is the only time the full link is shown — copy it now.
            </p>
            <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2.5">
              <code className="min-w-0 flex-1 truncate text-xs text-[var(--graphite-text-header)]">{result.portalUrl}</code>
              <button type="button" onClick={copyLink} className="shrink-0 rounded p-1.5 text-[var(--graphite-primary)] hover:bg-white/10" aria-label="Copy link">
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
            <button type="button" onClick={onClose} className={`${t.primaryButton} w-full`}>
              Done
            </button>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            <label className="block text-sm">
              <span className="text-xs font-medium text-[var(--graphite-muted)]">Client name (optional)</span>
              <input
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-[var(--graphite-text-header)] outline-none focus:border-[var(--graphite-primary)]"
                placeholder="Jane Doe, Owner"
              />
            </label>
            <label className="block text-sm">
              <span className="text-xs font-medium text-[var(--graphite-muted)]">Client email (optional)</span>
              <input
                type="email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                className="mt-1 w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-[var(--graphite-text-header)] outline-none focus:border-[var(--graphite-primary)]"
                placeholder="jane@owner.com"
              />
            </label>
            <label className="block text-sm">
              <span className="text-xs font-medium text-[var(--graphite-muted)]">Access code (optional)</span>
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-[var(--graphite-text-header)] outline-none focus:border-[var(--graphite-primary)]"
                placeholder="Leave blank for no password"
              />
            </label>
            <label className="flex min-h-11 items-center gap-2 text-sm text-[var(--graphite-text-header)]">
              <input type="checkbox" checked={allowDownload} onChange={(e) => setAllowDownload(e.target.checked)} className="h-4 w-4 rounded border-white/20" />
              Allow the client to download media
            </label>
            {error ? <p className="text-sm text-red-400">{error}</p> : null}
            <button type="button" onClick={create} disabled={busy} className={`${t.primaryButton} w-full disabled:opacity-60`}>
              {busy ? "Creating…" : "Create portal link"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
