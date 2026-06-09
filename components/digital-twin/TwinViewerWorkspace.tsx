"use client";

import { useCallback, useEffect, useState } from "react";
import type { TwinViewerKind } from "@/lib/digital-twin/viewer-format";
import { TwinAuthenticatedViewer } from "./TwinAuthenticatedViewer";
import {
  TwinLayersPanel,
  defaultTwinLayerVisibility,
  type TwinLayerVisibility,
} from "./TwinLayersPanel";
import { TwinMeasurementsList } from "./TwinMeasurementsList";
import {
  parseTwinOverlayMeasurement,
  parseTwinOverlayPin,
  type TwinOverlayMeasurement,
  type TwinOverlayPin,
} from "./TwinSceneOverlays";

type Props = {
  viewer: {
    spaceId: string;
    modelId: string;
    viewerKind: TwinViewerKind;
    modelUrl: string;
    modelTitle: string;
  };
};

export function TwinViewerWorkspace({ viewer }: Props) {
  const [measureRefresh, setMeasureRefresh] = useState(0);
  const [layerVisible, setLayerVisible] = useState<TwinLayerVisibility>(defaultTwinLayerVisibility);
  const [overlayPins, setOverlayPins] = useState<TwinOverlayPin[]>([]);
  const [overlayMeasurements, setOverlayMeasurements] = useState<TwinOverlayMeasurement[]>([]);

  const loadOverlays = useCallback(async () => {
    const [collabRes, measureRes] = await Promise.all([
      fetch(`/api/digital-twin/collaboration?space_id=${viewer.spaceId}`),
      fetch(`/api/digital-twin/measurements?space_id=${viewer.spaceId}`),
    ]);

    const collabJson = (await collabRes.json().catch(() => ({}))) as {
      pins?: Array<{ id: string; title: string; position: unknown }>;
    };
    const measureJson = (await measureRes.json().catch(() => ({}))) as {
      measurements?: Array<{ id: string; start_point: unknown; end_point: unknown }>;
    };

    if (collabRes.ok) {
      setOverlayPins(
        (collabJson.pins ?? [])
          .map(parseTwinOverlayPin)
          .filter((p): p is TwinOverlayPin => p !== null),
      );
    }

    if (measureRes.ok) {
      setOverlayMeasurements(
        (measureJson.measurements ?? [])
          .map(parseTwinOverlayMeasurement)
          .filter((m): m is TwinOverlayMeasurement => m !== null),
      );
    }
  }, [viewer.spaceId]);

  useEffect(() => {
    void loadOverlays();
  }, [loadOverlays, measureRefresh]);

  const handleLayerToggle = (layerId: string, visible: boolean) => {
    setLayerVisible((prev) => ({ ...prev, [layerId]: visible }));
  };

  const handleMeasurementSaved = () => {
    setMeasureRefresh((n) => n + 1);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="relative min-h-0 flex-1">
        <TwinAuthenticatedViewer
          spaceId={viewer.spaceId}
          modelId={viewer.modelId}
          viewerKind={viewer.viewerKind}
          modelUrl={viewer.modelUrl}
          modelTitle={viewer.modelTitle}
          layerVisible={layerVisible}
          overlayPins={overlayPins}
          overlayMeasurements={overlayMeasurements}
          onMeasurementSaved={handleMeasurementSaved}
        />
      </div>

      <div className="shrink-0 grid gap-3 lg:grid-cols-2">
        <TwinLayersPanel visible={layerVisible} onToggle={handleLayerToggle} />
        <TwinMeasurementsList spaceId={viewer.spaceId} refreshToken={measureRefresh} />
      </div>
    </div>
  );
}
