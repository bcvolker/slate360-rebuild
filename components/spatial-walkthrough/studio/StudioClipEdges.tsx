"use client";

import { useState } from "react";
import type { ClipEdgeRecord, ClipSummary, TransitionType } from "@/lib/spatial-walkthrough/clip-edges";
import { TRANSITION_TYPES } from "@/lib/spatial-walkthrough/clip-edges";

type Props = {
  walkthroughId: string;
  clips: ClipSummary[];
  edges: ClipEdgeRecord[];
  onRefresh: () => void;
};

export function StudioClipEdges({ walkthroughId, clips, edges, onRefresh }: Props) {
  const [source, setSource] = useState(clips[0]?.id ?? "");
  const [dest, setDest] = useState(clips[1]?.id ?? "");
  const [kind, setKind] = useState<TransitionType>("manual");
  if (clips.length < 2) return null;

  return (
    <section className="space-y-3 border border-white/10 bg-white/[0.04] p-4">
      <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--graphite-muted)]">Clip transitions</p>
      <p className="text-sm text-[var(--graphite-muted)]">Entire Walk follows these edges. Same-clip doorways do not cut.</p>
      <div className="grid gap-2 sm:grid-cols-4">
        <select value={source} onChange={(e) => setSource(e.target.value)} className="h-11 border border-white/10 bg-transparent px-2">
          {clips.map((c) => <option key={c.id} value={c.id}>{c.title ?? c.id}</option>)}
        </select>
        <select value={dest} onChange={(e) => setDest(e.target.value)} className="h-11 border border-white/10 bg-transparent px-2">
          {clips.map((c) => <option key={c.id} value={c.id}>{c.title ?? c.id}</option>)}
        </select>
        <select value={kind} onChange={(e) => setKind(e.target.value as TransitionType)} className="h-11 border border-white/10 bg-transparent px-2">
          {TRANSITION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <button
          type="button"
          className="h-11 border border-white/10 px-3 text-sm"
          onClick={() => {
            void fetch(`/api/spatial-walkthrough/${walkthroughId}/edges`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ sourceClipId: source, destClipId: dest, transitionType: kind, sourceEndpoint: "end", destEndpoint: "start" }),
            }).then(onRefresh);
          }}
        >
          Add edge
        </button>
      </div>
      <ul className="space-y-1 text-sm text-[var(--graphite-muted)]">
        {edges.map((e) => (
          <li key={e.id} className="flex items-center justify-between gap-2">
            <span>{e.transitionType} · {e.sourceClipId.slice(0, 6)} → {e.destClipId.slice(0, 6)}</span>
            <button
              type="button"
              onClick={() => {
                void fetch(`/api/spatial-walkthrough/${walkthroughId}/edges`, {
                  method: "DELETE",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ id: e.id }),
                }).then(onRefresh);
              }}
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
