"use client";

import type { ReactElement } from "react";

import { KitchenAppearanceStatus } from "@/components/digital-twin/kitchen-proof/KitchenAppearanceStatus";
import { KitchenFirstHint } from "@/components/digital-twin/kitchen-proof/KitchenFirstHint";
import { KitchenProofDebug } from "@/components/digital-twin/kitchen-proof/KitchenProofDebug";
import { KitchenWebglRecovery } from "@/components/digital-twin/kitchen-proof/KitchenWebglRecovery";
import { KitchenViewerChrome, type KitchenChromeApi } from "@/components/digital-twin/kitchen-proof/KitchenViewerChrome";
import { HybridMeasureHud } from "@/components/digital-twin/hybrid/HybridMeasureHud";
import type { HybridMeasureTool } from "@/hooks/useHybridMeasureTool";
import type { TwinLayerRepresentation } from "@/lib/digital-twin/twin-epoch";
import type { ViewMode, WalkStation } from "@/lib/digital-twin/walkthrough-navigation";

export function KitchenProofOverlays({
  hint,
  onHintUsed,
  webglLost,
  status,
  onRetry,
  measure,
  layer,
  viewMode,
  onLayer,
  onViewMode,
  onToggleMeasure,
  onReset,
  walkEnabled,
  onToggleMove,
  stations,
  currentStationId,
  onStation,
  onChromeApi,
  debug,
  debugStats,
}: {
  hint: boolean;
  onHintUsed: () => void;
  webglLost: boolean;
  status: { message: string; retry: boolean } | null;
  onRetry: () => void;
  measure: HybridMeasureTool;
  layer: TwinLayerRepresentation;
  viewMode: ViewMode;
  onLayer: (layer: TwinLayerRepresentation) => void;
  onViewMode: (mode: ViewMode) => void;
  onToggleMeasure: () => void;
  onReset: () => void;
  walkEnabled: boolean;
  onToggleMove: () => void;
  stations: WalkStation[];
  currentStationId: string | null;
  onStation: (id: string) => void;
  onChromeApi: (api: KitchenChromeApi) => void;
  debug: boolean;
  debugStats: Parameters<typeof KitchenProofDebug>[0]["stats"];
}): ReactElement {
  return (
    <>
      <KitchenFirstHint visible={hint} onUsed={onHintUsed} />
      <KitchenWebglRecovery lost={webglLost} onReload={() => window.location.reload()} />
      <KitchenAppearanceStatus message={status?.message ?? null} retry={Boolean(status?.retry)} onRetry={onRetry} />
      <HybridMeasureHud tool={measure} metricAvailable />
      <KitchenViewerChrome
        layer={layer}
        viewMode={viewMode}
        measureActive={measure.active}
        onLayer={onLayer}
        onViewMode={onViewMode}
        onToggleMeasure={onToggleMeasure}
        onReset={onReset}
        walkEnabled={walkEnabled}
        onToggleMove={onToggleMove}
        stations={stations}
        currentStationId={currentStationId}
        onStation={onStation}
        title="Kitchen"
        capturedAt="Metric twin"
        onApi={onChromeApi}
      />
      {debug ? <KitchenProofDebug stats={debugStats} /> : null}
    </>
  );
}
