"use client";

import { useEffect, useState } from "react";
import type { BrandTheme, OperatorPatch, WaypointRecord } from "@/lib/spatial-walkthrough/types";
import type { RedactionRule } from "@/lib/spatial-walkthrough/redaction";
import type { ChapterRecord } from "@/lib/spatial-walkthrough/chapters";
import { chapterBands, displayChapterName, nextChapter, pinsInChapter } from "@/lib/spatial-walkthrough/chapters";
import type { ClipEdgeRecord, ClipSummary } from "@/lib/spatial-walkthrough/clip-edges";
import { clipEdgeActionsAtTime } from "@/lib/spatial-walkthrough/clip-edge-actions";
import { placeholderBriefingCues } from "@/lib/spatial-walkthrough/briefing-script";
import type { NavMode } from "@/lib/spatial-walkthrough/nav-mode";
import { EMPTY_LOCATOR, type ShareLocator } from "@/lib/spatial-walkthrough/share-locator";
import { WalkthroughExperience, type ExperiencePin } from "./WalkthroughExperience";
import type { WalkthroughCollaboration } from "@/components/spatial-walkthrough/items/WalkthroughCollaborationHost";
import { ChapterPicker } from "./ChapterPicker";
import { ChapterTimeline } from "./ChapterTimeline";
import { ClipTransitionOverlay } from "./ClipTransitionOverlay";
import { ClipEdgeActions } from "./ClipEdgeActions";
import { NextChapterControl } from "./NextChapterControl";
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
  gatePosterUrl?: string | null;
  onAddWaypoint?: (view: { t: number; yaw: number; pitch: number }) => void;
  onAddPin?: (view: { t: number; yaw: number; pitch: number }) => void;
  onPlayerReady?: (handle: WalkthroughPlayerHandle) => void;
  onStartSpace?: (view: { t: number; yaw: number; pitch: number }) => void;
  onEndSpace?: (view: { t: number; yaw: number; pitch: number }) => void;
  narration?: import("@/lib/spatial-walkthrough/audio").NarrationSegment[];
  transcripts?: import("@/lib/spatial-walkthrough/audio").TranscriptRecord[];
  shareBasePath?: string;
  initialMode?: NavMode;
  forceHud?: boolean;
  collaboration?: WalkthroughCollaboration | null;
  simulateClient?: boolean;
};

export function ChapterWalkthroughExperience({
  clips,
  chapters = [],
  edges = [],
  locator = EMPTY_LOCATOR,
  lockedChapterId = null,
  pickerOpen: pickerOpenProp = false,
  walkthroughId = "",
  shareBasePath,
  initialMode,
  forceHud,
  onStartSpace,
  onEndSpace,
  ...rest
}: Props) {
  const [player, setPlayer] = useState<WalkthroughPlayerHandle | null>(null);
  const [pickerOpen, setPickerOpen] = useState(pickerOpenProp);
  useEffect(() => {
    const open = () => setPickerOpen(true);
    window.addEventListener("sw-open-spaces", open);
    return () => window.removeEventListener("sw-open-spaces", open);
  }, []);
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
  const upcoming = nextChapter(session.chapters, session.selectedChapter?.id ?? null, session.liveChapter);
  const edgeActions = clipEdgeActionsAtTime({
    edges: session.resolvedEdges,
    clips: clipList,
    clipId: session.clipId,
    t: session.currentT,
    duration: session.duration || rest.duration || 0,
  });
  const briefingCues = placeholderBriefingCues(session.chapters);

  return (
    <div
      className={rest.authoring ? "relative flex h-full min-h-0 flex-col" : "relative flex h-[100dvh] min-h-[100dvh] flex-col"}
      data-studio={rest.authoring ? "true" : "false"}
    >
      {rest.authoring ? <p className="sw-chapter-chip">{name}</p> : null}
      {rest.authoring ? (
        <ChapterPicker
          chapters={session.chapters}
          selectedId={session.selectedChapter?.id ?? null}
          locked={session.pickerLocked}
          open={pickerOpen}
          onSelect={(id) => {
            setPickerOpen(false);
            session.selectChapter(id);
          }}
        />
      ) : pickerOpen ? (
        <div className="sw-space-menu" data-testid="sw-space-menu">
          <button type="button" className="sw-chrome-btn" onClick={() => { setPickerOpen(false); session.selectChapter(null); }}>Entire Walk</button>
          {session.chapters.map((ch) => (
            <button key={ch.id} type="button" className="sw-chrome-btn" onClick={() => { setPickerOpen(false); session.selectChapter(ch.id); }}>
              {ch.name}
            </button>
          ))}
        </div>
      ) : null}
      <ClipTransitionOverlay fade={session.fade} />
      {rest.authoring && upcoming ? <NextChapterControl chapter={upcoming} onSelect={session.selectChapter} /> : null}
      {rest.authoring ? (
        <ClipEdgeActions actions={edgeActions} onSelect={(action) => session.followEdge(action.edge)} />
      ) : null}
      {rest.authoring ? (
        <div className="sw-chapter-band-layer">
          <ChapterTimeline bands={bands} onSelect={session.selectChapter} />
        </div>
      ) : null}
      <WalkthroughExperience
        {...rest}
        clipId={session.clipId}
        videoUrl={active?.videoUrl || rest.videoUrl}
        posterUrl={active?.posterUrl ?? rest.posterUrl}
        duration={session.duration || rest.duration}
        waypoints={session.scopedWaypoints}
        pins={scopedPins}
        chapters={session.chapters}
        narration={rest.narration}
        transcripts={rest.transcripts}
        walkthroughId={walkthroughId}
        chapterId={session.selectedChapter?.id ?? null}
        shareBasePath={shareBasePath}
        initialMode={initialMode}
        forceHud={forceHud}
        briefingCues={briefingCues}
        selectedId={rest.selectedId ?? locator.pinId}
        requireGesture={false}
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
