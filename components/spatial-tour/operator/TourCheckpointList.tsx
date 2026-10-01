"use client";

import { useState } from "react";
import { formatClock } from "@/lib/spatial-tour/format";
import type { CheckpointMark, MatchQuality, RouteChapter, RouteCheckpoint } from "@/lib/spatial-tour/types";

// Dense operator controls (desktop tool): 36px buttons, one row per checkpoint.
const btn =
  "inline-flex h-8 items-center rounded-lg border border-[var(--mobile-app-card-border)] px-2 text-[11px] font-semibold text-[var(--graphite-text-body)] transition-colors hover:border-[color-mix(in_srgb,var(--graphite-primary)_40%,transparent)] disabled:cursor-not-allowed disabled:opacity-40";
const input =
  "h-9 min-w-0 flex-1 rounded-lg border border-[var(--mobile-app-card-border)] bg-transparent px-2.5 text-sm text-[var(--graphite-text-header)]";

function markLabel(mark: CheckpointMark | undefined): { text: string; tone: "set" | "unset" | "warn" } {
  if (!mark) return { text: "Not set", tone: "unset" };
  if (mark.match === "not_captured") return { text: "Not captured", tone: "set" };
  const when = formatClock(mark.tSeconds);
  if (mark.stillStatus === "failed") return { text: `Still failed · ${when}`, tone: "warn" };
  if (mark.stillStatus === "queued") return { text: `Extracting still · ${when}`, tone: "unset" };
  return { text: `${mark.match === "matched" ? "Matched" : "Approximate"} · ${when}`, tone: "set" };
}

const toneClass = { set: "text-[var(--graphite-text-header)]", warn: "text-[var(--destructive)]", unset: "text-[var(--graphite-muted)]" };

