"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, ChevronDown, ChevronUp, Eye, Loader2, Save, Trash2 } from "lucide-react";
import type { EditorBlock, BlockType } from "@/lib/types/blocks";
import { createBlock } from "@/lib/types/blocks";
import { BlockToolbar } from "../BlockToolbar";
import { BlockRenderer } from "../BlockRenderer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Props {
  projectId: string;
  deliverableId: string;
}

type SaveState = "idle" | "saving" | "saved" | "error";

/**
 * Desktop deliverable/report editor (REPORT-001 phase 1).
 *
 * Lives under Projects → Deliverables → edit. Wires real block CRUD + reorder on
 * the shared EditorBlock model and persists via PATCH /api/site-walk/deliverables/[id]
 * — the same `content` array the /view/[token] share viewer and PDF export consume.
 * Desktop-optimized two-pane layout (palette rail + wide document), not an app mirror.
 */
export function DeliverableEditorClient({ projectId, deliverableId }: Props) {
  const [title, setTitle] = useState("");
  const [blocks, setBlocks] = useState<EditorBlock[]>([]);
  const [preview, setPreview] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const loadedRef = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load the deliverable once.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/site-walk/deliverables/${deliverableId}`, { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to load deliverable");
        const body = (await res.json()) as { deliverable?: { title?: string; content?: unknown[] } };
        if (cancelled) return;
        setTitle(body.deliverable?.title ?? "");
        const content = Array.isArray(body.deliverable?.content) ? (body.deliverable!.content as EditorBlock[]) : [];
        setBlocks(content);
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

  const persist = useCallback(
    async (nextTitle: string, nextBlocks: EditorBlock[]) => {
      setSaveState("saving");
      try {
        const res = await fetch(`/api/site-walk/deliverables/${deliverableId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: nextTitle.trim() || "Untitled deliverable", content: nextBlocks }),
        });
        if (!res.ok) throw new Error("save failed");
        setSaveState("saved");
      } catch {
        setSaveState("error");
      }
    },
    [deliverableId],
  );

  // Debounced autosave after the first load.
  useEffect(() => {
    if (!loadedRef.current) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => void persist(title, blocks), 1200);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [title, blocks, persist]);

  const addBlock = useCallback((type: BlockType) => {
    setBlocks((prev) => [...prev, createBlock(type)]);
  }, []);

  const updateBlock = useCallback((id: string, updates: Partial<EditorBlock>) => {
    setBlocks((prev) => prev.map((b) => (b.id === id ? ({ ...b, ...updates } as EditorBlock) : b)));
  }, []);

  const deleteBlock = useCallback((id: string) => {
    setBlocks((prev) => prev.filter((b) => b.id !== id));
  }, []);

  const moveBlock = useCallback((id: string, dir: -1 | 1) => {
    setBlocks((prev) => {
      const idx = prev.findIndex((b) => b.id === id);
      const next = idx + dir;
      if (idx < 0 || next < 0 || next >= prev.length) return prev;
      const copy = [...prev];
      [copy[idx], copy[next]] = [copy[next], copy[idx]];
      return copy;
    });
  }, []);

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Top bar */}
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
            <Eye className="size-4" />
            {preview ? "Edit" : "Preview"}
          </Button>
          <Button size="sm" onClick={() => void persist(title, blocks)} disabled={saveState === "saving"}>
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
          {/* Left rail: block palette (desktop-optimized — fills the width, no dead column) */}
          {!preview && (
            <aside className="hidden w-72 shrink-0 flex-col gap-4 overflow-y-auto border-r border-border p-4 lg:flex">
              <div>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                  Add a block
                </p>
                <BlockToolbar onAddBlock={addBlock} />
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Blocks save to this deliverable&apos;s shared content — the same data the web share
                link and PDF export render. Drag-reorder, templates, and source-library insertion
                are coming in the next phase; use the ↑ ↓ controls to reorder for now.
              </p>
            </aside>
          )}

          {/* Document canvas: wide, centered, no big side gaps */}
          <main className="flex-1 overflow-y-auto px-6 py-8">
            <div className="mx-auto max-w-4xl">
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Deliverable title…"
                className="mb-8 border-none bg-transparent p-0 text-3xl font-bold shadow-none placeholder:text-muted-foreground/50 focus-visible:ring-0"
                readOnly={preview}
              />

              {blocks.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-20 text-center">
                  <p className="text-sm text-muted-foreground">No blocks yet. Add one to get started.</p>
                  {!preview && (
                    <div className="mt-4">
                      <BlockToolbar onAddBlock={addBlock} />
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {blocks.map((block, i) => (
                    <div key={block.id} className="group relative flex items-start gap-2">
                      {!preview && (
                        <div className="flex flex-col gap-0.5 pt-1 opacity-0 transition-opacity group-hover:opacity-100">
                          <button
                            type="button"
                            aria-label="Move up"
                            disabled={i === 0}
                            onClick={() => moveBlock(block.id, -1)}
                            className="grid size-6 place-items-center rounded text-muted-foreground hover:bg-muted disabled:opacity-30"
                          >
                            <ChevronUp className="size-4" />
                          </button>
                          <button
                            type="button"
                            aria-label="Move down"
                            disabled={i === blocks.length - 1}
                            onClick={() => moveBlock(block.id, 1)}
                            className="grid size-6 place-items-center rounded text-muted-foreground hover:bg-muted disabled:opacity-30"
                          >
                            <ChevronDown className="size-4" />
                          </button>
                          <button
                            type="button"
                            aria-label="Delete block"
                            onClick={() => deleteBlock(block.id)}
                            className="grid size-6 place-items-center rounded text-muted-foreground hover:bg-red-500/10 hover:text-red-400"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <BlockRenderer block={block} onUpdate={updateBlock} onDelete={deleteBlock} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </main>
        </div>
      )}
    </div>
  );
}
