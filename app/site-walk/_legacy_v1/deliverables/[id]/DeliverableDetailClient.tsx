"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, Share2, Copy, CheckCircle2, ExternalLink, Ban, Mail } from "lucide-react";
import SendEmailModal from "./SendEmailModal";

type Item = {
  id: string;
  type: string;
  title?: string;
  notes?: string;
  mediaItemId?: string;
};

type Deliverable = {
  id: string;
  title: string;
  status: string;
  deliverable_type: string;
  content: unknown;
  share_token: string | null;
  share_revoked: boolean | null;
  session_id: string;
};

export default function DeliverableDetailClient({ deliverable }: { deliverable: Deliverable }) {
  const [title, setTitle] = useState(deliverable.title);
  const [savingTitle, setSavingTitle] = useState(false);
  const [shareToken, setShareToken] = useState<string | null>(
    deliverable.share_revoked ? null : deliverable.share_token,
  );
  const [sharing, setSharing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showEmail, setShowEmail] = useState(false);

  const items: Item[] = Array.isArray(deliverable.content) ? (deliverable.content as Item[]) : [];
  const hasPhotos = items.some((it) => it.type === "photo" && it.mediaItemId);
  const shareUrl = shareToken
    ? (typeof window !== "undefined" ? `${window.location.origin}/view/${shareToken}` : `/view/${shareToken}`)
    : null;

  async function saveTitle() {
    if (!title.trim() || title === deliverable.title) return;
    setSavingTitle(true);
    try {
      await fetch(`/api/site-walk/deliverables/${deliverable.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim() }),
      });
    } finally {
      setSavingTitle(false);
    }
  }

  async function share() {
    setSharing(true);
    setError(null);
    try {
      const res = await fetch(`/api/site-walk/deliverables/${deliverable.id}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      const j = await res.json();
      if (!res.ok || !j.share_token) {
        setError(j.error ?? "Share failed");
        return;
      }
      setShareToken(j.share_token);
    } finally {
      setSharing(false);
    }
  }

  async function revoke() {
    if (!confirm("Revoke this share link? Anyone with the URL will lose access.")) return;
    setError(null);
    const res = await fetch(`/api/site-walk/deliverables/${deliverable.id}/revoke`, { method: "POST" });
    if (!res.ok) {
      const j = await res.json();
      setError(j.error ?? "Revoke failed");
      return;
    }
    setShareToken(null);
  }

  async function copyShare() {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function nativeShare() {
    if (!shareUrl || typeof navigator === "undefined" || !navigator.share) return copyShare();
    try {
      await navigator.share({ title, url: shareUrl });
    } catch {/* user cancelled */}
  }

  return (
    <div className="space-y-5">
      <div>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={saveTitle}
          className="w-full bg-transparent text-xl font-semibold border-b border-transparent hover:border-white/10 focus:border-cobalt outline-none"
        />
        <div className="text-xs text-slate-500 mt-1 capitalize">
          {deliverable.deliverable_type.replace("_", " ")} · {deliverable.status}
          {savingTitle && <span className="ml-2"><Loader2 className="inline h-3 w-3 animate-spin" /></span>}
        </div>
      </div>

      <section className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <Share2 className="h-4 w-4 text-cobalt" /> Share
        </h2>
        {shareToken ? (
          <>
            <div className="flex items-center gap-2 text-xs">
              <code className="flex-1 px-2 py-1.5 bg-slate-950 border border-white/10 rounded truncate">{shareUrl}</code>
              <button onClick={copyShare} className="p-1.5 rounded border border-white/10 hover:bg-white/5" title="Copy">
                {copied ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
              <a href={shareUrl ?? "#"} target="_blank" rel="noreferrer" className="p-1.5 rounded border border-white/10 hover:bg-white/5" title="Open">
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
            <div className="flex gap-2">
              <button onClick={nativeShare} className="flex-1 py-2 rounded-lg bg-cobalt hover:bg-cobalt-hover text-primary-foreground text-sm font-medium flex items-center justify-center gap-2">
                <Share2 className="h-4 w-4" /> Share — AirDrop, Contacts, Apps
              </button>
              <button onClick={revoke} className="px-3 py-2 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 text-sm flex items-center gap-1.5" title="Revoke">
                <Ban className="h-4 w-4" /> Revoke
              </button>
            </div>
            <button
              onClick={() => setShowEmail(true)}
              className="w-full py-2 rounded-lg border border-cobalt/30 text-cobalt hover:bg-cobalt/10 text-sm font-medium flex items-center justify-center gap-2"
            >
              <Mail className="h-4 w-4" /> Send by email
            </button>
          </>
        ) : (
          <button onClick={share} disabled={sharing} className="w-full py-2 rounded-lg bg-cobalt hover:bg-cobalt-hover disabled:opacity-50 text-primary-foreground text-sm font-medium flex items-center justify-center gap-2">
            {sharing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
            Generate share link
          </button>
        )}
        {error && <p className="text-xs text-red-400">{error}</p>}
      </section>

      <section>
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
          Items in this deliverable ({items.length})
        </h2>
        {items.length === 0 ? (
          <p className="text-sm text-slate-500">
            No items captured. <Link href={`/site-walk/walks/active/${deliverable.session_id}`} className="text-cobalt">Add captures →</Link>
          </p>
        ) : (
          <ul className="space-y-2">
            {items.map((it, i) => (
              <li key={`${it.id}-${i}`} className="p-3 rounded-lg border border-white/10 bg-white/[0.02]">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-100 truncate">{it.title || `(${it.type})`}</span>
                  <span className="text-xs text-slate-500 capitalize">{it.type}</span>
                </div>
                {it.notes && <p className="text-xs text-slate-400 mt-1 line-clamp-2">{it.notes}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>

      {showEmail && shareToken && (
        <SendEmailModal
          deliverableId={deliverable.id}
          deliverableTitle={title}
          hasPhotos={hasPhotos}
          onClose={() => setShowEmail(false)}
        />
      )}
    </div>
  );
}
