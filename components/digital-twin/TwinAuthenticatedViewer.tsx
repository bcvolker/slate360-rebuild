"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { TwinViewerKind } from "@/lib/digital-twin/viewer-format";
import type { SplatViewerHandle, TwinPickPoint } from "@/components/digital-twin/TwinShareSplatViewer";
import { twinPickDistance } from "@/lib/digital-twin/measure-helpers";
import type { TwinLayerVisibility } from "./TwinLayersPanel";
import {
  TwinSceneOverlays,
  type TwinOverlayMeasurement,
  type TwinOverlayPin,
} from "./TwinSceneOverlays";
import { TwinMeasureTool } from "./TwinMeasureTool";
import { TwinViewerCanvasShell } from "./TwinViewerCanvasShell";
import { TwinCollaborationPanel } from "./TwinCollaborationPanel";
import type { TwinViewerCameraMode } from "./TwinViewerControlsOverlay";

const TwinShareSplatViewer = dynamic(
  () =>
    import("@/components/digital-twin/TwinShareSplatViewer").then((m) => m.TwinShareSplatViewer),
  { ssr: false },
);

const TwinModelViewer = dynamic(
  () => import("@/components/digital-twin/TwinModelViewer").then((m) => m.TwinModelViewer),
  { ssr: false },
);

type Props = {
  spaceId: string;
  modelId: string;
  viewerKind: TwinViewerKind;
  modelUrl: string;
  modelTitle: string;
  layerVisible: TwinLayerVisibility;
  overlayPins: TwinOverlayPin[];
  overlayMeasurements: TwinOverlayMeasurement[];
  onMeasurementSaved?: () => void;
};

export function TwinAuthenticatedViewer({
  spaceId,
  modelId,
  viewerKind,
  modelUrl,
  modelTitle,
  layerVisible,
  overlayPins,
  overlayMeasurements,
  onMeasurementSaved,
}: Props) {
  const viewerRef = useRef<SplatViewerHandle | null>(null);
  const [cameraMode, setCameraMode] = useState<TwinViewerCameraMode>("orbit");
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [measureActive, setMeasureActive] = useState(false);
  const [measureA, setMeasureA] = useState<TwinPickPoint | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [commentCount, setCommentCount] = useState(0);

  const splatReady = viewerKind === "splat";
  const pickEnabled = measureActive && splatReady;

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2500);
  };

  const cancelMeasure = () => {
    setMeasureActive(false);
    setMeasureA(null);
    setError(null);
  };

  const handlePick = useCallback(
    async (point: TwinPickPoint) => {
      if (!measureActive) return;
      setError(null);

      if (!measureA) {
        setMeasureA(point);
        return;
      }

      const measured = twinPickDistance(measureA, point);
      setBusy(true);
      try {
        const res = await fetch("/api/digital-twin/measurements", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            space_id: spaceId,
            model_id: modelId,
            start_point: measureA,
            end_point: point,
            measured_value: measured,
            unit: "m",
          }),
        });
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        if (!res.ok) throw new Error(data.error ?? "Could not save measurement");
        setMeasureA(null);
        setMeasureActive(false);
        showToast("Measurement saved");
        onMeasurementSaved?.();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Measurement failed");
      } finally {
        setBusy(false);
      }
    },
    [measureActive, measureA, spaceId, modelId, onMeasurementSaved],
  );

  const sceneOverlay = useMemo(
    () => (
      <TwinSceneOverlays
        pins={overlayPins}
        measurements={overlayMeasurements}
        showPins={layerVisible.pins ?? true}
        showMeasurements={layerVisible.measurements ?? true}
        previewPoint={measureActive ? measureA : null}
      />
    ),
    [
      overlayPins,
      overlayMeasurements,
      layerVisible.pins,
      layerVisible.measurements,
      measureActive,
      measureA,
    ],
  );

  const commentsContent = (
    <div className="space-y-2 pb-2">
      {splatReady ? (
        <TwinMeasureTool
          active={measureActive}
          hasFirstPoint={measureA !== null}
          busy={busy}
          splatReady={splatReady}
          onToggle={() => {
            if (measureActive) {
              cancelMeasure();
            } else {
              setMeasureActive(true);
              setMeasureA(null);
              setError(null);
            }
          }}
          onCancel={cancelMeasure}
        />
      ) : null}
      <TwinCollaborationPanel
        spaceId={spaceId}
        onCountsChange={setCommentCount}
        compact
      />
      {error ? <p className="text-xs text-red-300">{error}</p> : null}
    </div>
  );

  return (
    <TwinViewerCanvasShell
      viewerRef={viewerRef}
      commentsOpen={commentsOpen}
      onToggleComments={() => setCommentsOpen((open) => !open)}
      commentCount={commentCount}
      commentsTitle="Collaboration"
      commentsContent={commentsContent}
      toast={toast}
      showDisclaimer={false}
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
          modelVisible={layerVisible.model ?? true}
          overlay={sceneOverlay}
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
