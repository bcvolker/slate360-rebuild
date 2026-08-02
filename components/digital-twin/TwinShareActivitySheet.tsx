"use client";

import { cn } from "@/lib/utils";
import { twinAccent } from "@/lib/digital-twin/twin-accent";
import type { TwinViewerKind } from "@/lib/digital-twin/viewer-format";
import type { SplatManifest } from "@/lib/digital-twin/twin-manifest";
import { measureToolDisclaimer } from "@/components/digital-twin/TwinViewerDisclaimer";
import {
  TwinShareToolStrip,
  type TwinShareCameraMode,
  type TwinShareTool,
} from "@/components/digital-twin/TwinShareToolStrip";
import { PhotoExplorerToggle } from "@/components/digital-twin/photo-explorer/PhotoExplorerToggle";

const fieldClass =
  "w-full rounded-xl border border-white/10 bg-[var(--graphite-canvas)]/60 px-3 py-2 text-xs text-zinc-100 placeholder:text-zinc-500";

type CommentRow = {
  id: string;
  subject_type?: string;
  author_display: string | null;
  body: string;
};
type PinRow = { id: string; title: string };

export function TwinShareActivitySheet({
  canAnnotate,
  tool,
  cameraMode,
  measureReady,
  viewerKind,
  busy,
  onSelectTool,
  onToggleCameraMode,
  authorName,
  setAuthorName,
  commentBody,
  setCommentBody,
  pinTitle,
  setPinTitle,
  onSubmitComment,
  measureA,
  manifest,
  error,
  thread,
  pins,
  photosAvailable,
  photosLayerOn,
  photoCount,
  onTogglePhotos,
}: {
  canAnnotate: boolean;
  tool: TwinShareTool;
  cameraMode: TwinShareCameraMode;
  measureReady: boolean;
  viewerKind: TwinViewerKind;
  busy: boolean;
  onSelectTool: (id: TwinShareTool) => void;
  onToggleCameraMode: () => void;
  authorName: string;
  setAuthorName: (v: string) => void;
  commentBody: string;
  setCommentBody: (v: string) => void;
  pinTitle: string;
  setPinTitle: (v: string) => void;
  onSubmitComment: () => void;
  measureA: unknown;
  manifest: SplatManifest | null;
  error: string | null;
  thread: CommentRow[];
  pins: PinRow[];
  photosAvailable: boolean;
  photosLayerOn: boolean;
  photoCount: number;
  onTogglePhotos: () => void;
}) {
  return (
    <div className="space-y-3 pb-2">
      <div className="flex flex-wrap items-center gap-2">
        {canAnnotate ? (
          <TwinShareToolStrip
            tool={tool}
            cameraMode={cameraMode}
            canAnnotate={canAnnotate}
            measureReady={measureReady}
            viewerKind={viewerKind}
            busy={busy}
            onSelectTool={onSelectTool}
            onToggleCameraMode={onToggleCameraMode}
          />
        ) : null}
        <PhotoExplorerToggle
          available={photosAvailable}
          layerOn={photosLayerOn}
          onToggle={onTogglePhotos}
          count={photoCount}
        />
      </div>

      {canAnnotate ? (
        <div className="space-y-2 rounded-xl border border-[var(--accent-border-blue)] bg-[color-mix(in_srgb,var(--twin360-blue)_5%,transparent)] p-3">
          <input
            value={authorName}
            onChange={(e) => setAuthorName(e.target.value)}
            placeholder="Your name"
            className={fieldClass}
          />
          {tool === "comment" ? (
            <>
              <textarea
                value={commentBody}
                onChange={(e) => setCommentBody(e.target.value)}
                placeholder="Comment or question"
                rows={3}
                className={cn(fieldClass, "resize-none")}
              />
              <button type="button" onClick={onSubmitComment} className={twinAccent.button}>
                Post comment
              </button>
            </>
          ) : null}
          {tool === "pin" ? (
            <input
              value={pinTitle}
              onChange={(e) => setPinTitle(e.target.value)}
              placeholder="Pin title — then tap the model"
              className={fieldClass}
            />
          ) : null}
          {tool === "measure" ? (
            <p className="text-[10px] leading-relaxed text-zinc-400">
              {measureA ? "Tap second point on model." : "Tap two points on the pick proxy mesh."}{" "}
              {measureToolDisclaimer(manifest?.metric_scale_applied)}
            </p>
          ) : null}
        </div>
      ) : null}

      {error ? <p className="text-xs text-red-300">{error}</p> : null}

      <div className="space-y-2">
        {thread.length === 0 && pins.length === 0 ? (
          <p className="text-xs text-zinc-500">No comments or pins yet.</p>
        ) : null}
        {thread.map((c) => (
          <div key={c.id} className="text-xs text-zinc-300">
            <span className={cn("font-semibold", twinAccent.text)}>{c.author_display ?? "Guest"}</span>:{" "}
            {c.body}
          </div>
        ))}
        {pins.map((p) => (
          <div key={p.id} className="text-xs text-zinc-300">
            <span className={cn("font-semibold", twinAccent.text)}>Pin</span>: {p.title}
          </div>
        ))}
      </div>
    </div>
  );
}
