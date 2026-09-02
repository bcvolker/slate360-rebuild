"use client";

import { useCallback, useEffect, useState } from "react";
import { StudioChapterAuthoring } from "./StudioChapterAuthoring";
import type { WalkthroughPlayerHandle } from "@/components/spatial-walkthrough/viewer/WalkthroughPlayer";
import { StudioUpload } from "./StudioUpload";
import "./studio-frame.css";
import { ExportModal } from "./ExportModal";
import { STUDIO_TOOLS, StudioInspector, type StudioTool } from "./StudioInspector";
import { StudioTransport } from "./StudioTransport";
import { parseOperatorPatch, resolveOperatorPatch } from "@/lib/spatial-walkthrough/operator-patch";
import { nextKeyframe, prevKeyframe, removeKeyframeAt, type OperatorKeyframe } from "@/lib/spatial-walkthrough/keyframes";
import { applyKeyframe, keyframeAtView, rearYawFromView } from "@/lib/spatial-walkthrough/studio-keys";
import { studioPinsFromPayload } from "@/lib/spatial-walkthrough/studio-pins";
import { useStudioClock, useStudioHotkeys } from "./useStudioClock";
import { toWaypoint } from "@/lib/spatial-walkthrough/waypoints";
import { filterRuntime } from "@/lib/spatial-walkthrough/runtime-filter";
import { rulesForPolicy, type RedactionRule } from "@/lib/spatial-walkthrough/redaction";
import type { AccessPolicy, BrandTheme, OperatorPatch, WaypointRecord } from "@/lib/spatial-walkthrough/types";
import { resolveBrandTheme } from "@/lib/spatial-walkthrough/theme";
import { hydrateNarration } from "@/lib/spatial-walkthrough/audio";
import { toTranscript } from "@/lib/spatial-walkthrough/transcript";

type FileRow = { id: string; file_name: string };
type Payload = {
  walkthrough: Record<string, unknown>;
  clips: Array<Record<string, unknown>>;
  waypoints: Array<Record<string, unknown>>;
  pins: Array<Record<string, unknown>>;
  attachments?: Array<Record<string, unknown>>;
  redactions: Array<Record<string, unknown>>;
  chapters?: Array<Record<string, unknown>>;
  edges?: Array<Record<string, unknown>>;
  shares: Array<{ id: string; token_prefix?: string; policy: string; is_revoked: boolean; expires_at: string | null }>;
  narration?: Array<Record<string, unknown>>;
  transcripts?: Array<Record<string, unknown>>;
  audioAssets?: Array<Record<string, unknown>>;
};

function ruleFrom(row: Record<string, unknown>): RedactionRule {
  return {
    id: row.id ? String(row.id) : undefined,
    clipId: String(row.clip_id),
    tStart: Number(row.t_start),
    tEnd: Number(row.t_end),
    yawMin: row.yaw_min == null ? null : Number(row.yaw_min),
    yawMax: row.yaw_max == null ? null : Number(row.yaw_max),
    pitchMin: row.pitch_min == null ? null : Number(row.pitch_min),
    pitchMax: row.pitch_max == null ? null : Number(row.pitch_max),
    mode: (row.mode as RedactionRule["mode"]) ?? "skip",
    policy: (row.policy as RedactionRule["policy"]) ?? "public",
    reason: (row.reason as string) ?? null,
    waypointId: row.waypoint_id ? String(row.waypoint_id) : null,
  };
}

