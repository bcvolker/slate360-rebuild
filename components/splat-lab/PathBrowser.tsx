"use client";

import { useEffect, useState } from "react";
import { ChevronUp, File, Folder, Loader2, Video, X } from "lucide-react";

type Entry = { name: string; path: string; isDir: boolean; kind?: "video" | "image" | "other"; sizeBytes?: number };
type ListResult = { path: string; parent: string | null; entries: Entry[]; roots: string[] };

export function PathBrowser({
  onPick,
  onClose,
}: {
  onPick: (path: string) => void;
  onClose: () => void;
}) {
  const [data, setData] = useState<ListResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);

  const load = (path?: string) => {
    setLoading(true);
    setError(null);
    const url = path ? `/api/splat-lab/fs/list?path=${encodeURIComponent(path)}` : "/api/splat-lab/fs/list";
    fetch(url)
      .then((r) => r.json())
      .then((d: ListResult & { error?: string }) => {
        if (d.error) { setError(d.error); return; }
        setData(d);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const toggleVideo = (path: string) => {
    setSelected((prev) => (prev.includes(path) ? prev.filter((p) => p !== path) : [...prev, path]));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6">
      <div className="flex max-h-[80vh] w-full max-w-xl flex-col rounded-xl border border-white/10 bg-[var(--graphite-canvas)] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--graphite-muted)]">
            Choose a folder or videos
          </p>
          <button onClick={onClose} className="text-[var(--graphite-muted)] hover:text-white">
            <X className="size-4" />
          </button>
        </div>
        <div className="flex items-center gap-2 border-b border-white/10 px-4 py-2 font-mono text-[11px] text-[var(--graphite-muted)]">
          <span className="truncate">{data?.path ?? "…"}</span>
          {data?.parent ? (
            <button onClick={() => load(data.parent!)} className="ml-auto flex items-center gap-1 text-[var(--twin360-blue)]">
              <ChevronUp className="size-3" /> Up
            </button>
          ) : null}
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {loading ? (
            <div className="flex items-center justify-center p-8"><Loader2 className="size-5 animate-spin text-[var(--graphite-muted)]" /></div>
          ) : error ? (
            <p className="p-4 text-xs text-red-400">{error}</p>
          ) : (
            <ul className="space-y-0.5">
              {data?.entries.map((entry) => (
                <li key={entry.path}>
                  {entry.isDir ? (
                    <button
                      onClick={() => load(entry.path)}
                      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-[var(--graphite-text-body)] hover:bg-white/[0.06]"
                    >
                      <Folder className="size-3.5 text-[var(--twin360-blue)]" /> {entry.name}
                    </button>
                  ) : (
                    <button
                      onClick={() => toggleVideo(entry.path)}
                      className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition ${
                        selected.includes(entry.path)
                          ? "bg-[color-mix(in_srgb,var(--twin360-blue)_18%,transparent)] text-white"
                          : "text-[var(--graphite-text-body)] hover:bg-white/[0.06]"
                      }`}
                    >
                      {entry.kind === "video" ? (
                        <Video className="size-3.5 text-[var(--graphite-muted)]" />
                      ) : (
                        <File className="size-3.5 text-[var(--graphite-muted)]" />
                      )}
                      {entry.name}
                      {entry.sizeBytes ? (
                        <span className="ml-auto font-mono text-[10px] text-zinc-600">
                          {(entry.sizeBytes / (1024 * 1024)).toFixed(0)} MB
                        </span>
                      ) : null}
                    </button>
                  )}
                </li>
              ))}
              {data?.entries.length === 0 ? (
                <p className="p-4 text-center text-xs text-[var(--graphite-muted)]">Empty folder.</p>
              ) : null}
            </ul>
          )}
        </div>
        <div className="flex items-center justify-between gap-2 border-t border-white/10 px-4 py-3">
          <p className="font-mono text-[10px] text-[var(--graphite-muted)]">
            {selected.length > 0 ? `${selected.length} file(s) selected` : "Select a folder or one/more video files"}
          </p>
          <button
            onClick={() => onPick(selected.length > 0 ? (data?.path ?? "") : (data?.path ?? ""))}
            disabled={!data}
            className="rounded-md bg-[var(--twin360-blue)] px-3 py-1.5 text-xs font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
          >
            Use this folder
          </button>
        </div>
      </div>
    </div>
  );
}
