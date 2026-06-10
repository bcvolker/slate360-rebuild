"use client";

import { useCallback, useEffect, useRef } from "react";
import { OrbitControls } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import type { SplatMesh } from "@sparkjsdev/spark";
import { exteriorOrbitDistanceLimits } from "@/lib/digital-twin/exterior-camera-frame";
import { frameSplatMeshExterior, getSplatSceneBounds } from "@/lib/digital-twin/splat-camera-frame";
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
  const { camera, gl, controls } = useThree();
  const orbit = controls as OrbitControlsImpl | null;
  const framedRef = useRef(false);
  const lastTapRef = useRef({ time: 0, x: 0, y: 0 });

  const applyExteriorFrame = useCallback(() => {
    if (!mesh?.isInitialized || !(camera instanceof THREE.PerspectiveCamera)) return;
    frameSplatMeshExterior(mesh, camera, orbit);
    if (orbit) {
      const limits = exteriorOrbitDistanceLimits(getSplatSceneBounds(mesh));
      orbit.minDistance = limits.minDistance;
      orbit.maxDistance = limits.maxDistance;
      orbit.update();
    }
  }, [camera, mesh, orbit]);

  useEffect(() => {
    framedRef.current = false;
  }, [mesh]);

  useEffect(() => {
    if (!active || !mesh?.isInitialized || framedRef.current) return;
    const id = window.requestAnimationFrame(() => {
      framedRef.current = true;
      applyExteriorFrame();
    });
    return () => window.cancelAnimationFrame(id);
  }, [active, mesh, applyExteriorFrame]);

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
      makeDefault
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
