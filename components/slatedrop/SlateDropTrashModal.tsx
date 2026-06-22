"use client";

import { useCallback, useEffect, useState } from "react";
import { X, RotateCcw, Trash2, Loader2 } from "lucide-react";

type DeletedFile = { id: string; name: string; size: number; type: string; deletedAt: string | null };

type Props = {
  /** Scopes the deleted list to a single folder (matches the listing/zip model). */
  folderId: string;
  onClose: () => void;
  /** Called after a successful restore so the caller can refresh its file list. */
  onRestored: () => void;
  formatBytes: (n: number) => string;
};

const DAY_MS = 24 * 60 * 60 * 1000;

export default function SlateDropTrashModal({ folderId, onClose, onRestored, formatBytes }: Props) {
  const [files, setFiles] = useState<DeletedFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/slatedrop/deleted?folderId=${encodeURIComponent(folderId)}`, { cache: "no-store" });
      if (!res.ok) throw new Error();
      const data = (await res.json()) as { files: DeletedFile[] };
      setFiles(data.files ?? []);
    } catch {
      setError("Couldn't load deleted files.");
    } finally {
      setLoading(false);
    }
  }, [folderId]);

  useEffect(() => { void load(); }, [load]);

  const restore = async (id: string) => {
    setRestoringId(id);
    try {
      const res = await fetch("/api/slatedrop/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId: id }),
      });
      if (!res.ok) throw new Error();
      setFiles((prev) => prev.filter((f) => f.id !== id));
      onRestored();
    } catch {
      setError("Couldn't restore that file.");
    } finally {
      setRestoringId(null);
    }
  };

  const daysLeft = (deletedAt: string | null) => {
    if (!deletedAt) return null;
    const left = 30 - Math.floor((Date.now() - new Date(deletedAt).getTime()) / DAY_MS);
    return left > 0 ? left : 0;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative flex max-h-[80vh] w-full max-w-lg flex-col rounded-2xl border border-app bg-app-card shadow-xl">
        <div className="flex items-center justify-between border-b border-app px-5 py-4">
          <div className="flex items-center gap-2">
            <Trash2 size={16} className="text-[var(--graphite-muted)]" />
            <h2 className="text-base font-bold text-foreground">Recently deleted</h2>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-[var(--graphite-muted)] transition hover:bg-white/[0.04]"><X size={16} /></button>
        </div>
        <p className="px-5 pt-3 text-xs text-[var(--graphite-muted)]">Files are recoverable for 30 days after deletion.</p>
        <div className="flex-1 overflow-y-auto px-5 py-3">
          {loading ? (
            <div className="flex items-center justify-center py-10 text-[var(--graphite-muted)]"><Loader2 size={18} className="animate-spin" /></div>
          ) : error ? (
            <p className="py-10 text-center text-sm text-red-400">{error}</p>
          ) : files.length === 0 ? (
            <p className="py-10 text-center text-sm text-[var(--graphite-muted)]">Nothing here. Deleted files in this folder appear for 30 days.</p>
          ) : (
            <ul className="space-y-1.5">
              {files.map((f) => {
                const left = daysLeft(f.deletedAt);
                return (
                  <li key={f.id} className="flex items-center gap-3 rounded-lg border border-app px-3 py-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-[var(--graphite-text-body)]">{f.name}</p>
                      <p className="text-[11px] text-[var(--graphite-muted)]">{formatBytes(f.size)}{left !== null ? ` · ${left} day${left === 1 ? "" : "s"} left` : ""}</p>
                    </div>
                    <button
                      onClick={() => void restore(f.id)}
                      disabled={restoringId === f.id}
                      className="flex items-center gap-1.5 rounded-lg border border-app px-2.5 py-1.5 text-xs font-semibold text-[var(--graphite-text-body)] transition hover:bg-white/[0.04] disabled:opacity-50"
                    >
                      {restoringId === f.id ? <Loader2 size={12} className="animate-spin" /> : <RotateCcw size={12} />} Restore
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
