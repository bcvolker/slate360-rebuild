"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { BrandTheme, OperatorPatch, WaypointRecord } from "@/lib/spatial-walkthrough/types";
import type { RedactionRule } from "@/lib/spatial-walkthrough/redaction";
import { WalkthroughPlayer, type WalkthroughPlayerHandle } from "./WalkthroughPlayer";
import { WalkthroughChrome } from "./WalkthroughChrome";
import { PinDrawer, type DrawerPin } from "./PinDrawer";
import { BrandFrame } from "./BrandFrame";
import { PreviewSphere } from "./PreviewSphere";
import { WalkthroughAudioLayer } from "@/components/spatial-walkthrough/audio/WalkthroughAudioLayer";
import type { ChapterRecord } from "@/lib/spatial-walkthrough/chapters";
import type { NarrationSegment, TranscriptRecord, VoiceNoteRecord } from "@/lib/spatial-walkthrough/audio";
import type { BriefingCue } from "@/lib/spatial-walkthrough/briefing-script";
import { activeBriefingCue } from "@/lib/spatial-walkthrough/briefing-script";
import type { NavMode } from "@/lib/spatial-walkthrough/nav-mode";
import { absoluteViewHref, locatorFromView } from "@/lib/spatial-walkthrough/share-locator";
import { BriefingCueOverlay } from "./BriefingCueOverlay";
import { useWalkthroughNav } from "./useWalkthroughNav";
import { WalkthroughCollaborationHost, type WalkthroughCollaboration } from "@/components/spatial-walkthrough/items/WalkthroughCollaborationHost";
import { LookHint } from "./LookHint";
import "@/components/spatial-walkthrough/audio/walkthrough-audio.css";

export type ExperiencePin = DrawerPin & {
  yawDeg: number;
  pitchDeg: number;
  tSeconds: number | null;
};

type Props = {
  theme: BrandTheme;
  title: string;
  videoUrl?: string;
  posterUrl?: string | null;
  /** Cropped operator-free still for the gate only. Never used as an ERP sphere. */
  gatePosterUrl?: string | null;
  clipId: string;
  waypoints: WaypointRecord[];
  pins: ExperiencePin[];
  redactions: RedactionRule[];
  operatorPatch?: OperatorPatch | null;
  allowDownload?: boolean;
  authoring?: boolean;
  duration?: number;
  projectName?: string | null;
  capturedAt?: string | null;
  preview?: boolean;
  selectedId?: string | null;
  buffering?: boolean;
  requireGesture?: boolean;
  onAddWaypoint?: (view: { t: number; yaw: number; pitch: number }) => void;
  onAddPin?: (view: { t: number; yaw: number; pitch: number }) => void;
  onPlayerReady?: (handle: WalkthroughPlayerHandle) => void;
  narration?: NarrationSegment[];
  transcripts?: TranscriptRecord[];
  voiceNotes?: VoiceNoteRecord[];
  chapters?: ChapterRecord[];
  authoringAudio?: boolean;
  shareBasePath?: string;
  walkthroughId?: string;
  chapterId?: string | null;
  initialMode?: NavMode;
  forceHud?: boolean;
  briefingCues?: BriefingCue[];
  transcriptOpen?: boolean;
  collaboration?: WalkthroughCollaboration | null;
};

