"use client";

import { useCallback, useEffect, useState, type ReactElement } from "react";

import { KitchenDesktopChrome } from "@/components/digital-twin/kitchen-proof/KitchenDesktopChrome";
import { KitchenMobileChrome } from "@/components/digital-twin/kitchen-proof/KitchenMobileChrome";
import "@/components/digital-twin/kitchen-proof/kitchen-viewer-chrome.css";
import { useCompactViewport, useKitchenIdleChrome } from "@/hooks/useKitchenIdleChrome";
import type { TwinLayerRepresentation } from "@/lib/digital-twin/twin-epoch";
import type { ViewMode } from "@/lib/digital-twin/walkthrough-navigation";

export type KitchenChromeApi = {
  idle: boolean;
  setIdle: (value: boolean) => void;
  viewOpen: boolean;
  moreOpen: boolean;
  helpOpen: boolean;
  setViewOpen: (value: boolean) => void;
  setMoreOpen: (value: boolean) => void;
  setHelpOpen: (value: boolean) => void;
  closeMenus: () => void;
  walkEnabled: boolean;
};

export function KitchenViewerChrome({
  layer,
  viewMode,
  measureActive,
  onLayer,
  onViewMode,
  onToggleMeasure,
  onReset,
  walkEnabled,
  onToggleMove,
  onApi,
}: {
  layer: TwinLayerRepresentation;
  viewMode: ViewMode;
  measureActive: boolean;
  onLayer: (layer: TwinLayerRepresentation) => void;
  onViewMode: (mode: ViewMode) => void;
  onToggleMeasure: () => void;
  onReset: () => void;
  walkEnabled: boolean;
  onToggleMove: () => void;
  onApi?: (api: KitchenChromeApi) => void;
}): ReactElement {
  const compact = useCompactViewport();
  const [viewOpen, setViewOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const hold = viewOpen || moreOpen || helpOpen || measureActive;
  const { idle, setIdle } = useKitchenIdleChrome(hold);

  const closeAll = useCallback(() => {
    setViewOpen(false);
    setMoreOpen(false);
    setHelpOpen(false);
  }, []);

  useEffect(() => {
    onApi?.({
      idle,
      setIdle,
      viewOpen,
      moreOpen,
      helpOpen,
      setViewOpen,
      setMoreOpen,
      setHelpOpen,
      closeMenus: closeAll,
      walkEnabled,
    });
  }, [closeAll, helpOpen, idle, moreOpen, onApi, setIdle, viewOpen, walkEnabled]);

  const share = useCallback(() => {
    void navigator.clipboard?.writeText(window.location.href);
    closeAll();
  }, [closeAll]);

  const fullscreen = useCallback(() => {
    if (!document.fullscreenElement) void document.documentElement.requestFullscreen();
    else void document.exitFullscreen();
    closeAll();
  }, [closeAll]);

  if (compact) {
    return (
      <KitchenMobileChrome
        idle={idle}
        layer={layer}
        viewMode={viewMode}
        walkEnabled={walkEnabled}
        viewOpen={viewOpen}
        moreOpen={moreOpen}
        helpOpen={helpOpen}
        onToggleMove={onToggleMove}
        onToggleView={() => {
          setMoreOpen(false);
          setHelpOpen(false);
          setViewOpen((v) => !v);
        }}
        onToggleMore={() => {
          setViewOpen(false);
          setHelpOpen(false);
          setMoreOpen((v) => !v);
        }}
        onLayer={onLayer}
        onViewMode={onViewMode}
        onReset={() => {
          onReset();
          closeAll();
        }}
        onShare={share}
        onFullscreen={fullscreen}
        onToggleHelp={() => {
          setMoreOpen(false);
          setHelpOpen((v) => !v);
        }}
      />
    );
  }

  return (
    <KitchenDesktopChrome
      idle={idle}
      layer={layer}
      viewMode={viewMode}
      measureActive={measureActive}
      viewOpen={viewOpen}
      helpOpen={helpOpen}
      onToggleView={() => {
        setHelpOpen(false);
        setViewOpen((v) => !v);
      }}
      onToggleHelp={() => {
        setViewOpen(false);
        setHelpOpen((v) => !v);
      }}
      onToggleMeasure={onToggleMeasure}
      onLayer={onLayer}
      onViewMode={onViewMode}
      onReset={onReset}
    />
  );
}
