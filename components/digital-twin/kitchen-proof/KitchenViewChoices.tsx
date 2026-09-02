"use client";

import type { ReactElement } from "react";

import { HYBRID_LABEL, VIEW_ITEMS } from "@/components/digital-twin/kitchen-proof/kitchen-chrome-items";
import type { TwinLayerRepresentation } from "@/lib/digital-twin/twin-epoch";
import type { ViewMode, WalkStation } from "@/lib/digital-twin/walkthrough-navigation";

export function KitchenViewChoices({
  layer,
  viewMode,
  onLayer,
  onViewMode,
  onReset,
  includeReset,
  onPick,
}: {
  layer: TwinLayerRepresentation;
  viewMode: ViewMode;
  onLayer: (layer: TwinLayerRepresentation) => void;
  onViewMode: (mode: ViewMode) => void;
  onReset: () => void;
  includeReset: boolean;
  onPick?: () => void;
}): ReactElement {
  return (
    <div className="kv-menu" role="menu">
      {VIEW_ITEMS.map((item) => (
        <button
          key={item.id}
          type="button"
          role="menuitemradio"
          aria-pressed={viewMode === item.id}
          onClick={() => {
            onViewMode(item.id);
            onPick?.();
          }}
        >
          {item.label}
        </button>
      ))}
      <div className="kv-sep" />
      <button
        type="button"
        role="menuitemradio"
        aria-pressed={layer === "hybrid" && viewMode === "inside"}
        data-testid="kitchen-hybrid"
        onClick={() => {
          onViewMode("inside");
          onLayer("hybrid");
          onPick?.();
        }}
      >
        {HYBRID_LABEL}
      </button>
      {includeReset ? (
        <>
          <div className="kv-sep" />
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              onReset();
              onPick?.();
            }}
          >
            Reset
          </button>
        </>
      ) : null}
    </div>
  );
}

export function KitchenHelpCopy(): ReactElement {
  return (
    <div className="kv-menu max-w-xs space-y-2 p-3" data-testid="kitchen-help">
      <p className="kv-hint border-0 bg-transparent p-0">Look · drag</p>
      <p className="kv-hint border-0 bg-transparent p-0">Move · tap floor</p>
      <p className="kv-hint border-0 bg-transparent p-0">Zoom · scroll</p>
      <p className="kv-hint border-0 bg-transparent p-0">Measure · LiDAR geometry</p>
    </div>
  );
}

export function KitchenStationBar({
  stations,
  currentId,
  onStation,
}: {
  stations: WalkStation[];
  currentId: string | null;
  onStation: (id: string) => void;
}): ReactElement {
  return (
    <div className="flex flex-wrap gap-1" data-testid="kitchen-stations">
      {stations.map((station) => (
        <button
          key={station.id}
          type="button"
          className="kv-btn"
          data-active={station.id === currentId}
          aria-pressed={station.id === currentId}
          onClick={() => onStation(station.id)}
        >
          {station.id}
        </button>
      ))}
    </div>
  );
}

export function KitchenLayerSwitch({
  layer,
  onLayer,
}: {
  layer: TwinLayerRepresentation;
  onLayer: (layer: TwinLayerRepresentation) => void;
}): ReactElement {
  const active = layer === "hybrid" ? "reality" : layer;
  return (
    <div className="flex gap-1" data-testid="kitchen-layer-switch">
      <button
        type="button"
        className="kv-btn"
        data-testid="kitchen-layer-reality"
        aria-pressed={active === "reality"}
        data-active={active === "reality"}
        onClick={() => onLayer("reality")}
      >
        Reality
      </button>
      <button
        type="button"
        className="kv-btn"
        data-testid="kitchen-layer-geometry"
        aria-pressed={layer === "geometry"}
        data-active={layer === "geometry"}
        onClick={() => onLayer("geometry")}
      >
        Geometry
      </button>
    </div>
  );
}
