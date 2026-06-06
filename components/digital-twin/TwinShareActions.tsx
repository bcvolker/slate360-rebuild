"use client";

import { useCallback, useState } from "react";
import { Check, Link2, Loader2, Ban } from "lucide-react";
import { cn } from "@/lib/utils";
import { twinAccent } from "@/lib/digital-twin/twin-accent";

type Props = {
  spaceId: string;
  className?: string;
};

export function TwinShareActions({ spaceId, className }: Props) {
  const [token, setToken] = useState<string | null>(null);
  const [busy, setBusy] = useState<"create" | "revoke" | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revoked, setRevoked] = useState(false);

  const createAndCopy = useCallback(async () => {
    setBusy("create");
    setError(null);
    setRevoked(false);
    setCopied(false);

    try {
      const res = await fetch("/api/digital-twin/share/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ space_id: spaceId, role: "view" }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        share_url?: string;
        token?: string;
        error?: string;
      };

      if (!res.ok || !data.share_url || !data.token) {
        throw new Error(data.error ?? "Could not create share link");
      }

      setToken(data.token);
      await navigator.clipboard.writeText(data.share_url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Share failed");
    } finally {
      setBusy(null);
    }
  }, [spaceId]);

  const revokeLink = useCallback(async () => {
    if (!token) return;
    setBusy("revoke");
    setError(null);

    try {
      const res = await fetch("/api/digital-twin/share/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not revoke link");

      setRevoked(true);
      setToken(null);
      setCopied(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Revoke failed");
    } finally {
      setBusy(null);
    }
  }, [token]);

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <button
        type="button"
        onClick={() => void createAndCopy()}
        disabled={busy !== null}
        className={cn(twinAccent.button, "inline-flex items-center gap-1.5")}
      >
        {busy === "create" ? (
          <Loader2 className="size-3.5 animate-spin" aria-hidden />
        ) : copied ? (
          <Check className="size-3.5" aria-hidden />
        ) : (
          <Link2 className="size-3.5" aria-hidden />
        )}
        {copied ? "Link copied" : "Copy share link"}
      </button>

      {token && !revoked ? (
        <button
          type="button"
          onClick={() => void revokeLink()}
          disabled={busy !== null}
          className={cn(twinAccent.buttonDanger, "inline-flex items-center gap-1.5")}
        >
          {busy === "revoke" ? (
            <Loader2 className="size-3.5 animate-spin" aria-hidden />
          ) : (
            <Ban className="size-3.5" aria-hidden />
          )}
          Revoke link
        </button>
      ) : null}

      {revoked ? <p className="text-xs text-zinc-400">Share link revoked.</p> : null}
      {error ? <p className="text-xs text-red-300">{error}</p> : null}
    </div>
  );
}
