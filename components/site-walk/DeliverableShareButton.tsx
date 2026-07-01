"use client";

import { useCallback, useState } from "react";
import { Share2, Check, Loader2 } from "lucide-react";

/**
 * One-tap "Publish & Share" for the mobile deliverables surface — closes the gap where a
 * phone-only user could generate a deliverable but had no way to mint a public link and send it
 * (publish/send previously lived only in the desktop project tab). Mints (or reuses) a public
 * share token via POST /api/site-walk/deliverables/[id]/share, then opens the native share sheet
 * with the PUBLIC /share/deliverable/[token] URL (falls back to clipboard copy).
 */
export function DeliverableShareButton({
  deliverableId,
  initialToken,
}: {
  deliverableId: string;
  initialToken: string | null;
}) {
  const [token, setToken] = useState<string | null>(initialToken);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const shareLink = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      let t = token;
      if (!t) {
        const res = await fetch(`/api/site-walk/deliverables/${deliverableId}/share`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "{}",
        });
        if (!res.ok) throw new Error("share failed");
        const data = (await res.json()) as { share_token?: string };
        if (!data.share_token) throw new Error("no token");
        t = data.share_token;
        setToken(t);
      }
      const url = `${window.location.origin}/share/deliverable/${t}`;
      if (navigator.share) {
        await navigator.share({ title: "Slate360 deliverable", url });
      } else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      // Non-fatal — leave the button usable for a retry.
    } finally {
      setBusy(false);
    }
  }, [busy, token, deliverableId]);

  return (
    <button
      type="button"
      onClick={shareLink}
      disabled={busy}
      className="inline-flex min-h-[44px] items-center gap-1.5 rounded-2xl bg-[color-mix(in_srgb,var(--graphite-primary)_16%,transparent)] px-3 text-sm font-black text-[var(--graphite-primary)] transition-colors hover:bg-[color-mix(in_srgb,var(--graphite-primary)_26%,transparent)] disabled:opacity-60"
      title={token ? "Share public link" : "Publish & share a public link"}
    >
      {busy ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
      ) : copied ? (
        <Check className="h-4 w-4" aria-hidden />
      ) : (
        <Share2 className="h-4 w-4" aria-hidden />
      )}
      {copied ? "Copied" : token ? "Share" : "Publish"}
    </button>
  );
}
