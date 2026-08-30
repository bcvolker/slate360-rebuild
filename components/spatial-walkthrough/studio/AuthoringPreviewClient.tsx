"use client";

import { useEffect, useMemo, useState } from "react";
import { WalkthroughPlayer, type WalkthroughPlayerHandle } from "@/components/spatial-walkthrough/viewer/WalkthroughPlayer";
import { StudioTimeline } from "@/components/spatial-walkthrough/studio/StudioTimeline";
import { OperatorMaskOverlay } from "@/components/spatial-walkthrough/studio/OperatorMaskOverlay";
import { OperatorKeyframePanel } from "@/components/spatial-walkthrough/studio/OperatorKeyframePanel";
import { OrientationPanel } from "@/components/spatial-walkthrough/studio/OrientationPanel";
import { PrivacyReviewBar } from "@/components/spatial-walkthrough/studio/PrivacyReviewBar";
import { interpolateKeyframes, keyframeToPatch, type OperatorKeyframe } from "@/lib/spatial-walkthrough/keyframes";
import { interpolateOrientation, parseOrientationTrack, sphereCorrectionFromOrientation, upsertOrientation, type OrientationKeyframe } from "@/lib/spatial-walkthrough/orientation";
import { parseOperatorPatch } from "@/lib/spatial-walkthrough/operator-patch";
import { parseRedactionRow } from "@/lib/spatial-walkthrough/redaction-parse";
import type { RedactionRule } from "@/lib/spatial-walkthrough/redaction";
import type { AccessPolicy, WaypointRecord } from "@/lib/spatial-walkthrough/types";
import type { ChapterRecord } from "@/lib/spatial-walkthrough/chapters";
import type { ReviewRate } from "@/lib/spatial-walkthrough/privacy-review";

type PublicPayload = {
  walkthrough?: { title?: string; durationS?: number };
  clip?: { id: string; durationS: number; proxyUrl: string; posterUrl: string };
  waypoints?: WaypointRecord[];
  chapters?: ChapterRecord[];
  redactions?: Array<Record<string, unknown>>;
  operatorPatch?: Record<string, unknown>;
  pins?: Array<{ id: string; label?: string; t_seconds?: number; tSeconds?: number }>;
};

const NORMAL: OperatorKeyframe = {
  t: 4, yawCenter: 180, yawWidth: 58, pitchTop: -12, pitchBottom: -72, nadirRadius: 0.2, feather: 0.04, style: "solid",
};
const DOOR: OperatorKeyframe = {
  t: 18, yawCenter: 175, yawWidth: 92, pitchTop: 8, pitchBottom: -28, nadirRadius: 0.38, feather: 0.08, style: "solid",
};

