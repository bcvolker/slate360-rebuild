"use client";

import type { ChapterRecord } from "@/lib/spatial-walkthrough/chapters";
import type { NarrationSegment, TranscriptPhrase } from "@/lib/spatial-walkthrough/audio";
import { chapterAtTime } from "@/lib/spatial-walkthrough/chapters";

type Props = {
  visible: boolean;
  segment: NarrationSegment | null;
  chapter: ChapterRecord | null;
  phrase: TranscriptPhrase | null;
  t: number;
  duration: number;
  pinLabel?: string | null;
  onPause: () => void;
  onResume: () => void;
  onOpenPin?: () => void;
  interrupted: boolean;
};

export function GuidedBriefing({
  visible,
  segment,
  chapter,
  phrase,
  t,
  duration,
  pinLabel,
  onPause,
  onResume,
  onOpenPin,
  interrupted,
}: Props) {
  if (!visible) return null;
  const progress = duration > 0 ? Math.min(100, Math.max(0, (t / duration) * 100)) : 0;
  return (
    <div className="sw-briefing" data-testid="sw-guided-briefing">
      <p className="sw-briefing-kicker">Guided Briefing</p>
      <div className="sw-briefing-row">
        <strong>{segment?.speaker ?? "Guide"}</strong>
        <span>{chapter?.name ?? "Entire walk"}</span>
      </div>
      <p className="sw-briefing-caption" data-testid="sw-briefing-caption">
        {phrase?.text ?? segment?.title ?? "Look around anytime. Pause to inspect."}
      </p>
      <div className="sw-briefing-progress" aria-hidden>
        <div style={{ width: `${progress}%` }} />
      </div>
      <div className="sw-briefing-actions">
        {interrupted ? (
          <button type="button" className="sw-chrome-btn" data-accent="true" onClick={onResume}>Resume briefing</button>
        ) : (
          <button type="button" className="sw-chrome-btn" onClick={onPause}>Pause</button>
        )}
        {pinLabel && onOpenPin ? (
          <button type="button" className="sw-chrome-btn" onClick={onOpenPin}>{pinLabel}</button>
        ) : null}
      </div>
    </div>
  );
}

export function briefingChapter(chapters: ChapterRecord[], clipId: string, t: number): ChapterRecord | null {
  return chapterAtTime(chapters, clipId, t);
}
