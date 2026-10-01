"use client";

import type { BriefingCue } from "@/lib/spatial-walkthrough/briefing-script";

type Props = {
  cue: BriefingCue | null;
};

export function BriefingCueOverlay({ cue }: Props) {
  if (!cue) return null;
  return (
    <div className="sw-briefing" role="status" data-briefing-cue={cue.id}>
      <p className="sw-briefing-kicker">Guided briefing</p>
      <p>{cue.text}</p>
    </div>
  );
}
