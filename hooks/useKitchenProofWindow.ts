"use client";

import { useEffect } from "react";

import { type ProofApi } from "@/components/digital-twin/kitchen-proof/kitchen-proof-api";
import type { KitchenChromeApi } from "@/components/digital-twin/kitchen-proof/KitchenViewerChrome";
import type { TwinLayerRepresentation } from "@/lib/digital-twin/twin-epoch";
import type { ViewMode } from "@/lib/digital-twin/walkthrough-navigation";

export function useKitchenProofWindow(api: ProofApi): void {
  useEffect(() => {
    (window as unknown as { __kitchenProof?: ProofApi }).__kitchenProof = api;
    return () => {
      delete (window as unknown as { __kitchenProof?: ProofApi }).__kitchenProof;
    };
  });
}

export function kitchenProofApi(input: {
  requestLayer: (layer: TwinLayerRepresentation) => void;
  setView: (mode: ViewMode) => void;
  goStation: (id: string) => void;
  walkToStation: (id: string) => void;
  toggleMeasure: () => void;
  resetView: () => void;
  layer: TwinLayerRepresentation;
  fps: () => number;
  appearanceReady: () => boolean;
  splatStats: () => { loaded: number; numSh: number } | null;
  pose: () => { x: number; y: number; z: number; yaw: number; pitch: number };
  poseJump: (other: { x: number; y: number; z: number; yaw: number; pitch: number }) => number;
  chromeRef: { current: KitchenChromeApi | null };
  timings: ProofApi["timings"];
}): ProofApi {
  return {
    setLayer: input.requestLayer,
    setView: input.setView,
    goStation: input.goStation,
    walkToStation: input.walkToStation,
    toggleMeasure: input.toggleMeasure,
    resetView: input.resetView,
    layer: () => input.layer,
    fps: input.fps,
    appearanceReady: input.appearanceReady,
    splatStats: input.splatStats,
    pose: input.pose,
    poseJump: input.poseJump,
    openViewMenu: () => input.chromeRef.current?.setViewOpen(true),
    closeMenus: () => input.chromeRef.current?.closeMenus(),
    setChromeIdle: (value) => input.chromeRef.current?.setIdle(value),
    timings: input.timings,
  };
}