export function AuthoringPreviewClient({ token, scene }: { token: string; scene: string }) {
  const [payload, setPayload] = useState<PublicPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [player, setPlayer] = useState<WalkthroughPlayerHandle | null>(null);
  const [playhead, setPlayhead] = useState(0);
  const [policy, setPolicy] = useState<AccessPolicy>(scene === "client" ? "client" : "client");
  const [rate, setRate] = useState<ReviewRate>(scene === "review" ? 4 : 1);
  const [frames, setFrames] = useState<OperatorKeyframe[]>([NORMAL]);
  const [rules, setRules] = useState<RedactionRule[]>([]);
  const [ori, setOri] = useState(() => parseOrientationTrack({ source: "manual", bakeable: true, keyframes: [] }));
  const [draft, setDraft] = useState<OperatorKeyframe>(NORMAL);
  const [oriDraft, setOriDraft] = useState<OrientationKeyframe>({ t: 0, rollDeg: 0, pitchDeg: 0, yawDeg: 0 });

  useEffect(() => {
    void fetch(`/api/spatial-walkthrough/public/${token}`, { cache: "no-store" })
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error ?? "HouseWalk share unavailable");
        setPayload(json);
        const parsed = (json.redactions ?? []).map((r: Record<string, unknown>) => parseRedactionRow(r));
        setRules(parsed);
        if (scene === "exclude") {
          setRules((r) => [...r, {
            id: "preview-skip", clipId: json.clip?.id ?? "c", tStart: 12, tEnd: 22,
            yawMin: null, yawMax: null, pitchMin: null, pitchMax: null, mode: "skip", policy: "client", reason: "Excluded interval",
          }]);
        }
        if (scene === "operator-door") setFrames([NORMAL, DOOR]);
        if (scene === "orientation") {
          setOri(parseOrientationTrack({ source: "manual", bakeable: true, keyframes: [{ t: 0, rollDeg: 8, pitchDeg: -3, yawDeg: 12 }] }));
        }
      })
      .catch((e: Error) => setError(e.message));
  }, [token, scene]);

  const duration = Number(payload?.clip?.durationS ?? payload?.walkthrough?.durationS ?? 60);
  const patch = parseOperatorPatch(payload?.operatorPatch ?? { enabled: true });
  const live = interpolateKeyframes(frames, playhead) ?? draft;
  const viewerPatch = policy === "master" ? { ...patch, enabled: false } : keyframeToPatch(live, patch);

  useEffect(() => {
    if (!player) return;
    const id = window.setInterval(() => {
      const view = player.getView();
      setPlayhead(view.t);
      player.setSphereCorrection(sphereCorrectionFromOrientation(interpolateOrientation(ori, view.t)));
    }, 200);
    player.setPlaybackRate(rate);
    return () => window.clearInterval(id);
  }, [player, ori, rate]);

  useEffect(() => {
    if (!player || !duration) return;
    if (scene === "operator-door") player.seekTo(Math.min(18, duration * 0.35));
    else if (scene === "operator-normal") player.seekTo(Math.min(4, duration * 0.08));
    else if (scene === "orientation") player.seekTo(Math.min(6, duration * 0.1));
    else if (scene === "exclude") player.seekTo(11.5);
    else player.seekTo(1);
  }, [player, scene, duration]);

  const chapters = useMemo(() => payload?.chapters ?? [], [payload]);
  const waypoints = payload?.waypoints ?? [];
  const pins = (payload?.pins ?? []).map((p) => ({ id: p.id, tSeconds: p.tSeconds ?? p.t_seconds ?? null, label: p.label ?? "Pin" }));

  if (error) return <p className="p-6 text-sm text-[var(--graphite-muted)]">{error}</p>;
  if (!payload?.clip) return <p className="p-6 text-sm text-[var(--graphite-muted)]">Loading HouseWalk…</p>;

  return (
    <div className="space-y-3 p-4" data-testid="sw-authoring-preview" data-scene={scene}>
      <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--graphite-muted)]">
        Spatial timeline · {payload.walkthrough?.title ?? "HouseWalk"} · {policy.toUpperCase()}
      </p>
      <div className="relative h-[52vh] overflow-hidden border border-white/10 lg:h-[58vh]">
        <WalkthroughPlayer
          videoUrl={payload.clip.proxyUrl}
          posterUrl={payload.clip.posterUrl}
          waypoints={waypoints}
          clipId={payload.clip.id}
          pins={[]}
          redactions={policy === "master" ? [] : rules}
          operatorPatch={viewerPatch}
          onReady={setPlayer}
        />
        <OperatorMaskOverlay
          frame={policy === "master" ? null : live}
          player={player}
          review={scene === "review" || rate !== 1}
          onChange={(partial) => setDraft({ ...live, ...partial })}
        />
      </div>
      <StudioTimeline
        duration={duration}
        policy={policy}
        onPolicy={setPolicy}
        videoLabel={payload.walkthrough?.title ?? "HouseWalk X4"}
        chapters={chapters}
        redactions={rules}
        waypoints={waypoints}
        pins={pins}
        keyframes={frames}
        playhead={playhead}
        onSeek={(t) => player?.seekTo(t)}
        onExclude={(start, end, share) => setRules((r) => [...r, {
          id: `skip-${start}`, clipId: payload.clip!.id, tStart: start, tEnd: end,
          yawMin: null, yawMax: null, pitchMin: null, pitchMax: null, mode: "skip", policy: share, reason: "Excluded interval",
        }])}
        onRestore={(id) => setRules((r) => r.filter((x) => x.id !== id))}
        onResizeSkip={(id, start, end) => setRules((r) => r.map((x) => x.id === id ? { ...x, tStart: start, tEnd: end } : x))}
      />
      <PrivacyReviewBar duration={duration} playhead={playhead} rate={rate} frames={frames} rules={rules} onRate={setRate} onSeek={(t) => player?.seekTo(t)} />
      {scene === "orientation" ? (
        <OrientationPanel track={ori} current={oriDraft} onChange={setOriDraft} onSave={() => setOri(upsertOrientation(ori, { ...oriDraft, t: playhead }))} onRemove={() => undefined} />
      ) : (
        <OperatorKeyframePanel frame={draft} onChange={setDraft} onAdd={() => setFrames((f) => [...f.filter((k) => Math.abs(k.t - playhead) > 0.05), { ...draft, t: playhead }])} onRemove={() => setFrames((f) => f.filter((k) => Math.abs(k.t - playhead) > 0.05))} />
      )}
    </div>
  );
}
