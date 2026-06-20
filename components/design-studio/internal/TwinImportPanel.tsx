"use client";

import { useEffect, useState } from "react";
import { Loader2, X } from "lucide-react";
import type { DesignSession } from "@/lib/design-studio/internal-types";
import type { ImportableTwin } from "@/lib/design-studio/internal-queries";

/** Lists ready Digital Twins and imports the chosen one into a new session. */
export function TwinImportPanel({
  onImported,
  onClose,
}: {
  onImported: (session: DesignSession) => void;
  onClose: () => void;
}) {
  const [twins, setTwins] = useState<ImportableTwin[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/design-studio/twins")
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setTwins(d.twins ?? []);
      })
      .catch(() => {
        if (!cancelled) setError("Failed to load twins");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function importTwin(t: ImportableTwin) {
    setBusyId(t.id);
    setError(null);
    try {
      const res = await fetch("/api/design-studio/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ twinModelId: t.id, projectId: t.project_id, title: t.title }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Import failed");
      onImported(data.session as DesignSession);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="rounded-md border border-white/10 bg-white/[0.03] p-2">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[11px] font-medium text-slate-300">Choose a twin</span>
        <button onClick={onClose} className="text-slate-500 hover:text-slate-300">
          <X className="size-3.5" />
        </button>
      </div>
      {error && <p className="mb-1 text-[11px] text-red-400">{error}</p>}
      {twins === null ? (
        <div className="flex items-center gap-2 py-2 text-[11px] text-slate-500">
          <Loader2 className="size-3 animate-spin" /> Loading…
        </div>
      ) : twins.length === 0 ? (
        <p className="py-1 text-[11px] text-slate-500">No ready twins found.</p>
      ) : (
        <ul className="flex max-h-48 flex-col gap-1 overflow-y-auto">
          {twins.map((t) => (
            <li key={t.id}>
              <button
                disabled={busyId !== null}
                onClick={() => importTwin(t)}
                className="flex w-full items-center justify-between gap-2 rounded px-2 py-1.5 text-left text-[11px] text-slate-300 hover:bg-white/5 disabled:opacity-50"
              >
                <span className="min-w-0 truncate">{t.title}</span>
                {busyId === t.id ? (
                  <Loader2 className="size-3 shrink-0 animate-spin" />
                ) : (
                  <span className="shrink-0 text-slate-600">{t.model_format}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
