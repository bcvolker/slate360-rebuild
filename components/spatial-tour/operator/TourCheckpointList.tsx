"use client";

import { useState } from "react";
import { projectDetailTokens as t } from "@/components/projects/project-detail-tokens";
import { formatClock } from "@/lib/spatial-tour/format";
import type { CheckpointMark, MatchQuality, RouteChapter, RouteCheckpoint } from "@/lib/spatial-tour/types";

const chip = "shrink-0 rounded-lg px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide";
// The shared button tokens have no disabled look; marking buttons are disabled while video loads.
const dis = "disabled:cursor-not-allowed disabled:opacity-40";

function markLabel(mark: CheckpointMark | undefined): { text: string; tone: "set" | "unset" | "warn" } {
  if (!mark) return { text: "Not set", tone: "unset" };
  if (mark.match === "not_captured") return { text: "Not captured", tone: "set" };
  const when = formatClock(mark.tSeconds);
  if (mark.stillStatus === "failed") return { text: `Still failed · ${when}`, tone: "warn" };
  if (mark.stillStatus === "queued") return { text: `Extracting still · ${when}`, tone: "unset" };
  return { text: `${mark.match === "matched" ? "Matched" : "Approximate"} · ${when}`, tone: "set" };
}

export function TourCheckpointList({
  stillUrl,
  chapters,
  checkpoints,
  marks,
  locked,
  busy,
  canMarkFrame,
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
  /** The player has a frame to mark; until then only "Not captured" works. */
  canMarkFrame: boolean;
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

  return (
    <div className="space-y-4" data-testid="tour-checkpoints">
      {!locked && !canMarkFrame ? (
        <p className="text-xs text-[var(--graphite-muted)]" role="status">Marking unlocks once the video has loaded.</p>
      ) : null}
      {live.map((chapter) => {
        const points = checkpoints.filter((c) => c.chapterId === chapter.id && !c.retiredAt);
        return (
          <section key={chapter.id} className={t.sectionCard}>
            <p className={t.eyebrow}>{chapter.name}</p>
            {points.length === 0 ? (
              <p className="mt-2 text-sm text-[var(--graphite-muted)]">No checkpoints yet. Scrub to a spot you will return to on every visit and add one.</p>
            ) : (
              <ul className="mt-2 space-y-2">
                {points.map((cp) => {
                  const mark = byCheckpoint.get(cp.id);
                  const label = markLabel(mark);
                  const hasFrame = mark && mark.match !== "not_captured";
                  return (
                    <li key={cp.id} className="rounded-xl border border-[var(--mobile-app-card-border)] p-3" data-testid="tour-checkpoint">
                      <div className="flex items-start gap-3">
                        {hasFrame && mark.stillStatus === "ready" ? (
                          <button type="button" onClick={() => onSelect(mark)} className="shrink-0" aria-label={`Go to ${cp.label}`}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={stillUrl(mark.id)} alt="" className="h-12 w-24 rounded-lg object-cover" />
                          </button>
                        ) : null}
                        <div className="min-w-0 flex-1">
                          <button
                            type="button"
                            className="block max-w-full truncate text-left text-sm font-semibold text-[var(--graphite-text-header)] disabled:cursor-default"
                            onClick={() => hasFrame && onSelect(mark)}
                            disabled={!hasFrame}
                          >
                            {cp.label}
                          </button>
                          {cp.captureNote ? <p className="truncate text-xs text-[var(--graphite-muted)]">{cp.captureNote}</p> : null}
                          {mark?.stillError ? <p className="text-xs text-[var(--destructive)]">{mark.stillError}</p> : null}
                        </div>
                        <span
                          className={`${chip} ${
                            label.tone === "set"
                              ? "text-[var(--graphite-text-header)]"
                              : label.tone === "warn"
                                ? "text-[var(--destructive)]"
                                : "text-[var(--graphite-muted)]"
                          }`}
                        >
                          {label.text}
                        </span>
                      </div>
                      {locked ? null : (
                        <div className="mt-2 flex flex-wrap gap-2">
                          <button type="button" className={`${t.primaryButton} ${dis}`} disabled={busy || !canMarkFrame} onClick={() => onMark(cp.id, "matched")}>
                            Matched here
                          </button>
                          <button type="button" className={`${t.secondaryButton} ${dis}`} disabled={busy || !canMarkFrame} onClick={() => onMark(cp.id, "same_chapter")}>
                            Approximate
                          </button>
                          <button type="button" className={`${t.secondaryButton} ${dis}`} disabled={busy} onClick={() => onMark(cp.id, "not_captured")}>
                            Not captured
                          </button>
                          <button type="button" className={`${t.secondaryButton} ${dis}`} disabled={busy} onClick={() => onRetire(cp.id)}>
                            Retire
                          </button>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
            {locked ? null : adding?.chapterId === chapter.id ? (
              <form
                className="mt-3 flex flex-wrap gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (adding.label.trim()) onAddCheckpoint(chapter.id, adding.label.trim());
                  setAdding(null);
                }}
              >
                <input
                  autoFocus
                  className="min-h-11 flex-1 rounded-xl border border-[var(--mobile-app-card-border)] bg-transparent px-3 text-sm text-[var(--graphite-text-header)]"
                  placeholder="Checkpoint name, e.g. Corridor at door 104"
                  value={adding.label}
                  onChange={(e) => setAdding({ chapterId: chapter.id, label: e.target.value })}
                />
                <button type="submit" className={`${t.primaryButton} ${dis}`} disabled={busy || !canMarkFrame || !adding.label.trim()}>
                  Add and mark here
                </button>
              </form>
            ) : (
              <button type="button" className={`${t.secondaryButton} mt-3`} onClick={() => setAdding({ chapterId: chapter.id, label: "" })}>
                Add checkpoint
              </button>
            )}
          </section>
        );
      })}
      {locked ? null : (
        <form
          className="flex flex-wrap gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (chapterName.trim()) onAddChapter(chapterName.trim());
            setChapterName("");
          }}
        >
          <input
            className="min-h-11 flex-1 rounded-xl border border-[var(--mobile-app-card-border)] bg-transparent px-3 text-sm text-[var(--graphite-text-header)]"
            placeholder="New chapter, e.g. Level 2 or Exterior"
            value={chapterName}
            onChange={(e) => setChapterName(e.target.value)}
          />
          <button type="submit" className={`${t.secondaryButton} ${dis}`} disabled={busy || !chapterName.trim()}>
            Add chapter
          </button>
        </form>
      )}
    </div>
  );
}
