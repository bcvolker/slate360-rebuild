"use client";

import { useCallback, useEffect, useState } from "react";
import { type ExperiencePin } from "@/components/spatial-walkthrough/viewer/WalkthroughExperience";
import { StudioChapterAuthoring } from "./StudioChapterAuthoring";
import type { WalkthroughPlayerHandle } from "@/components/spatial-walkthrough/viewer/WalkthroughPlayer";
import { StudioUpload } from "./StudioUpload";
import { StudioSharePanel } from "./StudioSharePanel";
import { OperatorPatchPanel } from "./OperatorPatchPanel";
import { PrivacyInspector } from "./PrivacyInspector";
import "./studio-frame.css";
import { PrivacyRulesPanel } from "./PrivacyRulesPanel";
import { ExportModal } from "./ExportModal";
import { StudioAudioStack } from "./StudioAudioStack";
import { parseOperatorPatch, resolveOperatorPatch } from "@/lib/spatial-walkthrough/operator-patch";
import { wrapYaw } from "@/lib/spatial-walkthrough/redaction";
import { captureMetaLabel, parseCaptureMeta } from "@/lib/spatial-walkthrough/capture-meta";
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

  const load = useCallback(async () => {
    const res = await fetch(`/api/spatial-walkthrough/${walkthroughId}`, { cache: "no-store" });
    const json = await res.json();
    if (res.ok) setPayload(json);
  }, [walkthroughId]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    const projectId = payload?.walkthrough.project_id;
    if (!projectId) return;
    void fetch(`/api/spatial-walkthrough/files?projectId=${projectId}`).then((r) => r.json()).then((j) => setFiles(j.files ?? []));
  }, [payload?.walkthrough.project_id]);

  useEffect(() => {
    if (!payload) return;
    const clip = payload.clips[0];
    setPatch(resolveOperatorPatch(clip?.operator_patch, payload.walkthrough.operator_patch));
  }, [payload]);

  const persistPatch = async () => {
    const clip = payload?.clips[0];
    await fetch(`/api/spatial-walkthrough/${walkthroughId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ operatorPatch: patch, clipId: clip?.id, clipOperatorPatch: patch }),
    });
    if (clip?.id) {
      void fetch(`/api/spatial-walkthrough/${walkthroughId}/privacy-bake`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clipId: clip.id }),
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
  const pins: ExperiencePin[] = runtime.pins.map((p) => ({
    id: String(p.id),
    label: String(p.label),
    pinType: String(p.pin_type),
    body: (p.body as string) ?? null,
    yawDeg: Number(p.yaw_deg ?? 0),
    pitchDeg: Number(p.pitch_deg ?? 0),
    tSeconds: p.t_seconds == null ? null : Number(p.t_seconds),
    attachments: (payload.attachments ?? [])
      .filter((a) => String(a.pin_id) === String(p.id))
      .map((a) => ({
        id: String(a.id),
        kind: a.kind === "url" ? "url" as const : "slatedrop" as const,
        title: (a.title as string) ?? null,
        url: (a.external_url as string) ?? null,
        previewUrl: a.slatedrop_id ? `/api/slatedrop/download?fileId=${a.slatedrop_id}&mode=preview` : null,
        downloadUrl: a.slatedrop_id ? `/api/slatedrop/download?fileId=${a.slatedrop_id}` : null,
        fileName: (a.title as string) ?? null,
      })),
  }));
  const theme: BrandTheme = resolveBrandTheme({
    walkthrough: payload.walkthrough.brand_theme as never,
    canHidePoweredBy: true,
  });
  const viewerPatch = previewPolicy === "master" ? { ...patch, enabled: false } : patch;
  const captureLabel = captureMetaLabel(parseCaptureMeta(clip?.capture_meta));
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
          attachments: fileId ? [{ kind: "slatedrop", fileId }] : [],
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
        <p className="mb-2 text-xs text-[var(--graphite-muted)]">Tools</p>
        {["Capture", "Spaces", "Path", "Pins", "Privacy", "Narration", "Publish"].map((tool) => (
          <p key={tool} className="sw-studio-tool">{tool}</p>
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
          onPlayerReady={setPlayer}
          onAddWaypoint={(view) => setDraft({ kind: "waypoint", ...view })}
          onAddPin={(view) => setDraft({ kind: "pin", ...view })}
          onRefresh={() => void load()}
          narration={narration}
          transcripts={transcripts}
        />
      ) : (
        <p className="text-sm text-[var(--graphite-muted)]">Playback starts after the web proxy is ready.</p>
      )}
      </div>
      <aside className="sw-studio-inspector">
      <PrivacyInspector
        patch={patch}
        onChange={setPatch}
        onPersist={() => void persistPatch()}
        onMaskHere={() => {
          if (!player) return;
          setPatch((p) => ({ ...p, enabled: true, rearYawCenter: wrapYaw(player.getView().yaw + 180) }));
        }}
      />
      {draft ? (
        <div className="space-y-2 border border-white/10 p-4">
          <p className="text-sm">Paused at {draft.t.toFixed(1)}s · yaw {draft.yaw.toFixed(0)} · pitch {draft.pitch.toFixed(0)}</p>
          <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Label" className="h-11 w-full border border-white/10 bg-transparent px-3" />
          {draft.kind === "pin" ? (
            <select value={fileId} onChange={(e) => setFileId(e.target.value)} className="h-11 w-full border border-white/10 bg-transparent px-2">
              <option value="">Attach project file (optional)</option>
              {files.map((f) => <option key={f.id} value={f.id}>{f.file_name}</option>)}
            </select>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => void saveDraft()} className="h-11 border border-[color-mix(in_srgb,var(--graphite-primary)_40%,transparent)] px-4 text-[var(--graphite-primary)]">
              Save {draft.kind}
            </button>
            <button type="button" onClick={() => setDraft(null)} className="h-11 px-3 text-sm">Cancel</button>
          </div>
        </div>
      ) : null}
      <OperatorPatchPanel
        patch={patch}
        onChange={setPatch}
        onPersist={() => void persistPatch()}
        onUseRearFromView={() => {
          if (!player) return;
          setPatch((p) => ({ ...p, rearYawCenter: wrapYaw(player.getView().yaw + 180) }));
        }}
      />
      <PrivacyRulesPanel
        clipId={clipId}
        walkthroughId={walkthroughId}
        draft={draft}
        waypoints={payload.waypoints.map(toWaypoint)}
        rules={allRules}
        onRefresh={() => void load()}
      />
      {clipId ? (
        <StudioAudioStack
          walkthroughId={walkthroughId}
          clipId={clipId}
          duration={Number(clip?.duration_s ?? 0)}
          currentT={player?.getView().t ?? 0}
          yaw={player?.getView().yaw ?? 0}
          pitch={player?.getView().pitch ?? 0}
          segments={narration}
          onRefresh={() => void load()}
          onDrag={(id, delta) => {
            const s = narration.find((x) => x.id === id);
            if (!s) return;
            void fetch(`/api/spatial-walkthrough/${walkthroughId}/narration/${id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ startTime: s.startTime + delta, endTime: s.endTime + delta }),
            }).then(() => void load());
          }}
        />
      ) : null}
      <StudioSharePanel
        walkthroughId={walkthroughId}
        status={String(payload.walkthrough.status)}
        shares={payload.shares}
        chapters={(payload.chapters ?? []).map((c) => ({ id: String(c.id), name: String(c.name ?? "Space") }))}
        onRefresh={() => void load()}
        onExport={() => setExportOpen(true)}
      />
      </aside>
      <ExportModal walkthroughId={walkthroughId} clipId={clipId} open={exportOpen} onClose={() => setExportOpen(false)} />
    </div>
  );
}
