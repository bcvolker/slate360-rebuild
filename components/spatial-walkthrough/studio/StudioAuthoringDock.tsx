"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { StudioTimeline } from "./StudioTimeline";
import { OperatorMaskOverlay } from "./OperatorMaskOverlay";
import { OperatorKeyframePanel } from "./OperatorKeyframePanel";
import { OrientationPanel } from "./OrientationPanel";
import { PrivacyReviewBar } from "./PrivacyReviewBar";
import {
  interpolateKeyframes,
  keyframeToPatch,
  keyframesFromLegacyOrStored,
  legacyPatchToKeyframe,
  operatorRegions,
  type OperatorKeyframe,
} from "@/lib/spatial-walkthrough/keyframes";
import {
  interpolateOrientation,
  parseOrientationTrack,
  removeOrientationAt,
  sphereCorrectionFromOrientation,
  upsertOrientation,
  type OrientationKeyframe,
} from "@/lib/spatial-walkthrough/orientation";
import { toChapter } from "@/lib/spatial-walkthrough/chapters";
import type { AccessPolicy, OperatorPatch, SharePolicy, WaypointRecord } from "@/lib/spatial-walkthrough/types";
import type { RedactionRule } from "@/lib/spatial-walkthrough/redaction";
import type { WalkthroughPlayerHandle } from "@/components/spatial-walkthrough/viewer/WalkthroughPlayer";
import type { ReviewRate } from "@/lib/spatial-walkthrough/privacy-review";

type PinMark = { id: string; tSeconds: number | null; label: string };

type Props = {
  walkthroughId: string;
  clipId: string;
  duration: number;
  videoLabel: string;
  chapters: Array<Record<string, unknown>>;
  allRules: RedactionRule[];
  waypoints: WaypointRecord[];
  pins: PinMark[];
  legacyPatch: OperatorPatch;
  orientationRaw: unknown;
  player: WalkthroughPlayerHandle | null;
  policy: AccessPolicy;
  onPolicy: (p: AccessPolicy) => void;
  onLivePatch: (patch: OperatorPatch) => void;
  onRefresh: () => void;
  children: (overlay: ReactNode) => ReactNode;
};

export function StudioAuthoringDock({
  walkthroughId, clipId, duration, videoLabel, chapters, allRules, waypoints, pins, legacyPatch, orientationRaw,
  player, policy, onPolicy, onLivePatch, onRefresh, children,
}: Props) {
  const [playhead, setPlayhead] = useState(0);
  const [rate, setRate] = useState<ReviewRate>(1);
  const [draftKf, setDraftKf] = useState<OperatorKeyframe | null>(null);
  const [oriDraft, setOriDraft] = useState<OrientationKeyframe>({ t: 0, rollDeg: 0, pitchDeg: 0, yawDeg: 0 });
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const liveRef = useRef(onLivePatch);
  liveRef.current = onLivePatch;

  const track = useMemo(() => parseOrientationTrack(orientationRaw), [orientationRaw]);
  const regions = useMemo(() => operatorRegions(allRules, legacyPatch), [allRules, legacyPatch]);
  const active = regions.find((r) => r.id === selectedRegion) ?? regions[0];
  const frames = active?.frames ?? keyframesFromLegacyOrStored([], legacyPatch);
  const chapterRows = useMemo(() => chapters.map(toChapter), [chapters]);

  useEffect(() => {
    if (!player) return;
    const id = window.setInterval(() => {
      const view = player.getView();
      setPlayhead(view.t);
      const live = interpolateKeyframes(frames, view.t);
      if (live) liveRef.current(keyframeToPatch(live, legacyPatch));
      player.setSphereCorrection(sphereCorrectionFromOrientation(interpolateOrientation(track, view.t)));
    }, 200);
    return () => window.clearInterval(id);
  }, [player, frames, track, legacyPatch]);

  useEffect(() => { player?.setPlaybackRate(rate); }, [player, rate]);

  const currentFrame = interpolateKeyframes(frames, playhead) ?? legacyPatchToKeyframe(legacyPatch, playhead);
  const overlay = (
    <OperatorMaskOverlay
      frame={policy === "master" ? null : (draftKf ?? currentFrame)}
      player={player}
      review={rate !== 1}
      onChange={(partial) => setDraftKf({ ...(draftKf ?? currentFrame), ...partial, t: playhead })}
    />
  );

  const persist = (path: string, method: string, body?: unknown) =>
    fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then(() => onRefresh());

  const exclude = (start: number, end: number, share: SharePolicy) => {
    void persist(`/api/spatial-walkthrough/${walkthroughId}/redactions`, "POST", {
      clipId, tStart: start, tEnd: end, mode: "skip", policy: share, reason: "Excluded interval",
    });
  };

  const saveKeyframe = () => {
    const frame = { ...(draftKf ?? currentFrame), t: playhead };
    if (!active || active.id === "legacy") {
      void persist(`/api/spatial-walkthrough/${walkthroughId}/redactions`, "POST", {
        clipId, tStart: 0, tEnd: Math.max(duration, playhead + 1), mode: "operator-patch", policy: "client",
        reason: "Operator mask", keyframes: [frame],
      });
      return;
    }
    void persist(`/api/spatial-walkthrough/${walkthroughId}/redactions`, "PATCH", { id: active.id, keyframe: frame });
  };

  return (
    <>
      {children(overlay)}
      <StudioTimeline
        duration={duration}
        policy={policy}
        onPolicy={onPolicy}
        videoLabel={videoLabel}
        chapters={chapterRows}
        redactions={allRules}
        waypoints={waypoints}
        pins={pins}
        keyframes={frames}
        playhead={playhead}
        onSeek={(t) => player?.seekTo(t)}
        onExclude={exclude}
        onRestore={(id) => void persist(`/api/spatial-walkthrough/${walkthroughId}/redactions?id=${id}`, "DELETE")}
        onResizeSkip={(id, start, end) => void persist(`/api/spatial-walkthrough/${walkthroughId}/redactions`, "PATCH", { id, tStart: start, tEnd: end })}
        onSelectRange={setSelectedRegion}
      />
      <PrivacyReviewBar
        duration={duration}
        playhead={playhead}
        rate={rate}
        frames={frames}
        rules={allRules}
        onRate={setRate}
        onSeek={(t) => player?.seekTo(t)}
      />
      <OperatorKeyframePanel
        frame={draftKf ?? currentFrame}
        onChange={setDraftKf}
        onAdd={saveKeyframe}
        onRemove={() => {
          if (!active || active.id === "legacy") return;
          void persist(`/api/spatial-walkthrough/${walkthroughId}/redactions`, "PATCH", { id: active.id, removeKeyframeAt: playhead });
        }}
      />
      <OrientationPanel
        track={track}
        current={{ ...oriDraft, t: playhead }}
        onChange={setOriDraft}
        onSave={() => void persist(`/api/spatial-walkthrough/${walkthroughId}`, "PATCH", { clipId, orientation: upsertOrientation(track, { ...oriDraft, t: playhead }) })}
        onRemove={() => void persist(`/api/spatial-walkthrough/${walkthroughId}`, "PATCH", { clipId, orientation: removeOrientationAt(track, playhead) })}
      />
    </>
  );
}
