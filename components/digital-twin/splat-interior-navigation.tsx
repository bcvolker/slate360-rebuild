"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { SplatMesh } from "@sparkjsdev/spark";
import { CameraTweenRunner } from "@/lib/digital-twin/camera-tween";
import {
  directionFromYawPitch,
  eyePositionFromHit,
  type InteriorCameraFrame,
} from "@/lib/digital-twin/interior-camera-frame";
import { frameSplatMeshInterior, getSplatSceneBounds } from "@/lib/digital-twin/splat-camera-frame";
import { raycastSplatMesh } from "@/lib/digital-twin/splat-raycast";
import type { SplatManifest } from "@/lib/digital-twin/twin-manifest";
import {
  INTERIOR_MAX_ZOOM,
  INTERIOR_MIN_ZOOM,
  LOOK_SENSITIVITY,
  TAP_DRAG_THRESHOLD_PX,
  ZOOM_WHEEL_FACTOR,
  type TwinPickPoint,
} from "@/components/digital-twin/splat-viewer-constants";

export function SplatInteriorNavigation({
  mesh,
  active,
  pickEnabled,
  onPick,
  defaultFrameRef,
  resetToken,
  zoomRef,
  entryHit,
  onEntryHitConsumed,
  manifest = null,
}: {
  mesh: SplatMesh;
  active: boolean;
  pickEnabled: boolean;
  onPick?: (point: TwinPickPoint) => void;
  defaultFrameRef: React.MutableRefObject<InteriorCameraFrame | null>;
  resetToken: number;
  zoomRef: React.MutableRefObject<number>;
  entryHit?: THREE.Vector3 | null;
  onEntryHitConsumed?: () => void;
  /** R8.2: worker-baked initial_camera — walk mode starts here (eye height on
   * the detected floor) instead of the bounds-based default when present. */
  manifest?: SplatManifest | null;
}) {
  const { camera, gl } = useThree();
  const boundsRef = useRef<THREE.Box3 | null>(null);
  const stateRef = useRef({ yaw: 0, pitch: 0, position: new THREE.Vector3() });
  const tweenRef = useRef(new CameraTweenRunner());
  const pointerRef = useRef({
    dragging: false,
    moved: false,
    pointerId: -1,
    lastX: 0,
    lastY: 0,
    pinchActive: false,
    pinchStartDistance: 0,
    pinchStartZoom: 1,
  });
  // Q3: registry of currently-down touch pointers, keyed by pointerId — needed
  // to detect a second finger (pinch start) and track both fingers' positions.
  const activeTouchesRef = useRef(new Map<number, { x: number; y: number }>());
  const lookTarget = useMemo(() => new THREE.Vector3(), []);
  const forward = useMemo(() => new THREE.Vector3(), []);
  const tweenScratch = useMemo(
    () => ({ position: new THREE.Vector3(), yaw: 0, pitch: 0 }),
    [],
  );

  const applyStateToCamera = useCallback(() => {
    if (!(camera instanceof THREE.PerspectiveCamera)) return;
    const { position, yaw, pitch } = stateRef.current;
    camera.position.copy(position);
    directionFromYawPitch(yaw, pitch, forward);
    lookTarget.copy(position).add(forward);
    camera.lookAt(lookTarget);
  }, [camera, forward, lookTarget]);

  const syncDefaultFrame = useCallback(() => {
    if (!(camera instanceof THREE.PerspectiveCamera) || !mesh?.isInitialized) return;
    const frame = frameSplatMeshInterior(mesh, camera, null, manifest);
    defaultFrameRef.current = frame;
    boundsRef.current = getSplatSceneBounds(mesh);
    stateRef.current.position.copy(frame.position);
    stateRef.current.yaw = frame.yaw;
    stateRef.current.pitch = frame.pitch;
    zoomRef.current = frame.zoom;
    tweenRef.current.cancel();
    applyStateToCamera();
  }, [applyStateToCamera, camera, defaultFrameRef, manifest, mesh, zoomRef]);

  useEffect(() => {
    if (!active || !mesh?.isInitialized || !(camera instanceof THREE.PerspectiveCamera)) return;
    if (entryHit) {
      boundsRef.current = getSplatSceneBounds(mesh);
      stateRef.current.position.copy(camera.position);
      const dir = new THREE.Vector3();
      camera.getWorldDirection(dir);
      const { yaw, pitch } = (() => {
        const y = Math.atan2(dir.x, dir.z);
        const p = Math.asin(THREE.MathUtils.clamp(dir.y, -1, 1));
        return { yaw: y, pitch: p };
      })();
      stateRef.current.yaw = yaw;
      stateRef.current.pitch = pitch;
      flyInteriorFromHit(mesh, camera, entryHit, stateRef, tweenRef);
      onEntryHitConsumed?.();
      return;
    }
    syncDefaultFrame();
  }, [active, camera, entryHit, mesh, onEntryHitConsumed, syncDefaultFrame]);

  useEffect(() => {
    if (!active || resetToken <= 0) return;
    syncDefaultFrame();
  }, [active, resetToken, syncDefaultFrame]);

  useEffect(() => {
    if (!active) return;
    const canvas = gl.domElement;

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const factor = event.deltaY > 0 ? ZOOM_WHEEL_FACTOR : 1 / ZOOM_WHEEL_FACTOR;
      zoomRef.current = THREE.MathUtils.clamp(
        zoomRef.current * factor,
        INTERIOR_MIN_ZOOM,
        INTERIOR_MAX_ZOOM,
      );
    };

    const activeTouches = activeTouchesRef.current;
    const pinchDistance = () => {
      const pts = [...activeTouches.values()];
      if (pts.length < 2) return 0;
      return Math.hypot(pts[0]!.x - pts[1]!.x, pts[0]!.y - pts[1]!.y);
    };

    const onPointerDown = (event: PointerEvent) => {
      if (event.pointerType === "touch") {
        activeTouches.set(event.pointerId, { x: event.clientX, y: event.clientY });
        if (activeTouches.size === 2) {
          // Q3: second finger down — start pinch-to-zoom, cancelling any
          // single-finger look-drag the first finger may have started.
          pointerRef.current.dragging = false;
          pointerRef.current.pinchActive = true;
          pointerRef.current.pinchStartDistance = pinchDistance();
          pointerRef.current.pinchStartZoom = zoomRef.current;
          tweenRef.current.cancel();
          return;
        }
        if (activeTouches.size > 2) return; // ignore a third+ finger
      }
      if (pointerRef.current.pinchActive) return;
      if (event.button !== 0 && event.pointerType !== "touch") return;
      pointerRef.current.dragging = true;
      pointerRef.current.moved = false;
      pointerRef.current.pointerId = event.pointerId;
      pointerRef.current.lastX = event.clientX;
      pointerRef.current.lastY = event.clientY;
    };

    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType === "touch" && activeTouches.has(event.pointerId)) {
        activeTouches.set(event.pointerId, { x: event.clientX, y: event.clientY });
      }
      if (pointerRef.current.pinchActive) {
        if (activeTouches.size >= 2 && pointerRef.current.pinchStartDistance > 1e-3) {
          const factor = pinchDistance() / pointerRef.current.pinchStartDistance;
          zoomRef.current = THREE.MathUtils.clamp(
            pointerRef.current.pinchStartZoom * factor,
            INTERIOR_MIN_ZOOM,
            INTERIOR_MAX_ZOOM,
          );
        }
        return; // pinch owns this move — don't also process as a look-drag
      }
      if (event.pointerType === "touch" && event.isPrimary === false) return;
      if (!pointerRef.current.dragging || event.pointerId !== pointerRef.current.pointerId) return;

      const dx = event.clientX - pointerRef.current.lastX;
      const dy = event.clientY - pointerRef.current.lastY;
      if (Math.hypot(dx, dy) > TAP_DRAG_THRESHOLD_PX) {
        pointerRef.current.moved = true;
        tweenRef.current.cancel();
      }
      pointerRef.current.lastX = event.clientX;
      pointerRef.current.lastY = event.clientY;
      if (!pointerRef.current.moved) return;

      stateRef.current.yaw -= dx * LOOK_SENSITIVITY;
      stateRef.current.pitch = THREE.MathUtils.clamp(
        stateRef.current.pitch - dy * LOOK_SENSITIVITY,
        -Math.PI / 2 + 0.1,
        Math.PI / 2 - 0.1,
      );
      applyStateToCamera();
    };

    const onPointerUp = (event: PointerEvent) => {
      if (event.pointerType === "touch") {
        activeTouches.delete(event.pointerId);
        if (activeTouches.size < 2) {
          pointerRef.current.pinchActive = false;
        }
      }
      if (event.pointerId !== pointerRef.current.pointerId) return;
      const wasTap = pointerRef.current.dragging && !pointerRef.current.moved;
      pointerRef.current.dragging = false;
      pointerRef.current.pointerId = -1;
      if (!wasTap || !(camera instanceof THREE.PerspectiveCamera)) return;

      const hit = raycastSplatMesh(mesh, camera, event.clientX, event.clientY, canvas);
      if (!hit) return;
      if (pickEnabled && onPick) {
        onPick({ x: hit.point.x, y: hit.point.y, z: hit.point.z });
      }
    };

    canvas.addEventListener("wheel", onWheel, { passive: false });
    canvas.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointercancel", onPointerUp);

    return () => {
      canvas.removeEventListener("wheel", onWheel);
      canvas.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerUp);
    };
  }, [active, applyStateToCamera, camera, gl, mesh, onPick, pickEnabled]);

  useFrame(() => {
    if (!active || !(camera instanceof THREE.PerspectiveCamera)) return;
    if (tweenRef.current.step(performance.now(), tweenScratch)) {
      stateRef.current.position.copy(tweenScratch.position);
      stateRef.current.yaw = tweenScratch.yaw;
      stateRef.current.pitch = tweenScratch.pitch;
      applyStateToCamera();
    }
    camera.fov = THREE.MathUtils.clamp(60 / zoomRef.current, 28, 78);
    camera.updateProjectionMatrix();
  });

  return null;
}

export function flyInteriorFromHit(
  mesh: SplatMesh,
  camera: THREE.PerspectiveCamera,
  hit: THREE.Vector3,
  stateRef: React.MutableRefObject<{ yaw: number; pitch: number; position: THREE.Vector3 }>,
  tweenRef: React.MutableRefObject<CameraTweenRunner>,
) {
  const bounds = getSplatSceneBounds(mesh);
  const floorY = bounds.min.y;
  const destination = eyePositionFromHit(hit, floorY, camera.position);
  tweenRef.current.start(
    {
      position: stateRef.current.position.clone(),
      yaw: stateRef.current.yaw,
      pitch: stateRef.current.pitch,
    },
    { position: destination, yaw: stateRef.current.yaw, pitch: 0 },
    950,
  );
}
