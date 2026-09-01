"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";

import type { TwinLayerRepresentation } from "@/lib/digital-twin/twin-epoch";

export type ProofApi = {
  setLayer: (layer: TwinLayerRepresentation) => void;
  setView: (mode: "inside" | "dollhouse" | "floorplan") => void;
  goStation: (id: string) => void;
  toggleMeasure: () => void;
  resetView: () => void;
  layer: () => TwinLayerRepresentation;
  fps: () => number;
  appearanceReady: () => boolean;
  pose: () => { x: number; y: number; z: number; yaw: number; pitch: number };
  poseJump: (other: { x: number; y: number; z: number; yaw: number; pitch: number }) => number;
  walkToStation: (id: string) => void;
  timings: () => {
    displayMs: number | null;
    navMs: number | null;
    appearanceMs: number | null;
    firstUsefulMs: number | null;
    geometryReadyMs: number | null;
    appearanceReadyMs: number | null;
    memoryMb: number | null;
  };
};

export function FpsProbe({ fpsRef }: { fpsRef: React.MutableRefObject<number> }): null {
  const acc = useRef({ t: 0, n: 0 });
  useFrame((_, delta) => {
    acc.current.t += delta;
    acc.current.n += 1;
    if (acc.current.t >= 0.5) {
      fpsRef.current = acc.current.n / acc.current.t;
      acc.current = { t: 0, n: 0 };
    }
  });
  return null;
}
