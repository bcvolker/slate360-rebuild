"use client";

import { useCallback, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import type { TwinViewerKind } from "@/lib/digital-twin/viewer-format";
import type { TwinPickPoint } from "@/components/digital-twin/TwinShareSplatViewer";
import { twinPickDistance } from "@/lib/digital-twin/measure-helpers";
import type { TwinLayerVisibility } from "./TwinLayersPanel";
import {
  TwinSceneOverlays,
  type TwinOverlayMeasurement,
  type TwinOverlayPin,
} from "./TwinSceneOverlays";
import { TwinMeasureTool } from "./TwinMeasureTool";

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
  const [measureActive, setMeasureActive] = useState(false);
  const [measureA, setMeasureA] = useState<TwinPickPoint | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

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

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <div className="relative min-h-[min(52vh,520px)] flex-1 overflow-hidden md:min-h-[min(68vh,720px)]">
        {splatReady ? (
          <TwinShareSplatViewer
            src={modelUrl}
            className="h-full min-h-0"
            pickEnabled={pickEnabled}
            onPick={(pt) => void handlePick(pt)}
            modelVisible={layerVisible.model ?? true}
            overlay={sceneOverlay}
          />
        ) : (
          <TwinModelViewer viewerKind={viewerKind} modelUrl={modelUrl} modelTitle={modelTitle} />
        )}
        {toast ? (
          <p className="absolute bottom-3 left-1/2 z-20 -translate-x-1/2 rounded-xl border border-[var(--accent-border-blue)] bg-[color-mix(in_srgb,var(--graphite-canvas)_90%,transparent)] px-3 py-1.5 text-xs text-zinc-100 backdrop-blur-md">
            {toast}
          </p>
        ) : null}
      </div>

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

      {error ? <p className="text-xs text-red-300">{error}</p> : null}
    </div>
  );
}
