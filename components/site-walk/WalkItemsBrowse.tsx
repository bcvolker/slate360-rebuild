"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Camera, FileText, Mic, Pencil, Trash2, Loader2, Search, AlertCircle } from "lucide-react";

export type BrowseItem = {
  id: string;
  item_type: string;
  title: string;
  description: string;
  has_photo: boolean;
  item_status: string;
  priority: string | null;
  created_at: string;
};

const STATUS_STYLES: Record<string, string> = {
  open: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  in_progress: "bg-blue-500/15 text-blue-300 border-blue-500/30",
  resolved: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  verified: "bg-emerald-500/25 text-emerald-200 border-emerald-500/40",
  closed: "bg-slate-500/15 text-slate-300 border-slate-500/30",
  na: "bg-slate-500/10 text-slate-400 border-slate-500/20",
};

function TypeIcon({ type }: { type: string }) {
  if (type === "photo") return <Camera className="h-4 w-4" />;
  if (type === "voice_note") return <Mic className="h-4 w-4" />;
  return <FileText className="h-4 w-4" />;
}

export default function WalkItemsBrowse({
  sessionId,
  initialItems,
}: {
  sessionId: string;
  initialItems: BrowseItem[];
}) {
  const [items, setItems] = useState<BrowseItem[]>(initialItems);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "open" | "resolved" | "photos">("all");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((it) => {
      if (filter === "open" && !["open", "in_progress"].includes(it.item_status)) return false;
      if (filter === "resolved" && !["resolved", "verified", "closed"].includes(it.item_status)) return false;
      if (filter === "photos" && it.item_type !== "photo") return false;
      if (!q) return true;
      return (
        (it.title || "").toLowerCase().includes(q) ||
        (it.description || "").toLowerCase().includes(q)
      );
    });
  }, [items, query, filter]);

  async function handleDelete(id: string) {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/site-walk/items/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        setError(j.error ?? "Delete failed");
        return;
      }
      setItems((prev) => prev.filter((it) => it.id !== id));
      setConfirmId(null);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search title or notes…"
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-sm"
          />
        </div>
        <div className="flex gap-1.5">
          {(["all", "open", "resolved", "photos"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`px-3 py-2 text-xs rounded-lg border capitalize transition ${
                filter === f
                  ? "bg-cobalt/15 border-cobalt/40 text-cobalt"
                  : "border-white/10 text-slate-300 hover:border-cobalt/30"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-red-500/40 bg-red-500/10 text-sm text-red-300">
          <AlertCircle className="h-4 w-4" /> {error}
        </div>
      )}

      {filtered.length === 0 ? (
        <p className="text-sm text-slate-500 py-8 text-center">
          {items.length === 0 ? "No items yet — start capturing." : "Nothing matches that filter."}
        </p>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((it) => {
            const detailHref = `/site-walk/walks/active/${sessionId}/items/${it.id}`;
            const annotateHref = `${detailHref}/annotate`;
            const status = it.item_status || "open";
            return (
              <li
                key={it.id}
                className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden hover:border-cobalt/30 transition-colors flex flex-col"
              >
                <Link href={detailHref} className="block aspect-video bg-black relative">
                  {it.has_photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={`/api/site-walk/items/${it.id}/image`}
                      alt={it.title || "capture"}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-600">
                      <TypeIcon type={it.item_type} />
                    </div>
                  )}
                  <span
                    className={`absolute top-2 left-2 text-[10px] px-2 py-0.5 rounded-full border ${
                      STATUS_STYLES[status] ?? STATUS_STYLES.open
                    }`}
                  >
                    {status.replace("_", " ")}
                  </span>
                </Link>

                <div className="p-3 flex-1 flex flex-col gap-2">
                  <Link href={detailHref} className="min-w-0">
                    <p className="text-sm font-medium text-slate-100 truncate">
                      {it.title || `(untitled ${it.item_type.replace("_", " ")})`}
                    </p>
                    {it.description && (
                      <p className="text-xs text-slate-400 line-clamp-2 mt-0.5">{it.description}</p>
                    )}
                    <p className="text-[11px] text-slate-500 mt-1">
                      {new Date(it.created_at).toLocaleString()}
                    </p>
                  </Link>

                  <div className="flex gap-1.5 pt-1 border-t border-white/5 mt-auto">
                    <Link
                      href={annotateHref}
                      className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1.5 text-[11px] rounded-md bg-white/5 hover:bg-white/10 text-slate-200"
                    >
                      <Pencil className="h-3 w-3" /> Edit
                    </Link>
                    {confirmId === it.id ? (
                      <>
                        <button
                          type="button"
                          onClick={() => handleDelete(it.id)}
                          disabled={busyId === it.id}
                          className="px-2 py-1.5 text-[11px] rounded-md bg-red-600 hover:bg-red-500 text-foreground disabled:opacity-50 inline-flex items-center gap-1"
                        >
                          {busyId === it.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Trash2 className="h-3 w-3" />
                          )}
                          Confirm
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmId(null)}
                          className="px-2 py-1.5 text-[11px] rounded-md border border-white/10 text-slate-300 hover:bg-white/5"
                        >
                          No
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setConfirmId(it.id);
                          setError(null);
                        }}
                        className="px-2 py-1.5 text-[11px] rounded-md border border-white/10 text-slate-400 hover:text-red-300 hover:border-red-500/30 inline-flex items-center gap-1"
                        aria-label="Delete item"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
