"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Box,
  Check,
  ChevronDown,
  ChevronUp,
  Eye,
  FileText,
  Film,
  Globe,
  Image as ImageIcon,
  Loader2,
  Mic,
  Plus,
  Save,
  Trash2,
  Type as TypeIcon,
} from "lucide-react";
import type { ViewerItem, ViewerItemType } from "@/lib/site-walk/viewer-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Props {
  projectId: string;
  deliverableId: string;
}

type SaveState = "idle" | "saving" | "saved" | "error";

/** Editor rows are the deliverable's ViewerItem content; tolerate legacy narrative
 * blocks ({type:"heading"|"text", content}) by falling back to their `content`. */
type Row = ViewerItem & { content?: string; level?: number };

const TYPE_META: Record<string, { label: string; Icon: typeof ImageIcon }> = {
  photo: { label: "Photo", Icon: ImageIcon },
  photo_360: { label: "360°", Icon: Globe },
  tour_360: { label: "360° tour", Icon: Globe },
  video: { label: "Video", Icon: Film },
  time_lapse: { label: "Time-lapse", Icon: Film },
  voice: { label: "Voice", Icon: Mic },
  note: { label: "Note", Icon: FileText },
  model_3d: { label: "3D model", Icon: Box },
  thermal: { label: "Thermal", Icon: Box },
  heading: { label: "Heading", Icon: TypeIcon },
  text: { label: "Text", Icon: TypeIcon },
};

function metaFor(type: string) {
  return TYPE_META[type] ?? { label: type, Icon: FileText };
}

/**
 * Desktop deliverable/report editor (REPORT-001 phase 2A).
 *
 * Curates the deliverable's real ViewerItem[] content — the same array the
 * /view/[token] share viewer renders. The PM can reorder, caption, remove stops,
 * and add narrative sections; persisted via PATCH /api/site-walk/deliverables/[id].
 * Desktop-optimized two-pane layout (palette rail + wide document), not an app mirror.
 * (Phase 2B: source-library insertion of walk items + templates + auto-assemble.)
 */
