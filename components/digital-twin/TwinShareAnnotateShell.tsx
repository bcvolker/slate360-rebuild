"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { TwinViewerKind } from "@/lib/digital-twin/viewer-format";
import type { SplatViewerHandle, TwinPickPoint } from "@/components/digital-twin/TwinShareSplatViewer";
import { TwinViewerCanvasShell } from "@/components/digital-twin/TwinViewerCanvasShell";
import type { SplatManifest } from "@/lib/digital-twin/twin-manifest";
import { WALK_DISABLED_NO_FLOOR_REASON } from "@/components/digital-twin/splat-viewer-constants";
import { TwinQualityBadge } from "@/components/digital-twin/TwinQualityBadge";
import type { TwinShareCameraMode, TwinShareTool } from "./TwinShareToolStrip";
import { TwinShareActivitySheet } from "@/components/digital-twin/TwinShareActivitySheet";
import { usePhotoExplorer } from "@/components/digital-twin/photo-explorer/usePhotoExplorer";
import { PhotoExplorerPanel } from "@/components/digital-twin/photo-explorer/PhotoExplorerPanel";
import { TwinShareAnnotateViewerStage } from "./TwinShareAnnotateViewerStage";
import {
  postShareComment,
  postShareMeasurement,
  postSharePin,
} from "@/components/digital-twin/twin-share-annotate-actions";

type CommentRow = {
  id: string;
  subject_type?: string;
  author_display: string | null;
  body: string;
};
type PinRow = { id: string; title: string };

export function TwinShareAnnotateShell({
  shareToken,
  canAnnotate,
  viewerKind,
  modelUrl,
  modelTitle,
  modelId,
  qualityMetrics,
  georef,
}: {
  shareToken: string;
  canAnnotate: boolean;
  viewerKind: TwinViewerKind;
  modelUrl: string;
  modelTitle: string;
  modelId?: string | null;
  qualityMetrics?: Record<string, unknown> | null;
  georef?: Record<string, unknown> | null;
}) {
  const viewerRef = useRef<SplatViewerHandle | null>(null);
  const [tool, setTool] = useState<TwinShareTool>("view");
  const [cameraMode, setCameraMode] = useState<TwinShareCameraMode>("orbit");
  const [manifest, setManifest] = useState<SplatManifest | null>(null);
  const walkDisabledReason = manifest?.up_axis === "UNKNOWN" ? WALK_DISABLED_NO_FLOOR_REASON : null;
  const [repositionMode, setRepositionMode] = useState(false);
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

  const pe = usePhotoExplorer({ shareToken, modelId, modelUrl });
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
          setCommentsOpen(true);
          return;
        }
        setBusy(true);
        try {
          await postSharePin({
            shareToken,
            authorName,
            pinTitle,
            commentBody,
            point,
            modelId,
          });
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
        setBusy(true);
        try {
          await postShareMeasurement({
            shareToken,
            authorName,
            measureA,
            point,
            modelId,
          });
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
      await postShareComment({ shareToken, authorName, commentBody });
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

  return (
    <TwinViewerCanvasShell
      viewerRef={viewerRef}
      commentsOpen={commentsOpen}
      onToggleComments={() => setCommentsOpen((open) => !open)}
      commentCount={thread.length + pins.length}
      commentsTitle="Activity"
      commentsContent={
        <TwinShareActivitySheet
          canAnnotate={canAnnotate}
          tool={tool}
          cameraMode={cameraMode}
          measureReady={measureReady}
          viewerKind={viewerKind}
          busy={busy}
          onSelectTool={selectTool}
          onToggleCameraMode={() => setCameraMode((m) => (m === "interior" ? "orbit" : "interior"))}
          authorName={authorName}
          setAuthorName={setAuthorName}
          commentBody={commentBody}
          setCommentBody={setCommentBody}
          pinTitle={pinTitle}
          setPinTitle={setPinTitle}
          onSubmitComment={() => void submitComment()}
          measureA={measureA}
          manifest={manifest}
          error={error}
          thread={thread}
          pins={pins}
          photosAvailable={pe.available}
          photosLayerOn={pe.layerOn}
          photoCount={pe.cameras.length}
          onTogglePhotos={pe.toggleLayer}
        />
      }
      toast={toast}
      cameraMode={cameraMode}
      onToggleCameraMode={() => {
        if (cameraMode === "interior") {
          viewerRef.current?.recenter();
          setCameraMode("orbit");
          return;
        }
        setRepositionMode(false);
        setCameraMode("interior");
      }}
      repositionMode={repositionMode}
      onToggleReposition={
        cameraMode === "orbit" ? () => setRepositionMode((on) => !on) : undefined
      }
      walkDisabledReason={walkDisabledReason}
      metricScaleApplied={manifest?.metric_scale_applied ?? false}
      statusOverlay={
        <TwinQualityBadge
          metrics={{
            ...(qualityMetrics ?? {}),
            ...(georef ? { georef } : {}),
          }}
        />
      }
    >
      <TwinShareAnnotateViewerStage
        viewerRef={viewerRef}
        viewerKind={viewerKind}
        modelUrl={modelUrl}
        modelTitle={modelTitle}
        cameras={pe.cameras}
        layerOn={pe.layerOn}
        selectedIndex={pe.selectedIndex}
        onHover={pe.setHoveredIndex}
        onSelect={pe.setSelectedIndex}
        correctionQuaternion={manifest?.correction_quaternion}
        pickEnabled={pickEnabled}
        onPick={(pt) => void handlePick(pt)}
        cameraMode={cameraMode}
        repositionMode={repositionMode}
        onCameraModeChange={setCameraMode}
        onManifestChange={setManifest}
      />
      <PhotoExplorerPanel
        camera={pe.selected}
        photoUrl={pe.photoUrl}
        onClose={pe.clearSelection}
      />
    </TwinViewerCanvasShell>
  );
}
