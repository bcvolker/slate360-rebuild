"use client";

import { useEffect, useMemo, useState } from "react";
import type { BrandTheme, OperatorPatch, WaypointRecord } from "@/lib/spatial-walkthrough/types";
import type { RedactionRule } from "@/lib/spatial-walkthrough/redaction";
import { WalkthroughPlayer, type WalkthroughPlayerHandle } from "./WalkthroughPlayer";
import { WalkthroughChrome } from "./WalkthroughChrome";
import { PinDrawer, type DrawerPin } from "./PinDrawer";
import { BrandFrame } from "./BrandFrame";

export type ExperiencePin = DrawerPin & {
  yawDeg: number;
  pitchDeg: number;
  tSeconds: number | null;
};

type Props = {
  theme: BrandTheme;
  title: string;
  videoUrl: string;
  posterUrl?: string | null;
  clipId: string;
  waypoints: WaypointRecord[];
  pins: ExperiencePin[];
  redactions: RedactionRule[];
  operatorPatch?: OperatorPatch | null;
  allowDownload?: boolean;
  authoring?: boolean;
  onAddWaypoint?: (view: { t: number; yaw: number; pitch: number }) => void;
  onAddPin?: (view: { t: number; yaw: number; pitch: number }) => void;
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
  onAddWaypoint,
  onAddPin,
}: Props) {
  const [player, setPlayer] = useState<WalkthroughPlayerHandle | null>(null);
  const [currentT, setCurrentT] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!player) return;
    setLoading(false);
    const id = window.setInterval(() => setCurrentT(player.getView().t), 400);
    return () => window.clearInterval(id);
  }, [player]);

  const selected = useMemo(() => pins.find((p) => p.id === selectedId) ?? null, [pins, selectedId]);
  const markerPins = pins.map((p) => ({ id: p.id, yawDeg: p.yawDeg, pitchDeg: p.pitchDeg, label: p.label }));

  return (
    <BrandFrame theme={theme} title={title} loading={loading} compact={authoring}>
      <WalkthroughPlayer
        videoUrl={videoUrl}
        posterUrl={posterUrl}
        waypoints={waypoints}
        clipId={clipId}
        pins={markerPins}
        redactions={redactions}
        operatorPatch={operatorPatch}
        onPinSelect={setSelectedId}
        onReady={setPlayer}
      />
      <WalkthroughChrome
        waypoints={waypoints}
        clipId={clipId}
        currentT={currentT}
        player={player}
        extra={
          authoring ? (
            <div className="flex gap-2">
              <button
                type="button"
                className="min-h-11 rounded-lg border border-white/10 bg-black/40 px-3 text-sm text-[var(--sw-text)]"
                onClick={() => {
                  if (!player) return;
                  player.pause();
                  onAddWaypoint?.(player.getView());
                }}
              >
                Add waypoint
              </button>
              <button
                type="button"
                className="min-h-11 rounded-lg border border-white/10 bg-black/40 px-3 text-sm text-[var(--sw-text)]"
                onClick={() => {
                  if (!player) return;
                  player.pause();
                  onAddPin?.(player.getView());
                }}
              >
                Add pin
              </button>
            </div>
          ) : null
        }
      />
      <PinDrawer pin={selected} onClose={() => setSelectedId(null)} allowDownload={allowDownload} />
    </BrandFrame>
  );
}
