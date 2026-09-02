"use client";

import { PrivacyInspector } from "./PrivacyInspector";
import { PrivacyRulesPanel } from "./PrivacyRulesPanel";
import { StudioAudioStack } from "./StudioAudioStack";
import { StudioSharePanel } from "./StudioSharePanel";
import { StudioCapturePanel } from "./StudioCapturePanel";
import type { WalkthroughPlayerHandle } from "@/components/spatial-walkthrough/viewer/WalkthroughPlayer";
import type { OperatorPatch, WaypointRecord } from "@/lib/spatial-walkthrough/types";
import type { RedactionRule } from "@/lib/spatial-walkthrough/redaction";
import type { NarrationSegment } from "@/lib/spatial-walkthrough/audio";

export const STUDIO_TOOLS = ["Capture", "Spaces", "Path", "Pins", "Privacy", "Narration", "Publish"] as const;
export type StudioTool = (typeof STUDIO_TOOLS)[number];

type Draft = { kind: "waypoint" | "pin"; t: number; yaw: number; pitch: number };

type Props = {
  tool: StudioTool;
  walkthroughId: string;
  clipId: string;
  status: string;
  duration: number;
  player: WalkthroughPlayerHandle | null;
  patch: OperatorPatch;
  onChangePatch: (patch: OperatorPatch) => void;
  onPersistPatch: () => void;
  onMaskHere: () => void;
  draft: Draft | null;
  label: string;
  fileId: string;
  files: Array<{ id: string; file_name: string }>;
  onLabel: (v: string) => void;
  onFileId: (v: string) => void;
  onSaveDraft: () => void;
  onCancelDraft: () => void;
  waypoints: WaypointRecord[];
  rules: RedactionRule[];
  onRefresh: () => void;
  narration: NarrationSegment[];
  onDragNarration: (id: string, delta: number) => void;
  shares: Array<{ id: string; token_prefix?: string; policy: string; is_revoked: boolean; expires_at: string | null }>;
  chapters: Array<{ id: string; name: string }>;
  onExport: () => void;
  captureMeta?: unknown;
  currentT?: number;
  onPrevKey?: () => void;
  onNextKey?: () => void;
  onAddKey?: () => void;
  onDeleteKey?: () => void;
  onCopyPrev?: () => void;
  keyCount?: number;
};

export function StudioInspector(props: Props) {
  if (props.tool === "Capture") {
    return <StudioCapturePanel captureMeta={props.captureMeta} duration={props.duration} clipId={props.clipId} />;
  }
  if (props.tool === "Privacy") {
    return (
      <>
        <PrivacyInspector
          patch={props.patch}
          onChange={props.onChangePatch}
          onPersist={props.onPersistPatch}
          onMaskHere={props.onMaskHere}
          onPrevKey={props.onPrevKey}
          onNextKey={props.onNextKey}
          onAddKey={props.onAddKey}
          onDeleteKey={props.onDeleteKey}
          onCopyPrev={props.onCopyPrev}
          keyCount={props.keyCount}
        />
        <PrivacyRulesPanel
          clipId={props.clipId}
          walkthroughId={props.walkthroughId}
          draft={props.draft}
          waypoints={props.waypoints}
          rules={props.rules}
          onRefresh={props.onRefresh}
        />
      </>
    );
  }
  if (props.tool === "Narration") {
    return props.clipId ? (
      <StudioAudioStack
        walkthroughId={props.walkthroughId}
        clipId={props.clipId}
        duration={props.duration}
        currentT={props.player?.getView().t ?? 0}
        yaw={props.player?.getView().yaw ?? 0}
        pitch={props.player?.getView().pitch ?? 0}
        segments={props.narration}
        onRefresh={props.onRefresh}
        onDrag={props.onDragNarration}
      />
    ) : (
      <p className="text-sm text-[var(--graphite-muted)]">Add a clip to narrate.</p>
    );
  }
  if (props.tool === "Publish") {
    return (
      <StudioSharePanel
        walkthroughId={props.walkthroughId}
        status={props.status}
        shares={props.shares}
        chapters={props.chapters}
        onRefresh={props.onRefresh}
        onExport={props.onExport}
      />
    );
  }
  if (props.draft && (props.tool === "Spaces" || props.tool === "Path" || props.tool === "Pins")) {
    return (
      <div className="space-y-2">
        <p className="text-sm">Paused at {props.draft.t.toFixed(1)}s</p>
        <input value={props.label} onChange={(e) => props.onLabel(e.target.value)} placeholder="Label" className="h-11 w-full border border-white/10 bg-transparent px-3" />
        {props.draft.kind === "pin" ? (
          <select value={props.fileId} onChange={(e) => props.onFileId(e.target.value)} className="h-11 w-full border border-white/10 bg-transparent px-2">
            <option value="">Attach project file</option>
            {props.files.map((f) => <option key={f.id} value={f.id}>{f.file_name}</option>)}
          </select>
        ) : null}
        <button type="button" onClick={props.onSaveDraft} className="h-11 w-full border border-white/20 text-sm">Save {props.draft.kind}</button>
        <button type="button" onClick={props.onCancelDraft} className="h-11 w-full text-sm">Cancel</button>
      </div>
    );
  }
  if (props.tool === "Path") {
    return (
      <div className="space-y-2">
        <p className="text-sm text-white">Path stations</p>
        {props.waypoints.length === 0 ? <p className="text-sm text-[var(--graphite-muted)]">No stations yet. Press M or place a pin, then convert from Path later.</p> : null}
        {props.waypoints.map((wp) => (
          <p key={wp.id} className="text-sm">{wp.label || "Station"} · {wp.tSeconds.toFixed(1)}s</p>
        ))}
      </div>
    );
  }
  if (props.tool === "Spaces") {
    return (
      <div className="space-y-2">
        <p className="text-sm text-white">Spaces</p>
        {props.chapters.length === 0 ? <p className="text-sm text-[var(--graphite-muted)]">No spaces yet. Mark a range in Privacy skip or add a chapter from Path stations.</p> : null}
        {props.chapters.map((ch) => (
          <p key={ch.id} className="text-sm">{ch.name}</p>
        ))}
      </div>
    );
  }
  if (props.tool === "Pins") {
    return <p className="text-sm leading-relaxed text-[var(--graphite-text-body)]">Press M to drop a pin at the playhead and look direction. Attach a project document before saving.</p>;
  }
  return <p className="text-sm leading-relaxed text-[var(--graphite-text-body)]">Select a tool.</p>;
}