export function TourCheckpointList({
  stillUrl,
  chapters,
  checkpoints,
  marks,
  locked,
  busy,
  markBlocked,
  onMark,
  onSelect,
  onAddCheckpoint,
  onAddChapter,
  onRetire,
}: {
  stillUrl: (markId: string) => string;
  chapters: RouteChapter[];
  checkpoints: RouteCheckpoint[];
  /** Marks for the selected visit only. */
  marks: CheckpointMark[];
  /** Published visits can't be edited until unpublished. */
  locked: boolean;
  busy: boolean;
  /** Why marking is not possible yet (no frame, no published view); null when it is. */
  markBlocked: string | null;
  onMark: (checkpointId: string, match: MatchQuality) => void;
  onSelect: (mark: CheckpointMark) => void;
  onAddCheckpoint: (chapterId: string, label: string) => void;
  onAddChapter: (name: string) => void;
  onRetire: (checkpointId: string) => void;
}) {
  const [adding, setAdding] = useState<{ chapterId: string; label: string } | null>(null);
  const [chapterName, setChapterName] = useState("");
  const byCheckpoint = new Map(marks.map((m) => [m.checkpointId, m]));
  const live = chapters.filter((c) => !c.retiredAt);
  const active = checkpoints.filter((c) => !c.retiredAt);
  const resolved = active.filter((c) => byCheckpoint.has(c.id)).length;
  const blocked = Boolean(markBlocked);

  return (
    <section
      className="flex flex-col overflow-hidden rounded-2xl border border-[var(--mobile-app-card-border)] bg-[color-mix(in_srgb,var(--graphite-canvas)_76%,transparent)] lg:min-h-0"
      data-testid="tour-checkpoints"
    >
      <header className="flex items-center justify-between gap-2 border-b border-[var(--mobile-app-card-border)] px-4 py-2.5">
        <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--graphite-muted)]">Checkpoints</p>
        <span className="font-mono text-[11px] tabular-nums text-[var(--graphite-muted)]">
          {resolved}/{active.length} set
        </span>
      </header>
      {!locked && markBlocked ? (
        <p className="border-b border-[var(--mobile-app-card-border)] px-4 py-2 text-xs text-[var(--graphite-muted)]" role="status">
          {markBlocked}
        </p>
      ) : null}
      <div className="lg:min-h-0 lg:flex-1 lg:overflow-y-auto" data-testid="tour-checkpoint-scroll">
        {live.map((chapter) => {
          const points = active.filter((c) => c.chapterId === chapter.id);
          return (
            <div key={chapter.id}>
              <p className="sticky top-0 z-10 border-b border-[var(--mobile-app-card-border)] bg-[var(--graphite-canvas)] px-4 py-1.5 text-xs font-semibold text-[var(--graphite-text-header)]">
                {chapter.name}
                <span className="ml-2 font-normal text-[var(--graphite-muted)]">{points.length}</span>
              </p>
              <ul>
                {points.map((cp) => {
                  const mark = byCheckpoint.get(cp.id);
                  const label = markLabel(mark);
                  const hasFrame = Boolean(mark && mark.match !== "not_captured");
                  return (
                    <li key={cp.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-[var(--mobile-app-card-border)] px-4 py-2" data-testid="tour-checkpoint">
                      <button
                        type="button"
                        className="h-9 w-16 shrink-0 overflow-hidden rounded-md border border-[var(--mobile-app-card-border)] disabled:cursor-default"
                        disabled={!hasFrame}
                        onClick={() => mark && hasFrame && onSelect(mark)}
                        aria-label={hasFrame ? `Go to ${cp.label}` : `${cp.label}: no still yet`}
                      >
                        {hasFrame && mark?.stillStatus === "ready" ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={stillUrl(mark.id)} alt="" className="h-full w-full object-cover" />
                        ) : null}
                      </button>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-[var(--graphite-text-header)]" title={cp.label}>{cp.label}</p>
                        <p className="flex min-w-0 items-center gap-2">
                          <span className={`truncate font-mono text-[10px] uppercase tracking-wide ${toneClass[label.tone]}`} title={mark?.stillError ?? label.text}>
                            {mark?.stillError ? `${label.text} · ${mark.stillError}` : label.text}
                          </span>
                          {locked ? null : (
                            <button
                              type="button"
                              className="shrink-0 text-[10px] font-semibold text-[var(--graphite-muted)] underline-offset-2 hover:text-[var(--graphite-text-header)] hover:underline disabled:opacity-40"
                              disabled={busy}
                              onClick={() => onRetire(cp.id)}
                              aria-label={`Retire ${cp.label}`}
                            >
                              Retire
                            </button>
                          )}
                        </p>
                      </div>
                      {locked ? null : (
                        <div className="flex shrink-0 gap-1.5">
                          <button type="button" className={`${btn} text-[var(--graphite-primary)]`} disabled={busy || blocked} onClick={() => onMark(cp.id, "matched")}>
                            Match here
                          </button>
                          <button type="button" className={btn} disabled={busy || blocked} onClick={() => onMark(cp.id, "same_chapter")}>
                            Approx.
                          </button>
                          <button type="button" className={btn} disabled={busy || blocked} onClick={() => onMark(cp.id, "not_captured")}>
                            Not captured
                          </button>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
              {locked ? null : adding?.chapterId === chapter.id ? (
                <form
                  className="flex gap-2 border-b border-[var(--mobile-app-card-border)] px-4 py-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (adding.label.trim()) onAddCheckpoint(chapter.id, adding.label.trim());
                    setAdding(null);
                  }}
                >
                  <input
                    autoFocus
                    className={input}
                    placeholder="Checkpoint name, e.g. Corridor at door 104"
                    value={adding.label}
                    onChange={(e) => setAdding({ chapterId: chapter.id, label: e.target.value })}
                  />
                  <button type="submit" className={`${btn} text-[var(--graphite-primary)]`} disabled={busy || blocked || !adding.label.trim()}>
                    Add and mark here
                  </button>
                </form>
              ) : (
                <button
                  type="button"
                  className="w-full border-b border-[var(--mobile-app-card-border)] px-4 py-2 text-left text-xs font-semibold text-[var(--graphite-muted)] hover:text-[var(--graphite-text-header)]"
                  onClick={() => setAdding({ chapterId: chapter.id, label: "" })}
                >
                  + Add checkpoint to {chapter.name}
                </button>
              )}
            </div>
          );
        })}
        {active.length === 0 ? (
          <p className="px-4 py-3 text-sm text-[var(--graphite-muted)]">
            No checkpoints yet. Scrub to a spot you will return to on every visit and add one.
          </p>
        ) : null}
      </div>
      {locked ? null : (
        <form
          className="flex gap-2 border-t border-[var(--mobile-app-card-border)] px-4 py-2.5"
          onSubmit={(e) => {
            e.preventDefault();
            if (chapterName.trim()) onAddChapter(chapterName.trim());
            setChapterName("");
          }}
        >
          <input
            className={input}
            placeholder="New chapter, e.g. Level 2 or Exterior"
            value={chapterName}
            onChange={(e) => setChapterName(e.target.value)}
            aria-label="New chapter name"
          />
          <button type="submit" className={btn} disabled={busy || !chapterName.trim()}>
            Add chapter
          </button>
        </form>
      )}
    </section>
  );
}