export function WalkthroughStudio({ walkthroughId }: { walkthroughId: string }) {
  const [payload, setPayload] = useState<Payload | null>(null);
  const [files, setFiles] = useState<FileRow[]>([]);
  const [draft, setDraft] = useState<{ kind: "waypoint" | "pin"; t: number; yaw: number; pitch: number } | null>(null);
  const [label, setLabel] = useState("");
  const [fileId, setFileId] = useState("");
  const [previewPolicy, setPreviewPolicy] = useState<AccessPolicy>("client");
  const [patch, setPatch] = useState<OperatorPatch>(() => parseOperatorPatch(null));
  const [exportOpen, setExportOpen] = useState(false);
  const [player, setPlayer] = useState<WalkthroughPlayerHandle | null>(null);
  const [tool, setTool] = useState<StudioTool>("Privacy");
  const [selectedKeyT, setSelectedKeyT] = useState<number | null>(null);
  const clock = useStudioClock(player);
  useStudioHotkeys(player, () => {
    const view = player?.getView() ?? clock;
    setDraft({ kind: "pin", t: view.t, yaw: view.yaw, pitch: view.pitch });
    setTool("Pins");
  });

  const load = useCallback(async () => {
    const res = await fetch(`/api/spatial-walkthrough/${walkthroughId}`, { cache: "no-store" });
    const json = await res.json();
    if (res.ok) setPayload(json);
  }, [walkthroughId]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    const projectId = payload?.walkthrough.project_id;
    if (!projectId) return;
    void fetch(`/api/spatial-walkthrough/project-documents?projectId=${projectId}`)
      .then((r) => r.json())
      .then((j) => {
        const docs = (j.documents ?? []) as Array<{ id: string; title: string }>;
        if (docs.length) {
          setFiles(docs.map((d) => ({ id: d.id, file_name: d.title })));
          return;
        }
        return fetch(`/api/spatial-walkthrough/files?projectId=${projectId}`).then((r) => r.json()).then((f) => setFiles(f.files ?? []));
      });
  }, [payload?.walkthrough.project_id]);

  useEffect(() => {
    if (!payload) return;
    const clip = payload.clips[0];
    setPatch(resolveOperatorPatch(clip?.operator_patch, payload.walkthrough.operator_patch));
  }, [payload]);

  const persistPatch = async () => {
    const row = payload?.clips[0];
    await fetch(`/api/spatial-walkthrough/${walkthroughId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ operatorPatch: patch, clipId: row?.id, clipOperatorPatch: patch }),
    });
    if (row?.id) {
      void fetch(`/api/spatial-walkthrough/${walkthroughId}/privacy-bake`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clipId: row.id }),
      });
    }
  };

  if (!payload) return <p className="p-6 text-sm text-[var(--graphite-muted)]">Loading studio…</p>;

  const clip = (payload.clips ?? []).find((c) => c.status === "ready") ?? payload.clips[0];
  const clipId = clip ? String(clip.id) : "";
  const allRules = payload.redactions.map(ruleFrom);
  const runtime = filterRuntime({
    policy: previewPolicy,
    waypoints: payload.waypoints,
    pins: payload.pins as Array<Record<string, unknown> & { visibility: string }>,
    attachments: (payload.attachments ?? []) as Array<{ pin_id: string; visible_on_public: boolean }>,
    redactions: allRules,
    clipId,
  });
  const waypoints: WaypointRecord[] = runtime.waypoints;
  const pins = studioPinsFromPayload(runtime.pins as Array<Record<string, unknown>>, payload.attachments ?? []);
  const theme: BrandTheme = resolveBrandTheme({
    walkthrough: payload.walkthrough.brand_theme as never,
    canHidePoweredBy: true,
  });
  const frames = (patch.keyframes ?? []) as OperatorKeyframe[];
  const viewerPatch = tool === "Privacy" || previewPolicy === "master" ? { ...patch, enabled: true } : patch;

  const writeKey = (partial?: Partial<OperatorKeyframe>) => {
    const next = keyframeAtView(player?.getView() ?? clock, patch, partial);
    setSelectedKeyT(next.t);
    setPatch((p) => applyKeyframe(p, next));
  };
  const redactions = previewPolicy === "master" ? [] : rulesForPolicy(allRules, previewPolicy);
  const narration = hydrateNarration(payload.narration ?? [], payload.audioAssets ?? [], walkthroughId);
  const transcripts = (payload.transcripts ?? []).map(toTranscript);

  const saveDraft = async () => {
    if (!draft || !clipId) return;
    if (draft.kind === "waypoint") {
      await fetch(`/api/spatial-walkthrough/${walkthroughId}/waypoints`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clipId, tSeconds: draft.t, yawDeg: draft.yaw, pitchDeg: draft.pitch, label }),
      });
    } else {
      await fetch(`/api/spatial-walkthrough/${walkthroughId}/pins`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clipId, tSeconds: draft.t, yawDeg: draft.yaw, pitchDeg: draft.pitch, label, pinType: "document",
          attachments: fileId ? [{ kind: "document", documentId: fileId, visibleOnPublic: true }] : [],
        }),
      });
    }
    setDraft(null);
    setLabel("");
    await load();
  };

  return (
    <div className="sw-studio" data-testid="sw-studio">
      <div className="sw-studio-top">
        <a href="/projects" className="text-sm text-[var(--graphite-muted)]">Back</a>
        <h1 className="truncate text-base font-semibold">{String(payload.walkthrough.title)}</h1>
        <label className="flex items-center gap-2 text-xs text-[var(--graphite-muted)]">
          Preview
          <select value={previewPolicy} onChange={(e) => setPreviewPolicy(e.target.value as AccessPolicy)} className="h-11 border border-white/10 bg-transparent px-2">
            <option value="master">MASTER</option>
            <option value="client">CLIENT</option>
            <option value="public">PUBLIC</option>
          </select>
        </label>
      </div>
      <aside className="sw-studio-rail hidden lg:block">
        {STUDIO_TOOLS.map((name) => (
          <button key={name} type="button" className="sw-studio-tool" data-on={tool === name ? "true" : "false"} onClick={() => setTool(name)}>
            {name}
          </button>
        ))}
      </aside>
      {!clip || clip.status !== "ready" ? <StudioUpload walkthroughId={walkthroughId} onQueued={() => void load()} /> : null}
      <div className="sw-studio-stage">
      {clip && clip.status === "ready" ? (
        <StudioChapterAuthoring
          walkthroughId={walkthroughId}
          theme={theme}
          title={String(payload.walkthrough.title)}
          capturedAt={typeof payload.walkthrough.captured_at === "string" ? payload.walkthrough.captured_at : null}
          clips={payload.clips}
          chapters={payload.chapters ?? []}
          edges={payload.edges ?? []}
          waypoints={waypoints}
          pins={pins}
          redactions={redactions}
          operatorPatch={viewerPatch}
          mediaPolicy={previewPolicy === "public" ? "public" : previewPolicy === "client" ? "client" : "master"}
          onPlayerReady={setPlayer}
          onAddWaypoint={(view) => setDraft({ kind: "waypoint", ...view })}
          onAddPin={(view) => setDraft({ kind: "pin", ...view })}
          narration={narration}
          transcripts={transcripts}
        />
      ) : (
        <p className="text-sm text-[var(--graphite-muted)]">Playback starts after the web proxy is ready.</p>
      )}
      </div>
      <aside className="sw-studio-inspector">
        <StudioInspector
          tool={tool}
          walkthroughId={walkthroughId}
          clipId={clipId}
          status={String(payload.walkthrough.status)}
          duration={Number(clip?.duration_s ?? 0)}
          player={player}
          patch={patch}
          onChangePatch={setPatch}
          onPersistPatch={() => void persistPatch()}
          onMaskHere={() => writeKey()}
          captureMeta={clip?.capture_meta}
          currentT={clock.t}
          keyCount={frames.length}
          onPrevKey={() => {
            const prev = prevKeyframe(frames, clock.t);
            if (!prev || !player) return;
            setSelectedKeyT(prev.t);
            player.seekTo(prev.t, undefined, undefined, { pause: true });
          }}
          onNextKey={() => {
            const next = nextKeyframe(frames, clock.t);
            if (!next || !player) return;
            setSelectedKeyT(next.t);
            player.seekTo(next.t, undefined, undefined, { pause: true });
          }}
          onAddKey={() => writeKey()}
          onDeleteKey={() => {
            if (selectedKeyT == null) return;
            setPatch((p) => ({ ...p, keyframes: removeKeyframeAt(p.keyframes ?? [], selectedKeyT) }));
            setSelectedKeyT(null);
          }}
          onCopyPrev={() => {
            const prev = prevKeyframe(frames, clock.t);
            if (!prev) return writeKey();
            writeKey({ ...prev, t: clock.t, yawCenter: rearYawFromView(clock.yaw) });
          }}
          draft={draft}
          label={label}
          fileId={fileId}
          files={files}
          onLabel={setLabel}
          onFileId={setFileId}
          onSaveDraft={() => void saveDraft()}
          onCancelDraft={() => setDraft(null)}
          waypoints={payload.waypoints.map(toWaypoint)}
          rules={allRules}
          onRefresh={() => void load()}
          narration={narration}
          onDragNarration={(id, delta) => {
            const s = narration.find((x) => x.id === id);
            if (!s) return;
            void fetch(`/api/spatial-walkthrough/${walkthroughId}/narration/${id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ startTime: s.startTime + delta, endTime: s.endTime + delta }),
            }).then(() => void load());
          }}
          shares={payload.shares}
          chapters={(payload.chapters ?? []).map((c) => ({ id: String(c.id), name: String(c.name ?? "Space") }))}
          onExport={() => setExportOpen(true)}
          onAddStation={() => {
            const view = player?.getView() ?? clock;
            setDraft({ kind: "waypoint", t: view.t, yaw: view.yaw, pitch: view.pitch });
            setTool("Path");
          }}
        />
      </aside>
      <StudioTransport
        player={player}
        currentT={clock.t}
        duration={Number(clip?.duration_s ?? 0)}
        playing={clock.playing}
        clipId={clipId}
        keyframes={frames}
        redactions={allRules}
        selectedT={selectedKeyT}
        onSelectKey={setSelectedKeyT}
      />
      <ExportModal walkthroughId={walkthroughId} clipId={clipId} open={exportOpen} onClose={() => setExportOpen(false)} />
    </div>
  );
}
