"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { cn } from "@/lib/utils";
import { twinAccent } from "@/lib/digital-twin/twin-accent";
import type { TwinViewerKind } from "@/lib/digital-twin/viewer-format";
import type { SplatViewerHandle, TwinPickPoint } from "@/components/digital-twin/TwinShareSplatViewer";
import { TwinViewerCanvasShell } from "@/components/digital-twin/TwinViewerCanvasShell";
import { TwinShareToolStrip, type TwinShareCameraMode, type TwinShareTool } from "./TwinShareToolStrip";

const TwinShareSplatViewer = dynamic(
  () =>
    import("@/components/digital-twin/TwinShareSplatViewer").then((m) => m.TwinShareSplatViewer),
  { ssr: false },
);
const TwinModelViewer = dynamic(
  () => import("@/components/digital-twin/TwinModelViewer").then((m) => m.TwinModelViewer),
  { ssr: false },
);

type CommentRow = {
  id: string;
  subject_type?: string;
  author_display: string | null;
  body: string;
};
type PinRow = { id: string; title: string };

const APPROX_DISCLAIMER =
  "Approximate — for visual coordination, not survey. Requires metric scale.";
const fieldClass =
  "w-full rounded-xl border border-white/10 bg-[#0B0F15]/60 px-3 py-2 text-xs text-zinc-100 placeholder:text-zinc-500";

function dist(a: TwinPickPoint, b: TwinPickPoint) {
  return Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
}

export function TwinShareAnnotateShell({
  shareToken,
  canAnnotate,
  viewerKind,
  modelUrl,
  modelTitle,
  modelId,
}: {
  shareToken: string;
  canAnnotate: boolean;
  viewerKind: TwinViewerKind;
  modelUrl: string;
  modelTitle: string;
  modelId?: string | null;
}) {
  const viewerRef = useRef<SplatViewerHandle | null>(null);
  const [tool, setTool] = useState<TwinShareTool>("view");
  const [cameraMode, setCameraMode] = useState<TwinShareCameraMode>("orbit");
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [authorName, setAuthorName] = useState("");
  const [commentBody, setCommentBody] = useState("");
  const [pinTitle, setPinTitle] = useState("");
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [pins, setPins] = useState<PinRow[]>([]);
  const [measureA, setMeasureA] = useState<TwinPickPoint | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const pickEnabled = canAnnotate && (tool === "pin" || tool === "measure");
  const measureReady = viewerKind === "splat" || viewerKind === "model";
  const splatReady = viewerKind === "splat";

  const refresh = useCallback(async () => {
    const [cRes, pRes] = await Promise.all([
      fetch(`/api/share/twin/${shareToken}/comment`),
      fetch(`/api/share/twin/${shareToken}/pin`),
    ]);
    const cJson = (await cRes.json().catch(() => ({}))) as { comments?: CommentRow[] };
    const pJson = (await pRes.json().catch(() => ({}))) as { pins?: PinRow[] };
    if (cRes.ok) setComments(cJson.comments ?? []);
    if (pRes.ok) setPins(pJson.pins ?? []);
  }, [shareToken]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2500);
  };

  const handlePick = useCallback(
    async (point: TwinPickPoint) => {
      if (!canAnnotate) return;
      setError(null);

      if (tool === "pin") {
        if (!authorName.trim() || !pinTitle.trim()) {
          setError("Enter your name and pin title first.");
          setCommentsOpen(true);
          return;
        }
        setBusy(true);
        try {
          const res = await fetch(`/api/share/twin/${shareToken}/pin`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              author_display: authorName.trim(),
              title: pinTitle.trim(),
              body: commentBody.trim() || null,
              position: point,
              model_id: modelId ?? null,
            }),
          });
          const data = (await res.json().catch(() => ({}))) as { error?: string };
          if (!res.ok) throw new Error(data.error ?? "Could not create pin");
          setPinTitle("");
          setCommentBody("");
          showToast("Pin created");
          await refresh();
        } catch (err) {
          setError(err instanceof Error ? err.message : "Pin failed");
          setCommentsOpen(true);
        } finally {
          setBusy(false);
        }
        return;
      }

      if (tool === "measure") {
        if (!measureA) {
          setMeasureA(point);
          return;
        }
        const measured = dist(measureA, point);
        setBusy(true);
        try {
          const res = await fetch(`/api/share/twin/${shareToken}/measurement`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              author_display: authorName.trim() || "Guest",
              start_point: measureA,
              end_point: point,
              measured_value: measured,
              unit: "m",
              model_id: modelId ?? null,
            }),
          });
          const data = (await res.json().catch(() => ({}))) as { error?: string };
          if (!res.ok) throw new Error(data.error ?? "Could not save measurement");
          setMeasureA(null);
          showToast("Measurement saved");
        } catch (err) {
          setError(err instanceof Error ? err.message : "Measurement failed");
        } finally {
          setBusy(false);
        }
      }
    },
    [canAnnotate, tool, authorName, pinTitle, commentBody, shareToken, modelId, measureA, refresh],
  );

  const submitComment = async () => {
    if (!authorName.trim() || !commentBody.trim()) {
      setError("Enter your name and comment.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/share/twin/${shareToken}/comment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          author_display: authorName.trim(),
          body: commentBody.trim(),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not post comment");
      setCommentBody("");
      showToast("Comment added");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Comment failed");
    } finally {
      setBusy(false);
    }
  };

  const selectTool = (id: TwinShareTool) => {
    setTool(id);
    setMeasureA(null);
    setError(null);
    if (id !== "view") setCommentsOpen(true);
  };

  const thread = useMemo(
    () => comments.filter((c) => c.subject_type !== "pin"),
    [comments],
  );

  const commentCount = thread.length + pins.length;

  const commentsContent = (
    <div className="space-y-3 pb-2">
      {canAnnotate ? (
        <>
          <TwinShareToolStrip
            tool={tool}
            cameraMode={cameraMode}
            canAnnotate={canAnnotate}
            measureReady={measureReady}
            viewerKind={viewerKind}
            busy={busy}
            onSelectTool={selectTool}
            onToggleCameraMode={() => setCameraMode((m) => (m === "interior" ? "orbit" : "interior"))}
          />
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
                <button type="button" onClick={() => void submitComment()} className={twinAccent.button}>
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
                {APPROX_DISCLAIMER}
              </p>
            ) : null}
          </div>
        </>
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

  return (
    <TwinViewerCanvasShell
      viewerRef={viewerRef}
      commentsOpen={commentsOpen}
      onToggleComments={() => setCommentsOpen((open) => !open)}
      commentCount={commentCount}
      commentsTitle="Activity"
      commentsContent={commentsContent}
      toast={toast}
      cameraMode={cameraMode}
      onToggleCameraMode={() => {
        if (cameraMode === "interior") {
          viewerRef.current?.recenter();
          setCameraMode("orbit");
          return;
        }
        setCameraMode("interior");
      }}
    >
      {splatReady ? (
        <TwinShareSplatViewer
          ref={viewerRef}
          src={modelUrl}
          pickEnabled={pickEnabled}
          onPick={(pt) => void handlePick(pt)}
          cameraMode={cameraMode}
          onCameraModeChange={setCameraMode}
        />
      ) : (
        <div className="absolute inset-0">
          <TwinModelViewer viewerKind={viewerKind} modelUrl={modelUrl} modelTitle={modelTitle} />
        </div>
      )}
    </TwinViewerCanvasShell>
  );
}
