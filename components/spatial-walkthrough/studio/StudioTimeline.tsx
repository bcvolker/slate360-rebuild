"use client";

import type { AccessPolicy, SharePolicy, WaypointRecord } from "@/lib/spatial-walkthrough/types";
import type { ChapterRecord } from "@/lib/spatial-walkthrough/chapters";
import type { RedactionRule } from "@/lib/spatial-walkthrough/redaction";
import type { OperatorKeyframe } from "@/lib/spatial-walkthrough/keyframes";
import { chapterRanges, excludeDraft, privacyRanges, skipRanges, snapBounds, snapTime } from "@/lib/spatial-walkthrough/timeline-model";
import { TimelineTracks } from "./TimelineTracks";
import { useStudioTimeline } from "./useStudioTimeline";
import "./studio-timeline.css";

type PinMark = { id: string; tSeconds: number | null; label: string };

type Props = {
  duration: number;
  policy: AccessPolicy;
  onPolicy: (p: AccessPolicy) => void;
  videoLabel: string;
  chapters: ChapterRecord[];
  redactions: RedactionRule[];
  waypoints: WaypointRecord[];
  pins: PinMark[];
  keyframes: OperatorKeyframe[];
  playhead: number;
  onSeek: (t: number) => void;
  onExclude: (start: number, end: number, policy: SharePolicy) => void;
  onRestore: (id: string) => void;
  onResizeSkip: (id: string, start: number, end: number) => void;
  onSelectRange?: (id: string | null) => void;
};

export function StudioTimeline({
  duration, policy, onPolicy, videoLabel, chapters, redactions, waypoints, pins, keyframes, playhead, onSeek, onExclude, onRestore, onResizeSkip, onSelectRange,
}: Props) {
  const snap = snapBounds({ duration, waypoints, chapters, redactions, keyframes });
  const api = useStudioTimeline(duration, snap);
  const skips = skipRanges(redactions);
  const selectedSkip = skips.find((s) => s.id === api.selectedId);

  const markIn = () => api.setInT(playhead);
  const markOut = () => api.setOutT(playhead);
  const exclude = () => {
    const draft = excludeDraft(api.inT, api.outT);
    if (!draft) return;
    onExclude(draft.start, draft.end, policy === "master" ? "client" : policy);
    api.setInT(null);
    api.setOutT(null);
  };

  return (
    <div className="sw-tl">
      <div className="sw-tl-toolbar">
        <button type="button" onClick={() => api.zoom(-1)} aria-label="Zoom out">−</button>
        <button type="button" onClick={() => api.zoom(1)} aria-label="Zoom in">+</button>
        <select value={policy} onChange={(e) => onPolicy(e.target.value as AccessPolicy)} aria-label="Preview policy">
          <option value="master">MASTER</option>
          <option value="client">CLIENT</option>
          <option value="public">PUBLIC</option>
        </select>
        <span className="sw-tl-author flex gap-1">
          <button type="button" onClick={markIn}>In {api.inT != null ? api.inT.toFixed(1) : "—"}</button>
          <button type="button" onClick={markOut}>Out {api.outT != null ? api.outT.toFixed(1) : "—"}</button>
          <button type="button" data-accent="true" onClick={exclude}>Exclude range</button>
          <button type="button" disabled={!selectedSkip} onClick={() => selectedSkip && onRestore(selectedSkip.id)}>Restore</button>
        </span>
        <span className="sw-tl-legend">
          <span><i data-p="master" />Master</span>
          <span><i data-p="client" />Client</span>
          <span><i data-p="public" />Public</span>
        </span>
      </div>
      <div className="sw-tl-scroll">
        <TimelineTracks
          duration={duration}
          api={api}
          videoLabel={videoLabel}
          chapters={chapterRanges(chapters)}
          privacy={privacyRanges(redactions)}
          skips={skips}
          waypoints={waypoints}
          pins={pins}
          keyframes={keyframes}
          playhead={playhead}
          onSeek={onSeek}
          onSelect={(id) => { api.setSelectedId(id); onSelectRange?.(id); }}
          onResize={(id, edge, t) => {
            const row = skips.find((s) => s.id === id);
            if (!row) return;
            const start = edge === "start" ? t : row.start;
            const end = edge === "end" ? t : row.end;
            if (end - start >= 0.2) onResizeSkip(id, snapTime(start, snap), snapTime(end, snap));
          }}
        />
      </div>
    </div>
  );
}
