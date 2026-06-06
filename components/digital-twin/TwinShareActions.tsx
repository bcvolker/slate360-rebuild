"use client";

import { useCallback, useState } from "react";
import { IconBan, IconCheck, IconLink, IconLoader2 } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { twinAccent } from "@/lib/digital-twin/twin-accent";

export type TwinShareRole = "view" | "annotate" | "download";

const ROLE_OPTIONS: { id: TwinShareRole; label: string; hint: string }[] = [
  { id: "view", label: "View only", hint: "Interactive viewer" },
  { id: "annotate", label: "Annotate", hint: "Pins, comments, measure" },
  { id: "download", label: "Download", hint: "Viewer + model file" },
];

type Props = {
  spaceId: string;
  className?: string;
};

export function TwinShareActions({ spaceId, className }: Props) {
  const [role, setRole] = useState<TwinShareRole>("view");
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
        body: JSON.stringify({ space_id: spaceId, role }),
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
  }, [role, spaceId]);

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
    <div className={cn("flex flex-col gap-2", className)}>
      <fieldset className="flex flex-wrap gap-2">
        <legend className="sr-only">Share role</legend>
        {ROLE_OPTIONS.map((option) => {
          const active = role === option.id;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => setRole(option.id)}
              className={cn(
                "min-h-10 rounded-xl border px-3 py-2 text-left text-xs transition-colors",
                active ? twinAccent.button : "border-white/10 text-zinc-400 hover:text-zinc-200",
              )}
            >
              <span className="block font-semibold">{option.label}</span>
              <span className="block text-[10px] opacity-80">{option.hint}</span>
            </button>
          );
        })}
      </fieldset>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => void createAndCopy()}
          disabled={busy !== null}
          className={cn(twinAccent.button, "inline-flex items-center gap-1.5")}
        >
          {busy === "create" ? (
            <IconLoader2 className="size-3.5 animate-spin" stroke={1.75} />
          ) : copied ? (
            <IconCheck className="size-3.5" stroke={1.75} />
          ) : (
            <IconLink className="size-3.5" stroke={1.75} />
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
              <IconLoader2 className="size-3.5 animate-spin" stroke={1.75} />
            ) : (
              <IconBan className="size-3.5" stroke={1.75} />
            )}
            Revoke link
          </button>
        ) : null}
      </div>

      {revoked ? <p className="text-xs text-zinc-400">Share link revoked.</p> : null}
      {error ? <p className="text-xs text-red-300">{error}</p> : null}
    </div>
  );
}
