"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { BrandTheme, OperatorPatch, WaypointRecord } from "@/lib/spatial-walkthrough/types";
import type { RedactionRule } from "@/lib/spatial-walkthrough/redaction";
import { WalkthroughPlayer, type WalkthroughPlayerHandle } from "./WalkthroughPlayer";
import { WalkthroughChrome } from "./WalkthroughChrome";
import { PinDrawer, type DrawerPin } from "./PinDrawer";
import { BrandFrame } from "./BrandFrame";
import { PreviewSphere } from "./PreviewSphere";
import { PosterStage } from "./PosterStage";

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
};

export function WalkthroughExperience({
  theme,
  title,
  videoUrl,
  posterUrl,
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
}: Props) {
  const [player, setPlayer] = useState<WalkthroughPlayerHandle | null>(null);
  const [currentT, setCurrentT] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(selectedIdProp);
  const [entered, setEntered] = useState(!requireGesture);
  const [hasFrame, setHasFrame] = useState(false);
  const enteredRef = useRef(entered);
  const playerRef = useRef<WalkthroughPlayerHandle | null>(null);
  enteredRef.current = entered;

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

  const showGate = requireGesture && !entered;
  const showHold = Boolean(posterUrl) && !hasFrame && !showGate;
  const loading = Boolean(!preview && buffering);

  return (
    <BrandFrame
      theme={theme}
      title={title}
      projectName={projectName}
      capturedAt={capturedAt}
      loading={loading}
      compact={authoring}
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
          onSelect={setSelectedId}
        />
      ) : (
        <>
          <WalkthroughPlayer
            videoUrl={videoUrl}
            posterUrl={posterUrl}
            waypoints={waypoints}
            clipId={clipId}
            pins={markerPins}
            redactions={redactions}
            operatorPatch={operatorPatch}
            theme={theme}
            chrome={{ title, capturedAt, logoUrl: theme.logoUrl }}
            selectedId={selectedId}
            autoplay={false}
            onPinSelect={setSelectedId}
            onReady={(handle) => {
              playerRef.current = handle;
              setPlayer(handle);
              onPlayerReady?.(handle);
              if (!requireGesture || enteredRef.current) handle.play();
            }}
            onPlaying={() => setHasFrame(true)}
          />
          {showGate || showHold ? (
            <PosterStage
              posterUrl={posterUrl}
              title={title}
              showButton={showGate}
              onEnter={() => {
                enteredRef.current = true;
                setEntered(true);
                playerRef.current?.play();
              }}
            />
          ) : null}
        </>
      )}
      <WalkthroughChrome
        waypoints={waypoints}
        clipId={clipId}
        currentT={currentT}
        duration={duration}
        redactions={redactions}
        player={player}
        extra={
          authoring ? (
            <div className="flex gap-2">
              <button type="button" className="sw-chrome-btn" onClick={() => player && onAddWaypoint?.(player.getView())}>
                Waypoint
              </button>
              <button type="button" className="sw-chrome-btn" onClick={() => player && onAddPin?.(player.getView())}>
                Pin
              </button>
            </div>
          ) : null
        }
      />
      <PinDrawer pin={selected} onClose={() => setSelectedId(null)} allowDownload={allowDownload} />
    </BrandFrame>
  );
}
