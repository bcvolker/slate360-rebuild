"use client";

import type { ReactElement } from "react";

import {
  KitchenHelpCopy,
  KitchenLayerSwitch,
  KitchenStationBar,
  KitchenViewChoices,
} from "@/components/digital-twin/kitchen-proof/KitchenViewChoices";
import type { TwinLayerRepresentation } from "@/lib/digital-twin/twin-epoch";
import type { ViewMode, WalkStation } from "@/lib/digital-twin/walkthrough-navigation";

export function KitchenMobileChrome({
  idle,
  layer,
  viewMode,
  walkEnabled,
  viewOpen,
  moreOpen,
  helpOpen,
  stations,
  currentStationId,
  onToggleMove,
  onToggleView,
  onToggleMore,
  onLayer,
  onViewMode,
  onReset,
  onStation,
  onShare,
  onFullscreen,
  onToggleHelp,
  onToggleMeasure,
  measureActive,
}: {
  idle: boolean;
  layer: TwinLayerRepresentation;
  viewMode: ViewMode;
  walkEnabled: boolean;
  viewOpen: boolean;
  moreOpen: boolean;
  helpOpen: boolean;
  stations: WalkStation[];
  currentStationId: string | null;
  onToggleMove: () => void;
  onToggleView: () => void;
  onToggleMore: () => void;
  onLayer: (layer: TwinLayerRepresentation) => void;
  onViewMode: (mode: ViewMode) => void;
  onReset: () => void;
  onStation: (id: string) => void;
  onShare: () => void;
  onFullscreen: () => void;
  onToggleHelp: () => void;
  onToggleMeasure: () => void;
  measureActive: boolean;
}): ReactElement {
  void onToggleMove;
  void onToggleMore;
  return (
    <div className="kv-chrome pointer-events-none absolute inset-0 z-20" data-idle={idle} data-testid="kitchen-chrome" data-walk={walkEnabled ? "on" : "off"}>
      <div className="pointer-events-auto absolute right-3 top-3">
        <KitchenLayerSwitch layer={layer} onLayer={onLayer} />
      </div>
      <div
        className="pointer-events-auto absolute inset-x-0 bottom-0"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 0.75rem)" }}
      >
        <div className="px-3 pb-2">
          <KitchenStationBar stations={stations} currentId={currentStationId} onStation={onStation} />
        </div>
        {viewOpen ? (
          <div className="kv-sheet px-3 pb-2 pt-3" data-testid="kitchen-view-sheet">
            <KitchenViewChoices
              layer={layer}
              viewMode={viewMode}
              onLayer={onLayer}
              onViewMode={onViewMode}
              onReset={onReset}
              includeReset={false}
              onPick={onToggleView}
            />
          </div>
        ) : null}
        {moreOpen ? (
          <div className="kv-menu mx-3 mb-2" data-testid="kitchen-more-sheet">
            <button type="button" onClick={onReset}>Reset</button>
            <button type="button" onClick={onToggleHelp}>Help</button>
            <button type="button" onClick={onShare}>Share</button>
            <button type="button" onClick={onFullscreen}>Fullscreen</button>
          </div>
        ) : null}
        {helpOpen ? (
          <div className="px-3 pb-2">
            <KitchenHelpCopy />
          </div>
        ) : null}
        <div className="flex justify-center gap-2 px-4">
          <button type="button" className="kv-btn min-h-11 min-w-11" data-testid="kitchen-view" aria-expanded={viewOpen} onClick={onToggleView}>
            View
          </button>
          <button
            type="button"
            className="kv-btn min-h-11 min-w-11"
            data-testid="kitchen-tools"
            aria-pressed={measureActive}
            data-active={measureActive}
            onClick={onToggleMeasure}
          >
            Measure
          </button>
        </div>
      </div>
    </div>
  );
}
