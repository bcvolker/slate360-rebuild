"use client";

import type { ReactElement } from "react";

import { KitchenHelpCopy, KitchenViewChoices } from "@/components/digital-twin/kitchen-proof/KitchenViewChoices";
import type { TwinLayerRepresentation } from "@/lib/digital-twin/twin-epoch";
import type { ViewMode } from "@/lib/digital-twin/walkthrough-navigation";

export function KitchenDesktopChrome({
  idle,
  layer,
  viewMode,
  measureActive,
  viewOpen,
  helpOpen,
  onToggleView,
  onToggleHelp,
  onToggleMeasure,
  onLayer,
  onViewMode,
  onReset,
}: {
  idle: boolean;
  layer: TwinLayerRepresentation;
  viewMode: ViewMode;
  measureActive: boolean;
  viewOpen: boolean;
  helpOpen: boolean;
  onToggleView: () => void;
  onToggleHelp: () => void;
  onToggleMeasure: () => void;
  onLayer: (layer: TwinLayerRepresentation) => void;
  onViewMode: (mode: ViewMode) => void;
  onReset: () => void;
}): ReactElement {
  return (
    <div className="kv-chrome pointer-events-none absolute inset-0 z-20" data-idle={idle} data-testid="kitchen-chrome">
      <div
        className="pointer-events-auto absolute bottom-4 left-4"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
          <button
            type="button"
            className="kv-btn"
            data-testid="kitchen-help-btn"
            aria-label="Help"
            aria-expanded={helpOpen}
            onClick={onToggleHelp}
          >
            Help
          </button>
        {helpOpen ? (
          <div className="absolute bottom-12 left-0">
            <KitchenHelpCopy />
          </div>
        ) : null}
      </div>
      <div
        className="pointer-events-auto absolute bottom-4 right-4 flex items-end gap-2"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <button
          type="button"
          className="kv-btn"
          data-testid="kitchen-tools"
          aria-label="Tools"
          aria-pressed={measureActive}
          data-active={measureActive}
          onClick={onToggleMeasure}
        >
          Tools
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
      </div>
    </div>
  );
}
