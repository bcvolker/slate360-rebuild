"use client";

import type { ReactElement } from "react";

import {
  KitchenHelpCopy,
  KitchenLayerSwitch,
  KitchenStationBar,
  KitchenViewChoices,
} from "@/components/digital-twin/kitchen-proof/KitchenViewChoices";
import { ViewerBrandMark } from "@/components/shared/ViewerBrandMark";
import type { TwinLayerRepresentation } from "@/lib/digital-twin/twin-epoch";
import type { ViewMode, WalkStation } from "@/lib/digital-twin/walkthrough-navigation";

export function KitchenDesktopChrome({
  idle,
  layer,
  viewMode,
  measureActive,
  viewOpen,
  helpOpen,
  stations,
  currentStationId,
  title,
  capturedAt,
  onToggleView,
  onToggleHelp,
  onToggleMeasure,
  onLayer,
  onViewMode,
  onReset,
  onStation,
  onShare,
}: {
  idle: boolean;
  layer: TwinLayerRepresentation;
  viewMode: ViewMode;
  measureActive: boolean;
  viewOpen: boolean;
  helpOpen: boolean;
  stations: WalkStation[];
  currentStationId: string | null;
  title: string;
  capturedAt?: string | null;
  onToggleView: () => void;
  onToggleHelp: () => void;
  onToggleMeasure: () => void;
  onLayer: (layer: TwinLayerRepresentation) => void;
  onViewMode: (mode: ViewMode) => void;
  onReset: () => void;
  onStation: (id: string) => void;
  onShare: () => void;
}): ReactElement {
  return (
    <div className="kv-chrome pointer-events-none absolute inset-0 z-20" data-idle={idle} data-testid="kitchen-chrome">
      <div className="pointer-events-none absolute left-4 top-4 flex items-center gap-3">
        <ViewerBrandMark opacity={0.88} />
        <div className="min-w-0">
          <p className="truncate text-xs text-[var(--graphite-text-header)]">{title}</p>
          {capturedAt ? (
            <p className="font-mono text-[10px] uppercase tracking-wide text-[var(--graphite-muted)]">{capturedAt}</p>
          ) : null}
        </div>
      </div>
      <div className="pointer-events-auto absolute right-4 top-4 flex items-center gap-2">
        <KitchenLayerSwitch layer={layer} onLayer={onLayer} />
        <button type="button" className="kv-btn" data-testid="kitchen-share" onClick={onShare}>
          Share
        </button>
      </div>
      <div
        className="pointer-events-auto absolute bottom-4 left-4"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <KitchenStationBar stations={stations} currentId={currentStationId} onStation={onStation} />
      </div>
      <div
        className="pointer-events-auto absolute bottom-4 right-4 flex items-end gap-2"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <button
          type="button"
          className="kv-btn"
          data-testid="kitchen-tools"
          aria-label="Measure"
          aria-pressed={measureActive}
          data-active={measureActive}
          onClick={onToggleMeasure}
        >
          Measure
        </button>
        <div className="relative">
          <button
            type="button"
            className="kv-btn"
            data-testid="kitchen-view"
            aria-label="View"
            aria-expanded={viewOpen}
            onClick={onToggleView}
          >
            View
          </button>
          {viewOpen ? (
            <div className="absolute bottom-12 right-0">
              <KitchenViewChoices
                layer={layer}
                viewMode={viewMode}
                onLayer={onLayer}
                onViewMode={onViewMode}
                onReset={onReset}
                includeReset
                onPick={onToggleView}
              />
            </div>
          ) : null}
        </div>
        <div className="relative">
          <button
            type="button"
            className="kv-btn"
            data-testid="kitchen-help-btn"
            aria-label="Help"
            aria-expanded={helpOpen}
            onClick={onToggleHelp}
          >
            ?
          </button>
          {helpOpen ? (
            <div className="absolute bottom-12 right-0">
              <KitchenHelpCopy />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
