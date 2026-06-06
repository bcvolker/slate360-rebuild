"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Loader2, MapPin, MessageSquare, Ruler, Footprints, Orbit } from "lucide-react";
import { cn } from "@/lib/utils";
import { twinAccent } from "@/lib/digital-twin/twin-accent";
import type { TwinViewerKind } from "@/lib/digital-twin/viewer-format";
import type { TwinPickPoint } from "@/components/digital-twin/TwinShareSplatViewer";

const TwinShareSplatViewer = dynamic(
  () =>
    import("@/components/digital-twin/TwinShareSplatViewer").then((m) => m.TwinShareSplatViewer),
  { ssr: false },
);
const TwinModelViewer = dynamic(
  () => import("@/components/digital-twin/TwinModelViewer").then((m) => m.TwinModelViewer),
  { ssr: false },
);

type Tool = "view" | "pin" | "comment" | "measure";
type CameraMode = "orbit" | "walk";

type CommentRow = {
  id: string;
  subject_type?: string;
  author_display: string | null;
  body: string;
  parent_id: string | null;
  created_at: string;
};

type PinRow = {
  id: string;
  title: string;
  body: string | null;
  position: { x: number; y: number; z: number };
  pin_status: string;
};

const APPROX_DISCLAIMER =
  "Approximate — for visual coordination, not survey. Requires metric scale.";

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
  const [tool, setTool] = useState<Tool>("view");
  const [cameraMode, setCameraMode] = useState<CameraMode>("orbit");
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

  const toolBtn = (id: Tool, label: string, icon: React.ReactNode) => (
    <button
      type="button"
      onClick={() => {
        setTool(id);
        setMeasureA(null);
        setError(null);
      }}
      disabled={!canAnnotate && id !== "view"}
      className={cn(
        "inline-flex items-center gap-1 rounded-xl border px-2.5 py-1.5 text-[11px] font-semibold transition-colors disabled:opacity-40",
        tool === id ? twinAccent.button : "border-white/10 text-zinc-400 hover:text-zinc-200",
      )}
    >
      {icon}
      {label}
    </button>
  );

  const thread = useMemo(
    () => comments.filter((c) => c.subject_type !== "pin"),
    [comments],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="relative min-h-[40vh] flex-1">
        {viewerKind === "splat" ? (
          <TwinShareSplatViewer
            src={modelUrl}
            className="min-h-[40vh] md:min-h-[50vh]"
            pickEnabled={pickEnabled}
            onPick={(pt) => void handlePick(pt)}
            cameraMode={cameraMode}
          />
        ) : (
          <TwinModelViewer viewerKind={viewerKind} modelUrl={modelUrl} modelTitle={modelTitle} />
        )}
        {toast ? (
          <p className="absolute bottom-3 left-1/2 z-20 -translate-x-1/2 rounded-xl border border-white/10 bg-[#0B0F15]/90 px-3 py-1.5 text-xs text-zinc-100">
            {toast}
          </p>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {toolBtn("view", "View", <Orbit className="size-3.5" aria-hidden />)}
        {canAnnotate ? (
          <>
            {toolBtn("comment", "Comment", <MessageSquare className="size-3.5" aria-hidden />)}
            {toolBtn("pin", "Pin", <MapPin className="size-3.5" aria-hidden />)}
            {measureReady
              ? toolBtn("measure", "Measure", <Ruler className="size-3.5" aria-hidden />)
              : null}
          </>
        ) : null}
        {viewerKind === "splat" ? (
          <button
            type="button"
            onClick={() => setCameraMode((m) => (m === "orbit" ? "walk" : "orbit"))}
            className={cn(twinAccent.button, "inline-flex items-center gap-1 text-[11px]")}
          >
            {cameraMode === "orbit" ? (
              <Footprints className="size-3.5" aria-hidden />
            ) : (
              <Orbit className="size-3.5" aria-hidden />
            )}
            {cameraMode === "orbit" ? "Walk" : "Orbit"}
          </button>
        ) : null}
        {busy ? <Loader2 className={cn("size-4 animate-spin", twinAccent.spinner)} aria-hidden /> : null}
      </div>

      {canAnnotate ? (
        <div className="space-y-2 rounded-xl border border-white/[0.08] bg-white/[0.03] p-3">
          <input
            value={authorName}
            onChange={(e) => setAuthorName(e.target.value)}
            placeholder="Your name"
            className="w-full rounded-xl border border-white/10 bg-[#0B0F15]/60 px-3 py-2 text-xs text-zinc-100 placeholder:text-zinc-500"
          />
          {tool === "comment" ? (
            <>
              <textarea
                value={commentBody}
                onChange={(e) => setCommentBody(e.target.value)}
                placeholder="Comment or question"
                rows={3}
                className="w-full resize-none rounded-xl border border-white/10 bg-[#0B0F15]/60 px-3 py-2 text-xs text-zinc-100 placeholder:text-zinc-500"
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
              className="w-full rounded-xl border border-white/10 bg-[#0B0F15]/60 px-3 py-2 text-xs text-zinc-100 placeholder:text-zinc-500"
            />
          ) : null}
          {tool === "measure" ? (
            <p className="text-[10px] leading-relaxed text-zinc-400">
              {measureA ? "Tap second point on model." : "Tap two points on the pick proxy mesh."}{" "}
              {APPROX_DISCLAIMER}
            </p>
          ) : null}
        </div>
      ) : null}

      {error ? <p className="text-xs text-red-300">{error}</p> : null}

      <div className="max-h-40 space-y-2 overflow-y-auto rounded-xl border border-white/[0.06] p-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Activity</p>
        {thread.length === 0 && pins.length === 0 ? (
          <p className="text-xs text-zinc-500">No comments or pins yet.</p>
        ) : null}
        {thread.map((c) => (
            <div key={c.id} className="text-xs text-zinc-300">
              <span className={cn("font-semibold", twinAccent.text)}>
                {c.author_display ?? "Guest"}
              </span>
              : {c.body}
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