export function DeliverableEditorClient({ projectId, deliverableId }: Props) {
  const [title, setTitle] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [preview, setPreview] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [source, setSource] = useState<Row[]>([]);
  const [sourceLoading, setSourceLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "photo" | "photo_360" | "voice" | "note">("all");
  const [query, setQuery] = useState("");
  const loadedRef = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/site-walk/deliverables/${deliverableId}`, { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to load deliverable");
        const body = (await res.json()) as { deliverable?: { title?: string; content?: unknown[] } };
        if (cancelled) return;
        setTitle(body.deliverable?.title ?? "");
        const content = Array.isArray(body.deliverable?.content) ? (body.deliverable!.content as Row[]) : [];
        setRows(content);
      } catch {
        if (!cancelled) setSaveState("error");
      } finally {
        if (!cancelled) {
          setLoading(false);
          loadedRef.current = true;
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [deliverableId]);

  // Source library: the walk's stops, to pull into the deliverable.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/site-walk/deliverables/${deliverableId}/source-items`, { cache: "no-store" });
        const body = (await res.json().catch(() => ({}))) as { items?: Row[] };
        if (!cancelled) setSource(Array.isArray(body.items) ? body.items : []);
      } catch {
        if (!cancelled) setSource([]);
      } finally {
        if (!cancelled) setSourceLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [deliverableId]);

  const persist = useCallback(
    async (nextTitle: string, nextRows: Row[]) => {
      setSaveState("saving");
      try {
        const res = await fetch(`/api/site-walk/deliverables/${deliverableId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: nextTitle.trim() || "Untitled deliverable", content: nextRows }),
        });
        if (!res.ok) throw new Error("save failed");
        setSaveState("saved");
      } catch {
        setSaveState("error");
      }
    },
    [deliverableId],
  );

  useEffect(() => {
    if (!loadedRef.current) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => void persist(title, rows), 1200);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [title, rows, persist]);

  const updateRow = useCallback((id: string, updates: Partial<Row>) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...updates } : r)));
  }, []);

  const removeRow = useCallback((id: string) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const moveRow = useCallback((id: string, dir: -1 | 1) => {
    setRows((prev) => {
      const idx = prev.findIndex((r) => r.id === id);
      const next = idx + dir;
      if (idx < 0 || next < 0 || next >= prev.length) return prev;
      const copy = [...prev];
      [copy[idx], copy[next]] = [copy[next], copy[idx]];
      return copy;
    });
  }, []);

  const addSection = useCallback(() => {
    setRows((prev) => [
      ...prev,
      { id: crypto.randomUUID(), type: "note" as ViewerItemType, title: "Section", notes: "" },
    ]);
  }, []);

  const addItem = useCallback((item: Row) => {
    setRows((prev) => (prev.some((r) => r.id === item.id) ? prev : [...prev, item]));
  }, []);

  const addAll = useCallback(
    (candidates: Row[]) => {
      setRows((prev) => {
        const present = new Set(prev.map((r) => r.id));
        return [...prev, ...candidates.filter((c) => !present.has(c.id))];
      });
    },
    [],
  );

  const presentIds = new Set(rows.map((r) => r.id));
  const candidates = source.filter((s) => !presentIds.has(s.id));
  const q = query.trim().toLowerCase();
  const filteredCandidates = candidates.filter(
    (c) => (filter === "all" || c.type === filter) && (!q || (c.title ?? "").toLowerCase().includes(q)),
  );

  const FILTERS: { key: typeof filter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "photo", label: "Photos" },
    { key: "photo_360", label: "360" },
    { key: "voice", label: "Voice" },
    { key: "note", label: "Notes" },
  ];

  return (
    <div className="flex h-screen flex-col bg-background">
      <header className="flex shrink-0 items-center justify-between border-b border-border bg-background/95 px-5 py-3 backdrop-blur">
        <div className="flex items-center gap-3">
          <Link href={`/projects/${projectId}/deliverables`}>
            <Button variant="ghost" size="icon-sm" aria-label="Back to deliverables">
              <ArrowLeft className="size-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-sm font-semibold">Deliverable editor</h1>
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              {saveState === "saving" && (<><Loader2 className="size-3 animate-spin" /> Saving…</>)}
              {saveState === "saved" && (<><Check className="size-3 text-[var(--graphite-primary)]" /> Saved</>)}
              {saveState === "error" && <span className="text-red-400">Save failed — retrying</span>}
              {saveState === "idle" && "Autosaves as you edit"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setPreview((p) => !p)}>
            <Eye className="size-4" /> {preview ? "Edit" : "Preview"}
          </Button>
          <Button size="sm" onClick={() => void persist(title, rows)} disabled={saveState === "saving"}>
            <Save className="size-4" /> Save
          </Button>
        </div>
      </header>

      {loading ? (
        <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
          <Loader2 className="mr-2 size-4 animate-spin" /> Loading deliverable…
        </div>
      ) : (
        <div className="flex flex-1 overflow-hidden">
          {!preview && (
            <aside className="hidden w-72 shrink-0 flex-col gap-4 overflow-y-auto border-r border-border p-4 lg:flex">
              <div>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Insert</p>
                <Button variant="outline" size="sm" className="w-full justify-start" onClick={addSection}>
                  <Plus className="size-4" /> Section / note
                </Button>
              </div>

              {/* Source library: pull the walk's stops into the deliverable */}
              <div className="flex min-h-0 flex-1 flex-col">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">From this walk</p>
                  {filteredCandidates.length > 0 && (
                    <button type="button" onClick={() => addAll(filteredCandidates)} className="text-[11px] font-semibold text-[var(--graphite-primary)] hover:underline">
                      Add all {filteredCandidates.length}
                    </button>
                  )}
                </div>

                {source.length > 0 && (
                  <>
                    <div className="mb-2 flex flex-wrap gap-1">
                      {FILTERS.map((f) => (
                        <button
                          key={f.key}
                          type="button"
                          onClick={() => setFilter(f.key)}
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            filter === f.key
                              ? "bg-[color-mix(in_srgb,var(--graphite-primary)_18%,transparent)] text-[var(--graphite-primary)]"
                              : "text-muted-foreground hover:bg-muted"
                          }`}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                    <Input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search stops…"
                      className="mb-2 h-8 text-xs"
                    />
                  </>
                )}

                <div className="min-h-0 flex-1 overflow-y-auto">
                  {sourceLoading ? (
                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Loader2 className="size-3 animate-spin" /> Loading stops…</p>
                  ) : source.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No source walk linked, or it has no captured stops.</p>
                  ) : filteredCandidates.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      {candidates.length === 0 ? `All ${source.length} stops are already in this deliverable.` : "No stops match this filter."}
                    </p>
                  ) : (
                    <div className="space-y-1.5">
                      {filteredCandidates.map((c) => {
                        const m = metaFor(c.type);
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => addItem(c)}
                            className="flex w-full items-center gap-2 rounded-lg border border-border p-2 text-left hover:border-[color-mix(in_srgb,var(--graphite-primary)_40%,transparent)] hover:bg-muted/40"
                          >
                            <m.Icon className="size-4 shrink-0 text-muted-foreground" />
                            <span className="min-w-0 flex-1 truncate text-xs text-foreground">{c.title}</span>
                            <Plus className="size-3.5 shrink-0 text-muted-foreground" />
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <p className="text-[11px] text-muted-foreground">{rows.length} item{rows.length === 1 ? "" : "s"} in deliverable</p>
            </aside>
          )}

          <main className="flex-1 overflow-y-auto px-6 py-8">
            <div className="mx-auto max-w-4xl">
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Deliverable title…"
                className="mb-8 border-none bg-transparent p-0 text-3xl font-bold shadow-none placeholder:text-muted-foreground/50 focus-visible:ring-0"
                readOnly={preview}
              />

              {rows.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-20 text-center">
                  <p className="text-sm text-muted-foreground">No items yet.</p>
                  {!preview && (
                    <Button variant="outline" size="sm" className="mt-4" onClick={addSection}>
                      <Plus className="size-4" /> Add a section
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {rows.map((row, i) => {
                    const m = metaFor(row.type);
                    const rowType = row.type as string;
                    const isText = rowType === "note" || rowType === "heading" || rowType === "text";
                    const titleVal = row.title ?? row.content ?? "";
                    const bodyVal = row.notes ?? (isText ? row.content ?? "" : "");
                    const thumb = row.url && (row.type === "photo" || row.type === "photo_360") ? row.url : null;
                    return (
                      <div key={row.id} className="group relative flex items-start gap-2">
                        {!preview && (
                          <div className="flex flex-col gap-0.5 pt-1 opacity-0 transition-opacity group-hover:opacity-100">
                            <button type="button" aria-label="Move up" disabled={i === 0} onClick={() => moveRow(row.id, -1)} className="grid size-6 place-items-center rounded text-muted-foreground hover:bg-muted disabled:opacity-30"><ChevronUp className="size-4" /></button>
                            <button type="button" aria-label="Move down" disabled={i === rows.length - 1} onClick={() => moveRow(row.id, 1)} className="grid size-6 place-items-center rounded text-muted-foreground hover:bg-muted disabled:opacity-30"><ChevronDown className="size-4" /></button>
                            <button type="button" aria-label="Remove" onClick={() => removeRow(row.id)} className="grid size-6 place-items-center rounded text-muted-foreground hover:bg-red-500/10 hover:text-red-400"><Trash2 className="size-4" /></button>
                          </div>
                        )}
                        <div className="flex min-w-0 flex-1 gap-3 rounded-xl border border-border p-3">
                          {/* media thumb or type icon */}
                          <div className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-lg bg-muted text-muted-foreground">
                            {thumb ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={thumb} alt="" className="size-full object-cover" />
                            ) : (
                              <m.Icon className="size-6" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1 space-y-1.5">
                            <span className="inline-block rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{m.label}</span>
                            <Input
                              value={titleVal}
                              onChange={(e) => updateRow(row.id, { title: e.target.value })}
                              readOnly={preview}
                              placeholder={isText ? "Section heading…" : "Caption / title…"}
                              className="h-8 border-none bg-transparent p-0 text-sm font-semibold shadow-none focus-visible:ring-0"
                            />
                            <textarea
                              value={bodyVal}
                              onChange={(e) => updateRow(row.id, { notes: e.target.value })}
                              readOnly={preview}
                              placeholder={isText ? "Write this section…" : "Notes (optional)…"}
                              rows={isText ? 3 : 2}
                              className="w-full resize-none rounded-md bg-transparent text-sm leading-relaxed text-muted-foreground outline-none placeholder:text-muted-foreground/50 focus:text-foreground"
                            />
                            {row.metadata ? (
                              <p className="font-mono text-[10px] text-muted-foreground/80">
                                {[
                                  row.metadata.timestamp ? new Date(row.metadata.timestamp).toLocaleString() : null,
                                  row.metadata.author,
                                  row.metadata.gps ? `${row.metadata.gps.lat.toFixed(5)}, ${row.metadata.gps.lng.toFixed(5)}` : null,
                                ].filter(Boolean).join("  ·  ")}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </main>
        </div>
      )}
    </div>
  );
}
