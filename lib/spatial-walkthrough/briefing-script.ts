/** Placeholder script events when a walk has no narration yet. Live briefing uses audio.ts + transcripts. */

export type BriefingCue = {
  id: string;
  tSeconds: number;
  chapterId: string | null;
  clipId: string | null;
  text: string;
};

export function placeholderBriefingCues(
  chapters: Array<{ id: string; name: string; clipId: string; startTime: number }>,
): BriefingCue[] {
  return chapters.map((chapter) => ({
    id: `cue-${chapter.id}`,
    tSeconds: chapter.startTime,
    chapterId: chapter.id,
    clipId: chapter.clipId,
    text: `Hold on ${chapter.name}. Narration will attach here.`,
  }));
}

export function activeBriefingCue(cues: BriefingCue[], t: number, clipId?: string | null): BriefingCue | null {
  const scoped = clipId ? cues.filter((cue) => !cue.clipId || cue.clipId === clipId) : cues;
  let best: BriefingCue | null = null;
  for (const cue of scoped) {
    if (cue.tSeconds <= t + 0.08) best = cue;
  }
  return best ?? scoped[0] ?? null;
}
