"use client";

import { useState } from "react";
import { CHAPTER_TYPES, orderedChapters, type ChapterRecord, type ChapterType } from "@/lib/spatial-walkthrough/chapters";
import type { ClipSummary } from "@/lib/spatial-walkthrough/clip-edges";

type Mark = { start: number | null; end: number | null; yaw: number; pitch: number };

type Props = {
  walkthroughId: string;
  clip: ClipSummary | null;
  chapters: ChapterRecord[];
  mark: Mark;
  onRefresh: () => void;
  onClearMark: () => void;
};

export function StudioChapterPanel({ walkthroughId, clip, chapters, mark, onRefresh, onClearMark }: Props) {
  const [name, setName] = useState("");
  const [type, setType] = useState<ChapterType>("other");
  const [floor, setFloor] = useState("");
  const [zone, setZone] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const list = orderedChapters(chapters);

  const save = async (startTime: number, endTime: number, yaw: number, pitch: number) => {
    if (!clip || !name.trim()) return;
    await fetch(`/api/spatial-walkthrough/${walkthroughId}/chapters`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clipId: clip.id,
        name: name.trim(),
        chapterType: type,
        floor: floor || null,
        zone: zone || null,
        startTime,
        endTime,
        defaultYaw: yaw,
        defaultPitch: pitch,
      }),
    });
    setName("");
    onClearMark();
    onRefresh();
  };

  return (
    <section className="space-y-3 border border-white/10 bg-white/[0.04] p-4">
      <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--graphite-muted)]">Spaces / chapters</p>
      <p className="text-sm text-[var(--graphite-muted)]">
        Logical ranges on the source clip. Deleting a space does not delete the capture or project files.
      </p>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name (Lobby, Level 1…)" className="h-11 border border-white/10 bg-transparent px-3" />
        <select value={type} onChange={(e) => setType(e.target.value as ChapterType)} className="h-11 border border-white/10 bg-transparent px-2">
          {CHAPTER_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <input value={floor} onChange={(e) => setFloor(e.target.value)} placeholder="Floor" className="h-11 border border-white/10 bg-transparent px-3" />
        <input value={zone} onChange={(e) => setZone(e.target.value)} placeholder="Room / zone" className="h-11 border border-white/10 bg-transparent px-3" />
        <input value={start} onChange={(e) => setStart(e.target.value)} placeholder="Start (s)" className="h-11 border border-white/10 bg-transparent px-3" />
        <input value={end} onChange={(e) => setEnd(e.target.value)} placeholder="End (s)" className="h-11 border border-white/10 bg-transparent px-3" />
        <button
          type="button"
          className="h-11 border border-[color-mix(in_srgb,var(--graphite-primary)_40%,transparent)] px-3 text-[var(--graphite-primary)]"
          onClick={() => void save(Number(start), Number(end), 0, 0)}
        >
          Add from timestamps
        </button>
        <button
          type="button"
          className="h-11 border border-white/10 px-3 text-sm"
          disabled={mark.start == null || mark.end == null}
          onClick={() => {
            if (mark.start == null || mark.end == null) return;
            void save(mark.start, mark.end, mark.yaw, mark.pitch);
          }}
        >
          Save marked range
        </button>
      </div>
      {mark.start != null ? (
        <p className="text-sm text-[var(--graphite-muted)]">
          Marked {mark.start.toFixed(1)}s{mark.end != null ? ` → ${mark.end.toFixed(1)}s` : " (set end)"}
        </p>
      ) : null}
      <ul className="space-y-2">
        {list.map((c, i) => (
          <li key={c.id} className="flex flex-wrap items-center gap-2 border border-white/10 px-3 py-2 text-sm">
            <input
              defaultValue={c.name}
              className="h-10 min-w-[8rem] flex-1 bg-transparent"
              onBlur={(e) => {
                const next = e.target.value.trim();
                if (!next || next === c.name) return;
                void fetch(`/api/spatial-walkthrough/${walkthroughId}/chapters`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ id: c.id, name: next }),
                }).then(onRefresh);
              }}
            />
            <span className="font-mono text-[11px] text-[var(--graphite-muted)]">
              {c.startTime.toFixed(0)}–{c.endTime.toFixed(0)}s · {c.chapterType}
            </span>
            <button
              type="button"
              className="text-sm"
              disabled={i === 0}
              onClick={() => {
                const ids = list.map((x) => x.id);
                [ids[i - 1], ids[i]] = [ids[i], ids[i - 1]];
                void fetch(`/api/spatial-walkthrough/${walkthroughId}/chapters`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ order: ids }),
                }).then(onRefresh);
              }}
            >
              Up
            </button>
            <button
              type="button"
              className="text-[var(--graphite-primary)]"
              onClick={() => {
                void fetch(`/api/spatial-walkthrough/${walkthroughId}/chapters`, {
                  method: "DELETE",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ id: c.id }),
                }).then(onRefresh);
              }}
            >
              Delete space
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
