"use client";

import { useCallback, useEffect, useRef } from "react";
import { OrbitControls } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import type { SplatMesh } from "@sparkjsdev/spark";
import { exteriorOrbitDistanceLimits } from "@/lib/digital-twin/exterior-camera-frame";
import {
  frameSplatMeshExterior,
  getSplatSceneBounds,
  logSplatFramingBounds,
} from "@/lib/digital-twin/splat-camera-frame";
import { raycastSplatMesh } from "@/lib/digital-twin/splat-raycast";
import {
  DOUBLE_TAP_MS,
  ORBIT_DAMPING,
  ORBIT_PAN_SPEED,
  ORBIT_ROTATE_SPEED,
  ORBIT_ZOOM_SPEED,
} from "@/components/digital-twin/splat-viewer-constants";

export function SplatOverviewNavigation({
  mesh,
  active,
  resetToken,
  pickEnabled,
  onPick,
  onEnterInterior,
}: {
  mesh: SplatMesh;
  active: boolean;
  resetToken: number;
  pickEnabled: boolean;
  onPick?: (point: { x: number; y: number; z: number }) => void;
  onEnterInterior: (point: THREE.Vector3) => void;
}) {
  const { camera, gl } = useThree();
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const loggedBoundsRef = useRef(false);
  const lastTapRef = useRef({ time: 0, x: 0, y: 0 });

  const applyExteriorFrame = useCallback(() => {
    if (!mesh?.isInitialized || !(camera instanceof THREE.PerspectiveCamera)) return;
    const controls = controlsRef.current;
    if (!controls) return;

    if (!loggedBoundsRef.current) {
      loggedBoundsRef.current = true;
      logSplatFramingBounds(mesh);
    }

    frameSplatMeshExterior(mesh, camera, controls);
    const limits = exteriorOrbitDistanceLimits(getSplatSceneBounds(mesh));
    controls.minDistance = limits.minDistance;
    controls.maxDistance = limits.maxDistance;
    controls.update();
  }, [camera, mesh]);

  useEffect(() => {
    loggedBoundsRef.current = false;
  }, [mesh]);

  useEffect(() => {
    if (!active || !mesh?.isInitialized) return;
    const id = window.requestAnimationFrame(() => applyExteriorFrame());
    return () => window.cancelAnimationFrame(id);
  }, [active, mesh, mesh?.isInitialized, applyExteriorFrame]);

  useEffect(() => {
    if (!active || resetToken <= 0) return;
    applyExteriorFrame();
  }, [active, resetToken, applyExteriorFrame]);

  useEffect(() => {
    if (!active) return;
    const canvas = gl.domElement;

    const activateAt = (clientX: number, clientY: number) => {
      if (!(camera instanceof THREE.PerspectiveCamera)) return;
      const hit = raycastSplatMesh(mesh, camera, clientX, clientY, canvas);
      if (!hit) return;
      if (pickEnabled && onPick) {
        onPick({ x: hit.point.x, y: hit.point.y, z: hit.point.z });
        return;
      }
      onEnterInterior(hit.point);
    };

    const onDoubleClick = (event: MouseEvent) => {
      event.preventDefault();
      activateAt(event.clientX, event.clientY);
    };

    const onPointerUp = (event: PointerEvent) => {
      if (event.pointerType !== "touch" || event.button !== 0) return;
      const now = performance.now();
      const near =
        Math.hypot(event.clientX - lastTapRef.current.x, event.clientY - lastTapRef.current.y) < 18;
      const isDouble = near && now - lastTapRef.current.time < DOUBLE_TAP_MS;
      lastTapRef.current = { time: now, x: event.clientX, y: event.clientY };
      if (isDouble) activateAt(event.clientX, event.clientY);
    };

    canvas.addEventListener("dblclick", onDoubleClick);
    canvas.addEventListener("pointerup", onPointerUp);
    return () => {
      canvas.removeEventListener("dblclick", onDoubleClick);
      canvas.removeEventListener("pointerup", onPointerUp);
    };
  }, [active, camera, gl, mesh, onEnterInterior, onPick, pickEnabled]);

  if (!active) return null;

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      domElement={gl.domElement}
      enableDamping
      dampingFactor={ORBIT_DAMPING}
      rotateSpeed={ORBIT_ROTATE_SPEED}
      zoomSpeed={ORBIT_ZOOM_SPEED}
      panSpeed={ORBIT_PAN_SPEED}
      enablePan
      enableZoom
      enableRotate
      screenSpacePanning={false}
      mouseButtons={{
        LEFT: THREE.MOUSE.ROTATE,
        MIDDLE: THREE.MOUSE.DOLLY,
        RIGHT: THREE.MOUSE.PAN,
      }}
      touches={{
        ONE: THREE.TOUCH.ROTATE,
        TWO: THREE.TOUCH.DOLLY_PAN,
      }}
    />
  );
}
