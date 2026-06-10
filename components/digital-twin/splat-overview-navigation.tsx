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
}: {
  mesh: SplatMesh;
  active: boolean;
  resetToken: number;
  pickEnabled: boolean;
  onPick?: (point: { x: number; y: number; z: number }) => void;
  onEnterInterior: (point: THREE.Vector3) => void;
}) {
  const { camera, gl, size } = useThree();
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const homeRef = useRef<OverviewHomeFrame | null>(null);
  const tweenRef = useRef(new OrbitCameraTweenRunner());
  const initialFramedRef = useRef(false);
  const lastTapRef = useRef({ time: 0, x: 0, y: 0 });
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
    [camera, mesh, publishFramingReport, size.height, size.width],
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

    const onChange = () => {
      if (tweenRef.current.isRunning()) return;
      clampOrbitTargetToBounds(controls.target, homeRef.current!.bounds);
      controls.update();
    };

    const onEnd = () => {
      if (tweenRef.current.isRunning() || !(camera instanceof THREE.PerspectiveCamera)) return;
      if (!isBoundsVisibleOnScreen(homeRef.current!.bounds, camera, size.width, size.height)) {
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
  }, [active, applyHome, camera, publishFramingReport, size.height, size.width]);

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

  useFrame(() => {
    if (!active || !(camera instanceof THREE.PerspectiveCamera)) return;
    const controls = controlsRef.current;
    if (!controls) return;
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
