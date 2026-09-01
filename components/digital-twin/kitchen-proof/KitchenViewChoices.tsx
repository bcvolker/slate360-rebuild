"use client";

import type { ReactElement } from "react";

import { LAYER_ITEMS, VIEW_ITEMS } from "@/components/digital-twin/kitchen-proof/kitchen-chrome-items";
import type { TwinLayerRepresentation } from "@/lib/digital-twin/twin-epoch";
import type { ViewMode } from "@/lib/digital-twin/walkthrough-navigation";

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
      {LAYER_ITEMS.map((item) => (
        <button
          key={item.id}
          type="button"
          role="menuitemradio"
          aria-pressed={layer === item.id && viewMode === "inside"}
          onClick={() => {
            onViewMode("inside");
            onLayer(item.id);
            onPick?.();
          }}
        >
          {item.label}
        </button>
      ))}
      <div className="kv-sep" />
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
      <p className="kv-hint border-0 bg-transparent p-0">Move · WASD or tap floor</p>
      <p className="kv-hint border-0 bg-transparent p-0">Zoom · scroll</p>
    </div>
  );
}
