"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Download, Loader2, RefreshCw } from "lucide-react";
import { twinAccent } from "@/lib/digital-twin/twin-accent";

type BakeState = {
  status: "baking" | "ready" | "failed";
  error?: string;
  stats?: { splatsKept?: number; splatsTotal?: number };
} | null;

/**
 * E1 — the Model (.spz) export with bake awareness. Downloads serve the baked
 * file only when it matches the CURRENT edit_list; otherwise this control
 * offers to (re)bake so the client never receives a file that differs from
 * the cleaned share view.
 */
export function BakeExportControl({ modelId }: { modelId: string }) {
  const [bake, setBake] = useState<BakeState>(null);
  const [fresh, setFresh] = useState(false);
  const [editCount, setEditCount] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<number | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/digital-twin/models/${modelId}/bake`);
    if (!res.ok) return;
    const data = (await res.json()) as {
      bake: BakeState;
      fresh: boolean;
      editCount: number;
    };
    setBake(data.bake);
    setFresh(data.fresh);
    setEditCount(data.editCount);
  }, [modelId]);

  useEffect(() => {
    void load();
  }, [load]);

  // Poll while a bake is running; stop on terminal state.
  useEffect(() => {
    if (bake?.status !== "baking") {
      if (pollRef.current) window.clearInterval(pollRef.current);
      pollRef.current = null;
      return;
    }
    pollRef.current = window.setInterval(() => void load(), 5000);
    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
      pollRef.current = null;
    };
  }, [bake?.status, load]);

  const dispatch = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/digital-twin/models/${modelId}/bake`, { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not start bake");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start bake");
    } finally {
      setBusy(false);
    }
  }, [modelId, load]);

  const needsBake = editCount > 0 && !fresh;
  const href = `/api/digital-twin/models/${modelId}/splat${fresh ? "?baked=1" : ""}`;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <a
        href={href}
        download
        className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold ${twinAccent.cardHover} border-white/10 text-zinc-200`}
      >
        <Download className="size-3.5" aria-hidden /> Model (.spz)
        {fresh ? <span className="text-[10px] font-normal text-[var(--graphite-muted)]">· cleaned</span> : null}
      </a>
      {bake?.status === "baking" ? (
        <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-[10px] font-semibold text-[var(--graphite-muted)]">
          <Loader2 className="size-3 animate-spin" aria-hidden /> Baking edits…
        </span>
      ) : needsBake ? (
        <button
          type="button"
          onClick={() => void dispatch()}
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--accent-border-blue)] px-3 py-2 text-xs font-semibold text-[var(--twin360-blue)] disabled:opacity-50"
        >
          {busy ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : <RefreshCw className="size-3.5" aria-hidden />}
          Bake {editCount} edit{editCount === 1 ? "" : "s"} into download
        </button>
      ) : null}
      {needsBake ? (
        <p className="w-full text-[10px] leading-relaxed text-[var(--graphite-muted)]">
          This model has unbaked edits — the download currently contains the ORIGINAL
          (uncleaned) file until you bake.
        </p>
      ) : null}
      {bake?.status === "failed" ? (
        <p className="w-full text-[10px] text-red-300">Bake failed: {bake.error ?? "unknown error"}</p>
      ) : null}
      {error ? <p className="w-full text-[10px] text-red-300">{error}</p> : null}
    </div>
  );
}
