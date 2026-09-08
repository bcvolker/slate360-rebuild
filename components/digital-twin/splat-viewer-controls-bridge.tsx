"use client";

import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import type {
  CameraMode,
  SplatCameraPose,
  SplatViewerHandle,
} from "@/components/digital-twin/splat-viewer-constants";
import {
  INTERIOR_MAX_ZOOM,
  INTERIOR_MIN_ZOOM,
  ZOOM_WHEEL_FACTOR,
} from "@/components/digital-twin/splat-viewer-constants";
import { useCameraSyncBridge } from "@/lib/digital-twin/splat-camera-sync";

/** Exposes zoom / recenter / camera-pose control of the live scene through `apiRef`. */
export function ControlsBridge({
  apiRef,
  cameraMode,
  onRecenter,
  zoomRef,
  onCameraChange,
}: {
  apiRef: React.MutableRefObject<SplatViewerHandle | null>;
  cameraMode: CameraMode;
  onRecenter: () => void;
  zoomRef: React.MutableRefObject<number>;
  /** D2: fired on every live orbit change (drag/zoom/pan), NOT fired for
   * changes this instance applied itself via setCameraPose (echo-suppressed
   * via isSyncingRef) — lets two viewers drive each other without a loop. */
  onCameraChange?: (pose: SplatCameraPose) => void;
}) {
  const { controls } = useThree();
  const orbit = controls as OrbitControlsImpl | null;
  const { getCameraPose, setCameraPose } = useCameraSyncBridge(orbit, onCameraChange);

  useEffect(() => {
    apiRef.current = {
      zoomIn: () => {
        if (cameraMode === "orbit") {
          orbit?.dollyIn(1.12);
          orbit?.update();
          return;
        }
        zoomRef.current = THREE.MathUtils.clamp(
          zoomRef.current / ZOOM_WHEEL_FACTOR,
          INTERIOR_MIN_ZOOM,
          INTERIOR_MAX_ZOOM,
        );
      },
      zoomOut: () => {
        if (cameraMode === "orbit") {
          orbit?.dollyOut(1.12);
          orbit?.update();
          return;
        }
        zoomRef.current = THREE.MathUtils.clamp(
          zoomRef.current * ZOOM_WHEEL_FACTOR,
          INTERIOR_MIN_ZOOM,
          INTERIOR_MAX_ZOOM,
        );
      },
      recenter: onRecenter,
      getCameraPose,
      setCameraPose,
    };
    return () => {
      apiRef.current = null;
    };
  }, [apiRef, cameraMode, orbit, onRecenter, zoomRef, getCameraPose, setCameraPose]);

  return null;
}