export function WalkthroughExperience({
  theme,
  title,
  videoUrl,
  posterUrl,
  gatePosterUrl = null,
  clipId,
  waypoints,
  pins,
  redactions,
  operatorPatch,
  allowDownload = true,
  authoring = false,
  duration = 0,
  projectName,
  capturedAt,
  preview = false,
  selectedId: selectedIdProp = null,
  buffering = false,
  requireGesture = !authoring,
  onAddWaypoint,
  onAddPin,
  onPlayerReady,
  narration = [],
  transcripts = [],
  chapters = [],
  authoringAudio = false,
  shareBasePath,
  walkthroughId,
  chapterId = null,
  initialMode = "explore",
  forceHud = false,
  briefingCues = [],
  transcriptOpen: transcriptOpenProp = false,
  collaboration = null,
}: Props) {
  const [player, setPlayer] = useState<WalkthroughPlayerHandle | null>(null);
  const [currentT, setCurrentT] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(selectedIdProp);
  const [entered, setEntered] = useState(!requireGesture);
  const [hasFrame, setHasFrame] = useState(false);
  const enteredRef = useRef(entered);
  const playerRef = useRef<WalkthroughPlayerHandle | null>(null);
  enteredRef.current = entered;
  const nav = useWalkthroughNav({ player, initialMode, forceHud });
  const modeRef = useRef(nav.mode);
  modeRef.current = nav.mode;

  useEffect(() => { setSelectedId(selectedIdProp); }, [selectedIdProp]);

  useEffect(() => {
    if (!player) return;
    const id = window.setInterval(() => setCurrentT(player.getView().t), 400);
    return () => window.clearInterval(id);
  }, [player]);

  const selected = useMemo(() => pins.find((p) => p.id === selectedId) ?? null, [pins, selectedId]);
  const markerPins = pins.map((p) => ({
    id: p.id,
    yawDeg: p.yawDeg,
    pitchDeg: p.pitchDeg,
    label: p.label,
    pinType: p.pinType,
  }));

  const loading = false;
  void requireGesture;
  void entered;
  void buffering;
  const briefingCue = nav.mode === "briefing" ? activeBriefingCue(briefingCues, currentT, clipId) : null;

  const shareHrefFor = () => {
    const view = player?.getView() ?? { t: currentT, yaw: 0, pitch: 0 };
    const locator = locatorFromView({
      walkthroughId,
      clipId,
      chapterId,
      tSeconds: view.t,
      yawDeg: view.yaw,
      pitchDeg: view.pitch,
      pinId: selectedId,
    });
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const base = shareBasePath || (typeof window !== "undefined" ? window.location.pathname : "/");
    return absoluteViewHref(origin, base, locator);
  };

  const startExplore = () => {
    nav.setMode("explore");
    nav.bump();
  };

  return (
    <BrandFrame
      theme={theme}
      title={title}
      projectName={projectName}
      capturedAt={capturedAt}
      loading={loading}
      compact={authoring}
      sceneVisible={hasFrame || Boolean(posterUrl)}
      visibleLayer={hasFrame ? "reality" : "hero"}
    >
      {preview || !videoUrl ? (
        <PreviewSphere
          theme={theme}
          title={title}
          capturedAt={capturedAt}
          waypoints={waypoints}
          pins={markerPins}
          operatorPatch={operatorPatch}
          selectedId={selectedId}
          clipId={clipId}
          currentT={currentT}
          hudOpacity={nav.hudOpacity}
          onSelect={setSelectedId}
          onWaypoint={() => startExplore()}
        />
      ) : (
        <>
          <WalkthroughPlayer
            videoUrl={videoUrl}
            posterUrl={gatePosterUrl || posterUrl || null}
            waypoints={waypoints}
            clipId={clipId}
            pins={markerPins}
            redactions={redactions}
            operatorPatch={operatorPatch}
            theme={theme}
            chrome={{ title, capturedAt, logoUrl: theme.logoUrl }}
            selectedId={selectedId}
            autoplay={false}
            autoRotate={!authoring}
            hudOpacity={nav.hudOpacity}
            onWaypointSelect={startExplore}
            onPinSelect={(id) => {
              const pin = pins.find((p) => p.id === id);
              if (pin && playerRef.current && pin.tSeconds != null) {
                playerRef.current.seekTo(pin.tSeconds, pin.yawDeg, pin.pitchDeg, { pause: true });
              }
              setSelectedId(id);
              startExplore();
            }}
            onReady={(handle) => {
              playerRef.current = handle;
              setPlayer(handle);
              onPlayerReady?.(handle);
            }}
            onPlaying={() => {
              setPlaying(true);
            }}
            onFirstFrame={() => setHasFrame(true)}
            onPause={() => setPlaying(false)}
          />
          <LookHint active={Boolean(videoUrl) && !preview && !authoring} />
        </>
      )}
      {nav.mode === "briefing" && !narration.length && !transcripts.length ? (
        <BriefingCueOverlay cue={briefingCue} />
      ) : null}
      {authoring ? null : (
        <WalkthroughChrome
          waypoints={waypoints}
          clipId={clipId}
          currentT={currentT}
          duration={duration}
          redactions={redactions}
          player={player}
          mode={nav.mode}
          onModeChange={nav.setMode}
          shareHrefFor={shareHrefFor}
          onStation={nav.bump}
          pathVisible={nav.pathVisible}
          onTogglePath={nav.togglePath}
          playing={playing}
          publicChrome
        />
      )}
      <PinDrawer pin={selected} onClose={() => setSelectedId(null)} allowDownload={allowDownload} />
      <WalkthroughCollaborationHost
        collaboration={collaboration}
        walkthroughId={walkthroughId}
        clipId={clipId}
        chapterId={chapterId}
        player={player}
        currentT={currentT}
        authoring={authoring}
        preview={preview}
      />
      {narration.length || transcripts.length ? (
        <WalkthroughAudioLayer
          clipId={clipId}
          duration={duration}
          t={currentT}
          playing={playing}
          player={player}
          segments={narration}
          transcripts={transcripts}
          chapters={chapters}
          pins={pins}
          authoring={authoring || authoringAudio}
          briefing={nav.mode === "briefing"}
          transcriptOpenDefault={transcriptOpenProp}
          onSelectPin={setSelectedId}
        />
      ) : null}
    </BrandFrame>
  );
}
