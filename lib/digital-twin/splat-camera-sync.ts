import { useEffect, useRef } from "react";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import type { SplatCameraPose } from "@/components/digital-twin/splat-viewer-constants";

/**
 * D2: read/write/subscribe bridge for a live OrbitControls instance, used to
 * sync two independently-mounted viewers (progression compare) via an
 * imperative ref-to-ref channel — no React state, so a drag on one canvas
 * doesn't force re-renders on the other. `setCameraPose` calls are
 * echo-suppressed so two viewers can drive each other without a feedback loop.
 */
export function useCameraSyncBridge(
  orbit: OrbitControlsImpl | null,
  onCameraChange?: (pose: SplatCameraPose) => void,
) {
  const isSyncingRef = useRef(false);

  useEffect(() => {
    if (!orbit || !onCameraChange) return;
    const handleChange = () => {
      if (isSyncingRef.current) return;
      const cam = orbit.object;
      onCameraChange({
        position: [cam.position.x, cam.position.y, cam.position.z],
        target: [orbit.target.x, orbit.target.y, orbit.target.z],
      });
    };
    orbit.addEventListener("change", handleChange);
    return () => orbit.removeEventListener("change", handleChange);
  }, [orbit, onCameraChange]);

  return {
    getCameraPose: (): SplatCameraPose | null => {
      if (!orbit) return null;
      const cam = orbit.object;
      return {
        position: [cam.position.x, cam.position.y, cam.position.z],
        target: [orbit.target.x, orbit.target.y, orbit.target.z],
      };
    },
    setCameraPose: (pose: SplatCameraPose) => {
      if (!orbit) return;
      isSyncingRef.current = true;
      orbit.object.position.set(...pose.position);
      orbit.target.set(...pose.target);
      // Dispatches 'change' synchronously when anything moved — the guard
      // can drop the instant update() returns.
      orbit.update();
      isSyncingRef.current = false;
    },
  };
}
