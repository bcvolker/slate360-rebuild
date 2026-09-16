"use client";

import { useCallback, useEffect, useRef } from "react";
import { OrbitControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import type { SplatMesh } from "@sparkjsdev/spark";
import { OrbitCameraTweenRunner } from "@/lib/digital-twin/orbit-camera-tween";
import {
  clampOrbitTargetToBounds,
  isBoundsVisibleOnScreen,
  projectBoundsToScreen,
  type TwinSplatFramingReport,
} from "@/lib/digital-twin/splat-orbit-guard";
import {
  applyOverviewHomeFrame,
  type OverviewHomeFrame,
} from "@/lib/digital-twin/splat-overview-home";
import { raycastSplatMesh } from "@/lib/digital-twin/splat-raycast";
import type { SplatManifest } from "@/lib/digital-twin/twin-manifest";
import {
  DOUBLE_TAP_MS,
  ORBIT_DAMPING,
  ORBIT_PAN_SPEED,
  ORBIT_ROTATE_SPEED,
  ORBIT_ZOOM_SPEED,
} from "@/components/digital-twin/splat-viewer-constants";

declare global {
  interface Window {
    __TWIN_SPLAT_FRAMING__?: TwinSplatFramingReport;
  }
}

export function SplatOverviewNavigation({
  mesh,
  active,
  resetToken,
  pickEnabled,
  onPick,
  onEnterInterior,
  repositionMode = false,
  manifest = null,
  freeOrbit = false,
  invertOrbit = false,
  planView = false,
}: {
  mesh: SplatMesh;
  active: boolean;
  resetToken: number;
  pickEnabled: boolean;
  onPick?: (point: { x: number; y: number; z: number }) => void;
  onEnterInterior: (point: THREE.Vector3) => void;
  repositionMode?: boolean;
  manifest?: SplatManifest | null;
  freeOrbit?: boolean;
  invertOrbit?: boolean;
  planView?: boolean;
}) {
  const { camera, gl, size } = useThree();
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const homeRef = useRef<OverviewHomeFrame | null>(null);
  const tweenRef = useRef(new OrbitCameraTweenRunner());
  const initialFramedRef = useRef(false);
  const lastTapRef = useRef({ time: 0, x: 0, y: 0 });
  const planSnappedRef = useRef(false);
  const tweenPose = useRef({
    position: new THREE.Vector3(),
    target: new THREE.Vector3(),
  });

  const publishFramingReport = useCallback(() => {
    if (!(camera instanceof THREE.PerspectiveCamera) || !homeRef.current) return;
    const bounds = homeRef.current.bounds;
    const screenRect = projectBoundsToScreen(bounds, camera, size.width, size.height);
    const controls = controlsRef.current;
    const report: TwinSplatFramingReport = {
      viewport: { width: size.width, height: size.height },
      screenRect,
      fullyVisible: isBoundsVisibleOnScreen(bounds, camera, size.width, size.height),
      homeDistance: homeRef.current.homeDistance,
      cameraPosition: [camera.position.x, camera.position.y, camera.position.z],
      orbitTarget: controls
        ? [controls.target.x, controls.target.y, controls.target.z]
        : [homeRef.current.target.x, homeRef.current.target.y, homeRef.current.target.z],
    };
    if (typeof window !== "undefined") window.__TWIN_SPLAT_FRAMING__ = report;
  }, [camera, size.height, size.width]);

  const applyHome = useCallback(
    (options?: { log?: boolean; animate?: boolean }) => {
      if (!mesh?.isInitialized || !(camera instanceof THREE.PerspectiveCamera)) return;
      const controls = controlsRef.current;
      if (!controls) return;

      camera.aspect = size.width / Math.max(size.height, 1);
      const home = applyOverviewHomeFrame(mesh, camera, controls, {
        logLabel: options?.log ? "splat-overview-home" : undefined,
        manifest,
      });
      homeRef.current = home;

      if (options?.animate) {
        tweenRef.current.start(
          { position: camera.position.clone(), target: controls.target.clone() },
          { position: home.position.clone(), target: home.target.clone() },
          850,
        );
      } else {
        tweenRef.current.cancel();
      }
      publishFramingReport();
    },
    [camera, mesh, manifest, publishFramingReport, size.height, size.width],
  );

  useEffect(() => {
    initialFramedRef.current = false;
  }, [mesh]);

  useEffect(() => {
    if (!active || !(camera instanceof THREE.PerspectiveCamera) || !mesh?.isInitialized) return;
    camera.aspect = size.width / Math.max(size.height, 1);
    camera.updateProjectionMatrix();
  }, [active, camera, mesh?.isInitialized, size.height, size.width]);

  useEffect(() => {
    if (!active || !mesh?.isInitialized) return;
    let cancelled = false;
    const tryFrame = () => {
      if (cancelled) return;
      if (!controlsRef.current) {
        window.requestAnimationFrame(tryFrame);
        return;
      }
      if (!initialFramedRef.current) {
        applyHome({ log: true });
        initialFramedRef.current = true;
      }
    };
    window.requestAnimationFrame(tryFrame);
    return () => {
      cancelled = true;
    };
  }, [active, applyHome, mesh, mesh?.isInitialized]);

  useEffect(() => {
    if (!active || resetToken <= 0) return;
    applyHome({ animate: true });
  }, [active, applyHome, resetToken]);

  useEffect(() => {
    if (!active) return;
    const controls = controlsRef.current;
    if (!controls || !homeRef.current) return;

    // Re-entrancy guard: controls.update() re-dispatches "change" while damping,
    // which recursed into this handler until the stack overflowed (RangeError
    // on every drag, so the model would not spin). Only the clamped path needs
    // the extra update; freeOrbit (aerial) needs neither.
    let inChange = false;
    const onChange = () => {
      if (inChange || freeOrbit || tweenRef.current.isRunning()) return;
      inChange = true;
      try {
        clampOrbitTargetToBounds(controls.target, homeRef.current!.bounds);
        controls.update();
      } finally {
        inChange = false;
      }
    };

    const onEnd = () => {
      if (tweenRef.current.isRunning() || !(camera instanceof THREE.PerspectiveCamera)) return;
      if (!freeOrbit && !isBoundsVisibleOnScreen(homeRef.current!.bounds, camera, size.width, size.height)) {
        applyHome({ animate: true });
      }
      publishFramingReport();
    };

    controls.addEventListener("change", onChange);
    controls.addEventListener("end", onEnd);
    return () => {
      controls.removeEventListener("change", onChange);
      controls.removeEventListener("end", onEnd);
    };
  }, [active, applyHome, camera, freeOrbit, publishFramingReport, size.height, size.width]);

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
      const controls = controlsRef.current;
      if (!controls) return;
      const offset = camera.position.clone().sub(controls.target);
      const newTarget = hit.point.clone();
      const newPosition = newTarget.clone().add(offset);
      tweenRef.current.start(
        { position: camera.position.clone(), target: controls.target.clone() },
        { position: newPosition, target: newTarget },
        500,
      );
    };

    const enterWalkAt = (clientX: number, clientY: number) => {
      const hit = raycastSplatMesh(mesh, camera, clientX, clientY, canvas);
      if (hit) onEnterInterior(hit.point);
    };

    const onDoubleClick = (event: MouseEvent) => {
      event.preventDefault();
      if (freeOrbit) {
        enterWalkAt(event.clientX, event.clientY);
        return;
      }
      activateAt(event.clientX, event.clientY);
    };

    const onPointerUp = (event: PointerEvent) => {
      if (event.pointerType !== "touch" || event.button !== 0) return;
      const now = performance.now();
      const near =
        Math.hypot(event.clientX - lastTapRef.current.x, event.clientY - lastTapRef.current.y) < 18;
      const isDouble = near && now - lastTapRef.current.time < DOUBLE_TAP_MS;
      lastTapRef.current = { time: now, x: event.clientX, y: event.clientY };
      if (!isDouble) return;
      if (freeOrbit) enterWalkAt(event.clientX, event.clientY);
      else activateAt(event.clientX, event.clientY);
    };

    canvas.addEventListener("dblclick", onDoubleClick);
    canvas.addEventListener("pointerup", onPointerUp);
    return () => {
      canvas.removeEventListener("dblclick", onDoubleClick);
      canvas.removeEventListener("pointerup", onPointerUp);
    };
  }, [active, camera, freeOrbit, gl, mesh, onEnterInterior, onPick, pickEnabled]);

  useFrame(() => {
    if (!active || !(camera instanceof THREE.PerspectiveCamera)) return;
    const controls = controlsRef.current;
    if (!controls) return;
    if (planView && !planSnappedRef.current) {
      const dist = Math.max(camera.position.distanceTo(controls.target), homeRef.current?.homeDistance ?? 1);
      camera.position.set(controls.target.x, controls.target.y + dist, controls.target.z);
      controls.update();
      planSnappedRef.current = true;
    }
    if (!planView) planSnappedRef.current = false;
    if (tweenRef.current.step(performance.now(), tweenPose.current)) {
      camera.position.copy(tweenPose.current.position);
      controls.target.copy(tweenPose.current.target);
      camera.lookAt(controls.target);
      controls.update();
    }
  });

  if (!active) return null;

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      domElement={gl.domElement}
      enableDamping
      dampingFactor={ORBIT_DAMPING}
      rotateSpeed={invertOrbit ? -ORBIT_ROTATE_SPEED : ORBIT_ROTATE_SPEED}
      zoomSpeed={ORBIT_ZOOM_SPEED}
      panSpeed={ORBIT_PAN_SPEED}
      enablePan
      enableZoom
      enableRotate
      minPolarAngle={planView ? 0 : 0}
      maxPolarAngle={planView ? 0.22 : Math.PI}
      screenSpacePanning
      mouseButtons={{
        LEFT: repositionMode ? THREE.MOUSE.PAN : THREE.MOUSE.ROTATE,
        MIDDLE: THREE.MOUSE.DOLLY,
        RIGHT: repositionMode ? THREE.MOUSE.ROTATE : THREE.MOUSE.PAN,
      }}
      touches={{
        ONE: repositionMode ? THREE.TOUCH.PAN : THREE.TOUCH.ROTATE,
        TWO: THREE.TOUCH.DOLLY_PAN,
      }}
    />
  );
}
