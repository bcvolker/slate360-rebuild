"use client";

import { useState } from "react";
import type { BrandTheme, OperatorPatch, WaypointRecord } from "@/lib/spatial-walkthrough/types";
import type { RedactionRule } from "@/lib/spatial-walkthrough/redaction";
import type { ChapterRecord } from "@/lib/spatial-walkthrough/chapters";
import { chapterBands, displayChapterName, pinsInChapter } from "@/lib/spatial-walkthrough/chapters";
import type { ClipEdgeRecord, ClipSummary } from "@/lib/spatial-walkthrough/clip-edges";
import { EMPTY_LOCATOR, type ShareLocator } from "@/lib/spatial-walkthrough/share-locator";
import { WalkthroughExperience, type ExperiencePin } from "./WalkthroughExperience";
import { ChapterPicker } from "./ChapterPicker";
import { ChapterTimeline } from "./ChapterTimeline";
import { ClipTransitionOverlay } from "./ClipTransitionOverlay";
import { useChapterSession } from "./useChapterSession";
import type { WalkthroughPlayerHandle } from "./WalkthroughPlayer";
import "./chapter-chrome.css";

type Props = {
  theme: BrandTheme;
  title: string;
  clipId: string;
  waypoints: WaypointRecord[];
  pins: Array<ExperiencePin & { clipId?: string | null }>;
  redactions: RedactionRule[];
  operatorPatch?: OperatorPatch | null;
  allowDownload?: boolean;
  authoring?: boolean;
  duration?: number;
  projectName?: string | null;
  capturedAt?: string | null;
  preview?: boolean;
  selectedId?: string | null;
  clips?: ClipSummary[];
  chapters?: ChapterRecord[];
  edges?: ClipEdgeRecord[];
  locator?: ShareLocator;
  lockedChapterId?: string | null;
  pickerOpen?: boolean;
  walkthroughId?: string;
  videoUrl?: string;
  posterUrl?: string | null;
  onAddWaypoint?: (view: { t: number; yaw: number; pitch: number }) => void;
  onAddPin?: (view: { t: number; yaw: number; pitch: number }) => void;
  onPlayerReady?: (handle: WalkthroughPlayerHandle) => void;
  onStartSpace?: (view: { t: number; yaw: number; pitch: number }) => void;
  onEndSpace?: (view: { t: number; yaw: number; pitch: number }) => void;
};

export function ChapterWalkthroughExperience({
  clips,
  chapters = [],
  edges = [],
  locator = EMPTY_LOCATOR,
  lockedChapterId = null,
  pickerOpen = false,
  walkthroughId = "",
  onStartSpace,
  onEndSpace,
  ...rest
}: Props) {
  const [player, setPlayer] = useState<WalkthroughPlayerHandle | null>(null);
  const clipList = clips?.length
    ? clips
    : [{
        id: rest.clipId,
        title: rest.title,
        zone: null,
        durationS: rest.duration ?? 0,
        defaultYaw: 0,
        defaultPitch: 0,
        sortOrder: 0,
        videoUrl: rest.videoUrl ?? "",
        posterUrl: rest.posterUrl ?? null,
      }];

  const session = useChapterSession({
    clips: clipList,
    chapters,
    edges,
    waypoints: rest.waypoints,
    walkthroughId,
    locator,
    lockedChapterId,
    player,
    preview: rest.preview,
    authoring: rest.authoring,
  });

  const active = session.activeClip;
  const scopedPins = session.selectedChapter ? pinsInChapter(rest.pins, session.selectedChapter) : rest.pins;
  const bands = chapterBands(session.chapters, session.clipId, session.duration || rest.duration || 0, session.selectedChapter?.id ?? null);
  const name = displayChapterName(session.selectedChapter, session.liveChapter, session.entireWalk);

  return (
    <div className="relative h-full min-h-0">
      <p className="sw-chapter-chip">{name}</p>
      <ChapterPicker
        chapters={session.chapters}
        selectedId={session.selectedChapter?.id ?? null}
        locked={session.pickerLocked}
        open={pickerOpen}
        onSelect={session.selectChapter}
      />
      <ClipTransitionOverlay fade={session.fade} />
      <div className="sw-chapter-band-layer">
        <ChapterTimeline bands={bands} onSelect={session.selectChapter} />
      </div>
      <WalkthroughExperience
        {...rest}
        clipId={session.clipId}
        videoUrl={active?.videoUrl || rest.videoUrl}
        posterUrl={active?.posterUrl ?? rest.posterUrl}
        duration={session.duration || rest.duration}
        waypoints={session.scopedWaypoints}
        pins={scopedPins}
        onPlayerReady={(handle) => {
          setPlayer(handle);
          rest.onPlayerReady?.(handle);
        }}
      />
      {rest.authoring ? (
        <div className="sw-space-mark">
          <button type="button" className="sw-chrome-btn" onClick={() => player && onStartSpace?.(player.getView())}>Start space here</button>
          <button type="button" className="sw-chrome-btn" onClick={() => player && onEndSpace?.(player.getView())}>End space here</button>
        </div>
      ) : null}
    </div>
  );
}
